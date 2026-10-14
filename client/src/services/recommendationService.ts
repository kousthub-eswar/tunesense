import { apiRequest } from './apiClient.js';
import type { RecommendationResponse, RecommendationResultDto } from '../types/index.js';

export const recommendationService = {
  /**
   * Retrieves personalized music recommendations for the current authenticated user.
   */
  async getRecommendations(limit = 10, strategy = 'hybrid', mood?: string): Promise<RecommendationResultDto> {
    const params: Record<string, any> = {
      limit,
      strategy,
    };
    if (mood) {
      params.mood = mood;
    }

    const res = await apiRequest<RecommendationResponse>('/recommendations', {
      method: 'GET',
      params,
    });

    return res.data;
  },

  /**
   * Retrieves music recommendations matching visual vibe attributes (energy, valence, danceability).
   */
  async getRecommendationsByVibe(vibe: {
    energy: number;
    valence: number;
    danceability: number;
    limit?: number;
    dominantColors?: string[];
  }): Promise<RecommendationResultDto> {
    const res = await apiRequest<RecommendationResponse>('/recommendations/by-vibe', {
      method: 'POST',
      body: JSON.stringify(vibe),
    });
    return res.data;
  },

  /**
   * Plans an Emotional GPS music journey between two moods across interpolated waypoints.
   */
  async getJourneyRecommendations(payload: {
    fromMood: string;
    toMood: string;
    steps?: number;
  }): Promise<any> {
    const res = await apiRequest<{ success: boolean; data: any }>('/recommendations/journey', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data;
  },
};
