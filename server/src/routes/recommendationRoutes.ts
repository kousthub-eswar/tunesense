import { Router } from 'express';
import { requireAuth, optionalAuth } from '../middleware/authMiddleware.js';
import { getRecommendations } from '../controllers/recommendationController.js';
import {
  runCounterfactualSimulation,
  findMinimalChangeRecourse,
  applyCounterfactualPreferences,
} from '../controllers/counterfactualController.js';
import { getRecommendationsByVibe } from '../controllers/vibeRecommendationController.js';
import { getJourneyRecommendations } from '../controllers/journeyRecommendationController.js';

const recommendationRoutes = Router();

// GET /api/recommendations - Authenticated personalized recommendations
recommendationRoutes.get('/', requireAuth, getRecommendations);

// POST /api/recommendations/by-vibe - Visual photo vibe recommendations (energy, valence, danceability)
recommendationRoutes.post('/by-vibe', optionalAuth, getRecommendationsByVibe);

// POST /api/recommendations/journey - Emotional GPS mood journey (fromMood, toMood, steps)
recommendationRoutes.post('/journey', optionalAuth, getJourneyRecommendations);

// POST /api/recommendations/counterfactual - Counterfactual What-If simulation
recommendationRoutes.post('/counterfactual', requireAuth, runCounterfactualSimulation);

// POST /api/recommendations/counterfactual/recourse - Minimal-change recourse optimization
recommendationRoutes.post('/counterfactual/recourse', requireAuth, findMinimalChangeRecourse);

// POST /api/recommendations/counterfactual/apply-preferences - Explicit opt-in preference update
recommendationRoutes.post('/counterfactual/apply-preferences', requireAuth, applyCounterfactualPreferences);

export default recommendationRoutes;
