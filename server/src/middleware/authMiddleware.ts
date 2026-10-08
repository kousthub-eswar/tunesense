import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth/AuthService.js';

export const AUTH_COOKIE_NAME = 'tunesense_token';

/**
 * requireAuth middleware:
 * Validates JWT from HTTP-only cookie (or Bearer Authorization header fallback)
 * and attaches authenticated identity { id: userId } to req.user.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  try {
    let token = req.cookies?.[AUTH_COOKIE_NAME];

    // Fallback: check Authorization Bearer header
    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.slice(7).trim();
    }

    if (!token) {
      res.status(401).json({
        error: {
          message: 'Authentication required. No session token found.',
          code: 'UNAUTHORIZED',
        },
      });
      return;
    }

    const payload = authService.verifyToken(token);
    req.user = { id: payload.sub };
    next();
  } catch (_err) {
    res.status(401).json({
      error: {
        message: 'Invalid or expired authentication session.',
        code: 'UNAUTHORIZED',
      },
    });
  }
}
