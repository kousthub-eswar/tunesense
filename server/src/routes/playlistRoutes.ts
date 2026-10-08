import { Router } from 'express';
import { requireAuth, optionalAuth } from '../middleware/authMiddleware.js';
import {
  createPlaylist,
  getUserPlaylists,
  getPlaylistById,
  updatePlaylist,
  deletePlaylist,
  addSongToPlaylist,
  removeSongFromPlaylist,
} from '../controllers/playlistController.js';

const playlistRoutes = Router();

// POST /api/playlists - Create new playlist
playlistRoutes.post('/', requireAuth, createPlaylist);

// GET /api/playlists - List user's playlists
playlistRoutes.get('/', requireAuth, getUserPlaylists);

// GET /api/playlists/:id - Get playlist by ID (supports public / owned)
playlistRoutes.get('/:id', optionalAuth, getPlaylistById);

// PUT /api/playlists/:id - Update playlist
playlistRoutes.put('/:id', requireAuth, updatePlaylist);

// DELETE /api/playlists/:id - Delete playlist
playlistRoutes.delete('/:id', requireAuth, deletePlaylist);

// POST /api/playlists/:id/songs/:songId - Add song to playlist
playlistRoutes.post('/:id/songs/:songId', requireAuth, addSongToPlaylist);

// DELETE /api/playlists/:id/songs/:songId - Remove song from playlist
playlistRoutes.delete('/:id/songs/:songId', requireAuth, removeSongFromPlaylist);

export default playlistRoutes;
