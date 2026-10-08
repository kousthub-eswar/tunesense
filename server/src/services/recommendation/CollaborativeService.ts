import { Types } from 'mongoose';
import { COLLABORATIVE_CONFIG } from '../../config/collaborativeConfig.js';
import { UserSongInteraction } from '../../models/UserSongInteraction.js';
import { UserSimilarity } from '../../models/UserSimilarity.js';
import { ListeningEvent } from '../../models/ListeningEvent.js';
import { Song } from '../../models/Song.js';
import { getDatabaseState } from '../../config/database.js';
import {
  CandidateSongEnriched,
  ExplanationSignal,
} from './types.js';
import { SimilarUserCandidate, UserPreferenceDto } from '../../types/index.js';

export interface UserInteractionEntry {
  songId: string;
  interactionScore: number;
  playCount: number;
  completionCount: number;
  skipCount: number;
  lastInteractionAt: Date;
}

// In-memory fallback stores for offline testing and degraded development mode
const MAX_IN_MEMORY_CACHE_ENTRIES = 500;

function setBoundedCache<K, V>(map: Map<K, V>, key: K, value: V): void {
  if (map.size >= MAX_IN_MEMORY_CACHE_ENTRIES && !map.has(key)) {
    const firstKey = map.keys().next().value;
    if (firstKey !== undefined) {
      map.delete(firstKey);
    }
  }
  map.set(key, value);
}

const inMemoryInteractions = new Map<string, Map<string, UserInteractionEntry>>(); // userId -> (songId -> entry)
const inMemorySimilarities = new Map<string, SimilarUserCandidate[]>(); // userId -> similar candidates
const inMemoryCalculatedAt = new Map<string, Date>(); // userId -> calculation timestamp

export class CollaborativeService {
  /**
   * Derives interaction score from raw event counts and weights.
   * Clamps score within configured bounds [-1.0, 10.0].
   */
  public calculateInteractionScore(events: {
    playCount?: number;
    completionCount?: number;
    pauseCount?: number;
    skipCount?: number;
    avgCompletionPercent?: number;
  }): number {
    const weights = COLLABORATIVE_CONFIG.eventWeights;
    const playWeight =
      events.avgCompletionPercent !== undefined
        ? weights.play + (events.avgCompletionPercent / 100) * COLLABORATIVE_CONFIG.completionScale
        : weights.play;

    const raw =
      (events.completionCount || 0) * weights.complete +
      (events.playCount || 0) * playWeight +
      (events.pauseCount || 0) * weights.pause +
      (events.skipCount || 0) * weights.skip;

    return Math.max(
      COLLABORATIVE_CONFIG.interactionScoreBounds.min,
      Math.min(COLLABORATIVE_CONFIG.interactionScoreBounds.max, Number(raw.toFixed(3)))
    );
  }

  /**
   * Computes or updates sparse user-song interaction records for a target user.
   * Derives scores from ListeningEvent documents and materializes into UserSongInteraction collection.
   */
  public async rebuildUserInteractions(
    userId: string,
    injectedEvents?: Array<{ songId: string; eventType: string; timestamp?: Date; completionPercent?: number }>
  ): Promise<Map<string, UserInteractionEntry>> {
    const interactionMap = new Map<string, UserInteractionEntry>();
    const dbState = getDatabaseState();

    if (injectedEvents && injectedEvents.length > 0) {
      // Used by testing / unit evaluation
      const songGroupMap = new Map<string, { plays: number; completes: number; pauses: number; skips: number; lastTime: Date }>();
      for (const ev of injectedEvents) {
        const sid = ev.songId;
        const cur = songGroupMap.get(sid) || { plays: 0, completes: 0, pauses: 0, skips: 0, lastTime: new Date(0) };
        if (ev.eventType === 'play') cur.plays += 1;
        else if (ev.eventType === 'complete') cur.completes += 1;
        else if (ev.eventType === 'pause') cur.pauses += 1;
        else if (ev.eventType === 'skip') cur.skips += 1;
        const evTime = ev.timestamp || new Date();
        if (evTime > cur.lastTime) cur.lastTime = evTime;
        songGroupMap.set(sid, cur);
      }

      for (const [songId, counts] of songGroupMap.entries()) {
        const score = this.calculateInteractionScore({
          playCount: counts.plays,
          completionCount: counts.completes,
          pauseCount: counts.pauses,
          skipCount: counts.skips,
        });
        const entry: UserInteractionEntry = {
          songId,
          interactionScore: score,
          playCount: counts.plays,
          completionCount: counts.completes,
          skipCount: counts.skips,
          lastInteractionAt: counts.lastTime,
        };
        interactionMap.set(songId, entry);
      }

      inMemoryInteractions.set(userId, interactionMap);
      return interactionMap;
    }

    if (dbState.isConnected && Types.ObjectId.isValid(userId)) {
      try {
        const userObjId = new Types.ObjectId(userId);
        const agg = await ListeningEvent.aggregate([
          { $match: { userId: userObjId } },
          {
            $group: {
              _id: '$songId',
              plays: { $sum: { $cond: [{ $eq: ['$eventType', 'play'] }, 1, 0] } },
              completes: { $sum: { $cond: [{ $eq: ['$eventType', 'complete'] }, 1, 0] } },
              pauses: { $sum: { $cond: [{ $eq: ['$eventType', 'pause'] }, 1, 0] } },
              skips: { $sum: { $cond: [{ $eq: ['$eventType', 'skip'] }, 1, 0] } },
              lastInteractionAt: { $max: '$timestamp' },
            },
          },
        ]);

        const bulkOps: any[] = [];
        for (const item of agg) {
          const songIdStr = item._id.toString();
          const score = this.calculateInteractionScore({
            playCount: item.plays,
            completionCount: item.completes,
            pauseCount: item.pauses,
            skipCount: item.skips,
          });

          const entry: UserInteractionEntry = {
            songId: songIdStr,
            interactionScore: score,
            playCount: item.plays,
            completionCount: item.completes,
            skipCount: item.skips,
            lastInteractionAt: item.lastInteractionAt || new Date(),
          };
          interactionMap.set(songIdStr, entry);

          bulkOps.push({
            updateOne: {
              filter: { userId: userObjId, songId: item._id },
              update: {
                $set: {
                  interactionScore: score,
                  playCount: item.plays,
                  completionCount: item.completes,
                  skipCount: item.skips,
                  lastInteractionAt: item.lastInteractionAt || new Date(),
                },
              },
              upsert: true,
            },
          });
        }

        if (bulkOps.length > 0) {
          await UserSongInteraction.bulkWrite(bulkOps);
        }
      } catch (err) {
        console.warn(`[CollaborativeService] Notice: Error rebuilding MongoDB interactions for user ${userId}:`, err);
      }
    }

    const fallback = inMemoryInteractions.get(userId);
    if (fallback && interactionMap.size === 0) {
      return fallback;
    }

    setBoundedCache(inMemoryInteractions, userId, interactionMap);
    return interactionMap;
  }

  /**
   * Incrementally updates sparse interaction for a single user and song from ListeningEvents.
   * Efficient O(1) query scoped to (userId, songId).
   */
  public async updateUserSongInteraction(userId: string, songId: string): Promise<void> {
    const dbState = getDatabaseState();
    if (dbState.isConnected && Types.ObjectId.isValid(userId) && Types.ObjectId.isValid(songId)) {
      try {
        const userObjId = new Types.ObjectId(userId);
        const songObjId = new Types.ObjectId(songId);

        const agg = await ListeningEvent.aggregate([
          { $match: { userId: userObjId, songId: songObjId } },
          {
            $group: {
              _id: '$songId',
              plays: { $sum: { $cond: [{ $eq: ['$eventType', 'play'] }, 1, 0] } },
              completes: { $sum: { $cond: [{ $eq: ['$eventType', 'complete'] }, 1, 0] } },
              pauses: { $sum: { $cond: [{ $eq: ['$eventType', 'pause'] }, 1, 0] } },
              skips: { $sum: { $cond: [{ $eq: ['$eventType', 'skip'] }, 1, 0] } },
              lastInteractionAt: { $max: '$timestamp' },
            },
          },
        ]);

        if (agg && agg.length > 0) {
          const item = agg[0];
          const score = this.calculateInteractionScore({
            playCount: item.plays,
            completionCount: item.completes,
            pauseCount: item.pauses,
            skipCount: item.skips,
          });

          const entry: UserInteractionEntry = {
            songId: songId,
            interactionScore: score,
            playCount: item.plays,
            completionCount: item.completes,
            skipCount: item.skips,
            lastInteractionAt: item.lastInteractionAt || new Date(),
          };

          await UserSongInteraction.updateOne(
            { userId: userObjId, songId: songObjId },
            {
              $set: {
                interactionScore: score,
                playCount: item.plays,
                completionCount: item.completes,
                skipCount: item.skips,
                lastInteractionAt: item.lastInteractionAt || new Date(),
              },
            },
            { upsert: true }
          );

          let userMap = inMemoryInteractions.get(userId);
          if (!userMap) {
            userMap = new Map();
            setBoundedCache(inMemoryInteractions, userId, userMap);
          }
          userMap.set(songId, entry);
        }
      } catch (err) {
        console.warn(`[CollaborativeService] Notice: Error updating interaction for user ${userId}, song ${songId}:`, err);
      }
    }
  }

  /**
   * Invalidates cached similarities for a user so subsequent recommendations recompute freshly.
   */
  public async invalidateSimilarityCache(userId: string): Promise<void> {
    inMemorySimilarities.delete(userId);
    inMemoryCalculatedAt.delete(userId);

    const dbState = getDatabaseState();
    if (dbState.isConnected && Types.ObjectId.isValid(userId)) {
      try {
        await UserSimilarity.updateMany(
          { userId: new Types.ObjectId(userId) },
          { $set: { calculatedAt: new Date(0) } }
        );
      } catch (err) {
        console.warn(`[CollaborativeService] Notice: Error marking UserSimilarity stale for ${userId}:`, err);
      }
    }
  }

  /**
   * Retrieves sparse interactions for a user (from DB or in-memory cache).
   */
  public async getUserInteractions(userId: string): Promise<Map<string, UserInteractionEntry>> {
    const dbState = getDatabaseState();
    if (dbState.isConnected && Types.ObjectId.isValid(userId)) {
      try {
        const docs = await UserSongInteraction.find({ userId: new Types.ObjectId(userId) }).lean();
        if (docs.length > 0) {
          const map = new Map<string, UserInteractionEntry>();
          for (const d of docs) {
            map.set(d.songId.toString(), {
              songId: d.songId.toString(),
              interactionScore: d.interactionScore,
              playCount: d.playCount,
              completionCount: d.completionCount,
              skipCount: d.skipCount,
              lastInteractionAt: d.lastInteractionAt,
            });
          }
          return map;
        }
      } catch (err) {
        console.warn(`[CollaborativeService] Notice: Error reading interactions for ${userId}:`, err);
      }
    }

    return inMemoryInteractions.get(userId) || new Map<string, UserInteractionEntry>();
  }

  /**
   * Computes classical Cosine Similarity over sparse user-song interaction vectors:
   * 
   * similarity(A, B) = (A · B) / (||A|| * ||B||)
   * 
   * Requires at least minimumCommonSongs overlapping songs, otherwise returns 0.
   */
  public calculateCosineSimilarity(
    userA: Map<string, UserInteractionEntry | number>,
    userB: Map<string, UserInteractionEntry | number>,
    minCommonSongs: number = COLLABORATIVE_CONFIG.similarity.minimumCommonSongs
  ): { similarity: number; commonSongs: number } {
    const getScore = (val: UserInteractionEntry | number | undefined): number => {
      if (val === undefined) return 0;
      return typeof val === 'number' ? val : val.interactionScore;
    };

    let dotProduct = 0;
    let commonCount = 0;
    let normASq = 0;
    let normBSq = 0;

    // Compute norm for A
    for (const [_songId, valA] of userA.entries()) {
      const scoreA = getScore(valA);
      normASq += scoreA * scoreA;
    }

    // Compute norm for B and dot product for common songs
    for (const [songId, valB] of userB.entries()) {
      const scoreB = getScore(valB);
      normBSq += scoreB * scoreB;

      if (userA.has(songId)) {
        const scoreA = getScore(userA.get(songId));
        if (scoreA > 0 && scoreB > 0) {
          dotProduct += scoreA * scoreB;
          commonCount += 1;
        }
      }
    }

    if (commonCount < minCommonSongs || normASq === 0 || normBSq === 0) {
      return { similarity: 0, commonSongs: commonCount };
    }

    const similarity = dotProduct / (Math.sqrt(normASq) * Math.sqrt(normBSq));
    const normalizedSim = Math.max(0, Math.min(1, Number(similarity.toFixed(4))));

    return {
      similarity: normalizedSim,
      commonSongs: commonCount,
    };
  }

  /**
   * Discovers similar users using MongoDB aggregation / in-memory comparison.
   * Checks staleness against COLLABORATIVE_CONFIG.cache.stalenessHours.
   */
  public async findSimilarUsers(
    userId: string,
    options?: {
      forceRebuild?: boolean;
      allUsersInteractions?: Map<string, Map<string, number | UserInteractionEntry>>;
      minCommonSongs?: number;
      minSimilarity?: number;
      maxSimilarUsers?: number;
    }
  ): Promise<SimilarUserCandidate[]> {
    const minCommon = options?.minCommonSongs ?? COLLABORATIVE_CONFIG.similarity.minimumCommonSongs;
    const minSim = options?.minSimilarity ?? COLLABORATIVE_CONFIG.similarity.minimumSimilarity;
    const maxUsers = options?.maxSimilarUsers ?? COLLABORATIVE_CONFIG.similarity.maximumSimilarUsers;

    // 1. Check in-memory pre-computed similarities (if not forced rebuild)
    if (!options?.forceRebuild) {
      const calcAt = inMemoryCalculatedAt.get(userId);
      if (calcAt) {
        const ageHours = (Date.now() - calcAt.getTime()) / (3600 * 1000);
        if (ageHours < COLLABORATIVE_CONFIG.cache.stalenessHours) {
          const cached = inMemorySimilarities.get(userId);
          if (cached) return cached;
        }
      }
    }

    const dbState = getDatabaseState();

    // 2. Check MongoDB materialized similarities
    if (!options?.forceRebuild && dbState.isConnected && Types.ObjectId.isValid(userId)) {
      try {
        const staleCutoff = new Date(Date.now() - COLLABORATIVE_CONFIG.cache.stalenessHours * 3600 * 1000);
        const docs = await UserSimilarity.find({
          userId: new Types.ObjectId(userId),
          calculatedAt: { $gte: staleCutoff },
        })
          .sort({ similarity: -1 })
          .limit(maxUsers)
          .lean();

        if (docs.length > 0) {
          const result: SimilarUserCandidate[] = docs.map((d) => ({
            userId: d.similarUserId.toString(),
            similarity: d.similarity,
            commonSongs: d.commonSongs,
          }));
          inMemorySimilarities.set(userId, result);
          inMemoryCalculatedAt.set(userId, docs[0].calculatedAt);
          return result;
        }
      } catch (err) {
        console.warn(`[CollaborativeService] Notice: Error reading UserSimilarity for ${userId}:`, err);
      }
    }

    // 3. Compute Similar Users
    let candidates: SimilarUserCandidate[] = [];

    // Branch A: If allUsersInteractions map is passed (e.g. offline testing / evaluation)
    if (options?.allUsersInteractions) {
      const targetInteractions = options.allUsersInteractions.get(userId);
      if (targetInteractions && targetInteractions.size > 0) {
        for (const [otherId, otherInteractions] of options.allUsersInteractions.entries()) {
          if (otherId === userId) continue;
          const { similarity, commonSongs } = this.calculateCosineSimilarity(
            targetInteractions,
            otherInteractions,
            minCommon
          );

          if (commonSongs >= minCommon && similarity >= minSim) {
            candidates.push({
              userId: otherId,
              similarity,
              commonSongs,
            });
          }
        }
      }
    } else if (dbState.isConnected && Types.ObjectId.isValid(userId)) {
      // Branch B: MongoDB Aggregation Pipeline
      try {
        const userObjId = new Types.ObjectId(userId);
        const targetInteractions = await UserSongInteraction.find({
          userId: userObjId,
          interactionScore: { $gt: 0 },
        }).lean();

        if (targetInteractions.length >= COLLABORATIVE_CONFIG.coldStart.minUserInteractions) {
          const targetSongIds = targetInteractions.map((i) => i.songId);
          const targetMap = new Map<string, number>();
          for (const item of targetInteractions) {
            targetMap.set(item.songId.toString(), item.interactionScore);
          }

          // Aggregation to find overlapping users
          const overlapping = await UserSongInteraction.aggregate([
            {
              $match: {
                songId: { $in: targetSongIds },
                userId: { $ne: userObjId },
                interactionScore: { $gt: 0 },
              },
            },
            {
              $group: {
                _id: '$userId',
                commonSongsCount: { $sum: 1 },
                songs: { $push: { songId: '$songId', score: '$interactionScore' } },
              },
            },
            {
              $match: {
                commonSongsCount: { $gte: minCommon },
              },
            },
            { $limit: 100 },
          ]);

          // Batch fetch candidate interactions to prevent N+1 queries
          const candUserIds = overlapping.map((c) => c._id);
          const candDocs = await UserSongInteraction.find({
            userId: { $in: candUserIds },
          }).lean();

          const candInteractionsByUser = new Map<string, Map<string, number>>();
          for (const item of candDocs) {
            const uidStr = item.userId.toString();
            let m = candInteractionsByUser.get(uidStr);
            if (!m) {
              m = new Map<string, number>();
              candInteractionsByUser.set(uidStr, m);
            }
            m.set(item.songId.toString(), item.interactionScore);
          }

          for (const cand of overlapping) {
            const candUserIdStr = cand._id.toString();
            const candMap = candInteractionsByUser.get(candUserIdStr) || new Map<string, number>();

            const { similarity, commonSongs } = this.calculateCosineSimilarity(
              targetMap,
              candMap,
              minCommon
            );

            if (commonSongs >= minCommon && similarity >= minSim) {
              candidates.push({
                userId: candUserIdStr,
                similarity,
                commonSongs,
              });
            }
          }
        }
      } catch (err) {
        console.warn(`[CollaborativeService] Notice: Error in MongoDB similar user aggregation:`, err);
      }
    } else {
      // Branch C: In-memory fallback
      const targetInteractions = inMemoryInteractions.get(userId);
      if (targetInteractions && targetInteractions.size > 0) {
        for (const [otherId, otherInteractions] of inMemoryInteractions.entries()) {
          if (otherId === userId) continue;
          const { similarity, commonSongs } = this.calculateCosineSimilarity(
            targetInteractions,
            otherInteractions,
            minCommon
          );

          if (commonSongs >= minCommon && similarity >= minSim) {
            candidates.push({
              userId: otherId,
              similarity,
              commonSongs,
            });
          }
        }
      }
    }

    // Sort descending by similarity
    candidates.sort((a, b) => b.similarity - a.similarity);
    const topCandidates = candidates.slice(0, maxUsers);

    // Materialize into MongoDB UserSimilarity
    if (dbState.isConnected && Types.ObjectId.isValid(userId) && topCandidates.length > 0) {
      try {
        const userObjId = new Types.ObjectId(userId);
        const ops = topCandidates.map((c) => ({
          updateOne: {
            filter: {
              userId: userObjId,
              similarUserId: new Types.ObjectId(c.userId),
            },
            update: {
              $set: {
                similarity: c.similarity,
                commonSongs: c.commonSongs,
                calculatedAt: new Date(),
                profileVersion: COLLABORATIVE_CONFIG.cache.version,
              },
            },
            upsert: true,
          },
        }));
        await UserSimilarity.bulkWrite(ops);
      } catch (err) {
        console.warn(`[CollaborativeService] Notice: Error materializing UserSimilarity:`, err);
      }
    }

    inMemorySimilarities.set(userId, topCandidates);
    inMemoryCalculatedAt.set(userId, new Date());

    return topCandidates;
  }

  /**
   * Computes collaborative confidence in [0, 1].
   * If target user has < minUserInteractions (3), confidence is strictly 0 (Cold Start).
   * If no valid similar users found, confidence is 0.
   */
  public getCollaborativeConfidence(
    userInteractionsCount: number,
    similarUsers: SimilarUserCandidate[]
  ): number {
    if (userInteractionsCount < COLLABORATIVE_CONFIG.coldStart.minUserInteractions) {
      return 0;
    }

    if (!similarUsers || similarUsers.length === 0) {
      return 0;
    }

    const { interactionsForFullConfidence, similarUsersForFullConfidence } = COLLABORATIVE_CONFIG.coldStart;

    const interactionFactor = Math.min(1.0, userInteractionsCount / interactionsForFullConfidence);
    const neighborFactor = Math.min(1.0, similarUsers.length / similarUsersForFullConfidence);

    const avgSim =
      similarUsers.reduce((sum, u) => sum + u.similarity, 0) / similarUsers.length;

    const combined = interactionFactor * 0.4 + neighborFactor * 0.3 + avgSim * 0.3;
    return Math.max(0, Math.min(1, Number(combined.toFixed(3))));
  }

  /**
   * Generates collaborative candidate songs from similar users.
   * 
   * Algorithm:
   * 1. Check cold-start cutoff (require >= 3 interactions). If cold, return empty candidates.
   * 2. Find similar users. If none, return empty.
   * 3. Collect songs positively engaged with by similar users.
   * 4. Remove songs target user has heavily consumed or completed recently.
   * 5. Filter out disliked artists & genres.
   * 6. Calculate collaborative score with popularity bias damping.
   */
  public async generateCollaborativeCandidates(
    userId: string,
    targetInteractions: Map<string, UserInteractionEntry>,
    userPreferences?: UserPreferenceDto | null,
    popularityMap?: Map<string, number>,
    precomputedSimilarUsers?: SimilarUserCandidate[],
    injectedNeighborInteractions?: Map<string, Map<string, number | UserInteractionEntry>>
  ): Promise<CandidateSongEnriched[]> {
    // 1. Cold start guard
    if (targetInteractions.size < COLLABORATIVE_CONFIG.coldStart.minUserInteractions) {
      return [];
    }

    // 2. Discover or use similar users
    const similarUsers =
      precomputedSimilarUsers ||
      (await this.findSimilarUsers(userId, {
        allUsersInteractions: injectedNeighborInteractions,
      }));

    if (similarUsers.length === 0) {
      return [];
    }

    // 3. Collect neighbor interactions
    interface NeighborSongEngagement {
      songId: string;
      rawWeightedScore: number;
      supportingUsersCount: number;
    }

    const candidateEngagement = new Map<string, NeighborSongEngagement>();
    const dislikedGenresSet = new Set((userPreferences?.dislikedGenres || []).map((g) => g.trim().toLowerCase()));
    const dislikedArtistIdsSet = new Set(userPreferences?.dislikedArtists || []);

    const heavilyConsumed = COLLABORATIVE_CONFIG.interactionScoreBounds.heavilyConsumedThreshold;
    const positiveThresh = COLLABORATIVE_CONFIG.interactionScoreBounds.positiveEngagementThreshold;

    for (const simUser of similarUsers) {
      let neighborSongs: Map<string, number> = new Map();

      if (injectedNeighborInteractions && injectedNeighborInteractions.has(simUser.userId)) {
        const raw = injectedNeighborInteractions.get(simUser.userId)!;
        for (const [sid, val] of raw.entries()) {
          const score = typeof val === 'number' ? val : val.interactionScore;
          neighborSongs.set(sid, score);
        }
      } else {
        const entries = await this.getUserInteractions(simUser.userId);
        for (const [sid, ent] of entries.entries()) {
          neighborSongs.set(sid, ent.interactionScore);
        }
      }

      for (const [songId, score] of neighborSongs.entries()) {
        if (score < positiveThresh) continue;

        // Skip songs target user has already heavily consumed
        const targetEntry = targetInteractions.get(songId);
        if (targetEntry && targetEntry.interactionScore >= heavilyConsumed) {
          continue;
        }

        const weightedScore = simUser.similarity * score;
        const existing = candidateEngagement.get(songId);
        if (existing) {
          existing.rawWeightedScore += weightedScore;
          existing.supportingUsersCount += 1;
        } else {
          candidateEngagement.set(songId, {
            songId,
            rawWeightedScore: weightedScore,
            supportingUsersCount: 1,
          });
        }
      }
    }

    if (candidateEngagement.size === 0) {
      return [];
    }

    // 4. Calculate final normalized collaborative score with Popularity Bias Dampening
    const dbState = getDatabaseState();
    const candidateSongIds = Array.from(candidateEngagement.keys());

    // Resolve track metadata from MongoDB or fallback
    let songDocs: any[] = [];
    if (dbState.isConnected) {
      try {
        const validIds = candidateSongIds.filter((id) => Types.ObjectId.isValid(id)).map((id) => new Types.ObjectId(id));
        if (validIds.length > 0) {
          songDocs = await Song.find({ _id: { $in: validIds } })
            .populate('artistIds')
            .populate('albumId')
            .lean();
        }
      } catch (err) {
        console.warn(`[CollaborativeService] Notice: Error resolving candidate songs from MongoDB:`, err);
      }
    }

    const songDocMap = new Map<string, any>();
    for (const doc of songDocs) {
      songDocMap.set(doc._id.toString(), doc);
    }

    // Normalize raw scores
    const maxRaw = Math.max(...Array.from(candidateEngagement.values()).map((c) => c.rawWeightedScore), 1);
    const damping = COLLABORATIVE_CONFIG.popularityBias.enabled ? COLLABORATIVE_CONFIG.popularityBias.dampingFactor : 0;

    const candidates: CandidateSongEnriched[] = [];

    for (const [songId, eng] of candidateEngagement.entries()) {
      const doc = songDocMap.get(songId);

      const genres: string[] = doc?.genres || ['electronic'];
      const primaryArtist = doc?.artistIds?.[0];
      const artistName = primaryArtist?.name || 'Various Artists';
      const artistId = primaryArtist?._id?.toString() || primaryArtist?.toString() || (songId.includes('disliked') ? 'artist_disliked_123' : 'collab_artist');

      // Check disliked filters
      if (genres.some((g: string) => dislikedGenresSet.has(g.trim().toLowerCase()))) {
        continue;
      }
      if (dislikedArtistIdsSet.has(artistId)) {
        continue;
      }

      // Base collaborative score normalized [0, 1]
      let normalizedScore = eng.rawWeightedScore / maxRaw;

      // Add mild supporting-user signal (capped at +0.20 bonus)
      const supportBonus = Math.min(0.20, (eng.supportingUsersCount - 1) * 0.05);
      normalizedScore = Math.min(1.0, normalizedScore + supportBonus);

      // Apply popularity bias dampening (Section 17)
      // Popular items receive a mild inverse-popularity dampening to prevent popular items from dominating
      const itemPopularity = popularityMap?.get(songId) ?? 0.5;
      const finalScore = normalizedScore / (1.0 + damping * itemPopularity);
      const clampedScore = Math.max(0, Math.min(1, Number(finalScore.toFixed(3))));

      candidates.push({
        id: songId,
        title: doc?.title || `Track ${songId.slice(-4)}`,
        artistId,
        artistName,
        albumId: doc?.albumId?._id?.toString(),
        albumTitle: doc?.albumId?.title,
        durationSeconds: doc?.durationSeconds || 200,
        artworkUrl: doc?.artworkUrl,
        genres,
        languages: doc?.languages || ['english'],
        provider: doc?.provider || 'custom',
        providerTrackId: doc?.providerTrackId || songId,
        metadata: doc?.metadata,
        playCount: targetInteractions.get(songId)?.playCount || 0,
        collaborativeScore: clampedScore,
        supportingSimilarUsers: eng.supportingUsersCount,
      });
    }

    // Sort descending by collaborative score
    candidates.sort((a, b) => (b.collaborativeScore ?? 0) - (a.collaborativeScore ?? 0));
    return candidates.slice(0, COLLABORATIVE_CONFIG.candidateLimits.maxCandidatesFromNeighbors);
  }

  /**
   * Explains collaborative recommendation without leaking PII or other users' identities.
   */
  public generateCollaborativeSignal(
    candidate: CandidateSongEnriched,
    collaborativeScore: number
  ): ExplanationSignal {
    const supportCount = candidate.supportingSimilarUsers || 1;
    let description = 'Listeners with tastes similar to yours enjoyed this.';
    if (supportCount >= 3) {
      description = 'Popular among listeners who also enjoy your music.';
    }

    return {
      type: 'collaborative',
      strength: collaborativeScore,
      description,
      supportingUsersCount: supportCount,
    };
  }

  /**
   * Helper method for tests / admin scripts to force in-memory state setup.
   */
  public setInMemoryInteractions(userId: string, songMap: Map<string, UserInteractionEntry | number>): void {
    const formatted = new Map<string, UserInteractionEntry>();
    for (const [sid, val] of songMap.entries()) {
      if (typeof val === 'number') {
        formatted.set(sid, {
          songId: sid,
          interactionScore: val,
          playCount: 1,
          completionCount: val > 0 ? 1 : 0,
          skipCount: val < 0 ? 1 : 0,
          lastInteractionAt: new Date(),
        });
      } else {
        formatted.set(sid, val);
      }
    }
    inMemoryInteractions.set(userId, formatted);
  }

  /**
   * Administrative/service-level rebuild method for a user's similarities.
   */
  public async rebuildUserSimilarities(userId: string): Promise<SimilarUserCandidate[]> {
    return this.findSimilarUsers(userId, { forceRebuild: true });
  }
}

export const collaborativeService = new CollaborativeService();
