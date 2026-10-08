import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { config } from '../config/index.js';

/**
 * Centralized application error handler middleware.
 * Sanitizes errors in production to prevent leaking internal database schemas,
 * query internals, or stack traces, while preserving semantic status codes.
 */
export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // 1. Handle Zod validation errors
  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: err.errors,
      },
    });
    return;
  }

  // 2. Handle unconfigured provider credentials gracefully (HTTP 503)
  if (err?.message && typeof err.message === 'string' && err.message.includes('JAMENDO_CLIENT_ID')) {
    res.status(503).json({
      error: {
        message:
          'Music provider (Jamendo) is not configured. Please set JAMENDO_CLIENT_ID in server/.env to search live music.',
        code: 'PROVIDER_NOT_CONFIGURED',
      },
    });
    return;
  }

  // 3. Preserve status codes from custom errors, response, or default to 500
  let statusCode = 500;
  if (typeof err?.status === 'number' && err.status >= 400 && err.status < 600) {
    statusCode = err.status;
  } else if (typeof err?.statusCode === 'number' && err.statusCode >= 400 && err.statusCode < 600) {
    statusCode = err.statusCode;
  } else if (res.statusCode >= 400 && res.statusCode < 600) {
    statusCode = res.statusCode;
  }

  // 4. Message and code determination with production sanitization
  let message = err?.message || 'Internal Server Error';
  let code = err?.code || 'INTERNAL_ERROR';

  if (config.isProduction) {
    const isInternalOrDb =
      statusCode >= 500 ||
      err?.name === 'MongoServerError' ||
      err?.name === 'CastError' ||
      err?.name === 'BSONError' ||
      err?.name === 'MongooseError' ||
      (typeof message === 'string' &&
        (message.toLowerCase().includes('mongo') ||
          message.includes('E11000') ||
          message.toLowerCase().includes('database')));

    if (isInternalOrDb) {
      message = 'An internal server error occurred.';
      code = 'INTERNAL_ERROR';
    }
  }

  res.status(statusCode).json({
    error: {
      message,
      code,
    },
  });
}
