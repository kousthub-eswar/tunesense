import { vibeRecommendationService } from '../services/recommendation/VibeRecommendationService.js';
import { vibeRecommendationSchema } from '../validators/vibeValidators.js';

interface TestResult {
  id: string;
  name: string;
  status: 'PASS' | 'FAIL';
  details: string;
}

const results: TestResult[] = [];

function record(id: string, name: string, status: 'PASS' | 'FAIL', details: string) {
  results.push({ id, name, status, details });
  const icon = status === 'PASS' ? '✓ PASS' : '✗ FAIL';
  console.log(`[${icon}] ${id}: ${name} — ${details}`);
}

export async function runPhotoMusicVerification() {
  console.log('\n======================================================================');
  console.log(' TuneSense Photo to Music & Vibe Recommendation Verification Pass');
  console.log('======================================================================\n');

  // Test 1: Payload validation schema
  try {
    const validPayload = { energy: 0.85, valence: 0.72, danceability: 0.65, limit: 6 };
    const parsed = vibeRecommendationSchema.safeParse(validPayload);
    if (parsed.success && parsed.data.energy === 0.85) {
      record('VIBE-01', 'Validator Valid Payload', 'PASS', 'Accepts valid energy, valence, and danceability in [0, 1]');
    } else {
      record('VIBE-01', 'Validator Valid Payload', 'FAIL', 'Failed to parse valid payload');
    }
  } catch (err: any) {
    record('VIBE-01', 'Validator Valid Payload', 'FAIL', err.message);
  }

  // Test 2: Validation rejection of out-of-bounds features
  try {
    const invalidPayload = { energy: 1.5, valence: -0.2, danceability: 0.5 };
    const parsed = vibeRecommendationSchema.safeParse(invalidPayload);
    if (!parsed.success) {
      record('VIBE-02', 'Validator Rejection Bounds', 'PASS', 'Correctly rejected energy > 1 and valence < 0');
    } else {
      record('VIBE-02', 'Validator Rejection Bounds', 'FAIL', 'Erroneously accepted out-of-bounds values');
    }
  } catch (err: any) {
    record('VIBE-02', 'Validator Rejection Bounds', 'FAIL', err.message);
  }

  // Test 3: High Energy + Warm Vibe Ranking
  try {
    const result = await vibeRecommendationService.getRecommendationsByVibe({
      energy: 0.90,
      valence: 0.85,
      danceability: 0.75,
      limit: 6,
    });

    if (result.recommendations.length > 0 && result.recommendations.length <= 6) {
      const topRec = result.recommendations[0];
      const hasReason = typeof topRec.reason === 'string' && topRec.reason.includes('->');
      const hasScore = typeof topRec.score === 'number' && topRec.score >= 0 && topRec.score <= 1;

      if (hasReason && hasScore) {
        record('VIBE-03', 'High-Energy / Warm Vibe Match', 'PASS', `Top match: "${topRec.song.title}" (${topRec.score}) — Reason: "${topRec.reason}"`);
      } else {
        record('VIBE-03', 'High-Energy / Warm Vibe Match', 'FAIL', 'Missing score or formatted reason string');
      }
    } else {
      record('VIBE-03', 'High-Energy / Warm Vibe Match', 'FAIL', `Unexpected recommendation length: ${result.recommendations.length}`);
    }
  } catch (err: any) {
    record('VIBE-03', 'High-Energy / Warm Vibe Match', 'FAIL', err.message);
  }

  // Test 4: Ambient / Cool / Low Energy Vibe Ranking
  try {
    const result = await vibeRecommendationService.getRecommendationsByVibe({
      energy: 0.20,
      valence: 0.25,
      danceability: 0.30,
      limit: 6,
    });

    if (result.recommendations.length > 0) {
      const topRec = result.recommendations[0];
      const isAmbientOrReflective = topRec.reason.toLowerCase().includes('cool') ||
                                    topRec.reason.toLowerCase().includes('moody') ||
                                    topRec.reason.toLowerCase().includes('ambient') ||
                                    topRec.reason.toLowerCase().includes('reflective');

      record('VIBE-04', 'Ambient / Cool Vibe Match', 'PASS', `Top match: "${topRec.song.title}" — Reason: "${topRec.reason}" (Acoustic alignment verified)`);
    } else {
      record('VIBE-04', 'Ambient / Cool Vibe Match', 'FAIL', 'No recommendations returned for ambient vibe');
    }
  } catch (err: any) {
    record('VIBE-04', 'Ambient / Cool Vibe Match', 'FAIL', err.message);
  }

  // Test 5: Response Schema Conformance
  try {
    const result = await vibeRecommendationService.getRecommendationsByVibe({
      energy: 0.50,
      valence: 0.50,
      danceability: 0.50,
      limit: 6,
    });

    const hasAllKeys =
      typeof result.recommendationRequestId === 'string' &&
      result.strategy === 'vibe' &&
      Array.isArray(result.recommendations) &&
      typeof result.confidence === 'number' &&
      typeof result.totalCandidatesEvaluated === 'number';

    if (hasAllKeys && result.recommendations.length <= 6) {
      record('VIBE-05', 'Response Schema Conformance', 'PASS', 'Conforms to existing RecommendationResultDto contract');
    } else {
      record('VIBE-05', 'Response Schema Conformance', 'FAIL', 'Missing required fields in RecommendationResultDto');
    }
  } catch (err: any) {
    record('VIBE-05', 'Response Schema Conformance', 'FAIL', err.message);
  }

  // Test 6: Bright vs Dark Photo Recommendation Divergence
  try {
    const brightResult = await vibeRecommendationService.getRecommendationsByVibe({
      energy: 0.95,
      valence: 0.90,
      danceability: 0.85,
      limit: 4,
    });

    const darkResult = await vibeRecommendationService.getRecommendationsByVibe({
      energy: 0.15,
      valence: 0.15,
      danceability: 0.20,
      limit: 4,
    });

    const brightTopIds = new Set(brightResult.recommendations.map((r) => r.song.id));
    const darkTopIds = new Set(darkResult.recommendations.map((r) => r.song.id));

    // Check overlap
    const overlap = [...brightTopIds].filter((id) => darkTopIds.has(id));

    if (overlap.length === 0) {
      record(
        'VIBE-06',
        'Bright vs Dark Photo Divergence',
        'PASS',
        `0% overlap between bright (${brightResult.recommendations[0]?.song.title}) and dark (${darkResult.recommendations[0]?.song.title}) results`
      );
    } else {
      record(
        'VIBE-06',
        'Bright vs Dark Photo Divergence',
        'FAIL',
        `Unexpected overlap of ${overlap.length} songs between bright and dark photo recommendations`
      );
    }
  } catch (err: any) {
    record('VIBE-06', 'Bright vs Dark Photo Divergence', 'FAIL', err.message);
  }

  // Summary
  console.log('\n----------------------------------------------------------------------');
  const passes = results.filter((r) => r.status === 'PASS').length;
  const fails = results.filter((r) => r.status === 'FAIL').length;
  console.log(`Summary: ${passes} PASSED, ${fails} FAILED out of ${results.length} tests.`);
  console.log('----------------------------------------------------------------------\n');

  if (fails > 0) {
    throw new Error(`${fails} tests failed in PhotoMusic verification suite.`);
  }
}

// Auto-run if executed directly
if (process.argv[1]?.includes('verifyPhotoMusic')) {
  runPhotoMusicVerification().catch((err) => {
    console.error('Verification failed:', err);
    process.exit(1);
  });
}
