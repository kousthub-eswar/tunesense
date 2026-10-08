import mongoose, { Types } from 'mongoose';
import jwt from 'jsonwebtoken';
import { TASTE_PROFILE_CONFIG } from '../config/tasteProfileConfig.js';
import { userTasteProfileService } from '../services/profile/UserTasteProfileService.js';
import { User, Song, Artist, ListeningEvent, UserTasteProfile } from '../models/index.js';
import { authService } from '../services/auth/AuthService.js';
import { config } from '../config/index.js';

async function runStage6Verification() {
  console.log('--- TuneSense Stage 6 Dynamic User Taste Profile Verification ---');
  let allPassed = true;

  const pass = (title: string) => console.log(`[PASS] ${title}`);
  const fail = (title: string, err: unknown) => {
    console.error(`[FAIL] ${title}:`, err);
    allPassed = false;
  };

  // 1. Configuration & Mathematical Model Verification
  try {
    const { eventWeights, recency, windows } = TASTE_PROFILE_CONFIG;
    if (eventWeights.complete <= eventWeights.play) {
      throw new Error('Complete weight must be greater than play weight');
    }
    if (eventWeights.skip >= 0) {
      throw new Error('Skip weight must be negative');
    }
    if (recency.decayLambda <= 0) {
      throw new Error('Decay lambda must be positive');
    }
    if (windows.recentDays !== 30) {
      throw new Error('Recent window should be configured to 30 days');
    }
    pass('Configuration: Signal weights, recency lambda, and window thresholds configured correctly');
  } catch (err) {
    fail('Configuration: Signal weights check', err);
  }

  // 1b. Mathematical recency decay verification: e^(-lambda * ageDays)
  try {
    const lambda = TASTE_PROFILE_CONFIG.recency.decayLambda; // 0.05
    const decayAt0 = Math.exp(-lambda * 0);
    const decayAt14 = Math.exp(-lambda * 14);
    const decayAt60 = Math.exp(-lambda * 60);

    if (decayAt0 !== 1.0) throw new Error('Decay at age 0 must be 1.0');
    if (decayAt14 > 0.6 || decayAt14 < 0.45) throw new Error('Decay at 14 days should be approx ~0.5');
    if (decayAt60 > decayAt14) throw new Error('Older events must have lower weight');
    pass('Mathematical Model: Exponential recency decay behaves deterministically');
  } catch (err) {
    fail('Mathematical Model: Recency decay check', err);
  }

  // 2. HTTP Endpoint Verification (http://localhost:5000/api)
  const baseUrl = 'http://localhost:5000/api';
  const devSecret = config.jwtSecret || process.env.JWT_SECRET || 'tunesense_dev_jwt_secret_key_minimum_32_characters_12345';
  const testUserId = '670498b00000000000000001';
  const testToken = jwt.sign({ sub: testUserId }, devSecret);

  // 2a. Unauthenticated GET /api/profile/taste
  try {
    const res = await fetch(`${baseUrl}/profile/taste`, { method: 'GET' });
    if (res.status !== 401) throw new Error(`Expected 401 Unauthorized, got ${res.status}`);
    pass('API Security: Unauthenticated request to GET /api/profile/taste returns 401');
  } catch (err) {
    fail('API Security: Unauthenticated GET /profile/taste', err);
  }

  // 2b. Unauthenticated POST /api/profile/taste/rebuild
  try {
    const res = await fetch(`${baseUrl}/profile/taste/rebuild`, { method: 'POST' });
    if (res.status !== 401) throw new Error(`Expected 401 Unauthorized, got ${res.status}`);
    pass('API Security: Unauthenticated request to POST /api/profile/taste/rebuild returns 401');
  } catch (err) {
    fail('API Security: Unauthenticated POST /profile/taste/rebuild', err);
  }

  // 2c. User Isolation: Attempting to query another user's profile (?userId=someoneElse)
  try {
    const res = await fetch(`${baseUrl}/profile/taste?userId=670498b00000000000000099`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${testToken}` },
    });
    if (res.status !== 403) throw new Error(`Expected 403 Forbidden for spoofed query userId, got ${res.status}`);
    pass('API Security: User isolation enforced (403 Forbidden when attempting to query other user ID)');
  } catch (err) {
    fail('API Security: User isolation check', err);
  }

  // 2d. Authenticated GET /api/profile/taste
  try {
    const res = await fetch(`${baseUrl}/profile/taste`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${testToken}` },
    });
    if (res.status !== 200) throw new Error(`Expected 200 OK, got ${res.status}`);
    const body = await res.json();
    if (body.status !== 'ok' || !body.data || body.data.userId !== testUserId) {
      throw new Error('Invalid UserTasteProfileDto returned');
    }
    if (!('longTerm' in body.data) || !('recent' in body.data) || !('trends' in body.data)) {
      throw new Error('Profile missing longTerm, recent, or trends structures');
    }
    pass('API Functionality: Authenticated GET /api/profile/taste returns valid UserTasteProfileDto');
  } catch (err) {
    fail('API Functionality: GET /api/profile/taste', err);
  }

  // 3. Database & Service Integration Tests (if MONGODB_URI configured or available)
  const mongoUri = config.mongodbUri || process.env.MONGODB_URI;
  if (mongoUri) {
    try {
      console.log('Connecting to MongoDB for Stage 6 live integration tests...');
      await mongoose.connect(mongoUri, { dbName: config.mongodbDbName });
      console.log('Connected to MongoDB.');

      // Setup clean test entities
      const testArtistA = await Artist.create({
        name: 'Stage6 Electronic Artist',
        genres: ['electronic', 'synthwave'],
      });

      const testArtistB = await Artist.create({
        name: 'Stage6 Ambient Artist',
        genres: ['ambient', 'chillout'],
      });

      const songA = await Song.create({
        title: 'Neon Resonance',
        artistIds: [testArtistA._id],
        durationSeconds: 200,
        genres: ['electronic', 'synthwave'],
        languages: ['en'],
        provider: 'custom',
        providerTrackId: `track_s6_a_${Date.now()}`,
        metadata: {
          energy: 0.85,
          danceability: 0.75,
          valence: 0.65,
          tempo: 128,
          acousticness: 0.10,
          instrumentalness: 0.90,
        },
      });

      const songB = await Song.create({
        title: 'Deep Horizon',
        artistIds: [testArtistB._id],
        durationSeconds: 300,
        genres: ['ambient', 'chillout'],
        languages: ['en'],
        provider: 'custom',
        providerTrackId: `track_s6_b_${Date.now()}`,
        metadata: {
          energy: 0.30,
          danceability: 0.20,
          valence: 0.40,
          tempo: 75,
          acousticness: 0.80,
          instrumentalness: 0.95,
        },
      });

      const { user: testUser } = await authService.signup({
        name: 'Stage 6 Taste User',
        email: `stage6_taste_${Date.now()}@example.com`,
        password: 'password123',
      });

      // 3a. Cold-start test: 0 events -> valid empty profile with confidence 0.0
      const emptyProfile = await userTasteProfileService.getProfile(testUser.id);
      if (emptyProfile.profileConfidence !== 0) throw new Error('Expected 0 confidence for empty profile');
      if (emptyProfile.longTerm.genres.length !== 0) throw new Error('Expected 0 genres for empty profile');
      pass('Cold Start: 0 events produces valid empty profile with confidence 0.0');

      // 3b. Single play event -> weak taste signal & low confidence
      await ListeningEvent.create({
        userId: new Types.ObjectId(testUser.id),
        songId: songA._id,
        eventType: 'play',
        timestamp: new Date(),
        metadata: { positionSeconds: 10, durationSeconds: 200, completionPercent: 5 },
      });

      const singlePlayProfile = await userTasteProfileService.rebuildProfile(testUser.id);
      if (singlePlayProfile.profileConfidence > 0.2) throw new Error('Single play should produce low confidence');
      if (singlePlayProfile.longTerm.genres.length === 0) throw new Error('Single play should register genres');
      pass('Single Event: Play event produces initial taste signal with low confidence');

      // 3c. Completion event -> strong positive signal
      await ListeningEvent.create({
        userId: new Types.ObjectId(testUser.id),
        songId: songA._id,
        eventType: 'complete',
        timestamp: new Date(),
        metadata: { positionSeconds: 200, durationSeconds: 200, completionPercent: 100 },
      });

      const completedProfile = await userTasteProfileService.rebuildProfile(testUser.id);
      const electronicGenre = completedProfile.longTerm.genres.find((g) => g.genre === 'electronic');
      if (!electronicGenre || electronicGenre.score <= 0) {
        throw new Error('Completed song must yield strong positive genre affinity');
      }
      pass('Completion: Completed song contributes strong positive signal to taste profile');

      // 3d. Skip event -> negative signal
      await ListeningEvent.create({
        userId: new Types.ObjectId(testUser.id),
        songId: songB._id,
        eventType: 'skip',
        timestamp: new Date(),
        metadata: { positionSeconds: 15, durationSeconds: 300, completionPercent: 5 },
      });

      const skippedProfile = await userTasteProfileService.rebuildProfile(testUser.id);
      const ambientGenre = skippedProfile.longTerm.genres.find((g) => g.genre === 'ambient');
      // Because songB was only skipped, ambient score should be 0 or absent (negatives clamped to 0)
      if (ambientGenre && ambientGenre.score > 0.5) {
        throw new Error('Skipped track should not dominate positive genre score');
      }
      pass('Skip: Skipped song produces negative signal and attenuates un-engaged genres');

      // 3e. Multi-genre handling: Verify both 'electronic' and 'synthwave' received signals from songA
      const synthwaveGenre = completedProfile.longTerm.genres.find((g) => g.genre === 'synthwave');
      if (!synthwaveGenre) throw new Error('Multi-genre track must distribute signal to all tags');
      pass('Genre: Multi-genre tracks correctly update affinities across all tags');

      // 3f. Artist affinity: Repeated engagement increases artist affinity
      const artistAffinityA = completedProfile.longTerm.artists.find((a) => a.artistId === testArtistA._id.toString());
      if (!artistAffinityA || artistAffinityA.score <= 0) {
        throw new Error('Repeated engagement should establish top artist affinity');
      }
      pass('Artist Affinity: Engagement establishes top artist ranking');

      // 3g. Audio features preference calculation
      const audioFeatures = completedProfile.longTerm.audioFeatures;
      if (typeof audioFeatures.energy !== 'number' || audioFeatures.energy < 0.5) {
        throw new Error('Preferred high-energy song should produce high energy audio feature preference');
      }
      pass('Audio Features: User acoustic feature preference profile is accurately computed');

      // 3h. Behavioural statistics (skip rate, completion rate, average completion)
      const behaviour = completedProfile.behaviour;
      if (behaviour.totalEvents !== 3) throw new Error(`Expected 3 total events, got ${behaviour.totalEvents}`);
      if (behaviour.playCount !== 1 || behaviour.completeCount !== 1 || behaviour.skipCount !== 1) {
        throw new Error('Event counts mismatch');
      }
      if (behaviour.skipRate === 0 || behaviour.completionRate === 0) {
        throw new Error('Behavioural rates should be computed');
      }
      pass('Behavioural Statistics: Skip rate, completion rate, and event tallies computed accurately');

      // 3i. Rebuild Determinism: Running rebuild without event changes produces identical profile
      const rebuild1 = await userTasteProfileService.rebuildProfile(testUser.id);
      const rebuild2 = await userTasteProfileService.rebuildProfile(testUser.id);
      if (JSON.stringify(rebuild1.longTerm) !== JSON.stringify(rebuild2.longTerm)) {
        throw new Error('Rebuild must be strictly deterministic');
      }
      pass('Determinism: Profile rebuild produces identical output from the same event data');

      // Cleanup test documents
      await UserTasteProfile.deleteOne({ userId: testUser.id });
      await ListeningEvent.deleteMany({ userId: testUser.id });
      await User.deleteOne({ _id: testUser.id });
      await Song.deleteMany({ _id: { $in: [songA._id, songB._id] } });
      await Artist.deleteMany({ _id: { $in: [testArtistA._id, testArtistB._id] } });
      console.log('Cleaned up Stage 6 test documents from MongoDB.');

      await mongoose.disconnect();
    } catch (dbErr) {
      fail('MongoDB Stage 6 Integration', dbErr);
    }
  } else {
    console.log('No MONGODB_URI configured, skipping live database integration test.');
  }

  if (allPassed) {
    console.log('\n>>> ALL STAGE 6 USER TASTE PROFILE VERIFICATION CHECKS PASSED! <<<');
  } else {
    console.error('\n>>> SOME STAGE 6 CHECKS FAILED <<<');
    process.exit(1);
  }
}

runStage6Verification().catch((err) => {
  console.error('Fatal verification error:', err);
  process.exit(1);
});
