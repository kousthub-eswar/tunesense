import { Request, Response, NextFunction } from 'express';
import { createListeningEventSchema } from '../validators/listeningEventValidators.js';
import { listeningEventService } from '../services/listening/ListeningEventService.js';

/**
 * POST /api/listening-events (Protected by requireAuth)
 * Ingests authenticated user listening behaviour into structured ListeningEvent documents.
 */
export async function createListeningEvent(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({
        error: {
          message: 'Authentication required. No session token found.',
          code: 'UNAUTHORIZED',
        },
      });
      return;
    }

    // Validate request payload (rejects invalid event types, negative positions, etc.)
    const validatedInput = createListeningEventSchema.parse(req.body);

    const event = await listeningEventService.recordEvent(userId, validatedInput);

    res.status(201).json({
      status: 'ok',
      data: event,
    });
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'status' in err && (err as { status: unknown }).status === 503) {
      res.status(503).json({
        error: {
          message: (err as unknown as { message?: string }).message || 'Database unavailable.',
          code: 'DATABASE_UNAVAILABLE',
        },
      });
      return;
    }
    if (err && typeof err === 'object' && 'status' in err && (err as { status: unknown }).status === 404) {
      res.status(404).json({
        error: {
          message: (err as unknown as { message?: string }).message || 'Referenced song does not exist in catalogue.',
          code: 'SONG_NOT_FOUND',
        },
      });
      return;
    }
    next(err);
  }
}
