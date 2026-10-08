import { z } from 'zod';
import { ALLOWED_MOODS } from '../config/moodConfig.js';

export const recordImpressionItemSchema = z.object({
  songId: z.string().min(1, 'Song ID is required'),
  strategy: z.string().default('hybrid'),
  recommendationScore: z.number().min(0).max(1),
  position: z.number().min(0).max(100),
  mood: z.string().optional(),
  recommendationRequestId: z.string().optional(),
});

export const recordImpressionsSchema = z.object({
  recommendationRequestId: z.string().optional(),
  sessionId: z.string().optional(),
  strategy: z.string().default('hybrid'),
  mood: z.string().optional(),
  impressions: z.array(recordImpressionItemSchema).min(1, 'At least one impression is required').max(50),
});

export const moodFeedbackSchema = z.object({
  recommendationRequestId: z.string().min(1, 'recommendationRequestId is required'),
  rating: z.number().int().min(1).max(5, 'Rating must be an integer between 1 and 5'),
  mood: z.string().refine((val) => (ALLOWED_MOODS as readonly string[]).includes(val.toLowerCase()), {
    message: 'Invalid mood value',
  }),
  songId: z.string().optional(),
  comment: z.string().max(500).optional(),
});

export const explanationFeedbackSchema = z.object({
  recommendationRequestId: z.string().min(1, 'recommendationRequestId is required'),
  rating: z.number().int().min(1).max(5, 'Rating must be an integer between 1 and 5'),
  songId: z.string().optional(),
  explanationText: z.string().max(500).optional(),
  comment: z.string().max(500).optional(),
});

export const evaluationQuerySchema = z.object({
  strategy: z.enum(['all', 'popularity', 'content', 'behaviour', 'context', 'hybrid', 'ablation_no_mood', 'ablation_no_context', 'ablation_no_behaviour']).default('all'),
  k: z.coerce.number().int().refine((val) => val === 5 || val === 10, {
    message: 'K must be either 5 or 10',
  }).default(10),
  trainDays: z.coerce.number().int().min(1).max(365).default(30),
  testDays: z.coerce.number().int().min(1).max(90).default(7),
});

export type RecordImpressionsInput = z.infer<typeof recordImpressionsSchema>;
export type MoodFeedbackInput = z.infer<typeof moodFeedbackSchema>;
export type ExplanationFeedbackInput = z.infer<typeof explanationFeedbackSchema>;
export type EvaluationQueryInput = z.infer<typeof evaluationQuerySchema>;
