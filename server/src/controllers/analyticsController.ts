import { Request, Response } from 'express';
import { analyticsService } from '../services/analytics/AnalyticsService.js';
import { evaluationService } from '../services/analytics/EvaluationService.js';
import {
  recordImpressionsSchema,
  moodFeedbackSchema,
  explanationFeedbackSchema,
  evaluationQuerySchema,
} from '../validators/analyticsValidators.js';

/**
 * GET /api/analytics/me
 * Retrieves listening analytics for the authenticated user.
 */
export async function getUserAnalytics(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
      return;
    }

    // Anti-spoofing validation
    const queryUserId = req.query.userId as string | undefined;
    if (queryUserId && queryUserId !== userId) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN_USER_ACCESS',
          message: 'Access denied: Cannot query analytics for another user',
        },
      });
      return;
    }

    const data = await analyticsService.getUserListeningAnalytics(userId);
    res.status(200).json({ success: true, data });
  } catch (err: any) {
    console.error('[analyticsController] Error fetching user analytics:', err);
    res.status(500).json({
      success: false,
      error: { code: 'ANALYTICS_ERROR', message: 'Error retrieving listening analytics' },
    });
  }
}

/**
 * GET /api/analytics/recommendations
 * Retrieves recommendation impression & attribution analytics for the authenticated user.
 */
export async function getRecommendationAnalytics(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
      return;
    }

    // Anti-spoofing validation
    const queryUserId = req.query.userId as string | undefined;
    if (queryUserId && queryUserId !== userId) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN_USER_ACCESS',
          message: 'Access denied: Cannot query recommendation analytics for another user',
        },
      });
      return;
    }

    const data = await analyticsService.getRecommendationAnalytics(userId);
    res.status(200).json({ success: true, data });
  } catch (err: any) {
    console.error('[analyticsController] Error fetching recommendation analytics:', err);
    res.status(500).json({
      success: false,
      error: { code: 'ANALYTICS_ERROR', message: 'Error retrieving recommendation analytics' },
    });
  }
}

/**
 * POST /api/analytics/impressions
 * Records batch recommendation impressions.
 */
export async function recordImpressions(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
      return;
    }

    // Anti-spoofing: reject mismatched userId in body
    const bodyUserId = (req.body as any)?.userId;
    if (bodyUserId && bodyUserId !== userId) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN_USER_ACCESS',
          message: 'Access denied: Cannot record impressions on behalf of another user',
        },
      });
      return;
    }

    const validated = recordImpressionsSchema.parse(req.body);
    const result = await analyticsService.recordImpressions(userId, validated);

    res.status(201).json({ success: true, data: result });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid impression payload',
          details: err.errors,
        },
      });
      return;
    }
    console.error('[analyticsController] Error recording impressions:', err);
    res.status(500).json({
      success: false,
      error: { code: 'IMPRESSION_ERROR', message: 'Error recording recommendation impressions' },
    });
  }
}

/**
 * POST /api/evaluation/mood-feedback
 * Submits user rating for mood-aware recommendation relevance.
 */
export async function submitMoodFeedback(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
      return;
    }

    const validated = moodFeedbackSchema.parse(req.body);
    const result = await evaluationService.recordMoodFeedback(userId, validated);

    res.status(201).json({ success: true, data: result });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid mood feedback payload',
          details: err.errors,
        },
      });
      return;
    }
    console.error('[analyticsController] Error submitting mood feedback:', err);
    res.status(500).json({
      success: false,
      error: { code: 'FEEDBACK_ERROR', message: 'Error submitting mood feedback' },
    });
  }
}

/**
 * POST /api/evaluation/explanation-feedback
 * Submits user rating for recommendation explanation helpfulness/trust.
 */
export async function submitExplanationFeedback(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
      return;
    }

    const validated = explanationFeedbackSchema.parse(req.body);
    const result = await evaluationService.recordExplanationFeedback(userId, validated);

    res.status(201).json({ success: true, data: result });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid explanation feedback payload',
          details: err.errors,
        },
      });
      return;
    }
    console.error('[analyticsController] Error submitting explanation feedback:', err);
    res.status(500).json({
      success: false,
      error: { code: 'FEEDBACK_ERROR', message: 'Error submitting explanation feedback' },
    });
  }
}

/**
 * GET /api/evaluation/feedback-summary
 * Retrieves aggregated mood and explanation feedback ratings.
 */
export async function getFeedbackSummary(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
      return;
    }

    const data = await evaluationService.getFeedbackSummary();
    res.status(200).json({ success: true, data });
  } catch (err: any) {
    console.error('[analyticsController] Error fetching feedback summary:', err);
    res.status(500).json({
      success: false,
      error: { code: 'FEEDBACK_SUMMARY_ERROR', message: 'Error retrieving feedback summary' },
    });
  }
}

/**
 * GET /api/evaluation/recommendations
 * Evaluates recommendation strategies (Precision@K, Recall@K, NDCG@K, Diversity, Novelty, Coverage).
 */
export async function getRecommendationEvaluation(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
      return;
    }

    const query = evaluationQuerySchema.parse(req.query);

    if (query.strategy === 'all') {
      const data = await evaluationService.compareAllStrategies({
        k: query.k,
        trainDays: query.trainDays,
        testDays: query.testDays,
      });
      res.status(200).json({ success: true, data });
      return;
    }

    const data = await evaluationService.evaluateStrategy(query.strategy, {
      k: query.k,
      trainDays: query.trainDays,
      testDays: query.testDays,
    });

    res.status(200).json({ success: true, data });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid evaluation query parameters',
          details: err.errors,
        },
      });
      return;
    }
    console.error('[analyticsController] Error running recommendation evaluation:', err);
    res.status(500).json({
      success: false,
      error: { code: 'EVALUATION_ERROR', message: 'Error evaluating recommendation strategies' },
    });
  }
}
