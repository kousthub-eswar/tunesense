import bcrypt from 'bcryptjs';
import {
  User,
  UserPreference,
  Artist,
  Album,
  Song,
  ListeningEvent,
  UserTasteProfile,
  UserSongInteraction,
  UserSimilarity,
  RecommendationImpression,
  EvaluationFeedback,
  UserLibrary,
  Playlist,
} from '../models/index.js';
import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { userTasteProfileService } from '../services/profile/UserTasteProfileService.js';
import { collaborativeService } from '../services/recommendation/CollaborativeService.js';

export const DEMO_NAMESPACE = '@demo.tunesense.ai';

export interface SeedResult {
  usersCount: number;
  artistsCount: number;
  albumsCount: number;
  songsCount: number;
  eventsCount: number;
  profilesCount: number;
  interactionsCount: number;
  similaritiesCount: number;
  impressionsCount: number;
  feedbacksCount: number;
  librariesCount: number;
  playlistsCount: number;
}

/**
 * Removes all demo data created under the @demo.tunesense.ai namespace.
 */
export async function cleanDemoData(): Promise<{ deletedUsers: number; deletedSongs: number }> {
  console.log('[SeedDemoData] Cleaning existing demo dataset...');

  // Find demo users
  const demoUsers: any[] = await User.find({ email: { $regex: `${DEMO_NAMESPACE}$` } });
  const demoUserIds = demoUsers.map((u) => u._id);

  // Find demo songs
  const demoSongs: any[] = await Song.find({ provider: 'tunesense_demo' });
  const demoSongIds = demoSongs.map((s) => s._id);

  // Delete related collections
  await UserSimilarity.deleteMany({
    $or: [{ userId: { $in: demoUserIds } }, { similarUserId: { $in: demoUserIds } }],
  });
  await UserSongInteraction.deleteMany({
    $or: [{ userId: { $in: demoUserIds } }, { songId: { $in: demoSongIds } }],
  });
  await UserTasteProfile.deleteMany({ userId: { $in: demoUserIds } });
  await UserPreference.deleteMany({ userId: { $in: demoUserIds } });
  await ListeningEvent.deleteMany({ userId: { $in: demoUserIds } });
  await RecommendationImpression.deleteMany({ userId: { $in: demoUserIds } });
  await EvaluationFeedback.deleteMany({ userId: { $in: demoUserIds } });
  await UserLibrary.deleteMany({ userId: { $in: demoUserIds } });
  await Playlist.deleteMany({ userId: { $in: demoUserIds } });

  const deletedUsers = await User.deleteMany({ _id: { $in: demoUserIds } });
  const deletedSongs = await Song.deleteMany({ _id: { $in: demoSongIds } });
  await Artist.deleteMany({ 'metadata.isDemo': true });
  await Album.deleteMany({ genres: { $in: ['electronic', 'ambient', 'rock', 'classical'] } });

  console.log(
    `[SeedDemoData] Cleaned: ${deletedUsers.deletedCount} users, ${deletedSongs.deletedCount} songs.`
  );
  return {
    deletedUsers: deletedUsers.deletedCount,
    deletedSongs: deletedSongs.deletedCount,
  };
}

/**
 * Seeds a deterministic demo dataset demonstrating:
 * - Content, behavioural, context, mood, and collaborative recommendations (R0-R5)
 * - Similar users (Alice and Bob) and isolated users (Charlie, Dana)
 * - Disliked genre suppression (Charlie dislikes electronic)
 * - Cold-start user (Dana)
 */
export async function seedDemoData(): Promise<SeedResult> {
  console.log('[SeedDemoData] Starting deterministic demo data seeding...');

  // 1. Clean previous demo records
  await cleanDemoData();

  const passwordHash = await bcrypt.hash('DemoPassword123!', 12);

  // 2. Create Demo Users
  const userA: any = await User.create({
    displayName: 'Alice Parker',
    email: `alice${DEMO_NAMESPACE}`,
    passwordHash,
  });

  const userB: any = await User.create({
    displayName: 'Bob Martinez',
    email: `bob${DEMO_NAMESPACE}`,
    passwordHash,
  });

  const userC: any = await User.create({
    displayName: 'Charlie Vance',
    email: `charlie${DEMO_NAMESPACE}`,
    passwordHash,
  });

  const userD: any = await User.create({
    displayName: 'Dana Sterling',
    email: `dana${DEMO_NAMESPACE}`,
    passwordHash,
  });

  // 3. Create Artists
  const artistNeonWave: any = await Artist.create({
    name: 'Neon Wave',
    imageUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=400&q=80',
    genres: ['electronic', 'ambient', 'synthwave'],
    languages: ['en', 'instrumental'],
    metadata: { isDemo: true, popularityScore: 0.88 },
  });

  const artistSolarEchoes: any = await Artist.create({
    name: 'Solar Echoes',
    imageUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&q=80',
    genres: ['electronic', 'ambient', 'chillout'],
    languages: ['instrumental'],
    metadata: { isDemo: true, popularityScore: 0.82 },
  });

  const artistStoneThunder: any = await Artist.create({
    name: 'Stone Thunder',
    imageUrl: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=400&q=80',
    genres: ['rock', 'hard rock'],
    languages: ['en'],
    metadata: { isDemo: true, popularityScore: 0.75 },
  });

  const artistVelvetStrings: any = await Artist.create({
    name: 'Velvet Strings',
    imageUrl: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=400&q=80',
    genres: ['classical', 'instrumental'],
    languages: ['instrumental'],
    metadata: { isDemo: true, popularityScore: 0.7 },
  });

  // 4. Create UserPreferences
  await UserPreference.create({
    userId: userA._id,
    preferredGenres: ['electronic', 'ambient'],
    preferredArtists: [artistNeonWave._id],
    dislikedGenres: ['screamo'],
    dislikedArtists: [],
    preferredEnergy: 0.75,
    preferredMood: 'energetic',
    favoriteGenres: ['electronic', 'ambient'],
    favoriteArtists: [artistNeonWave._id],
    personalizationSettings: { explorationLevel: 0.5, diversityLevel: 0.7 },
  });

  await UserPreference.create({
    userId: userB._id,
    preferredGenres: ['electronic', 'ambient', 'synthwave'],
    preferredArtists: [artistNeonWave._id, artistSolarEchoes._id],
    dislikedGenres: [],
    dislikedArtists: [],
    preferredEnergy: 0.7,
    preferredMood: 'energetic',
    favoriteGenres: ['electronic', 'ambient'],
    favoriteArtists: [artistNeonWave._id, artistSolarEchoes._id],
    personalizationSettings: { explorationLevel: 0.6, diversityLevel: 0.7 },
  });

  await UserPreference.create({
    userId: userC._id,
    preferredGenres: ['rock'],
    preferredArtists: [artistStoneThunder._id],
    dislikedGenres: ['electronic', 'screamo'],
    dislikedArtists: [],
    preferredEnergy: 0.9,
    preferredMood: 'energetic',
    favoriteGenres: ['rock'],
    favoriteArtists: [artistStoneThunder._id],
    personalizationSettings: { explorationLevel: 0.3, diversityLevel: 0.5 },
  });

  await UserPreference.create({
    userId: userD._id, // Cold start
    preferredGenres: ['classical', 'ambient'],
    preferredArtists: [artistVelvetStrings._id],
    dislikedGenres: [],
    dislikedArtists: [],
    preferredEnergy: 0.3,
    preferredMood: 'calm',
    favoriteGenres: ['classical'],
    favoriteArtists: [artistVelvetStrings._id],
    personalizationSettings: { explorationLevel: 0.5, diversityLevel: 0.5 },
  });

  // 5. Create Albums
  const albumNeonHorizon: any = await Album.create({
    title: 'Neon Horizon',
    artistIds: [artistNeonWave._id],
    artworkUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=400&q=80',
    genres: ['electronic', 'ambient'],
  });

  const albumSolarVistas: any = await Album.create({
    title: 'Solar Vistas',
    artistIds: [artistSolarEchoes._id],
    artworkUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&q=80',
    genres: ['electronic', 'ambient'],
  });

  const albumGranitePeak: any = await Album.create({
    title: 'Granite Peak',
    artistIds: [artistStoneThunder._id],
    artworkUrl: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=400&q=80',
    genres: ['rock'],
  });

  const albumNocturnes: any = await Album.create({
    title: 'Silent Nocturnes',
    artistIds: [artistVelvetStrings._id],
    artworkUrl: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=400&q=80',
    genres: ['classical'],
  });

  // 6. Create Songs
  const song1: any = await Song.create({
    title: 'Cybernetic Glow',
    artistIds: [artistNeonWave._id],
    albumId: albumNeonHorizon._id,
    durationSeconds: 215,
    artworkUrl: albumNeonHorizon.artworkUrl,
    provider: 'tunesense_demo',
    providerTrackId: 'demo_track_1',
    genres: ['electronic', 'ambient'],
    languages: ['en'],
    metadata: {
      tempo: 124,
      energy: 0.82,
      danceability: 0.74,
      valence: 0.68,
      acousticness: 0.15,
      instrumentalness: 0.45,
    },
  });

  const song2: any = await Song.create({
    title: 'Midnight Aurora',
    artistIds: [artistNeonWave._id],
    albumId: albumNeonHorizon._id,
    durationSeconds: 198,
    artworkUrl: albumNeonHorizon.artworkUrl,
    provider: 'tunesense_demo',
    providerTrackId: 'demo_track_2',
    genres: ['ambient', 'electronic'],
    languages: ['instrumental'],
    metadata: {
      tempo: 95,
      energy: 0.42,
      danceability: 0.51,
      valence: 0.58,
      acousticness: 0.48,
      instrumentalness: 0.85,
    },
  });

  const song3: any = await Song.create({
    title: 'Synthesized Dreams',
    artistIds: [artistNeonWave._id],
    albumId: albumNeonHorizon._id,
    durationSeconds: 242,
    artworkUrl: albumNeonHorizon.artworkUrl,
    provider: 'tunesense_demo',
    providerTrackId: 'demo_track_3',
    genres: ['electronic', 'synthwave'],
    languages: ['instrumental'],
    metadata: {
      tempo: 118,
      energy: 0.71,
      danceability: 0.66,
      valence: 0.62,
      acousticness: 0.22,
      instrumentalness: 0.6,
    },
  });

  const song4: any = await Song.create({
    title: 'Starlight Velocity',
    artistIds: [artistSolarEchoes._id],
    albumId: albumSolarVistas._id,
    durationSeconds: 230,
    artworkUrl: albumSolarVistas.artworkUrl,
    provider: 'tunesense_demo',
    providerTrackId: 'demo_track_4',
    genres: ['electronic', 'ambient'],
    languages: ['instrumental'],
    metadata: {
      tempo: 126,
      energy: 0.85,
      danceability: 0.78,
      valence: 0.72,
      acousticness: 0.12,
      instrumentalness: 0.7,
    },
  });

  const song5: any = await Song.create({
    title: 'Lunar Drift',
    artistIds: [artistSolarEchoes._id],
    albumId: albumSolarVistas._id,
    durationSeconds: 260,
    artworkUrl: albumSolarVistas.artworkUrl,
    provider: 'tunesense_demo',
    providerTrackId: 'demo_track_5',
    genres: ['ambient', 'chillout'],
    languages: ['instrumental'],
    metadata: {
      tempo: 80,
      energy: 0.31,
      danceability: 0.42,
      valence: 0.55,
      acousticness: 0.65,
      instrumentalness: 0.9,
    },
  });

  const song6: any = await Song.create({
    title: 'Granite Overdrive',
    artistIds: [artistStoneThunder._id],
    albumId: albumGranitePeak._id,
    durationSeconds: 210,
    artworkUrl: albumGranitePeak.artworkUrl,
    provider: 'tunesense_demo',
    providerTrackId: 'demo_track_6',
    genres: ['rock', 'hard rock'],
    languages: ['en'],
    metadata: {
      tempo: 140,
      energy: 0.96,
      danceability: 0.45,
      valence: 0.5,
      acousticness: 0.05,
      instrumentalness: 0.1,
    },
  });

  const song7: any = await Song.create({
    title: 'Heavy Horizon',
    artistIds: [artistStoneThunder._id],
    albumId: albumGranitePeak._id,
    durationSeconds: 235,
    artworkUrl: albumGranitePeak.artworkUrl,
    provider: 'tunesense_demo',
    providerTrackId: 'demo_track_7',
    genres: ['rock'],
    languages: ['en'],
    metadata: {
      tempo: 132,
      energy: 0.91,
      danceability: 0.45,
      valence: 0.45,
      acousticness: 0.08,
      instrumentalness: 0.15,
    },
  });

  const song8: any = await Song.create({
    title: 'Nocturne in D Minor',
    artistIds: [artistVelvetStrings._id],
    albumId: albumNocturnes._id,
    durationSeconds: 310,
    artworkUrl: albumNocturnes.artworkUrl,
    provider: 'tunesense_demo',
    providerTrackId: 'demo_track_8',
    genres: ['classical', 'instrumental'],
    languages: ['instrumental'],
    metadata: {
      tempo: 68,
      energy: 0.22,
      danceability: 0.3,
      valence: 0.4,
      acousticness: 0.92,
      instrumentalness: 0.95,
    },
  });

  // 7. Create ListeningEvents
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  const eventEntries: any[] = [
    // User A Listening History
    {
      userId: userA._id,
      songId: song1._id,
      eventType: 'complete',
      timestamp: new Date(now - 8 * dayMs),
      metadata: {
        positionSeconds: 215,
        durationSeconds: 215,
        completionPercent: 100,
        playbackSpeed: 1.0,
      },
      context: {
        timeOfDay: 'evening',
        dayOfWeek: 'friday',
        sessionId: 'demo_sess_a1',
      },
    },
    {
      userId: userA._id,
      songId: song2._id,
      eventType: 'complete',
      timestamp: new Date(now - 7 * dayMs),
      metadata: {
        positionSeconds: 198,
        durationSeconds: 198,
        completionPercent: 100,
        playbackSpeed: 1.0,
      },
      context: {
        timeOfDay: 'evening',
        dayOfWeek: 'saturday',
        sessionId: 'demo_sess_a2',
      },
    },
    {
      userId: userA._id,
      songId: song3._id,
      eventType: 'play',
      timestamp: new Date(now - 5 * dayMs),
      metadata: {
        positionSeconds: 120,
        durationSeconds: 242,
        completionPercent: 49.5,
        playbackSpeed: 1.0,
      },
      context: {
        timeOfDay: 'morning',
        dayOfWeek: 'monday',
        sessionId: 'demo_sess_a3',
      },
    },
    {
      userId: userA._id,
      songId: song1._id,
      eventType: 'complete',
      timestamp: new Date(now - 2 * dayMs),
      metadata: {
        positionSeconds: 215,
        durationSeconds: 215,
        completionPercent: 100,
        playbackSpeed: 1.0,
      },
      context: {
        timeOfDay: 'evening',
        dayOfWeek: 'wednesday',
        sessionId: 'demo_sess_a4',
      },
    },

    // User B Listening History
    {
      userId: userB._id,
      songId: song1._id,
      eventType: 'complete',
      timestamp: new Date(now - 9 * dayMs),
      metadata: {
        positionSeconds: 215,
        durationSeconds: 215,
        completionPercent: 100,
        playbackSpeed: 1.0,
      },
      context: {
        timeOfDay: 'evening',
        dayOfWeek: 'thursday',
        sessionId: 'demo_sess_b1',
      },
    },
    {
      userId: userB._id,
      songId: song2._id,
      eventType: 'complete',
      timestamp: new Date(now - 8 * dayMs),
      metadata: {
        positionSeconds: 198,
        durationSeconds: 198,
        completionPercent: 100,
        playbackSpeed: 1.0,
      },
      context: {
        timeOfDay: 'late_night',
        dayOfWeek: 'friday',
        sessionId: 'demo_sess_b2',
      },
    },
    {
      userId: userB._id,
      songId: song4._id,
      eventType: 'complete',
      timestamp: new Date(now - 6 * dayMs),
      metadata: {
        positionSeconds: 230,
        durationSeconds: 230,
        completionPercent: 100,
        playbackSpeed: 1.0,
      },
      context: {
        timeOfDay: 'afternoon',
        dayOfWeek: 'sunday',
        sessionId: 'demo_sess_b3',
      },
    },

    // User C Listening History
    {
      userId: userC._id,
      songId: song6._id,
      eventType: 'complete',
      timestamp: new Date(now - 10 * dayMs),
      metadata: {
        positionSeconds: 210,
        durationSeconds: 210,
        completionPercent: 100,
        playbackSpeed: 1.0,
      },
      context: {
        timeOfDay: 'evening',
        dayOfWeek: 'wednesday',
        sessionId: 'demo_sess_c1',
      },
    },
    {
      userId: userC._id,
      songId: song7._id,
      eventType: 'complete',
      timestamp: new Date(now - 7 * dayMs),
      metadata: {
        positionSeconds: 235,
        durationSeconds: 235,
        completionPercent: 100,
        playbackSpeed: 1.0,
      },
      context: {
        timeOfDay: 'afternoon',
        dayOfWeek: 'saturday',
        sessionId: 'demo_sess_c2',
      },
    },
  ];

  for (const entry of eventEntries) {
    await ListeningEvent.create(entry);
  }

  // 8. Rebuild Derived Materialized Collections
  await userTasteProfileService.rebuildProfile(userA._id.toString());
  await userTasteProfileService.rebuildProfile(userB._id.toString());
  await userTasteProfileService.rebuildProfile(userC._id.toString());

  await collaborativeService.rebuildUserInteractions(userA._id.toString());
  await collaborativeService.rebuildUserInteractions(userB._id.toString());
  await collaborativeService.rebuildUserInteractions(userC._id.toString());

  await collaborativeService.rebuildUserSimilarities(userA._id.toString());
  await collaborativeService.rebuildUserSimilarities(userB._id.toString());
  await collaborativeService.rebuildUserSimilarities(userC._id.toString());

  // 9. Add Sample Recommendation Impression & Feedback
  const sampleReqId = 'demo_req_' + Date.now();
  await RecommendationImpression.create({
    userId: userA._id,
    songId: song4._id,
    strategy: 'collaborativeHybrid',
    recommendationScore: 0.94,
    position: 1,
    mood: 'energetic',
    recommendationRequestId: sampleReqId,
    generatedAt: new Date(now - 1 * dayMs),
  });

  await RecommendationImpression.create({
    userId: userA._id,
    songId: song2._id,
    strategy: 'collaborativeHybrid',
    recommendationScore: 0.88,
    position: 2,
    mood: 'energetic',
    recommendationRequestId: sampleReqId,
    generatedAt: new Date(now - 1 * dayMs),
  });

  await EvaluationFeedback.create({
    userId: userA._id,
    recommendationRequestId: sampleReqId,
    rating: 5,
    feedbackType: 'mood',
    mood: 'energetic',
    songId: song4._id,
  });

  await EvaluationFeedback.create({
    userId: userA._id,
    recommendationRequestId: sampleReqId,
    rating: 5,
    feedbackType: 'explanation',
    explanationText: 'Collaborative recommendations matched my vibe well',
  });

  // 12. Seed User Libraries & Playlists (Stage 12/13 Demo Readiness)
  const playlistAlice: any = await Playlist.create({
    userId: userA._id,
    name: 'Late Night Synthwave',
    description: 'Energetic electronic and synthwave tracks for late-night focus.',
    songIds: [song1._id, song4._id, song5._id],
    coverSongId: song1._id,
    isPublic: true,
  });

  const playlistCharlie: any = await Playlist.create({
    userId: userC._id,
    name: 'Rock Anthems',
    description: 'High energy rock and classic riffs.',
    songIds: [song6._id, song7._id],
    coverSongId: song6._id,
    isPublic: false,
  });

  await UserLibrary.create({
    userId: userA._id,
    likedSongIds: [song1._id, song4._id, song5._id],
    savedPlaylistIds: [playlistAlice._id],
  });

  await UserLibrary.create({
    userId: userB._id,
    likedSongIds: [song1._id, song2._id],
    savedPlaylistIds: [],
  });

  await UserLibrary.create({
    userId: userC._id,
    likedSongIds: [song6._id, song7._id],
    savedPlaylistIds: [playlistCharlie._id],
  });

  await UserLibrary.create({
    userId: userD._id,
    likedSongIds: [],
    savedPlaylistIds: [],
  });

  const interactionsCount = await UserSongInteraction.countDocuments();
  const similaritiesCount = await UserSimilarity.countDocuments();
  const profilesCount = await UserTasteProfile.countDocuments();
  const librariesCount = await UserLibrary.countDocuments();
  const playlistsCount = await Playlist.countDocuments();

  console.log('[SeedDemoData] Demo seeding completed successfully!');
  console.log(`  Users: 4 (Alice, Bob, Charlie, Dana)`);
  console.log(`  Songs: 8 tracks (e.g. ${song1.title}, ${song5.title}, ${song8.title})`);
  console.log(`  Interactions: ${interactionsCount}`);
  console.log(`  Similarities: ${similaritiesCount}`);
  console.log(`  Libraries: ${librariesCount}`);
  console.log(`  Playlists: ${playlistsCount}`);

  return {
    usersCount: 4,
    artistsCount: 4,
    albumsCount: 4,
    songsCount: 8,
    eventsCount: eventEntries.length,
    profilesCount,
    interactionsCount,
    similaritiesCount,
    impressionsCount: 2,
    feedbacksCount: 2,
    librariesCount,
    playlistsCount,
  };
}

// Direct CLI Execution: tsx src/utils/seedDemoData.ts [--clean]
if (process.argv[1]?.endsWith('seedDemoData.ts') || process.argv[1]?.endsWith('seedDemoData.js')) {
  void (async () => {
    try {
      const isConnected = await connectDatabase();
      if (!isConnected) {
        console.error('[SeedDemoData] Cannot seed: MongoDB connection is unavailable.');
        process.exit(1);
      }

      if (process.argv.includes('--clean')) {
        await cleanDemoData();
      } else {
        await seedDemoData();
      }
      await disconnectDatabase();
      process.exit(0);
    } catch (err) {
      console.error('[SeedDemoData] Seeding failed with error:', err);
      process.exit(1);
    }
  })();
}
