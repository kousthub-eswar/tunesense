import { Router } from 'express';
import { signup, login, logout, getMe } from '../controllers/authController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';

export const authRouter = Router();

authRouter.post('/auth/signup', authRateLimiter, signup);
authRouter.post('/auth/login', authRateLimiter, login);
authRouter.post('/auth/logout', logout);
authRouter.get('/auth/me', requireAuth, getMe);
