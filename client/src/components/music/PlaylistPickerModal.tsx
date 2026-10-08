import React, { useState, useEffect } from 'react';
import { X, Check, Plus, Loader2, Music } from 'lucide-react';
import { Button } from '../ui/Button.js';
import { playlistService } from '../../services/playlistService.js';
import { PlaylistSummaryDto, TrackItem } from '../../types/index.js';
import { CreatePlaylistModal } from './CreatePlaylistModal.js';

export interface PlaylistPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  track: TrackItem | null;
}

export const PlaylistPickerModal: React.FC<PlaylistPickerModalProps> = ({
  isOpen,
  onClose,
  track,
}) => {
  const [playlists, setPlaylists] = useState<PlaylistSummaryDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && track) {
      setLoading(true);
      setError(null);
      playlistService
        .getUserPlaylists()
        .then((list) => {
          setPlaylists(list);
        })
        .catch((err) => {
          setError(err?.message || 'Failed to load playlists');
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, track]);

  if (!isOpen || !track) return null;

  const handleToggleSong = async (playlist: PlaylistSummaryDto) => {
    if (!track) return;
    const isAdded = addedIds.has(playlist.id);

    try {
      setAddingId(playlist.id);
      if (isAdded) {
        await playlistService.removeSongFromPlaylist(playlist.id, track.id);
        setAddedIds((prev) => {
          const next = new Set(prev);
          next.delete(playlist.id);
          return next;
        });
      } else {
        await playlistService.addSongToPlaylist(playlist.id, track.id);
        setAddedIds((prev) => new Set(prev).add(playlist.id));
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to update playlist');
    } finally {
      setAddingId(null);
    }
  };

  const handlePlaylistCreated = (newPl: PlaylistSummaryDto) => {
    setPlaylists((prev) => [newPl, ...prev]);
    // Automatically add track to newly created playlist
    if (track) {
      playlistService.addSongToPlaylist(newPl.id, track.id).then(() => {
        setAddedIds((prev) => new Set(prev).add(newPl.id));
      });
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
        <div
          className="w-full sm:max-w-md bg-bg-elevated border-t sm:border border-surface-border rounded-t-2xl sm:rounded-card shadow-player p-5 select-none animate-in slide-in-from-bottom-5 duration-200"
          role="dialog"
          aria-modal="true"
          aria-labelledby="playlist-picker-title"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-surface-border">
            <div className="min-w-0 flex-1 pr-2">
              <h3 id="playlist-picker-title" className="text-sm font-bold text-content-primary truncate">
                Add to Playlist
              </h3>
              <p className="text-xs text-content-secondary truncate mt-0.5">
                {track.title} • {track.artistName}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-full text-content-muted hover:text-content-primary hover:bg-surface transition-colors tap-target flex items-center justify-center"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* New Playlist CTA */}
          <div className="py-3">
            <button
              onClick={() => setShowCreateModal(true)}
              className="w-full flex items-center gap-3 p-3 rounded-card bg-surface/60 hover:bg-surface border border-surface-border/50 text-left transition-colors tap-target"
            >
              <div className="w-9 h-9 rounded-lg bg-brand-500/15 text-brand-400 flex items-center justify-center shrink-0">
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-content-primary">New Playlist</h4>
                <p className="text-[11px] text-content-muted">Create and add this track</p>
              </div>
            </button>
          </div>

          {error && (
            <div className="mb-3 p-2 rounded-lg bg-vibe-rose/15 border border-vibe-rose/30 text-xs text-rose-300">
              {error}
            </div>
          )}

          {/* Playlist List */}
          <div className="max-h-60 overflow-y-auto space-y-1.5 no-scrollbar py-1">
            {loading ? (
              <div className="flex items-center justify-center py-6 text-content-muted gap-2 text-xs">
                <Loader2 className="w-4 h-4 animate-spin text-brand-400" />
                Loading playlists...
              </div>
            ) : playlists.length > 0 ? (
              playlists.map((pl) => {
                const isAdded = addedIds.has(pl.id);
                const isUpdating = addingId === pl.id;

                return (
                  <button
                    key={pl.id}
                    onClick={() => handleToggleSong(pl)}
                    disabled={isUpdating}
                    className="w-full flex items-center justify-between p-2.5 rounded-card hover:bg-surface text-left transition-colors tap-target"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-9 h-9 rounded-lg bg-surface border border-surface-border flex items-center justify-center shrink-0 text-content-muted">
                        <Music className="w-4 h-4 text-brand-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h5 className="text-xs font-semibold text-content-primary truncate">{pl.name}</h5>
                        <p className="text-[11px] text-content-muted">
                          {pl.songCount} {pl.songCount === 1 ? 'song' : 'songs'}
                        </p>
                      </div>
                    </div>

                    <div className="ml-2 shrink-0">
                      {isUpdating ? (
                        <Loader2 className="w-4 h-4 animate-spin text-brand-400" />
                      ) : (
                        <div
                          className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                            isAdded
                              ? 'bg-brand-500 border-brand-500 text-white'
                              : 'border-surface-border bg-surface'
                          }`}
                        >
                          {isAdded && <Check className="w-3.5 h-3.5" />}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="text-center py-6 text-xs text-content-muted">
                No playlists yet. Create your first one above!
              </div>
            )}
          </div>

          {/* Done Button */}
          <div className="mt-4 pt-3 border-t border-surface-border flex justify-end">
            <Button variant="primary" size="sm" onClick={onClose}>
              Done
            </Button>
          </div>
        </div>
      </div>

      <CreatePlaylistModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={handlePlaylistCreated}
      />
    </>
  );
};
