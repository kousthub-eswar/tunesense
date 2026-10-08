import mongoose, { Types } from 'mongoose';
import { Playlist, UserLibrary, Song, Artist } from '../../models/index.js';
import { getDatabaseState } from '../../config/database.js';
import { PlaylistSummaryDto, PlaylistDetailDto, PlaylistSongDto } from '../../types/index.js';

export class PlaylistService {
  /**
   * Helper to format playlist document to summary DTO
   */
  private async formatSummary(doc: any): Promise<PlaylistSummaryDto> {
    let coverArtworkUrl: string | undefined = undefined;

    if (doc.coverSongId) {
      const coverSong = await Song.findById(doc.coverSongId).lean();
      if (coverSong?.artworkUrl) {
        coverArtworkUrl = coverSong.artworkUrl;
      }
    } else if (doc.songIds && doc.songIds.length > 0) {
      const firstSong = await Song.findById(doc.songIds[0]).lean();
      if (firstSong?.artworkUrl) {
        coverArtworkUrl = firstSong.artworkUrl;
      }
    }

    return {
      id: doc._id.toString(),
      userId: doc.userId.toString(),
      name: doc.name,
      description: doc.description || '',
      songCount: doc.songIds ? doc.songIds.length : 0,
      coverSongId: doc.coverSongId ? doc.coverSongId.toString() : undefined,
      coverArtworkUrl,
      isPublic: Boolean(doc.isPublic),
      createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date().toISOString(),
      updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : new Date().toISOString(),
    };
  }

  /**
   * Creates a new playlist for the authenticated user
   */
  public async createPlaylist(
    userId: string,
    input: { name: string; description?: string; isPublic?: boolean }
  ): Promise<PlaylistSummaryDto> {
    if (!userId || !mongoose.isValidObjectId(userId)) {
      const err = new Error('Invalid authenticated user identity');
      (err as unknown as { status: number }).status = 401;
      throw err;
    }

    const dbState = getDatabaseState();
    if (!dbState.isConnected) {
      // In offline test mode
      return {
        id: new Types.ObjectId().toString(),
        userId,
        name: input.name,
        description: input.description || '',
        songCount: 0,
        isPublic: Boolean(input.isPublic),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    const playlist = await Playlist.create({
      userId: new Types.ObjectId(userId),
      name: input.name.trim(),
      description: input.description ? input.description.trim() : '',
      isPublic: Boolean(input.isPublic),
      songIds: [],
    });

    // Add to UserLibrary.savedPlaylistIds
    await UserLibrary.updateOne(
      { userId: new Types.ObjectId(userId) },
      { $addToSet: { savedPlaylistIds: playlist._id } },
      { upsert: true }
    );

    return this.formatSummary(playlist);
  }

  /**
   * Retrieves all playlists owned by the authenticated user
   */
  public async getUserPlaylists(userId: string): Promise<PlaylistSummaryDto[]> {
    if (!userId || !mongoose.isValidObjectId(userId)) {
      const err = new Error('Invalid authenticated user identity');
      (err as unknown as { status: number }).status = 401;
      throw err;
    }

    const dbState = getDatabaseState();
    if (!dbState.isConnected) {
      return [];
    }

    const playlists = await Playlist.find({ userId: new Types.ObjectId(userId) })
      .sort({ updatedAt: -1 })
      .lean();

    const results: PlaylistSummaryDto[] = [];
    for (const pl of playlists) {
      results.push(await this.formatSummary(pl));
    }

    return results;
  }

  /**
   * Retrieves a single playlist with full song details
   * IDOR enforcement: Only owner can view private playlist.
   */
  public async getPlaylistById(
    userId: string | undefined,
    playlistId: string
  ): Promise<PlaylistDetailDto> {
    if (!playlistId || !mongoose.isValidObjectId(playlistId)) {
      const err = new Error(`Invalid playlist ID: ${playlistId}`);
      (err as unknown as { status: number }).status = 400;
      throw err;
    }

    const dbState = getDatabaseState();
    if (!dbState.isConnected) {
      const err = new Error('Database is offline');
      (err as unknown as { status: number }).status = 503;
      throw err;
    }

    const playlist = await Playlist.findById(playlistId).lean();
    if (!playlist) {
      const err = new Error(`Playlist not found: ${playlistId}`);
      (err as unknown as { status: number }).status = 404;
      throw err;
    }

    // IDOR / privacy check: if private, must belong to authenticated user
    if (!playlist.isPublic && (!userId || playlist.userId.toString() !== userId)) {
      const err = new Error('Access forbidden: You do not own this private playlist');
      (err as unknown as { status: number }).status = 403;
      throw err;
    }

    // Populate songs
    const songIds = playlist.songIds || [];
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

    const detailedSongs: PlaylistSongDto[] = [];
    let coverArtworkUrl: string | undefined = undefined;

    for (const sid of songIds) {
      const s = songMap.get(sid.toString());
      if (s) {
        if (!coverArtworkUrl && s.artworkUrl) {
          coverArtworkUrl = s.artworkUrl;
        }
        const primaryArtistId = s.artistIds && s.artistIds.length > 0 ? s.artistIds[0].toString() : '';
        detailedSongs.push({
          id: s._id.toString(),
          title: s.title,
          artistName: artistMap.get(primaryArtistId) || 'Unknown Artist',
          durationSeconds: s.durationSeconds || 0,
          artworkUrl: s.artworkUrl,
          streamUrl: s.providerTrackId ? `https://mp3d.jamendo.com/download/track/${s.providerTrackId}/mp32/` : undefined,
          provider: s.provider,
          providerTrackId: s.providerTrackId,
          albumTitle: undefined,
        });
      }
    }

    return {
      id: playlist._id.toString(),
      userId: playlist.userId.toString(),
      name: playlist.name,
      description: playlist.description || '',
      songCount: detailedSongs.length,
      coverSongId: playlist.coverSongId ? playlist.coverSongId.toString() : undefined,
      coverArtworkUrl,
      isPublic: Boolean(playlist.isPublic),
      createdAt: playlist.createdAt ? new Date(playlist.createdAt).toISOString() : new Date().toISOString(),
      updatedAt: playlist.updatedAt ? new Date(playlist.updatedAt).toISOString() : new Date().toISOString(),
      songs: detailedSongs,
    };
  }

  /**
   * Updates playlist metadata (name, description, isPublic)
   * IDOR enforcement: Only owner can update.
   */
  public async updatePlaylist(
    userId: string,
    playlistId: string,
    input: { name?: string; description?: string; isPublic?: boolean }
  ): Promise<PlaylistSummaryDto> {
    if (!userId || !mongoose.isValidObjectId(userId)) {
      const err = new Error('Invalid authenticated user identity');
      (err as unknown as { status: number }).status = 401;
      throw err;
    }

    if (!playlistId || !mongoose.isValidObjectId(playlistId)) {
      const err = new Error(`Invalid playlist ID: ${playlistId}`);
      (err as unknown as { status: number }).status = 400;
      throw err;
    }

    const dbState = getDatabaseState();
    if (!dbState.isConnected) {
      const err = new Error('Database is offline');
      (err as unknown as { status: number }).status = 503;
      throw err;
    }

    const playlist = await Playlist.findById(playlistId);
    if (!playlist) {
      const err = new Error(`Playlist not found: ${playlistId}`);
      (err as unknown as { status: number }).status = 404;
      throw err;
    }

    if (playlist.userId.toString() !== userId) {
      const err = new Error('Access forbidden: You cannot modify another user\'s playlist');
      (err as unknown as { status: number }).status = 403;
      throw err;
    }

    if (input.name !== undefined) playlist.name = input.name.trim();
    if (input.description !== undefined) playlist.description = input.description.trim();
    if (input.isPublic !== undefined) playlist.isPublic = input.isPublic;

    await playlist.save();
    return this.formatSummary(playlist);
  }

  /**
   * Deletes a playlist
   * IDOR enforcement: Only owner can delete.
   */
  public async deletePlaylist(
    userId: string,
    playlistId: string
  ): Promise<{ success: boolean; deletedId: string }> {
    if (!userId || !mongoose.isValidObjectId(userId)) {
      const err = new Error('Invalid authenticated user identity');
      (err as unknown as { status: number }).status = 401;
      throw err;
    }

    if (!playlistId || !mongoose.isValidObjectId(playlistId)) {
      const err = new Error(`Invalid playlist ID: ${playlistId}`);
      (err as unknown as { status: number }).status = 400;
      throw err;
    }

    const dbState = getDatabaseState();
    if (!dbState.isConnected) {
      const err = new Error('Database is offline');
      (err as unknown as { status: number }).status = 503;
      throw err;
    }

    const playlist = await Playlist.findById(playlistId);
    if (!playlist) {
      const err = new Error(`Playlist not found: ${playlistId}`);
      (err as unknown as { status: number }).status = 404;
      throw err;
    }

    if (playlist.userId.toString() !== userId) {
      const err = new Error('Access forbidden: You cannot delete another user\'s playlist');
      (err as unknown as { status: number }).status = 403;
      throw err;
    }

    await Playlist.findByIdAndDelete(playlistId);

    // Remove from UserLibrary
    await UserLibrary.updateOne(
      { userId: new Types.ObjectId(userId) },
      { $pull: { savedPlaylistIds: new Types.ObjectId(playlistId) } }
    );

    return { success: true, deletedId: playlistId };
  }

  /**
   * Adds a song to a playlist ($addToSet, bounded to max 500)
   * IDOR enforcement: Only owner can add songs.
   */
  public async addSongToPlaylist(
    userId: string,
    playlistId: string,
    songId: string
  ): Promise<PlaylistDetailDto> {
    if (!userId || !mongoose.isValidObjectId(userId)) {
      const err = new Error('Invalid authenticated user identity');
      (err as unknown as { status: number }).status = 401;
      throw err;
    }

    if (!playlistId || !mongoose.isValidObjectId(playlistId)) {
      const err = new Error(`Invalid playlist ID: ${playlistId}`);
      (err as unknown as { status: number }).status = 400;
      throw err;
    }

    const dbState = getDatabaseState();
    if (!dbState.isConnected) {
      const err = new Error('Database is offline');
      (err as unknown as { status: number }).status = 503;
      throw err;
    }

    const playlist = await Playlist.findById(playlistId);
    if (!playlist) {
      const err = new Error(`Playlist not found: ${playlistId}`);
      (err as unknown as { status: number }).status = 404;
      throw err;
    }

    if (playlist.userId.toString() !== userId) {
      const err = new Error('Access forbidden: You cannot modify another user\'s playlist');
      (err as unknown as { status: number }).status = 403;
      throw err;
    }

    let songDoc = null;
    if (mongoose.isValidObjectId(songId)) {
      songDoc = await Song.findById(songId);
    }
    if (!songDoc) {
      songDoc = await Song.findOne({ providerTrackId: songId });
    }

    if (!songDoc) {
      const err = new Error(`Song not found: ${songId}`);
      (err as unknown as { status: number }).status = 404;
      throw err;
    }

    if (playlist.songIds.length >= 500) {
      const err = new Error('Playlist size limit reached (max 500 songs)');
      (err as unknown as { status: number }).status = 400;
      throw err;
    }

    // Check if song is already present
    const exists = playlist.songIds.some((id) => id.toString() === songDoc._id.toString());
    if (!exists) {
      playlist.songIds.push(songDoc._id);
      if (!playlist.coverSongId) {
        playlist.coverSongId = songDoc._id;
      }
      await playlist.save();
    }

    return this.getPlaylistById(userId, playlistId);
  }

  /**
   * Removes a song from a playlist ($pull)
   * IDOR enforcement: Only owner can remove songs.
   */
  public async removeSongFromPlaylist(
    userId: string,
    playlistId: string,
    songId: string
  ): Promise<PlaylistDetailDto> {
    if (!userId || !mongoose.isValidObjectId(userId)) {
      const err = new Error('Invalid authenticated user identity');
      (err as unknown as { status: number }).status = 401;
      throw err;
    }

    if (!playlistId || !mongoose.isValidObjectId(playlistId)) {
      const err = new Error(`Invalid playlist ID: ${playlistId}`);
      (err as unknown as { status: number }).status = 400;
      throw err;
    }

    const dbState = getDatabaseState();
    if (!dbState.isConnected) {
      const err = new Error('Database is offline');
      (err as unknown as { status: number }).status = 503;
      throw err;
    }

    const playlist = await Playlist.findById(playlistId);
    if (!playlist) {
      const err = new Error(`Playlist not found: ${playlistId}`);
      (err as unknown as { status: number }).status = 404;
      throw err;
    }

    if (playlist.userId.toString() !== userId) {
      const err = new Error('Access forbidden: You cannot modify another user\'s playlist');
      (err as unknown as { status: number }).status = 403;
      throw err;
    }

    let songObjectId: Types.ObjectId | null = null;
    if (mongoose.isValidObjectId(songId)) {
      songObjectId = new Types.ObjectId(songId);
    } else {
      const songDoc = await Song.findOne({ providerTrackId: songId });
      if (songDoc) songObjectId = songDoc._id;
    }

    if (songObjectId) {
      playlist.songIds = playlist.songIds.filter(
        (id) => id.toString() !== songObjectId!.toString()
      );
      if (playlist.coverSongId && playlist.coverSongId.toString() === songObjectId.toString()) {
        playlist.coverSongId = playlist.songIds.length > 0 ? playlist.songIds[0] : undefined;
      }
      await playlist.save();
    }

    return this.getPlaylistById(userId, playlistId);
  }
}

export const playlistService = new PlaylistService();
