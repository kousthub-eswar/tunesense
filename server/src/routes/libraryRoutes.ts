import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import {
  likeSong,
  unlikeSong,
  getLikedSongs,
  checkIsLiked,
  getListeningHistory,
  getLibrarySummary,
} from '../controllers/libraryController.js';

const libraryRoutes = Router();

// GET /api/library - Library overview summary
libraryRoutes.get('/', requireAuth, getLibrarySummary);

// GET /api/library/likes - List liked songs
libraryRoutes.get('/likes', requireAuth, getLikedSongs);

// GET /api/library/likes/check - Check if song(s) are liked
libraryRoutes.get('/likes/check', requireAuth, checkIsLiked);

// POST /api/library/likes/:songId - Like a song
libraryRoutes.post('/likes/:songId', requireAuth, likeSong);

// DELETE /api/library/likes/:songId - Unlike a song
libraryRoutes.delete('/likes/:songId', requireAuth, unlikeSong);

// GET /api/library/history - Listening history from telemetry
libraryRoutes.get('/history', requireAuth, getListeningHistory);

export default libraryRoutes;
