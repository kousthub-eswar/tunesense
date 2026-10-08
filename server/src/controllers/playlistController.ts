import { Request, Response } from 'express';
import { playlistService } from '../services/library/PlaylistService.js';
import {
  createPlaylistSchema,
  updatePlaylistSchema,
  playlistIdParamSchema,
  playlistSongParamSchema,
} from '../validators/libraryValidators.js';
import { ZodError } from 'zod';

/**
 * POST /api/playlists
 * Creates a new playlist
 */
export async function createPlaylist(req: Request, res: Response): Promise<void> {
  try {
    const authenticatedUserId = req.user?.id;
    if (!authenticatedUserId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required to create a playlist',
        },
      });
      return;
    }

    const input = createPlaylistSchema.parse(req.body);
    const playlist = await playlistService.createPlaylist(authenticatedUserId, input);

    res.status(201).json({
      success: true,
      data: playlist,
    });
  } catch (err: any) {
    if (err instanceof ZodError) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid playlist creation payload',
          details: err.errors,
        },
      });
      return;
    }

    res.status(err.status || 500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: err.message || 'Failed to create playlist',
      },
    });
  }
}

/**
 * GET /api/playlists
 * Retrieves user's playlists
 */
export async function getUserPlaylists(req: Request, res: Response): Promise<void> {
  try {
    const authenticatedUserId = req.user?.id;
    if (!authenticatedUserId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required to view playlists',
        },
      });
      return;
    }

    const playlists = await playlistService.getUserPlaylists(authenticatedUserId);

    res.status(200).json({
      success: true,
      data: {
        playlists,
        total: playlists.length,
      },
    });
  } catch (err: any) {
    res.status(err.status || 500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: err.message || 'Failed to retrieve playlists',
      },
    });
  }
}

/**
 * GET /api/playlists/:id
 * Retrieves playlist details by ID (with IDOR protection)
 */
export async function getPlaylistById(req: Request, res: Response): Promise<void> {
  try {
    const { id } = playlistIdParamSchema.parse(req.params);
    const authenticatedUserId = req.user?.id;

    const playlist = await playlistService.getPlaylistById(authenticatedUserId, id);

    res.status(200).json({
      success: true,
      data: playlist,
    });
  } catch (err: any) {
    if (err instanceof ZodError) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid playlist ID parameter',
          details: err.errors,
        },
      });
      return;
    }

    const status = err.status || 500;
    res.status(status).json({
      success: false,
      error: {
        code: status === 403 ? 'FORBIDDEN' : status === 404 ? 'NOT_FOUND' : 'INTERNAL_ERROR',
        message: err.message || 'Failed to retrieve playlist',
      },
    });
  }
}

/**
 * PUT /api/playlists/:id
 * Updates playlist metadata (with IDOR protection)
 */
export async function updatePlaylist(req: Request, res: Response): Promise<void> {
  try {
    const authenticatedUserId = req.user?.id;
    if (!authenticatedUserId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required to update a playlist',
        },
      });
      return;
    }

    const { id } = playlistIdParamSchema.parse(req.params);
    const input = updatePlaylistSchema.parse(req.body);

    const playlist = await playlistService.updatePlaylist(authenticatedUserId, id, input);

    res.status(200).json({
      success: true,
      data: playlist,
    });
  } catch (err: any) {
    if (err instanceof ZodError) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid playlist update payload',
          details: err.errors,
        },
      });
      return;
    }

    const status = err.status || 500;
    res.status(status).json({
      success: false,
      error: {
        code: status === 403 ? 'FORBIDDEN' : status === 404 ? 'NOT_FOUND' : 'INTERNAL_ERROR',
        message: err.message || 'Failed to update playlist',
      },
    });
  }
}

/**
 * DELETE /api/playlists/:id
 * Deletes a playlist (with IDOR protection)
 */
export async function deletePlaylist(req: Request, res: Response): Promise<void> {
  try {
    const authenticatedUserId = req.user?.id;
    if (!authenticatedUserId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required to delete a playlist',
        },
      });
      return;
    }

    const { id } = playlistIdParamSchema.parse(req.params);
    const result = await playlistService.deletePlaylist(authenticatedUserId, id);

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
          message: 'Invalid playlist ID parameter',
          details: err.errors,
        },
      });
      return;
    }

    const status = err.status || 500;
    res.status(status).json({
      success: false,
      error: {
        code: status === 403 ? 'FORBIDDEN' : status === 404 ? 'NOT_FOUND' : 'INTERNAL_ERROR',
        message: err.message || 'Failed to delete playlist',
      },
    });
  }
}

/**
 * POST /api/playlists/:id/songs/:songId
 * Adds a song to a playlist (with IDOR protection)
 */
export async function addSongToPlaylist(req: Request, res: Response): Promise<void> {
  try {
    const authenticatedUserId = req.user?.id;
    if (!authenticatedUserId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required to modify playlist songs',
        },
      });
      return;
    }

    const { id, songId } = playlistSongParamSchema.parse(req.params);
    const playlist = await playlistService.addSongToPlaylist(authenticatedUserId, id, songId);

    res.status(200).json({
      success: true,
      data: playlist,
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
        code: status === 403 ? 'FORBIDDEN' : status === 404 ? 'NOT_FOUND' : 'INTERNAL_ERROR',
        message: err.message || 'Failed to add song to playlist',
      },
    });
  }
}

/**
 * DELETE /api/playlists/:id/songs/:songId
 * Removes a song from a playlist (with IDOR protection)
 */
export async function removeSongFromPlaylist(req: Request, res: Response): Promise<void> {
  try {
    const authenticatedUserId = req.user?.id;
    if (!authenticatedUserId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required to modify playlist songs',
        },
      });
      return;
    }

    const { id, songId } = playlistSongParamSchema.parse(req.params);
    const playlist = await playlistService.removeSongFromPlaylist(authenticatedUserId, id, songId);

    res.status(200).json({
      success: true,
      data: playlist,
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
        code: status === 403 ? 'FORBIDDEN' : status === 404 ? 'NOT_FOUND' : 'INTERNAL_ERROR',
        message: err.message || 'Failed to remove song from playlist',
      },
    });
  }
}
