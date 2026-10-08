import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Play,
  Shuffle,
  Music,
  Trash2,
  Edit3,
  ArrowLeft,
  Loader2,
  Lock,
  Globe,
  Plus,
} from 'lucide-react';
import { PageContainer } from '../components/layout/PageContainer.js';
import { Button } from '../components/ui/Button.js';
import { Badge } from '../components/ui/Badge.js';
import { SongCard } from '../components/music/SongCard.js';
import { MusicArtwork } from '../components/music/MusicArtwork.js';
import { playlistService } from '../services/playlistService.js';
import { PlaylistDetailDto } from '../types/index.js';
import { useAudioPlayer } from '../contexts/AudioPlayerContext.js';
import { useAuth } from '../contexts/AuthContext.js';

export const PlaylistPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { setQueue, currentTrack, isPlaying } = useAudioPlayer();

  const [playlist, setPlaylist] = useState<PlaylistDetailDto | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editName, setEditName] = useState<string>('');
  const [editDesc, setEditDesc] = useState<string>('');

  const isOwner = Boolean(user && playlist && playlist.userId === user.id);

  const fetchPlaylist = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const data = await playlistService.getPlaylistById(id);
      setPlaylist(data);
      setEditName(data.name);
      setEditDesc(data.description || '');
    } catch (err: any) {
      setError(err?.message || 'Failed to load playlist');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchPlaylist();
  }, [fetchPlaylist]);

  const handlePlayAll = () => {
    if (!playlist || playlist.songs.length === 0) return;
    setQueue(playlist.songs, 0);
  };

  const handleShufflePlay = () => {
    if (!playlist || playlist.songs.length === 0) return;
    const shuffled = [...playlist.songs];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setQueue(shuffled, 0);
  };

  const handleRemoveSong = async (songId: string) => {
    if (!id || !isOwner) return;
    try {
      const updated = await playlistService.removeSongFromPlaylist(id, songId);
      setPlaylist(updated);
    } catch (err: any) {
      alert(err?.message || 'Failed to remove song');
    }
  };

  const handleDeletePlaylist = async () => {
    if (!id || !isOwner) return;
    if (!window.confirm('Are you sure you want to delete this playlist?')) return;
    try {
      await playlistService.deletePlaylist(id);
      navigate('/library');
    } catch (err: any) {
      alert(err?.message || 'Failed to delete playlist');
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !editName.trim()) return;

    try {
      await playlistService.updatePlaylist(id, {
        name: editName.trim(),
        description: editDesc.trim() || undefined,
      });
      setIsEditing(false);
      fetchPlaylist();
    } catch (err: any) {
      alert(err?.message || 'Failed to update playlist');
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-content-muted">
          <Loader2 className="w-8 h-8 animate-spin text-brand-400" />
          <p className="text-xs">Loading playlist details...</p>
        </div>
      </PageContainer>
    );
  }

  if (error || !playlist) {
    return (
      <PageContainer>
        <div className="text-center py-16">
          <p className="text-sm text-vibe-rose mb-3">{error || 'Playlist not found'}</p>
          <Button variant="ghost" size="sm" onClick={() => navigate('/library')} leftIcon={<ArrowLeft className="w-4 h-4" />}>
            Back to Library
          </Button>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      {/* Back Button */}
      <div className="mb-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/library')}
          leftIcon={<ArrowLeft className="w-4 h-4" />}
          className="text-xs text-content-secondary hover:text-content-primary -ml-2"
        >
          Library
        </Button>
      </div>

      {/* Playlist Header Card */}
      <div className="p-4 sm:p-5 rounded-card bg-surface/70 border border-surface-border mb-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
          <div className="w-32 h-32 rounded-artwork overflow-hidden shrink-0 shadow-lg border border-surface-border">
            <MusicArtwork
              src={playlist.coverArtworkUrl}
              alt={playlist.name}
              size="lg"
              className="w-full h-full object-cover"
              fallbackIcon={<Music className="w-10 h-10 text-brand-400" />}
            />
          </div>

          <div className="flex-1 text-center sm:text-left min-w-0">
            <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
              <Badge variant="brand" size="sm">
                Playlist
              </Badge>
              {playlist.isPublic ? (
                <span className="flex items-center gap-1 text-[11px] text-content-muted">
                  <Globe className="w-3 h-3" /> Public
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[11px] text-content-muted">
                  <Lock className="w-3 h-3" /> Private
                </span>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-content-primary truncate">
              {playlist.name}
            </h1>

            {playlist.description && (
              <p className="text-xs text-content-secondary mt-1 leading-relaxed line-clamp-2">
                {playlist.description}
              </p>
            )}

            <p className="text-[11px] text-content-muted mt-2">
              {playlist.songCount} {playlist.songCount === 1 ? 'song' : 'songs'}
            </p>

            {/* Action Buttons: Play All, Shuffle, Edit, Delete */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-4">
              {playlist.songs.length > 0 && (
                <>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handlePlayAll}
                    leftIcon={<Play className="w-4 h-4 fill-white" />}
                  >
                    Play All
                  </Button>

                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleShufflePlay}
                    leftIcon={<Shuffle className="w-4 h-4" />}
                  >
                    Shuffle
                  </Button>
                </>
              )}

              {isOwner && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                    leftIcon={<Edit3 className="w-3.5 h-3.5" />}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDeletePlaylist}
                    leftIcon={<Trash2 className="w-3.5 h-3.5 text-vibe-rose" />}
                    className="text-vibe-rose hover:bg-vibe-rose/10"
                  >
                    Delete
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-bg-elevated border border-surface-border rounded-card p-5">
            <h3 className="text-base font-bold text-content-primary mb-3">Edit Playlist</h3>
            <form onSubmit={handleSaveEdit} className="space-y-3">
              <div>
                <label className="block text-xs text-content-secondary mb-1">Playlist Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-surface border border-surface-border rounded-lg text-content-primary focus:outline-none focus:border-brand-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-content-secondary mb-1">Description</label>
                <textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 text-sm bg-surface border border-surface-border rounded-lg text-content-primary focus:outline-none focus:border-brand-500 resize-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" size="sm" type="button" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit">
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Song List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold text-content-primary uppercase tracking-wider">
            Tracks ({playlist.songs.length})
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/search')}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
            className="text-xs text-brand-400"
          >
            Add Tracks
          </Button>
        </div>

        {playlist.songs.length > 0 ? (
          playlist.songs.map((song, idx) => {
            const isSongActive = currentTrack?.id === song.id;
            return (
              <div key={song.id} className="relative group">
                <SongCard
                  track={song}
                  isActive={isSongActive}
                  isPlaying={isSongActive && isPlaying}
                  onPlay={() => {
                    setQueue(playlist.songs, idx);
                  }}
                />
                {isOwner && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveSong(song.id);
                    }}
                    className="absolute right-14 top-1/2 -translate-y-1/2 p-2 text-content-muted hover:text-vibe-rose opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label={`Remove ${song.title} from playlist`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })
        ) : (
          <div className="text-center py-12 rounded-card bg-surface/30 border border-surface-border p-6">
            <Music className="w-8 h-8 text-content-muted mx-auto mb-2" />
            <h4 className="text-sm font-semibold text-content-primary">This playlist is empty</h4>
            <p className="text-xs text-content-muted mt-1 max-w-xs mx-auto">
              Find songs on the Home or Search pages and tap the playlist button to add them.
            </p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/search')}
              leftIcon={<Plus className="w-4 h-4" />}
              className="mt-4"
            >
              Search & Add Songs
            </Button>
          </div>
        )}
      </div>
    </PageContainer>
  );
};
