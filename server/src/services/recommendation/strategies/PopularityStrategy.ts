import {
  CandidateSongEnriched,
  ExplanationSignal,
  IRecommendationStrategy,
  RecommendationContext,
  RecommendationStrategyType,
} from '../types.js';
import { IUserTasteProfile } from '../../../types/index.js';
import { RecommendationScorer } from '../RecommendationScorer.js';

export class PopularityStrategy implements IRecommendationStrategy {
  public readonly name: RecommendationStrategyType = 'popularity';

  public score(
    candidate: CandidateSongEnriched,
    _context: RecommendationContext,
    _profile: IUserTasteProfile | null,
    popularityMap: Map<string, number>,
    _userPlayCounts: Map<string, number>
  ): { score: number; signal: ExplanationSignal } {
    const rawPop = popularityMap.get(candidate.id) ?? popularityMap.get(candidate.providerTrackId) ?? 0.5;
    const normalizedScore = RecommendationScorer.clamp(rawPop);

    return {
      score: normalizedScore,
      signal: {
        type: 'popularity',
        strength: normalizedScore,
        description: 'Popular across TuneSense listeners',
      },
    };
  }
}
