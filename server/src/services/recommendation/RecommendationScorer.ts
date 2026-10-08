import { CandidateSongEnriched, RecommendationContext } from './types.js';
import {
  IGenreAffinity,
  IArtistAffinity,
  ILanguageAffinity,
  IAudioFeaturePreference,
  IContextDistribution,
  ISongMetadata,
} from '../../types/index.js';
import { MoodAcousticProfile } from '../../config/moodConfig.js';


export class RecommendationScorer {
  /**
   * Clamp a numeric value safely between min and max.
   */
  public static clamp(val: number, min = 0, max = 1): number {
    if (isNaN(val)) return min;
    return Math.max(min, Math.min(max, val));
  }

  /**
   * Match candidate genres against a target genre affinity list.
   * Multiple matching genres increase the score smoothly.
   */
  public static calculateGenreMatch(
    candidateGenres: string[],
    targetGenres: IGenreAffinity[]
  ): { score: number; bestGenre?: string; maxGenreScore: number } {
    if (!candidateGenres || candidateGenres.length === 0 || !targetGenres || targetGenres.length === 0) {
      return { score: 0, maxGenreScore: 0 };
    }

    const targetMap = new Map<string, number>();
    for (const g of targetGenres) {
      targetMap.set(g.genre.toLowerCase(), g.score);
    }

    let totalScore = 0;
    let bestGenre: string | undefined;
    let maxGenreScore = 0;
    let matchesCount = 0;

    for (const rawGenre of candidateGenres) {
      const g = rawGenre.toLowerCase().trim();
      const score = targetMap.get(g);
      if (score !== undefined) {
        matchesCount++;
        totalScore += score;
        if (score > maxGenreScore) {
          maxGenreScore = score;
          bestGenre = rawGenre;
        }
      }
    }

    if (matchesCount === 0) {
      return { score: 0, maxGenreScore: 0 };
    }

    // Blend top genre score with slight multi-genre bonus (up to +0.20), capped at 1.0
    const multiGenreBonus = Math.min(0.20, (matchesCount - 1) * 0.10);
    const normalizedScore = this.clamp(maxGenreScore * 0.85 + multiGenreBonus);

    return {
      score: normalizedScore,
      bestGenre,
      maxGenreScore,
    };
  }

  /**
   * Match candidate artist against user's top artists.
   * If not found, returns 0.0 (unknown is neutral, not penalized).
   */
  public static calculateArtistMatch(
    candidateArtistId: string | undefined,
    targetArtists: IArtistAffinity[]
  ): { score: number; artistName?: string } {
    if (!candidateArtistId || !targetArtists || targetArtists.length === 0) {
      return { score: 0 };
    }

    const candidateIdStr = candidateArtistId.toString();
    for (const a of targetArtists) {
      if (a.artistId && a.artistId.toString() === candidateIdStr) {
        return {
          score: this.clamp(a.score),
          artistName: a.artistName,
        };
      }
    }

    return { score: 0 };
  }

  /**
   * Calculate acoustic similarity between candidate song features and user acoustic preferences.
   * Missing features do not penalize the song arbitrarily; available evidence is used.
   */
  public static calculateAudioFeatureSimilarity(
    candidateMetadata: Partial<ISongMetadata> | undefined,
    preferredFeatures: Partial<IAudioFeaturePreference> | undefined
  ): { score: number; topFeature?: string } {
    if (!candidateMetadata || !preferredFeatures) {
      return { score: 0.5 }; // Neutral fallback when no acoustic metadata exists
    }

    const features: Array<keyof IAudioFeaturePreference> = [
      'energy',
      'danceability',
      'valence',
      'acousticness',
      'instrumentalness',
    ];

    let totalSimilarity = 0;
    let comparedCount = 0;
    let bestFeature: string | undefined;
    let highestSim = -1;

    for (const feat of features) {
      const candidateVal = candidateMetadata[feat];
      const prefVal = preferredFeatures[feat];

      if (typeof candidateVal === 'number' && typeof prefVal === 'number') {
        const diff = Math.abs(candidateVal - prefVal);
        const sim = Math.max(0, 1 - diff);
        totalSimilarity += sim;
        comparedCount++;

        if (sim > highestSim) {
          highestSim = sim;
          bestFeature = feat;
        }
      }
    }

    // Tempo comparison (BPM)
    if (
      typeof candidateMetadata.tempo === 'number' &&
      typeof preferredFeatures.tempo === 'number' &&
      preferredFeatures.tempo > 0
    ) {
      const tempoDiff = Math.abs(candidateMetadata.tempo - preferredFeatures.tempo);
      const tempoSim = Math.max(0, 1 - tempoDiff / 80); // 80 BPM tolerance
      totalSimilarity += tempoSim;
      comparedCount++;

      if (tempoSim > highestSim) {
        highestSim = tempoSim;
        bestFeature = 'tempo';
      }
    }

    if (comparedCount === 0) {
      return { score: 0.5 };
    }

    return {
      score: this.clamp(totalSimilarity / comparedCount),
      topFeature: bestFeature,
    };
  }

  /**
   * Match candidate languages with user preferred languages.
   */
  public static calculateLanguageMatch(
    candidateLanguages: string[],
    targetLanguages: ILanguageAffinity[]
  ): number {
    if (!candidateLanguages || candidateLanguages.length === 0 || !targetLanguages || targetLanguages.length === 0) {
      return 0.5; // Neutral default
    }

    const langMap = new Map<string, number>();
    for (const l of targetLanguages) {
      langMap.set(l.language.toLowerCase(), l.score);
    }

    let maxScore = 0;
    for (const l of candidateLanguages) {
      const score = langMap.get(l.toLowerCase().trim());
      if (score !== undefined && score > maxScore) {
        maxScore = score;
      }
    }

    return this.clamp(maxScore);
  }

  /**
   * Calculate novelty: songs never played have novelty 1.0;
   * repeatedly played songs have declining novelty.
   */
  public static calculateNoveltyScore(
    candidateId: string,
    userPlayCounts: Map<string, number>
  ): number {
    const plays = userPlayCounts.get(candidateId) || 0;
    return this.clamp(1 - plays / 5);
  }

  /**
   * Calculate context match: compares current time of day and day of week
   * against the user's historical context distribution.
   */
  public static calculateContextMatch(
    candidate: CandidateSongEnriched,
    context: RecommendationContext,
    userContextDistribution?: IContextDistribution
  ): { score: number; description: string } {
    if (!userContextDistribution) {
      return { score: 0.5, description: 'Fits standard listening context' };
    }

    const timeDist = userContextDistribution.timeOfDay?.[context.timeOfDay] || 0.25;
    const dayDist = userContextDistribution.dayOfWeek?.[context.dayOfWeek] || 0.14;

    // Normalizing expected uniform distribution:
    // 4 time buckets => 0.25 is uniform
    // 7 day buckets => 0.14 is uniform
    const timeNorm = Math.min(1.0, timeDist / 0.40);
    const dayNorm = Math.min(1.0, dayDist / 0.25);

    // Context acoustic appropriateness:
    // Morning: favors higher acousticness/valence, moderate energy
    // Late Night: favors lower energy/tempo
    // Evening: favors higher danceability/energy
    let acousticAlignment = 0.5;
    if (candidate.metadata) {
      const energy = candidate.metadata.energy ?? 0.5;
      if (context.timeOfDay === 'late_night') {
        acousticAlignment = energy < 0.6 ? 0.8 : 0.3;
      } else if (context.timeOfDay === 'evening') {
        acousticAlignment = energy >= 0.5 ? 0.8 : 0.4;
      } else if (context.timeOfDay === 'morning') {
        acousticAlignment = energy <= 0.7 ? 0.75 : 0.45;
      }
    }

    const combinedScore = this.clamp(timeNorm * 0.45 + dayNorm * 0.25 + acousticAlignment * 0.30);
    const timeLabel = context.timeOfDay.replace('_', ' ');

    return {
      score: combinedScore,
      description: `Fits your ${timeLabel} listening pattern`,
    };
  }

  /**
   * Evaluates candidate acoustic alignment against a target mood profile.
   * Compares energy, valence, danceability, tempo, acousticness, and instrumentalness.
   * If candidate has no metadata, returns neutral baseline 0.50 without penalizing arbitrarily.
   */
  public static calculateMoodScore(
    candidateMetadata: Partial<ISongMetadata> | undefined,
    moodProfile: MoodAcousticProfile | null
  ): { score: number; featureHighlight?: string } {
    if (!moodProfile) {
      return { score: 0.5 };
    }

    if (!candidateMetadata) {
      return { score: 0.5, featureHighlight: moodProfile.name };
    }

    let totalSim = 0;
    let compared = 0;

    // Energy comparison (critical for mood)
    if (typeof candidateMetadata.energy === 'number') {
      const sim = Math.max(0, 1 - Math.abs(candidateMetadata.energy - moodProfile.energy));
      totalSim += sim * 1.5; // High weight for energy
      compared += 1.5;
    }

    // Valence comparison (critical for emotional tone)
    if (typeof candidateMetadata.valence === 'number') {
      const sim = Math.max(0, 1 - Math.abs(candidateMetadata.valence - moodProfile.valence));
      totalSim += sim * 1.5; // High weight for valence
      compared += 1.5;
    }

    // Danceability comparison
    if (typeof candidateMetadata.danceability === 'number' && typeof moodProfile.danceability === 'number') {
      const sim = Math.max(0, 1 - Math.abs(candidateMetadata.danceability - moodProfile.danceability));
      totalSim += sim;
      compared += 1;
    }

    // Tempo comparison (BPM)
    if (typeof candidateMetadata.tempo === 'number' && typeof moodProfile.tempo === 'number' && moodProfile.tempo > 0) {
      const tempoDiff = Math.abs(candidateMetadata.tempo - moodProfile.tempo);
      const sim = Math.max(0, 1 - tempoDiff / 60); // 60 BPM window
      totalSim += sim;
      compared += 1;
    }

    // Acousticness comparison
    if (typeof candidateMetadata.acousticness === 'number' && typeof moodProfile.acousticness === 'number') {
      const sim = Math.max(0, 1 - Math.abs(candidateMetadata.acousticness - moodProfile.acousticness));
      totalSim += sim;
      compared += 1;
    }

    // Instrumentalness comparison
    if (typeof candidateMetadata.instrumentalness === 'number' && typeof moodProfile.instrumentalness === 'number') {
      const sim = Math.max(0, 1 - Math.abs(candidateMetadata.instrumentalness - moodProfile.instrumentalness));
      totalSim += sim;
      compared += 1;
    }

    if (compared === 0) {
      return { score: 0.5, featureHighlight: moodProfile.name };
    }

    return {
      score: this.clamp(totalSim / compared),
      featureHighlight: moodProfile.name,
    };
  }

  /**
   * Determines if a candidate matches user explicit dislikes (disliked genres or artists).
   */
  public static isDisliked(
    candidate: CandidateSongEnriched,
    dislikedGenres: string[] = [],
    dislikedArtists: string[] = []
  ): boolean {
    if (dislikedGenres.length > 0 && candidate.genres.length > 0) {
      const lowerDisliked = new Set(dislikedGenres.map((g) => g.trim().toLowerCase()));
      for (const g of candidate.genres) {
        if (lowerDisliked.has(g.trim().toLowerCase())) {
          return true;
        }
      }
    }

    if (dislikedArtists.length > 0) {
      const candidateArtistId = candidate.artistId?.toString();
      if (candidateArtistId) {
        for (const da of dislikedArtists) {
          if (da.toString() === candidateArtistId) {
            return true;
          }
        }
      }
    }

    return false;
  }

  /**
   * Evaluates candidate overlap with user explicitly preferred genres.
   */
  public static calculateExplicitGenreBonus(
    candidateGenres: string[],
    preferredGenres: string[] = []
  ): number {
    if (!preferredGenres || preferredGenres.length === 0 || !candidateGenres || candidateGenres.length === 0) {
      return 0;
    }

    const preferredSet = new Set(preferredGenres.map((g) => g.trim().toLowerCase()));
    let matches = 0;
    for (const g of candidateGenres) {
      if (preferredSet.has(g.trim().toLowerCase())) {
        matches++;
      }
    }

    if (matches === 0) return 0;
    // Up to +0.25 bonus for matching explicitly chosen favorite genres
    return Math.min(0.25, 0.15 + (matches - 1) * 0.05);
  }
}

