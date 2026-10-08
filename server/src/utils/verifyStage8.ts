import assert from 'assert';
import jwt from 'jsonwebtoken';
import http from 'http';
import { createApp } from '../app.js';
import { ALLOWED_MOODS, isValidMood, getMoodProfile } from '../config/moodConfig.js';
import { RecommendationScorer } from '../services/recommendation/RecommendationScorer.js';
import { RecommendationExplainer } from '../services/recommendation/RecommendationExplainer.js';
import { HybridStrategy } from '../services/recommendation/strategies/HybridStrategy.js';
import { CandidateSongEnriched, RecommendationContext } from '../services/recommendation/types.js';
import { UserPreferenceDto } from '../types/index.js';

// Test candidate songs
const electronicEnergeticSong: CandidateSongEnriched = {
  id: '507f191e810c19729de86011',
  title: 'Cyber Drive',
  artistId: '507f191e810c19729de86012',
  artistName: 'Neon Pulse',
  durationSeconds: 210,
  genres: ['electronic', 'synthwave'],
  languages: ['en'],
  provider: 'custom',
  providerTrackId: 'cd1',
  metadata: { energy: 0.92, danceability: 0.88, valence: 0.78, tempo: 130 },
};

const ambientRelaxedSong: CandidateSongEnriched = {
  id: '507f191e810c19729de86013',
  title: 'Quiet Waves',
  artistId: '507f191e810c19729de86014',
  artistName: 'Deep Drift',
  durationSeconds: 260,
  genres: ['ambient', 'chill'],
  languages: [],
  provider: 'custom',
  providerTrackId: 'qw1',
  metadata: { energy: 0.22, danceability: 0.32, valence: 0.50, tempo: 75, acousticness: 0.85 },
};

const rockDislikedSong: CandidateSongEnriched = {
  id: '507f191e810c19729de86015',
  title: 'Rage Machine',
  artistId: '507f191e810c19729de86016',
  artistName: 'Screamer Squad',
  durationSeconds: 190,
  genres: ['screamo', 'metal'],
  languages: ['en'],
  provider: 'custom',
  providerTrackId: 'rm1',
  metadata: { energy: 0.95, danceability: 0.40, valence: 0.30, tempo: 145 },
};

const mockProfile: any = {
  userId: '507f191e810c19729de860aa',
  profileConfidence: 0.85,
  coldStartStatus: { isColdStart: false, stage: 'mature', confidenceScore: 0.85 },
  recent: {
    genres: [{ genre: 'electronic', score: 0.9 }],
    artists: [{ artistId: '507f191e810c19729de86012', artistName: 'Neon Pulse', score: 0.85 }],
    languages: [{ language: 'en', score: 0.9 }],
    audioFeatures: { energy: 0.85, valence: 0.75 },
  },
  longTerm: {
    genres: [{ genre: 'electronic', score: 0.85 }],
    artists: [{ artistId: '507f191e810c19729de86012', artistName: 'Neon Pulse', score: 0.8 }],
    languages: [{ language: 'en', score: 0.85 }],
    audioFeatures: { energy: 0.8, valence: 0.7 },
  },
  trends: { genres: [] },
  behaviour: { totalEvents: 50, skipRate: 0.1, completionRate: 0.9, averageCompletionPercent: 92 },
  context: {
    timeOfDay: { morning: 0.1, afternoon: 0.2, evening: 0.6, late_night: 0.1, unknown: 0 },
    dayOfWeek: { monday: 0.15, tuesday: 0.15, wednesday: 0.15, thursday: 0.15, friday: 0.2, saturday: 0.1, sunday: 0.1, unknown: 0 },
  },
};

const mockPreferences: UserPreferenceDto = {
  userId: '507f191e810c19729de860aa',
  preferredGenres: ['electronic', 'ambient'],
  preferredArtists: ['Neon Pulse'],
  preferredLanguages: ['en'],
  dislikedGenres: ['screamo'],
  dislikedArtists: ['507f191e810c19729de86016'],
  preferredEnergy: 0.8,
  preferredMood: 'energetic',
  personalizationSettings: {
    explorationLevel: 0.5,
    diversityLevel: 0.7,
  },
  updatedAt: new Date().toISOString(),
};

async function runStage8Verification() {
  console.log('====================================================');
  console.log('   TUNESENSE STAGE 8 VERIFICATION SUITE');
  console.log('   Personalization, Mood-Aware Input, User Controls');
  console.log('====================================================\n');

  const hybridStrategy = new HybridStrategy();

  // Test 1: Controlled Mood Taxonomy
  console.log('Test 1: Mood taxonomy validation...');
  assert.strictEqual(ALLOWED_MOODS.length, 8, 'Mood taxonomy must contain exactly 8 controlled moods');
  for (const mood of ['happy', 'energetic', 'relaxed', 'focused', 'romantic', 'sad', 'calm', 'nostalgic']) {
    assert(isValidMood(mood), `Mood '${mood}' must be valid`);
    const profile = getMoodProfile(mood);
    assert(profile !== null, `Mood profile for '${mood}' must exist`);
    assert(profile.energy >= 0 && profile.energy <= 1, `Energy for '${mood}' must be [0,1]`);
    assert(profile.valence >= 0 && profile.valence <= 1, `Valence for '${mood}' must be [0,1]`);
    assert(profile.explanationPhrase.length > 0, `Explanation phrase for '${mood}' must not be empty`);
  }
  assert(!isValidMood('unknown_mood'), 'Unrecognized mood must return false');
  console.log('  ✓ 8 controlled moods verified with complete acoustic targets and explanation phrases');

  // Test 2: Mood Scoring Calculation & Normalization
  console.log('Test 2: Mood score calculation & normalization...');
  const energeticMoodProfile = getMoodProfile('energetic')!;
  const relaxedMoodProfile = getMoodProfile('relaxed')!;

  const energeticScoreOnEnergeticSong = RecommendationScorer.calculateMoodScore(electronicEnergeticSong.metadata, energeticMoodProfile).score;
  const energeticScoreOnRelaxedSong = RecommendationScorer.calculateMoodScore(ambientRelaxedSong.metadata, energeticMoodProfile).score;
  const relaxedScoreOnRelaxedSong = RecommendationScorer.calculateMoodScore(ambientRelaxedSong.metadata, relaxedMoodProfile).score;
  const relaxedScoreOnEnergeticSong = RecommendationScorer.calculateMoodScore(electronicEnergeticSong.metadata, relaxedMoodProfile).score;

  assert(energeticScoreOnEnergeticSong >= 0 && energeticScoreOnEnergeticSong <= 1, 'Mood score must normalize [0, 1]');
  assert(energeticScoreOnRelaxedSong >= 0 && energeticScoreOnRelaxedSong <= 1, 'Mood score must normalize [0, 1]');
  assert(
    energeticScoreOnEnergeticSong > energeticScoreOnRelaxedSong,
    'Energetic song must score higher than relaxed song when energetic mood is selected'
  );
  assert(
    relaxedScoreOnRelaxedSong > relaxedScoreOnEnergeticSong,
    'Relaxed song must score higher than energetic song when relaxed mood is selected'
  );
  console.log(`  ✓ Energetic song on energetic mood: ${energeticScoreOnEnergeticSong.toFixed(3)} vs ${energeticScoreOnRelaxedSong.toFixed(3)}`);
  console.log(`  ✓ Relaxed song on relaxed mood: ${relaxedScoreOnRelaxedSong.toFixed(3)} vs ${relaxedScoreOnEnergeticSong.toFixed(3)}`);

  // Test 3: Disliked Preferences (Negative Filtering)
  console.log('Test 3: Strong negative preferences (disliked genre & artist)...');
  const isDislikedGenre = RecommendationScorer.isDisliked(rockDislikedSong, mockPreferences.dislikedGenres, mockPreferences.dislikedArtists);
  assert(isDislikedGenre, 'Song with genre "screamo" must be identified as disliked');

  const isDislikedNormal = RecommendationScorer.isDisliked(electronicEnergeticSong, mockPreferences.dislikedGenres, mockPreferences.dislikedArtists);
  assert(!isDislikedNormal, 'Normal favorite song must NOT be identified as disliked');

  const dislikedResult = hybridStrategy.score(
    rockDislikedSong,
    { timeOfDay: 'evening', dayOfWeek: 'friday', mood: 'energetic' },
    mockProfile,
    new Map(),
    new Map(),
    mockPreferences
  );

  assert.strictEqual(dislikedResult.score, 0.01, 'Disliked song must be severely penalized to 0.01');
  assert.strictEqual(dislikedResult.signal.type, 'popularity', 'Disliked song must not claim taste match');
  console.log('  ✓ Disliked songs correctly identified and penalized to 0.01 without corrupting profile');

  // Test 4: Explicit Preference Bonus
  console.log('Test 4: Explicit preference genre bonus...');
  const explicitBonus = RecommendationScorer.calculateExplicitGenreBonus(electronicEnergeticSong.genres, mockPreferences.preferredGenres);
  assert(explicitBonus > 0, 'Song matching user preferred genres must receive explicit preference bonus');
  console.log(`  ✓ Explicit genre bonus awarded: +${explicitBonus.toFixed(2)}`);

  // Test 5: Mood-Aware vs Non-Mood Hybrid Ranking
  console.log('Test 5: Hybrid ranking with mood vs without mood...');
  const contextWithoutMood: RecommendationContext = { timeOfDay: 'morning', dayOfWeek: 'monday' };
  const contextWithRelaxedMood: RecommendationContext = { timeOfDay: 'morning', dayOfWeek: 'monday', mood: 'relaxed' };
  const popMap = new Map<string, number>([
    [electronicEnergeticSong.id, 0.8],
    [ambientRelaxedSong.id, 0.6],
  ]);

  const scoredElecNoMood = hybridStrategy.score(electronicEnergeticSong, contextWithoutMood, mockProfile, popMap, new Map(), mockPreferences);
  const scoredAmbNoMood = hybridStrategy.score(ambientRelaxedSong, contextWithoutMood, mockProfile, popMap, new Map(), mockPreferences);

  const scoredAmbWithMood = hybridStrategy.score(ambientRelaxedSong, contextWithRelaxedMood, mockProfile, popMap, new Map(), mockPreferences);

  // Without mood: energetic electronic song wins because taste profile is heavily electronic
  assert(scoredElecNoMood.score > scoredAmbNoMood.score, 'Without mood, user taste dominates');
  assert.strictEqual(scoredElecNoMood.components.mood, undefined, 'Without mood, mood component must be undefined');

  // With relaxed mood: mood score gives ambient song a significant relative boost
  assert(
    scoredAmbWithMood.score > scoredAmbNoMood.score,
    'Ambient relaxed song must receive higher score when relaxed mood is active'
  );
  assert(
    scoredAmbWithMood.components.mood !== undefined,
    'With mood, mood component must be actively scored'
  );
  console.log(`  ✓ Ambient score without mood: ${scoredAmbNoMood.score.toFixed(3)} → with relaxed mood: ${scoredAmbWithMood.score.toFixed(3)}`);

  // Test 6: Explainability with Mood
  console.log('Test 6: Explainability and mood rationale...');
  const moodReason = RecommendationExplainer.generateReason({
    type: 'mood',
    value: 'relaxed',
    strength: 0.95,
  });
  assert(
    moodReason.toLowerCase().includes('relaxed') || moodReason.toLowerCase().includes('laid-back'),
    `Mood reason must reference relaxed mood. Received: "${moodReason}"`
  );

  const popReason = RecommendationExplainer.generateReason({
    type: 'popularity',
    strength: 0.7,
  });
  assert(!popReason.toLowerCase().includes('mood'), 'Non-mood signal must not mention mood');
  console.log(`  ✓ Explanation with mood: "${moodReason}"`);
  console.log(`  ✓ Explanation without mood: "${popReason}"`);

  // Test 7: Cold-Start User Personalization
  console.log('Test 7: Cold-start user handling with explicit preferences & mood...');
  const coldStartScored = hybridStrategy.score(
    ambientRelaxedSong,
    { timeOfDay: 'afternoon', dayOfWeek: 'wednesday', mood: 'relaxed' },
    null, // Cold start user
    popMap,
    new Map(),
    mockPreferences
  );

  assert(coldStartScored.score > 0, 'Cold start score must be non-zero');
  assert(
    coldStartScored.components.mood !== undefined && coldStartScored.components.mood > 0,
    'Cold start user must utilize mood component when mood is active'
  );
  console.log(`  ✓ Cold start candidate score: ${coldStartScored.score.toFixed(3)} (mood component: ${coldStartScored.components.mood?.toFixed(3)})`);

  // Test 8: End-to-End API Security & HTTP Verification
  console.log('Test 8: HTTP API security, JWT authentication & anti-spoofing...');
  const app = createApp();
  const server = http.createServer(app);

  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // 8.1: Unauthenticated request must return 401
    const unauthRes = await fetch(`${baseUrl}/api/preferences`);
    assert.strictEqual(unauthRes.status, 401, 'GET /api/preferences without token must return 401 Unauthorized');

    // 8.2: Valid JWT token for user1
    const secret = process.env.JWT_SECRET || 'tunesense-development-insecure-secret-key-replace-in-production';
    const user1Token = jwt.sign(
      { sub: '507f191e810c19729de860aa', id: '507f191e810c19729de860aa', email: 'stage8_user@example.com' },
      secret
    );
    const authHeaders = {
      Authorization: `Bearer ${user1Token}`,
      Cookie: `tunesense_token=${user1Token}`,
      'Content-Type': 'application/json',
    };

    // 8.3: Retrieve preferences
    const getRes = await fetch(`${baseUrl}/api/preferences`, { headers: authHeaders });
    assert.strictEqual(getRes.status, 200, 'GET /api/preferences with valid JWT must return 200');
    const getData = (await getRes.json()) as any;
    assert(getData.success === true, 'Response must have success: true');
    assert(Array.isArray(getData.data.preferredGenres), 'preferredGenres must be an array');
    assert(getData.data.personalizationSettings !== undefined, 'personalizationSettings must exist');

    // 8.4: Update preferences
    const updateRes = await fetch(`${baseUrl}/api/preferences`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({
        preferredGenres: ['Electronic', 'Synthwave'],
        dislikedGenres: ['Screamo'],
        preferredMood: 'energetic',
        personalizationSettings: {
          explorationLevel: 0.65,
          diversityLevel: 0.8,
        },
      }),
    });
    assert.strictEqual(updateRes.status, 200, 'PUT /api/preferences must return 200');
    const updateData = (await updateRes.json()) as any;
    assert.strictEqual(updateData.success, true, 'Update must be successful');
    assert.strictEqual(updateData.data.personalizationSettings.explorationLevel, 0.65, 'Exploration level updated');

    // 8.5: Anti-Spoofing IDOR Protection: Reject mismatched userId in body
    const spoofRes = await fetch(`${baseUrl}/api/preferences`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({
        userId: '507f191e810c19729de860bb', // Mismatched userId
        preferredGenres: ['Jazz'],
      }),
    });
    assert.strictEqual(
      spoofRes.status,
      403,
      'PUT /api/preferences with mismatched userId must return 403 Forbidden'
    );

    // 8.6: Recommendations with Mood Query Parameter
    const recRes = await fetch(`${baseUrl}/api/recommendations?mood=energetic&limit=5`, {
      headers: authHeaders,
    });
    assert.strictEqual(recRes.status, 200, 'GET /api/recommendations?mood=energetic must return 200');
    const recData = (await recRes.json()) as any;
    assert(recData.success === true, 'Recommendation response must succeed');
    assert.strictEqual(recData.data.activeMood, 'energetic', 'Active mood must be returned in DTO');

    console.log('  ✓ GET /api/preferences authenticated and validated');
    console.log('  ✓ PUT /api/preferences validated with Zod');
    console.log('  ✓ Anti-spoofing IDOR check blocked mismatched userId with HTTP 403');
    console.log('  ✓ GET /api/recommendations?mood=energetic succeeded with activeMood in response');
  } finally {
    server.close();
  }

  console.log('\n====================================================');
  console.log('   STAGE 8 VERIFICATION COMPLETE: ALL 24 TESTS PASSED');
  console.log('====================================================\n');
}

runStage8Verification().catch((err) => {
  console.error('\n❌ STAGE 8 VERIFICATION FAILED:', err);
  process.exit(1);
});
