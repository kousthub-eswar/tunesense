import { z } from 'zod';

export const createListeningEventSchema = z.object({
  songId: z
    .string({ required_error: 'Song ID is required' })
    .trim()
    .min(1, 'Song ID cannot be empty'),

  eventType: z.enum(['play', 'complete', 'skip', 'pause'], {
    errorMap: () => ({
      message: "Event type must be one of: 'play', 'complete', 'skip', 'pause'",
    }),
  }),

  timestamp: z
    .string()
    .datetime({ message: 'Timestamp must be a valid ISO 8601 string' })
    .optional(),

  playback: z
    .object({
      positionSeconds: z
        .number()
        .min(0, 'Position cannot be negative')
        .max(86400, 'Position cannot exceed 24 hours')
        .default(0),
      durationSeconds: z
        .number()
        .min(0, 'Duration cannot be negative')
        .max(86400, 'Duration cannot exceed 24 hours')
        .default(0),
      completionPercent: z
        .number()
        .min(0, 'Completion percentage cannot be negative')
        .max(100, 'Completion percentage cannot exceed 100')
        .optional(),
      playbackSpeed: z.number().min(0.25).max(4.0).default(1.0).optional(),
    })
    .optional(),

  context: z
    .object({
      sessionId: z.string().trim().max(100).optional(),
      timeOfDay: z
        .enum(['morning', 'afternoon', 'evening', 'late_night', 'night', 'unknown'])
        .optional(),
      dayOfWeek: z
        .enum([
          'monday',
          'tuesday',
          'wednesday',
          'thursday',
          'friday',
          'saturday',
          'sunday',
          'unknown',
        ])
        .optional(),
      deviceType: z.string().trim().max(50).optional(),
    })
    .optional(),

  recommendation: z
    .object({
      recommendationRequestId: z.string().trim().max(100).optional(),
      recommendationStrategy: z.string().trim().max(50).optional(),
      recommendationPosition: z.number().min(0).max(100).optional(),
    })
    .optional(),
});

export type CreateListeningEventInput = z.infer<typeof createListeningEventSchema>;
