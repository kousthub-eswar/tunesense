import { Router } from 'express';
import { signup, login, logout, getMe } from '../controllers/authController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

export const authRouter = Router();

authRouter.post('/auth/signup', signup);
authRouter.post('/auth/login', login);
authRouter.post('/auth/logout', logout);
authRouter.get('/auth/me', requireAuth, getMe);
