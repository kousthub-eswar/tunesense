import mongoose, { Types } from 'mongoose';
import jwt from 'jsonwebtoken';
import { createListeningEventSchema } from '../validators/listeningEventValidators.js';
import { listeningEventService } from '../services/listening/ListeningEventService.js';
import { authService } from '../services/auth/AuthService.js';
import { User, Song, Artist, ListeningEvent } from '../models/index.js';
import { config } from '../config/index.js';

async function runStage5Verification() {
  console.log('--- TuneSense Stage 5 Listening Behaviour Verification ---');
  let allPassed = true;

  const pass = (title: string) => console.log(`[PASS] ${title}`);
  const fail = (title: string, err: unknown) => {
    console.error(`[FAIL] ${title}:`, err);
    allPassed = false;
  };

  // 1. Zod Schema Validation Unit Tests
  // 1a. Invalid event type
  try {
    const res = createListeningEventSchema.safeParse({
      songId: '507f1f77bcf86cd799439011',
      eventType: 'rewind', // invalid
    });
    if (res.success) throw new Error('Expected validation failure for invalid event type');
    pass('Validation: Invalid event type rejected (400 Bad Request equivalent)');
  } catch (err) {
    fail('Validation: Invalid event type rejected', err);
  }

  // 1b. Negative playback position
  try {
    const res = createListeningEventSchema.safeParse({
      songId: '507f1f77bcf86cd799439011',
      eventType: 'play',
      playback: {
        positionSeconds: -10, // negative position
        durationSeconds: 200,
      },
    });
    if (res.success) throw new Error('Expected validation failure for negative playback position');
    pass('Validation: Negative playback position rejected');
  } catch (err) {
    fail('Validation: Negative playback position rejected', err);
  }

  // 1c. Completion percentage > 100
  try {
    const res = createListeningEventSchema.safeParse({
      songId: '507f1f77bcf86cd799439011',
      eventType: 'play',
      playback: {
        positionSeconds: 250,
        durationSeconds: 200,
        completionPercent: 125, // > 100
      },
    });
    if (res.success) throw new Error('Expected validation failure for completion percentage > 100');
    pass('Validation: Excessive completion percentage (>100) rejected');
  } catch (err) {
    fail('Validation: Excessive completion percentage (>100) rejected', err);
  }

  // 1d. Valid listening event payload
  try {
    const res = createListeningEventSchema.safeParse({
      songId: '507f1f77bcf86cd799439011',
      eventType: 'play',
      timestamp: new Date().toISOString(),
      playback: {
        positionSeconds: 15,
        durationSeconds: 240,
        completionPercent: 6.25,
      },
      context: {
        sessionId: 'sess_stage5_test',
        timeOfDay: 'evening',
        dayOfWeek: 'friday',
        deviceType: 'mobile',
      },
    });
    if (!res.success) throw new Error('Valid payload should have passed');
    pass('Validation: Valid listening event payload accepted');
  } catch (err) {
    fail('Validation: Valid listening event payload accepted', err);
  }

  // 2. HTTP Endpoint Verification against running server (http://localhost:5000)
  const baseUrl = 'http://localhost:5000/api';
  const devSecret = config.jwtSecret || process.env.JWT_SECRET || 'tunesense_dev_jwt_secret_key_minimum_32_characters_12345';
  const testToken = jwt.sign({ sub: '670498b00000000000000001' }, devSecret);

  // 2a. Unauthenticated request to POST /api/listening-events
  try {
    const res = await fetch(`${baseUrl}/listening-events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ songId: '507f1f77bcf86cd799439011', eventType: 'play' }),
    });
    if (res.status !== 401) throw new Error(`Expected 401 Unauthorized, got ${res.status}`);
    pass('API Security: Unauthenticated request to /api/listening-events returns 401');
  } catch (err) {
    fail('API Security: Unauthenticated request check', err);
  }

  // 2b. Invalid JWT request to POST /api/listening-events
  try {
    const res = await fetch(`${baseUrl}/listening-events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer invalid_fake_token_value',
      },
      body: JSON.stringify({ songId: '507f1f77bcf86cd799439011', eventType: 'play' }),
    });
    if (res.status !== 401) throw new Error(`Expected 401 for invalid JWT, got ${res.status}`);
    pass('API Security: Invalid JWT returns 401 Unauthorized');
  } catch (err) {
    fail('API Security: Invalid JWT check', err);
  }

  // 2c. Authenticated request with invalid event type
  try {
    const res = await fetch(`${baseUrl}/listening-events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${testToken}`,
      },
      body: JSON.stringify({ songId: '507f1f77bcf86cd799439011', eventType: 'rewind' }),
    });
    if (res.status !== 400) throw new Error(`Expected 400 Bad Request, got ${res.status}`);
    const data = await res.json();
    if (data.error?.code !== 'VALIDATION_ERROR') throw new Error('Expected VALIDATION_ERROR code');
    pass('API Validation: Authenticated request with invalid event type returns 400 Bad Request');
  } catch (err) {
    fail('API Validation: Invalid event type check', err);
  }

  // 2d. Authenticated request with negative playback position
  try {
    const res = await fetch(`${baseUrl}/listening-events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${testToken}`,
      },
      body: JSON.stringify({
        songId: '507f1f77bcf86cd799439011',
        eventType: 'play',
        playback: { positionSeconds: -5, durationSeconds: 200 },
      }),
    });
    if (res.status !== 400) throw new Error(`Expected 400 Bad Request, got ${res.status}`);
    pass('API Validation: Authenticated request with negative position returns 400 Bad Request');
  } catch (err) {
    fail('API Validation: Negative position check', err);
  }

  // 2e. Degraded Mode Graceful Response (when MongoDB is not active)
  try {
    const res = await fetch(`${baseUrl}/listening-events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${testToken}`,
      },
      body: JSON.stringify({
        songId: '507f1f77bcf86cd799439011',
        eventType: 'play',
        playback: { positionSeconds: 0, durationSeconds: 200 },
      }),
    });
    // In degraded mode without MongoDB, returns 503; if MongoDB is connected, returns 404 (song not found) or 201
    if (res.status === 503) {
      pass('API Resilience: Graceful 503 Service Unavailable when MongoDB is in degraded mode');
    } else if (res.status === 404) {
      pass('API Data Integrity: 404 Not Found when referenced song is not in catalogue');
    } else if (res.status === 201) {
      pass('API Success: 201 Created when database is connected');
    } else {
      throw new Error(`Unexpected status ${res.status}`);
    }
  } catch (err) {
    fail('API Resilience check', err);
  }

  // 3. Integration Tests with MongoDB (if MONGODB_URI configured or available)
  const mongoUri = config.mongodbUri || process.env.MONGODB_URI;
  if (mongoUri) {
    try {
      console.log('Connecting to MongoDB for Stage 5 live integration testing...');
      await mongoose.connect(mongoUri, { dbName: config.mongodbDbName });
      console.log('Connected to MongoDB.');

      // Setup Test Data: Artist, Song, and Users
      const testArtist = await Artist.create({
        name: 'Stage5 Test Artist',
        genres: ['indie', 'ambient'],
      });

      const testSong = await Song.create({
        title: 'Stage5 Telemetry Track',
        artistIds: [testArtist._id],
        durationSeconds: 240,
        genres: ['indie'],
        provider: 'custom',
        providerTrackId: `test_track_${Date.now()}`,
      });

      const { user: userA } = await authService.signup({
        name: 'Stage5 User A',
        email: `stage5_user_a_${Date.now()}@example.com`,
        password: 'password123',
      });

      const { user: userB } = await authService.signup({
        name: 'Stage5 User B',
        email: `stage5_user_b_${Date.now()}@example.com`,
        password: 'password123',
      });

      // 3a. Valid Event Creation: User A emits 'play'
      const playEvent = await listeningEventService.recordEvent(userA.id, {
        songId: testSong._id.toString(),
        eventType: 'play',
        playback: {
          positionSeconds: 0,
          durationSeconds: 240,
        },
        context: {
          sessionId: 'sess_test_123',
          timeOfDay: 'morning',
          dayOfWeek: 'monday',
          deviceType: 'mobile',
        },
      });

      if (!playEvent.id || playEvent.eventType !== 'play' || playEvent.userId !== userA.id) {
        throw new Error('Play event creation returned invalid DTO');
      }
      pass('Event Creation: Authenticated user + valid song + play event created');

      // 3b. User Identity Isolation: Verify Event belongs to User A, not User B
      const persistedEvent = await ListeningEvent.findById(playEvent.id);
      if (!persistedEvent || persistedEvent.userId.toString() !== userA.id) {
        throw new Error('User identity isolation violated: event not strictly bound to authenticated user');
      }
      if (persistedEvent.userId.toString() === userB.id) {
        throw new Error('Security violation: Event attributed to wrong user');
      }
      pass('Security: User identity is strictly isolated and bound to authenticated user');

      // 3c. Nonexistent Song: Verify 404 rejection
      try {
        const fakeSongId = new Types.ObjectId().toString();
        await listeningEventService.recordEvent(userA.id, {
          songId: fakeSongId,
          eventType: 'play',
        });
        throw new Error('Nonexistent song should have failed with 404');
      } catch (err: unknown) {
        const status = (err as { status?: number }).status;
        if (status === 404) {
          pass('Song Validation: Nonexistent song returns 404 (no orphan event created)');
        } else {
          throw err;
        }
      }

      // 3d. Duplicate Play Deduplication: Immediate consecutive play signal
      const dupPlayEvent = await listeningEventService.recordEvent(userA.id, {
        songId: testSong._id.toString(),
        eventType: 'play',
        playback: {
          positionSeconds: 0,
          durationSeconds: 240,
        },
      });
      if (dupPlayEvent.id !== playEvent.id) {
        throw new Error('Deduplication failed: Duplicate play document was created within deduplication window');
      }
      const totalPlayEvents = await ListeningEvent.countDocuments({
        userId: userA.id,
        songId: testSong._id,
        eventType: 'play',
      });
      if (totalPlayEvents !== 1) {
        throw new Error(`Expected exactly 1 play event document, got ${totalPlayEvents}`);
      }
      pass('Deduplication: Immediate consecutive play signals deduplicated to 1 document');

      // 3e. Pause Event Creation
      const pauseEvent = await listeningEventService.recordEvent(userA.id, {
        songId: testSong._id.toString(),
        eventType: 'pause',
        playback: {
          positionSeconds: 60,
          durationSeconds: 240,
        },
      });
      if (pauseEvent.eventType !== 'pause' || pauseEvent.playback?.positionSeconds !== 60) {
        throw new Error('Pause event creation failed');
      }
      pass('Pause Event: Successfully recorded with accurate position (60s)');

      // 3f. Skip Event Creation (Track switching before completion)
      const skipEvent = await listeningEventService.recordEvent(userA.id, {
        songId: testSong._id.toString(),
        eventType: 'skip',
        playback: {
          positionSeconds: 90,
          durationSeconds: 240,
        },
      });
      if (skipEvent.eventType !== 'skip' || skipEvent.playback?.positionSeconds !== 90) {
        throw new Error('Skip event creation failed');
      }
      pass('Skip Event: Successfully recorded with accurate dwell position (90s / 37.5%)');

      // 3g. Complete Event Creation (Track ending)
      const completeEvent = await listeningEventService.recordEvent(userA.id, {
        songId: testSong._id.toString(),
        eventType: 'complete',
        playback: {
          positionSeconds: 240,
          durationSeconds: 240,
          completionPercent: 100,
        },
      });
      if (completeEvent.eventType !== 'complete' || completeEvent.playback?.completionPercent !== 100) {
        throw new Error('Complete event creation failed');
      }
      pass('Complete Event: Successfully recorded with 100% completion rate');

      // 3h. Cleanup Test Artifacts
      await ListeningEvent.deleteMany({ userId: { $in: [userA.id, userB.id] } });
      await User.deleteMany({ _id: { $in: [userA.id, userB.id] } });
      await Song.deleteOne({ _id: testSong._id });
      await Artist.deleteOne({ _id: testArtist._id });
      console.log('Cleaned up test documents from MongoDB.');

      await mongoose.disconnect();
    } catch (dbErr) {
      fail('MongoDB Stage 5 Integration', dbErr);
    }
  } else {
    console.log('No MONGODB_URI configured, skipping live database integration test.');
  }

  if (allPassed) {
    console.log('\n>>> ALL STAGE 5 LISTENING BEHAVIOUR VERIFICATION CHECKS PASSED! <<<');
  } else {
    console.error('\n>>> SOME STAGE 5 CHECKS FAILED <<<');
    process.exit(1);
  }
}

runStage5Verification().catch((err) => {
  console.error('Fatal verification error:', err);
  process.exit(1);
});
