import { z } from 'zod';

export const vibeRecommendationSchema = z.object({
  energy: z.number().min(0, 'Energy must be between 0 and 1').max(1, 'Energy must be between 0 and 1'),
  valence: z.number().min(0, 'Valence must be between 0 and 1').max(1, 'Valence must be between 0 and 1'),
  danceability: z.number().min(0, 'Danceability must be between 0 and 1').max(1, 'Danceability must be between 0 and 1'),
  limit: z.number().int().min(1).max(20).optional().default(6),
  dominantColors: z.array(z.string()).optional(),
});

export type VibeRecommendationInput = z.infer<typeof vibeRecommendationSchema>;
