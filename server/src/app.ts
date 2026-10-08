import express, { Express } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from './config/index.js';
import { apiRouter } from './routes/index.js';
import { notFoundHandler } from './middleware/notFoundHandler.js';
import { errorHandler } from './middleware/errorHandler.js';

export function createApp(): Express {
  const app = express();

  // Cross-Origin Resource Sharing with exact client origin and credentials support
  app.use(
    cors({
      origin: config.clientUrl,
      credentials: true,
    })
  );

  // Cookie parser for reading HTTP-only authentication session cookies
  app.use(cookieParser());

  // Body parser
  app.use(express.json());

  // Mount API Router under /api
  app.use('/api', apiRouter);

  // 404 Handler
  app.use(notFoundHandler);

  // Centralized Error Handler
  app.use(errorHandler);

  return app;
}
