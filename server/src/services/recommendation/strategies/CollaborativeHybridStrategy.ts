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
import { COLLABORATIVE_CONFIG } from '../../../config/collaborativeConfig.js';
import { getMoodProfile } from '../../../config/moodConfig.js';
import { PopularityStrategy } from './PopularityStrategy.js';
import { ContentStrategy } from './ContentStrategy.js';
import { BehaviourStrategy } from './BehaviourStrategy.js';
import { ContextStrategy } from './ContextStrategy.js';
import { collaborativeService } from '../CollaborativeService.js';

export class CollaborativeHybridStrategy implements IRecommendationStrategy {
  public readonly name: RecommendationStrategyType = 'collaborativeHybrid';

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
    userPreferences?: UserPreferenceDto | null,
    collaborativeConfidence: number = 0
  ): { score: number; signal: ExplanationSignal; components: ComponentScores } {
    // 0. Check Negative Preferences (Disliked genres and artists)
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
        components: {
          popularity: 0,
          content: 0,
          behaviour: 0,
          context: 0,
          novelty: 0,
          mood: 0,
          collaborative: 0,
        },
      };
    }

    // 1. Calculate foundational strategy component scores
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

    // 2. Explicit Genre Preference Boost
    const explicitGenreBonus = RecommendationScorer.calculateExplicitGenreBonus(
      candidate.genres,
      userPreferences?.preferredGenres
    );
    const enhancedContentScore = RecommendationScorer.clamp(
      contentResult.score + explicitGenreBonus
    );

    // 3. Mood-Aware Scoring Component
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

    // 4. Collaborative Component Score
    const rawCollabScore = candidate.collaborativeScore ?? 0;
    const clampedCollabScore = RecommendationScorer.clamp(rawCollabScore);

    // 5. Dynamic Weight Blending & Safe Redistribution (Section 11 & 13)
    const base = COLLABORATIVE_CONFIG.r5Weights;
    const profileConf = profile ? Math.max(0, Math.min(1, profile.profileConfidence ?? 0)) : 0;
    const collabConf = Math.max(0, Math.min(1, collaborativeConfidence));

    // Calculate effective collaborative weight scaled by confidence
    const effectiveCollabWeight = base.collaborative * collabConf;
    const unallocatedCollabWeight = base.collaborative - effectiveCollabWeight;

    // Distribute unallocated collaborative weight safely to content, behaviour, and context
    const personalBaseSum = base.content + base.behaviour + base.context || 1;
    const contentScale = (base.content / personalBaseSum) * unallocatedCollabWeight;
    const behaviourScale = (base.behaviour / personalBaseSum) * unallocatedCollabWeight;
    const contextScale = (base.context / personalBaseSum) * unallocatedCollabWeight;

    let wContent = (base.content + contentScale) * profileConf;
    let wBehaviour = (base.behaviour + behaviourScale) * profileConf;
    let wContext = (base.context + contextScale) * profileConf;
    let wMood = isMoodActive && moodScore !== undefined ? base.mood : 0;

    // Popularity absorbs whatever personal weight remains unallocated due to low profile confidence
    const unallocatedProfileWeight =
      (base.content + contentScale) * (1 - profileConf) +
      (base.behaviour + behaviourScale) * (1 - profileConf) +
      (base.context + contextScale) * (1 - profileConf) +
      (isMoodActive ? 0 : base.mood);

    let wPopularity = base.popularity + unallocatedProfileWeight;

    // Sanity checks: strictly prevent negative or NaN weights
    wContent = Math.max(0, isNaN(wContent) ? 0 : wContent);
    wBehaviour = Math.max(0, isNaN(wBehaviour) ? 0 : wBehaviour);
    wContext = Math.max(0, isNaN(wContext) ? 0 : wContext);
    wMood = Math.max(0, isNaN(wMood) ? 0 : wMood);
    wPopularity = Math.max(0, isNaN(wPopularity) ? 0 : wPopularity);

    const weightedSum =
      wContent * enhancedContentScore +
      wBehaviour * behaviourResult.score +
      wContext * contextResult.score +
      wMood * (moodScore ?? 0) +
      effectiveCollabWeight * clampedCollabScore +
      wPopularity * popResult.score;

    // Soft novelty bonus
    const noveltyBonus = base.novelty * (noveltyScore - 0.5) * 0.2;
    const finalScore = RecommendationScorer.clamp(weightedSum + noveltyBonus);

    // 6. Dominant Signal Selection with Collaborative Explainability (Section 14 & 15)
    const signals: ExplanationSignal[] = [
      { ...contentResult.signal, strength: enhancedContentScore },
      behaviourResult.signal,
      contextResult.signal,
      popResult.signal,
    ];

    if (isMoodActive && moodScore !== undefined && activeMoodProfile) {
      signals.push({
        type: 'mood',
        value: activeMoodProfile.label,
        strength: moodScore,
        description: activeMoodProfile.explanationPhrase,
        secondaryGenre: contentResult.signal.type === 'genre' ? contentResult.signal.value : undefined,
      });
    }

    if (clampedCollabScore > 0 && collabConf > 0) {
      const collabSignal = collaborativeService.generateCollaborativeSignal(
        candidate,
        clampedCollabScore * collabConf
      );
      signals.push(collabSignal);
    }

    let dominantSignal: ExplanationSignal;
    if (profileConf < RECOMMENDATION_CONFIG.confidence.lowConfidenceThreshold && collabConf < 0.2 && !isMoodActive) {
      dominantSignal = {
        type: 'popularity',
        strength: popResult.score,
        description: 'Popular on TuneSense',
      };
    } else {
      dominantSignal = RecommendationExplainer.selectDominantSignal(signals);
    }

    const components: ComponentScores = {
      popularity: popResult.score,
      content: enhancedContentScore,
      behaviour: behaviourResult.score,
      context: contextResult.score,
      novelty: noveltyScore,
      mood: moodScore,
      collaborative: clampedCollabScore,
    };

    return {
      score: finalScore,
      signal: dominantSignal,
      components,
    };
  }
}
