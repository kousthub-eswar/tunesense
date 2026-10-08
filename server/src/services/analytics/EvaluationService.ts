import { Types } from 'mongoose';
import { ListeningEvent } from '../../models/ListeningEvent.js';
import { EvaluationFeedback } from '../../models/EvaluationFeedback.js';
import { Song } from '../../models/Song.js';
import { dbState } from '../../config/database.js';
import { EVALUATION_CONFIG } from '../../config/evaluationConfig.js';
import {
  OfflineEvaluationResultDto,
  StrategyComparisonDto,
} from '../../types/index.js';
import {
  MoodFeedbackInput,
  ExplanationFeedbackInput,
} from '../../validators/analyticsValidators.js';
import { PopularityStrategy } from '../recommendation/strategies/PopularityStrategy.js';
import { ContentStrategy } from '../recommendation/strategies/ContentStrategy.js';
import { BehaviourStrategy } from '../recommendation/strategies/BehaviourStrategy.js';
import { ContextStrategy } from '../recommendation/strategies/ContextStrategy.js';
import { HybridStrategy } from '../recommendation/strategies/HybridStrategy.js';
import { CollaborativeStrategy } from '../recommendation/strategies/CollaborativeStrategy.js';
import { CollaborativeHybridStrategy } from '../recommendation/strategies/CollaborativeHybridStrategy.js';
import { collaborativeService } from '../recommendation/CollaborativeService.js';
import { CandidateSongEnriched, RecommendationContext } from '../recommendation/types.js';

// In-memory store for feedback when in degraded mode
const inMemoryFeedback: any[] = [];

export class EvaluationService {
  private popularityStrategy = new PopularityStrategy();
  private contentStrategy = new ContentStrategy();
  private behaviourStrategy = new BehaviourStrategy();
  private contextStrategy = new ContextStrategy();
  private hybridStrategy = new HybridStrategy();
  private collaborativeStrategy = new CollaborativeStrategy();
  private collaborativeHybridStrategy = new CollaborativeHybridStrategy();

  /**
   * Records user evaluation feedback for mood-aware recommendations.
   * POST /api/evaluation/mood-feedback
   */
  public async recordMoodFeedback(
    userId: string,
    input: MoodFeedbackInput
  ): Promise<{ success: boolean; id: string }> {
    const feedbackDoc = {
      userId: Types.ObjectId.isValid(userId) ? new Types.ObjectId(userId) : userId,
      recommendationRequestId: input.recommendationRequestId,
      feedbackType: 'mood' as const,
      rating: input.rating,
      mood: input.mood,
      songId: input.songId,
      explanationText: input.comment,
      timestamp: new Date(),
    };

    if (dbState.isConnected) {
      const doc = await EvaluationFeedback.create(feedbackDoc);
      return { success: true, id: doc._id.toString() };
    }

    inMemoryFeedback.push(feedbackDoc);
    return { success: true, id: `fb_mood_${Date.now()}` };
  }

  /**
   * Records user evaluation feedback for recommendation explanations.
   * POST /api/evaluation/explanation-feedback
   */
  public async recordExplanationFeedback(
    userId: string,
    input: ExplanationFeedbackInput
  ): Promise<{ success: boolean; id: string }> {
    const feedbackDoc = {
      userId: Types.ObjectId.isValid(userId) ? new Types.ObjectId(userId) : userId,
      recommendationRequestId: input.recommendationRequestId,
      feedbackType: 'explanation' as const,
      rating: input.rating,
      songId: input.songId,
      explanationText: input.explanationText || input.comment,
      timestamp: new Date(),
    };

    if (dbState.isConnected) {
      const doc = await EvaluationFeedback.create(feedbackDoc);
      return { success: true, id: doc._id.toString() };
    }

    inMemoryFeedback.push(feedbackDoc);
    return { success: true, id: `fb_exp_${Date.now()}` };
  }

  /**
   * Aggregates average ratings by mood and overall explanation trust rating.
   * GET /api/evaluation/feedback-summary
   */
  public async getFeedbackSummary(): Promise<{
    moodRatings: Array<{ mood: string; count: number; averageRating: number }>;
    explanationRatings: { count: number; averageRating: number };
  }> {
    if (dbState.isConnected) {
      const moodAgg = await EvaluationFeedback.aggregate([
        { $match: { feedbackType: 'mood', mood: { $exists: true } } },
        {
          $group: {
            _id: '$mood',
            count: { $sum: 1 },
            avgRating: { $avg: '$rating' },
          },
        },
        { $sort: { count: -1 } },
      ]);

      const [expAgg] = await EvaluationFeedback.aggregate([
        { $match: { feedbackType: 'explanation' } },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            avgRating: { $avg: '$rating' },
          },
        },
      ]);

      const moodRatings = moodAgg.map((m: any) => ({
        mood: m._id,
        count: m.count,
        averageRating: Number(m.avgRating.toFixed(2)),
      }));

      const explanationRatings = {
        count: expAgg?.count || 0,
        averageRating: expAgg?.avgRating ? Number(expAgg.avgRating.toFixed(2)) : 0,
      };

      return { moodRatings, explanationRatings };
    }

    // In-memory fallback
    const moodItems = inMemoryFeedback.filter((f) => f.feedbackType === 'mood' && f.mood);
    const expItems = inMemoryFeedback.filter((f) => f.feedbackType === 'explanation');

    const moodGroups: Record<string, number[]> = {};
    for (const item of moodItems) {
      if (!moodGroups[item.mood]) moodGroups[item.mood] = [];
      moodGroups[item.mood].push(item.rating);
    }

    const moodRatings = Object.entries(moodGroups).map(([mood, ratings]) => ({
      mood,
      count: ratings.length,
      averageRating: Number((ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(2)),
    }));

    const expRatings = expItems.map((e) => e.rating);
    const explanationRatings = {
      count: expRatings.length,
      averageRating:
        expRatings.length > 0
          ? Number((expRatings.reduce((a, b) => a + b, 0) / expRatings.length).toFixed(2))
          : 0,
    };

    return { moodRatings, explanationRatings };
  }

  /**
   * Offline Recommendation Evaluation Framework:
   * Performs temporal train/test split per user, scores candidates using the specified strategy,
   * and calculates Precision@K, Recall@K, HitRate@K, NDCG@K, Diversity (ILD), Novelty, and Coverage.
   */
  public async evaluateStrategy(
    strategyName: string,
    options: {
      k?: number;
      trainDays?: number;
      testDays?: number;
      catalogCandidates?: CandidateSongEnriched[];
      syntheticUsers?: Array<{
        userId: string;
        trainEvents: Array<{ songId: string; eventType: string }>;
        testEvents: Array<{ songId: string; eventType: string }>;
      }>;
    } = {}
  ): Promise<OfflineEvaluationResultDto> {
    const k = options.k || 10;
    const testDays = options.testDays || EVALUATION_CONFIG.temporalSplit.defaultTestDays;
    const evaluatedAt = new Date().toISOString();

    // 1. Obtain Candidates Pool
    let candidatesPool: CandidateSongEnriched[] = options.catalogCandidates || [];
    if (candidatesPool.length === 0 && dbState.isConnected) {
      const songDocs = await Song.find({}).limit(100).lean();
      candidatesPool = songDocs.map((s: any) => ({
        id: s._id.toString(),
        title: s.title,
        artistId: s.artistIds?.[0]?.toString(),
        artistName: 'Artist',
        durationSeconds: s.durationSeconds || 180,
        genres: s.genres || [],
        languages: s.languages || [],
        provider: s.provider || 'custom',
        providerTrackId: s.providerTrackId || s._id.toString(),
        metadata: s.metadata,
      }));
    }

    // Fallback sample catalogue if DB is empty
    if (candidatesPool.length === 0) {
      candidatesPool = this.getDefaultSampleCatalogue();
    }

    // 2. Obtain Users & Apply Temporal Train/Test Split (Zero Future Leakage Guarantee)
    interface SplitUser {
      userId: string;
      trainSongIds: string[];
      trainPlayCounts: Map<string, number>;
      trainInteractions: Map<string, number>;
      testSongIds: Set<string>;
    }

    const splitUsers: SplitUser[] = [];

    if (options.syntheticUsers && options.syntheticUsers.length > 0) {
      // Used by verification suite / unit tests
      for (const u of options.syntheticUsers) {
        const trainPlayCounts = new Map<string, number>();
        const trainInteractions = new Map<string, number>();
        const trainSongIds: string[] = [];
        for (const e of u.trainEvents) {
          trainSongIds.push(e.songId);
          trainPlayCounts.set(e.songId, (trainPlayCounts.get(e.songId) || 0) + 1);
          const curScore = trainInteractions.get(e.songId) || 0;
          const w = e.eventType === 'complete' ? 1.0 : e.eventType === 'play' ? 0.1 : e.eventType === 'pause' ? 0.05 : -0.75;
          trainInteractions.set(e.songId, Math.max(-1, Math.min(10, curScore + w)));
        }
        const testSongIds = new Set(u.testEvents.map((e) => e.songId));
        splitUsers.push({
          userId: u.userId,
          trainSongIds,
          trainPlayCounts,
          trainInteractions,
          testSongIds,
        });
      }
    } else if (dbState.isConnected) {
      // Real database temporal split
      const now = new Date();
      const splitDate = new Date(now.getTime() - testDays * 24 * 3600 * 1000);

      // Find users with interactions
      const eligibleUserIds = await ListeningEvent.distinct('userId');

      for (const uId of eligibleUserIds) {
        const events = await ListeningEvent.find({ userId: uId }).sort({ timestamp: 1 }).lean();
        const train = events.filter((e) => new Date(e.timestamp) < splitDate);
        const test = events.filter((e) => new Date(e.timestamp) >= splitDate);

        if (
          train.length >= EVALUATION_CONFIG.temporalSplit.minimumTrainingEvents &&
          test.length >= EVALUATION_CONFIG.temporalSplit.minimumTestEvents
        ) {
          const trainPlayCounts = new Map<string, number>();
          const trainInteractions = new Map<string, number>();
          const trainSongIds: string[] = [];
          for (const e of train) {
            const sid = e.songId.toString();
            trainSongIds.push(sid);
            trainPlayCounts.set(sid, (trainPlayCounts.get(sid) || 0) + 1);
            const curScore = trainInteractions.get(sid) || 0;
            const w = e.eventType === 'complete' ? 1.0 : e.eventType === 'play' ? 0.1 : e.eventType === 'pause' ? 0.05 : -0.75;
            trainInteractions.set(sid, Math.max(-1, Math.min(10, curScore + w)));
          }
          const testSongIds = new Set(test.map((e) => e.songId.toString()));
          splitUsers.push({
            userId: uId.toString(),
            trainSongIds,
            trainPlayCounts,
            trainInteractions,
            testSongIds,
          });
        }
      }
    }

    // 3. Strict Insufficient Data Handling (Academic Rule: never fabricate numbers)
    if (splitUsers.length === 0) {
      return {
        strategy: strategyName,
        usersEvaluated: 0,
        k,
        precisionAtK: 0,
        recallAtK: 0,
        hitRateAtK: 0,
        ndcgAtK: 0,
        diversity: 0,
        novelty: 0,
        catalogCoverage: 0,
        evaluatedAt,
        insufficientData: true,
        message: 'Evaluation requires additional listening data with at least 3 historical training events and held-out test events.',
      };
    }

    // 4. Build Sparse Training Matrix across evaluated users (Strict Zero-Leakage)
    const allTrainInteractions = new Map<string, Map<string, number>>();
    for (const u of splitUsers) {
      allTrainInteractions.set(u.userId, u.trainInteractions);
    }

    // 5. Run Evaluation across eligible users
    let totalPrecision = 0;
    let totalRecall = 0;
    let totalHitRate = 0;
    let totalNDCG = 0;
    let totalDiversity = 0;
    let totalNovelty = 0;
    let usersWithSimilarCount = 0;
    const allRecommendedSongIds = new Set<string>();

    const popMap = new Map<string, number>();
    for (const c of candidatesPool) {
      popMap.set(c.id, 0.7);
    }

    for (const user of splitUsers) {
      // Find similar users strictly using training interactions
      const similarUsers = await collaborativeService.findSimilarUsers(user.userId, {
        allUsersInteractions: allTrainInteractions,
      });

      if (similarUsers.length > 0) {
        usersWithSimilarCount += 1;
      }

      const collabConfidence = collaborativeService.getCollaborativeConfidence(
        user.trainSongIds.length,
        similarUsers
      );

      // Build mock profile representation for strategy scoring
      const mockProfile: any = {
        userId: user.userId,
        profileConfidence: user.trainSongIds.length >= 10 ? 0.8 : 0.4,
        recent: {
          genres: [{ genre: 'electronic', score: 0.9 }],
          artists: [],
          audioFeatures: { energy: 0.7, valence: 0.6 },
        },
        longTerm: {
          genres: [{ genre: 'electronic', score: 0.8 }],
          artists: [],
          audioFeatures: { energy: 0.7, valence: 0.6 },
        },
        behaviour: { totalEvents: user.trainSongIds.length, completionRate: 0.8, skipRate: 0.1 },
        context: { timeOfDay: {}, dayOfWeek: {} },
      };

      const context: RecommendationContext = {
        timeOfDay: 'evening',
        dayOfWeek: 'friday',
        mood: strategyName.includes('no_mood') ? undefined : 'energetic',
      };

      // Score candidates according to strategy
      const scored: Array<{ song: CandidateSongEnriched; score: number }> = [];

      for (const candidate of candidatesPool) {
        // Compute collaborative signal for candidate from training similar users
        let candCollabScore = 0;
        if (similarUsers.length > 0) {
          for (const sUser of similarUsers) {
            const neighborScores = allTrainInteractions.get(sUser.userId);
            const scoreInNeighbor = neighborScores?.get(candidate.id) || 0;
            if (scoreInNeighbor > 0) {
              candCollabScore += sUser.similarity * scoreInNeighbor;
            }
          }
          candCollabScore = Math.min(1.0, candCollabScore / Math.max(1, similarUsers.length));
        }

        const candidateEnriched: CandidateSongEnriched = {
          ...candidate,
          collaborativeScore: candCollabScore,
          supportingSimilarUsers: candCollabScore > 0 ? Math.max(1, similarUsers.length) : 0,
        };

        let score = 0;
        if (strategyName === 'popularity' || strategyName === 'R0_popularity') {
          score = this.popularityStrategy.score(candidateEnriched, context, mockProfile, popMap, user.trainPlayCounts).score;
        } else if (strategyName === 'content' || strategyName === 'R1_content') {
          score = this.contentStrategy.score(candidateEnriched, context, mockProfile, popMap, user.trainPlayCounts).score;
        } else if (strategyName === 'behaviour' || strategyName === 'R2_behaviour') {
          score = this.behaviourStrategy.score(candidateEnriched, context, mockProfile, popMap, user.trainPlayCounts).score;
        } else if (strategyName === 'context' || strategyName === 'R3_context') {
          score = this.contextStrategy.score(candidateEnriched, context, mockProfile, popMap, user.trainPlayCounts).score;
        } else if (strategyName === 'collaborative' || strategyName === 'R5_collaborative') {
          score = this.collaborativeStrategy.score(candidateEnriched, context, mockProfile, popMap, user.trainPlayCounts, null, collabConfidence).score;
        } else if (strategyName === 'collaborativeHybrid' || strategyName === 'R5_collaborative_hybrid' || strategyName === 'R5_full_hybrid') {
          score = this.collaborativeHybridStrategy.score(candidateEnriched, context, mockProfile, popMap, user.trainPlayCounts, null, collabConfidence).score;
        } else if (strategyName === 'ablation_no_collaborative' || strategyName === 'R5_no_collaborative') {
          score = this.collaborativeHybridStrategy.score(candidateEnriched, context, mockProfile, popMap, user.trainPlayCounts, null, 0).score;
        } else if (strategyName === 'ablation_no_mood' || strategyName === 'R5_no_mood') {
          const noMoodCtx = { ...context, mood: undefined };
          score = this.collaborativeHybridStrategy.score(candidateEnriched, noMoodCtx, mockProfile, popMap, user.trainPlayCounts, null, collabConfidence).score;
        } else if (strategyName === 'ablation_no_context' || strategyName === 'R5_no_context') {
          const noCtx: any = { timeOfDay: 'morning', dayOfWeek: 'monday', mood: undefined };
          score = this.collaborativeHybridStrategy.score(candidateEnriched, noCtx, mockProfile, popMap, user.trainPlayCounts, null, collabConfidence).score;
        } else if (strategyName === 'ablation_no_behaviour' || strategyName === 'R5_no_behaviour') {
          const noBehProfile: any = { ...mockProfile, behaviour: { totalEvents: 0, completionRate: 0, skipRate: 0 } };
          score = this.collaborativeHybridStrategy.score(candidateEnriched, context, noBehProfile, popMap, user.trainPlayCounts, null, collabConfidence).score;
        } else if (strategyName === 'ablation_no_content' || strategyName === 'R5_no_content') {
          const noContProfile: any = { ...mockProfile, recent: { genres: [], artists: [] }, longTerm: { genres: [], artists: [] } };
          score = this.collaborativeHybridStrategy.score(candidateEnriched, context, noContProfile, popMap, user.trainPlayCounts, null, collabConfidence).score;
        } else {
          // Standard R4 Hybrid
          score = this.hybridStrategy.score(candidateEnriched, context, mockProfile, popMap, user.trainPlayCounts).score;
        }
        scored.push({ song: candidateEnriched, score });
      }

      // Sort descending and select top K
      scored.sort((a, b) => {
        const diff = b.score - a.score;
        if (Math.abs(diff) > 0.0001) return diff;
        return a.song.id.localeCompare(b.song.id);
      });

      const topK = scored.slice(0, k).map((item) => item.song);

      // Track recommended songs for Catalog Coverage
      for (const item of topK) {
        allRecommendedSongIds.add(item.id);
      }

      // Calculate Metrics for this user
      const relevantCount = topK.filter((item) => user.testSongIds.has(item.id)).length;
      const precision = relevantCount / k;
      const recall = user.testSongIds.size > 0 ? relevantCount / user.testSongIds.size : 0;
      const hitRate = relevantCount > 0 ? 1 : 0;

      // NDCG@K calculation
      let dcg = 0;
      for (let i = 0; i < topK.length; i++) {
        const isRel = user.testSongIds.has(topK[i].id) ? 1 : 0;
        if (isRel) {
          dcg += 1 / Math.log2(i + 2);
        }
      }

      let idcg = 0;
      const maxPossibleHits = Math.min(k, user.testSongIds.size);
      for (let i = 0; i < maxPossibleHits; i++) {
        idcg += 1 / Math.log2(i + 2);
      }
      const ndcg = idcg > 0 ? dcg / idcg : 0;

      // Intra-List Diversity (ILD)
      const ild = this.calculateIntraListDiversity(topK);

      // Novelty@K
      const avgNovelty = topK.reduce(
        (sum, item) => sum + Math.max(0, 1 - (user.trainPlayCounts.get(item.id) || 0) / 5),
        0
      ) / Math.max(1, topK.length);

      totalPrecision += precision;
      totalRecall += recall;
      totalHitRate += hitRate;
      totalNDCG += ndcg;
      totalDiversity += ild;
      totalNovelty += avgNovelty;
    }

    const numUsers = splitUsers.length;
    const catalogCoverage = candidatesPool.length > 0
      ? Number((allRecommendedSongIds.size / candidatesPool.length).toFixed(3))
      : 0;

    const collaborativeCoverage = numUsers > 0
      ? Number((usersWithSimilarCount / numUsers).toFixed(3))
      : 0;

    return {
      strategy: strategyName,
      usersEvaluated: numUsers,
      k,
      precisionAtK: Number((totalPrecision / numUsers).toFixed(3)),
      recallAtK: Number((totalRecall / numUsers).toFixed(3)),
      hitRateAtK: Number((totalHitRate / numUsers).toFixed(3)),
      ndcgAtK: Number((totalNDCG / numUsers).toFixed(3)),
      diversity: Number((totalDiversity / numUsers).toFixed(3)),
      novelty: Number((totalNovelty / numUsers).toFixed(3)),
      catalogCoverage,
      collaborativeCoverage,
      evaluatedAt,
      insufficientData: false,
    };
  }

  /**
   * Compares all recommendation baselines (R0–R4) and ablation configurations.
   * GET /api/evaluation/recommendations?strategy=all
   */
  public async compareAllStrategies(options: {
    k?: number;
    trainDays?: number;
    testDays?: number;
    catalogCandidates?: CandidateSongEnriched[];
    syntheticUsers?: any[];
  } = {}): Promise<StrategyComparisonDto> {
    const k = options.k || 10;
    const trainDays = options.trainDays || EVALUATION_CONFIG.temporalSplit.defaultTrainDays;
    const testDays = options.testDays || EVALUATION_CONFIG.temporalSplit.defaultTestDays;

    const strategiesToTest = [
      'popularity',
      'content',
      'behaviour',
      'context',
      'hybrid',
      'collaborativeHybrid',
      'collaborative',
      'ablation_no_collaborative',
      'ablation_no_mood',
      'ablation_no_context',
      'ablation_no_behaviour',
      'ablation_no_content',
    ];

    const results: Record<string, OfflineEvaluationResultDto> = {};
    let usersEvaluated = 0;
    let anyInsufficient = false;

    for (const strat of strategiesToTest) {
      const res = await this.evaluateStrategy(strat, options);
      results[strat] = res;
      usersEvaluated = res.usersEvaluated;
      if (res.insufficientData) {
        anyInsufficient = true;
      }
    }

    // Populate standard academic aliases
    results['R0_popularity'] = results['popularity'];
    results['R1_content'] = results['content'];
    results['R2_behaviour'] = results['behaviour'];
    results['R3_context'] = results['context'];
    results['R4_hybrid'] = results['hybrid'];
    results['R5_collaborative_hybrid'] = results['collaborativeHybrid'];

    return {
      k,
      trainDays,
      testDays,
      usersEvaluated,
      evaluatedAt: new Date().toISOString(),
      strategies: results,
      insufficientData: anyInsufficient,
      message: anyInsufficient
        ? 'Not enough listening data yet for offline evaluation across historical users.'
        : undefined,
    };
  }

  /**
   * Precision@K = |Recommended@K ∩ Relevant| / K
   */
  public static calculatePrecisionAtK(
    recommendedIds: string[],
    relevantIds: Set<string>,
    k: number
  ): number {
    if (k <= 0) return 0;
    const topK = recommendedIds.slice(0, k);
    const hits = topK.filter((id) => relevantIds.has(id)).length;
    return hits / k;
  }

  /**
   * Recall@K = |Recommended@K ∩ Relevant| / |Relevant|
   */
  public static calculateRecallAtK(
    recommendedIds: string[],
    relevantIds: Set<string>,
    k: number
  ): number {
    if (relevantIds.size === 0) return 0;
    const topK = recommendedIds.slice(0, k);
    const hits = topK.filter((id) => relevantIds.has(id)).length;
    return hits / relevantIds.size;
  }

  /**
   * HitRate@K = 1 if |Recommended@K ∩ Relevant| > 0 else 0
   */
  public static calculateHitRateAtK(
    recommendedIds: string[],
    relevantIds: Set<string>,
    k: number
  ): number {
    const topK = recommendedIds.slice(0, k);
    return topK.some((id) => relevantIds.has(id)) ? 1 : 0;
  }

  /**
   * NDCG@K = DCG@K / IDCG@K with binary relevance
   */
  public static calculateNdcgAtK(
    recommendedIds: string[],
    relevantIds: Set<string>,
    k: number
  ): number {
    const topK = recommendedIds.slice(0, k);
    let dcg = 0;
    for (let i = 0; i < topK.length; i++) {
      if (relevantIds.has(topK[i])) {
        dcg += 1 / Math.log2(i + 2);
      }
    }

    let idcg = 0;
    const maxHits = Math.min(k, relevantIds.size);
    for (let i = 0; i < maxHits; i++) {
      idcg += 1 / Math.log2(i + 2);
    }

    return idcg > 0 ? dcg / idcg : 0;
  }

  /**
   * Calculates Intra-List Diversity (ILD) using pairwise content and acoustic feature dissimilarity.
   */
  public static calculateIntraListDiversity(songs: CandidateSongEnriched[]): number {
    if (songs.length <= 1) return 0.0;

    let totalDissimilarity = 0;
    let pairs = 0;

    for (let i = 0; i < songs.length; i++) {
      for (let j = i + 1; j < songs.length; j++) {
        const s1 = songs[i];
        const s2 = songs[j];

        // Genre similarity: Jaccard overlap
        let genreSim = 0;
        if (s1.genres.length > 0 && s2.genres.length > 0) {
          const set1 = new Set(s1.genres);
          const overlap = s2.genres.filter((g) => set1.has(g)).length;
          const union = new Set([...s1.genres, ...s2.genres]).size;
          genreSim = union > 0 ? overlap / union : 0;
        }

        // Artist similarity: binary identity
        const artistSim = s1.artistId && s2.artistId && s1.artistId === s2.artistId ? 1 : 0;

        // Energy difference
        const energyDiff = Math.abs(
          (s1.metadata?.energy ?? 0.5) - (s2.metadata?.energy ?? 0.5)
        );

        // Valence difference
        const valenceDiff = Math.abs(
          (s1.metadata?.valence ?? 0.5) - (s2.metadata?.valence ?? 0.5)
        );

        const pairwiseSim =
          genreSim * 0.40 +
          artistSim * 0.30 +
          (1 - energyDiff) * 0.15 +
          (1 - valenceDiff) * 0.15;

        totalDissimilarity += 1 - Math.max(0, Math.min(1, pairwiseSim));
        pairs++;
      }
    }

    return pairs > 0 ? Number((totalDissimilarity / pairs).toFixed(3)) : 0;
  }

  public calculateIntraListDiversity(songs: CandidateSongEnriched[]): number {
    return EvaluationService.calculateIntraListDiversity(songs);
  }

  /**
   * Catalog Coverage = unique recommended songs / available catalog
   */
  public static calculateCatalogCoverage(
    recommendedIds: string[],
    totalCatalogueSize: number
  ): number {
    if (totalCatalogueSize <= 0) return 0;
    const unique = new Set(recommendedIds).size;
    return Number((unique / totalCatalogueSize).toFixed(3));
  }

  /**
   * Novelty@K = average(max(0, 1 - playCount / threshold))
   */
  public static calculateNoveltyAtK(
    recommendedIds: string[],
    playCounts: Map<string, number>,
    k: number,
    threshold = 20
  ): number {
    const topK = recommendedIds.slice(0, k);
    if (topK.length === 0) return 0;
    const sum = topK.reduce(
      (acc, id) => acc + Math.max(0, 1 - (playCounts.get(id) || 0) / threshold),
      0
    );
    return Number((sum / topK.length).toFixed(3));
  }

  /**
   * Partitions events into temporal train and test sets
   */
  public static partitionUserEventsTemporally(
    events: Array<{ id?: string; songId?: any; timestamp: Date | string }>,
    testDays: number
  ) {
    const splitTimestamp = Date.now() - testDays * 24 * 60 * 60 * 1000;
    const trainEvents = events.filter((e) => new Date(e.timestamp).getTime() < splitTimestamp);
    const testEvents = events.filter((e) => new Date(e.timestamp).getTime() >= splitTimestamp);
    return { trainEvents, testEvents, splitTimestamp: new Date(splitTimestamp) };
  }

  private getDefaultSampleCatalogue(): CandidateSongEnriched[] {
    return [
      {
        id: 'cat_track_1',
        title: 'Neon Odyssey',
        artistId: 'art_1',
        artistName: 'Astral Wave',
        durationSeconds: 215,
        genres: ['electronic', 'synthwave'],
        languages: ['en'],
        provider: 'custom',
        providerTrackId: 'no1',
        metadata: { energy: 0.85, danceability: 0.75, valence: 0.70, tempo: 128 },
      },
      {
        id: 'cat_track_2',
        title: 'Deep Drift',
        artistId: 'art_2',
        artistName: 'Luna Echo',
        durationSeconds: 280,
        genres: ['ambient', 'chillout'],
        languages: [],
        provider: 'custom',
        providerTrackId: 'dd1',
        metadata: { energy: 0.25, danceability: 0.30, valence: 0.45, tempo: 75, acousticness: 0.80 },
      },
      {
        id: 'cat_track_3',
        title: 'Urban Synthesis',
        artistId: 'art_3',
        artistName: 'Synthflow',
        durationSeconds: 240,
        genres: ['lofi', 'chillhop'],
        languages: [],
        provider: 'custom',
        providerTrackId: 'us1',
        metadata: { energy: 0.50, danceability: 0.68, valence: 0.60, tempo: 85 },
      },
      {
        id: 'cat_track_4',
        title: 'Solar Resonance',
        artistId: 'art_4',
        artistName: 'Kinetic Sound',
        durationSeconds: 195,
        genres: ['rock', 'alternative'],
        languages: ['en'],
        provider: 'custom',
        providerTrackId: 'sr1',
        metadata: { energy: 0.90, danceability: 0.55, valence: 0.75, tempo: 135 },
      },
      {
        id: 'cat_track_5',
        title: 'Quiet Reflections',
        artistId: 'art_5',
        artistName: 'Serene Strings',
        durationSeconds: 310,
        genres: ['classical', 'instrumental'],
        languages: [],
        provider: 'custom',
        providerTrackId: 'qr1',
        metadata: { energy: 0.20, danceability: 0.20, valence: 0.35, tempo: 65, acousticness: 0.95 },
      },
    ];
  }
}

export const evaluationService = new EvaluationService();
