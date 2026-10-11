import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Pause, Heart, ListPlus, Disc } from 'lucide-react';
import { RecommendationMetadata, RecommendationItemDto } from '../../types/index.js';
import { useAuth } from '../../contexts/AuthContext.js';
import { libraryService } from '../../services/libraryService.js';
import { PlaylistPickerModal } from '../music/PlaylistPickerModal.js';
import { cn } from '../../utils/cn.js';

export interface RecommendationCardProps {
  item?: RecommendationMetadata;
  recItem?: RecommendationItemDto;
  onPlay?: () => void;
  onClick?: () => void;
  isActive?: boolean;
  isPlaying?: boolean;
  className?: string;
}

export const RecommendationCard: React.FC<RecommendationCardProps> = ({
  item,
  recItem,
  onPlay,
  onClick,
  isActive = false,
  isPlaying = false,
  className,
}) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [isLiked, setIsLiked] = useState<boolean>(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState<boolean>(false);

  const song = recItem?.song;
  const title = song ? song.title : item?.title || 'Unknown Title';
  const subtitle = song ? song.artistName : item?.subtitle || 'Unknown Artist';
  const artwork = song ? song.artworkUrl : undefined;
  const reason = recItem ? recItem.reason : item?.reason || 'Recommended for you';

  const handleCardClick = () => {
    if (onClick) {
      onClick();
    } else if (onPlay) {
      onPlay();
    }
  };

  const handleLikeClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated || !song) return;

    const nextLiked = !isLiked;
    setIsLiked(nextLiked);

    try {
      if (nextLiked) {
        await libraryService.likeSong(song.id);
      } else {
        await libraryService.unlikeSong(song.id);
      }
    } catch {
      setIsLiked(!nextLiked);
    }
  };

  const handlePlaylistClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated || !song) return;
    setShowPlaylistModal(true);
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
        {/* Artwork Image */}
        <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-surface-secondary mb-2 shadow-sm">
          {artwork ? (
            <img
              src={artwork}
              alt={title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-brand-400">
              <Disc className={cn('w-10 h-10', isPlaying && 'animate-spin')} />
            </div>
          )}

          {/* Hover Play Button */}
          <div
            className={cn(
              'absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center transition-opacity duration-200',
              isActive && isPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            )}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onPlay?.();
              }}
              className="w-10 h-10 rounded-full bg-brand-500 hover:bg-brand-600 text-white flex items-center justify-center shadow-md transition-transform active:scale-95"
              aria-label={isActive && isPlaying ? 'Pause' : 'Play'}
            >
              {isActive && isPlaying ? (
                <Pause className="w-4 h-4 fill-white" />
              ) : (
                <Play className="w-4 h-4 fill-white ml-0.5" />
              )}
            </button>
          </div>

          {/* Quick Actions (Top Right) */}
          {isAuthenticated && song && (
            <div className="absolute top-1.5 right-1.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                type="button"
                onClick={handleLikeClick}
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
                onClick={handlePlaylistClick}
                className="w-7 h-7 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white hover:scale-110 transition-transform"
                aria-label="Add to playlist"
              >
                <ListPlus className="w-3.5 h-3.5 text-white" />
              </button>
            </div>
          )}
        </div>

        {/* Text Details */}
        <div className="min-w-0 flex flex-col flex-1 justify-between">
          <div>
            <h4
              onClick={(e) => {
                if (song?.id) {
                  e.stopPropagation();
                  navigate(`/song/${song.id}`);
                }
              }}
              className={cn(
                'text-xs sm:text-sm font-semibold line-clamp-2 leading-snug min-h-[2.1rem] hover:text-brand-300 transition-colors',
                isActive ? 'text-brand-400' : 'text-content-primary'
              )}
              title={title}
            >
              {title}
            </h4>
            <p className="text-[11px] sm:text-xs text-content-secondary truncate mt-1">
              {subtitle}
            </p>
          </div>

          {/* Contextual Reason / Hint */}
          {reason && (
            <p className="text-[10px] text-brand-300/80 truncate mt-1.5 font-medium">
              {reason}
            </p>
          )}
        </div>
      </div>

      {showPlaylistModal && song && (
        <PlaylistPickerModal
          isOpen={showPlaylistModal}
          onClose={() => setShowPlaylistModal(false)}
          track={song}
        />
      )}
    </>
  );
};

export default RecommendationCard;
