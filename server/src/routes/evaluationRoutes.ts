import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireEvaluationAccess } from '../middleware/evaluationAccess.js';
import {
  submitMoodFeedback,
  submitExplanationFeedback,
  getFeedbackSummary,
  getRecommendationEvaluation,
} from '../controllers/analyticsController.js';

const router = Router();

// POST /api/evaluation/mood-feedback - User ratings on mood relevance
router.post('/mood-feedback', requireAuth, submitMoodFeedback);

// POST /api/evaluation/explanation-feedback - User ratings on explanation helpfulness & trust
router.post('/explanation-feedback', requireAuth, submitExplanationFeedback);

// GET /api/evaluation/feedback-summary - Aggregated feedback summary (Admin / Demo evaluation only)
router.get('/feedback-summary', requireAuth, requireEvaluationAccess, getFeedbackSummary);

// GET /api/evaluation/recommendations - Offline recommendation strategy evaluation & comparison (Admin / Demo evaluation only)
router.get('/recommendations', requireAuth, requireEvaluationAccess, getRecommendationEvaluation);

export const evaluationRoutes = router;
