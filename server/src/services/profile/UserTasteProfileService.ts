import mongoose, { Types } from 'mongoose';
import { ListeningEvent, UserTasteProfile } from '../../models/index.js';
import { TASTE_PROFILE_CONFIG } from '../../config/tasteProfileConfig.js';
import {
  IUserTasteProfile,
  ITasteLayer,
  IGenreTrend,
  IBehaviouralMetrics,
  IContextDistribution,
  UserTasteProfileDto,
} from '../../types/index.js';
import { getDatabaseState } from '../../config/database.js';

export class UserTasteProfileService {
  /**
   * Retrieves or computes the UserTasteProfile for the specified user.
   * Uses cached materialized view if fresh, or builds upon request.
   */
  public async getProfile(userId: string): Promise<UserTasteProfileDto> {
    if (!mongoose.isValidObjectId(userId)) {
      throw new Error('Invalid user ID format');
    }

    const dbState = getDatabaseState();
    if (!dbState.isConnected) {
      // If database is disconnected in degraded mode, return deterministic empty profile
      return this.createEmptyProfileDto(userId);
    }

    let profileDoc = await UserTasteProfile.findOne({ userId: new Types.ObjectId(userId) });
    if (!profileDoc) {
      profileDoc = await this.buildAndSaveProfile(userId);
    }

    return this.toDto(profileDoc);
  }

  /**
   * Rebuilds and updates the UserTasteProfile materialized view from raw ListeningEvents.
   * Deterministic and explainable calculation.
   */
  public async rebuildProfile(userId: string): Promise<UserTasteProfileDto> {
    if (!mongoose.isValidObjectId(userId)) {
      throw new Error('Invalid user ID format');
    }

    const dbState = getDatabaseState();
    if (!dbState.isConnected) {
      const err = new Error('Database is disconnected. Profile cannot be rebuilt in degraded mode.');
      (err as unknown as { status: number }).status = 503;
      throw err;
    }

    const profileDoc = await this.buildAndSaveProfile(userId);
    return this.toDto(profileDoc);
  }

  /**
   * Computes the taste profile using MongoDB Aggregation and saves it to the collection.
   */
  private async buildAndSaveProfile(userId: string): Promise<any> {
    const userObjectId = new Types.ObjectId(userId);

    // 1. Fetch user listening events joined with song metadata via MongoDB Aggregation Pipeline
    const events: any[] = await ListeningEvent.aggregate([
      { $match: { userId: userObjectId } },
      {
        $lookup: {
          from: 'songs',
          localField: 'songId',
          foreignField: '_id',
          as: 'song',
        },
      },
      { $unwind: { path: '$song', preserveNullAndEmptyArrays: true } },
      { $sort: { timestamp: 1 } },
    ]);

    // 2. Cold-start check: If user has 0 events, persist and return clean default profile
    if (!events || events.length === 0) {
      const emptyDoc = await this.saveEmptyProfile(userObjectId);
      return emptyDoc;
    }

    // Reference timestamp for deterministic calculation (uses latest event timestamp or current wall clock)
    const now = Date.now();
    const config = TASTE_PROFILE_CONFIG;

    // 3. Compute Behavioural Metrics
    const totalEvents = events.length;
    let playCount = 0;
    let pauseCount = 0;
    let skipCount = 0;
    let completeCount = 0;
    let totalCompletionSum = 0;
    let totalListeningDuration = 0;

    const uniqueSongSet = new Set<string>();
    const uniqueArtistSet = new Set<string>();

    const timeOfDayCounts: Record<string, number> = {
      morning: 0,
      afternoon: 0,
      evening: 0,
      late_night: 0,
      unknown: 0,
    };

    const dayOfWeekCounts: Record<string, number> = {
      monday: 0,
      tuesday: 0,
      wednesday: 0,
      thursday: 0,
      friday: 0,
      saturday: 0,
      sunday: 0,
      unknown: 0,
    };

    // Accumulators for Long-Term and Recent Layers
    const longTermGenres: Record<string, number> = {};
    const recentGenres: Record<string, number> = {};

    const longTermArtists: Record<string, number> = {};
    const recentArtists: Record<string, number> = {};

    const longTermLanguages: Record<string, number> = {};
    const recentLanguages: Record<string, number> = {};

    // Audio features accumulators
    interface FeatureAccumulator {
      energy: number;
      danceability: number;
      valence: number;
      tempo: number;
      acousticness: number;
      instrumentalness: number;
      weightSum: number;
    }

    const longTermFeatures: FeatureAccumulator = {
      energy: 0,
      danceability: 0,
      valence: 0,
      tempo: 0,
      acousticness: 0,
      instrumentalness: 0,
      weightSum: 0,
    };

    const recentFeatures: FeatureAccumulator = {
      energy: 0,
      danceability: 0,
      valence: 0,
      tempo: 0,
      acousticness: 0,
      instrumentalness: 0,
      weightSum: 0,
    };

    for (const evt of events) {
      const eventType = evt.eventType;
      if (eventType === 'play') playCount++;
      else if (eventType === 'pause') pauseCount++;
      else if (eventType === 'skip') skipCount++;
      else if (eventType === 'complete') completeCount++;

      const completionPct = evt.metadata?.completionPercent ?? 0;
      totalCompletionSum += completionPct;

      const duration = evt.metadata?.durationSeconds ?? evt.metadata?.dwellDurationSeconds ?? 0;
      totalListeningDuration += duration;

      if (evt.songId) uniqueSongSet.add(evt.songId.toString());

      // Context tallies
      const tod = evt.context?.timeOfDay || 'unknown';
      if (tod in timeOfDayCounts) timeOfDayCounts[tod]++;
      else timeOfDayCounts.unknown++;

      const dow = evt.context?.dayOfWeek || 'unknown';
      if (dow in dayOfWeekCounts) dayOfWeekCounts[dow]++;
      else dayOfWeekCounts.unknown++;

      // Event signal weight
      let baseWeight = 0;
      if (eventType === 'complete') {
        baseWeight = config.eventWeights.complete;
      } else if (eventType === 'skip') {
        baseWeight = config.eventWeights.skip;
      } else if (eventType === 'pause') {
        baseWeight = config.eventWeights.pause;
      } else if (eventType === 'play') {
        const ratio = Math.min(1, Math.max(0, completionPct / 100));
        baseWeight = config.eventWeights.play + config.completion.playCompletionScale * ratio;
      }

      // Recency decay factor: e^(-lambda * ageInDays)
      const eventTime = new Date(evt.timestamp || evt.createdAt).getTime();
      const ageDays = Math.max(0, (now - eventTime) / (1000 * 60 * 60 * 24));
      const recencyFactor = Math.exp(-config.recency.decayLambda * ageDays);
      const isRecent = ageDays <= config.windows.recentDays;

      const eventWeight = baseWeight * recencyFactor;

      const song = evt.song;
      if (song) {
        // Accumulate genres
        if (Array.isArray(song.genres)) {
          for (const g of song.genres) {
            const cleanG = g.trim().toLowerCase();
            if (cleanG) {
              longTermGenres[cleanG] = (longTermGenres[cleanG] || 0) + eventWeight;
              if (isRecent) {
                recentGenres[cleanG] = (recentGenres[cleanG] || 0) + eventWeight;
              }
            }
          }
        }

        // Accumulate artists
        if (Array.isArray(song.artistIds)) {
          for (const aId of song.artistIds) {
            const aStr = aId.toString();
            uniqueArtistSet.add(aStr);
            longTermArtists[aStr] = (longTermArtists[aStr] || 0) + eventWeight;
            if (isRecent) {
              recentArtists[aStr] = (recentArtists[aStr] || 0) + eventWeight;
            }
          }
        }

        // Accumulate languages
        if (Array.isArray(song.languages)) {
          for (const lang of song.languages) {
            const cleanL = lang.trim().toLowerCase();
            if (cleanL) {
              longTermLanguages[cleanL] = (longTermLanguages[cleanL] || 0) + eventWeight;
              if (isRecent) {
                recentLanguages[cleanL] = (recentLanguages[cleanL] || 0) + eventWeight;
              }
            }
          }
        }

        // Accumulate audio features (only positive signals contribute to preferred acoustic profile)
        if (song.metadata && eventWeight > 0) {
          const m = song.metadata;
          const posW = eventWeight;

          this.accumulateFeatures(longTermFeatures, m, posW);
          if (isRecent) {
            this.accumulateFeatures(recentFeatures, m, posW);
          }
        }
      }
    }

    // Normalize behavioural statistics
    const skipRate = totalEvents > 0 ? Number((skipCount / totalEvents).toFixed(4)) : 0;
    const completionRate = totalEvents > 0 ? Number((completeCount / totalEvents).toFixed(4)) : 0;
    const averageCompletionPercent =
      totalEvents > 0 ? Number((totalCompletionSum / totalEvents).toFixed(2)) : 0;

    const behaviour: IBehaviouralMetrics = {
      totalEvents,
      playCount,
      pauseCount,
      skipCount,
      completeCount,
      skipRate,
      completionRate,
      averageCompletionPercent,
      totalListeningDurationSeconds: Math.round(totalListeningDuration),
    };

    // Normalize context distributions (sum = 1.0)
    const context: IContextDistribution = {
      timeOfDay: this.normalizeDistribution(timeOfDayCounts, totalEvents),
      dayOfWeek: this.normalizeDistribution(dayOfWeekCounts, totalEvents),
    };

    // Normalize taste layers
    const longTermLayer: ITasteLayer = {
      genres: this.normalizeAffinities(longTermGenres, config.limits.topGenres),
      artists: this.normalizeArtistAffinities(longTermArtists, config.limits.topArtists),
      languages: this.normalizeLanguageAffinities(longTermLanguages, config.limits.topLanguages),
      audioFeatures: this.finalizeFeatures(longTermFeatures),
    };

    const recentLayer: ITasteLayer = {
      genres: this.normalizeAffinities(recentGenres, config.limits.topGenres),
      artists: this.normalizeArtistAffinities(recentArtists, config.limits.topArtists),
      languages: this.normalizeLanguageAffinities(recentLanguages, config.limits.topLanguages),
      audioFeatures: this.finalizeFeatures(recentFeatures),
    };

    // Compute Genre Trends: delta = recentAffinity - longTermAffinity
    const trends = this.computeTrends(longTermLayer.genres, recentLayer.genres);

    // Compute explainable Profile Confidence [0.0 - 1.0]
    const eventFactor = Math.min(1.0, totalEvents / config.confidence.minEventsForFull);
    const songFactor = Math.min(1.0, uniqueSongSet.size / config.confidence.minUniqueSongsForFull);
    const completeFactor = Math.min(1.0, completeCount / config.confidence.minCompletedForFull);
    const profileConfidence = Number(
      (eventFactor * 0.4 + songFactor * 0.4 + completeFactor * 0.2).toFixed(2)
    );

    // Save Materialized View into MongoDB
    const updatedDoc = await UserTasteProfile.findOneAndUpdate(
      { userId: userObjectId },
      {
        userId: userObjectId,
        profileVersion: config.profileVersion,
        profileConfidence,
        longTerm: longTermLayer,
        recent: recentLayer,
        trends: { genres: trends },
        behaviour,
        context,
        metadata: {
          calculatedAt: new Date(now),
          eventCountUsed: totalEvents,
          uniqueSongsCount: uniqueSongSet.size,
          uniqueArtistsCount: uniqueArtistSet.size,
          recentWindowDays: config.windows.recentDays,
        },
      },
      { upsert: true, new: true }
    );

    return updatedDoc;
  }

  private accumulateFeatures(acc: any, meta: any, weight: number): void {
    if (typeof meta.energy === 'number') acc.energy += meta.energy * weight;
    if (typeof meta.danceability === 'number') acc.danceability += meta.danceability * weight;
    if (typeof meta.valence === 'number') acc.valence += meta.valence * weight;
    if (typeof meta.tempo === 'number') acc.tempo += meta.tempo * weight;
    if (typeof meta.acousticness === 'number') acc.acousticness += meta.acousticness * weight;
    if (typeof meta.instrumentalness === 'number') acc.instrumentalness += meta.instrumentalness * weight;
    acc.weightSum += weight;
  }

  private finalizeFeatures(acc: any): Partial<IUserTasteProfile['longTerm']['audioFeatures']> {
    if (acc.weightSum <= 0) return {};
    const w = acc.weightSum;
    return {
      energy: Number((acc.energy / w).toFixed(4)),
      danceability: Number((acc.danceability / w).toFixed(4)),
      valence: Number((acc.valence / w).toFixed(4)),
      tempo: Number((acc.tempo / w).toFixed(1)),
      acousticness: Number((acc.acousticness / w).toFixed(4)),
      instrumentalness: Number((acc.instrumentalness / w).toFixed(4)),
    };
  }

  private normalizeDistribution(counts: Record<string, number>, total: number): any {
    const res: Record<string, number> = {};
    for (const [k, v] of Object.entries(counts)) {
      res[k] = total > 0 ? Number((v / total).toFixed(4)) : 0;
    }
    return res;
  }

  /**
   * Normalizes category score accumulators: clamps negatives to 0, divides by max to scale [0, 1].
   */
  private normalizeAffinities(
    scores: Record<string, number>,
    limit: number
  ): Array<{ genre: string; score: number }> {
    const validEntries = Object.entries(scores)
      .map(([k, val]) => ({ key: k, score: Math.max(0, val) }))
      .filter((e) => e.score > 0);

    if (validEntries.length === 0) return [];

    const maxScore = Math.max(...validEntries.map((e) => e.score));
    if (maxScore <= 0) return [];

    validEntries.sort((a, b) => b.score - a.score);

    return validEntries.slice(0, limit).map((e) => ({
      genre: e.key,
      score: Number((e.score / maxScore).toFixed(4)),
    }));
  }

  /**
   * Normalizes artist score accumulators.
   */
  private normalizeArtistAffinities(
    scores: Record<string, number>,
    limit: number
  ): Array<{ artistId: Types.ObjectId; score: number }> {
    const validEntries = Object.entries(scores)
      .map(([aId, val]) => ({ aId, score: Math.max(0, val) }))
      .filter((e) => e.score > 0);

    if (validEntries.length === 0) return [];

    const maxScore = Math.max(...validEntries.map((e) => e.score));
    if (maxScore <= 0) return [];

    validEntries.sort((a, b) => b.score - a.score);

    return validEntries.slice(0, limit).map((e) => ({
      artistId: new Types.ObjectId(e.aId),
      score: Number((e.score / maxScore).toFixed(4)),
    }));
  }

  /**
   * Normalizes language score accumulators.
   */
  private normalizeLanguageAffinities(
    scores: Record<string, number>,
    limit: number
  ): Array<{ language: string; score: number }> {
    const validEntries = Object.entries(scores)
      .map(([lang, val]) => ({ language: lang, score: Math.max(0, val) }))
      .filter((e) => e.score > 0);

    if (validEntries.length === 0) return [];

    const maxScore = Math.max(...validEntries.map((e) => e.score));
    if (maxScore <= 0) return [];

    validEntries.sort((a, b) => b.score - a.score);

    return validEntries.slice(0, limit).map((e) => ({
      language: e.language,
      score: Number((e.score / maxScore).toFixed(4)),
    }));
  }

  /**
   * Computes delta = recentScore - longTermScore for genres.
   */
  private computeTrends(
    longTerm: Array<{ genre: string; score: number }>,
    recent: Array<{ genre: string; score: number }>
  ): IGenreTrend[] {
    const ltMap = new Map<string, number>(longTerm.map((g) => [g.genre, g.score]));
    const rcMap = new Map<string, number>(recent.map((g) => [g.genre, g.score]));

    const allGenres = new Set<string>([...ltMap.keys(), ...rcMap.keys()]);
    const trends: IGenreTrend[] = [];

    const config = TASTE_PROFILE_CONFIG.trends;

    for (const g of allGenres) {
      const ltScore = ltMap.get(g) || 0;
      const rcScore = rcMap.get(g) || 0;
      const delta = Number((rcScore - ltScore).toFixed(4));

      let direction: 'rising' | 'declining' | 'stable' = 'stable';
      if (delta > config.risingThreshold) direction = 'rising';
      else if (delta < config.decliningThreshold) direction = 'declining';

      trends.push({ genre: g, delta, direction });
    }

    // Sort by largest absolute movement first
    trends.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
    return trends.slice(0, 10);
  }

  private async saveEmptyProfile(userId: Types.ObjectId): Promise<IUserTasteProfile> {
    const emptyDoc = await UserTasteProfile.findOneAndUpdate(
      { userId },
      {
        userId,
        profileVersion: TASTE_PROFILE_CONFIG.profileVersion,
        profileConfidence: 0,
        longTerm: { genres: [], artists: [], languages: [], audioFeatures: {} },
        recent: { genres: [], artists: [], languages: [], audioFeatures: {} },
        trends: { genres: [] },
        behaviour: {
          totalEvents: 0,
          playCount: 0,
          pauseCount: 0,
          skipCount: 0,
          completeCount: 0,
          skipRate: 0,
          completionRate: 0,
          averageCompletionPercent: 0,
          totalListeningDurationSeconds: 0,
        },
        context: {
          timeOfDay: { morning: 0, afternoon: 0, evening: 0, late_night: 0, unknown: 0 },
          dayOfWeek: {
            monday: 0,
            tuesday: 0,
            wednesday: 0,
            thursday: 0,
            friday: 0,
            saturday: 0,
            sunday: 0,
            unknown: 0,
          },
        },
        metadata: {
          calculatedAt: new Date(),
          eventCountUsed: 0,
          uniqueSongsCount: 0,
          uniqueArtistsCount: 0,
          recentWindowDays: TASTE_PROFILE_CONFIG.windows.recentDays,
        },
      },
      { upsert: true, new: true }
    );
    return emptyDoc;
  }

  private createEmptyProfileDto(userId: string): UserTasteProfileDto {
    return {
      userId,
      profileVersion: TASTE_PROFILE_CONFIG.profileVersion,
      profileConfidence: 0,
      longTerm: { genres: [], artists: [], languages: [], audioFeatures: {} },
      recent: { genres: [], artists: [], languages: [], audioFeatures: {} },
      trends: { genres: [] },
      behaviour: {
        totalEvents: 0,
        playCount: 0,
        pauseCount: 0,
        skipCount: 0,
        completeCount: 0,
        skipRate: 0,
        completionRate: 0,
        averageCompletionPercent: 0,
        totalListeningDurationSeconds: 0,
      },
      context: {
        timeOfDay: { morning: 0, afternoon: 0, evening: 0, late_night: 0, unknown: 0 },
        dayOfWeek: {
          monday: 0,
          tuesday: 0,
          wednesday: 0,
          thursday: 0,
          friday: 0,
          saturday: 0,
          sunday: 0,
          unknown: 0,
        },
      },
      metadata: {
        calculatedAt: new Date().toISOString(),
        eventCountUsed: 0,
        uniqueSongsCount: 0,
        uniqueArtistsCount: 0,
        recentWindowDays: TASTE_PROFILE_CONFIG.windows.recentDays,
      },
    };
  }

  /**
   * Maps internal Mongoose document to clean, client-facing UserTasteProfileDto.
   */
  public toDto(doc: any): UserTasteProfileDto {
    return {
      userId: doc.userId.toString(),
      profileVersion: doc.profileVersion || 1,
      profileConfidence: doc.profileConfidence || 0,
      longTerm: {
        genres: doc.longTerm?.genres || [],
        artists: (doc.longTerm?.artists || []).map((a: any) => ({
          artistId: a.artistId.toString(),
          score: a.score,
        })),
        languages: (doc.longTerm?.languages || []).map((l: any) => ({
          language: l.language || l.genre,
          score: l.score,
        })),
        audioFeatures: doc.longTerm?.audioFeatures || {},
      },
      recent: {
        genres: doc.recent?.genres || [],
        artists: (doc.recent?.artists || []).map((a: any) => ({
          artistId: a.artistId.toString(),
          score: a.score,
        })),
        languages: (doc.recent?.languages || []).map((l: any) => ({
          language: l.language || l.genre,
          score: l.score,
        })),
        audioFeatures: doc.recent?.audioFeatures || {},
      },
      trends: {
        genres: doc.trends?.genres || [],
      },
      behaviour: doc.behaviour || {
        totalEvents: 0,
        playCount: 0,
        pauseCount: 0,
        skipCount: 0,
        completeCount: 0,
        skipRate: 0,
        completionRate: 0,
        averageCompletionPercent: 0,
        totalListeningDurationSeconds: 0,
      },
      context: doc.context || {
        timeOfDay: { morning: 0, afternoon: 0, evening: 0, late_night: 0, unknown: 0 },
        dayOfWeek: {
          monday: 0,
          tuesday: 0,
          wednesday: 0,
          thursday: 0,
          friday: 0,
          saturday: 0,
          sunday: 0,
          unknown: 0,
        },
      },
      metadata: {
        calculatedAt: doc.metadata?.calculatedAt
          ? new Date(doc.metadata.calculatedAt).toISOString()
          : new Date().toISOString(),
        eventCountUsed: doc.metadata?.eventCountUsed || 0,
        uniqueSongsCount: doc.metadata?.uniqueSongsCount || 0,
        uniqueArtistsCount: doc.metadata?.uniqueArtistsCount || 0,
        recentWindowDays: doc.metadata?.recentWindowDays || 30,
      },
    };
  }
}

export const userTasteProfileService = new UserTasteProfileService();
