import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export function errorHandler(
  err: Error,
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
  if (err.message.includes('JAMENDO_CLIENT_ID')) {
    res.status(503).json({
      error: {
        message:
          'Music provider (Jamendo) is not configured. Please set JAMENDO_CLIENT_ID in server/.env to search live music.',
        code: 'PROVIDER_NOT_CONFIGURED',
      },
    });
    return;
  }

  // 3. Generic server errors (Never leak stack traces or internal DB details in production responses)
  const statusCode = res.statusCode !== 200 ? res.statusCode : 500;

  res.status(statusCode).json({
    error: {
      message:
        process.env.NODE_ENV === 'production' && statusCode === 500
          ? 'An internal server error occurred.'
          : err.message || 'Internal Server Error',
      code: 'INTERNAL_ERROR',
    },
  });
}
