import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Pause, Heart, ListPlus, Disc } from 'lucide-react';
import { TrackItem } from '../../types/index.js';
import { useAuth } from '../../contexts/AuthContext.js';
import { libraryService } from '../../services/libraryService.js';
import { PlaylistPickerModal } from './PlaylistPickerModal.js';
import { cn } from '../../utils/cn.js';

export interface TrackArtworkCardProps {
  track: TrackItem;
  isActive?: boolean;
  isPlaying?: boolean;
  onPlay?: () => void;
  onClick?: () => void;
  badge?: string;
  className?: string;
}

export const TrackArtworkCard: React.FC<TrackArtworkCardProps> = ({
  track,
  isActive = false,
  isPlaying = false,
  onPlay,
  onClick,
  badge,
  className,
}) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [isLiked, setIsLiked] = useState<boolean>(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState<boolean>(false);

  useEffect(() => {
    if (track && isAuthenticated) {
      libraryService
        .checkLikes([track.id])
        .then((res) => {
          setIsLiked(Boolean(res[track.id]));
        })
        .catch(() => {});
    }
  }, [track.id, isAuthenticated]);

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) return;
    const nextState = !isLiked;
    setIsLiked(nextState);
    try {
      if (nextState) {
        await libraryService.likeSong(track.id);
      } else {
        await libraryService.unlikeSong(track.id);
      }
    } catch {
      setIsLiked(!nextState);
    }
  };

  const handlePlaylist = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) return;
    setShowPlaylistModal(true);
  };

  const handleCardClick = () => {
    if (onClick) {
      onClick();
    } else if (onPlay) {
      onPlay();
    }
  };

  return (
    <>
      <div
        onClick={handleCardClick}
        className={cn(
          'group flex flex-col w-36 sm:w-40 md:w-44 shrink-0 rounded-xl p-2.5 bg-surface/60 hover:bg-surface border border-surface-border/60 hover:border-surface-border transition-all duration-200 cursor-pointer select-none',
          isActive && 'border-brand-500/40 bg-surface ring-1 ring-brand-500/20',
          className
        )}
      >
        {/* Artwork Image Container */}
        <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-surface-secondary mb-2 shadow-sm">
          {track.artworkUrl ? (
            <img
              src={track.artworkUrl}
              alt={track.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-brand-400">
              <Disc className={cn('w-10 h-10', isPlaying && 'animate-spin')} />
            </div>
          )}

          {/* Badge if provided */}
          {badge && (
            <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-sm text-[10px] font-semibold text-brand-300 border border-white/10 uppercase tracking-wider pointer-events-none">
              {badge}
            </span>
          )}

          {/* Overlay Actions on Hover / Active */}
          <div
            className={cn(
              'absolute inset-0 bg-black/35 backdrop-blur-[1px] flex items-center justify-center transition-opacity duration-200',
              isActive && isPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            )}
          >
            {/* Play / Pause Circular Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onPlay?.();
              }}
              className="w-10 h-10 rounded-full bg-brand-500 hover:bg-brand-400 text-white flex items-center justify-center shadow-lg shadow-brand-500/40 transition-transform active:scale-95"
              aria-label={isActive && isPlaying ? 'Pause' : 'Play'}
            >
              {isActive && isPlaying ? (
                <Pause className="w-4 h-4 fill-white" />
              ) : (
                <Play className="w-4 h-4 fill-white ml-0.5" />
              )}
            </button>
          </div>

          {/* Top Right Quick Actions (Like + Playlist) */}
          {isAuthenticated && (
            <div className="absolute top-1.5 right-1.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                type="button"
                onClick={handleLike}
                className="w-7 h-7 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white hover:scale-110 transition-transform"
                aria-label={isLiked ? 'Unlike song' : 'Like song'}
              >
                <Heart
                  className={cn(
                    'w-3.5 h-3.5 transition-colors',
                    isLiked ? 'text-brand-400 fill-brand-400' : 'text-white'
                  )}
                />
              </button>
              <button
                type="button"
                onClick={handlePlaylist}
                className="w-7 h-7 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white hover:scale-110 transition-transform"
                aria-label="Add to playlist"
              >
                <ListPlus className="w-3.5 h-3.5 text-white" />
              </button>
            </div>
          )}
        </div>

        {/* Track Metadata with line-clamp-2 */}
        <div className="min-w-0 flex flex-col flex-1 justify-between">
          <h4
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/song/${track.id}`);
            }}
            className={cn(
              'text-xs sm:text-sm font-semibold line-clamp-2 leading-snug min-h-[2.1rem] hover:text-brand-300 transition-colors',
              isActive ? 'text-brand-400' : 'text-content-primary'
            )}
            title={track.title}
          >
            {track.title}
          </h4>
          <p className="text-[11px] sm:text-xs text-content-secondary truncate mt-1">
            {track.artistName}
          </p>
        </div>
      </div>

      {showPlaylistModal && (
        <PlaylistPickerModal
          isOpen={showPlaylistModal}
          onClose={() => setShowPlaylistModal(false)}
          track={track}
        />
      )}
    </>
  );
};
