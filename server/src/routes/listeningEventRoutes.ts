import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import { createListeningEvent } from '../controllers/listeningEventController.js';

const router = Router();

// Protected endpoint: Only authenticated sessions can create listening events
router.post('/', requireAuth, createListeningEvent);

export default router;
