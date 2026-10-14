import { apiRequest } from './apiClient.js';
import type {
  CounterfactualSimulationRequestDto,
  CounterfactualSimulationResponseDto,
  MinimalChangeRecourseDto,
} from '../types/index.js';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: {
    code?: string;
    message?: string;
  };
}

export const counterfactualService = {
  /**
   * Runs a counterfactual What-If simulation comparing baseline vs counterfactual rankings.
   */
  async runSimulation(
    payload: CounterfactualSimulationRequestDto
  ): Promise<CounterfactualSimulationResponseDto> {
    const res = await apiRequest<ApiResponse<CounterfactualSimulationResponseDto>>(
      '/recommendations/counterfactual',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
    return res.data;
  },

  /**
   * Queries minimal-change counterfactual recourse to elevate a specific target track.
   */
  async findRecourse(
    targetSongId: string,
    targetRank: number = 5,
    applyDiversity = true,
    mood?: string
  ): Promise<MinimalChangeRecourseDto> {
    const res = await apiRequest<ApiResponse<MinimalChangeRecourseDto>>(
      '/recommendations/counterfactual/recourse',
      {
        method: 'POST',
        body: JSON.stringify({
          targetSongId,
          targetRank,
          applyDiversity,
          mood,
        }),
      }
    );
    return res.data;
  },

  /**
   * Explicitly updates user's permanent personalization settings from lab experimentation.
   */
  async applyPreferences(settings: {
    explorationLevel?: number;
    diversityLevel?: number;
    preferredMood?: string;
  }): Promise<{ message: string; preferences: any }> {
    const res = await apiRequest<ApiResponse<{ message: string; preferences: any }>>(
      '/recommendations/counterfactual/apply-preferences',
      {
        method: 'POST',
        body: JSON.stringify(settings),
      }
    );
    return res.data;
  },
};
