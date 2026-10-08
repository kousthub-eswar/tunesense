import { apiRequest } from './apiClient.js';
import type { TasteProfileResponse, UserTasteProfileDto } from '../types/index.js';

export const tasteProfileService = {
  /**
   * Fetches the authenticated user's computed taste profile.
   */
  async getTasteProfile(): Promise<UserTasteProfileDto> {
    const res = await apiRequest<TasteProfileResponse>('/profile/taste', {
      method: 'GET',
    });
    return res.data;
  },

  /**
   * Triggers a deterministic rebuild of the user's taste profile materialized view.
   */
  async rebuildTasteProfile(): Promise<UserTasteProfileDto> {
    const res = await apiRequest<TasteProfileResponse>('/profile/taste/rebuild', {
      method: 'POST',
    });
    return res.data;
  },
};
