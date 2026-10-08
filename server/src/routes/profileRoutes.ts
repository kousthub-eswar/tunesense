import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import {
  getTasteProfile,
  rebuildTasteProfile,
} from '../controllers/userTasteProfileController.js';

const router = Router();

// Protected profile intelligence routes (Stage 6)
router.get('/taste', requireAuth, getTasteProfile);
router.post('/taste/rebuild', requireAuth, rebuildTasteProfile);

export default router;
