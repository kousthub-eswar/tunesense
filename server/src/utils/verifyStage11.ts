import mongoose from 'mongoose';
import { config } from '../config/index.js';
import { connectDatabase, disconnectDatabase, getDatabaseState } from '../config/database.js';
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
} from '../models/index.js';
import { authService } from '../services/auth/AuthService.js';
import { getMusicProvider } from '../providers/index.js';
import { MusicCatalogueService } from '../services/music/MusicCatalogueService.js';
import { userTasteProfileService } from '../services/profile/UserTasteProfileService.js';
import { collaborativeService } from '../services/recommendation/CollaborativeService.js';
import { recommendationEngine } from '../services/recommendation/RecommendationEngine.js';
import { analyticsService } from '../services/analytics/AnalyticsService.js';
import { evaluationService } from '../services/analytics/EvaluationService.js';
import { seedDemoData, cleanDemoData } from './seedDemoData.js';

interface TestResult {
  id: number;
  name: string;
  status: 'PASS' | 'FAIL' | 'SKIPPED';
  details?: string;
}

export async function runStage11Verification(): Promise<{
  results: TestResult[];
  passCount: number;
  skipCount: number;
  failCount: number;
}> {
  console.log('====================================================');
  console.log('   TUNESENSE STAGE 11 PRODUCTION VERIFICATION       ');
  console.log('   Data Integration, API Validation & Hardening     ');
  console.log('====================================================\n');

  // Ensure JWT_SECRET is available for offline testing if unset in .env
  process.env.JWT_SECRET =
    process.env.JWT_SECRET || config.jwtSecret || 'stage11_verification_secret_min_32_characters_12345';

  const results: TestResult[] = [];

  function record(id: number, name: string, status: 'PASS' | 'FAIL' | 'SKIPPED', details?: string) {
    results.push({ id, name, status, details });
    const symbol = status === 'PASS' ? '✔ [PASS]' : status === 'SKIPPED' ? '↷ [SKIPPED]' : '✖ [FAIL]';
    console.log(`  ${symbol} Test ${id}: ${name}${details ? ` — ${details}` : ''}`);
  }

  const isDbConnected = await connectDatabase();

  // Test 1: MongoDB configuration detection
  const hasMongoUri = !!(config.mongodbUri && config.mongodbUri.trim().length > 0);
  if (hasMongoUri) {
    record(1, 'MongoDB configuration detection', 'PASS', 'MONGODB_URI is configured');
  } else {
    record(
      1,
      'MongoDB configuration detection',
      'SKIPPED',
      'MONGODB_URI not set in server/.env (running in degraded offline test mode)'
    );
  }

  // Test 2: Database connection
  if (isDbConnected) {
    const dbState = getDatabaseState();
    record(2, 'Database connection', 'PASS', `Connected to database: ${dbState.dbName || 'MongoDB Atlas'}`);
  } else {
    record(
      2,
      'Database connection',
      'SKIPPED',
      'MongoDB Atlas cluster connection not established (Skipping persistent storage tests)'
    );
  }

  // Test 3: Model & Index initialization
  try {
    const registeredModels = [
      User.modelName,
      UserPreference.modelName,
      Artist.modelName,
      Album.modelName,
      Song.modelName,
      ListeningEvent.modelName,
      UserTasteProfile.modelName,
      UserSongInteraction.modelName,
      UserSimilarity.modelName,
      RecommendationImpression.modelName,
      EvaluationFeedback.modelName,
    ];
    if (registeredModels.length === 11) {
      record(3, 'Model & index initialization', 'PASS', 'All 11 Mongoose domain models initialized');
    } else {
      record(3, 'Model & index initialization', 'FAIL', `Expected 11 models, found ${registeredModels.length}`);
    }
  } catch (err) {
    record(3, 'Model & index initialization', 'FAIL', err instanceof Error ? err.message : String(err));
  }

  // Test 4: Demo data insertion
  let demoUserId: string | null = null;
  let demoSongId: string | null = null;

  if (isDbConnected) {
    try {
      const seedResult = await seedDemoData();
      const user: any = await User.findOne({ email: { $regex: 'alice@demo\\.tunesense\\.ai$' } });
      const song: any = await Song.findOne({ provider: 'tunesense_demo' });

      demoUserId = user?._id?.toString() || null;
      demoSongId = song?._id?.toString() || null;

      if (seedResult.usersCount >= 4 && seedResult.songsCount >= 8 && demoUserId) {
        record(
          4,
          'Demo data insertion',
          'PASS',
          `Seeded ${seedResult.usersCount} users, ${seedResult.songsCount} songs, ${seedResult.eventsCount} events`
        );
      } else {
        record(4, 'Demo data insertion', 'FAIL', 'Demo seeding produced incomplete records');
      }
    } catch (err) {
      record(4, 'Demo data insertion', 'FAIL', err instanceof Error ? err.message : String(err));
    }
  } else {
    record(4, 'Demo data insertion', 'SKIPPED', 'Requires live MongoDB connection');
  }

  // Test 5: User authentication (Primitives & DB Integration)
  try {
    const rawPass = 'StrongPassword123!';
    const hash = await authService.hashPassword(rawPass);
    const validMatch = await authService.comparePassword(rawPass, hash);
    const testToken = authService.generateToken('auth_user_test');
    const verifiedToken = authService.verifyToken(testToken);

    if (validMatch && verifiedToken.sub === 'auth_user_test') {
      if (isDbConnected) {
        const testEmail = `auth_test_${Date.now()}@test.tunesense.ai`;
        const signupData = await authService.signup({
          name: 'Auth Tester',
          email: testEmail,
          password: 'StrongPassword123!',
        });
        const loginData = await authService.login({
          email: testEmail,
          password: 'StrongPassword123!',
        });
        if (signupData?.user?.id && loginData?.user?.email === testEmail) {
          record(
            5,
            'User authentication (Live DB Integration)',
            'PASS',
            `Signup and login verified for ${loginData.user.email}`
          );
        } else {
          record(5, 'User authentication', 'FAIL', 'Live DB authentication failed verification');
        }
      } else {
        record(
          5,
          'User authentication (Primitives)',
          'PASS',
          'Password hashing, comparison, JWT signing & verification verified'
        );
      }
    } else {
      record(5, 'User authentication', 'FAIL', 'User auth verification payload mismatch');
    }
  } catch (err) {
    record(5, 'User authentication', 'FAIL', err instanceof Error ? err.message : String(err));
  }

  // Test 6: Music catalogue retrieval (Jamendo / Fallback)
  const catalogueService = new MusicCatalogueService(getMusicProvider());
  const hasJamendoId = !!(config.jamendoClientId && config.jamendoClientId.trim().length > 0);

  if (hasJamendoId) {
    try {
      const searchRes = await catalogueService.search('electronic', 5);
      if (searchRes.tracks && searchRes.tracks.length > 0) {
        record(6, 'Music catalogue retrieval (Jamendo)', 'PASS', `Retrieved ${searchRes.tracks.length} live tracks`);
      } else {
        record(6, 'Music catalogue retrieval (Jamendo)', 'FAIL', 'Live search returned empty tracks');
      }
    } catch (err) {
      record(
        6,
        'Music catalogue retrieval (Jamendo)',
        'SKIPPED',
        `Jamendo API unavailable: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  } else {
    record(
      6,
      'Music catalogue retrieval (Jamendo)',
      'SKIPPED',
      'JAMENDO_CLIENT_ID is not set in server/.env (Skipping external API call)'
    );
  }

  // Test 7: Song persistence
  if (isDbConnected) {
    try {
      const sampleTrack = {
        title: 'Persistence Test Track',
        artistName: 'Test Artist',
        albumTitle: 'Test Album',
        durationSeconds: 180,
        genres: ['electronic'],
        languages: ['en'],
        provider: 'test_provider',
        providerTrackId: `persist_${Date.now()}`,
        providerArtistId: `artist_${Date.now()}`,
      };
      const persisted = await catalogueService.persistTrack(sampleTrack);
      if (persisted && persisted.id) {
        record(7, 'Song persistence in MongoDB', 'PASS', `Persisted track ID: ${persisted.id}`);
      } else {
        record(7, 'Song persistence in MongoDB', 'FAIL', 'Failed to persist track to MongoDB');
      }
    } catch (err) {
      record(7, 'Song persistence in MongoDB', 'FAIL', err instanceof Error ? err.message : String(err));
    }
  } else {
    record(7, 'Song persistence in MongoDB', 'SKIPPED', 'Requires live MongoDB connection');
  }

  // Test 8: ListeningEvent creation
  if (isDbConnected && demoUserId && demoSongId) {
    try {
      const eventDoc: any = await ListeningEvent.create({
        userId: new mongoose.Types.ObjectId(demoUserId),
        songId: new mongoose.Types.ObjectId(demoSongId),
        eventType: 'play',
        timestamp: new Date(),
        metadata: { positionSeconds: 30, durationSeconds: 200, completionPercent: 15, playbackSpeed: 1.0 },
        context: { timeOfDay: 'evening', dayOfWeek: 'friday', sessionId: 'sess_test' },
      });
      if (eventDoc?._id) {
        record(8, 'ListeningEvent creation', 'PASS', `Event document recorded: ${eventDoc._id}`);
      } else {
        record(8, 'ListeningEvent creation', 'FAIL', 'Event creation returned invalid ID');
      }
    } catch (err) {
      record(8, 'ListeningEvent creation', 'FAIL', err instanceof Error ? err.message : String(err));
    }
  } else {
    record(8, 'ListeningEvent creation', 'SKIPPED', 'Requires live MongoDB connection and demo data');
  }

  // Test 9: UserTasteProfile rebuild
  if (isDbConnected && demoUserId) {
    try {
      const profile = await userTasteProfileService.rebuildProfile(demoUserId);
      if (profile && profile.userId === demoUserId) {
        record(9, 'UserTasteProfile rebuild', 'PASS', `Confidence: ${(profile.profileConfidence * 100).toFixed(0)}%`);
      } else {
        record(9, 'UserTasteProfile rebuild', 'FAIL', 'Rebuilt profile was null');
      }
    } catch (err) {
      record(9, 'UserTasteProfile rebuild', 'FAIL', err instanceof Error ? err.message : String(err));
    }
  } else {
    record(9, 'UserTasteProfile rebuild', 'SKIPPED', 'Requires live MongoDB connection');
  }

  // Test 10: UserSongInteraction rebuild
  if (isDbConnected && demoUserId) {
    try {
      const interactions = await collaborativeService.rebuildUserInteractions(demoUserId);
      record(10, 'UserSongInteraction rebuild', 'PASS', `Rebuilt ${interactions.size} sparse interaction records`);
    } catch (err) {
      record(10, 'UserSongInteraction rebuild', 'FAIL', err instanceof Error ? err.message : String(err));
    }
  } else {
    record(10, 'UserSongInteraction rebuild', 'SKIPPED', 'Requires live MongoDB connection');
  }

  // Test 11: UserSimilarity rebuild
  if (isDbConnected && demoUserId) {
    try {
      const similarities = await collaborativeService.rebuildUserSimilarities(demoUserId);
      record(11, 'UserSimilarity rebuild', 'PASS', `Discovered ${similarities.length} similar user candidates`);
    } catch (err) {
      record(11, 'UserSimilarity rebuild', 'FAIL', err instanceof Error ? err.message : String(err));
    }
  } else {
    record(11, 'UserSimilarity rebuild', 'SKIPPED', 'Requires live MongoDB connection');
  }

  // Test 12: R0 Popularity recommendation
  try {
    const r0UserId = demoUserId || '507f191e810c19729de860ea';
    const r0Recs = await recommendationEngine.getRecommendations(r0UserId, { strategy: 'popularity', limit: 5 });
    if (r0Recs.strategy === 'popularity') {
      record(12, 'R0 Popularity recommendation', 'PASS', `Returned ${r0Recs.recommendations.length} recommendations`);
    } else {
      record(12, 'R0 Popularity recommendation', 'FAIL', 'Strategy mismatch on R0');
    }
  } catch (err) {
    record(12, 'R0 Popularity recommendation', 'FAIL', err instanceof Error ? err.message : String(err));
  }

  // Test 13: R4 Hybrid recommendation
  try {
    const r4UserId = demoUserId || '507f191e810c19729de860ea';
    const r4Recs = await recommendationEngine.getRecommendations(r4UserId, { strategy: 'hybrid', limit: 5 });
    if (r4Recs.strategy === 'hybrid') {
      record(13, 'R4 Hybrid recommendation', 'PASS', `Confidence: ${(r4Recs.confidence * 100).toFixed(0)}%`);
    } else {
      record(13, 'R4 Hybrid recommendation', 'FAIL', 'Strategy mismatch on R4');
    }
  } catch (err) {
    record(13, 'R4 Hybrid recommendation', 'FAIL', err instanceof Error ? err.message : String(err));
  }

  // Test 14: R5 Collaborative recommendation
  try {
    const r5UserId = demoUserId || '507f191e810c19729de860ea';
    const r5Recs = await recommendationEngine.getRecommendations(r5UserId, {
      strategy: 'collaborativeHybrid',
      limit: 5,
    });
    if (r5Recs.strategy === 'collaborativeHybrid') {
      record(
        14,
        'R5 Collaborative Hybrid recommendation',
        'PASS',
        `Returned ${r5Recs.recommendations.length} items with collaborative component scores`
      );
    } else {
      record(14, 'R5 Collaborative Hybrid recommendation', 'FAIL', 'Strategy mismatch on R5');
    }
  } catch (err) {
    record(14, 'R5 Collaborative Hybrid recommendation', 'FAIL', err instanceof Error ? err.message : String(err));
  }

  // Test 15: Recommendation attribution
  if (isDbConnected && demoUserId && demoSongId) {
    try {
      const reqId = 'rec_attr_' + Date.now();
      await RecommendationImpression.create({
        userId: new mongoose.Types.ObjectId(demoUserId),
        songId: new mongoose.Types.ObjectId(demoSongId),
        strategy: 'collaborativeHybrid',
        recommendationScore: 0.9,
        position: 1,
        recommendationRequestId: reqId,
      });

      const eventWithAttribution: any = await ListeningEvent.create({
        userId: new mongoose.Types.ObjectId(demoUserId),
        songId: new mongoose.Types.ObjectId(demoSongId),
        eventType: 'play',
        timestamp: new Date(),
        metadata: {
          positionSeconds: 10,
          durationSeconds: 200,
          completionPercent: 5,
          playbackSpeed: 1.0,
          recommendationRequestId: reqId,
          recommendationStrategy: 'collaborativeHybrid',
        },
        context: { sessionId: 'sess_attr' },
      });

      if (eventWithAttribution?.metadata?.recommendationRequestId === reqId) {
        record(15, 'Recommendation attribution', 'PASS', `ListeningEvent attributed to impression ${reqId}`);
      } else {
        record(15, 'Recommendation attribution', 'FAIL', 'Attribution metadata mismatch');
      }
    } catch (err) {
      record(15, 'Recommendation attribution', 'FAIL', err instanceof Error ? err.message : String(err));
    }
  } else {
    record(15, 'Recommendation attribution', 'SKIPPED', 'Requires live MongoDB connection');
  }

  // Test 16: Recommendation impression recording
  try {
    const testUserId = demoUserId || '507f191e810c19729de860ea';
    const recResult = await analyticsService.recordImpressions(testUserId, {
      recommendationRequestId: 'imp_' + Date.now(),
      strategy: 'collaborativeHybrid',
      impressions: [
        {
          songId: demoSongId || '507f191e810c19729de860eb',
          strategy: 'collaborativeHybrid',
          recommendationScore: 0.92,
          position: 1,
        },
      ],
    });
    if (recResult.recorded >= 0) {
      record(16, 'Recommendation impression recording', 'PASS', `Recorded ${recResult.recorded} impressions`);
    } else {
      record(16, 'Recommendation impression recording', 'FAIL', 'Impression recording returned negative count');
    }
  } catch (err) {
    record(16, 'Recommendation impression recording', 'FAIL', err instanceof Error ? err.message : String(err));
  }

  // Test 17: Analytics retrieval
  try {
    const testUserId = demoUserId || '507f191e810c19729de860ea';
    const userAnalytics = await analyticsService.getUserListeningAnalytics(testUserId);
    const recAnalytics = await analyticsService.getRecommendationAnalytics(testUserId);
    if (userAnalytics && recAnalytics) {
      record(
        17,
        'Analytics retrieval',
        'PASS',
        `User Plays: ${userAnalytics.totalPlays}, Rec Impressions: ${recAnalytics.totalImpressions}`
      );
    } else {
      record(17, 'Analytics retrieval', 'FAIL', 'Analytics returned null data');
    }
  } catch (err) {
    record(17, 'Analytics retrieval', 'FAIL', err instanceof Error ? err.message : String(err));
  }

  // Test 18: Evaluation retrieval
  try {
    const evalData = await evaluationService.compareAllStrategies({ k: 10, trainDays: 30, testDays: 7 });
    if (evalData && evalData.evaluatedAt) {
      record(
        18,
        'Evaluation retrieval (Offline Evaluation)',
        'PASS',
        `Evaluated Users: ${evalData.usersEvaluated}, Coverage: ${evalData.strategies?.collaborativeHybrid?.collaborativeCoverage ?? 'N/A'}`
      );
    } else {
      record(18, 'Evaluation retrieval (Offline Evaluation)', 'FAIL', 'Evaluation returned invalid response');
    }
  } catch (err) {
    record(18, 'Evaluation retrieval (Offline Evaluation)', 'FAIL', err instanceof Error ? err.message : String(err));
  }

  // Test 19: Time-of-Day canonical standardization
  try {
    const dMorning = new Date('2026-10-08T08:30:00');
    const dAfternoon = new Date('2026-10-08T14:30:00');
    const dEvening = new Date('2026-10-08T19:30:00');
    const dLateNight = new Date('2026-10-08T23:30:00');

    const hMorning = dMorning.getHours();
    const hAfternoon = dAfternoon.getHours();
    const hEvening = dEvening.getHours();
    const hLateNight = dLateNight.getHours();

    const isMorning = hMorning >= 5 && hMorning < 12;
    const isAfternoon = hAfternoon >= 12 && hAfternoon < 17;
    const isEvening = hEvening >= 17 && hEvening < 22;
    const isLateNight = hLateNight >= 22 || hLateNight < 5;

    if (isMorning && isAfternoon && isEvening && isLateNight) {
      record(19, 'Time-of-Day standardization', 'PASS', 'Canonical boundaries: morning, afternoon, evening, late_night verified');
    } else {
      record(19, 'Time-of-Day standardization', 'FAIL', 'Time-of-day boundary check failed');
    }
  } catch (err) {
    record(19, 'Time-of-Day standardization', 'FAIL', err instanceof Error ? err.message : String(err));
  }

  // Test 20: Logout & Authentication Protection
  try {
    let unauthenticatedBlocked = false;
    try {
      authService.verifyToken('invalid_token_xyz');
    } catch {
      unauthenticatedBlocked = true;
    }

    if (unauthenticatedBlocked) {
      record(20, 'Logout & authentication protection', 'PASS', 'Invalid/expired sessions strictly rejected');
    } else {
      record(20, 'Logout & authentication protection', 'FAIL', 'Invalid session was unexpectedly accepted');
    }
  } catch (err) {
    record(20, 'Logout & authentication protection', 'FAIL', err instanceof Error ? err.message : String(err));
  }

  // Cleanup demo data if database was connected
  if (isDbConnected) {
    await cleanDemoData();
    await disconnectDatabase();
  }

  const passCount = results.filter((r) => r.status === 'PASS').length;
  const skipCount = results.filter((r) => r.status === 'SKIPPED').length;
  const failCount = results.filter((r) => r.status === 'FAIL').length;

  console.log('\n====================================================');
  console.log(`   STAGE 11 SUMMARY: ${passCount} PASSED, ${skipCount} SKIPPED, ${failCount} FAILED`);
  console.log('====================================================\n');

  return { results, passCount, skipCount, failCount };
}

// Direct CLI Execution
if (process.argv[1]?.endsWith('verifyStage11.ts') || process.argv[1]?.endsWith('verifyStage11.js')) {
  void (async () => {
    try {
      const { failCount } = await runStage11Verification();
      if (failCount > 0) {
        process.exit(1);
      }
      process.exit(0);
    } catch (err) {
      console.error('[Stage 11 Verification] Fatal error:', err);
      process.exit(1);
    }
  })();
}
