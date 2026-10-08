import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import { getRecommendations } from '../controllers/recommendationController.js';

const recommendationRoutes = Router();

// GET /api/recommendations - Authenticated personalized recommendations
recommendationRoutes.get('/', requireAuth, getRecommendations);

export default recommendationRoutes;
