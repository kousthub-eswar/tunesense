import { apiRequest } from './apiClient.js';
import {
  MusicSearchResults,
  TrackItem,
  ArtistItem,
  AlbumItem,
  StreamResponse,
} from '../types/index.js';

interface ApiResponse<T> {
  status: 'ok';
  data: T;
}

/**
 * Searches the music catalogue for tracks, artists, and albums.
 */
export async function searchMusic(
  query: string,
  limit = 20,
  offset = 0
): Promise<MusicSearchResults> {
  const response = await apiRequest<ApiResponse<MusicSearchResults>>('/music/search', {
    params: { q: query, limit, offset },
  });
  return response.data;
}

/**
 * Retrieves popular/featured tracks from the catalogue.
 */
export async function fetchPopularTracks(
  limit = 20
): Promise<{ tracks: TrackItem[]; totalResults: number }> {
  const response = await apiRequest<ApiResponse<{ tracks: TrackItem[]; totalResults: number }>>(
    '/music/popular',
    {
      params: { limit },
    }
  );
  return response.data;
}

/**
 * Retrieves a single track by its ID.
 */
export async function fetchTrackById(id: string): Promise<TrackItem> {
  const response = await apiRequest<ApiResponse<TrackItem>>(`/music/tracks/${encodeURIComponent(id)}`);
  return response.data;
}

/**
 * Retrieves a playable stream URL for a track.
 */
export async function fetchTrackStream(id: string): Promise<StreamResponse> {
  const response = await apiRequest<ApiResponse<StreamResponse>>(
    `/music/tracks/${encodeURIComponent(id)}/stream`
  );
  return response.data;
}

/**
 * Retrieves artist metadata.
 */
export async function fetchArtistById(id: string): Promise<ArtistItem> {
  const response = await apiRequest<ApiResponse<ArtistItem>>(
    `/music/artists/${encodeURIComponent(id)}`
  );
  return response.data;
}

/**
 * Retrieves album metadata.
 */
export async function fetchAlbumById(id: string): Promise<AlbumItem> {
  const response = await apiRequest<ApiResponse<AlbumItem>>(
    `/music/albums/${encodeURIComponent(id)}`
  );
  return response.data;
}
