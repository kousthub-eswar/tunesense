import {
  CandidateSongEnriched,
  ExplanationSignal,
  IRecommendationStrategy,
  RecommendationContext,
  RecommendationStrategyType,
} from '../types.js';
import { IUserTasteProfile } from '../../../types/index.js';
import { RecommendationScorer } from '../RecommendationScorer.js';
import { RECOMMENDATION_CONFIG } from '../recommendationConfig.js';

export class BehaviourStrategy implements IRecommendationStrategy {
  public readonly name: RecommendationStrategyType = 'behaviour';

  public score(
    candidate: CandidateSongEnriched,
    _context: RecommendationContext,
    profile: IUserTasteProfile | null,
    _popularityMap: Map<string, number>,
    userPlayCounts: Map<string, number>
  ): { score: number; signal: ExplanationSignal } {
    if (!profile) {
      return {
        score: 0.5,
        signal: {
          type: 'popularity',
          strength: 0.5,
          description: 'Popular discovery',
        },
      };
    }

    const { longTermBlend, recentBlend } = RECOMMENDATION_CONFIG.behaviourWeights;

    // 1. Long-Term Genre Match
    const longTermMatch = RecommendationScorer.calculateGenreMatch(
      candidate.genres,
      profile.longTerm?.genres || []
    );

    // 2. Recent Taste Genre Match
    const recentMatch = RecommendationScorer.calculateGenreMatch(
      candidate.genres,
      profile.recent?.genres || []
    );

    // 3. Trending Genre Bonus
    let trendBonus = 0;
    let trendGenre: string | undefined;
    if (profile.trends?.genres) {
      for (const trend of profile.trends.genres) {
        if (
          trend.direction === 'rising' &&
          candidate.genres.some((g) => g.toLowerCase() === trend.genre.toLowerCase())
        ) {
          trendBonus += Math.min(0.20, trend.delta * 0.5);
          trendGenre = trend.genre;
        }
      }
    }

    // 4. Repeated Play Familiarity vs Fatigue
    const userPlays = userPlayCounts.get(candidate.id) || 0;
    let familiarityAdjustment = 0;
    if (userPlays === 1 || userPlays === 2) {
      // Mild positive repeat listening affinity
      familiarityAdjustment = +0.10;
    } else if (userPlays >= 5) {
      // Overexposure penalty
      familiarityAdjustment = -0.20;
    }

    // 5. Completion Tendency Bonus
    let completionHabitBonus = 0;
    if (profile.behaviour?.completionRate && profile.behaviour.completionRate > 0.60) {
      // If user consistently completes songs and this song is within normal track length (2-5 min)
      if (candidate.durationSeconds >= 120 && candidate.durationSeconds <= 360) {
        completionHabitBonus = 0.08;
      }
    }

    // Composite behavioural score
    const baseTaste = longTermBlend * longTermMatch.score + recentBlend * recentMatch.score;
    const finalScore = RecommendationScorer.clamp(
      baseTaste + trendBonus + familiarityAdjustment + completionHabitBonus
    );

    // Generate signal
    let signal: ExplanationSignal;
    if (recentMatch.score >= 0.40 && recentMatch.bestGenre) {
      signal = {
        type: 'recentTaste',
        value: recentMatch.bestGenre,
        strength: recentMatch.score,
      };
    } else if (trendGenre) {
      signal = {
        type: 'recentTaste',
        value: trendGenre,
        strength: Math.min(1.0, 0.6 + trendBonus),
      };
    } else if (longTermMatch.score >= 0.40 && longTermMatch.bestGenre) {
      signal = {
        type: 'genre',
        value: longTermMatch.bestGenre,
        strength: longTermMatch.score,
      };
    } else {
      signal = {
        type: 'recentTaste',
        value: candidate.genres[0],
        strength: finalScore,
      };
    }

    return {
      score: finalScore,
      signal,
    };
  }
}
