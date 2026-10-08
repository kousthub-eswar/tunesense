import {
  ProviderTrack,
  ProviderArtist,
  ProviderAlbum,
  ProviderSearchResult,
  StreamInfo,
} from './types.js';

/**
 * IMusicProvider defines the vendor-neutral music interface for TuneSense.
 * Any external music service (Jamendo, future providers) must implement this contract.
 */
export interface IMusicProvider {
  /**
   * Unique identifier name for this provider (e.g., 'jamendo').
   */
  readonly name: string;

  /**
   * Searches the provider catalog for tracks, artists, and albums matching a text query.
   */
  searchTracks(query: string, limit?: number, offset?: number): Promise<ProviderSearchResult>;

  /**
   * Retrieves single track metadata by its provider-specific ID.
   */
  getTrack(providerTrackId: string): Promise<ProviderTrack | null>;

  /**
   * Retrieves single artist metadata by provider-specific artist ID.
   */
  getArtist(providerArtistId: string): Promise<ProviderArtist | null>;

  /**
   * Retrieves single album metadata by provider-specific album ID.
   */
  getAlbum(providerAlbumId: string): Promise<ProviderAlbum | null>;

  /**
   * Obtains a direct, playable audio stream URL for a given track ID.
   */
  getStreamUrl(providerTrackId: string): Promise<StreamInfo | null>;

  /**
   * Retrieves popular / featured tracks from the provider catalog for initial browsing.
   */
  getPopularTracks(limit?: number): Promise<ProviderTrack[]>;
}
