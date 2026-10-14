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
          'group flex flex-col w-36 sm:w-44 md:w-48 shrink-0 rounded-[24px] p-3 bg-white/70 dark:bg-slate-900/70 hover:bg-white/95 dark:hover:bg-slate-800/90 backdrop-blur-xl border border-white/60 dark:border-white/10 shadow-panel transition-all duration-200 cursor-pointer select-none text-ink dark:text-slate-100',
          isActive && 'ring-2 ring-ultramarine ring-offset-2 ring-offset-fog dark:ring-offset-slate-950',
          className
        )}
      >
        {/* Artwork Image Container with 20px radius */}
        <div className="relative w-full aspect-square rounded-[20px] overflow-hidden bg-black/5 dark:bg-white/5 mb-2.5 shadow-sm">
          {track.artworkUrl ? (
            <img
              src={track.artworkUrl}
              alt={track.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-ultramarine">
              <Disc className={cn('w-10 h-10', isPlaying && 'animate-spin')} />
            </div>
          )}

          {/* Badge if provided (sentence case, 10px chip radius) */}
          {badge && (
            <span className="absolute top-2 left-2 px-2.5 py-0.5 rounded-[10px] bg-white/90 dark:bg-slate-800/90 backdrop-blur-md text-[11px] font-semibold text-ink dark:text-slate-100 border border-white/60 dark:border-white/10 shadow-subtle pointer-events-none">
              {badge}
            </span>
          )}

          {/* Overlay Actions on Hover / Active */}
          <div
            className={cn(
              'absolute inset-0 bg-ink/20 backdrop-blur-[1px] flex items-center justify-center transition-opacity duration-200',
              isActive && isPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            )}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onPlay?.();
              }}
              className="w-10 h-10 rounded-full bg-ultramarine hover:bg-ultramarine-hover text-white flex items-center justify-center shadow-pill transition-transform active:scale-95"
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
                className="w-7 h-7 rounded-full bg-white/90 dark:bg-slate-800/90 backdrop-blur-md flex items-center justify-center text-ink dark:text-slate-100 hover:scale-110 transition-transform shadow-sm"
                aria-label={isLiked ? 'Unlike song' : 'Like song'}
              >
                <Heart
                  className={cn(
                    'w-3.5 h-3.5 transition-colors',
                    isLiked ? 'text-tangerine fill-tangerine' : 'text-ink/60 dark:text-slate-400'
                  )}
                />
              </button>
              <button
                type="button"
                onClick={handlePlaylist}
                className="w-7 h-7 rounded-full bg-white/90 dark:bg-slate-800/90 backdrop-blur-md flex items-center justify-center text-ink dark:text-slate-100 hover:scale-110 transition-transform shadow-sm"
                aria-label="Add to playlist"
              >
                <ListPlus className="w-3.5 h-3.5 text-ink/60 dark:text-slate-400" />
              </button>
            </div>
          )}
        </div>

        {/* Track Title and Artist (Sentence case) */}
        <div className="flex-1 min-w-0">
          <h4
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/song/${track.id}`);
            }}
            className="font-display font-bold text-scale-14 text-ink hover:text-ultramarine transition-colors truncate"
            title={track.title}
          >
            {track.title}
          </h4>
          <p className="text-xs text-ink/60 truncate mt-0.5 font-medium">
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
