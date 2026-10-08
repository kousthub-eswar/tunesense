import { apiRequest } from './apiClient.js';
import type {
  PlaylistSummaryDto,
  PlaylistDetailDto,
  CreatePlaylistInput,
  UpdatePlaylistInput,
} from '../types/index.js';

export const playlistService = {
  /**
   * Create a new playlist
   */
  async createPlaylist(input: CreatePlaylistInput): Promise<PlaylistSummaryDto> {
    return apiRequest<{ success: boolean; data: PlaylistSummaryDto }>(
      '/playlists',
      {
        method: 'POST',
        body: JSON.stringify(input),
      }
    ).then((res) => res.data);
  },

  /**
   * Get user's playlists
   */
  async getUserPlaylists(): Promise<PlaylistSummaryDto[]> {
    return apiRequest<{ success: boolean; data: { playlists: PlaylistSummaryDto[]; total: number } }>(
      '/playlists',
      { method: 'GET' }
    ).then((res) => res.data.playlists);
  },

  /**
   * Get playlist details by ID
   */
  async getPlaylistById(playlistId: string): Promise<PlaylistDetailDto> {
    return apiRequest<{ success: boolean; data: PlaylistDetailDto }>(
      `/playlists/${playlistId}`,
      { method: 'GET' }
    ).then((res) => res.data);
  },

  /**
   * Update playlist metadata
   */
  async updatePlaylist(playlistId: string, input: UpdatePlaylistInput): Promise<PlaylistSummaryDto> {
    return apiRequest<{ success: boolean; data: PlaylistSummaryDto }>(
      `/playlists/${playlistId}`,
      {
        method: 'PUT',
        body: JSON.stringify(input),
      }
    ).then((res) => res.data);
  },

  /**
   * Delete playlist
   */
  async deletePlaylist(playlistId: string): Promise<{ success: boolean; deletedId: string }> {
    return apiRequest<{ success: boolean; data: { success: boolean; deletedId: string } }>(
      `/playlists/${playlistId}`,
      { method: 'DELETE' }
    ).then((res) => res.data);
  },

  /**
   * Add song to playlist
   */
  async addSongToPlaylist(playlistId: string, songId: string): Promise<PlaylistDetailDto> {
    return apiRequest<{ success: boolean; data: PlaylistDetailDto }>(
      `/playlists/${playlistId}/songs/${songId}`,
      { method: 'POST' }
    ).then((res) => res.data);
  },

  /**
   * Remove song from playlist
   */
  async removeSongFromPlaylist(playlistId: string, songId: string): Promise<PlaylistDetailDto> {
    return apiRequest<{ success: boolean; data: PlaylistDetailDto }>(
      `/playlists/${playlistId}/songs/${songId}`,
      { method: 'DELETE' }
    ).then((res) => res.data);
  },
};
