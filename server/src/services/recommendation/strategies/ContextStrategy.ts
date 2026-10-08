import {
  CandidateSongEnriched,
  ExplanationSignal,
  IRecommendationStrategy,
  RecommendationContext,
  RecommendationStrategyType,
} from '../types.js';
import { IUserTasteProfile } from '../../../types/index.js';
import { RecommendationScorer } from '../RecommendationScorer.js';

export class ContextStrategy implements IRecommendationStrategy {
  public readonly name: RecommendationStrategyType = 'context';

  public score(
    candidate: CandidateSongEnriched,
    context: RecommendationContext,
    profile: IUserTasteProfile | null,
    popularityMap: Map<string, number>,
    _userPlayCounts: Map<string, number>
  ): { score: number; signal: ExplanationSignal } {
    const contextResult = RecommendationScorer.calculateContextMatch(
      candidate,
      context,
      profile?.context
    );

    // Support context with a mild musical relevance factor (either genre match or catalogue baseline)
    let musicalBaseline = 0.5;
    if (profile?.longTerm?.genres?.length) {
      const genreMatch = RecommendationScorer.calculateGenreMatch(
        candidate.genres,
        profile.longTerm.genres
      );
      musicalBaseline = genreMatch.score > 0 ? genreMatch.score : 0.4;
    } else {
      musicalBaseline = popularityMap.get(candidate.id) ?? 0.5;
    }

    // Context is a supporting signal (65% context alignment, 35% general relevance)
    const finalScore = RecommendationScorer.clamp(
      contextResult.score * 0.65 + musicalBaseline * 0.35
    );

    return {
      score: finalScore,
      signal: {
        type: 'context',
        value: context.timeOfDay,
        strength: contextResult.score,
        description: contextResult.description,
      },
    };
  }
}
