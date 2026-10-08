import { Request, Response, NextFunction } from 'express';

/**
 * Lightweight security headers middleware providing standard HTTP security protections:
 * - X-Content-Type-Options: nosniff
 * - X-Frame-Options: DENY (anti-clickjacking)
 * - X-XSS-Protection: 1; mode=block
 * - Referrer-Policy: strict-origin-when-cross-origin
 * - Strict-Transport-Security (HSTS in production)
 */
export function securityHeaders(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
}
