// ==========================================
// PROVIDER-NEUTRAL DOMAIN TYPES
// ==========================================

export interface ProviderArtist {
  providerArtistId: string;
  name: string;
  imageUrl?: string;
  genres: string[];
  languages?: string[];
  bio?: string;
  country?: string;
  website?: string;
}

export interface ProviderAlbum {
  providerAlbumId: string;
  title: string;
  providerArtistId: string;
  artistName: string;
  artworkUrl?: string;
  releaseDate?: string;
  genres: string[];
}

export interface ProviderTrackMetadata {
  tempo?: number;
  energy?: number;
  danceability?: number;
  valence?: number;
  acousticness?: number;
  instrumentalness?: number;
  key?: string;
  mode?: number;
  vocalInstrumental?: 'vocal' | 'instrumental';
  speed?: string;
}

export interface ProviderTrack {
  providerTrackId: string;
  title: string;
  providerArtistId: string;
  artistName: string;
  providerAlbumId?: string;
  albumTitle?: string;
  durationSeconds: number;
  artworkUrl?: string;
  streamUrl?: string;
  downloadUrl?: string;
  licenseUrl?: string;
  genres: string[];
  languages: string[];
  metadata?: ProviderTrackMetadata;
  provider: string; // e.g. 'jamendo'
}

export interface ProviderSearchResult {
  query: string;
  tracks: ProviderTrack[];
  artists: ProviderArtist[];
  albums: ProviderAlbum[];
  totalResults: number;
}

export interface StreamInfo {
  providerTrackId: string;
  streamUrl: string;
  format: string; // e.g. 'mp32' / 'mp3'
  bitrate?: number;
  expiresAt?: string;
}

// ==========================================
// RAW JAMENDO API RESPONSE TYPES (INTERNAL)
// ==========================================

export interface RawJamendoMusicInfo {
  vocalinstrumental?: 'vocal' | 'instrumental';
  lang?: string;
  gender?: string;
  acousticelectric?: string;
  speed?: string;
  tags?: {
    genres?: string[];
    instruments?: string[];
    vartags?: string[];
  };
}

export interface RawJamendoTrack {
  id: string;
  name: string;
  duration: number;
  artist_id: string;
  artist_name: string;
  artist_idstr?: string;
  album_name?: string;
  album_id?: string;
  license_ccurl?: string;
  position?: number;
  releasedate?: string;
  album_image?: string;
  image?: string;
  audio?: string;
  audiodownload?: string;
  waveform?: string;
  musicinfo?: RawJamendoMusicInfo;
}

export interface RawJamendoArtist {
  id: string;
  name: string;
  website?: string;
  joindate?: string;
  image?: string;
  shorturl?: string;
  shareurl?: string;
}

export interface RawJamendoAlbum {
  id: string;
  name: string;
  releasedate?: string;
  artist_id: string;
  artist_name: string;
  image?: string;
  zip?: string;
}

export interface RawJamendoResponse<T> {
  headers: {
    status: 'success' | 'failed';
    code: number;
    error_message: string;
    warnings: string;
    results_count: number;
    next?: string;
  };
  results: T[];
}
