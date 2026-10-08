import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth/AuthService.js';
import { signupSchema, loginSchema } from '../validators/authValidators.js';
import { AUTH_COOKIE_NAME } from '../middleware/authMiddleware.js';
import { config } from '../config/index.js';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: config.isProduction,
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/',
};

/**
 * POST /api/auth/signup
 */
export async function signup(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const validatedData = signupSchema.parse(req.body);

    const { user, token } = await authService.signup(validatedData);

    res.cookie(AUTH_COOKIE_NAME, token, COOKIE_OPTIONS);

    res.status(201).json({
      status: 'ok',
      data: {
        user,
      },
    });
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'status' in err && err.status === 409) {
      res.status(409).json({
        error: {
          message: 'An account with this email address already exists.',
          code: 'EMAIL_ALREADY_EXISTS',
        },
      });
      return;
    }
    next(err);
  }
}

/**
 * POST /api/auth/login
 */
export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const validatedData = loginSchema.parse(req.body);

    const { user, token } = await authService.login(validatedData);

    res.cookie(AUTH_COOKIE_NAME, token, COOKIE_OPTIONS);

    res.status(200).json({
      status: 'ok',
      data: {
        user,
      },
    });
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'status' in err && err.status === 401) {
      res.status(401).json({
        error: {
          message: 'Invalid email or password.',
          code: 'INVALID_CREDENTIALS',
        },
      });
      return;
    }
    next(err);
  }
}

/**
 * POST /api/auth/logout
 */
export function logout(_req: Request, res: Response): void {
  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: 'lax',
    path: '/',
  });

  res.status(200).json({
    status: 'ok',
    data: {
      message: 'Logged out successfully.',
    },
  });
}

/**
 * GET /api/auth/me (Protected by requireAuth)
 */
export async function getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user?.id) {
      res.status(401).json({
        error: {
          message: 'Authentication required.',
          code: 'UNAUTHORIZED',
        },
      });
      return;
    }

    const user = await authService.getCurrentUser(req.user.id);
    if (!user) {
      res.status(401).json({
        error: {
          message: 'User session no longer exists.',
          code: 'USER_NOT_FOUND',
        },
      });
      return;
    }

    res.status(200).json({
      status: 'ok',
      data: {
        user,
      },
    });
  } catch (err) {
    next(err);
  }
}
