import { Request, Response } from 'express';
import { libraryService } from '../services/library/LibraryService.js';
import {
  likeSongParamSchema,
  checkLikesQuerySchema,
  historyQuerySchema,
} from '../validators/libraryValidators.js';
import { ZodError } from 'zod';

/**
 * POST /api/library/likes/:songId
 * Likes a song for the authenticated user
 */
export async function likeSong(req: Request, res: Response): Promise<void> {
  try {
    const authenticatedUserId = req.user?.id;
    if (!authenticatedUserId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required to like a song',
        },
      });
      return;
    }

    const { songId } = likeSongParamSchema.parse(req.params);
    const result = await libraryService.likeSong(authenticatedUserId, songId);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    if (err instanceof ZodError) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid parameters',
          details: err.errors,
        },
      });
      return;
    }

    const status = err.status || 500;
    res.status(status).json({
      success: false,
      error: {
        code: status === 404 ? 'NOT_FOUND' : 'INTERNAL_ERROR',
        message: err.message || 'Failed to like song',
      },
    });
  }
}

/**
 * DELETE /api/library/likes/:songId
 * Unlikes a song for the authenticated user
 */
export async function unlikeSong(req: Request, res: Response): Promise<void> {
  try {
    const authenticatedUserId = req.user?.id;
    if (!authenticatedUserId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required to unlike a song',
        },
      });
      return;
    }

    const { songId } = likeSongParamSchema.parse(req.params);
    const result = await libraryService.unlikeSong(authenticatedUserId, songId);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    if (err instanceof ZodError) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid parameters',
          details: err.errors,
        },
      });
      return;
    }

    const status = err.status || 500;
    res.status(status).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: err.message || 'Failed to unlike song',
      },
    });
  }
}

/**
 * GET /api/library/likes
 * Retrieves all liked songs for the authenticated user
 */
export async function getLikedSongs(req: Request, res: Response): Promise<void> {
  try {
    const authenticatedUserId = req.user?.id;
    if (!authenticatedUserId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required to view liked songs',
        },
      });
      return;
    }

    const songs = await libraryService.getLikedSongs(authenticatedUserId);

    res.status(200).json({
      success: true,
      data: {
        songs,
        total: songs.length,
      },
    });
  } catch (err: any) {
    res.status(err.status || 500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: err.message || 'Failed to retrieve liked songs',
      },
    });
  }
}

/**
 * GET /api/library/likes/check?songIds=id1,id2
 * Checks whether songs are liked by the authenticated user
 */
export async function checkIsLiked(req: Request, res: Response): Promise<void> {
  try {
    const authenticatedUserId = req.user?.id;
    if (!authenticatedUserId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required to check likes',
        },
      });
      return;
    }

    const { songIds } = checkLikesQuerySchema.parse(req.query);
    const parsedIds = songIds ? songIds.split(',').map((s) => s.trim()).filter(Boolean) : [];

    const result = await libraryService.checkIsLiked(authenticatedUserId, parsedIds);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    res.status(err.status || 500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: err.message || 'Failed to check liked status',
      },
    });
  }
}

/**
 * GET /api/library/history?limit=20
 * Retrieves recently played songs from real playback telemetry
 */
export async function getListeningHistory(req: Request, res: Response): Promise<void> {
  try {
    const authenticatedUserId = req.user?.id;
    if (!authenticatedUserId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required to view history',
        },
      });
      return;
    }

    const { limit } = historyQuerySchema.parse(req.query);
    const history = await libraryService.getListeningHistory(authenticatedUserId, limit);

    res.status(200).json({
      success: true,
      data: {
        history,
        total: history.length,
      },
    });
  } catch (err: any) {
    res.status(err.status || 500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: err.message || 'Failed to retrieve listening history',
      },
    });
  }
}

/**
 * GET /api/library
 * Retrieves summary metrics for the user's library
 */
export async function getLibrarySummary(req: Request, res: Response): Promise<void> {
  try {
    const authenticatedUserId = req.user?.id;
    if (!authenticatedUserId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required to view library summary',
        },
      });
      return;
    }

    const summary = await libraryService.getLibrarySummary(authenticatedUserId);

    res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (err: any) {
    res.status(err.status || 500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: err.message || 'Failed to retrieve library summary',
      },
    });
  }
}
