import { apiRequest } from './apiClient.js';
import type { PreferenceResponse, UserPreferenceDto, UpdatePreferencesInput } from '../types/index.js';

export const preferenceService = {
  /**
   * Retrieves explicit music preferences for the current authenticated user.
   */
  async getPreferences(): Promise<UserPreferenceDto> {
    const res = await apiRequest<PreferenceResponse>('/preferences', {
      method: 'GET',
    });
    return res.data;
  },

  /**
   * Updates explicit music preferences for the current authenticated user.
   */
  async updatePreferences(data: UpdatePreferencesInput): Promise<UserPreferenceDto> {
    const res = await apiRequest<PreferenceResponse>('/preferences', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return res.data;
  },
};
