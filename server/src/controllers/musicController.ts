import { Request, Response, NextFunction } from 'express';
import { getMusicProvider } from '../providers/index.js';
import { MusicCatalogueService } from '../services/music/MusicCatalogueService.js';

const catalogueService = new MusicCatalogueService(getMusicProvider());

/**
 * GET /api/music/search?q=:query&limit=20&offset=0
 */
export async function searchMusic(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const q = req.query.q;
    if (!q || typeof q !== 'string' || q.trim().length === 0) {
      res.status(400).json({
        error: {
          message: "Query parameter 'q' is required and cannot be empty.",
          code: 'INVALID_QUERY',
        },
      });
      return;
    }

    const limit = Math.min(Math.max(parseInt(String(req.query.limit || '20'), 10) || 20, 1), 50);
    const offset = Math.max(parseInt(String(req.query.offset || '0'), 10) || 0, 0);

    const results = await catalogueService.search(q.trim(), limit, offset);

    res.status(200).json({
      status: 'ok',
      data: results,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/music/popular?limit=20
 */
export async function getPopularMusic(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const limit = Math.min(Math.max(parseInt(String(req.query.limit || '20'), 10) || 20, 1), 50);
    const tracks = await catalogueService.getPopularTracks(limit);

    res.status(200).json({
      status: 'ok',
      data: {
        tracks,
        totalResults: tracks.length,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/music/tracks/:id
 */
export async function getTrack(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!id || typeof id !== 'string') {
      res.status(400).json({
        error: {
          message: 'Track ID parameter is required.',
          code: 'MISSING_PARAM',
        },
      });
      return;
    }

    const track = await catalogueService.getTrackById(id);
    if (!track) {
      res.status(404).json({
        error: {
          message: `Track '${id}' not found.`,
          code: 'TRACK_NOT_FOUND',
        },
      });
      return;
    }

    res.status(200).json({
      status: 'ok',
      data: track,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/music/tracks/:id/stream
 */
export async function getTrackStream(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!id || typeof id !== 'string') {
      res.status(400).json({
        error: {
          message: 'Track ID parameter is required.',
          code: 'MISSING_PARAM',
        },
      });
      return;
    }

    const streamInfo = await catalogueService.getStreamUrl(id);
    if (!streamInfo || !streamInfo.streamUrl) {
      res.status(404).json({
        error: {
          message: `Playable audio stream for track '${id}' is currently unavailable.`,
          code: 'STREAM_UNAVAILABLE',
        },
      });
      return;
    }

    res.status(200).json({
      status: 'ok',
      data: streamInfo,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/music/artists/:id
 */
export async function getArtist(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!id || typeof id !== 'string') {
      res.status(400).json({
        error: {
          message: 'Artist ID parameter is required.',
          code: 'MISSING_PARAM',
        },
      });
      return;
    }

    const artist = await catalogueService.getArtistById(id);
    if (!artist) {
      res.status(404).json({
        error: {
          message: `Artist '${id}' not found.`,
          code: 'ARTIST_NOT_FOUND',
        },
      });
      return;
    }

    res.status(200).json({
      status: 'ok',
      data: artist,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/music/albums/:id
 */
export async function getAlbum(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!id || typeof id !== 'string') {
      res.status(400).json({
        error: {
          message: 'Album ID parameter is required.',
          code: 'MISSING_PARAM',
        },
      });
      return;
    }

    const album = await catalogueService.getAlbumById(id);
    if (!album) {
      res.status(404).json({
        error: {
          message: `Album '${id}' not found.`,
          code: 'ALBUM_NOT_FOUND',
        },
      });
      return;
    }

    res.status(200).json({
      status: 'ok',
      data: album,
    });
  } catch (err) {
    next(err);
  }
}
