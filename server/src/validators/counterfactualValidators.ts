import { z } from 'zod';
import { isValidMood } from '../config/moodConfig.js';

export const counterfactualWeightsSchema = z.object({
  content: z.number().min(0, 'Weight must be non-negative').max(10, 'Weight exceeds maximum bound').optional(),
  behaviour: z.number().min(0, 'Weight must be non-negative').max(10, 'Weight exceeds maximum bound').optional(),
  context: z.number().min(0, 'Weight must be non-negative').max(10, 'Weight exceeds maximum bound').optional(),
  collaborative: z.number().min(0, 'Weight must be non-negative').max(10, 'Weight exceeds maximum bound').optional(),
  popularity: z.number().min(0, 'Weight must be non-negative').max(10, 'Weight exceeds maximum bound').optional(),
  novelty: z.number().min(0, 'Weight must be non-negative').max(10, 'Weight exceeds maximum bound').optional(),
  mood: z.number().min(0, 'Weight must be non-negative').max(10, 'Weight exceeds maximum bound').optional(),
});

export const counterfactualContextSchema = z.object({
  timeOfDay: z.enum(['morning', 'afternoon', 'evening', 'late_night']).optional(),
  dayOfWeek: z.enum([
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday',
  ]).optional(),
  mood: z.string().optional().refine((val) => !val || isValidMood(val), {
    message: 'Invalid mood specified',
  }),
});

export const counterfactualSimulationSchema = z.object({
  weights: counterfactualWeightsSchema.optional(),
  context: counterfactualContextSchema.optional(),
  mood: z.string().optional().refine((val) => !val || isValidMood(val), {
    message: 'Invalid mood specified',
  }),
  limit: z.number().int().min(1).max(20).optional(),
  applyDiversity: z.boolean().optional(),
  targetSongId: z.string().optional(),
  targetRank: z.number().int().min(1).max(20).optional(),
  applyConfidenceDampening: z.boolean().optional(),
});

export const minimalChangeRecourseSchema = z.object({
  targetSongId: z.string().min(1, 'Target song ID is required'),
  targetRank: z.number().int().min(1).max(20).optional().default(5),
  applyDiversity: z.boolean().optional(),
  mood: z.string().optional(),
});

export type CounterfactualSimulationInput = z.infer<typeof counterfactualSimulationSchema>;
export type MinimalChangeRecourseInput = z.infer<typeof minimalChangeRecourseSchema>;
