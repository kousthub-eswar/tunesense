import { Request, Response } from 'express';
import { HealthCheckResponse } from '../types/index.js';
import { config } from '../config/index.js';
import { getDatabaseState } from '../config/database.js';

export function getHealth(_req: Request, res: Response<HealthCheckResponse>): void {
  const dbState = getDatabaseState();

  res.status(200).json({
    status: 'ok',
    service: 'tunesense-api',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
    database: dbState.isConnected ? 'connected' : 'disconnected',
  });
}
