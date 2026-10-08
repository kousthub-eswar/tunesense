import React, { useState } from 'react';
import { Play, Pause, Heart, ListPlus } from 'lucide-react';
import { Card } from '../ui/Card.js';
import { MusicArtwork } from '../music/MusicArtwork.js';
import { IconButton } from '../ui/IconButton.js';
import { RecommendationReason } from './RecommendationReason.js';
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
  const { isAuthenticated } = useAuth();
  const [isLiked, setIsLiked] = useState<boolean>(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState<boolean>(false);

  const song = recItem?.song;
  const title = song ? song.title : item?.title || 'Unknown Title';
  const subtitle = song ? song.artistName : item?.subtitle || 'Unknown Artist';
  const artwork = song ? song.artworkUrl : undefined;
  const reason = recItem ? recItem.reason : item?.reason || 'Recommended';

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
    } catch (err) {
      console.error('[RecommendationCard] Like toggle error:', err);
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
      <Card
        interactive
        onClick={handleCardClick}
        className={cn(
          'group flex flex-col gap-2.5 min-w-[200px] max-w-[240px] relative p-3 rounded-card transition-all duration-200',
          isActive && 'border-brand-500/40 bg-surface shadow-md',
          className
        )}
      >
        <div className="relative w-full aspect-square rounded-artwork overflow-hidden">
          <MusicArtwork
            src={artwork}
            alt={title}
            size="lg"
            className="w-full h-full aspect-square"
          />

          {/* Action Overlay: Like & Playlist on Top */}
          {isAuthenticated && (
            <div className="absolute top-2 right-2 flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity">
              <button
                onClick={handleLikeClick}
                className="w-7 h-7 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white hover:scale-110 transition-transform tap-target"
                aria-label={isLiked ? `Unlike ${title}` : `Like ${title}`}
              >
                <Heart
                  className={cn(
                    'w-3.5 h-3.5 transition-colors',
                    isLiked ? 'text-brand-400 fill-brand-400' : 'text-white'
                  )}
                />
              </button>
              <button
                onClick={handlePlaylistClick}
                className="w-7 h-7 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white hover:scale-110 transition-transform tap-target"
                aria-label={`Add ${title} to playlist`}
              >
                <ListPlus className="w-3.5 h-3.5 text-white" />
              </button>
            </div>
          )}

          {/* Quick Play Action Button Overlay on Bottom */}
          <div className="absolute bottom-2 right-2 opacity-95 group-hover:scale-105 transition-transform">
            <IconButton
              icon={
                isActive && isPlaying ? (
                  <Pause className="w-4 h-4 text-brand-400 fill-current" />
                ) : (
                  <Play className="w-4 h-4 text-content-primary fill-current ml-0.5" />
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

        <div className="flex flex-col min-w-0">
          <h4
            className={cn(
              'text-sm font-semibold truncate',
              isActive ? 'text-brand-400' : 'text-content-primary'
            )}
          >
            {title}
          </h4>
          <p className="text-xs text-content-secondary truncate mt-0.5">{subtitle}</p>
        </div>

        <div className="mt-auto pt-1">
          <RecommendationReason
            reason={reason}
            reasonType={recItem?.reasonType}
          />
        </div>
      </Card>

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
