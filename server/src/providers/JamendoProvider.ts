import { config } from '../config/index.js';
import { IMusicProvider } from './IMusicProvider.js';
import {
  ProviderTrack,
  ProviderArtist,
  ProviderAlbum,
  ProviderSearchResult,
  StreamInfo,
  RawJamendoTrack,
  RawJamendoArtist,
  RawJamendoAlbum,
  RawJamendoResponse,
} from './types.js';

export class JamendoProvider implements IMusicProvider {
  public readonly name = 'jamendo';
  private readonly baseUrl = 'https://api.jamendo.com/v3.0';
  private readonly timeoutMs = 8000;

  private get clientId(): string {
    const id = config.jamendoClientId;
    if (!id || id.trim() === '') {
      throw new Error(
        'Jamendo API Client ID is not configured. Please set JAMENDO_CLIENT_ID in server/.env.'
      );
    }
    return id.trim();
  }

  /**
   * Internal fetch helper with timeout and standardized Jamendo response handling.
   */
  private async fetchJamendo<T>(
    endpoint: string,
    params: Record<string, string | number>
  ): Promise<RawJamendoResponse<T>> {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    url.searchParams.set('client_id', this.clientId);
    url.searchParams.set('format', 'jsonpretty');

    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, String(value));
    });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url.toString(), {
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Jamendo API HTTP error ${response.status}: ${response.statusText}`);
      }

      const data = (await response.json()) as RawJamendoResponse<T>;

      if (data.headers.status === 'failed') {
        const errorMsg = data.headers.error_message || 'Jamendo API request failed';
        throw new Error(`Jamendo API error (code ${data.headers.code}): ${errorMsg}`);
      }

      return data;
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error(`Jamendo API request timed out after ${this.timeoutMs}ms`);
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Normalizes a raw Jamendo track item into TuneSense ProviderTrack.
   */
  public normalizeTrack(raw: RawJamendoTrack): ProviderTrack {
    const genres = (raw.musicinfo?.tags?.genres || []).map((g) => g.trim().toLowerCase());
    const languages = raw.musicinfo?.lang ? [raw.musicinfo.lang.trim().toLowerCase()] : [];

    return {
      provider: this.name,
      providerTrackId: String(raw.id),
      title: raw.name.trim(),
      providerArtistId: String(raw.artist_id),
      artistName: raw.artist_name.trim(),
      providerAlbumId: raw.album_id ? String(raw.album_id) : undefined,
      albumTitle: raw.album_name ? raw.album_name.trim() : undefined,
      durationSeconds: Number(raw.duration) || 0,
      artworkUrl: raw.album_image || raw.image,
      streamUrl: raw.audio,
      downloadUrl: raw.audiodownload,
      licenseUrl: raw.license_ccurl,
      genres,
      languages,
      metadata: {
        vocalInstrumental: raw.musicinfo?.vocalinstrumental,
        speed: raw.musicinfo?.speed,
      },
    };
  }

  /**
   * Normalizes a raw Jamendo artist into TuneSense ProviderArtist.
   */
  public normalizeArtist(raw: RawJamendoArtist): ProviderArtist {
    return {
      providerArtistId: String(raw.id),
      name: raw.name.trim(),
      imageUrl: raw.image,
      genres: [],
      website: raw.website,
    };
  }

  /**
   * Normalizes a raw Jamendo album into TuneSense ProviderAlbum.
   */
  public normalizeAlbum(raw: RawJamendoAlbum): ProviderAlbum {
    return {
      providerAlbumId: String(raw.id),
      title: raw.name.trim(),
      providerArtistId: String(raw.artist_id),
      artistName: raw.artist_name.trim(),
      artworkUrl: raw.image,
      releaseDate: raw.releasedate,
      genres: [],
    };
  }

  /**
   * Searches tracks by query and extracts co-discovered artists and albums.
   */
  public async searchTracks(
    query: string,
    limit = 20,
    offset = 0
  ): Promise<ProviderSearchResult> {
    const cleanQuery = query.trim();
    if (!cleanQuery) {
      return {
        query: '',
        tracks: [],
        artists: [],
        albums: [],
        totalResults: 0,
      };
    }

    const data = await this.fetchJamendo<RawJamendoTrack>('/tracks/', {
      namesearch: cleanQuery,
      limit: Math.min(Math.max(limit, 1), 50),
      offset: Math.max(offset, 0),
      include: 'musicinfo',
      audioformat: 'mp32',
      order: 'relevance',
    });

    const tracks = data.results.map((raw) => this.normalizeTrack(raw));

    // Deduplicate discovered artists and albums from the track results
    const artistsMap = new Map<string, ProviderArtist>();
    const albumsMap = new Map<string, ProviderAlbum>();

    for (const raw of data.results) {
      if (!artistsMap.has(String(raw.artist_id))) {
        artistsMap.set(String(raw.artist_id), {
          providerArtistId: String(raw.artist_id),
          name: raw.artist_name.trim(),
          imageUrl: raw.album_image || raw.image,
          genres: (raw.musicinfo?.tags?.genres || []).map((g) => g.trim().toLowerCase()),
        });
      }

      if (raw.album_id && !albumsMap.has(String(raw.album_id))) {
        albumsMap.set(String(raw.album_id), {
          providerAlbumId: String(raw.album_id),
          title: (raw.album_name || 'Single').trim(),
          providerArtistId: String(raw.artist_id),
          artistName: raw.artist_name.trim(),
          artworkUrl: raw.album_image || raw.image,
          releaseDate: raw.releasedate,
          genres: (raw.musicinfo?.tags?.genres || []).map((g) => g.trim().toLowerCase()),
        });
      }
    }

    return {
      query: cleanQuery,
      tracks,
      artists: Array.from(artistsMap.values()),
      albums: Array.from(albumsMap.values()),
      totalResults: data.headers.results_count || tracks.length,
    };
  }

  /**
   * Retrieves popular tracks for browse/discover cold start.
   */
  public async getPopularTracks(limit = 20): Promise<ProviderTrack[]> {
    const data = await this.fetchJamendo<RawJamendoTrack>('/tracks/', {
      limit: Math.min(Math.max(limit, 1), 50),
      include: 'musicinfo',
      audioformat: 'mp32',
      order: 'popularity_total',
    });

    return data.results.map((raw) => this.normalizeTrack(raw));
  }

  /**
   * Retrieves a single track by provider track ID.
   */
  public async getTrack(providerTrackId: string): Promise<ProviderTrack | null> {
    const data = await this.fetchJamendo<RawJamendoTrack>('/tracks/', {
      id: providerTrackId,
      include: 'musicinfo',
      audioformat: 'mp32',
    });

    if (!data.results || data.results.length === 0) {
      return null;
    }

    return this.normalizeTrack(data.results[0]);
  }

  /**
   * Retrieves an artist by provider artist ID.
   */
  public async getArtist(providerArtistId: string): Promise<ProviderArtist | null> {
    const data = await this.fetchJamendo<RawJamendoArtist>('/artists/', {
      id: providerArtistId,
    });

    if (!data.results || data.results.length === 0) {
      return null;
    }

    return this.normalizeArtist(data.results[0]);
  }

  /**
   * Retrieves an album by provider album ID.
   */
  public async getAlbum(providerAlbumId: string): Promise<ProviderAlbum | null> {
    const data = await this.fetchJamendo<RawJamendoAlbum>('/albums/', {
      id: providerAlbumId,
    });

    if (!data.results || data.results.length === 0) {
      return null;
    }

    return this.normalizeAlbum(data.results[0]);
  }

  /**
   * Resolves a direct audio stream URL for a track.
   */
  public async getStreamUrl(providerTrackId: string): Promise<StreamInfo | null> {
    const track = await this.getTrack(providerTrackId);
    if (!track || !track.streamUrl) {
      return null;
    }

    return {
      providerTrackId,
      streamUrl: track.streamUrl,
      format: 'mp32',
    };
  }
}
