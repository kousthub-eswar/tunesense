import { CatalogueTrackDto } from '../music/MusicCatalogueService.js';
import { IUserTasteProfile, ISongMetadata } from '../../types/index.js';


export type RecommendationStrategyType =
  | 'popularity'
  | 'content'
  | 'behaviour'
  | 'context'
  | 'hybrid'
  | 'collaborative'
  | 'collaborativeHybrid';

export type RecommendationReasonType =
  | 'genre'
  | 'artist'
  | 'audioFeature'
  | 'recentTaste'
  | 'context'
  | 'popularity'
  | 'novelty'
  | 'mood'
  | 'collaborative';

export interface ExplanationSignal {
  type: RecommendationReasonType;
  value?: string;
  strength: number; // Normalized [0, 1]
  description?: string;
  secondaryGenre?: string;
  supportingUsersCount?: number;
}

export interface ComponentScores {
  popularity: number;
  content: number;
  behaviour: number;
  context: number;
  mood?: number;
  novelty: number;
  collaborative?: number;
}

export interface CandidateSongEnriched {
  id: string;
  title: string;
  artistId?: string;
  artistName: string;
  albumId?: string;
  albumTitle?: string;
  durationSeconds: number;
  artworkUrl?: string;
  streamUrl?: string;
  genres: string[];
  languages: string[];
  provider: string;
  providerTrackId: string;
  metadata?: Partial<ISongMetadata>;
  playCount?: number;
  lastPlayedAt?: Date;
  collaborativeScore?: number;
  supportingSimilarUsers?: number;
}

export interface ScoredCandidate {
  song: CatalogueTrackDto;
  score: number; // Normalized [0, 1]
  components: ComponentScores;
  explanationSignal: ExplanationSignal;
  reason: string;
}

export interface RecommendationContext {
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'late_night';
  dayOfWeek: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  timestamp?: Date;
  mood?: string;
}

export interface RecommendationItemDto {
  song: CatalogueTrackDto;
  score: number;
  reason: string;
  reasonType: RecommendationReasonType;
  components?: ComponentScores;
}

export interface RecommendationResultDto {
  recommendationRequestId: string;
  strategy: RecommendationStrategyType;
  generatedAt: string;
  recommendations: RecommendationItemDto[];
  confidence: number;
  totalCandidatesEvaluated: number;
  activeMood?: string;
}


export interface IRecommendationStrategy {
  readonly name: RecommendationStrategyType;
  score(
    candidate: CandidateSongEnriched,
    context: RecommendationContext,
    profile: IUserTasteProfile | null,
    popularityMap: Map<string, number>,
    userPlayCounts: Map<string, number>
  ): { score: number; signal: ExplanationSignal };
}
