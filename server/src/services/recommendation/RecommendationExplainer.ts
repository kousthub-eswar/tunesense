import { ExplanationSignal, RecommendationReasonType } from './types.js';

export class RecommendationExplainer {
  /**
   * Generates a clear, explainable, human-readable reason from a structured explanation signal.
   */
  public static generateReason(signal: ExplanationSignal): string {
    switch (signal.type) {
      case 'genre':
        if (signal.value) {
          return `Because you often listen to ${signal.value} music`;
        }
        return 'Matches your favorite music genres';

      case 'artist':
        if (signal.value) {
          return `More from ${signal.value}, an artist you frequently enjoy`;
        }
        return 'By an artist you enjoy';

      case 'recentTaste':
        if (signal.value) {
          return `Based on your recent listening to ${signal.value}`;
        }
        return 'Matches your trending musical taste';

      case 'audioFeature':
        if (signal.value) {
          const featureName = this.formatFeatureName(signal.value);
          return `Matches your preference for ${featureName} tracks`;
        }
        return 'Matches your preferred acoustic vibe';

      case 'context':
        if (signal.value) {
          return `Fits your ${signal.value.replace('_', ' ')} listening vibe`;
        }
        return 'Fits your current listening schedule';

      case 'mood':
        if (signal.value && signal.secondaryGenre) {
          return `Fits your ${signal.value} mood and your usual ${signal.secondaryGenre} taste`;
        }
        if (signal.value) {
          return `Picked for your ${signal.value} mood`;
        }
        return 'Matches your selected listening vibe';

      case 'novelty':
        return 'Something new to explore based on your taste';

      case 'collaborative':
        if (signal.description) {
          return signal.description;
        }
        if (signal.supportingUsersCount && signal.supportingUsersCount >= 3) {
          return 'Popular among listeners who also enjoy your music';
        }
        return 'Listeners with tastes similar to yours enjoyed this';

      case 'popularity':
      default:
        return 'Popular and trending on TuneSense';
    }
  }

  /**
   * Translates raw acoustic property keys into friendly user terminology.
   */
  private static formatFeatureName(featureKey: string): string {
    switch (featureKey) {
      case 'energy':
        return 'high-energy';
      case 'danceability':
        return 'rhythmic and danceable';
      case 'valence':
        return 'uplifting';
      case 'acousticness':
        return 'acoustic';
      case 'instrumentalness':
        return 'instrumental';
      case 'tempo':
        return 'fast-tempo';
      default:
        return featureKey;
    }
  }

  /**
   * Given multiple candidate component signals, selects the dominant, most explainable signal.
   */
  public static selectDominantSignal(signals: ExplanationSignal[]): ExplanationSignal {
    if (!signals || signals.length === 0) {
      return {
        type: 'popularity',
        strength: 0.5,
        description: 'Popular on TuneSense',
      };
    }

    // Sort by strength descending; in case of tie, prioritize mood > collaborative > recentTaste > artist > genre > audioFeature > context > novelty > popularity
    const priorityOrder: Record<RecommendationReasonType, number> = {
      mood: 9,
      collaborative: 8,
      recentTaste: 7,
      artist: 6,
      genre: 5,
      audioFeature: 4,
      context: 3,
      novelty: 2,
      popularity: 1,
    };


    return [...signals].sort((a, b) => {
      const diff = b.strength - a.strength;
      if (Math.abs(diff) > 0.08) {
        return diff;
      }
      return (priorityOrder[b.type] || 0) - (priorityOrder[a.type] || 0);
    })[0];
  }
}
