import { apiRequest } from './apiClient.js';
import type {
  UserListeningAnalyticsDto,
  RecommendationAnalyticsDto,
  RecordImpressionItem,
  OfflineEvaluationResultDto,
  StrategyComparisonDto,
  FeedbackSummaryDto,
} from '../types/index.js';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export const analyticsService = {
  /**
   * Retrieves user-level listening analytics.
   */
  async getUserAnalytics(): Promise<UserListeningAnalyticsDto> {
    const res = await apiRequest<ApiResponse<UserListeningAnalyticsDto>>('/analytics/me', {
      method: 'GET',
    });
    return res.data;
  },

  /**
   * Retrieves aggregate recommendation performance analytics.
   */
  async getRecommendationAnalytics(): Promise<RecommendationAnalyticsDto> {
    const res = await apiRequest<ApiResponse<RecommendationAnalyticsDto>>('/analytics/recommendations', {
      method: 'GET',
    });
    return res.data;
  },

  /**
   * Records recommendation impression batch.
   */
  async recordImpressions(impressions: RecordImpressionItem[]): Promise<{ recorded: number }> {
    const res = await apiRequest<ApiResponse<{ recorded: number }>>('/analytics/impressions', {
      method: 'POST',
      body: JSON.stringify({ impressions }),
    });
    return res.data;
  },

  /**
   * Submits subjective feedback for mood recommendation quality.
   */
  async submitMoodFeedback(data: {
    recommendationRequestId: string;
    mood: string;
    rating: number;
    songId?: string;
  }): Promise<{ id: string }> {
    const res = await apiRequest<ApiResponse<{ id: string }>>('/evaluation/mood-feedback', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.data;
  },

  /**
   * Submits subjective feedback for recommendation explanation helpfulness/trust.
   */
  async submitExplanationFeedback(data: {
    recommendationRequestId: string;
    rating: number;
    songId?: string;
    reasonType?: string;
  }): Promise<{ id: string }> {
    const res = await apiRequest<ApiResponse<{ id: string }>>('/evaluation/explanation-feedback', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.data;
  },

  /**
   * Retrieves summary of mood and explanation feedback.
   */
  async getFeedbackSummary(): Promise<FeedbackSummaryDto> {
    const res = await apiRequest<ApiResponse<FeedbackSummaryDto>>('/evaluation/feedback-summary', {
      method: 'GET',
    });
    return res.data;
  },

  /**
   * Runs offline evaluation / academic strategy comparison.
   */
  async getEvaluation(strategy = 'all', k = 10): Promise<StrategyComparisonDto | OfflineEvaluationResultDto> {
    const res = await apiRequest<ApiResponse<StrategyComparisonDto | OfflineEvaluationResultDto>>('/evaluation/recommendations', {
      method: 'GET',
      params: { strategy, k },
    });
    return res.data;
  },
};
