import React from 'react';
import { Play, Pause } from 'lucide-react';
import { Card } from '../ui/Card.js';
import { MusicArtwork } from '../music/MusicArtwork.js';
import { IconButton } from '../ui/IconButton.js';
import { RecommendationReason } from './RecommendationReason.js';
import { RecommendationMetadata, RecommendationItemDto } from '../../types/index.js';
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
  const title = recItem ? recItem.song.title : item?.title || 'Unknown Title';
  const subtitle = recItem ? recItem.song.artistName : item?.subtitle || 'Unknown Artist';
  const artwork = recItem ? recItem.song.artworkUrl : undefined;
  const reason = recItem ? recItem.reason : item?.reason || 'Recommended';

  const handleCardClick = () => {
    if (onClick) {
      onClick();
    } else if (onPlay) {
      onPlay();
    }
  };

  return (
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

        {/* Quick Play Action Button Overlay */}
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
  );
};
