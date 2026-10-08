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

export class ContentStrategy implements IRecommendationStrategy {
  public readonly name: RecommendationStrategyType = 'content';

  public score(
    candidate: CandidateSongEnriched,
    _context: RecommendationContext,
    profile: IUserTasteProfile | null,
    _popularityMap: Map<string, number>,
    _userPlayCounts: Map<string, number>
  ): { score: number; signal: ExplanationSignal } {
    if (!profile || !profile.longTerm) {
      return {
        score: 0.5,
        signal: {
          type: 'popularity',
          strength: 0.5,
          description: 'Popular discovery',
        },
      };
    }

    const { genre: wGenre, artist: wArtist, audioFeatures: wAudio, language: wLang } =
      RECOMMENDATION_CONFIG.contentWeights;

    // 1. Genre Match
    const genreMatch = RecommendationScorer.calculateGenreMatch(
      candidate.genres,
      profile.longTerm.genres || []
    );

    // 2. Artist Match
    const artistMatch = RecommendationScorer.calculateArtistMatch(
      candidate.artistId,
      profile.longTerm.artists || []
    );

    // 3. Audio Features Similarity
    const audioMatch = RecommendationScorer.calculateAudioFeatureSimilarity(
      candidate.metadata,
      profile.longTerm.audioFeatures
    );

    // 4. Language Match
    const langScore = RecommendationScorer.calculateLanguageMatch(
      candidate.languages,
      profile.longTerm.languages || []
    );

    // Weighted linear combination
    const compositeScore = RecommendationScorer.clamp(
      wGenre * genreMatch.score +
      wArtist * artistMatch.score +
      wAudio * audioMatch.score +
      wLang * langScore
    );

    // Determine primary explanation signal
    let primarySignal: ExplanationSignal;
    if (artistMatch.score >= 0.60 && artistMatch.artistName) {
      primarySignal = {
        type: 'artist',
        value: artistMatch.artistName,
        strength: artistMatch.score,
      };
    } else if (genreMatch.score >= 0.40 && genreMatch.bestGenre) {
      primarySignal = {
        type: 'genre',
        value: genreMatch.bestGenre,
        strength: genreMatch.score,
      };
    } else if (audioMatch.topFeature) {
      primarySignal = {
        type: 'audioFeature',
        value: audioMatch.topFeature,
        strength: audioMatch.score,
      };
    } else {
      primarySignal = {
        type: 'genre',
        value: candidate.genres[0] || 'eclectic',
        strength: compositeScore,
      };
    }

    return {
      score: compositeScore,
      signal: primarySignal,
    };
  }
}
