import { IMusicProvider } from '../../providers/IMusicProvider.js';
import {
  ProviderTrack,
  ProviderArtist,
  ProviderAlbum,
  ProviderSearchResult,
  StreamInfo,
} from '../../providers/types.js';
import { Song, Artist, Album } from '../../models/index.js';
import { getDatabaseState } from '../../config/database.js';

export interface CatalogueTrackDto {
  id: string; // Mongo _id or provider track ID
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
}

export interface CatalogueSearchResultDto {
  query: string;
  tracks: CatalogueTrackDto[];
  artists: ProviderArtist[];
  albums: ProviderAlbum[];
  totalResults: number;
}

export class MusicCatalogueService {
  constructor(private readonly provider: IMusicProvider) {}

  /**
   * Persists or updates a provider track into MongoDB if database is active.
   * Ensures artist and album deduplication.
   */
  public async persistTrack(providerTrack: ProviderTrack): Promise<CatalogueTrackDto> {
    const dbState = getDatabaseState();

    // If database is not connected (degraded mode), return normalized in-memory DTO directly
    if (!dbState.isConnected) {
      return {
        id: providerTrack.providerTrackId,
        title: providerTrack.title,
        artistName: providerTrack.artistName,
        albumTitle: providerTrack.albumTitle,
        durationSeconds: providerTrack.durationSeconds,
        artworkUrl: providerTrack.artworkUrl,
        streamUrl: providerTrack.streamUrl,
        genres: providerTrack.genres,
        languages: providerTrack.languages,
        provider: providerTrack.provider,
        providerTrackId: providerTrack.providerTrackId,
      };
    }

    try {
      // 1. Deduplicate or Create Artist
      let artistDoc = await Artist.findOne({ name: providerTrack.artistName });
      if (!artistDoc) {
        artistDoc = await Artist.create({
          name: providerTrack.artistName,
          imageUrl: providerTrack.artworkUrl,
          genres: providerTrack.genres,
          languages: providerTrack.languages,
          metadata: {
            externalUrls: {
              jamendo: `https://www.jamendo.com/artist/${providerTrack.providerArtistId}`,
            },
          },
        });
      }

      // 2. Deduplicate or Create Album (if present)
      let albumDoc = null;
      if (providerTrack.albumTitle && providerTrack.albumTitle.trim().length > 0) {
        albumDoc = await Album.findOne({
          title: providerTrack.albumTitle,
          artistIds: artistDoc._id,
        });

        if (!albumDoc) {
          albumDoc = await Album.create({
            title: providerTrack.albumTitle,
            artistIds: [artistDoc._id],
            artworkUrl: providerTrack.artworkUrl,
            genres: providerTrack.genres,
          });
        }
      }

      // 3. Deduplicate or Upsert Song
      let songDoc = await Song.findOne({
        provider: providerTrack.provider,
        providerTrackId: providerTrack.providerTrackId,
      });

      if (!songDoc) {
        songDoc = await Song.create({
          title: providerTrack.title,
          artistIds: [artistDoc._id],
          albumId: albumDoc?._id,
          genres: providerTrack.genres,
          languages: providerTrack.languages,
          durationSeconds: providerTrack.durationSeconds,
          artworkUrl: providerTrack.artworkUrl,
          provider: providerTrack.provider,
          providerTrackId: providerTrack.providerTrackId,
          metadata: {
            speed: providerTrack.metadata?.speed,
            vocalInstrumental: providerTrack.metadata?.vocalInstrumental,
          },
        });
      } else {
        // Refresh artwork or duration if missing
        if (!songDoc.artworkUrl && providerTrack.artworkUrl) {
          songDoc.artworkUrl = providerTrack.artworkUrl;
          await songDoc.save();
        }
      }

      return {
        id: songDoc._id.toString(),
        title: songDoc.title,
        artistId: artistDoc._id.toString(),
        artistName: artistDoc.name,
        albumId: albumDoc?._id.toString(),
        albumTitle: albumDoc?.title || providerTrack.albumTitle,
        durationSeconds: songDoc.durationSeconds,
        artworkUrl: songDoc.artworkUrl || providerTrack.artworkUrl,
        streamUrl: providerTrack.streamUrl,
        genres: songDoc.genres,
        languages: songDoc.languages || [],
        provider: songDoc.provider,
        providerTrackId: songDoc.providerTrackId || providerTrack.providerTrackId,
      };
    } catch (err) {
      console.error('[MusicCatalogueService] Error persisting track to database:', err);
      // Fallback cleanly to in-memory representation
      return {
        id: providerTrack.providerTrackId,
        title: providerTrack.title,
        artistName: providerTrack.artistName,
        albumTitle: providerTrack.albumTitle,
        durationSeconds: providerTrack.durationSeconds,
        artworkUrl: providerTrack.artworkUrl,
        streamUrl: providerTrack.streamUrl,
        genres: providerTrack.genres,
        languages: providerTrack.languages,
        provider: providerTrack.provider,
        providerTrackId: providerTrack.providerTrackId,
      };
    }
  }

  /**
   * Searches tracks, artists, and albums from the provider and persists the tracks.
   */
  public async search(
    query: string,
    limit = 20,
    offset = 0
  ): Promise<CatalogueSearchResultDto> {
    const rawResult: ProviderSearchResult = await this.provider.searchTracks(
      query,
      limit,
      offset
    );

    // Persist discovered tracks in parallel (controlled limit)
    const persistedTracks: CatalogueTrackDto[] = await Promise.all(
      rawResult.tracks.map((track) => this.persistTrack(track))
    );

    return {
      query: rawResult.query,
      tracks: persistedTracks,
      artists: rawResult.artists,
      albums: rawResult.albums,
      totalResults: rawResult.totalResults,
    };
  }

  /**
   * Retrieves popular tracks and caches them locally.
   */
  public async getPopularTracks(limit = 20): Promise<CatalogueTrackDto[]> {
    const rawTracks = await this.provider.getPopularTracks(limit);
    return Promise.all(rawTracks.map((track) => this.persistTrack(track)));
  }

  /**
   * Retrieves single track by Mongo ObjectId or providerTrackId.
   */
  public async getTrackById(identifier: string): Promise<CatalogueTrackDto | null> {
    const dbState = getDatabaseState();

    if (dbState.isConnected) {
      // Try Mongo ObjectId or providerTrackId lookup
      let songDoc = null;
      if (identifier.match(/^[0-9a-fA-F]{24}$/)) {
        songDoc = await Song.findById(identifier).populate('artistIds').populate('albumId');
      }
      if (!songDoc) {
        songDoc = await Song.findOne({ providerTrackId: identifier });
      }

      if (songDoc) {
        // Resolve stream URL from provider
        let streamUrl: string | undefined;
        if (songDoc.providerTrackId) {
          const streamInfo = await this.provider.getStreamUrl(songDoc.providerTrackId).catch(() => null);
          streamUrl = streamInfo?.streamUrl;
        }

        const artistDoc = await Artist.findById(songDoc.artistIds[0]);
        const albumDoc = songDoc.albumId ? await Album.findById(songDoc.albumId) : null;

        return {
          id: songDoc._id.toString(),
          title: songDoc.title,
          artistId: artistDoc?._id.toString(),
          artistName: artistDoc?.name || 'Unknown Artist',
          albumId: albumDoc?._id.toString(),
          albumTitle: albumDoc?.title,
          durationSeconds: songDoc.durationSeconds,
          artworkUrl: songDoc.artworkUrl,
          streamUrl,
          genres: songDoc.genres,
          languages: songDoc.languages || [],
          provider: songDoc.provider,
          providerTrackId: songDoc.providerTrackId || identifier,
        };
      }
    }

    // Query external provider directly if not in database
    const providerTrack = await this.provider.getTrack(identifier);
    if (!providerTrack) {
      return null;
    }

    return this.persistTrack(providerTrack);
  }

  /**
   * Obtains a direct playable audio stream URL.
   */
  public async getStreamUrl(identifier: string): Promise<StreamInfo | null> {
    let providerTrackId = identifier;

    // Check if identifier is a Mongo ObjectId
    if (identifier.match(/^[0-9a-fA-F]{24}$/) && getDatabaseState().isConnected) {
      const songDoc = await Song.findById(identifier);
      if (songDoc?.providerTrackId) {
        providerTrackId = songDoc.providerTrackId;
      }
    }

    return this.provider.getStreamUrl(providerTrackId);
  }

  /**
   * Retrieves artist metadata.
   */
  public async getArtistById(identifier: string): Promise<ProviderArtist | null> {
    if (identifier.match(/^[0-9a-fA-F]{24}$/) && getDatabaseState().isConnected) {
      const artistDoc = await Artist.findById(identifier);
      if (artistDoc) {
        return {
          providerArtistId: artistDoc._id.toString(),
          name: artistDoc.name,
          imageUrl: artistDoc.imageUrl,
          genres: artistDoc.genres,
          languages: artistDoc.languages,
          bio: artistDoc.metadata?.bio,
          country: artistDoc.metadata?.country,
        };
      }
    }

    return this.provider.getArtist(identifier);
  }

  /**
   * Retrieves album metadata.
   */
  public async getAlbumById(identifier: string): Promise<ProviderAlbum | null> {
    if (identifier.match(/^[0-9a-fA-F]{24}$/) && getDatabaseState().isConnected) {
      const albumDoc = await Album.findById(identifier);
      if (albumDoc) {
        const artist = await Artist.findById(albumDoc.artistIds[0]);
        return {
          providerAlbumId: albumDoc._id.toString(),
          title: albumDoc.title,
          providerArtistId: artist?._id.toString() || '',
          artistName: artist?.name || 'Unknown Artist',
          artworkUrl: albumDoc.artworkUrl,
          releaseDate: albumDoc.releaseDate?.toISOString(),
          genres: albumDoc.genres,
        };
      }
    }

    return this.provider.getAlbum(identifier);
  }
}
