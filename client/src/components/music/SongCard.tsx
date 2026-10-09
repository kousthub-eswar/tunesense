import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Play, Pause, Heart, ListPlus } from 'lucide-react';
import { MusicArtwork } from './MusicArtwork.js';
import { IconButton } from '../ui/IconButton.js';
import { TrackItem, TrackMetadata } from '../../types/index.js';
import { useAuth } from '../../contexts/AuthContext.js';
import { libraryService } from '../../services/libraryService.js';
import { PlaylistPickerModal } from './PlaylistPickerModal.js';
import { cn } from '../../utils/cn.js';

export interface SongCardProps {
  track: TrackItem | TrackMetadata;
  onPlay?: () => void;
  onClick?: () => void;
  onOptionsClick?: () => void;
  isActive?: boolean;
  isPlaying?: boolean;
  isLikedInitially?: boolean;
  onLikeToggle?: (isLiked: boolean) => void;
  showActions?: boolean;
  className?: string;
}

export const SongCard: React.FC<SongCardProps> = ({
  track,
  onPlay,
  onClick,
  isActive = false,
  isPlaying = false,
  isLikedInitially = false,
  onLikeToggle,
  showActions = true,
  className,
}) => {
  const { isAuthenticated } = useAuth();
  const [isLiked, setIsLiked] = useState<boolean>(isLikedInitially);
  const [isLikeLoading, setIsLikeLoading] = useState<boolean>(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState<boolean>(false);

  const isMetadata = 'artist' in track;
  const title = track.title;
  const artist = isMetadata ? track.artist : track.artistName;
  const album = isMetadata ? track.album : track.albumTitle;
  const artwork = isMetadata ? track.coverUrl : track.artworkUrl;

  const normalizedTrackItem: TrackItem = {
    id: track.id,
    title,
    artistName: artist,
    albumTitle: album,
    artworkUrl: artwork,
    durationSeconds: track.durationSeconds || 0,
    provider: track.provider || 'jamendo',
    providerTrackId: track.providerTrackId || track.id,
  };

  const handleLikeClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) return;

    const nextLiked = !isLiked;
    setIsLiked(nextLiked);
    onLikeToggle?.(nextLiked);

    try {
      setIsLikeLoading(true);
      if (nextLiked) {
        await libraryService.likeSong(track.id);
      } else {
        await libraryService.unlikeSong(track.id);
      }
    } catch (err) {
      console.error('[SongCard] Like toggle error:', err);
      // Rollback on error
      setIsLiked(!nextLiked);
      onLikeToggle?.(!nextLiked);
    } finally {
      setIsLikeLoading(false);
    }
  };

  const handlePlaylistClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) return;
    setShowPlaylistModal(true);
  };

  return (
    <>
      <div
        onClick={onClick || onPlay}
        className={cn(
          'group flex items-center justify-between p-2.5 rounded-card bg-surface/60 hover:bg-surface border border-transparent hover:border-surface-border transition-all duration-200 cursor-pointer tap-target select-none',
          isActive && 'border-brand-500/40 bg-surface shadow-sm',
          className
        )}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="relative shrink-0">
            <MusicArtwork src={artwork} alt={title} size="md" />
            {isActive && isPlaying && (
              <div className="absolute inset-0 bg-brand-500/30 rounded-artwork flex items-center justify-center">
                <span className="w-2.5 h-2.5 rounded-full bg-brand-400 animate-pulse" />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <Link
              to={`/song/${track.id}`}
              onClick={(e) => e.stopPropagation()}
              className={cn(
                'text-sm font-semibold truncate block hover:underline hover:text-brand-300 transition-colors',
                isActive ? 'text-brand-400' : 'text-content-primary'
              )}
            >
              {title}
            </Link>
            <p className="text-xs text-content-secondary truncate mt-0.5">
              {artist}
              {album ? ` • ${album}` : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          {track.durationSeconds !== undefined && track.durationSeconds > 0 && (
            <span className="text-[11px] text-content-muted tabular-nums mr-1 hidden xs:inline">
              {Math.floor(track.durationSeconds / 60)}:
              {String(track.durationSeconds % 60).padStart(2, '0')}
            </span>
          )}

          {/* Like Heart Button (if authenticated and showActions) */}
          {isAuthenticated && showActions && (
            <IconButton
              icon={
                <Heart
                  className={cn(
                    'w-4 h-4 transition-colors',
                    isLiked ? 'text-brand-400 fill-brand-400' : 'text-content-muted hover:text-content-primary'
                  )}
                />
              }
              aria-label={isLiked ? `Unlike ${title}` : `Like ${title}`}
              variant="ghost"
              size="sm"
              onClick={handleLikeClick}
              disabled={isLikeLoading}
            />
          )}

          {/* Add to Playlist Button (if authenticated and showActions) */}
          {isAuthenticated && showActions && (
            <IconButton
              icon={<ListPlus className="w-4 h-4 text-content-muted hover:text-content-primary" />}
              aria-label={`Add ${title} to playlist`}
              variant="ghost"
              size="sm"
              onClick={handlePlaylistClick}
            />
          )}

          {/* Dedicated Play Button */}
          <IconButton
            icon={
              isActive && isPlaying ? (
                <Pause className="w-4 h-4 text-brand-400 fill-current" />
              ) : (
                <Play className="w-4 h-4 text-content-primary fill-current" />
              )
            }
            aria-label={isActive && isPlaying ? `Pause ${title}` : `Play ${title}`}
            variant={isActive ? 'primary' : 'secondary'}
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onPlay?.();
            }}
          />
        </div>
      </div>

      {showPlaylistModal && (
        <PlaylistPickerModal
          isOpen={showPlaylistModal}
          onClose={() => setShowPlaylistModal(false)}
          track={normalizedTrackItem}
        />
      )}
    </>
  );
};
