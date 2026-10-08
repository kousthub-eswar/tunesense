import {
  ComponentScores,
  IRecommendationStrategy,
  RecommendationContext,
  RecommendationItemDto,
  RecommendationResultDto,
  RecommendationStrategyType,
  ScoredCandidate,
} from './types.js';
import { UserPreferenceDto } from '../../types/index.js';
import { RECOMMENDATION_CONFIG } from './recommendationConfig.js';
import { CandidateGenerator } from './CandidateGenerator.js';
import { RecommendationExplainer } from './RecommendationExplainer.js';
import { RecommendationScorer } from './RecommendationScorer.js';
import { PopularityStrategy } from './strategies/PopularityStrategy.js';
import { ContentStrategy } from './strategies/ContentStrategy.js';
import { BehaviourStrategy } from './strategies/BehaviourStrategy.js';
import { ContextStrategy } from './strategies/ContextStrategy.js';
import { HybridStrategy } from './strategies/HybridStrategy.js';
import { CollaborativeStrategy } from './strategies/CollaborativeStrategy.js';
import { CollaborativeHybridStrategy } from './strategies/CollaborativeHybridStrategy.js';
import { UserTasteProfileService, userTasteProfileService } from '../profile/UserTasteProfileService.js';
import { UserPreferenceService, userPreferenceService } from '../preference/UserPreferenceService.js';
import { MusicCatalogueService } from '../music/MusicCatalogueService.js';
import { getMusicProvider } from '../../providers/index.js';
import { isValidMood } from '../../config/moodConfig.js';

export class RecommendationEngine {
  private readonly candidateGenerator: CandidateGenerator;
  private readonly strategies: Map<RecommendationStrategyType, IRecommendationStrategy>;

  constructor(
    private readonly catalogueService: MusicCatalogueService = new MusicCatalogueService(getMusicProvider()),
    private readonly profileService: UserTasteProfileService = userTasteProfileService,
    private readonly preferenceService: UserPreferenceService = userPreferenceService
  ) {
    this.candidateGenerator = new CandidateGenerator(this.catalogueService);

    // Register all strategy layers (R0 - R5)
    this.strategies = new Map<RecommendationStrategyType, IRecommendationStrategy>([
      ['popularity', new PopularityStrategy()],
      ['content', new ContentStrategy()],
      ['behaviour', new BehaviourStrategy()],
      ['context', new ContextStrategy()],
      ['hybrid', new HybridStrategy()],
      ['collaborative', new CollaborativeStrategy()],
      ['collaborativeHybrid', new CollaborativeHybridStrategy()],
    ]);
  }

  /**
   * Generates ranked, diverse, explainable music recommendations for an authenticated user.
   */
  public async getRecommendations(
    userId: string,
    options?: {
      limit?: number;
      strategy?: RecommendationStrategyType;
      contextOverride?: Partial<RecommendationContext>;
      deterministic?: boolean;
      mood?: string;
    }
  ): Promise<RecommendationResultDto> {
    const limit = Math.max(
      RECOMMENDATION_CONFIG.limits.minLimit,
      Math.min(RECOMMENDATION_CONFIG.limits.maxLimit, options?.limit ?? RECOMMENDATION_CONFIG.limits.defaultLimit)
    );

    const strategyType = options?.strategy || 'hybrid';
    const strategy = this.strategies.get(strategyType) || this.strategies.get('hybrid')!;

    // 1. Establish temporal listening context and active mood
    const currentContext = this.resolveContext(options?.contextOverride);

    // 2. Fetch User Explicit Preferences (Stage 8)
    let userPreferences: UserPreferenceDto | null = null;
    try {
      userPreferences = await this.preferenceService.getPreferences(userId);
    } catch (err) {
      console.warn(`[RecommendationEngine] Notice: Could not retrieve preferences for user ${userId}:`, err);
    }

    // Resolve active mood: explicit query parameter > context override > saved preferred mood
    const requestedMood = options?.mood || options?.contextOverride?.mood || userPreferences?.preferredMood;
    const activeMood = isValidMood(requestedMood) ? requestedMood.toLowerCase().trim() : undefined;
    currentContext.mood = activeMood;

    // 3. Fetch User Taste Profile (or null if unavailable)
    let profile = null;
    try {
      profile = await this.profileService.getProfile(userId);
    } catch (err) {
      console.warn(`[RecommendationEngine] Notice: Could not retrieve taste profile for user ${userId}:`, err);
    }

    const confidence = profile?.profileConfidence ?? 0;

    // 4. Generate candidate song pool (including preferred genres and filtering disliked)
    const { candidates, popularityMap, userPlayCounts, collaborativeConfidence } =
      await this.candidateGenerator.generateCandidates(userId, profile as any, userPreferences);

    const recommendationRequestId = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `rec_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    if (candidates.length === 0) {
      return {
        recommendationRequestId,
        strategy: strategyType,
        generatedAt: new Date().toISOString(),
        recommendations: [],
        confidence,
        totalCandidatesEvaluated: 0,
        activeMood,
      };
    }

    // 5. Score all candidates using the selected strategy
    const scoredCandidates: ScoredCandidate[] = [];

    for (const candidate of candidates) {
      let score: number;
      let signal;
      let components: ComponentScores;

      if (strategyType === 'collaborativeHybrid') {
        const collabHybridStrat = strategy as CollaborativeHybridStrategy;
        const res = collabHybridStrat.score(
          candidate,
          currentContext,
          profile as any,
          popularityMap,
          userPlayCounts,
          userPreferences,
          collaborativeConfidence
        );
        score = res.score;
        signal = res.signal;
        components = res.components;
      } else if (strategyType === 'collaborative') {
        const collabStrat = strategy as CollaborativeStrategy;
        const res = collabStrat.score(
          candidate,
          currentContext,
          profile as any,
          popularityMap,
          userPlayCounts,
          userPreferences,
          collaborativeConfidence
        );
        score = res.score;
        signal = res.signal;
        components = {
          popularity: popularityMap.get(candidate.id) ?? 0.5,
          content: 0.5,
          behaviour: 0.5,
          context: 0.5,
          novelty: RecommendationScorer.calculateNoveltyScore(candidate.id, userPlayCounts),
          collaborative: candidate.collaborativeScore ?? 0,
          mood: activeMood ? 0.5 : undefined,
        };
      } else if (strategyType === 'hybrid') {
        const hybridStrat = strategy as HybridStrategy;
        const res = hybridStrat.score(
          candidate,
          currentContext,
          profile as any,
          popularityMap,
          userPlayCounts,
          userPreferences
        );
        score = res.score;
        signal = res.signal;
        components = res.components;
      } else {
        const res = strategy.score(
          candidate,
          currentContext,
          profile as any,
          popularityMap,
          userPlayCounts
        );
        score = res.score;
        signal = res.signal;
        components = {
          popularity: popularityMap.get(candidate.id) ?? 0.5,
          content: strategyType === 'content' ? score : 0.5,
          behaviour: strategyType === 'behaviour' ? score : 0.5,
          context: strategyType === 'context' ? score : 0.5,
          novelty: RecommendationScorer.calculateNoveltyScore(candidate.id, userPlayCounts),
          collaborative: candidate.collaborativeScore ?? 0,
          mood: activeMood ? 0.5 : undefined,
        };
      }

      const reason = RecommendationExplainer.generateReason(signal);

      scoredCandidates.push({
        song: {
          id: candidate.id,
          title: candidate.title,
          artistId: candidate.artistId,
          artistName: candidate.artistName,
          albumId: candidate.albumId,
          albumTitle: candidate.albumTitle,
          durationSeconds: candidate.durationSeconds,
          artworkUrl: candidate.artworkUrl,
          streamUrl: candidate.streamUrl,
          genres: candidate.genres,
          languages: candidate.languages,
          provider: candidate.provider,
          providerTrackId: candidate.providerTrackId,
        },
        score: RecommendationScorer.clamp(score),
        components,
        explanationSignal: signal,
        reason,
      });
    }

    // 6. Apply Deterministic Sorting
    scoredCandidates.sort((a, b) => {
      const diff = b.score - a.score;
      if (Math.abs(diff) > 0.0001) {
        return diff;
      }
      // Tie-breaker: stable by song ID
      return a.song.id.localeCompare(b.song.id);
    });

    // 7. Apply Diversity Constraints & Exploration Slots (Modulated by User Settings)
    const recommendations = this.applyDiversityAndExploration(
      scoredCandidates,
      limit,
      options?.deterministic ?? true,
      userPreferences
    );

    return {
      recommendationRequestId,
      strategy: strategyType,
      generatedAt: new Date().toISOString(),
      recommendations,
      confidence,
      totalCandidatesEvaluated: candidates.length,
      activeMood,
    };
  }

  /**
   * Applies artist and album diversity constraints while reserving slots for novelty exploration.
   * Settings are dynamically tuned by user personalizationSettings (explorationLevel, diversityLevel).
   */
  private applyDiversityAndExploration(
    candidates: ScoredCandidate[],
    limit: number,
    _deterministic: boolean,
    userPreferences?: UserPreferenceDto | null
  ): RecommendationItemDto[] {
    const explorationLevel = userPreferences?.personalizationSettings?.explorationLevel ?? 0.5;
    const diversityLevel = userPreferences?.personalizationSettings?.diversityLevel ?? 0.7;

    // Modulate diversity caps by diversityLevel setting
    let maxPerArtist: number = RECOMMENDATION_CONFIG.diversity.maxPerArtist;
    let maxPerAlbum: number = RECOMMENDATION_CONFIG.diversity.maxPerAlbum;
    if (diversityLevel >= 0.85) {
      maxPerArtist = 1;
      maxPerAlbum = 1;
    } else if (diversityLevel <= 0.35) {
      maxPerArtist = 3;
      maxPerAlbum = 3;
    }

    // Modulate exploration slots by explorationLevel setting (0.0 -> 0%, 1.0 -> 30%)
    const effectiveExplorationRatio = explorationLevel * 0.30;
    const explorationSlots = Math.max(0, Math.min(3, Math.round(limit * effectiveExplorationRatio)));
    const coreSlots = limit - explorationSlots;

    const selected: RecommendationItemDto[] = [];
    const selectedIds = new Set<string>();
    const artistCounts = new Map<string, number>();
    const albumCounts = new Map<string, number>();

    const canSelect = (candidate: ScoredCandidate): boolean => {
      if (selectedIds.has(candidate.song.id)) return false;

      const artistKey = candidate.song.artistName || candidate.song.artistId || 'unknown';
      if ((artistCounts.get(artistKey) || 0) >= maxPerArtist) return false;

      if (candidate.song.albumTitle) {
        if ((albumCounts.get(candidate.song.albumTitle) || 0) >= maxPerAlbum) return false;
      }

      return true;
    };

    const addCandidate = (c: ScoredCandidate, forceReason?: string, forceType?: any) => {
      selected.push({
        song: c.song,
        score: c.score,
        reason: forceReason || c.reason,
        reasonType: forceType || c.explanationSignal.type,
        components: c.components,
      });
      selectedIds.add(c.song.id);

      const artistKey = c.song.artistName || c.song.artistId || 'unknown';
      artistCounts.set(artistKey, (artistCounts.get(artistKey) || 0) + 1);

      if (c.song.albumTitle) {
        albumCounts.set(c.song.albumTitle, (albumCounts.get(c.song.albumTitle) || 0) + 1);
      }
    };

    // Step A: Fill core personalized slots from top ranked
    for (const c of candidates) {
      if (selected.length >= coreSlots) break;
      if (canSelect(c)) {
        addCandidate(c);
      }
    }

    // Step B: Fill exploration slots prioritizing high novelty among remaining candidates
    if (explorationSlots > 0 && selected.length < limit) {
      const remaining = candidates.filter((c) => !selectedIds.has(c.song.id));
      // Sort remaining by novelty score descending
      remaining.sort((a, b) => {
        const diff = b.components.novelty - a.components.novelty;
        if (Math.abs(diff) > 0.001) return diff;
        return a.song.id.localeCompare(b.song.id);
      });

      for (const c of remaining) {
        if (selected.length >= limit) break;
        if (canSelect(c)) {
          addCandidate(c, 'Something new to explore based on your taste', 'novelty');
        }
      }
    }

    // Step C: Fallback to fill remaining quota if diversity was too restrictive
    if (selected.length < limit) {
      for (const c of candidates) {
        if (selected.length >= limit) break;
        if (!selectedIds.has(c.song.id)) {
          addCandidate(c);
        }
      }
    }

    return selected;
  }

  /**
   * Derives current temporal context (timeOfDay, dayOfWeek).
   */
  private resolveContext(override?: Partial<RecommendationContext>): RecommendationContext {
    const now = override?.timestamp || new Date();
    const hour = now.getHours();

    let timeOfDay: RecommendationContext['timeOfDay'];
    if (hour >= 5 && hour < 12) {
      timeOfDay = 'morning';
    } else if (hour >= 12 && hour < 17) {
      timeOfDay = 'afternoon';
    } else if (hour >= 17 && hour < 22) {
      timeOfDay = 'evening';
    } else {
      timeOfDay = 'late_night';
    }

    const days: RecommendationContext['dayOfWeek'][] = [
      'sunday',
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
    ];
    const dayOfWeek = days[now.getDay()];

    return {
      timeOfDay: override?.timeOfDay || timeOfDay,
      dayOfWeek: override?.dayOfWeek || dayOfWeek,
      timestamp: now,
      mood: override?.mood,
    };
  }
}

export const recommendationEngine = new RecommendationEngine();
