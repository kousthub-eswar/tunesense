import { z } from 'zod';
import { ALLOWED_MOODS } from '../config/moodConfig.js';

export const updatePreferencesSchema = z.object({
  preferredGenres: z.array(z.string().trim().min(1).max(50)).optional(),
  favoriteGenres: z.array(z.string().trim().min(1).max(50)).optional(),
  preferredArtists: z.array(z.string().trim().min(1)).optional(),
  favoriteArtists: z.array(z.string().trim().min(1)).optional(),
  preferredLanguages: z.array(z.string().trim().min(1).max(30)).optional(),
  dislikedGenres: z.array(z.string().trim().min(1).max(50)).optional(),
  dislikedArtists: z.array(z.string().trim().min(1)).optional(),
  preferredEnergy: z.number().min(0).max(1).optional().nullable(),
  preferredMood: z.enum(ALLOWED_MOODS as [string, ...string[]]).optional().nullable(),
  personalizationSettings: z
    .object({
      explorationLevel: z.number().min(0).max(1).optional(),
      diversityLevel: z.number().min(0).max(1).optional(),
    })
    .optional(),
});

export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>;
