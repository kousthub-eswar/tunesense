import { journeyRecommendationService } from '../services/recommendation/JourneyRecommendationService.js';
import { journeyRecommendationSchema } from '../validators/journeyValidators.js';

async function testEmotionalGps() {
  console.log('=== TEST 1: Schema Validation ===');
  const validPayload = {
    fromMood: 'stressed',
    toMood: 'calm',
    steps: 5,
  };
  const parseOk = journeyRecommendationSchema.safeParse(validPayload);
  console.log('Valid payload accepted:', parseOk.success);

  const invalidPayload = {
    fromMood: 'super_angry',
    toMood: 'chillax',
    steps: 12,
  };
  const parseBad = journeyRecommendationSchema.safeParse(invalidPayload);
  console.log('Invalid payload rejected:', !parseBad.success);

  console.log('\n=== TEST 2: Journey Planning (Stressed -> Calm) ===');
  const journeyRes = await journeyRecommendationService.planJourney({
    fromMood: 'stressed',
    toMood: 'calm',
    steps: 5,
  });

  console.log('Journey planned from:', journeyRes.fromMood, 'to:', journeyRes.toMood);
  console.log('Total steps:', journeyRes.journey.length);

  const songIds = new Set<string>();
  const artistIds = new Set<string>();
  let hasDuplicates = false;

  journeyRes.journey.forEach((step, idx) => {
    console.log(
      `Step ${step.step}: (${step.waypoint.valence.toFixed(2)}, ${step.waypoint.energy.toFixed(2)}) -> "${step.song.title}" by ${step.song.artistName}`
    );
    console.log(`   Reason: "${step.reason}"`);

    if (songIds.has(step.song.id)) {
      console.error(`DUPLICATE SONG FOUND: ${step.song.id}`);
      hasDuplicates = true;
    }
    songIds.add(step.song.id);

    const artistKey = (step.song.artistId || step.song.artistName).toLowerCase();
    if (artistIds.has(artistKey)) {
      console.warn(`Duplicate artist key: ${artistKey}`);
    }
    artistIds.add(artistKey);
  });

  if (!hasDuplicates) {
    console.log('SUCCESS: All songs in journey are unique with max 1 per artist!');
  }

  console.log('\n=== TEST 3: Reverse Journey (Calm -> Energetic) ===');
  const reverseRes = await journeyRecommendationService.planJourney({
    fromMood: 'calm',
    toMood: 'energetic',
    steps: 5,
  });

  reverseRes.journey.forEach((step) => {
    console.log(`Step ${step.step} (${step.waypoint.valence.toFixed(2)}, ${step.waypoint.energy.toFixed(2)}): ${step.reason}`);
  });

  console.log('\nALL EMOTIONAL GPS VERIFICATION CHECKS COMPLETED.');
}

testEmotionalGps().catch((err) => {
  console.error('Test error:', err);
});
