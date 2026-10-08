/**
 * Centralized configuration for TuneSense Stage 7 Recommendation Engine.
 * All numeric scoring weights, candidate limits, and diversity thresholds
 * are defined here to ensure transparency, reproducibility, and tunability.
 */

export const RECOMMENDATION_CONFIG = {
  // Hybrid Strategy Composite Weights (Sum = 1.00)
  hybridWeights: {
    content: 0.35,
    behaviour: 0.30,
    context: 0.20,
    popularity: 0.15,
  },

  // Hybrid Strategy Composite Weights with Active Mood (Sum = 1.00)
  hybridWithMoodWeights: {
    content: 0.30,
    behaviour: 0.25,
    context: 0.15,
    mood: 0.15,
    popularity: 0.15,
  },

  // Explicit Preference Weights
  explicitPreferences: {
    preferredGenreBonus: 0.15,
    dislikedPenaltyMultiplier: 0.05,
  },


  // Content Strategy Feature Weights (Sum = 1.00)
  contentWeights: {
    genre: 0.35,
    artist: 0.25,
    audioFeatures: 0.30,
    language: 0.10,
  },

  // Behavioural Personalization Blend Weights
  behaviourWeights: {
    longTermBlend: 0.60,
    recentBlend: 0.40,
    highCompletionBonus: 0.15,
    skipPenalty: 0.25,
  },

  // Context Awareness Sub-weights (Sum = 1.00)
  contextWeights: {
    timeOfDay: 0.65,
    dayOfWeek: 0.35,
    maxContextBoost: 0.25,
  },

  // Catalogue Popularity Aggregation Weights
  popularityWeights: {
    complete: 1.0,
    play: 0.30,
    pause: 0.05,
    skip: -0.75,
  },

  // Diversity & Catalog Coverage Constraints
  diversity: {
    maxPerArtist: 2,
    maxPerAlbum: 2,
    explorationRatio: 0.15, // 15% of slots reserved for exploration
    noveltyWeight: 0.10,    // Soft bonus for previously unheard candidates
  },

  // Candidate Generation Pool Limits
  candidateGeneration: {
    maxCandidates: 60,
    genreCandidateLimit: 20,
    recentCandidateLimit: 15,
    artistCandidateLimit: 15,
    popularCandidateLimit: 20,
    recentCompletionCooloffHours: 2, // Avoid re-recommending songs completed within last 2 hours
  },

  // Cold Start & Confidence Thresholds
  confidence: {
    lowConfidenceThreshold: 0.25, // Profiles below this switch to higher popularity/exploration
    highConfidenceThreshold: 0.70,
  },

  // Pagination / Result Limits
  limits: {
    defaultLimit: 10,
    maxLimit: 20,
    minLimit: 1,
  },
} as const;
