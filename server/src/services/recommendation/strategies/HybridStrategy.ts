import {
  CandidateSongEnriched,
  ComponentScores,
  ExplanationSignal,
  IRecommendationStrategy,
  RecommendationContext,
  RecommendationStrategyType,
} from '../types.js';
import { IUserTasteProfile, UserPreferenceDto } from '../../../types/index.js';
import { RecommendationScorer } from '../RecommendationScorer.js';
import { RecommendationExplainer } from '../RecommendationExplainer.js';
import { RECOMMENDATION_CONFIG } from '../recommendationConfig.js';
import { getMoodProfile } from '../../../config/moodConfig.js';
import { PopularityStrategy } from './PopularityStrategy.js';
import { ContentStrategy } from './ContentStrategy.js';
import { BehaviourStrategy } from './BehaviourStrategy.js';
import { ContextStrategy } from './ContextStrategy.js';

export class HybridStrategy implements IRecommendationStrategy {
  public readonly name: RecommendationStrategyType = 'hybrid';

  private readonly popularityStrategy = new PopularityStrategy();
  private readonly contentStrategy = new ContentStrategy();
  private readonly behaviourStrategy = new BehaviourStrategy();
  private readonly contextStrategy = new ContextStrategy();

  public score(
    candidate: CandidateSongEnriched,
    context: RecommendationContext,
    profile: IUserTasteProfile | null,
    popularityMap: Map<string, number>,
    userPlayCounts: Map<string, number>,
    userPreferences?: UserPreferenceDto | null
  ): { score: number; signal: ExplanationSignal; components: ComponentScores } {
    // 0. Check Negative Preferences (Disliked genres and artists)
    const isDisliked = RecommendationScorer.isDisliked(
      candidate,
      userPreferences?.dislikedGenres,
      userPreferences?.dislikedArtists
    );

    if (isDisliked) {
      // Disliked tracks receive near-zero score and are penalized to the bottom
      return {
        score: 0.01,
        signal: {
          type: 'popularity',
          value: 'disliked',
          strength: 0,
          description: 'Penalized based on your negative preferences',
        },
        components: {
          popularity: 0,
          content: 0,
          behaviour: 0,
          context: 0,
          novelty: 0,
          mood: 0,
        },
      };
    }

    // 1. Calculate each foundational strategy component score
    const popResult = this.popularityStrategy.score(
      candidate,
      context,
      profile,
      popularityMap,
      userPlayCounts
    );
    const contentResult = this.contentStrategy.score(
      candidate,
      context,
      profile,
      popularityMap,
      userPlayCounts
    );
    const behaviourResult = this.behaviourStrategy.score(
      candidate,
      context,
      profile,
      popularityMap,
      userPlayCounts
    );
    const contextResult = this.contextStrategy.score(
      candidate,
      context,
      profile,
      popularityMap,
      userPlayCounts
    );
    const noveltyScore = RecommendationScorer.calculateNoveltyScore(
      candidate.id,
      userPlayCounts
    );

    // 2. Explicit Preference Boost (if candidate matches user preferredGenres)
    const explicitGenreBonus = RecommendationScorer.calculateExplicitGenreBonus(
      candidate.genres,
      userPreferences?.preferredGenres
    );
    const enhancedContentScore = RecommendationScorer.clamp(
      contentResult.score + explicitGenreBonus
    );

    // 3. Mood-Aware Scoring Component (Stage 8)
    const activeMoodProfile = getMoodProfile(context.mood);
    let moodScore: number | undefined = undefined;
    let isMoodActive = false;

    if (activeMoodProfile) {
      isMoodActive = true;
      const moodCalc = RecommendationScorer.calculateMoodScore(
        candidate.metadata,
        activeMoodProfile
      );
      moodScore = moodCalc.score;
    }

    // 4. Dynamic Weight Adaptation based on Profile Confidence & Active Mood
    const confidence = profile ? Math.max(0, Math.min(1, profile.profileConfidence ?? 0)) : 0;

    let weightedSum: number;

    if (isMoodActive && moodScore !== undefined) {
      // Mood is active: apply hybridWithMoodWeights
      const base = RECOMMENDATION_CONFIG.hybridWithMoodWeights;
      const wContent = base.content * confidence;
      const wBehaviour = base.behaviour * confidence;
      const wContext = base.context * confidence;
      // Mood acts as immediate user context and stays active even on cold start
      const wMood = base.mood;
      // Popularity absorbs remaining balance when confidence is low
      const wPopularity = base.popularity + (1 - confidence) * (base.content + base.behaviour + base.context);

      weightedSum =
        wContent * enhancedContentScore +
        wBehaviour * behaviourResult.score +
        wContext * contextResult.score +
        wMood * moodScore +
        wPopularity * popResult.score;
    } else {
      // Standard Stage 7 hybridWeights (no mood active)
      const base = RECOMMENDATION_CONFIG.hybridWeights;
      const wContent = base.content * confidence;
      const wBehaviour = base.behaviour * confidence;
      const wContext = base.context * confidence;
      const wPopularity = base.popularity + (1 - confidence) * (1 - base.popularity);

      weightedSum =
        wContent * enhancedContentScore +
        wBehaviour * behaviourResult.score +
        wContext * contextResult.score +
        wPopularity * popResult.score;
    }

    // Apply soft novelty bonus
    const noveltyBonus = RECOMMENDATION_CONFIG.diversity.noveltyWeight * (noveltyScore - 0.5) * 0.2;
    const finalScore = RecommendationScorer.clamp(weightedSum + noveltyBonus);

    // 5. Select Dominant Explanation Signal
    let dominantSignal: ExplanationSignal;

    if (confidence < RECOMMENDATION_CONFIG.confidence.lowConfidenceThreshold && !isMoodActive) {
      dominantSignal = {
        type: 'popularity',
        strength: popResult.score,
        description: 'Popular on TuneSense',
      };
    } else {
      const signals: ExplanationSignal[] = [
        { ...contentResult.signal, strength: enhancedContentScore },
        behaviourResult.signal,
        contextResult.signal,
        popResult.signal,
      ];

      // Add mood signal if mood is active and matches well
      if (isMoodActive && moodScore !== undefined && activeMoodProfile) {
        signals.push({
          type: 'mood',
          value: activeMoodProfile.label,
          strength: moodScore,
          description: activeMoodProfile.explanationPhrase,
          secondaryGenre: contentResult.signal.type === 'genre' ? contentResult.signal.value : undefined,
        });
      }

      dominantSignal = RecommendationExplainer.selectDominantSignal(signals);
    }

    const components: ComponentScores = {
      popularity: popResult.score,
      content: enhancedContentScore,
      behaviour: behaviourResult.score,
      context: contextResult.score,
      novelty: noveltyScore,
      mood: moodScore,
    };

    return {
      score: finalScore,
      signal: dominantSignal,
      components,
    };
  }
}
