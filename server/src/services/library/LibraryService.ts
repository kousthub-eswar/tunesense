import mongoose, { Types } from 'mongoose';
import { UserLibrary, Song, Artist, ListeningEvent } from '../../models/index.js';
import { getDatabaseState } from '../../config/database.js';
import { PlaylistSongDto, HistoryItemDto, LibrarySummaryDto } from '../../types/index.js';

export class LibraryService {
  /**
   * Helper to ensure a UserLibrary document exists for user
   */
  private async getOrCreateUserLibrary(userId: string) {
    let lib = await UserLibrary.findOne({ userId: new Types.ObjectId(userId) });
    if (!lib) {
      lib = await UserLibrary.create({
        userId: new Types.ObjectId(userId),
        likedSongIds: [],
        savedPlaylistIds: [],
      });
    }
    return lib;
  }

  /**
   * Resolves a songId (MongoDB ObjectId or providerTrackId) to a valid Song document
   */
  private async resolveSongDoc(songId: string) {
    let songDoc = null;
    if (mongoose.isValidObjectId(songId)) {
      songDoc = await Song.findById(songId);
    }
    if (!songDoc) {
      songDoc = await Song.findOne({ providerTrackId: songId });
    }
    return songDoc;
  }

  /**
   * Likes a song for the authenticated user (idempotent $addToSet)
   */
  public async likeSong(userId: string, songId: string): Promise<{ success: boolean; isLiked: boolean; songId: string }> {
    if (!userId || !mongoose.isValidObjectId(userId)) {
      const err = new Error('Invalid authenticated user identity');
      (err as unknown as { status: number }).status = 401;
      throw err;
    }

    const dbState = getDatabaseState();
    if (!dbState.isConnected) {
      // In offline/degraded mode
      return { success: true, isLiked: true, songId };
    }

    const songDoc = await this.resolveSongDoc(songId);
    if (!songDoc) {
      const err = new Error(`Song not found: ${songId}`);
      (err as unknown as { status: number }).status = 404;
      throw err;
    }

    await this.getOrCreateUserLibrary(userId);

    await UserLibrary.updateOne(
      { userId: new Types.ObjectId(userId) },
      { $addToSet: { likedSongIds: songDoc._id } }
    );

    return {
      success: true,
      isLiked: true,
      songId: songDoc._id.toString(),
    };
  }

  /**
   * Unlikes a song for the authenticated user (idempotent $pull)
   */
  public async unlikeSong(userId: string, songId: string): Promise<{ success: boolean; isLiked: boolean; songId: string }> {
    if (!userId || !mongoose.isValidObjectId(userId)) {
      const err = new Error('Invalid authenticated user identity');
      (err as unknown as { status: number }).status = 401;
      throw err;
    }

    const dbState = getDatabaseState();
    if (!dbState.isConnected) {
      return { success: true, isLiked: false, songId };
    }

    const songDoc = await this.resolveSongDoc(songId);
    const targetObjectId = songDoc ? songDoc._id : (mongoose.isValidObjectId(songId) ? new Types.ObjectId(songId) : null);

    if (targetObjectId) {
      await UserLibrary.updateOne(
        { userId: new Types.ObjectId(userId) },
        { $pull: { likedSongIds: targetObjectId } }
      );
    }

    return {
      success: true,
      isLiked: false,
      songId,
    };
  }

  /**
   * Checks whether one or more songs are liked by the authenticated user
   */
  public async checkIsLiked(userId: string, songIds: string[]): Promise<Record<string, boolean>> {
    const result: Record<string, boolean> = {};
    songIds.forEach((id) => {
      result[id] = false;
    });

    if (!userId || !mongoose.isValidObjectId(userId)) {
      return result;
    }

    const dbState = getDatabaseState();
    if (!dbState.isConnected) {
      return result;
    }

    const lib = await UserLibrary.findOne({ userId: new Types.ObjectId(userId) }).lean();
    if (!lib || !lib.likedSongIds || lib.likedSongIds.length === 0) {
      return result;
    }

    const likedSet = new Set(lib.likedSongIds.map((id: any) => id.toString()));

    for (const id of songIds) {
      if (likedSet.has(id)) {
        result[id] = true;
      }
    }

    return result;
  }

  /**
   * Retrieves all liked songs for the user with populated song and artist details
   */
  public async getLikedSongs(userId: string, limit = 100): Promise<PlaylistSongDto[]> {
    if (!userId || !mongoose.isValidObjectId(userId)) {
      const err = new Error('Invalid authenticated user identity');
      (err as unknown as { status: number }).status = 401;
      throw err;
    }

    const dbState = getDatabaseState();
    if (!dbState.isConnected) {
      return [];
    }

    const lib = await UserLibrary.findOne({ userId: new Types.ObjectId(userId) }).lean();
    if (!lib || !lib.likedSongIds || lib.likedSongIds.length === 0) {
      return [];
    }

    const targetIds = lib.likedSongIds.slice(-limit).reverse(); // Newest likes first
    const songs = await Song.find({ _id: { $in: targetIds } }).lean();

    // Map artist names
    const artistIds = songs.flatMap((s) => s.artistIds || []);
    const artists = await Artist.find({ _id: { $in: artistIds } }).lean();
    const artistMap = new Map<string, string>();
    artists.forEach((a) => {
      artistMap.set(a._id.toString(), a.name);
    });

    const songMap = new Map<string, any>();
    songs.forEach((s) => {
      songMap.set(s._id.toString(), s);
    });

    const result: PlaylistSongDto[] = [];
    for (const id of targetIds) {
      const s = songMap.get(id.toString());
      if (s) {
        const primaryArtistId = s.artistIds && s.artistIds.length > 0 ? s.artistIds[0].toString() : '';
        result.push({
          id: s._id.toString(),
          title: s.title,
          artistName: artistMap.get(primaryArtistId) || 'Unknown Artist',
          durationSeconds: s.durationSeconds || 0,
          artworkUrl: s.artworkUrl,
          streamUrl: s.providerTrackId ? `https://mp3d.jamendo.com/download/track/${s.providerTrackId}/mp32/` : undefined,
          provider: s.provider,
          providerTrackId: s.providerTrackId,
        });
      }
    }

    return result;
  }

  /**
   * Retrieves user's listening history from real ListeningEvent collection
   * Deduplicates repeat events for the same track within short periods.
   */
  public async getListeningHistory(userId: string, limit = 20): Promise<HistoryItemDto[]> {
    if (!userId || !mongoose.isValidObjectId(userId)) {
      const err = new Error('Invalid authenticated user identity');
      (err as unknown as { status: number }).status = 401;
      throw err;
    }

    const dbState = getDatabaseState();
    if (!dbState.isConnected) {
      return [];
    }

    const boundedLimit = Math.min(50, Math.max(1, limit));

    // Pull recent play and complete events
    const rawEvents = await ListeningEvent.find({
      userId: new Types.ObjectId(userId),
      eventType: { $in: ['play', 'complete'] },
    })
      .sort({ timestamp: -1 })
      .limit(boundedLimit * 3)
      .lean();

    if (!rawEvents || rawEvents.length === 0) {
      return [];
    }

    // Deduplicate: preserve the most recent occurrence per songId
    const seenSongIds = new Set<string>();
    const uniqueEvents: any[] = [];

    for (const ev of rawEvents) {
      const sid = ev.songId.toString();
      if (!seenSongIds.has(sid)) {
        seenSongIds.add(sid);
        uniqueEvents.push(ev);
        if (uniqueEvents.length >= boundedLimit) {
          break;
        }
      }
    }

    const songIds = uniqueEvents.map((e) => e.songId);
    const songs = await Song.find({ _id: { $in: songIds } }).lean();

    const artistIds = songs.flatMap((s) => s.artistIds || []);
    const artists = await Artist.find({ _id: { $in: artistIds } }).lean();
    const artistMap = new Map<string, string>();
    artists.forEach((a) => {
      artistMap.set(a._id.toString(), a.name);
    });

    const songMap = new Map<string, any>();
    songs.forEach((s) => {
      songMap.set(s._id.toString(), s);
    });

    const result: HistoryItemDto[] = [];
    for (const ev of uniqueEvents) {
      const s = songMap.get(ev.songId.toString());
      if (s) {
        const primaryArtistId = s.artistIds && s.artistIds.length > 0 ? s.artistIds[0].toString() : '';
        result.push({
          song: {
            id: s._id.toString(),
            title: s.title,
            artistName: artistMap.get(primaryArtistId) || 'Unknown Artist',
            durationSeconds: s.durationSeconds || 0,
            artworkUrl: s.artworkUrl,
            streamUrl: s.providerTrackId ? `https://mp3d.jamendo.com/download/track/${s.providerTrackId}/mp32/` : undefined,
            provider: s.provider,
            providerTrackId: s.providerTrackId,
          },
          playedAt: ev.timestamp ? new Date(ev.timestamp).toISOString() : new Date().toISOString(),
          eventType: ev.eventType,
          completionPercent: ev.metadata?.completionPercent,
        });
      }
    }

    return result;
  }

  /**
   * Retrieves summary counts for user library dashboard
   */
  public async getLibrarySummary(userId: string): Promise<LibrarySummaryDto> {
    if (!userId || !mongoose.isValidObjectId(userId)) {
      return { likedCount: 0, playlistsCount: 0, recentlyPlayedCount: 0 };
    }

    const dbState = getDatabaseState();
    if (!dbState.isConnected) {
      return { likedCount: 0, playlistsCount: 0, recentlyPlayedCount: 0 };
    }

    const lib = await UserLibrary.findOne({ userId: new Types.ObjectId(userId) }).lean();
    const likedCount = lib?.likedSongIds?.length || 0;
    const playlistsCount = lib?.savedPlaylistIds?.length || 0;

    const recentlyPlayedCount = await ListeningEvent.countDocuments({
      userId: new Types.ObjectId(userId),
      eventType: { $in: ['play', 'complete'] },
    });

    return {
      likedCount,
      playlistsCount,
      recentlyPlayedCount,
    };
  }
}

export const libraryService = new LibraryService();
