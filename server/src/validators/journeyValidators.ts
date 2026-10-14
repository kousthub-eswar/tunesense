import { z } from 'zod';

export const GPS_MOOD_KEYS = [
  'happy',
  'energetic',
  'relaxed',
  'focused',
  'romantic',
  'sad',
  'calm',
  'nostalgic',
  'stressed',
] as const;

export type GpsMoodKey = typeof GPS_MOOD_KEYS[number];

export const journeyRecommendationSchema = z.object({
  fromMood: z.enum(GPS_MOOD_KEYS, {
    errorMap: () => ({
      message: `fromMood must be one of: ${GPS_MOOD_KEYS.join(', ')}`,
    }),
  }),
  toMood: z.enum(GPS_MOOD_KEYS, {
    errorMap: () => ({
      message: `toMood must be one of: ${GPS_MOOD_KEYS.join(', ')}`,
    }),
  }),
  steps: z
    .number()
    .int()
    .min(3, { message: 'steps must be at least 3' })
    .max(10, { message: 'steps cannot exceed 10' })
    .default(5),
});

export type JourneyRecommendationInput = z.infer<typeof journeyRecommendationSchema>;
