import { z } from 'zod';

/**
 * Standard pagination query validator schema for future list endpoints.
 */
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export * from './libraryValidators.js';
