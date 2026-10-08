/**
 * Stage 10: Centralized Configuration for Explainable User-Based Collaborative Filtering
 * 
 * Defines mathematical event weights, similarity thresholds, cold-start boundaries,
 * R5 hybrid blend weights, popularity dampening, and staleness parameters.
 */

export const COLLABORATIVE_CONFIG = {
  // Base event signal weights for interaction scoring (Section 4)
  // Consistent with Stage 6/7 listening event weights
  eventWeights: {
    complete: 1.0,
    play: 0.10,
    pause: 0.05,
    skip: -0.75,
  },

  // Completion percentage scaling
  completionScale: 0.4,

  // User-Song interaction score clamping bounds
  interactionScoreBounds: {
    min: -1.0,
    max: 10.0,
    // Minimum interaction score to consider a song "positively engaged" for collaborative candidates
    positiveEngagementThreshold: 0.20,
    // Threshold above which target user has already "consumed" the song
    heavilyConsumedThreshold: 1.5,
  },

  // Similar user discovery parameters (Section 6 & 7)
  similarity: {
    // Minimum number of distinct songs both users must have interacted with
    minimumCommonSongs: 2,
    // Minimum cosine similarity to qualify as a similar neighbor
    minimumSimilarity: 0.10,
    // Maximum number of similar neighbors to consider for recommendations
    maximumSimilarUsers: 20,
  },

  // Cold start & Confidence parameters (Section 12 & 13)
  coldStart: {
    // Minimum distinct positive interactions before a user can have collaborative personalization
    minUserInteractions: 3,
    // Threshold of common overlapping interactions for full confidence
    interactionsForFullConfidence: 10,
    // Number of similar users required for full neighbor confidence
    similarUsersForFullConfidence: 5,
  },

  // Cache & Staleness handling (Section 8 & 27)
  cache: {
    // Number of hours before materialized similarity is considered stale
    stalenessHours: 24,
    // Profile schema version for cache invalidation
    version: 1,
  },

  // Popularity Bias Mitigation (Section 17)
  popularityBias: {
    // Inverse popularity dampening exponent: score / (1 + pop * weight)
    enabled: true,
    dampingFactor: 0.35,
  },

  // R5 Collaborative Hybrid Strategy Composite Weights (Sum = 1.00) (Section 11)
  // Starting baseline configuration:
  // content: 0.25, behaviour: 0.20, context: 0.10, mood: 0.10, collaborative: 0.20, popularity: 0.10, novelty: 0.05
  r5Weights: {
    content: 0.25,
    behaviour: 0.20,
    context: 0.10,
    mood: 0.10,
    collaborative: 0.20,
    popularity: 0.10,
    novelty: 0.05,
  },

  // Standalone collaborative strategy candidate limits
  candidateLimits: {
    maxSimilarUsersToQuery: 15,
    maxCandidatesFromNeighbors: 50,
    maxSongsPerNeighbor: 5,
  },
} as const;

export type CollaborativeConfig = typeof COLLABORATIVE_CONFIG;
