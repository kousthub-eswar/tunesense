import { Request, Response, NextFunction } from 'express';
import { userTasteProfileService } from '../services/profile/UserTasteProfileService.js';

/**
 * GET /api/profile/taste
 * Returns the computed dynamic taste profile for the authenticated user.
 * Derived strictly from the JWT session cookie (req.user.id).
 */
export async function getTasteProfile(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({
        error: {
          message: 'Authentication required. No session token found.',
          code: 'UNAUTHORIZED',
        },
      });
      return;
    }

    // Security check: Reject any attempt to spoof another user's identity via query params
    if (req.query.userId && req.query.userId !== userId) {
      res.status(403).json({
        error: {
          message: 'Access denied. You may only access your own profile.',
          code: 'FORBIDDEN',
        },
      });
      return;
    }

    const profile = await userTasteProfileService.getProfile(userId);

    res.status(200).json({
      status: 'ok',
      data: profile,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/profile/taste/rebuild
 * Manually recalculates and updates the taste profile materialized view for the authenticated user.
 */
export async function rebuildTasteProfile(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({
        error: {
          message: 'Authentication required. No session token found.',
          code: 'UNAUTHORIZED',
        },
      });
      return;
    }

    // Security check: Reject any attempt to spoof another user's identity via request body
    if (req.body && req.body.userId && req.body.userId !== userId) {
      res.status(403).json({
        error: {
          message: 'Access denied. You may only rebuild your own profile.',
          code: 'FORBIDDEN',
        },
      });
      return;
    }

    const profile = await userTasteProfileService.rebuildProfile(userId);

    res.status(200).json({
      status: 'ok',
      data: profile,
    });
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'status' in err && (err as { status: unknown }).status === 503) {
      res.status(503).json({
        error: {
          message: (err as unknown as { message?: string }).message || 'Database unavailable.',
          code: 'DATABASE_UNAVAILABLE',
        },
      });
      return;
    }
    next(err);
  }
}
