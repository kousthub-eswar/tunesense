import { Router } from 'express';
import { healthRouter } from './healthRoutes.js';
import { musicRouter } from './musicRoutes.js';
import { authRouter } from './authRoutes.js';
import listeningEventRoutes from './listeningEventRoutes.js';
import profileRoutes from './profileRoutes.js';
import recommendationRoutes from './recommendationRoutes.js';
import preferenceRoutes from './preferenceRoutes.js';
import { analyticsRoutes } from './analyticsRoutes.js';
import { evaluationRoutes } from './evaluationRoutes.js';
import libraryRoutes from './libraryRoutes.js';
import playlistRoutes from './playlistRoutes.js';

export const apiRouter = Router();

// Mount sub-routers under /api
apiRouter.use(healthRouter);
apiRouter.use(musicRouter);
apiRouter.use(authRouter);
apiRouter.use('/listening-events', listeningEventRoutes);
apiRouter.use('/profile', profileRoutes);
apiRouter.use('/recommendations', recommendationRoutes);
apiRouter.use('/preferences', preferenceRoutes);
apiRouter.use('/analytics', analyticsRoutes);
apiRouter.use('/evaluation', evaluationRoutes);
apiRouter.use('/library', libraryRoutes);
apiRouter.use('/playlists', playlistRoutes);



