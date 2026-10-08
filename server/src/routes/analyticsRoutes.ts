import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import {
  getUserAnalytics,
  getRecommendationAnalytics,
  recordImpressions,
} from '../controllers/analyticsController.js';

const router = Router();

// GET /api/analytics/me - Authenticated user listening analytics
router.get('/me', requireAuth, getUserAnalytics);

// GET /api/analytics/recommendations - Authenticated user recommendation analytics
router.get('/recommendations', requireAuth, getRecommendationAnalytics);

// POST /api/analytics/impressions - Records batch recommendation impressions
router.post('/impressions', requireAuth, recordImpressions);

export const analyticsRoutes = router;
