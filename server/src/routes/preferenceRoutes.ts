import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import { getPreferences, updatePreferences } from '../controllers/preferenceController.js';

const preferenceRoutes = Router();

// GET /api/preferences - Authenticated user explicit preferences
preferenceRoutes.get('/', requireAuth, getPreferences);

// PUT /api/preferences - Authenticated user update preferences
preferenceRoutes.put('/', requireAuth, updatePreferences);

export default preferenceRoutes;
