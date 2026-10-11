import { Request, Response, NextFunction } from 'express';
import { config } from '../config/index.js';

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

  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxAttempts = 60;
  const now = Date.now();

  const record = ipRateLimitMap.get(clientIp);

  if (!record || now > record.resetTime) {
    ipRateLimitMap.set(clientIp, {
      count: 1,
      resetTime: now + windowMs,
    });
    next();
    return;
  }

  record.count += 1;

  if (record.count > maxAttempts) {
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
 * Account-specific rate limiting for login attempts.
 * Prevents credential brute-forcing against targeted user accounts.
 * Normalizes email address (lowercase + trimmed) to avoid case-manipulation bypasses.
 * Allows 10 login attempts per 15-minute window per account.
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

  const normalizedEmail = rawEmail.trim().toLowerCase();
  if (!normalizedEmail) {
    next();
    return;
  }

  const accountKey = `account:${normalizedEmail}`;
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxAttempts = 10;
  const now = Date.now();

  const record = accountRateLimitMap.get(accountKey);

  if (!record || now > record.resetTime) {
    accountRateLimitMap.set(accountKey, {
      count: 1,
      resetTime: now + windowMs,
    });
    next();
    return;
  }

  record.count += 1;

  if (record.count > maxAttempts) {
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

  next();
}
