import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Play,
  Pause,
  SkipForward,
  Heart,
  Disc,
  AlertCircle,
  Loader2,
  Maximize2,
} from 'lucide-react';
import { IconButton } from '../ui/IconButton.js';
import { MusicArtwork } from './MusicArtwork.js';
import { useAudioPlayer } from '../../contexts/AudioPlayerContext.js';
import { useAuth } from '../../contexts/AuthContext.js';
import { libraryService } from '../../services/libraryService.js';
import { cn } from '../../utils/cn.js';

export interface MiniPlayerProps {
  className?: string;
}

export const MiniPlayer: React.FC<MiniPlayerProps> = ({ className }) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const {
    currentTrack,
    isPlaying,
    isLoading,
    currentTime,
    duration,
    error,
    togglePlayPause,
    playNext,
    seek,
  } = useAudioPlayer();

  const [isLiked, setIsLiked] = useState(false);

  useEffect(() => {
    if (currentTrack && isAuthenticated) {
      libraryService.checkLikes([currentTrack.id]).then((res) => {
        setIsLiked(Boolean(res[currentTrack.id]));
      }).catch(() => {});
    }
  }, [currentTrack?.id, isAuthenticated]);

  const handleLikeClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentTrack || !isAuthenticated) return;

    const nextLiked = !isLiked;
    setIsLiked(nextLiked);
    try {
      if (nextLiked) {
        await libraryService.likeSong(currentTrack.id);
      } else {
        await libraryService.unlikeSong(currentTrack.id);
      }
    } catch {
      setIsLiked(!nextLiked);
    }
  };

  const formatTime = (seconds: number): string => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Standby state when no track has been selected yet
  if (!currentTrack) {
    return (
      <div
        className={cn(
          'mx-3 mb-2 p-2.5 bg-bg-elevated/95 backdrop-blur-md border border-surface-border rounded-player shadow-player flex items-center justify-between select-none',
          className
        )}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <MusicArtwork
            size="sm"
            fallbackIcon={<Disc className="w-5 h-5 text-brand-400" />}
          />
          <div className="min-w-0 flex-1">
            <h5 className="text-xs font-semibold text-content-primary truncate">
              Audio Standby
            </h5>
            <p className="text-[11px] text-content-muted truncate">
              Search or select a track to listen
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'mx-3 mb-2 bg-bg-elevated/95 backdrop-blur-md border border-surface-border rounded-player shadow-player overflow-hidden select-none transition-all duration-200',
        className
      )}
    >
      {/* Interactive Progress Seek Bar */}
      <div
        className="w-full bg-white/10 h-1.5 cursor-pointer relative group tap-target flex items-center -my-1"
        onClick={(e) => {
          e.stopPropagation();
          const rect = e.currentTarget.getBoundingClientRect();
          const clickX = e.clientX - rect.left;
          const ratio = Math.max(0, Math.min(clickX / rect.width, 1));
          seek(ratio * duration);
        }}
      >
        <div
          className="bg-brand-500 h-1.5 transition-all duration-100 group-hover:bg-brand-400"
          style={{ width: `${progressPercent}%` }}
        />
        {/* Scrubber Knob */}
        <div
          className="absolute w-3 h-3 bg-white rounded-full shadow -ml-1.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
          style={{ left: `${progressPercent}%` }}
        />
      </div>

      {/* Player Body */}
      <div
        onClick={() => navigate('/player')}
        className="p-2.5 flex items-center justify-between gap-2 cursor-pointer hover:bg-surface/40 transition-colors"
      >
        {/* Track Info */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <MusicArtwork
            src={currentTrack.artworkUrl}
            alt={currentTrack.title}
            size="sm"
            fallbackIcon={
              <Disc
                className={cn(
                  'w-5 h-5 text-brand-400',
                  isPlaying && 'animate-spin'
                )}
                style={{ animationDuration: '4s' }}
              />
            }
          />

          <div className="min-w-0 flex-1">
            <h5 className="text-xs font-semibold text-content-primary truncate">
              {currentTrack.title}
            </h5>
            <p className="text-[11px] text-content-secondary truncate">
              {currentTrack.artistName}
            </p>
            {/* Playback time indicators */}
            <div className="text-[10px] text-content-muted font-mono mt-0.5">
              <span>{formatTime(currentTime)}</span>
              <span> / </span>
              <span>{formatTime(duration || currentTrack.durationSeconds)}</span>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          {/* Like Heart Button */}
          {isAuthenticated && (
            <IconButton
              icon={
                <Heart
                  className={cn(
                    'w-4 h-4 transition-colors',
                    isLiked ? 'text-brand-400 fill-brand-400' : 'text-content-secondary'
                  )}
                />
              }
              aria-label={isLiked ? 'Unlike song' : 'Like song'}
              size="sm"
              onClick={handleLikeClick}
            />
          )}

          {/* Play / Pause / Loading Button */}
          <IconButton
            icon={
              isLoading ? (
                <Loader2 className="w-4 h-4 text-brand-400 animate-spin" />
              ) : isPlaying ? (
                <Pause className="w-4 h-4 text-white fill-white" />
              ) : (
                <Play className="w-4 h-4 text-white fill-white ml-0.5" />
              )
            }
            aria-label={isPlaying ? 'Pause' : 'Play'}
            variant="primary"
            size="md"
            onClick={togglePlayPause}
            disabled={isLoading}
          />

          {/* Next Track Button */}
          <IconButton
            icon={<SkipForward className="w-4 h-4 text-content-secondary" />}
            aria-label="Next track"
            size="sm"
            onClick={playNext}
          />

          {/* Full Player Expand Button */}
          <IconButton
            icon={<Maximize2 className="w-3.5 h-3.5 text-content-muted hover:text-content-primary" />}
            aria-label="Expand player"
            size="sm"
            onClick={() => navigate('/player')}
          />
        </div>
      </div>

      {/* Error Notice */}
      {error && (
        <div className="bg-vibe-rose/15 border-t border-vibe-rose/30 px-3 py-1 flex items-center gap-1.5 text-[11px] text-rose-300">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 text-vibe-rose" />
          <span className="truncate">{error}</span>
        </div>
      )}
    </div>
  );
};
