export type NavTabId = 'home' | 'discover' | 'photo-music' | 'library' | 'profile';

export interface NavItem {
  id: NavTabId;
  label: string;
  path: string;
  iconName: 'Home' | 'Compass' | 'Camera' | 'Library' | 'User';
}

export interface HealthResponse {
  status: 'ok';
  service: string;
  timestamp?: string;
  environment?: string;
  database?: 'connected' | 'disconnected';
}

export interface TrackMetadata {
  id: string;
  title: string;
  artist: string;
  album?: string;
  coverUrl?: string;
  durationSeconds?: number;
  streamUrl?: string;
  provider?: string;
  providerTrackId?: string;
}

export interface TrackItem {
  id: string;
  title: string;
  artistId?: string;
  artistName: string;
  albumId?: string;
  albumTitle?: string;
  durationSeconds: number;
  artworkUrl?: string;
  streamUrl?: string;
  genres?: string[];
  languages?: string[];
  provider: string;
  providerTrackId: string;
}

export interface ArtistItem {
  providerArtistId: string;
  name: string;
  imageUrl?: string;
  genres?: string[];
  bio?: string;
  country?: string;
}

export interface AlbumItem {
  providerAlbumId: string;
  title: string;
  providerArtistId: string;
  artistName: string;
  artworkUrl?: string;
  releaseDate?: string;
  genres?: string[];
}

export interface MusicSearchResults {
  query: string;
  tracks: TrackItem[];
  artists: ArtistItem[];
  albums: AlbumItem[];
  totalResults: number;
}

export interface StreamResponse {
  providerTrackId: string;
  streamUrl: string;
  format: string;
}

export interface RecommendationMetadata {
  id: string;
  title: string;
  subtitle: string;
  reason: string;
  confidenceScore?: number;
  tags?: string[];
}

export type StageIndicator = {
  stageNumber: number;
  stageName: string;
  isImplemented: boolean;
};

export interface SafeUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  user: SafeUser;
  message?: string;
}

export interface SignupData {
  name: string;
  email: string;
  password: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export type ListeningEventType = 'play' | 'complete' | 'skip' | 'pause';

export interface ListeningEventPayload {
  songId: string;
  eventType: ListeningEventType;
  timestamp?: string;
  playback?: {
    positionSeconds: number;
    durationSeconds: number;
    completionPercent?: number;
    playbackSpeed?: number;
  };
  context?: {
    sessionId?: string;
    timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'late_night' | 'night' | 'unknown';
    dayOfWeek?: string;
    deviceType?: string;
  };
  metadata?: {
    recommendationRequestId?: string;
    recommendationStrategy?: string;
    recommendationPosition?: number;
    [key: string]: unknown;
  };
}

export interface ListeningEventResponse {
  status: 'ok';
  data: {
    id: string;
    userId: string;
    songId: string;
    eventType: ListeningEventType;
    timestamp: string;
  };
}

export interface UserTasteProfileDto {
  userId: string;
  profileVersion: number;
  profileConfidence: number;
  longTerm: {
    genres: Array<{ genre: string; score: number }>;
    artists: Array<{ artistId: string; artistName?: string; score: number }>;
    languages: Array<{ language: string; score: number }>;
    audioFeatures: {
      energy?: number;
      danceability?: number;
      valence?: number;
      tempo?: number;
      acousticness?: number;
      instrumentalness?: number;
    };
  };
  recent: {
    genres: Array<{ genre: string; score: number }>;
    artists: Array<{ artistId: string; artistName?: string; score: number }>;
    languages: Array<{ language: string; score: number }>;
    audioFeatures: {
      energy?: number;
      danceability?: number;
      valence?: number;
      tempo?: number;
      acousticness?: number;
      instrumentalness?: number;
    };
  };
  trends: {
    genres: Array<{ genre: string; delta: number; direction: 'rising' | 'declining' | 'stable' }>;
  };
  behaviour: {
    totalEvents: number;
    playCount: number;
    pauseCount: number;
    skipCount: number;
    completeCount: number;
    skipRate: number;
    completionRate: number;
    averageCompletionPercent: number;
    totalListeningDurationSeconds: number;
  };
  context: {
    timeOfDay: Record<string, number>;
    dayOfWeek: Record<string, number>;
  };
  metadata: {
    calculatedAt: string;
    eventCountUsed: number;
    uniqueSongsCount: number;
    uniqueArtistsCount: number;
    recentWindowDays: number;
  };
}

export interface TasteProfileResponse {
  status: 'ok';
  data: UserTasteProfileDto;
}

export interface RecommendationItemDto {
  song: TrackItem;
  score: number;
  reason: string;
  reasonType: 'genre' | 'artist' | 'audioFeature' | 'recentTaste' | 'context' | 'popularity' | 'novelty' | 'mood' | 'collaborative';
  components?: {
    popularity: number;
    content: number;
    behaviour: number;
    context: number;
    mood?: number;
    novelty: number;
    collaborative?: number;
  };
}

export interface RecommendationResultDto {
  strategy: 'popularity' | 'content' | 'behaviour' | 'context' | 'hybrid' | 'collaborative' | 'collaborativeHybrid';
  generatedAt: string;
  recommendations: RecommendationItemDto[];
  confidence: number;
  totalCandidatesEvaluated: number;
  activeMood?: string;
  recommendationRequestId?: string;
}

export interface RecommendationResponse {
  success: boolean;
  data: RecommendationResultDto;
}

export interface PersonalizationSettings {
  explorationLevel: number; // 0 (familiar) to 1 (exploratory)
  diversityLevel: number;   // 0 (focused) to 1 (diverse)
}

export interface UserPreferenceDto {
  preferredGenres: string[];
  preferredArtists: string[];
  preferredLanguages: string[];
  dislikedGenres: string[];
  dislikedArtists: string[];
  preferredEnergy: number;
  preferredMood?: string;
  favoriteGenres: string[];
  favoriteArtists: string[];
  personalizationSettings: PersonalizationSettings;
  updatedAt?: string;
}

export interface UpdatePreferencesInput {
  preferredGenres?: string[];
  preferredArtists?: string[];
  preferredLanguages?: string[];
  dislikedGenres?: string[];
  dislikedArtists?: string[];
  preferredEnergy?: number;
  preferredMood?: string | null;
  personalizationSettings?: Partial<PersonalizationSettings>;
}

export interface PreferenceResponse {
  success: boolean;
  data: UserPreferenceDto;
}

export interface UserListeningAnalyticsDto {
  totalPlays: number;
  completedTracks: number;
  skippedTracks: number;
  completionRate: number;
  skipRate: number;
  averageCompletionPercent: number;
  listeningMinutes: number;
  uniqueSongs: number;
  uniqueArtists: number;
  topArtists: Array<{ artistId: string; name: string; playCount: number }>;
  topGenres: Array<{ genre: string; playCount: number }>;
  timeOfDayDistribution: Record<string, number>;
  dayOfWeekDistribution: Record<string, number>;
  recentActivity: Array<{
    songId: string;
    title: string;
    artistName: string;
    eventType: string;
    timestamp: string;
    completionPercent?: number;
  }>;
}

export interface RecommendationAnalyticsDto {
  recommendationImpressions: number;
  recommendationPlays: number;
  playThroughRate: number;
  recommendationCompletionRate: number;
  recommendationSkipRate: number;
  averagePositionBeforePlay: number;
  strategyDistribution: Record<string, number>;
  moodPerformance: Record<string, { impressions: number; plays: number; ctr: number }>;
  topRecommendedSongs: Array<{ songId: string; title: string; artistName: string; impressions: number }>;
  topClickedRecommendations: Array<{ songId: string; title: string; artistName: string; plays: number }>;
}

export interface RecordImpressionItem {
  songId: string;
  strategy: string;
  recommendationScore: number;
  position: number;
  mood?: string;
  sessionId?: string;
  recommendationRequestId: string;
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
  evaluatedAt: string;
  k: number;
  eligibleUsersCount: number;
  insufficientData: boolean;
  message?: string;
  strategies: Record<string, OfflineEvaluationResultDto>;
  notes: string[];
}

export interface FeedbackSummaryDto {
  moodFeedback: {
    totalRatings: number;
    averageScore: number;
    byMood: Record<string, { count: number; averageRating: number }>;
  };
  explanationFeedback: {
    totalRatings: number;
    averageScore: number;
    byReasonType: Record<string, { count: number; averageRating: number }>;
  };
}

// ==========================================
// STAGE 12 PRODUCT EXPERIENCE & LIBRARY TYPES
// ==========================================

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

export interface PlaylistDetailDto extends PlaylistSummaryDto {
  songs: TrackItem[];
}

export interface CreatePlaylistInput {
  name: string;
  description?: string;
  isPublic?: boolean;
}

export interface UpdatePlaylistInput {
  name?: string;
  description?: string;
  isPublic?: boolean;
}

export interface LibrarySummaryDto {
  likedCount: number;
  playlistsCount: number;
  recentlyPlayedCount: number;
}

export interface HistoryItem {
  song: TrackItem;
  playedAt: string;
  eventType: string;
  completionPercent?: number;
}

// ==========================================
// COUNTERFACTUAL WHAT-IF RECOMMENDATION LAB INTERFACES
// ==========================================

export interface CounterfactualWeightsDto {
  content: number;
  behaviour: number;
  context: number;
  collaborative: number;
  popularity: number;
  novelty: number;
  mood?: number;
}

export type RankShiftStatus =
  | 'entered_top_k'
  | 'left_top_k'
  | 'moved_up'
  | 'moved_down'
  | 'unchanged'
  | 'outside_top_k';

export interface ScoreComponentContribution {
  baseline: number;
  counterfactual: number;
  delta: number;
  weightBaseline: number;
  weightCounterfactual: number;
  weightDelta: number;
  scoreImpact: number;
}

export interface DominantDriverDto {
  component: string;
  weightDelta: number;
  componentScore: number;
  scoreImpact: number;
  direction: 'helped' | 'hurt' | 'neutral';
  description: string;
}

export interface RankShiftItemDto {
  song: TrackItem;
  baselineRank: number | null;
  counterfactualRank: number | null;
  rankDelta: number;
  status: RankShiftStatus;
  baselineScore: number;
  counterfactualScore: number;
  scoreDelta: number;
  baselineComponents: Record<string, number>;
  counterfactualComponents: Record<string, number>;
  componentDeltas: Record<string, number>;
  componentContributions?: Record<string, ScoreComponentContribution>;
  baselineReason: string;
  counterfactualReason: string;
  dominantDriver: DominantDriverDto;
  explanation: string;
}

export interface CounterfactualAnalysisSummaryDto {
  totalCandidatesEvaluated: number;
  k: number;
  enteredTopK: number;
  leftTopK: number;
  rankDisplacementSum: number;
  meanRankDisplacement: number;
  rankBiasedOverlap: number;
  topKOverlapCount: number;
  isIdentical: boolean;
}

export interface SensitivityDimensionDto {
  dimension: string;
  currentWeight: number;
  plusStepRankDelta: number;
  minusStepRankDelta: number;
  gradient: number;
  sensitivityRating: 'high' | 'medium' | 'low';
}

export interface MinimalChangeRecourseDto {
  targetSongId: string;
  targetSongTitle: string;
  targetRank: number;
  achievable: boolean;
  currentRank: number | null;
  minimalWeights?: CounterfactualWeightsDto;
  weightDeltas?: Record<string, number>;
  l1Distance?: number;
  explanation: string;
}

export interface CounterfactualSimulationRequestDto {
  weights?: Partial<CounterfactualWeightsDto>;
  context?: {
    timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'late_night';
    dayOfWeek?: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
    mood?: string;
  };
  mood?: string;
  limit?: number;
  applyDiversity?: boolean;
  targetSongId?: string;
  targetRank?: number;
  applyConfidenceDampening?: boolean;
}

export interface CounterfactualSimulationResponseDto {
  experimentId: string;
  algorithmVersion: string;
  generatedAt: string;
  baselineWeights: CounterfactualWeightsDto;
  counterfactualWeights: CounterfactualWeightsDto;
  normalizedBaselineWeights: CounterfactualWeightsDto;
  normalizedCounterfactualWeights: CounterfactualWeightsDto;
  baselineContext: {
    timeOfDay: string;
    dayOfWeek: string;
    mood?: string;
  };
  counterfactualContext: {
    timeOfDay: string;
    dayOfWeek: string;
    mood?: string;
  };
  baselineRecommendations: any[];
  counterfactualRecommendations: any[];
  rankShifts: RankShiftItemDto[];
  summary: CounterfactualAnalysisSummaryDto;
  sensitivityAnalysis?: SensitivityDimensionDto[];
  recourseResult?: MinimalChangeRecourseDto;
}
