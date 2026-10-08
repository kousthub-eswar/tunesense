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
};
