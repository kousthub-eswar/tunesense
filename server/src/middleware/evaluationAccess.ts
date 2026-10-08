import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User.js';
import { config } from '../config/index.js';

/**
 * Access control middleware for global/system-wide evaluation and analytics endpoints:
 * - GET /api/evaluation/feedback-summary
 * - GET /api/evaluation/recommendations
 *
 * Restricts unconstrained global data operations in production to administrators
 * and designated evaluation/demo accounts (@demo.tunesense.ai).
 * Allows open access in local development and test environments.
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

  // Development and test environments permit evaluation queries
  if (!config.isProduction) {
    next();
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

    const isAuthorized =
      userDoc.role === 'admin' ||
      userDoc.email.endsWith('@demo.tunesense.ai') ||
      userDoc.email.endsWith('@admin.tunesense.ai');

    if (!isAuthorized) {
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
