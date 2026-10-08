/**
 * Centralized Evaluation & Experimentation Configuration for TuneSense Stage 9.
 * Versioned benchmark hyperparameters for reproducible academic evaluation.
 */

export const EVALUATION_CONFIG = {
  version: '1.0.0',
  description: 'TuneSense Offline Recommendation Benchmark & Experimentation Suite',

  // Top-K ranking evaluation thresholds
  kValues: [5, 10] as const,

  // Temporal split defaults (prevents future information leakage)
  temporalSplit: {
    defaultTrainDays: 30,
    defaultTestDays: 7,
    minimumTrainingEvents: 3, // Minimum historical events required to include user in evaluation
    minimumTestEvents: 1,     // Minimum held-out events required to evaluate relevance
  },

  // Ground-truth relevance definition
  relevance: {
    // User interacted with the track during held-out test window
    requireInteraction: true,
    // Optional quality threshold: minimum completion percent to consider relevant
    minimumCompletionPercent: 30,
  },

  // Intra-List Diversity (ILD) configuration
  diversity: {
    metric: 'intra_list_dissimilarity',
    // Feature weights when comparing pairwise acoustic distance
    weights: {
      genre: 0.40,
      artist: 0.30,
      energy: 0.15,
      valence: 0.15,
    },
  },

  // Novelty exposure threshold
  novelty: {
    maxFamiliarityPlays: 5, // A song played >= 5 times has 0.0 novelty
  },

  // Cold-start evaluation thresholds
  coldStart: {
    zeroHistoryMaxEvents: 0,
    lowHistoryMaxEvents: 3,
    matureHistoryMinEvents: 10,
  },

  // Mood evaluation rating scale
  moodEvaluation: {
    minRating: 1,
    maxRating: 5,
    acceptableThreshold: 3.5, // >= 3.5 is considered a successful mood match
  },

  // Strategies evaluated in ablation studies
  strategies: [
    'popularity',
    'content',
    'behaviour',
    'context',
    'hybrid',
  ] as const,

  // Ablation modes
  ablations: [
    'ablation_no_mood',
    'ablation_no_context',
    'ablation_no_behaviour',
  ] as const,
};
