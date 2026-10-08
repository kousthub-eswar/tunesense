import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
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

// GET /api/evaluation/feedback-summary - Aggregated feedback summary
router.get('/feedback-summary', requireAuth, getFeedbackSummary);

// GET /api/evaluation/recommendations - Offline recommendation strategy evaluation & comparison
router.get('/recommendations', requireAuth, getRecommendationEvaluation);

export const evaluationRoutes = router;
