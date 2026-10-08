/**
 * Stage 6: Centralized Configuration for User Taste Profile Computation
 * All behavioral weights, mathematical decay factors, and threshold constants are maintained here.
 */
export const TASTE_PROFILE_CONFIG = {
  // Base event signal weights (Section 6 & 7)
  eventWeights: {
    complete: 1.0,
    play: 0.1,
    pause: 0.05,
    skip: -0.75,
  },

  // Completion-based signal parameters (Section 8)
  completion: {
    // Engagement tiers based on completion percent (0-100)
    highThreshold: 90, // >= 90% strong engagement
    moderateThreshold: 50, // 50-89% moderate engagement
    briefThreshold: 10, // < 10% brief dwell / superficial
    // Multiplier for play events based on completion ratio
    playCompletionScale: 0.4,
  },

  // Recency decay parameters (Section 9)
  // Exponential decay model: recencyFactor = e^(-lambda * ageInDays)
  // lambda = 0.05 yields a half-life of ln(2)/0.05 ≈ 13.86 days.
  // Events older than 60 days naturally attenuate toward near-zero weight.
  recency: {
    decayLambda: 0.05,
  },

  // Temporal window definitions (Section 10 & 11)
  windows: {
    recentDays: 30, // Last 30 days defines "recent" taste
    longTermDays: 365, // Up to 365 days for long-term historical profile
  },

  // Cardinality boundaries (Section 17 & 18)
  limits: {
    topGenres: 15,
    topArtists: 10,
    topLanguages: 5,
  },

  // Trend detection sensitivity (Section 12)
  trends: {
    risingThreshold: 0.05, // delta > +0.05 is 'rising'
    decliningThreshold: -0.05, // delta < -0.05 is 'declining'
  },

  // Cold start & confidence calibration thresholds (Section 27 & 28)
  confidence: {
    minEventsForFull: 50,
    minUniqueSongsForFull: 20,
    minCompletedForFull: 10,
  },

  // Profile schema version (Section 29)
  profileVersion: 1,
} as const;

export type TasteProfileConfig = typeof TASTE_PROFILE_CONFIG;
