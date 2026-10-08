import React from 'react';
import { Play, Pause } from 'lucide-react';
import { MusicArtwork } from './MusicArtwork.js';
import { IconButton } from '../ui/IconButton.js';
import { TrackItem, TrackMetadata } from '../../types/index.js';
import { cn } from '../../utils/cn.js';

export interface SongCardProps {
  track: TrackItem | TrackMetadata;
  onPlay?: () => void;
  onClick?: () => void;
  onOptionsClick?: () => void;
  isActive?: boolean;
  isPlaying?: boolean;
  className?: string;
}

export const SongCard: React.FC<SongCardProps> = ({
  track,
  onPlay,
  onClick,
  isActive = false,
  isPlaying = false,
  className,
}) => {
  const isMetadata = 'artist' in track;
  const title = track.title;
  const artist = isMetadata ? track.artist : track.artistName;
  const album = isMetadata ? track.album : track.albumTitle;
  const artwork = isMetadata ? track.coverUrl : track.artworkUrl;

  return (
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
          {/* Subtle overlay badge for active track */}
          {isActive && isPlaying && (
            <div className="absolute inset-0 bg-brand-500/30 rounded-artwork flex items-center justify-center">
              <span className="w-2.5 h-2.5 rounded-full bg-brand-400 animate-pulse" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h4
            className={cn(
              'text-sm font-semibold truncate',
              isActive ? 'text-brand-400' : 'text-content-primary'
            )}
          >
            {title}
          </h4>
          <p className="text-xs text-content-secondary truncate mt-0.5">
            {artist}
            {album ? ` • ${album}` : ''}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 ml-2">
        {track.durationSeconds !== undefined && track.durationSeconds > 0 && (
          <span className="text-[11px] text-content-muted tabular-nums mr-1">
            {Math.floor(track.durationSeconds / 60)}:
            {String(track.durationSeconds % 60).padStart(2, '0')}
          </span>
        )}

        {/* Dedicated Touch-friendly Play Button */}
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
  );
};
