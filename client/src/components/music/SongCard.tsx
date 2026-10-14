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
  reason?: string;
  variant?: 'row' | 'featured';
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
  reason,
  variant = 'row',
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

  // Featured Card Layout (Large edge-to-edge artwork on top)
  if (variant === 'featured') {
    return (
      <>
        <div
          onClick={onClick || onPlay}
          className={cn(
            'group relative flex flex-col p-4 bg-white/75 dark:bg-slate-900/75 hover:bg-white/90 dark:hover:bg-slate-800/90 backdrop-blur-xl border border-white/70 dark:border-white/10 rounded-[28px] shadow-panel transition-all duration-200 cursor-pointer text-ink dark:text-slate-100 overflow-hidden',
            isActive && 'ring-2 ring-ultramarine ring-offset-2 ring-offset-fog dark:ring-offset-slate-950',
            className
          )}
        >
          {/* Edge-to-edge Large Artwork */}
          <div className="relative w-full aspect-square rounded-[20px] overflow-hidden mb-3.5 shadow-sm bg-black/5 dark:bg-white/5">
            <MusicArtwork src={artwork} alt={title} size="lg" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-end p-3">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onPlay?.();
                }}
                className="w-11 h-11 rounded-full bg-ultramarine text-white flex items-center justify-center shadow-pill hover:scale-105 active:scale-95 transition-transform"
                aria-label={isActive && isPlaying ? `Pause ${title}` : `Play ${title}`}
              >
                {isActive && isPlaying ? (
                  <Pause className="w-5 h-5 fill-white" />
                ) : (
                  <Play className="w-5 h-5 fill-white ml-0.5" />
                )}
              </button>
            </div>
          </div>

          <div className="flex flex-col flex-1 min-w-0">
            <h4 className="font-display font-bold text-scale-16 text-ink dark:text-slate-100 truncate group-hover:text-ultramarine transition-colors">
              {title}
            </h4>
            <p className="text-scale-14 text-ink/65 dark:text-slate-300 truncate mt-0.5 font-medium">
              {artist}
            </p>
            {reason && (
              <p className="text-xs text-ink/50 dark:text-slate-400 line-clamp-1 mt-1">
                {reason}
              </p>
            )}
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
  }

  // Row Layout (Artwork 20px radius, title/artist, small reason text, duration)
  return (
    <>
      <div
        onClick={onClick || onPlay}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            (onClick || onPlay)?.();
          }
        }}
        className={cn(
          'group flex items-center justify-between p-2.5 sm:p-3 rounded-[20px] bg-white/60 dark:bg-slate-900/60 hover:bg-white/90 dark:hover:bg-slate-800/90 backdrop-blur-md border border-white/60 dark:border-white/10 shadow-subtle hover:shadow-panel transition-all duration-200 cursor-pointer select-none text-ink dark:text-slate-100 gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-ultramarine',
          isActive && 'bg-white/95 dark:bg-slate-800/95 border-ultramarine/30 ring-1 ring-ultramarine/40',
          className
        )}
      >
        {/* Left: Artwork + Title/Artist + Small Reason */}
        <div className="flex items-center gap-3.5 min-w-0 flex-1">
          <div className="relative shrink-0 w-12 h-12 rounded-[20px] overflow-hidden shadow-sm bg-black/5 dark:bg-white/5">
            <MusicArtwork src={artwork} alt={title} size="md" className="w-full h-full object-cover" />
            {isActive && isPlaying && (
              <div className="absolute inset-0 bg-ultramarine/30 backdrop-blur-[1px] flex items-center justify-center">
                <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <Link
              to={`/song/${track.id}`}
              onClick={(e) => e.stopPropagation()}
              className={cn(
                'text-scale-16 font-semibold truncate block hover:text-ultramarine transition-colors',
                isActive ? 'text-ultramarine' : 'text-ink'
              )}
            >
              {title}
            </Link>
            <div className="flex items-center gap-1.5 text-xs text-ink/60 truncate mt-0.5">
              <span className="truncate">{artist}</span>
              {album && <span className="opacity-40">•</span>}
              {album && <span className="truncate opacity-75">{album}</span>}
            </div>
            {reason && (
              <p className="text-[11px] text-ink/50 truncate mt-0.5 font-normal">
                {reason}
              </p>
            )}
          </div>
        </div>

        {/* Right: Duration + Actions */}
        <div className="flex items-center gap-1.5 shrink-0 ml-1">
          {track.durationSeconds !== undefined && track.durationSeconds > 0 && (
            <span className="text-xs text-ink/50 tabular-nums mr-1 hidden sm:inline">
              {Math.floor(track.durationSeconds / 60)}:
              {String(track.durationSeconds % 60).padStart(2, '0')}
            </span>
          )}

          {isAuthenticated && showActions && (
            <IconButton
              icon={
                <Heart
                  className={cn(
                    'w-4 h-4 transition-colors',
                    isLiked ? 'text-tangerine fill-tangerine' : 'text-ink/40 hover:text-ink'
                  )}
                />
              }
              aria-label={isLiked ? `Unlike ${title}` : `Like ${title}`}
              variant="ghost"
              size="sm"
              onClick={handleLikeClick}
              disabled={isLikeLoading}
              className="hover:bg-black/5 hidden xs:inline-flex"
            />
          )}

          {isAuthenticated && showActions && (
            <IconButton
              icon={<ListPlus className="w-4 h-4 text-ink/40 hover:text-ink" />}
              aria-label={`Add ${title} to playlist`}
              variant="ghost"
              size="sm"
              onClick={handlePlaylistClick}
              className="hover:bg-black/5 hidden sm:inline-flex"
            />
          )}

          <IconButton
            icon={
              isActive && isPlaying ? (
                <Pause className="w-4 h-4 text-white fill-white" />
              ) : (
                <Play className="w-4 h-4 text-white fill-white ml-0.5" />
              )
            }
            aria-label={isActive && isPlaying ? `Pause ${title}` : `Play ${title}`}
            variant="primary"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onPlay?.();
            }}
            className="w-8 h-8 min-w-[32px] min-h-[32px]"
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
