import { Types } from 'mongoose';
import { Song, ListeningEvent } from '../../models/index.js';
import { IUserTasteProfile, UserPreferenceDto } from '../../types/index.js';
import { CandidateSongEnriched } from './types.js';
import { RECOMMENDATION_CONFIG } from './recommendationConfig.js';
import { MusicCatalogueService } from '../music/MusicCatalogueService.js';
import { getDatabaseState } from '../../config/database.js';
import { collaborativeService } from './CollaborativeService.js';


export class CandidateGenerator {
  constructor(private readonly catalogueService: MusicCatalogueService) {}

  /**
   * Generates, enriches, filters, and deduplicates candidate songs for a user.
   */
  public async generateCandidates(
    userId: string,
    profile: IUserTasteProfile | null,
    userPreferences?: UserPreferenceDto | null
  ): Promise<{
    candidates: CandidateSongEnriched[];
    popularityMap: Map<string, number>;
    userPlayCounts: Map<string, number>;
    collaborativeConfidence: number;
  }> {

    const dbState = getDatabaseState();
    const candidateMap = new Map<string, CandidateSongEnriched>();
    const userPlayCounts = new Map<string, number>();
    const popularityMap = new Map<string, number>();

    // 1. If DB is connected, fetch user recent listening events to compute userPlayCounts & filter recent completions
    const recentlyCompletedSongIds = new Set<string>();

    if (dbState.isConnected && Types.ObjectId.isValid(userId)) {
      try {
        const userObjId = new Types.ObjectId(userId);
        const userEvents = await ListeningEvent.find({ userId: userObjId })
          .sort({ timestamp: -1 })
          .limit(200)
          .lean();

        const cooloffCutoff = new Date(
          Date.now() - RECOMMENDATION_CONFIG.candidateGeneration.recentCompletionCooloffHours * 3600 * 1000
        );

        for (const ev of userEvents) {
          const songIdStr = ev.songId.toString();
          userPlayCounts.set(songIdStr, (userPlayCounts.get(songIdStr) || 0) + 1);

          if (ev.eventType === 'complete' && ev.timestamp >= cooloffCutoff) {
            recentlyCompletedSongIds.add(songIdStr);
          }
        }
      } catch (err) {
        console.warn('[CandidateGenerator] Warning fetching user listening history:', err);
      }
    }

    // 2. Compute Global Catalogue Popularity Map from ListeningEvents
    if (dbState.isConnected) {
      try {
        const { complete, play, pause, skip } = RECOMMENDATION_CONFIG.popularityWeights;

        const popAgg = await ListeningEvent.aggregate([
          {
            $group: {
              _id: '$songId',
              completes: { $sum: { $cond: [{ $eq: ['$eventType', 'complete'] }, 1, 0] } },
              plays: { $sum: { $cond: [{ $eq: ['$eventType', 'play'] }, 1, 0] } },
              pauses: { $sum: { $cond: [{ $eq: ['$eventType', 'pause'] }, 1, 0] } },
              skips: { $sum: { $cond: [{ $eq: ['$eventType', 'skip'] }, 1, 0] } },
            },
          },
          {
            $project: {
              rawScore: {
                $add: [
                  { $multiply: ['$completes', complete] },
                  { $multiply: ['$plays', play] },
                  { $multiply: ['$pauses', pause] },
                  { $multiply: ['$skips', skip] },
                ],
              },
            },
          },
          { $limit: 100 },
        ]);

        if (popAgg.length > 0) {
          const scores = popAgg.map((p) => p.rawScore);
          const maxScore = Math.max(...scores, 1);
          const minScore = Math.min(...scores, 0);
          const range = maxScore - minScore || 1;

          for (const item of popAgg) {
            const normalized = Math.max(0, Math.min(1, (item.rawScore - minScore) / range));
            popularityMap.set(item._id.toString(), normalized);
          }
        }
      } catch (err) {
        console.warn('[CandidateGenerator] Warning aggregating catalogue popularity:', err);
      }
    }

    const dislikedGenresSet = new Set((userPreferences?.dislikedGenres || []).map((g) => g.trim().toLowerCase()));
    const dislikedArtistIdsSet = new Set(userPreferences?.dislikedArtists || []);

    // 3. Retrieve Candidates from MongoDB if available
    if (dbState.isConnected) {

      try {
        const topGenres: string[] = [];
        if (profile?.recent?.genres?.length) {
          topGenres.push(...profile.recent.genres.slice(0, 3).map((g) => g.genre));
        }
        if (profile?.longTerm?.genres?.length) {
          topGenres.push(...profile.longTerm.genres.slice(0, 5).map((g) => g.genre));
        }
        if (userPreferences?.preferredGenres?.length) {
          topGenres.push(...userPreferences.preferredGenres.slice(0, 5));
        }

        const topArtistIds: Types.ObjectId[] = [];
        if (profile?.longTerm?.artists?.length) {
          topArtistIds.push(
            ...profile.longTerm.artists
              .slice(0, 5)
              .map((a) => (typeof a.artistId === 'string' ? new Types.ObjectId(a.artistId) : a.artistId))
              .filter((id) => Types.ObjectId.isValid(id))
          );
        }
        if (userPreferences?.preferredArtists?.length) {
          topArtistIds.push(
            ...userPreferences.preferredArtists
              .slice(0, 5)
              .filter((id) => Types.ObjectId.isValid(id))
              .map((id) => new Types.ObjectId(id))
          );
        }

        // Build targeted query conditions
        const queryConditions: any[] = [];
        if (topGenres.length > 0) {
          queryConditions.push({ genres: { $in: topGenres.map((g) => new RegExp(`^${g}$`, 'i')) } });
        }
        if (topArtistIds.length > 0) {
          queryConditions.push({ artistIds: { $in: topArtistIds } });
        }

        // Execute bulk candidate search
        let candidateDocs: any[] = [];
        if (queryConditions.length > 0) {
          candidateDocs = await Song.find({ $or: queryConditions })
            .populate('artistIds')
            .populate('albumId')
            .limit(RECOMMENDATION_CONFIG.candidateGeneration.maxCandidates)
            .lean();
        }

        // If targeted candidates are insufficient, fetch general popular/recent songs
        if (candidateDocs.length < 15) {
          const generalDocs = await Song.find({})
            .populate('artistIds')
            .populate('albumId')
            .sort({ createdAt: -1 })
            .limit(30)
            .lean();
          candidateDocs.push(...generalDocs);
        }

        if (candidateDocs.length > 0) {
          for (const doc of candidateDocs) {
            const idStr = doc._id.toString();
            // Filter recent completions
            if (recentlyCompletedSongIds.has(idStr)) continue;

            // Filter disliked genres
            if (doc.genres && doc.genres.some((g: string) => dislikedGenresSet.has(g.trim().toLowerCase()))) {
              continue;
            }

            const primaryArtist = Array.isArray(doc.artistIds) && doc.artistIds.length > 0 ? doc.artistIds[0] : null;
            const primaryAlbum = doc.albumId;
            const artistIdStr = primaryArtist ? primaryArtist._id?.toString() || primaryArtist.toString() : undefined;

            // Filter disliked artists
            if (artistIdStr && dislikedArtistIdsSet.has(artistIdStr)) {
              continue;
            }

            const candidate: CandidateSongEnriched = {
              id: idStr,
              title: doc.title,
              artistId: artistIdStr,
              artistName: primaryArtist && primaryArtist.name ? primaryArtist.name : 'Unknown Artist',
              albumId: primaryAlbum ? primaryAlbum._id?.toString() || primaryAlbum.toString() : undefined,
              albumTitle: primaryAlbum && primaryAlbum.title ? primaryAlbum.title : undefined,
              durationSeconds: doc.durationSeconds || 180,
              artworkUrl: doc.artworkUrl,
              genres: doc.genres || [],
              languages: doc.languages || [],
              provider: doc.provider || 'custom',
              providerTrackId: doc.providerTrackId || idStr,
              metadata: doc.metadata,
              playCount: userPlayCounts.get(idStr) || 0,
            };

            candidateMap.set(idStr, candidate);
          }
        }

      } catch (err) {
        console.warn('[CandidateGenerator] Error querying MongoDB candidates:', err);
      }
    }

    // 4. Fallback or augment with Provider Popular tracks (Ensures candidates exist in all modes)
    if (candidateMap.size < 10) {
      try {
        const popularTracks = await this.catalogueService.getPopularTracks(25);
        for (const track of popularTracks) {
          const key = track.id || track.providerTrackId;
          // Filter disliked tracks
          if (track.genres && track.genres.some((g) => dislikedGenresSet.has(g.trim().toLowerCase()))) continue;
          if (track.artistId && dislikedArtistIdsSet.has(track.artistId)) continue;

          if (!candidateMap.has(key)) {
            candidateMap.set(key, {
              id: key,
              title: track.title,
              artistId: track.artistId,
              artistName: track.artistName,
              albumId: track.albumId,
              albumTitle: track.albumTitle,
              durationSeconds: track.durationSeconds,
              artworkUrl: track.artworkUrl,
              streamUrl: track.streamUrl,
              genres: track.genres || [],
              languages: track.languages || [],
              provider: track.provider,
              providerTrackId: track.providerTrackId,
              playCount: userPlayCounts.get(key) || 0,
            });
          }
        }
      } catch (err) {
        console.warn('[CandidateGenerator] Error fetching provider popular tracks:', err);
      }
    }

    // 5. Offline Catalogue Fallback (for offline testing & development when DB and external API are both unconfigured)
    if (candidateMap.size === 0) {
      const OFFLINE_SAMPLE_CATALOGUE: CandidateSongEnriched[] = [
        {
          id: 'offline_track_1',
          title: 'Midnight Resonance',
          artistId: 'offline_artist_1',
          artistName: 'Astral Wave',
          albumTitle: 'Neon Horizon',
          durationSeconds: 214,
          genres: ['electronic', 'ambient', 'chill'],
          languages: ['english'],
          provider: 'custom',
          providerTrackId: 'offline_1',
          metadata: { energy: 0.78, danceability: 0.65, valence: 0.58, tempo: 118 },
        },
        {
          id: 'offline_track_2',
          title: 'Acoustic Horizons',
          artistId: 'offline_artist_2',
          artistName: 'Luna Pulse',
          albumTitle: 'Quiet Strings',
          durationSeconds: 188,
          genres: ['acoustic', 'folk', 'indie'],
          languages: ['english'],
          provider: 'custom',
          providerTrackId: 'offline_2',
          metadata: { energy: 0.42, danceability: 0.50, valence: 0.62, tempo: 92 },
        },
        {
          id: 'offline_track_3',
          title: 'Urban Synthesis',
          artistId: 'offline_artist_3',
          artistName: 'Synthflow',
          albumTitle: 'Retro Metropolis',
          durationSeconds: 245,
          genres: ['lofi', 'chillhop', 'beats'],
          languages: [],
          provider: 'custom',
          providerTrackId: 'offline_3',
          metadata: { energy: 0.52, danceability: 0.72, valence: 0.68, tempo: 85 },
        },
        {
          id: 'offline_track_4',
          title: 'Solar Flare',
          artistId: 'offline_artist_4',
          artistName: 'Kinetic Sound',
          albumTitle: 'High Energy',
          durationSeconds: 195,
          genres: ['rock', 'alternative'],
          languages: ['english'],
          provider: 'custom',
          providerTrackId: 'offline_4',
          metadata: { energy: 0.88, danceability: 0.55, valence: 0.75, tempo: 132 },
        },
        {
          id: 'offline_track_5',
          title: 'Deep Drift',
          artistId: 'offline_artist_5',
          artistName: 'Ethereal Sounds',
          albumTitle: 'Midnight Echoes',
          durationSeconds: 320,
          genres: ['ambient', 'meditation'],
          languages: [],
          provider: 'custom',
          providerTrackId: 'offline_5',
          metadata: { energy: 0.22, danceability: 0.28, valence: 0.40, tempo: 68 },
        },
      ];

      for (const track of OFFLINE_SAMPLE_CATALOGUE) {
        if (track.genres.some((g) => dislikedGenresSet.has(g.trim().toLowerCase()))) continue;
        candidateMap.set(track.id, track);
        popularityMap.set(track.id, 0.75);
      }
    }

    // 6. Augment Candidate Pool with Collaborative Recommendations (Stage 10)
    let collaborativeConfidence = 0;
    try {
      const userInteractions = await collaborativeService.getUserInteractions(userId);
      const similarUsers = await collaborativeService.findSimilarUsers(userId);
      collaborativeConfidence = collaborativeService.getCollaborativeConfidence(
        userInteractions.size,
        similarUsers
      );

      if (collaborativeConfidence > 0) {
        const collabCandidates = await collaborativeService.generateCollaborativeCandidates(
          userId,
          userInteractions,
          userPreferences,
          popularityMap,
          similarUsers
        );

        for (const collabCand of collabCandidates) {
          const existing = candidateMap.get(collabCand.id);
          if (existing) {
            existing.collaborativeScore = collabCand.collaborativeScore;
            existing.supportingSimilarUsers = collabCand.supportingSimilarUsers;
          } else {
            candidateMap.set(collabCand.id, collabCand);
          }
        }
      }
    } catch (err) {
      console.warn('[CandidateGenerator] Notice: Error generating collaborative candidates:', err);
    }

    return {
      candidates: Array.from(candidateMap.values()),
      popularityMap,
      userPlayCounts,
      collaborativeConfidence,
    };
  }
}
