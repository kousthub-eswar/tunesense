import { Request, Response, NextFunction } from 'express';
import { config } from '../config/index.js';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const authRateLimitMap = new Map<string, RateLimitRecord>();

// Clean up expired IP records every 10 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of authRateLimitMap.entries()) {
    if (now > record.resetTime) {
      authRateLimitMap.delete(ip);
    }
  }
}, 10 * 60 * 1000).unref();

/**
 * Lightweight, production-safe rate limiting for sensitive authentication endpoints.
 * Allows 60 requests per 15-minute window per IP.
 * Gracefully bypassed during automated tests to avoid flaky test suites.
 */
export function authRateLimiter(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Bypass in test environments
  if (config.isTest || process.env.NODE_ENV === 'test') {
    next();
    return;
  }

  const clientIp =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket.remoteAddress ||
    '127.0.0.1';

  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxAttempts = 60;
  const now = Date.now();

  const record = authRateLimitMap.get(clientIp);

  if (!record || now > record.resetTime) {
    authRateLimitMap.set(clientIp, {
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
