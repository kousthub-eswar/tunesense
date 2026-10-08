import { z } from 'zod';

export const likeSongParamSchema = z.object({
  songId: z.string().min(1, 'Song ID is required').trim(),
});

export const checkLikesQuerySchema = z.object({
  songIds: z.string().optional(),
});

export const historyQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const createPlaylistSchema = z.object({
  name: z.string().min(1, 'Playlist name is required').max(100, 'Playlist name cannot exceed 100 characters').trim(),
  description: z.string().max(500, 'Description cannot exceed 500 characters').trim().optional().default(''),
  isPublic: z.boolean().optional().default(false),
});

export const updatePlaylistSchema = z.object({
  name: z.string().min(1, 'Playlist name cannot be empty').max(100, 'Playlist name cannot exceed 100 characters').trim().optional(),
  description: z.string().max(500, 'Description cannot exceed 500 characters').trim().optional(),
  isPublic: z.boolean().optional(),
});

export const playlistIdParamSchema = z.object({
  id: z.string().min(1, 'Playlist ID is required').trim(),
});

export const playlistSongParamSchema = z.object({
  id: z.string().min(1, 'Playlist ID is required').trim(),
  songId: z.string().min(1, 'Song ID is required').trim(),
});
