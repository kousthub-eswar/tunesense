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

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Return null when no track is queued or active (removes intrusive standby banner)
  if (!currentTrack) {
    return null;
  }

  return (
    <div
      className={cn(
        'mx-3 mb-2 bg-[#15151f]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-player overflow-hidden select-none transition-all duration-200',
        className
      )}
    >
      {/* Interactive Progress Seek Bar */}
      <div
        className="w-full bg-white/10 h-1 cursor-pointer relative group flex items-center"
        onClick={(e) => {
          e.stopPropagation();
          const rect = e.currentTarget.getBoundingClientRect();
          const clickX = e.clientX - rect.left;
          const ratio = Math.max(0, Math.min(clickX / rect.width, 1));
          seek(ratio * duration);
        }}
      >
        <div
          className="bg-brand-500 h-1 transition-all duration-100 group-hover:bg-brand-400"
          style={{ width: `${progressPercent}%` }}
        />
        <div
          className="absolute w-2.5 h-2.5 bg-white rounded-full -ml-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow"
          style={{ left: `${progressPercent}%` }}
        />
      </div>

      {/* Mini Player Body */}
      <div
        onClick={() => navigate('/player')}
        className="px-3 py-2 flex items-center justify-between gap-2.5 cursor-pointer hover:bg-white/[0.03] transition-colors"
      >
        {/* Track Artwork & Info */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <MusicArtwork
            src={currentTrack.artworkUrl}
            alt={currentTrack.title}
            size="sm"
            className="rounded-lg shadow-sm"
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
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          {/* Like Heart Button */}
          {isAuthenticated && (
            <IconButton
              icon={
                <Heart
                  className={cn(
                    'w-3.5 h-3.5 transition-colors',
                    isLiked ? 'text-brand-400 fill-brand-400' : 'text-content-secondary'
                  )}
                />
              }
              aria-label={isLiked ? 'Unlike song' : 'Like song'}
              size="sm"
              onClick={handleLikeClick}
            />
          )}

          {/* Play / Pause Button */}
          <button
            type="button"
            onClick={togglePlayPause}
            disabled={isLoading}
            className="w-8 h-8 rounded-full bg-brand-500 hover:bg-brand-400 text-white flex items-center justify-center transition-transform active:scale-95 shadow-sm shadow-brand-500/30"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
            ) : isPlaying ? (
              <Pause className="w-3.5 h-3.5 fill-white" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
            )}
          </button>

          {/* Next Track Button */}
          <IconButton
            icon={<SkipForward className="w-3.5 h-3.5 text-content-secondary hover:text-white" />}
            aria-label="Next track"
            size="sm"
            onClick={playNext}
          />

          {/* Expand Full Player Button */}
          <IconButton
            icon={<Maximize2 className="w-3.5 h-3.5 text-content-muted hover:text-white" />}
            aria-label="Expand player"
            size="sm"
            onClick={() => navigate('/player')}
          />
        </div>
      </div>

      {/* Error Notice */}
      {error && (
        <div className="bg-vibe-rose/15 border-t border-vibe-rose/30 px-3 py-1 flex items-center gap-1.5 text-[10px] text-rose-300">
          <AlertCircle className="w-3 h-3 shrink-0 text-vibe-rose" />
          <span className="truncate">{error}</span>
        </div>
      )}
    </div>
  );
};
