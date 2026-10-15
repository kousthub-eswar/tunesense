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

export const FALLBACK_CATALOGUE_TRACKS: CatalogueTrackDto[] = [
  {
    id: 'demo_track_01',
    providerTrackId: 'demo_track_01',
    title: 'Solar Flare Groove',
    artistName: 'Aura Nova',
    albumTitle: 'Neon Odyssey',
    durationSeconds: 215,
    artworkUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&q=80',
    streamUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    genres: ['Electronic', 'Synthwave', 'Dance'],
    languages: ['en'],
    provider: 'jamendo',
  },
  {
    id: 'demo_track_02',
    providerTrackId: 'demo_track_02',
    title: 'Deep Midnight Drift',
    artistName: 'Kallisto',
    albumTitle: 'Starlight Sessions',
    durationSeconds: 260,
    artworkUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&q=80',
    streamUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    genres: ['Ambient', 'Lo-Fi', 'Chillout'],
    languages: ['en'],
    provider: 'jamendo',
  },
  {
    id: 'demo_track_03',
    providerTrackId: 'demo_track_03',
    title: 'Oceanic Horizon',
    artistName: 'Tidal Waves',
    albumTitle: 'Coastal Reverie',
    durationSeconds: 245,
    artworkUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&q=80',
    streamUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
    genres: ['Chillout', 'Acoustic', 'Folk'],
    languages: ['en'],
    provider: 'jamendo',
  },
  {
    id: 'demo_track_04',
    providerTrackId: 'demo_track_04',
    title: 'Kinetic Highway',
    artistName: 'Overdrive Club',
    albumTitle: 'Redline Nights',
    durationSeconds: 198,
    artworkUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=400&q=80',
    streamUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
    genres: ['Rock', 'Electro', 'Energetic'],
    languages: ['en'],
    provider: 'jamendo',
  },
  {
    id: 'demo_track_05',
    providerTrackId: 'demo_track_05',
    title: 'Morning Bloom',
    artistName: 'Solana Echo',
    albumTitle: 'Daybreak',
    durationSeconds: 185,
    artworkUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&q=80',
    streamUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
    genres: ['Pop', 'Indie', 'Happy'],
    languages: ['en'],
    provider: 'jamendo',
  },
  {
    id: 'demo_track_06',
    providerTrackId: 'demo_track_06',
    title: 'Rain on Copper Roofs',
    artistName: 'Ember Days',
    albumTitle: 'Quiet Storms',
    durationSeconds: 220,
    artworkUrl: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=400&q=80',
    streamUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3',
    genres: ['Acoustic', 'Folk', 'Melancholic'],
    languages: ['en'],
    provider: 'jamendo',
  },
  {
    id: 'demo_track_07',
    providerTrackId: 'demo_track_07',
    title: 'Velvet Horizon',
    artistName: 'Luna Bay',
    albumTitle: 'Twilight Echoes',
    durationSeconds: 205,
    artworkUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&q=80',
    streamUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3',
    genres: ['R&B', 'Soul', 'Chill'],
    languages: ['en'],
    provider: 'jamendo',
  },
  {
    id: 'demo_track_08',
    providerTrackId: 'demo_track_08',
    title: 'Neon Skyline',
    artistName: 'Cyber Dream',
    albumTitle: 'Gridrunner',
    durationSeconds: 230,
    artworkUrl: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=400&q=80',
    streamUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3',
    genres: ['Electronic', 'Synthwave', 'Focus'],
    languages: ['en'],
    provider: 'jamendo',
  },
  {
    id: 'demo_track_09',
    providerTrackId: 'demo_track_09',
    title: 'Golden Hour Reflections',
    artistName: 'Sienna Sky',
    albumTitle: 'Warm Radiance',
    durationSeconds: 210,
    artworkUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&q=80',
    streamUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3',
    genres: ['Indie', 'Acoustic', 'Happy'],
    languages: ['en'],
    provider: 'jamendo',
  },
  {
    id: 'demo_track_10',
    providerTrackId: 'demo_track_10',
    title: 'Midnight Coffee',
    artistName: 'Urban Chill Trio',
    albumTitle: 'Late Night Notes',
    durationSeconds: 195,
    artworkUrl: 'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=400&q=80',
    streamUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3',
    genres: ['Jazz', 'Lo-Fi', 'Relaxed'],
    languages: ['en'],
    provider: 'jamendo',
  },
  {
    id: 'demo_track_11',
    providerTrackId: 'demo_track_11',
    title: 'Electric Carnival',
    artistName: 'Hyperpulse',
    albumTitle: 'Festival Vibe',
    durationSeconds: 225,
    artworkUrl: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=400&q=80',
    streamUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-11.mp3',
    genres: ['Dance', 'Electronic', 'Party'],
    languages: ['en'],
    provider: 'jamendo',
  },
  {
    id: 'demo_track_12',
    providerTrackId: 'demo_track_12',
    title: 'Serenade for the Moon',
    artistName: 'Velvet Strings',
    albumTitle: 'Nocturnes',
    durationSeconds: 250,
    artworkUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&q=80',
    streamUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-12.mp3',
    genres: ['Classical', 'Ambient', 'Calm'],
    languages: ['en'],
    provider: 'jamendo',
  },
];

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
          durationSeconds: Math.max(providerTrack.durationSeconds || 180, 1),
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
    try {
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
    } catch (providerError) {
      const dbState = getDatabaseState();
      // If MongoDB is connected and has genuinely matching cached songs
      if (dbState.isConnected) {
        try {
          const regex = new RegExp(query.trim(), 'i');
          const matchingSongs = await Song.find({ title: regex })
            .limit(limit)
            .populate('artistIds')
            .populate('albumId');

          if (matchingSongs && matchingSongs.length > 0) {
            console.warn(`[MusicCatalogueService] Upstream provider unavailable; serving ${matchingSongs.length} cached search matches.`);
            const tracks: CatalogueTrackDto[] = matchingSongs.map((songDoc: any) => {
              const primaryArtist = Array.isArray(songDoc.artistIds) && songDoc.artistIds.length > 0 ? songDoc.artistIds[0] : null;
              const albumDoc = songDoc.albumId;
              return {
                id: songDoc._id.toString(),
                title: songDoc.title,
                artistId: primaryArtist ? (primaryArtist._id?.toString() || primaryArtist.toString()) : undefined,
                artistName: primaryArtist && primaryArtist.name ? primaryArtist.name : 'Unknown Artist',
                albumId: albumDoc ? (albumDoc._id?.toString() || albumDoc.toString()) : undefined,
                albumTitle: albumDoc && albumDoc.title ? albumDoc.title : undefined,
                durationSeconds: songDoc.durationSeconds || 180,
                artworkUrl: songDoc.artworkUrl,
                streamUrl: undefined,
                genres: songDoc.genres || [],
                languages: songDoc.languages || [],
                provider: songDoc.provider || 'jamendo',
                providerTrackId: songDoc.providerTrackId || songDoc._id.toString(),
              };
            });
            return {
              query,
              tracks,
              artists: [],
              albums: [],
              totalResults: tracks.length,
            };
          }
        } catch (dbErr) {
          console.warn('[MusicCatalogueService] Error searching cached songs:', dbErr);
        }
      }

      // Upstream provider and Mongo cache unavailable; return fallback demo catalogue
      console.warn('[MusicCatalogueService] Upstream provider and Mongo cache unavailable; filtering fallback demo catalogue.');
      const qLower = query.toLowerCase().trim();
      const filtered = FALLBACK_CATALOGUE_TRACKS.filter((t) =>
        t.title.toLowerCase().includes(qLower) ||
        t.artistName.toLowerCase().includes(qLower) ||
        t.genres.some((g) => g.toLowerCase().includes(qLower))
      );
      const results = filtered.length > 0 ? filtered : FALLBACK_CATALOGUE_TRACKS;
      const paged = results.slice(offset, offset + limit);
      return {
        query,
        tracks: paged,
        artists: [],
        albums: [],
        totalResults: results.length,
      };
    }
  }

  /**
   * Retrieves popular tracks and caches them locally.
   * If upstream provider is unavailable, falls back to genuinely cached MongoDB songs if present,
   * or to the deterministic demo catalogue.
   */
  public async getPopularTracks(limit = 20): Promise<CatalogueTrackDto[]> {
    try {
      const rawTracks = await this.provider.getPopularTracks(limit);
      if (rawTracks && rawTracks.length > 0) {
        return await Promise.all(rawTracks.map((track) => this.persistTrack(track)));
      }
    } catch (providerError) {
      console.warn('[MusicCatalogueService] Upstream provider error in getPopularTracks:', providerError);
    }

    const dbState = getDatabaseState();
    // If MongoDB is connected and genuinely contains cached songs, fall back to them
      if (dbState.isConnected) {
        try {
          const cachedSongs = await Song.find()
            .sort({ createdAt: -1 })
            .limit(limit)
            .populate('artistIds')
            .populate('albumId');

          if (cachedSongs && cachedSongs.length > 0) {
            console.warn('[MusicCatalogueService] Upstream provider unavailable; serving genuinely cached catalogue songs.');
            return cachedSongs.map((songDoc: any) => {
              const primaryArtist = Array.isArray(songDoc.artistIds) && songDoc.artistIds.length > 0 ? songDoc.artistIds[0] : null;
              const albumDoc = songDoc.albumId;
              return {
                id: songDoc._id.toString(),
                title: songDoc.title,
                artistId: primaryArtist ? (primaryArtist._id?.toString() || primaryArtist.toString()) : undefined,
                artistName: primaryArtist && primaryArtist.name ? primaryArtist.name : 'Unknown Artist',
                albumId: albumDoc ? (albumDoc._id?.toString() || albumDoc.toString()) : undefined,
                albumTitle: albumDoc && albumDoc.title ? albumDoc.title : undefined,
                durationSeconds: songDoc.durationSeconds || 180,
                artworkUrl: songDoc.artworkUrl,
                streamUrl: undefined,
                genres: songDoc.genres || [],
                languages: songDoc.languages || [],
                provider: songDoc.provider || 'jamendo',
                providerTrackId: songDoc.providerTrackId || songDoc._id.toString(),
              };
            });
          }
        } catch (dbErr) {
          console.warn('[MusicCatalogueService] Failed to query cached songs from MongoDB:', dbErr);
        }
      }

      // Standalone/Offline mode: return fallback demo catalogue
      console.warn('[MusicCatalogueService] Upstream provider and Mongo cache unavailable; returning fallback demo catalogue.');
      return FALLBACK_CATALOGUE_TRACKS.slice(0, limit);
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
    try {
      const providerTrack = await this.provider.getTrack(identifier);
      if (providerTrack) {
        return this.persistTrack(providerTrack);
      }
    } catch {
      // Upstream provider unavailable, fall through to fallback demo catalogue
    }

    const fallbackTrack = FALLBACK_CATALOGUE_TRACKS.find(
      (t) => t.id === identifier || t.providerTrackId === identifier
    );
    return fallbackTrack || null;
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

    try {
      const streamInfo = await this.provider.getStreamUrl(providerTrackId);
      if (streamInfo) return streamInfo;
    } catch {
      // Upstream provider unavailable, fall through
    }

    const fallbackTrack = FALLBACK_CATALOGUE_TRACKS.find(
      (t) => t.id === identifier || t.providerTrackId === identifier
    );
    if (fallbackTrack?.streamUrl) {
      return {
        streamUrl: fallbackTrack.streamUrl,
        format: 'mp3',
        providerTrackId: fallbackTrack.providerTrackId,
      };
    }

    // Direct Jamendo MP3 stream for numeric IDs
    if (/^\d+$/.test(providerTrackId)) {
      return {
        streamUrl: `https://mp3d.jamendo.com/download/track/${providerTrackId}/mp32/`,
        format: 'mp3',
        providerTrackId,
      };
    }

    // Deterministic fallback audio stream for any other track identifier
    const hash = Math.abs(
      (identifier || '1').split('').reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) | 0, 0)
    );
    const songIndex = (hash % 12) + 1;
    return {
      streamUrl: `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-${songIndex}.mp3`,
      format: 'mp3',
      providerTrackId: identifier,
    };
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
