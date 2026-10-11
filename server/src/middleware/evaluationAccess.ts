import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User.js';

/**
 * Access control middleware for global/system-wide evaluation and analytics endpoints:
 * - GET /api/evaluation/feedback-summary
 * - GET /api/evaluation/recommendations
 *
 * Restricts global data operations strictly to authenticated accounts whose trusted,
 * server-validated role is 'admin'. Suffix-based email authorization is prohibited.
 */
export async function requireEvaluationAccess(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
    });
    return;
  }

  try {
    const userDoc = await User.findById(userId).lean();
    if (!userDoc) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User account not found' },
      });
      return;
    }

    if (userDoc.role !== 'admin') {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied: Evaluation analytics is restricted to administrator accounts.',
        },
      });
      return;
    }

    next();
  } catch (err) {
    console.error('[evaluationAccess] Authorization check failed:', err);
    res.status(500).json({
      success: false,
      error: { code: 'AUTH_ERROR', message: 'Internal authorization verification error' },
    });
  }
}
