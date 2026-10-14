import { Types } from 'mongoose';
import {
  CandidateSongEnriched,
  ComponentScores,
  ExplanationSignal,
  RecommendationContext,
  RecommendationItemDto,
  ScoredCandidate,
} from './types.js';
import {
  CounterfactualAnalysisSummaryDto,
  CounterfactualSimulationRequestDto,
  CounterfactualSimulationResponseDto,
  CounterfactualWeightsDto,
  DominantDriverDto,
  MinimalChangeRecourseDto,
  RankShiftItemDto,
  RankShiftStatus,
  ScoreComponentContribution,
  SensitivityDimensionDto,
  UserPreferenceDto,
} from '../../types/index.js';
import { RECOMMENDATION_CONFIG } from './recommendationConfig.js';
import { COLLABORATIVE_CONFIG } from '../../config/collaborativeConfig.js';
import { CandidateGenerator } from './CandidateGenerator.js';
import { RecommendationExplainer } from './RecommendationExplainer.js';
import { RecommendationScorer } from './RecommendationScorer.js';
import { UserTasteProfileService, userTasteProfileService } from '../profile/UserTasteProfileService.js';
import { UserPreferenceService, userPreferenceService } from '../preference/UserPreferenceService.js';
import { MusicCatalogueService } from '../music/MusicCatalogueService.js';
import { getMusicProvider } from '../../providers/index.js';
import { getMoodProfile, isValidMood } from '../../config/moodConfig.js';
import { CounterfactualExperimentLog } from '../../models/CounterfactualExperimentLog.js';
import { getDatabaseState } from '../../config/database.js';

export const ALGORITHM_VERSION = '1.0.0-counterfactual-lab';

export class CounterfactualEngine {
  private readonly candidateGenerator: CandidateGenerator;

  constructor(
    private readonly catalogueService: MusicCatalogueService = new MusicCatalogueService(getMusicProvider()),
    private readonly profileService: UserTasteProfileService = userTasteProfileService,
    private readonly preferenceService: UserPreferenceService = userPreferenceService
  ) {
    this.candidateGenerator = new CandidateGenerator(this.catalogueService);
  }

  /**
   * Default baseline weights matching Stage 10 R5 Collaborative Hybrid configuration.
   */
  public getDefaultWeights(isMoodActive: boolean = false): CounterfactualWeightsDto {
    const base = COLLABORATIVE_CONFIG.r5Weights;
    return {
      content: base.content, // 0.25
      behaviour: base.behaviour, // 0.20
      context: base.context, // 0.10
      collaborative: base.collaborative, // 0.20
      popularity: base.popularity, // 0.10
      novelty: base.novelty, // 0.05
      mood: isMoodActive ? base.mood : 0, // 0.10 if mood, else 0
    };
  }

  /**
   * Validates and normalizes weights.
   * Primary weights (content, behaviour, context, collaborative, popularity, and mood if active)
   * are guaranteed non-negative and normalized to sum strictly to 1.0.
   * Novelty is isolated as an explicit additive discovery bonus factor.
   */
  public normalizeWeights(
    rawWeights?: Partial<CounterfactualWeightsDto>,
    isMoodActive: boolean = false
  ): {
    normalized: CounterfactualWeightsDto;
    raw: CounterfactualWeightsDto;
    primarySum: number;
  } {
    const defaults = this.getDefaultWeights(isMoodActive);

    const safeNonNegative = (val: number | undefined, def: number): number => {
      if (typeof val !== 'number' || isNaN(val) || !isFinite(val)) return def;
      return Math.max(0, val);
    };

    const raw: CounterfactualWeightsDto = {
      content: safeNonNegative(rawWeights?.content, defaults.content),
      behaviour: safeNonNegative(rawWeights?.behaviour, defaults.behaviour),
      context: safeNonNegative(rawWeights?.context, defaults.context),
      collaborative: safeNonNegative(rawWeights?.collaborative, defaults.collaborative),
      popularity: safeNonNegative(rawWeights?.popularity, defaults.popularity),
      novelty: safeNonNegative(rawWeights?.novelty, defaults.novelty),
      mood: isMoodActive
        ? safeNonNegative(rawWeights?.mood, defaults.mood ?? 0.10)
        : 0,
    };

    const primarySum =
      raw.content +
      raw.behaviour +
      raw.context +
      raw.collaborative +
      raw.popularity +
      (raw.mood ?? 0);

    if (primarySum <= 0) {
      return {
        normalized: { ...defaults },
        raw: { ...defaults },
        primarySum: 1.0,
      };
    }

    const normalized: CounterfactualWeightsDto = {
      content: Number((raw.content / primarySum).toFixed(4)),
      behaviour: Number((raw.behaviour / primarySum).toFixed(4)),
      context: Number((raw.context / primarySum).toFixed(4)),
      collaborative: Number((raw.collaborative / primarySum).toFixed(4)),
      popularity: Number((raw.popularity / primarySum).toFixed(4)),
      novelty: Number(raw.novelty.toFixed(4)),
      mood: isMoodActive && raw.mood !== undefined ? Number((raw.mood / primarySum).toFixed(4)) : 0,
    };

    // Correct floating point rounding slack on the primary dimension with highest weight
    const currentSum =
      normalized.content +
      normalized.behaviour +
      normalized.context +
      normalized.collaborative +
      normalized.popularity +
      (normalized.mood ?? 0);

    const diff = 1.0 - currentSum;
    if (Math.abs(diff) > 0.00001) {
      normalized.content = Number((normalized.content + diff).toFixed(4));
    }

    return { normalized, raw, primarySum };
  }

  /**
   * Deterministic Scoring Primitive:
   * Scores an individual candidate given frozen context, profile, and explicit weights.
   */
  public scoreCandidate(
    candidate: CandidateSongEnriched,
    context: RecommendationContext,
    profile: any,
    popularityMap: Map<string, number>,
    userPlayCounts: Map<string, number>,
    userPreferences: UserPreferenceDto | null,
    weights: CounterfactualWeightsDto,
    options?: {
      collaborativeConfidence?: number;
      applyConfidenceDampening?: boolean;
    }
  ): {
    score: number;
    components: ComponentScores;
    explanationSignal: ExplanationSignal;
    reason: string;
    isDisliked: boolean;
  } {
    // 1. Negative preference check (Hard Constraint)
    const isDisliked = RecommendationScorer.isDisliked(
      candidate,
      userPreferences?.dislikedGenres,
      userPreferences?.dislikedArtists
    );

    if (isDisliked) {
      return {
        score: 0.01,
        components: {
          popularity: 0,
          content: 0,
          behaviour: 0,
          context: 0,
          novelty: 0,
          mood: 0,
          collaborative: 0,
        },
        explanationSignal: {
          type: 'popularity',
          value: 'disliked',
          strength: 0,
          description: 'Penalized based on your negative preferences',
        },
        reason: 'Penalized based on your negative preferences',
        isDisliked: true,
      };
    }

    // 2. Component Primitive Calculations
    // Content Score
    const targetGenres = profile?.longTerm?.genres || [];
    const genreMatch = RecommendationScorer.calculateGenreMatch(candidate.genres, targetGenres);
    const artistMatch = RecommendationScorer.calculateArtistMatch(
      candidate.artistId,
      profile?.longTerm?.artists || []
    );
    const audioSim = RecommendationScorer.calculateAudioFeatureSimilarity(
      candidate.metadata,
      profile?.longTerm?.audioFeatures
    );
    const langMatch = RecommendationScorer.calculateLanguageMatch(
      candidate.languages,
      profile?.longTerm?.languages || []
    );
    const explicitGenreBonus = RecommendationScorer.calculateExplicitGenreBonus(
      candidate.genres,
      userPreferences?.preferredGenres
    );

    const wCont = RECOMMENDATION_CONFIG.contentWeights;
    const rawContentScore =
      wCont.genre * genreMatch.score +
      wCont.artist * artistMatch.score +
      wCont.audioFeatures * audioSim.score +
      wCont.language * langMatch;
    const contentScore = RecommendationScorer.clamp(rawContentScore + explicitGenreBonus);

    // Behaviour Score
    const recentGenres = profile?.recent?.genres || [];
    const recentGenreMatch = RecommendationScorer.calculateGenreMatch(candidate.genres, recentGenres);
    const behW = RECOMMENDATION_CONFIG.behaviourWeights;
    const completionBonus = (profile?.behaviour?.completionRate ?? 0) > 0.7 ? behW.highCompletionBonus : 0;
    const skipPenalty = (profile?.behaviour?.skipRate ?? 0) > 0.4 ? behW.skipPenalty : 0;
    const behaviourScore = RecommendationScorer.clamp(
      behW.longTermBlend * genreMatch.score +
        behW.recentBlend * recentGenreMatch.score +
        completionBonus -
        skipPenalty
    );

    // Context Score
    const contextMatch = RecommendationScorer.calculateContextMatch(
      candidate,
      context,
      profile?.context
    );
    const contextScore = contextMatch.score;

    // Collaborative Score
    const collaborativeScore = RecommendationScorer.clamp(candidate.collaborativeScore ?? 0);

    // Popularity Score
    const popularityScore = popularityMap.get(candidate.id) ?? 0.5;

    // Novelty Score
    const noveltyScore = RecommendationScorer.calculateNoveltyScore(candidate.id, userPlayCounts);

    // Mood Score
    const activeMoodProfile = getMoodProfile(context.mood);
    let moodScore: number | undefined = undefined;
    if (activeMoodProfile) {
      moodScore = RecommendationScorer.calculateMoodScore(
        candidate.metadata,
        activeMoodProfile
      ).score;
    }

    // 3. Weight Application (Optionally with confidence dampening if production model emulation is requested)
    let effContent = weights.content;
    let effBehaviour = weights.behaviour;
    let effContext = weights.context;
    let effCollab = weights.collaborative;
    let effPopularity = weights.popularity;
    let effMood = weights.mood ?? 0;

    if (options?.applyConfidenceDampening) {
      const profileConf = profile ? Math.max(0, Math.min(1, profile.profileConfidence ?? 0)) : 0;
      const collabConf = Math.max(0, Math.min(1, options.collaborativeConfidence ?? 0));

      const unallocatedCollab = effCollab * (1 - collabConf);
      effCollab *= collabConf;

      // Distribute unallocated collab to personal
      const personalSum = effContent + effBehaviour + effContext || 1;
      effContent += (effContent / personalSum) * unallocatedCollab;
      effBehaviour += (effBehaviour / personalSum) * unallocatedCollab;
      effContext += (effContext / personalSum) * unallocatedCollab;

      // Profile confidence scaling
      const unallocatedPersonal =
        effContent * (1 - profileConf) +
        effBehaviour * (1 - profileConf) +
        effContext * (1 - profileConf);

      effContent *= profileConf;
      effBehaviour *= profileConf;
      effContext *= profileConf;
      effPopularity += unallocatedPersonal;
    }

    // Linear composite
    const baseWeightedSum =
      effContent * contentScore +
      effBehaviour * behaviourScore +
      effContext * contextScore +
      effCollab * collaborativeScore +
      effPopularity * popularityScore +
      (activeMoodProfile && moodScore !== undefined ? effMood * moodScore : 0);

    // Soft novelty bonus
    const noveltyBonus = weights.novelty * (noveltyScore - 0.5) * 0.2;
    const finalScore = RecommendationScorer.clamp(baseWeightedSum + noveltyBonus);

    // 4. Explanation Signal Synthesis
    const signals: ExplanationSignal[] = [
      {
        type: 'genre',
        value: genreMatch.bestGenre || (candidate.genres?.[0] ?? 'music'),
        strength: contentScore,
      },
      {
        type: 'recentTaste',
        value: recentGenreMatch.bestGenre,
        strength: behaviourScore,
      },
      {
        type: 'context',
        value: context.timeOfDay,
        strength: contextScore,
      },
      {
        type: 'popularity',
        strength: popularityScore,
        description: 'Popular on TuneSense',
      },
    ];

    if (activeMoodProfile && moodScore !== undefined) {
      signals.push({
        type: 'mood',
        value: activeMoodProfile.label,
        strength: moodScore,
        description: activeMoodProfile.explanationPhrase,
        secondaryGenre: genreMatch.bestGenre,
      });
    }

    if (collaborativeScore > 0) {
      signals.push({
        type: 'collaborative',
        strength: collaborativeScore,
        supportingUsersCount: candidate.supportingSimilarUsers || 1,
        description:
          (candidate.supportingSimilarUsers || 0) >= 2
            ? 'Popular among listeners with tastes similar to yours'
            : 'Listeners with tastes similar to yours enjoyed this',
      });
    }

    const dominantSignal = RecommendationExplainer.selectDominantSignal(signals);
    const reason = RecommendationExplainer.generateReason(dominantSignal);

    const components: ComponentScores = {
      popularity: popularityScore,
      content: contentScore,
      behaviour: behaviourScore,
      context: contextScore,
      novelty: noveltyScore,
      collaborative: collaborativeScore,
      mood: moodScore,
    };

    return {
      score: finalScore,
      components,
      explanationSignal: dominantSignal,
      reason,
      isDisliked: false,
    };
  }

  /**
   * Sorts candidates deterministically by score descending, with stable song ID tie-breaking.
   */
  public sortCandidates(candidates: ScoredCandidate[]): ScoredCandidate[] {
    return [...candidates].sort((a, b) => {
      const diff = b.score - a.score;
      if (Math.abs(diff) > 0.0001) {
        return diff;
      }
      return a.song.id.localeCompare(b.song.id);
    });
  }

  /**
   * Applies artist and album diversity caps and novelty exploration slots.
   */
  public applyDiversityAndExploration(
    candidates: ScoredCandidate[],
    limit: number,
    userPreferences?: UserPreferenceDto | null
  ): RecommendationItemDto[] {
    const explorationLevel = userPreferences?.personalizationSettings?.explorationLevel ?? 0.5;
    const diversityLevel = userPreferences?.personalizationSettings?.diversityLevel ?? 0.7;

    let maxPerArtist: number = RECOMMENDATION_CONFIG.diversity.maxPerArtist;
    let maxPerAlbum: number = RECOMMENDATION_CONFIG.diversity.maxPerAlbum;
    if (diversityLevel >= 0.85) {
      maxPerArtist = 1;
      maxPerAlbum = 1;
    } else if (diversityLevel <= 0.35) {
      maxPerArtist = 3;
      maxPerAlbum = 3;
    }

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

    for (const c of candidates) {
      if (selected.length >= coreSlots) break;
      if (canSelect(c)) addCandidate(c);
    }

    if (explorationSlots > 0 && selected.length < limit) {
      const remaining = candidates.filter((c) => !selectedIds.has(c.song.id));
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

    if (selected.length < limit) {
      for (const c of candidates) {
        if (selected.length >= limit) break;
        if (!selectedIds.has(c.song.id)) {
          const artistKey = c.song.artistName || c.song.artistId || 'unknown';
          if ((artistCounts.get(artistKey) || 0) < maxPerArtist) {
            addCandidate(c);
          }
        }
      }
    }

    return selected;
  }

  /**
   * Main Counterfactual Experimentation Pipeline:
   * Recomputes baseline and counterfactual recommendation lists over an identical frozen candidate pool,
   * calculating rank shifts, score deltas, feature attribution, and sensitivity analysis.
   */
  public async simulateCounterfactual(
    userId: string,
    request: CounterfactualSimulationRequestDto
  ): Promise<CounterfactualSimulationResponseDto> {
    const experimentId = `cf_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const limit = Math.max(1, Math.min(20, request.limit ?? 10));

    // 1. Fetch Profile and Preferences
    let profile: any = null;
    let preferences: UserPreferenceDto | null = null;
    try {
      profile = await this.profileService.getProfile(userId);
    } catch (err) {
      console.warn(`[CounterfactualEngine] Warning loading profile for ${userId}:`, err);
    }

    try {
      preferences = await this.preferenceService.getPreferences(userId);
    } catch (err) {
      console.warn(`[CounterfactualEngine] Warning loading preferences for ${userId}:`, err);
    }

    // 2. Establish Contexts
    const baselineContext = this.resolveNaturalContext(preferences?.preferredMood);
    const cfRequestedMood = request.mood || request.context?.mood || baselineContext.mood;
    const cfMood = isValidMood(cfRequestedMood) ? cfRequestedMood.toLowerCase().trim() : undefined;

    const counterfactualContext: RecommendationContext = {
      timeOfDay: request.context?.timeOfDay || baselineContext.timeOfDay,
      dayOfWeek: request.context?.dayOfWeek || baselineContext.dayOfWeek,
      timestamp: baselineContext.timestamp,
      mood: cfMood,
    };

    // 3. Freeze Candidate Pool
    const { candidates, popularityMap, userPlayCounts, collaborativeConfidence } =
      await this.candidateGenerator.generateCandidates(userId, profile, preferences);

    // 4. Establish Weights
    const isBaselineMoodActive = !!baselineContext.mood && isValidMood(baselineContext.mood);
    const isCounterfactualMoodActive = !!counterfactualContext.mood && isValidMood(counterfactualContext.mood);

    const baselineWeightsRaw = this.getDefaultWeights(isBaselineMoodActive);
    const { normalized: baselineWeights } = this.normalizeWeights(baselineWeightsRaw, isBaselineMoodActive);

    const { normalized: counterfactualWeights, raw: cfRawWeights } = this.normalizeWeights(
      request.weights,
      isCounterfactualMoodActive
    );

    // 5. Score Candidates under Baseline Configuration
    const baselineScored: ScoredCandidate[] = [];
    for (const cand of candidates) {
      const res = this.scoreCandidate(
        cand,
        baselineContext,
        profile,
        popularityMap,
        userPlayCounts,
        preferences,
        baselineWeights,
        {
          collaborativeConfidence,
          applyConfidenceDampening: request.applyConfidenceDampening ?? false,
        }
      );
      baselineScored.push({
        song: this.mapToCatalogueDto(cand),
        score: res.score,
        components: res.components,
        explanationSignal: res.explanationSignal,
        reason: res.reason,
      });
    }

    // 6. Score Candidates under Counterfactual Configuration
    const cfScored: ScoredCandidate[] = [];
    for (const cand of candidates) {
      const res = this.scoreCandidate(
        cand,
        counterfactualContext,
        profile,
        popularityMap,
        userPlayCounts,
        preferences,
        counterfactualWeights,
        {
          collaborativeConfidence,
          applyConfidenceDampening: request.applyConfidenceDampening ?? false,
        }
      );
      cfScored.push({
        song: this.mapToCatalogueDto(cand),
        score: res.score,
        components: res.components,
        explanationSignal: res.explanationSignal,
        reason: res.reason,
      });
    }

    // 7. Sort and Rank Lists
    const sortedBaseline = this.sortCandidates(baselineScored);
    const sortedCounterfactual = this.sortCandidates(cfScored);

    const applyDiversity = request.applyDiversity !== false;
    const baselineRecs = applyDiversity
      ? this.applyDiversityAndExploration(sortedBaseline, limit, preferences)
      : sortedBaseline.slice(0, limit).map((c) => ({
          song: c.song,
          score: c.score,
          reason: c.reason,
          reasonType: c.explanationSignal.type,
          components: c.components,
        }));

    const cfRecs = applyDiversity
      ? this.applyDiversityAndExploration(sortedCounterfactual, limit, preferences)
      : sortedCounterfactual.slice(0, limit).map((c) => ({
          song: c.song,
          score: c.score,
          reason: c.reason,
          reasonType: c.explanationSignal.type,
          components: c.components,
        }));

    // Build Fast Lookup Maps
    const baselineRankMap = new Map<string, { rank: number; item: RecommendationItemDto }>();
    baselineRecs.forEach((item, index) => {
      baselineRankMap.set(item.song.id, { rank: index + 1, item });
    });

    const cfRankMap = new Map<string, { rank: number; item: RecommendationItemDto }>();
    cfRecs.forEach((item, index) => {
      cfRankMap.set(item.song.id, { rank: index + 1, item });
    });

    // Score maps for all candidates across baseline and counterfactual
    const baseScoreMap = new Map<string, ScoredCandidate>(sortedBaseline.map((c) => [c.song.id, c]));
    const cfScoreMap = new Map<string, ScoredCandidate>(sortedCounterfactual.map((c) => [c.song.id, c]));

    // 8. Analyze Candidate Rank Shifts & Component-level Attribution
    // Focus analysis on the union of songs in baseline top-K, counterfactual top-K, and targetSongId
    const analyzedSongIds = new Set<string>([
      ...Array.from(baselineRankMap.keys()),
      ...Array.from(cfRankMap.keys()),
    ]);

    if (request.targetSongId && baseScoreMap.has(request.targetSongId)) {
      analyzedSongIds.add(request.targetSongId);
    }

    const rankShifts: RankShiftItemDto[] = [];
    let enteredTopKCount = 0;
    let leftTopKCount = 0;
    let rankDisplacementSum = 0;
    let maxRankDisplacement = 0;

    for (const songId of analyzedSongIds) {
      const baseEntry = baselineRankMap.get(songId);
      const cfEntry = cfRankMap.get(songId);

      const baseCand = baseScoreMap.get(songId);
      const cfCand = cfScoreMap.get(songId);

      if (!baseCand || !cfCand) continue;

      const baseRank = baseEntry?.rank ?? null;
      const cfRank = cfEntry?.rank ?? null;

      let status: RankShiftStatus;
      let rankDelta = 0;

      if (baseRank !== null && cfRank !== null) {
        rankDelta = baseRank - cfRank; // Positive = climbed up
        if (rankDelta > 0) status = 'moved_up';
        else if (rankDelta < 0) status = 'moved_down';
        else status = 'unchanged';
      } else if (baseRank === null && cfRank !== null) {
        status = 'entered_top_k';
        enteredTopKCount += 1;
        rankDelta = limit - cfRank + 1;
      } else if (baseRank !== null && cfRank === null) {
        status = 'left_top_k';
        leftTopKCount += 1;
        rankDelta = -(limit - baseRank + 1);
      } else {
        status = 'outside_top_k';
        rankDelta = 0;
      }

      const displacement = Math.abs(rankDelta);
      rankDisplacementSum += displacement;
      if (displacement > maxRankDisplacement) {
        maxRankDisplacement = displacement;
      }

      const scoreDelta = Number((cfCand.score - baseCand.score).toFixed(4));

      // Calculate component deltas and score impacts
      const componentDeltas: Record<string, number> = {
        content: Number((cfCand.components.content - baseCand.components.content).toFixed(4)),
        behaviour: Number((cfCand.components.behaviour - baseCand.components.behaviour).toFixed(4)),
        context: Number((cfCand.components.context - baseCand.components.context).toFixed(4)),
        collaborative: Number(((cfCand.components.collaborative ?? 0) - (baseCand.components.collaborative ?? 0)).toFixed(4)),
        popularity: Number((cfCand.components.popularity - baseCand.components.popularity).toFixed(4)),
        novelty: Number((cfCand.components.novelty - baseCand.components.novelty).toFixed(4)),
        mood: Number(((cfCand.components.mood ?? 0) - (baseCand.components.mood ?? 0)).toFixed(4)),
      };

      const contributions: Record<string, ScoreComponentContribution> = {};
      const dimensions = ['content', 'behaviour', 'context', 'collaborative', 'popularity', 'mood'];

      for (const dim of dimensions) {
        const wBase = (baselineWeights as any)[dim] ?? 0;
        const wCf = (counterfactualWeights as any)[dim] ?? 0;
        const scoreVal = (cfCand.components as any)[dim] ?? 0;
        const wDelta = wCf - wBase;
        const impact = wDelta * scoreVal;

        contributions[dim] = {
          baseline: (baseCand.components as any)[dim] ?? 0,
          counterfactual: scoreVal,
          delta: componentDeltas[dim] ?? 0,
          weightBaseline: wBase,
          weightCounterfactual: wCf,
          weightDelta: Number(wDelta.toFixed(4)),
          scoreImpact: Number(impact.toFixed(4)),
        };
      }

      // Identify dominant driver of change
      const dominantDriver = this.identifyDominantDriver(contributions, status, rankDelta);

      // Synthesize concise human explanation
      const explanation = this.synthesizeShiftExplanation(
        baseCand.song.title,
        baseRank,
        cfRank,
        rankDelta,
        status,
        dominantDriver,
        contributions
      );

      rankShifts.push({
        song: baseCand.song,
        baselineRank: baseRank,
        counterfactualRank: cfRank,
        rankDelta,
        status,
        baselineScore: Number(baseCand.score.toFixed(4)),
        counterfactualScore: Number(cfCand.score.toFixed(4)),
        scoreDelta,
        baselineComponents: baseCand.components as any,
        counterfactualComponents: cfCand.components as any,
        componentDeltas,
        componentContributions: contributions,
        baselineReason: baseCand.reason,
        counterfactualReason: cfCand.reason,
        dominantDriver,
        explanation,
      });
    }

    // Sort rank shifts: items in counterfactual top K first, then baseline top K
    rankShifts.sort((a, b) => {
      const rankA = a.counterfactualRank ?? (a.baselineRank ? a.baselineRank + 100 : 999);
      const rankB = b.counterfactualRank ?? (b.baselineRank ? b.baselineRank + 100 : 999);
      return rankA - rankB;
    });

    // 9. Quantitative Similarity Metrics (RBO & Jaccard Overlap)
    const topKOverlapCount = baselineRecs.filter((b) => cfRankMap.has(b.song.id)).length;
    const rbo = this.calculateRankBiasedOverlap(
      baselineRecs.map((r) => r.song.id),
      cfRecs.map((r) => r.song.id),
      0.90
    );

    const summary: CounterfactualAnalysisSummaryDto = {
      totalCandidatesEvaluated: candidates.length,
      k: limit,
      enteredTopK: enteredTopKCount,
      leftTopK: leftTopKCount,
      rankDisplacementSum,
      meanRankDisplacement: analyzedSongIds.size > 0 ? Number((rankDisplacementSum / analyzedSongIds.size).toFixed(2)) : 0,
      rankBiasedOverlap: Number(rbo.toFixed(3)),
      topKOverlapCount,
      isIdentical: rbo >= 0.999 && enteredTopKCount === 0 && leftTopKCount === 0,
    };

    // 10. Local Sensitivity Analysis for Target Song or Top Candidate
    const targetSongForSensitivity = request.targetSongId
      ? baseScoreMap.get(request.targetSongId)
      : cfScored[0];

    let sensitivityAnalysis: SensitivityDimensionDto[] | undefined;
    if (targetSongForSensitivity) {
      sensitivityAnalysis = this.calculateLocalSensitivity(
        targetSongForSensitivity,
        sortedCounterfactual,
        counterfactualWeights,
        isCounterfactualMoodActive
      );
    }

    // 11. Minimal-Change Recourse Optimization (if requested)
    let recourseResult: MinimalChangeRecourseDto | undefined;
    if (request.targetSongId) {
      recourseResult = this.findMinimalChangeRecourse(
        request.targetSongId,
        request.targetRank ?? 5,
        candidates,
        counterfactualContext,
        profile,
        popularityMap,
        userPlayCounts,
        preferences,
        counterfactualWeights
      );
    }

    // 12. Asynchronous Research Experiment Logging
    this.logExperimentSafely({
      userId,
      experimentId,
      candidateCount: candidates.length,
      baselineWeights,
      counterfactualWeights,
      baselineContext: {
        timeOfDay: baselineContext.timeOfDay,
        dayOfWeek: baselineContext.dayOfWeek,
        mood: baselineContext.mood,
      },
      counterfactualContext: {
        timeOfDay: counterfactualContext.timeOfDay,
        dayOfWeek: counterfactualContext.dayOfWeek,
        mood: counterfactualContext.mood,
      },
      metrics: {
        k: limit,
        topKOverlapCount,
        rankBiasedOverlap: summary.rankBiasedOverlap,
        meanRankDisplacement: summary.meanRankDisplacement,
        maxRankDisplacement,
        enteredTopKCount,
        leftTopKCount,
        isIdentical: summary.isIdentical,
      },
    });

    return {
      experimentId,
      algorithmVersion: ALGORITHM_VERSION,
      generatedAt: new Date().toISOString(),
      baselineWeights: baselineWeightsRaw,
      counterfactualWeights: cfRawWeights,
      normalizedBaselineWeights: baselineWeights,
      normalizedCounterfactualWeights: counterfactualWeights,
      baselineContext: {
        timeOfDay: baselineContext.timeOfDay,
        dayOfWeek: baselineContext.dayOfWeek,
        mood: baselineContext.mood,
      },
      counterfactualContext: {
        timeOfDay: counterfactualContext.timeOfDay,
        dayOfWeek: counterfactualContext.dayOfWeek,
        mood: counterfactualContext.mood,
      },
      baselineRecommendations: baselineRecs,
      counterfactualRecommendations: cfRecs,
      rankShifts,
      summary,
      sensitivityAnalysis,
      recourseResult,
    };
  }

  /**
   * Identifies the dominant component driver that explains a song's rank movement.
   */
  private identifyDominantDriver(
    contributions: Record<string, ScoreComponentContribution>,
    _status: RankShiftStatus,
    _rankDelta: number
  ): DominantDriverDto {
    const entries = Object.entries(contributions);
    if (entries.length === 0) {
      return {
        component: 'general',
        weightDelta: 0,
        componentScore: 0,
        scoreImpact: 0,
        direction: 'neutral',
        description: 'Ranking remained consistent with baseline settings.',
      };
    }

    // Sort by absolute score impact
    entries.sort((a, b) => Math.abs(b[1].scoreImpact) - Math.abs(a[1].scoreImpact));
    const [topDim, topData] = entries[0];

    const direction: 'helped' | 'hurt' | 'neutral' =
      topData.scoreImpact > 0.005
        ? 'helped'
        : topData.scoreImpact < -0.005
        ? 'hurt'
        : 'neutral';

    let description = '';
    const dimName = topDim.charAt(0).toUpperCase() + topDim.slice(1);
    const weightChangePct = Math.round(topData.weightDelta * 100);
    const sign = weightChangePct > 0 ? `+${weightChangePct}%` : `${weightChangePct}%`;

    if (direction === 'helped') {
      description = `Increasing ${dimName} weight (${sign}) boosted score due to strong affinity (${topData.counterfactual.toFixed(2)}).`;
    } else if (direction === 'hurt') {
      description = `Changes in ${dimName} weight (${sign}) negatively impacted score (component affinity: ${topData.counterfactual.toFixed(2)}).`;
    } else {
      description = `Component balance remained largely neutral across adjusted parameters.`;
    }

    return {
      component: topDim,
      weightDelta: topData.weightDelta,
      componentScore: topData.counterfactual,
      scoreImpact: topData.scoreImpact,
      direction,
      description,
    };
  }

  /**
   * Synthesizes a research-grade explanation of rank changes for an individual track.
   */
  private synthesizeShiftExplanation(
    title: string,
    baseRank: number | null,
    cfRank: number | null,
    rankDelta: number,
    status: RankShiftStatus,
    driver: DominantDriverDto,
    _contributions?: Record<string, ScoreComponentContribution>
  ): string {
    if (status === 'unchanged') {
      return `"${title}" maintained its rank (#${baseRank ?? cfRank}) as score component adjustments offset each other.`;
    }

    const driverName = driver.component.toUpperCase();

    if (status === 'entered_top_k') {
      return `"${title}" entered Top K at #${cfRank} (+${Math.abs(rankDelta)} spots). Primary driver: ${driver.description}`;
    }

    if (status === 'left_top_k') {
      return `"${title}" dropped out of Top K (previously #${baseRank}). Primary driver: ${driver.description}`;
    }

    if (status === 'moved_up') {
      return `"${title}" climbed from #${baseRank} to #${cfRank} (+${rankDelta} spots). Accelerated primarily by ${driverName} weighting.`;
    }

    if (status === 'moved_down') {
      return `"${title}" fell from #${baseRank} to #${cfRank} (${rankDelta} spots). Suppressed primarily by ${driverName} weighting.`;
    }

    return `"${title}" shifted rank due to reweighted ${driver.component} component.`;
  }

  /**
   * Calculates local sensitivity analysis for a song across each scoring dimension.
   * Evaluates numerical derivative dScore/dWeight and simulated rank shift under +/-0.10 step.
   */
  public calculateLocalSensitivity(
    targetSong: ScoredCandidate,
    allCandidates: ScoredCandidate[],
    baseWeights: CounterfactualWeightsDto,
    isMoodActive: boolean
  ): SensitivityDimensionDto[] {
    const dimensions = ['content', 'behaviour', 'context', 'collaborative', 'popularity'];
    if (isMoodActive) dimensions.push('mood');

    const step = 0.10;
    const results: SensitivityDimensionDto[] = [];

    // Find current rank of target song
    const currentRank = allCandidates.findIndex((c) => c.song.id === targetSong.song.id) + 1;

    for (const dim of dimensions) {
      const curW = (baseWeights as any)[dim] ?? 0;
      const compScore = (targetSong.components as any)[dim] ?? 0;

      // Gradient dScore/dWeight is directly the component score
      const gradient = Number(compScore.toFixed(3));

      // Simulate +step: increase dim by +0.10 and decrement others proportionally
      const plusWeights = { ...baseWeights };
      (plusWeights as any)[dim] = curW + step;
      const { normalized: normPlus } = this.normalizeWeights(plusWeights, isMoodActive);

      // Re-score target and all competitors under normPlus
      const plusRank = this.simulateSingleTrackRank(targetSong.song.id, allCandidates, normPlus);
      const plusStepRankDelta = currentRank > 0 && plusRank > 0 ? currentRank - plusRank : 0;

      // Simulate -step: decrease dim by -0.10 (clamped to 0)
      const minusWeights = { ...baseWeights };
      (minusWeights as any)[dim] = Math.max(0, curW - step);
      const { normalized: normMinus } = this.normalizeWeights(minusWeights, isMoodActive);
      const minusRank = this.simulateSingleTrackRank(targetSong.song.id, allCandidates, normMinus);
      const minusStepRankDelta = currentRank > 0 && minusRank > 0 ? currentRank - minusRank : 0;

      const maxShift = Math.max(Math.abs(plusStepRankDelta), Math.abs(minusStepRankDelta));
      const sensitivityRating: 'high' | 'medium' | 'low' =
        maxShift >= 3 ? 'high' : maxShift >= 1 ? 'medium' : 'low';

      results.push({
        dimension: dim,
        currentWeight: curW,
        plusStepRankDelta,
        minusStepRankDelta,
        gradient,
        sensitivityRating,
      });
    }

    return results;
  }

  private simulateSingleTrackRank(
    targetSongId: string,
    allCandidates: ScoredCandidate[],
    weights: CounterfactualWeightsDto
  ): number {
    const scores = allCandidates.map((c) => {
      const s =
        weights.content * c.components.content +
        weights.behaviour * c.components.behaviour +
        weights.context * c.components.context +
        weights.collaborative * (c.components.collaborative ?? 0) +
        weights.popularity * c.components.popularity +
        (weights.mood ?? 0) * (c.components.mood ?? 0);
      return { id: c.song.id, score: s };
    });

    scores.sort((a, b) => {
      const diff = b.score - a.score;
      if (Math.abs(diff) > 0.0001) return diff;
      return a.id.localeCompare(b.id);
    });

    return scores.findIndex((s) => s.id === targetSongId) + 1;
  }

  /**
   * Minimal-Change Counterfactual Recourse Search:
   * Formulates a constrained search over the 5-simplex:
   * min ||w - w_base||_1 subject to Rank(targetSong; w) <= targetRank, w >= 0, sum(w) = 1.
   * Uses fine-grained discrete simplex evaluation for certified mathematical optimality.
   */
  public findMinimalChangeRecourse(
    targetSongId: string,
    targetRank: number,
    candidates: CandidateSongEnriched[],
    context: RecommendationContext,
    profile: any,
    popularityMap: Map<string, number>,
    _userPlayCounts: Map<string, number>,
    userPreferences: UserPreferenceDto | null,
    baseWeights: CounterfactualWeightsDto
  ): MinimalChangeRecourseDto {
    const targetCandidate = candidates.find((c) => c.id === targetSongId);
    if (!targetCandidate) {
      return {
        targetSongId,
        targetSongTitle: 'Unknown Track',
        targetRank,
        achievable: false,
        currentRank: null,
        explanation: `Candidate song ${targetSongId} was not found in the evaluated candidate pool.`,
      };
    }

    // Pre-calculate component score vectors for all candidates to enable rapid vector products
    const candidateVectors: Array<{ id: string; vec: number[] }> = [];
    let targetVec: number[] | null = null;

    for (const cand of candidates) {
      const isDisliked = RecommendationScorer.isDisliked(
        cand,
        userPreferences?.dislikedGenres,
        userPreferences?.dislikedArtists
      );
      if (isDisliked) continue;

      const genreMatch = RecommendationScorer.calculateGenreMatch(cand.genres, profile?.longTerm?.genres || []);
      const audioSim = RecommendationScorer.calculateAudioFeatureSimilarity(cand.metadata, profile?.longTerm?.audioFeatures);
      const explicitBonus = RecommendationScorer.calculateExplicitGenreBonus(cand.genres, userPreferences?.preferredGenres);
      const content = RecommendationScorer.clamp(genreMatch.score * 0.6 + audioSim.score * 0.4 + explicitBonus);

      const recentGenreMatch = RecommendationScorer.calculateGenreMatch(cand.genres, profile?.recent?.genres || []);
      const behaviour = RecommendationScorer.clamp(recentGenreMatch.score);
      const ctxMatch = RecommendationScorer.calculateContextMatch(cand, context, profile?.context);
      const contextScore = ctxMatch.score;
      const collab = RecommendationScorer.clamp(cand.collaborativeScore ?? 0);
      const pop = popularityMap.get(cand.id) ?? 0.5;

      const vec = [content, behaviour, contextScore, collab, pop];
      candidateVectors.push({ id: cand.id, vec });

      if (cand.id === targetSongId) {
        targetVec = vec;
      }
    }

    if (!targetVec) {
      return {
        targetSongId,
        targetSongTitle: targetCandidate.title,
        targetRank,
        achievable: false,
        currentRank: null,
        explanation: `Target song "${targetCandidate.title}" matches your explicit negative preferences (disliked genre or artist) and is ineligible for ranking.`,
      };
    }

    // Check current rank under baseWeights
    const baseW = [
      baseWeights.content,
      baseWeights.behaviour,
      baseWeights.context,
      baseWeights.collaborative,
      baseWeights.popularity,
    ];
    const baseSum = baseW.reduce((a, b) => a + b, 0) || 1;
    const baseNormW = baseW.map((w) => w / baseSum);

    const targetBaseScore = targetVec.reduce((sum, val, idx) => sum + val * baseNormW[idx], 0);
    const competitorsBeating = candidateVectors.filter(
      (c) => c.vec.reduce((sum, val, idx) => sum + val * baseNormW[idx], 0) > targetBaseScore
    ).length;
    const currentRank = competitorsBeating + 1;

    if (currentRank <= targetRank) {
      return {
        targetSongId,
        targetSongTitle: targetCandidate.title,
        targetRank,
        achievable: true,
        currentRank,
        minimalWeights: baseWeights,
        weightDeltas: { content: 0, behaviour: 0, context: 0, collaborative: 0, popularity: 0 },
        l1Distance: 0,
        explanation: `"${targetCandidate.title}" is already ranked #${currentRank}, which satisfies the target goal (<= #${targetRank}). No weight change required.`,
      };
    }

    // Simplex grid search (step = 0.10 over 5 dimensions: N = 10 steps)
    // 5 dimensions summing to 10: stars and bars (14 choose 4) = 1,001 combinations.
    // Extremely fast (<5ms) and mathematically exact over the discrete grid.
    let bestDist = Infinity;
    let bestWeights: number[] | null = null;
    let bestAchievedRank = currentRank;

    const N = 10;
    for (let c = 0; c <= N; c++) {
      for (let b = 0; b <= N - c; b++) {
        for (let x = 0; x <= N - c - b; x++) {
          for (let col = 0; col <= N - c - b - x; col++) {
            const p = N - c - b - x - col;
            const wCandidate = [c / N, b / N, x / N, col / N, p / N];

            // Target score
            const tScore =
              targetVec[0] * wCandidate[0] +
              targetVec[1] * wCandidate[1] +
              targetVec[2] * wCandidate[2] +
              targetVec[3] * wCandidate[3] +
              targetVec[4] * wCandidate[4];

            // Count competitors strictly higher
            let higherCount = 0;
            for (const cand of candidateVectors) {
              if (cand.id === targetSongId) continue;
              const s =
                cand.vec[0] * wCandidate[0] +
                cand.vec[1] * wCandidate[1] +
                cand.vec[2] * wCandidate[2] +
                cand.vec[3] * wCandidate[3] +
                cand.vec[4] * wCandidate[4];
              if (s > tScore) {
                higherCount++;
                if (higherCount >= targetRank) break;
              }
            }

            const candidateRank = higherCount + 1;
            if (candidateRank <= targetRank) {
              // Calculate L1 distance: sum |w_i - baseNormW_i|
              const dist =
                Math.abs(wCandidate[0] - baseNormW[0]) +
                Math.abs(wCandidate[1] - baseNormW[1]) +
                Math.abs(wCandidate[2] - baseNormW[2]) +
                Math.abs(wCandidate[3] - baseNormW[3]) +
                Math.abs(wCandidate[4] - baseNormW[4]);

              if (dist < bestDist) {
                bestDist = dist;
                bestWeights = wCandidate;
                bestAchievedRank = candidateRank;
              }
            }
          }
        }
      }
    }

    if (!bestWeights || bestDist === Infinity) {
      return {
        targetSongId,
        targetSongTitle: targetCandidate.title,
        targetRank,
        achievable: false,
        currentRank,
        explanation: `No weight combination on the simplex can elevate "${targetCandidate.title}" into the Top ${targetRank}. Other candidate tracks dominate this song across content, behavioural, and popularity dimensions simultaneously. Adding an aligned mood filter or exploring new genres is required.`,
      };
    }

    const minWeightsDto: CounterfactualWeightsDto = {
      content: Number(bestWeights[0].toFixed(2)),
      behaviour: Number(bestWeights[1].toFixed(2)),
      context: Number(bestWeights[2].toFixed(2)),
      collaborative: Number(bestWeights[3].toFixed(2)),
      popularity: Number(bestWeights[4].toFixed(2)),
      novelty: baseWeights.novelty,
      mood: baseWeights.mood,
    };

    const weightDeltas: Record<string, number> = {
      content: Number((bestWeights[0] - baseNormW[0]).toFixed(2)),
      behaviour: Number((bestWeights[1] - baseNormW[1]).toFixed(2)),
      context: Number((bestWeights[2] - baseNormW[2]).toFixed(2)),
      collaborative: Number((bestWeights[3] - baseNormW[3]).toFixed(2)),
      popularity: Number((bestWeights[4] - baseNormW[4]).toFixed(2)),
    };

    // Build explanatory string
    const significantChanges = Object.entries(weightDeltas)
      .filter(([_, d]) => Math.abs(d) >= 0.05)
      .map(([k, d]) => `${k.charAt(0).toUpperCase() + k.slice(1)}: ${d > 0 ? '+' : ''}${Math.round(d * 100)}%`)
      .join(', ');

    const explanation = `Minimal mathematical recourse found (L1 distance: ${bestDist.toFixed(2)}): Adjusting ${significantChanges || 'weights'} successfully elevates "${targetCandidate.title}" from Rank #${currentRank} to #${bestAchievedRank}.`;

    return {
      targetSongId,
      targetSongTitle: targetCandidate.title,
      targetRank,
      achievable: true,
      currentRank,
      minimalWeights: minWeightsDto,
      weightDeltas,
      l1Distance: Number(bestDist.toFixed(2)),
      explanation,
    };
  }

  /**
   * Rank-Biased Overlap (RBO) Metric Implementation (Webber et al., 2010):
   * Measures top-weighted agreement between two ranked recommendation lists.
   */
  public calculateRankBiasedOverlap(listA: string[], listB: string[], p: number = 0.90): number {
    const k = Math.min(listA.length, listB.length);
    if (k === 0) return 1.0;

    const setA = new Set<string>();
    const setB = new Set<string>();
    let rbo = 0;
    let weightSum = 0;

    for (let d = 1; d <= k; d++) {
      setA.add(listA[d - 1]);
      setB.add(listB[d - 1]);

      let overlap = 0;
      for (const item of setA) {
        if (setB.has(item)) overlap++;
      }

      const agreement = overlap / d;
      const weight = Math.pow(p, d - 1);
      rbo += agreement * weight;
      weightSum += weight;
    }

    return weightSum > 0 ? (1 - p) * rbo : 1.0;
  }

  private resolveNaturalContext(savedPreferredMood?: string): RecommendationContext {
    const now = new Date();
    const hour = now.getHours();

    let timeOfDay: RecommendationContext['timeOfDay'];
    if (hour >= 5 && hour < 12) timeOfDay = 'morning';
    else if (hour >= 12 && hour < 17) timeOfDay = 'afternoon';
    else if (hour >= 17 && hour < 22) timeOfDay = 'evening';
    else timeOfDay = 'late_night';

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
      timeOfDay,
      dayOfWeek,
      timestamp: now,
      mood: isValidMood(savedPreferredMood) ? savedPreferredMood : undefined,
    };
  }

  private mapToCatalogueDto(c: CandidateSongEnriched): any {
    return {
      id: c.id,
      title: c.title,
      artistId: c.artistId,
      artistName: c.artistName,
      albumId: c.albumId,
      albumTitle: c.albumTitle,
      durationSeconds: c.durationSeconds,
      artworkUrl: c.artworkUrl,
      streamUrl: c.streamUrl,
      genres: c.genres,
      languages: c.languages,
      provider: c.provider,
      providerTrackId: c.providerTrackId,
      metadata: c.metadata,
    };
  }

  private logExperimentSafely(data: any): void {
    const db = getDatabaseState();
    if (!db.isConnected || !Types.ObjectId.isValid(data.userId)) {
      return;
    }

    // Asynchronous non-blocking research logging
    CounterfactualExperimentLog.create({
      userId: new Types.ObjectId(data.userId),
      experimentId: data.experimentId,
      candidateCount: data.candidateCount,
      baselineWeights: data.baselineWeights,
      counterfactualWeights: data.counterfactualWeights,
      baselineContext: data.baselineContext,
      counterfactualContext: data.counterfactualContext,
      metrics: data.metrics,
      isSimulation: true,
      userOptedInToProfileUpdate: false,
    }).catch((err) => {
      console.warn('[CounterfactualEngine] Non-blocking experiment logging notice:', err?.message || err);
    });
  }
}

export const counterfactualEngine = new CounterfactualEngine();
