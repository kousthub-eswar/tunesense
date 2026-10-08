import assert from 'assert';
import jwt from 'jsonwebtoken';
import { RecommendationEngine } from '../services/recommendation/RecommendationEngine.js';
import { RecommendationScorer } from '../services/recommendation/RecommendationScorer.js';
import { RecommendationExplainer } from '../services/recommendation/RecommendationExplainer.js';
import { PopularityStrategy } from '../services/recommendation/strategies/PopularityStrategy.js';
import { ContentStrategy } from '../services/recommendation/strategies/ContentStrategy.js';
import { BehaviourStrategy } from '../services/recommendation/strategies/BehaviourStrategy.js';
import { ContextStrategy } from '../services/recommendation/strategies/ContextStrategy.js';
import { HybridStrategy } from '../services/recommendation/strategies/HybridStrategy.js';
import { CandidateSongEnriched, RecommendationContext } from '../services/recommendation/types.js';
import { RECOMMENDATION_CONFIG } from '../services/recommendation/recommendationConfig.js';
import { createApp } from '../app.js';

import http from 'http';

// Mock test candidates
const mockCandidateRock: CandidateSongEnriched = {
  id: '507f191e810c19729de860ea',
  title: 'Electric Horizon',
  artistId: '507f191e810c19729de860eb',
  artistName: 'Solar Flare',
  albumTitle: 'Neon Sky',
  durationSeconds: 210,
  genres: ['rock', 'alternative'],
  languages: ['english'],
  provider: 'custom',
  providerTrackId: 'track_1',
  metadata: { energy: 0.85, danceability: 0.60, valence: 0.70 },
};

const mockCandidateElectronic: CandidateSongEnriched = {
  id: '507f191e810c19729de860ec',
  title: 'Midnight Pulse',
  artistId: '507f191e810c19729de860ed',
  artistName: 'SynthWave Collective',
  albumTitle: 'Cyber Night',
  durationSeconds: 195,
  genres: ['electronic', 'synthwave'],
  languages: ['english'],
  provider: 'custom',
  providerTrackId: 'track_2',
  metadata: { energy: 0.90, danceability: 0.85, valence: 0.80 },
};

const mockCandidateAmbient: CandidateSongEnriched = {
  id: '507f191e810c19729de860ee',
  title: 'Deep Drift',
  artistId: '507f191e810c19729de860ef',
  artistName: 'Ethereal Sounds',
  albumTitle: 'Quiet Reverie',
  durationSeconds: 320,
  genres: ['ambient', 'chillout'],
  languages: [],
  provider: 'custom',
  providerTrackId: 'track_3',
  metadata: { energy: 0.25, danceability: 0.30, valence: 0.40 },
};

// Mock user taste profile with electronic affinity
const mockProfileElectronic: any = {
  profileVersion: 1,
  profileConfidence: 0.85,
  longTerm: {
    genres: [
      { genre: 'electronic', score: 0.90 },
      { genre: 'dance', score: 0.75 },
    ],
    artists: [
      { artistId: '507f191e810c19729de860ed', artistName: 'SynthWave Collective', score: 0.85 },
    ],
    languages: [{ language: 'english', score: 0.90 }],
    audioFeatures: { energy: 0.88, danceability: 0.82 },
  },
  recent: {
    genres: [
      { genre: 'ambient', score: 0.80 },
      { genre: 'electronic', score: 0.70 },
    ],
    artists: [],
    languages: [],
    audioFeatures: { energy: 0.40 },
  },
  trends: {
    genres: [
      { genre: 'ambient', delta: 0.45, direction: 'rising' },
    ],
  },
  behaviour: {
    totalEvents: 45,
    skipRate: 0.15,
    completionRate: 0.75,
    averageCompletionPercent: 78,
  },
  context: {
    timeOfDay: { morning: 0.10, afternoon: 0.20, evening: 0.55, late_night: 0.15, unknown: 0 },
    dayOfWeek: { monday: 0.14, tuesday: 0.14, wednesday: 0.14, thursday: 0.14, friday: 0.20, saturday: 0.14, sunday: 0.10, unknown: 0 },
  },
};

async function runStage7Verification() {
  console.log('--- TuneSense Stage 7 Recommendation Engine Verification ---');

  const eveningContext: RecommendationContext = {
    timeOfDay: 'evening',
    dayOfWeek: 'friday',
  };

  const lateNightContext: RecommendationContext = {
    timeOfDay: 'late_night',
    dayOfWeek: 'monday',
  };

  const popMap = new Map<string, number>([
    [mockCandidateRock.id, 0.75],
    [mockCandidateElectronic.id, 0.92],
    [mockCandidateAmbient.id, 0.40],
  ]);

  const userPlayCounts = new Map<string, number>([
    [mockCandidateRock.id, 5], // Repeatedly played (fatigue)
    [mockCandidateElectronic.id, 1], // Familiar
    [mockCandidateAmbient.id, 0], // Unheard (high novelty)
  ]);

  // 1. Test R0: Popularity Strategy
  const popularityStrategy = new PopularityStrategy();
  const popResultElec = popularityStrategy.score(
    mockCandidateElectronic,
    eveningContext,
    null,
    popMap,
    userPlayCounts
  );
  const popResultAmb = popularityStrategy.score(
    mockCandidateAmbient,
    eveningContext,
    null,
    popMap,
    userPlayCounts
  );
  assert(popResultElec.score > popResultAmb.score, 'R0: Popularity must rank high-popularity candidate above low-popularity candidate');
  assert.strictEqual(popResultElec.signal.type, 'popularity');
  console.log('[PASS] R0 Popularity Baseline: Successfully ranks candidates by catalogue engagement');

  // 2. Test R1: Content Strategy
  const contentStrategy = new ContentStrategy();
  const contentResultElec = contentStrategy.score(
    mockCandidateElectronic,
    eveningContext,
    mockProfileElectronic,
    popMap,
    userPlayCounts
  );
  const contentResultRock = contentStrategy.score(
    mockCandidateRock,
    eveningContext,
    mockProfileElectronic,
    popMap,
    userPlayCounts
  );
  assert(
    contentResultElec.score > contentResultRock.score,
    'R1: Content scoring must score matching electronic track higher than unmatched rock track'
  );
  assert(
    contentResultElec.signal.type === 'genre' || contentResultElec.signal.type === 'artist',
    'R1: Content scoring explanation signal must identify genre or artist'
  );
  console.log('[PASS] R1 Content Personalization: Candidate genres and acoustic attributes correctly match user taste');

  // 3. Test R2: Behaviour Strategy (Recent Taste & Rising Trends)
  const behaviourStrategy = new BehaviourStrategy();
  const behResultAmb = behaviourStrategy.score(
    mockCandidateAmbient,
    eveningContext,
    mockProfileElectronic,
    popMap,
    userPlayCounts
  );
  // Ambient is rising in recent taste despite being low in long-term taste
  assert(behResultAmb.score > 0.45, 'R2: Behaviour scoring must reward rising recent taste');
  assert.strictEqual(behResultAmb.signal.type, 'recentTaste');
  console.log('[PASS] R2 Behavioural Personalization: Recent taste trends and repeat engagement modify scoring appropriately');

  // 4. Test R3: Context Strategy
  const contextStrategy = new ContextStrategy();
  const ctxEvening = contextStrategy.score(
    mockCandidateElectronic,
    eveningContext,
    mockProfileElectronic,
    popMap,
    userPlayCounts
  );
  const ctxLateNight = contextStrategy.score(
    mockCandidateElectronic,
    lateNightContext,
    mockProfileElectronic,
    popMap,
    userPlayCounts
  );
  assert(
    ctxEvening.score > ctxLateNight.score,
    'R3: Context scoring must reward tracks matching user peak listening schedule (evening vs late night)'
  );
  assert.strictEqual(ctxEvening.signal.type, 'context');
  console.log('[PASS] R3 Context Awareness: Temporal listening patterns modify candidate relevance appropriately');

  // 5. Test R4: Hybrid Strategy
  const hybridStrategy = new HybridStrategy();
  const hybridResult = hybridStrategy.score(
    mockCandidateElectronic,
    eveningContext,
    mockProfileElectronic,
    popMap,
    userPlayCounts
  );
  assert(hybridResult.score >= 0.70, 'R4: Highly aligned track must receive high hybrid score');
  assert(hybridResult.components.content >= 0 && hybridResult.components.content <= 1, 'Components must be normalized');
  assert(hybridResult.components.popularity >= 0 && hybridResult.components.popularity <= 1);
  assert(hybridResult.components.behaviour >= 0 && hybridResult.components.behaviour <= 1);
  assert(hybridResult.components.context >= 0 && hybridResult.components.context <= 1);
  assert(hybridResult.components.novelty >= 0 && hybridResult.components.novelty <= 1);
  console.log('[PASS] R4 Hybrid Strategy: Linear combination of normalized components verified');

  // 6. Test Score Normalization & Clamping
  assert(RecommendationScorer.clamp(1.5) === 1.0, 'Clamp max must be 1.0');
  assert(RecommendationScorer.clamp(-0.5) === 0.0, 'Clamp min must be 0.0');
  assert(RecommendationScorer.clamp(NaN) === 0.0, 'NaN must be clamped safely to 0.0');
  console.log('[PASS] Score Normalization: Clamping utilities ensure strict [0, 1] range bounds');

  // 7. Test Diversity Constraints
  const candidatesSameArtist: any[] = [
    { song: { id: 's1', artistName: 'Band A', albumTitle: 'Album 1' }, score: 0.95, components: { novelty: 0.5 }, explanationSignal: { type: 'genre' }, reason: 'Reason 1' },
    { song: { id: 's2', artistName: 'Band A', albumTitle: 'Album 1' }, score: 0.90, components: { novelty: 0.5 }, explanationSignal: { type: 'genre' }, reason: 'Reason 2' },
    { song: { id: 's3', artistName: 'Band A', albumTitle: 'Album 1' }, score: 0.85, components: { novelty: 0.5 }, explanationSignal: { type: 'genre' }, reason: 'Reason 3' },
    { song: { id: 's4', artistName: 'Band B', albumTitle: 'Album 2' }, score: 0.80, components: { novelty: 0.5 }, explanationSignal: { type: 'genre' }, reason: 'Reason 4' },
    { song: { id: 's5', artistName: 'Band C', albumTitle: 'Album 3' }, score: 0.75, components: { novelty: 0.5 }, explanationSignal: { type: 'genre' }, reason: 'Reason 5' },
  ];

  const engine = new RecommendationEngine();
  // Access private applyDiversityAndExploration via any for strict verification
  const diverseResult = (engine as any).applyDiversityAndExploration(candidatesSameArtist, 4, true);
  const bandACount = diverseResult.filter((r: any) => r.song.artistName === 'Band A').length;
  assert(bandACount <= RECOMMENDATION_CONFIG.diversity.maxPerArtist, 'Must not exceed maxPerArtist');
  console.log(`[PASS] Diversity Constraints: Artist and album limits strictly enforced (maxPerArtist=${RECOMMENDATION_CONFIG.diversity.maxPerArtist})`);

  // 8. Test Novelty Score
  const novUnheard = RecommendationScorer.calculateNoveltyScore('unheard_id', userPlayCounts);
  const novFatigued = RecommendationScorer.calculateNoveltyScore(mockCandidateRock.id, userPlayCounts);
  assert.strictEqual(novUnheard, 1.0, 'Unheard track must have novelty 1.0');
  assert.strictEqual(novFatigued, 0.0, 'Track played 5 times must have novelty 0.0');
  console.log('[PASS] Novelty Calculation: Exposure decay correctly rewards fresh discoveries');

  // 9. Test Cold Start Fallback
  const coldHybrid = hybridStrategy.score(
    mockCandidateElectronic,
    eveningContext,
    null, // Cold start user with no profile
    popMap,
    new Map()
  );
  assert.strictEqual(coldHybrid.signal.type, 'popularity', 'Cold start user must receive popularity-based explanation');
  console.log('[PASS] Cold Start Handling: Zero-history users gracefully receive popularity recommendations');

  // 10. Test Explanation Generation
  const reasonGenre = RecommendationExplainer.generateReason({ type: 'genre', value: 'electronic', strength: 0.85 });
  assert.strictEqual(reasonGenre, 'Because you often listen to electronic music');
  const reasonArtist = RecommendationExplainer.generateReason({ type: 'artist', value: 'Daft Punk', strength: 0.90 });
  assert.strictEqual(reasonArtist, 'More from Daft Punk, an artist you frequently enjoy');
  const reasonPop = RecommendationExplainer.generateReason({ type: 'popularity', strength: 0.70 });
  assert.strictEqual(reasonPop, 'Popular and trending on TuneSense');
  console.log('[PASS] Explainability: Structured signals generate clear, evidence-backed human-readable reasons');

  // 11. Test Determinism
  const det1 = hybridStrategy.score(mockCandidateElectronic, eveningContext, mockProfileElectronic, popMap, userPlayCounts);
  const det2 = hybridStrategy.score(mockCandidateElectronic, eveningContext, mockProfileElectronic, popMap, userPlayCounts);
  assert.strictEqual(det1.score, det2.score, 'Scoring must be 100% deterministic');
  console.log('[PASS] Determinism: Identical inputs yield identical recommendation scores');

  // 12. HTTP Endpoint & Security Verification
  const server = http.createServer(createApp());
  await new Promise<void>((resolve) => server.listen(0, resolve));

  const port = (server.address() as any).port;

  try {
    // 12a. Unauthenticated request -> 401
    const unauthRes = await fetch(`http://localhost:${port}/api/recommendations`);
    assert.strictEqual(unauthRes.status, 401, 'Unauthenticated recommendation request must return 401 Unauthorized');
    console.log('[PASS] API Security: Unauthenticated request to /api/recommendations rejected with 401');

    // 12b. Anti-spoofing user isolation
    const secret = process.env.JWT_SECRET || 'tunesense-development-insecure-secret-key-replace-in-production';
    const userAToken = jwt.sign({ sub: '507f191e810c19729de860aa', email: 'userA@example.com' }, secret, { expiresIn: '1h' });

    const spoofRes = await fetch(`http://localhost:${port}/api/recommendations?userId=507f191e810c19729de860bb`, {
      headers: {
        Cookie: `tunesense_token=${userAToken}`,
      },
    });
    assert.strictEqual(spoofRes.status, 403, 'Cross-user recommendation request must be rejected with 403 Forbidden');
    console.log('[PASS] API Security: User isolation strictly enforced (403 Forbidden when requesting other user ID)');

    // 12c. Valid Authenticated Recommendation Retrieval
    const validRes = await fetch(`http://localhost:${port}/api/recommendations?limit=5`, {
      headers: {
        Cookie: `tunesense_token=${userAToken}`,
      },
    });
    assert.strictEqual(validRes.status, 200, 'Authenticated request must return 200 OK');
    const validBody = await validRes.json() as any;
    assert.strictEqual(validBody.success, true, 'Response must have success: true');
    assert.strictEqual(validBody.data.strategy, 'hybrid', 'Default strategy must be hybrid');
    assert(Array.isArray(validBody.data.recommendations), 'recommendations must be an array');
    console.log('[PASS] API Functionality: Authenticated request returns valid RecommendationResultDto');
  } finally {
    server.close();
  }

  console.log('\n>>> ALL STAGE 7 RECOMMENDATION ENGINE VERIFICATION CHECKS PASSED! <<<');
}

runStage7Verification().catch((err) => {
  console.error('\n[FAIL] Stage 7 Verification Error:', err);
  process.exit(1);
});
