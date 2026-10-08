import { Types } from 'mongoose';

// ==========================================
// API & SYSTEM RESPONSE INTERFACES
// ==========================================

export interface HealthCheckResponse {
  status: 'ok';
  service: 'tunesense-api';
  timestamp?: string;
  environment?: string;
  database?: 'connected' | 'disconnected';
}

export interface ApiErrorResponse {
  error: {
    message: string;
    code?: string;
    details?: unknown;
  };
}

// ==========================================
// CORE DOMAIN ENTITY INTERFACES (STAGE 2)
// ==========================================

/**
 * 1. User Domain Interface
 * Identity and profile representation.
 * NOTE: Authentication fields (passwords, tokens) are strictly deferred to Stage 3+.
 */
export interface IUser {
  _id: Types.ObjectId;
  displayName: string;
  email: string;
  passwordHash: string;
  role?: 'user' | 'admin';
  avatarUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SafeUserDto {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  createdAt?: string;
}

export interface AuthTokenPayload {
  sub: string;
}

/**
 * Audio / Musical features embedded in Song document.
 * Demonstrates controlled NoSQL flexibility for acoustic attributes.
 */
export interface ISongMetadata {
  tempo?: number;
  energy?: number;
  danceability?: number;
  valence?: number;
  acousticness?: number;
  instrumentalness?: number;
  key?: string;
  mode?: number;
}

/**
 * 2. Song Domain Interface
 * Represents a musical track independent of any specific music provider.
 */
export interface ISong {
  _id: Types.ObjectId;
  title: string;
  artistIds: Types.ObjectId[];
  albumId?: Types.ObjectId;
  genres: string[];
  languages?: string[];
  durationSeconds: number;
  artworkUrl?: string;
  provider: string;
  providerTrackId?: string;
  metadata?: ISongMetadata;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Artist additional biographical and external reference metadata.
 */
export interface IArtistMetadata {
  bio?: string;
  country?: string;
  externalUrls?: Record<string, string>;
}

/**
 * 3. Artist Domain Interface
 */
export interface IArtist {
  _id: Types.ObjectId;
  name: string;
  imageUrl?: string;
  genres: string[];
  languages?: string[];
  metadata?: IArtistMetadata;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 4. Album Domain Interface
 */
export interface IAlbum {
  _id: Types.ObjectId;
  title: string;
  artistIds: Types.ObjectId[];
  artworkUrl?: string;
  releaseDate?: Date;
  genres: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IPersonalizationSettings {
  explorationLevel: number; // [0, 1], default 0.5
  diversityLevel: number;   // [0, 1], default 0.7
}

/**
 * 5. UserPreference Domain Interface
 * Stores explicit user choices, negative preferences, and personalization settings.
 * Enforces a 1-to-1 relationship with User via unique index on userId.
 */
export interface IUserPreference {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  favoriteGenres: string[];
  preferredGenres: string[];
  favoriteArtists: Types.ObjectId[];
  preferredArtists: Types.ObjectId[];
  preferredLanguages: string[];
  dislikedGenres: string[];
  dislikedArtists: Types.ObjectId[];
  preferredEnergy?: number;
  preferredMood?: string;
  preferredMoods: string[];
  personalizationSettings: IPersonalizationSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPreferenceDto {
  userId: string;
  preferredGenres: string[];
  preferredArtists: string[];
  preferredLanguages: string[];
  dislikedGenres: string[];
  dislikedArtists: string[];
  preferredEnergy?: number;
  preferredMood?: string;
  personalizationSettings: IPersonalizationSettings;
  updatedAt: string;
}


/**
 * Permitted listening event types.
 */
export type ListeningEventType = 'play' | 'complete' | 'skip' | 'pause';

/**
 * Embedded contextual environment at the moment of interaction.
 */
export interface IListeningEventContext {
  timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'late_night' | 'night' | 'unknown';
  dayOfWeek?:
    | 'monday'
    | 'tuesday'
    | 'wednesday'
    | 'thursday'
    | 'friday'
    | 'saturday'
    | 'sunday'
    | 'unknown';
  sessionId?: string;
}

/**
 * Embedded telemetry details for listening behavior.
 */
export interface IListeningEventMetadata {
  dwellDurationSeconds?: number;
  completionRate?: number;
  positionSeconds?: number;
  durationSeconds?: number;
  completionPercent?: number;
  playbackSpeed?: number;
  deviceType?: string;
  recommendationRequestId?: string;
  recommendationStrategy?: string;
  recommendationPosition?: number;
}

/**
 * 6. ListeningEvent Domain Interface
 * Time-stamped user-music interaction logs.
 * Note: event timestamp is separate from document createdAt.
 */
export interface IListeningEvent {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  songId: Types.ObjectId;
  eventType: ListeningEventType;
  timestamp: Date;
  context?: IListeningEventContext;
  metadata?: IListeningEventMetadata;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Safe client-facing ListeningEvent representation
 */
export interface ListeningEventDto {
  id: string;
  userId: string;
  songId: string;
  eventType: ListeningEventType;
  timestamp: string;
  playback?: {
    positionSeconds?: number;
    durationSeconds?: number;
    completionPercent?: number;
  };
  context?: {
    sessionId?: string;
    timeOfDay?: string;
    dayOfWeek?: string;
    deviceType?: string;
  };
}

/**
 * Stage 6: User Taste Profile Domain Interfaces
 */

export interface IGenreAffinity {
  genre: string;
  score: number; // normalized [0, 1]
}

export interface IArtistAffinity {
  artistId: Types.ObjectId;
  artistName?: string;
  score: number; // normalized [0, 1]
}

export interface ILanguageAffinity {
  language: string;
  score: number; // normalized [0, 1]
}

export interface IAudioFeaturePreference {
  energy: number;
  danceability: number;
  valence: number;
  tempo: number;
  acousticness: number;
  instrumentalness: number;
}

export interface ITasteLayer {
  genres: IGenreAffinity[];
  artists: IArtistAffinity[];
  languages: ILanguageAffinity[];
  audioFeatures: Partial<IAudioFeaturePreference>;
}

export interface IGenreTrend {
  genre: string;
  delta: number;
  direction: 'rising' | 'declining' | 'stable';
}

export interface IBehaviouralMetrics {
  totalEvents: number;
  playCount: number;
  pauseCount: number;
  skipCount: number;
  completeCount: number;
  skipRate: number; // [0, 1]
  completionRate: number; // [0, 1]
  averageCompletionPercent: number; // [0, 100]
  totalListeningDurationSeconds: number;
}

export interface IContextDistribution {
  timeOfDay: Record<'morning' | 'afternoon' | 'evening' | 'late_night' | 'unknown', number>;
  dayOfWeek: Record<'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday' | 'unknown', number>;
}

export interface IUserTasteProfile {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  profileVersion: number;
  profileConfidence: number; // [0, 1]
  longTerm: ITasteLayer;
  recent: ITasteLayer;
  trends: {
    genres: IGenreTrend[];
  };
  behaviour: IBehaviouralMetrics;
  context: IContextDistribution;
  metadata: {
    calculatedAt: Date;
    eventCountUsed: number;
    uniqueSongsCount: number;
    uniqueArtistsCount: number;
    recentWindowDays: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface UserTasteProfileDto {
  userId: string;
  profileVersion: number;
  profileConfidence: number;
  longTerm: {
    genres: Array<{ genre: string; score: number }>;
    artists: Array<{ artistId: string; artistName?: string; score: number }>;
    languages: Array<{ language: string; score: number }>;
    audioFeatures: Partial<IAudioFeaturePreference>;
  };
  recent: {
    genres: Array<{ genre: string; score: number }>;
    artists: Array<{ artistId: string; artistName?: string; score: number }>;
    languages: Array<{ language: string; score: number }>;
    audioFeatures: Partial<IAudioFeaturePreference>;
  };
  trends: {
    genres: Array<{ genre: string; delta: number; direction: 'rising' | 'declining' | 'stable' }>;
  };
  behaviour: IBehaviouralMetrics;
  context: IContextDistribution;
  metadata: {
    calculatedAt: string;
    eventCountUsed: number;
    uniqueSongsCount: number;
    uniqueArtistsCount: number;
    recentWindowDays: number;
  };
}

/**
 * Stage 7: Recommendation Engine Types
 */
export * from '../services/recommendation/types.js';

/**
 * Stage 9: Analytics, Recommendation Evaluation, and Experimentation Types
 */

export interface IRecommendationImpression {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  songId: Types.ObjectId | string;
  strategy: string;
  recommendationScore: number;
  position: number;
  mood?: string;
  sessionId?: string;
  recommendationRequestId: string;
  generatedAt: Date;
  createdAt: Date;
}

export interface RecommendationImpressionDto {
  id: string;
  userId: string;
  songId: string;
  strategy: string;
  recommendationScore: number;
  position: number;
  mood?: string;
  recommendationRequestId: string;
  generatedAt: string;
}

export type EvaluationFeedbackType = 'mood' | 'explanation';

export interface IEvaluationFeedback {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  recommendationRequestId: string;
  feedbackType: EvaluationFeedbackType;
  rating: number; // 1 to 5
  mood?: string;
  songId?: Types.ObjectId | string;
  explanationText?: string;
  timestamp: Date;
  createdAt: Date;
}

export interface EvaluationFeedbackDto {
  id: string;
  userId: string;
  recommendationRequestId: string;
  feedbackType: EvaluationFeedbackType;
  rating: number;
  mood?: string;
  songId?: string;
  explanationText?: string;
  timestamp: string;
}

export interface UserListeningAnalyticsDto {
  totalPlays: number;
  completedTracks: number;
  skippedTracks: number;
  completionRate: number; // [0, 1]
  skipRate: number; // [0, 1]
  averageCompletionPercent: number; // [0, 100]
  listeningMinutes: number;
  uniqueSongs: number;
  uniqueArtists: number;
  uniqueGenres: number;
  topArtists: Array<{ artistId: string; artistName: string; playCount: number }>;
  topGenres: Array<{ genre: string; playCount: number }>;
  timeOfDayDistribution: Record<string, number>;
  dayOfWeekDistribution: Record<string, number>;
  recentActivity: Array<{
    date: string;
    playCount: number;
    completionCount: number;
  }>;
}

export interface RecommendationAnalyticsDto {
  totalImpressions: number;
  recommendationPlays: number;
  recommendationCompletions: number;
  recommendationSkips: number;
  playThroughRate: number; // recommendationPlays / totalImpressions
  completionRate: number; // recommendationCompletions / recommendationPlays
  skipRate: number; // recommendationSkips / recommendationPlays
  averagePosition: number;
  strategyDistribution: Record<string, number>;
  moodPerformance: Array<{
    mood: string;
    impressions: number;
    plays: number;
    playThroughRate: number;
  }>;
  topRecommendedSongs: Array<{
    songId: string;
    title?: string;
    impressions: number;
    plays: number;
  }>;
  topPlayedRecommendations: Array<{
    songId: string;
    title?: string;
    plays: number;
    completions: number;
  }>;
  collaborativeMetrics?: {
    collaborativeRecommendationRatio: number;
    collaborativePlayThroughRate: number;
    collaborativeCompletionRate: number;
    collaborativeNovelty: number;
    averageSupportCount: number;
    confidenceDistribution: Record<string, number>;
  };
}

export interface OfflineEvaluationResultDto {
  strategy: string;
  usersEvaluated: number;
  k: number;
  precisionAtK: number;
  recallAtK: number;
  hitRateAtK: number;
  ndcgAtK: number;
  diversity: number;
  novelty: number;
  catalogCoverage: number;
  collaborativeCoverage?: number;
  evaluatedAt: string;
  insufficientData?: boolean;
  message?: string;
}

export interface StrategyComparisonDto {
  k: number;
  trainDays: number;
  testDays: number;
  usersEvaluated: number;
  evaluatedAt: string;
  strategies: Record<string, OfflineEvaluationResultDto>;
  insufficientData?: boolean;
  message?: string;
}

// ==========================================
// STAGE 10 COLLABORATIVE FILTERING INTERFACES
// ==========================================

/**
 * Materialized sparse user-song interaction document.
 * Derived from raw ListeningEvent logs to accelerate recommendation queries
 * without repeatedly aggregating massive event history.
 */
export interface IUserSongInteraction {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  songId: Types.ObjectId;
  interactionScore: number;
  playCount: number;
  completionCount: number;
  skipCount: number;
  lastInteractionAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Materialized pairwise user similarity document.
 * Stores precomputed cosine similarity between users who share overlapping interactions.
 */
export interface IUserSimilarity {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  similarUserId: Types.ObjectId;
  similarity: number;
  commonSongs: number;
  calculatedAt: Date;
  profileVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SimilarUserCandidate {
  userId: string;
  similarity: number;
  commonSongs: number;
}

// ==========================================
// STAGE 12 PRODUCT EXPERIENCE & LIBRARY INTERFACES
// ==========================================

/**
 * UserLibrary Domain Interface
 * Stores references to user's liked songs and saved playlists.
 * Enforces 1-to-1 relationship with User via unique index on userId.
 */
export interface IUserLibrary {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  likedSongIds: Types.ObjectId[];
  savedPlaylistIds: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Playlist Domain Interface
 * User-created playlists storing ordered references to Song documents.
 */
export interface IPlaylist {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  name: string;
  description?: string;
  songIds: Types.ObjectId[];
  coverSongId?: Types.ObjectId;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlaylistSummaryDto {
  id: string;
  userId: string;
  name: string;
  description?: string;
  songCount: number;
  coverSongId?: string;
  coverArtworkUrl?: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PlaylistSongDto {
  id: string;
  title: string;
  artistName: string;
  durationSeconds: number;
  artworkUrl?: string;
  streamUrl?: string;
  provider: string;
  providerTrackId?: string;
  albumTitle?: string;
}

export interface PlaylistDetailDto extends PlaylistSummaryDto {
  songs: PlaylistSongDto[];
}

export interface LibrarySummaryDto {
  likedCount: number;
  playlistsCount: number;
  recentlyPlayedCount: number;
}

export interface HistoryItemDto {
  song: PlaylistSongDto;
  playedAt: string;
  eventType: string;
  completionPercent?: number;
}



