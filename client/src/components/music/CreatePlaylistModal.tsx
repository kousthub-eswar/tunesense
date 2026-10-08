import React, { useState } from 'react';
import { X, ListPlus, Loader2 } from 'lucide-react';
import { Button } from '../ui/Button.js';
import { Input } from '../ui/Input.js';
import { playlistService } from '../../services/playlistService.js';
import { PlaylistSummaryDto } from '../../types/index.js';

export interface CreatePlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (playlist: PlaylistSummaryDto) => void;
}

export const CreatePlaylistModal: React.FC<CreatePlaylistModalProps> = ({
  isOpen,
  onClose,
  onCreated,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter a playlist name.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const pl = await playlistService.createPlaylist({
        name: name.trim(),
        description: description.trim() || undefined,
      });
      setName('');
      setDescription('');
      onCreated(pl);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to create playlist');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        className="w-full max-w-md bg-bg-elevated border border-surface-border rounded-card shadow-player p-5 select-none animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-playlist-title"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-brand-500/10 text-brand-400 flex items-center justify-center">
              <ListPlus className="w-4 h-4" />
            </div>
            <h3 id="create-playlist-title" className="text-base font-bold text-content-primary">
              Create New Playlist
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-content-muted hover:text-content-primary hover:bg-surface transition-colors tap-target flex items-center justify-center"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-2.5 rounded-lg bg-vibe-rose/15 border border-vibe-rose/30 text-xs text-rose-300">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-content-secondary uppercase tracking-wider mb-1">
              Playlist Name <span className="text-brand-400">*</span>
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Midnight Chill, Workout Beats"
              maxLength={100}
              autoFocus
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-content-secondary uppercase tracking-wider mb-1">
              Description <span className="text-content-muted font-normal">(Optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Give your playlist a vibe or theme..."
              maxLength={500}
              rows={3}
              className="w-full px-3 py-2 text-sm bg-surface border border-surface-border rounded-lg text-content-primary placeholder:text-content-muted focus:outline-none focus:border-brand-500 transition-colors resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" type="button" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              disabled={loading || !name.trim()}
              leftIcon={loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ListPlus className="w-4 h-4" />}
            >
              {loading ? 'Creating...' : 'Create Playlist'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
