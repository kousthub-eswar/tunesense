import { apiRequest } from './apiClient.js';
import type { TrackItem, HistoryItem, LibrarySummaryDto } from '../types/index.js';

export const libraryService = {
  /**
   * Like a song
   */
  async likeSong(songId: string): Promise<{ success: boolean; isLiked: boolean; songId: string }> {
    return apiRequest<{ success: boolean; data: { success: boolean; isLiked: boolean; songId: string } }>(
      `/library/likes/${songId}`,
      { method: 'POST' }
    ).then((res) => res.data);
  },

  /**
   * Unlike a song
   */
  async unlikeSong(songId: string): Promise<{ success: boolean; isLiked: boolean; songId: string }> {
    return apiRequest<{ success: boolean; data: { success: boolean; isLiked: boolean; songId: string } }>(
      `/library/likes/${songId}`,
      { method: 'DELETE' }
    ).then((res) => res.data);
  },

  /**
   * Check liked status for one or more songs
   */
  async checkLikes(songIds: string[]): Promise<Record<string, boolean>> {
    if (songIds.length === 0) return {};
    const query = encodeURIComponent(songIds.join(','));
    return apiRequest<{ success: boolean; data: Record<string, boolean> }>(
      `/library/likes/check?songIds=${query}`,
      { method: 'GET' }
    ).then((res) => res.data);
  },

  /**
   * Get all liked songs
   */
  async getLikedSongs(): Promise<TrackItem[]> {
    return apiRequest<{ success: boolean; data: { songs: TrackItem[]; total: number } }>(
      '/library/likes',
      { method: 'GET' }
    ).then((res) => res.data.songs);
  },

  /**
   * Get listening history (recently played)
   */
  async getHistory(limit = 20): Promise<HistoryItem[]> {
    return apiRequest<{ success: boolean; data: { history: HistoryItem[]; total: number } }>(
      `/library/history?limit=${limit}`,
      { method: 'GET' }
    ).then((res) => res.data.history);
  },

  /**
   * Get library overview summary
   */
  async getLibrarySummary(): Promise<LibrarySummaryDto> {
    return apiRequest<{ success: boolean; data: LibrarySummaryDto }>(
      '/library',
      { method: 'GET' }
    ).then((res) => res.data);
  },
};
