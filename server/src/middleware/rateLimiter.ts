import { Request, Response, NextFunction } from 'express';
import { config } from '../config/index.js';

/**
 * ============================================================================
 * Multi-Instance Deployment Limitation & Production Guidance:
 * ============================================================================
 * The rate-limiting and failed-login counters (ipRateLimitMap and accountRateLimitMap)
 * are stored in in-memory Maps within the local Node.js process heap.
 *
 * Limitations in Distributed Architectures:
 * 1. Multi-Instance Clustered / Containerized Environments:
 *    When TuneSense is scaled horizontally across multiple server instances (e.g.,
 *    multiple Render/Railway replicas, Kubernetes pods, or serverless functions behind
 *    a load balancer), memory is not shared between processes. An attacker whose requests
 *    are round-robined across N instances could make up to N * MAX_ATTEMPTS before being
 *    locked out on any single instance, unless sticky sessions (session affinity) are enabled.
 * 2. Process Restarts:
 *    In-memory state is transient. Whenever an instance restarts or deploys a new release,
 *    current counters reset to zero.
 *
 * Production Recommendation:
 * For multi-instance, high-availability production clusters, back these rate limiters
 * with a centralized atomic in-memory datastore such as Redis (e.g. via `rate-limit-redis`,
 * sliding-window Lua scripts, or ioredis token buckets) to share failure counts and IP windows
 * consistently across all worker instances.
 * ============================================================================
 */

export const MAX_ACCOUNT_LOGIN_FAILURES = 10;
export const ACCOUNT_LOCKOUT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
export const IP_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
export const MAX_IP_ATTEMPTS = 60;

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const ipRateLimitMap = new Map<string, RateLimitRecord>();
const accountRateLimitMap = new Map<string, RateLimitRecord>();

let bypassInTests = true;

/**
 * Clean up expired records every 10 minutes to prevent memory leaks
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of ipRateLimitMap.entries()) {
    if (now > record.resetTime) {
      ipRateLimitMap.delete(key);
    }
  }
  for (const [key, record] of accountRateLimitMap.entries()) {
    if (now > record.resetTime) {
      accountRateLimitMap.delete(key);
    }
  }
}, 10 * 60 * 1000).unref();

/**
 * Test helper to clear rate limit maps during test execution
 */
export function _clearRateLimitsForTesting(): void {
  ipRateLimitMap.clear();
  accountRateLimitMap.clear();
}

/**
 * Test helper to enable/disable rate limiting enforcement during unit tests
 */
export function setRateLimitingEnabledForTesting(enabled: boolean): void {
  bypassInTests = !enabled;
}

/**
 * IP-based rate limiting for sensitive authentication endpoints.
 * Allows 60 requests per 15-minute window per trusted client IP.
 * Uses req.ip populated by Express trust proxy settings instead of client-supplied headers.
 */
export function authRateLimiter(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Bypass in test environments unless explicitly enabled for testing
  if ((config.isTest || process.env.NODE_ENV === 'test') && bypassInTests) {
    next();
    return;
  }

  // Use req.ip resolved by Express reverse-proxy configuration
  const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';
  const now = Date.now();

  const record = ipRateLimitMap.get(clientIp);

  if (!record || now > record.resetTime) {
    ipRateLimitMap.set(clientIp, {
      count: 1,
      resetTime: now + IP_RATE_LIMIT_WINDOW_MS,
    });
    next();
    return;
  }

  record.count += 1;

  if (record.count > MAX_IP_ATTEMPTS) {
    const retryAfterSeconds = Math.ceil((record.resetTime - now) / 1000);
    res.setHeader('Retry-After', retryAfterSeconds);
    res.status(429).json({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many authentication attempts. Please try again later.',
        retryAfterSeconds,
      },
    });
    return;
  }

  next();
}

/**
 * Normalizes an email address consistently across all authentication rate limiting.
 */
function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Records a failed login attempt against an account.
 * Only called when authentication actually fails because of invalid credentials (HTTP 401).
 * Never called merely because a request was received or because of malformed requests / 500 errors.
 */
export function recordAccountLoginFailure(email: string): void {
  if ((config.isTest || process.env.NODE_ENV === 'test') && bypassInTests) {
    return;
  }

  if (!email || typeof email !== 'string') return;
  const normalized = normalizeEmail(email);
  if (!normalized) return;

  const accountKey = `account:${normalized}`;
  const now = Date.now();
  const record = accountRateLimitMap.get(accountKey);

  if (!record || now > record.resetTime) {
    accountRateLimitMap.set(accountKey, {
      count: 1,
      resetTime: now + ACCOUNT_LOCKOUT_WINDOW_MS,
    });
  } else {
    record.count += 1;
  }
}

/**
 * Clears the failed login counter for an account upon successful authentication.
 */
export function clearAccountLoginFailures(email: string): void {
  if (!email || typeof email !== 'string') return;
  const normalized = normalizeEmail(email);
  if (!normalized) return;

  const accountKey = `account:${normalized}`;
  accountRateLimitMap.delete(accountKey);
}

/**
 * Retrieves the current failed login count for an account (returns 0 if expired or not found).
 */
export function getAccountLoginFailures(email: string): number {
  if (!email || typeof email !== 'string') return 0;
  const normalized = normalizeEmail(email);
  const record = accountRateLimitMap.get(`account:${normalized}`);
  if (!record || Date.now() > record.resetTime) {
    return 0;
  }
  return record.count;
}

/**
 * Account-specific rate limiting check for login attempts.
 * Prevents credential brute-forcing against targeted user accounts.
 *
 * NOTE: This middleware ONLY checks whether the account is currently locked out
 * due to reaching the maximum number of failed authentication attempts (MAX_ACCOUNT_LOGIN_FAILURES).
 * It does NOT increment the failure counter merely because a request was received.
 * Failure increments are only performed when authentication genuinely fails (status 401)
 * via recordAccountLoginFailure(), and counters are reset upon successful authentication
 * via clearAccountLoginFailures().
 *
 * Normalizes email address (lowercase + trimmed) to avoid case-manipulation bypasses.
 */
export function accountLoginRateLimiter(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Bypass in test environments unless explicitly enabled for testing
  if ((config.isTest || process.env.NODE_ENV === 'test') && bypassInTests) {
    next();
    return;
  }

  const rawEmail = req.body?.email;
  if (!rawEmail || typeof rawEmail !== 'string') {
    next();
    return;
  }

  const normalized = normalizeEmail(rawEmail);
  if (!normalized) {
    next();
    return;
  }

  const accountKey = `account:${normalized}`;
  const now = Date.now();
  const record = accountRateLimitMap.get(accountKey);

  if (record) {
    if (now > record.resetTime) {
      // Temporary lockout window has expired: reset counter
      accountRateLimitMap.delete(accountKey);
    } else if (record.count >= MAX_ACCOUNT_LOGIN_FAILURES) {
      const retryAfterSeconds = Math.ceil((record.resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfterSeconds);
      res.status(429).json({
        error: {
          code: 'ACCOUNT_RATE_LIMIT_EXCEEDED',
          message: 'Too many login attempts for this account. Please try again later.',
          retryAfterSeconds,
        },
      });
      return;
    }
  }

  next();
}
