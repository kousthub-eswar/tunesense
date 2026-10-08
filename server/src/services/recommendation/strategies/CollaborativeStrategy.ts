import {
  CandidateSongEnriched,
  ExplanationSignal,
  IRecommendationStrategy,
  RecommendationContext,
  RecommendationStrategyType,
} from '../types.js';
import { IUserTasteProfile, UserPreferenceDto } from '../../../types/index.js';
import { RecommendationScorer } from '../RecommendationScorer.js';
import { collaborativeService } from '../CollaborativeService.js';
import { PopularityStrategy } from './PopularityStrategy.js';

export class CollaborativeStrategy implements IRecommendationStrategy {
  public readonly name: RecommendationStrategyType = 'collaborative';
  private readonly popularityStrategy = new PopularityStrategy();

  public score(
    candidate: CandidateSongEnriched,
    context: RecommendationContext,
    profile: IUserTasteProfile | null,
    popularityMap: Map<string, number>,
    userPlayCounts: Map<string, number>,
    userPreferences?: UserPreferenceDto | null,
    collaborativeConfidence: number = 0
  ): { score: number; signal: ExplanationSignal } {
    // 0. Check Negative Preferences
    const isDisliked = RecommendationScorer.isDisliked(
      candidate,
      userPreferences?.dislikedGenres,
      userPreferences?.dislikedArtists
    );

    if (isDisliked) {
      return {
        score: 0.01,
        signal: {
          type: 'popularity',
          value: 'disliked',
          strength: 0,
          description: 'Penalized based on your negative preferences',
        },
      };
    }

    const collabScore = candidate.collaborativeScore ?? 0;

    // Cold-start fallback: if no collaborative confidence or score, fall back to popularity baseline
    if (collaborativeConfidence <= 0 || collabScore <= 0) {
      const popRes = this.popularityStrategy.score(
        candidate,
        context,
        profile,
        popularityMap,
        userPlayCounts
      );
      return {
        score: popRes.score,
        signal: {
          type: 'popularity',
          strength: popRes.score,
          description: 'Popular on TuneSense (Insufficient listener overlap for collaborative filtering)',
        },
      };
    }

    const signal = collaborativeService.generateCollaborativeSignal(candidate, collabScore);

    return {
      score: RecommendationScorer.clamp(collabScore),
      signal,
    };
  }
}
