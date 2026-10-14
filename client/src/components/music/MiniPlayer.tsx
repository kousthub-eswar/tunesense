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
  ChevronUp,
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
      libraryService
        .checkLikes([currentTrack.id])
        .then((res) => {
          setIsLiked(Boolean(res[currentTrack.id]));
        })
        .catch(() => {});
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

  if (!currentTrack) {
    return null;
  }

  return (
    <div
      onClick={() => navigate('/player')}
      role="region"
      aria-label="Now playing bar"
      className={cn(
        'group relative w-full bg-white/85 dark:bg-slate-900/90 hover:bg-white/95 dark:hover:bg-slate-900/98 backdrop-blur-2xl border border-white/80 dark:border-white/10 rounded-full shadow-pill transition-all duration-300 cursor-pointer overflow-hidden select-none',
        className
      )}
    >
      {/* Integrated Slim Progress Line along the top */}
      <div
        className="w-full h-1 bg-black/5 dark:bg-white/10 cursor-pointer relative"
        onClick={(e) => {
          e.stopPropagation();
          const rect = e.currentTarget.getBoundingClientRect();
          const clickX = e.clientX - rect.left;
          const ratio = Math.max(0, Math.min(clickX / rect.width, 1));
          seek(ratio * duration);
        }}
      >
        <div
          className="h-full bg-ultramarine transition-all duration-100 rounded-full"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="px-3.5 py-2 flex items-center justify-between gap-3">
        {/* Artwork thumb + Track info */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 shadow-sm border border-black/5 dark:border-white/10 relative">
            <MusicArtwork
              src={currentTrack.artworkUrl}
              alt={currentTrack.title}
              size="sm"
              className="w-full h-full object-cover"
              fallbackIcon={
                <Disc
                  className={cn(
                    'w-5 h-5 text-ultramarine',
                    isPlaying && 'animate-spin'
                  )}
                  style={{ animationDuration: '4s' }}
                />
              }
            />
          </div>

          <div className="min-w-0 flex-1">
            <h5 className="text-scale-14 font-semibold text-ink dark:text-slate-100 truncate leading-tight">
              {currentTrack.title}
            </h5>
            <p className="text-xs text-ink/60 dark:text-slate-400 truncate mt-0.5">
              {currentTrack.artistName}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div
          className="flex items-center gap-1.5 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          {isAuthenticated && (
            <IconButton
              icon={
                <Heart
                  className={cn(
                    'w-4 h-4 transition-colors',
                    isLiked ? 'text-tangerine fill-tangerine' : 'text-ink/50 dark:text-slate-400 hover:text-ink dark:hover:text-white'
                  )}
                />
              }
              aria-label={isLiked ? 'Unlike song' : 'Like song'}
              size="sm"
              onClick={handleLikeClick}
              className="hover:bg-black/5 dark:hover:bg-white/10"
            />
          )}

          <button
            type="button"
            onClick={togglePlayPause}
            disabled={isLoading}
            className="w-9 h-9 rounded-full bg-ultramarine hover:bg-ultramarine-hover text-white flex items-center justify-center transition-transform active:scale-95 shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ultramarine"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : isPlaying ? (
              <Pause className="w-4 h-4 fill-white" />
            ) : (
              <Play className="w-4 h-4 fill-white ml-0.5" />
            )}
          </button>

          <IconButton
            icon={<SkipForward className="w-4 h-4 text-ink/60 dark:text-slate-400 hover:text-ink dark:hover:text-white" />}
            aria-label="Next track"
            size="sm"
            onClick={playNext}
            className="hover:bg-black/5 dark:hover:bg-white/10"
          />

          <IconButton
            icon={<ChevronUp className="w-4 h-4 text-ink/40 dark:text-slate-400 group-hover:text-ink/80 dark:group-hover:text-slate-200 transition-colors" />}
            aria-label="Open full player"
            size="sm"
            onClick={() => navigate('/player')}
            className="hover:bg-black/5 hidden xs:inline-flex"
          />
        </div>
      </div>

      {error && (
        <div className="bg-tangerine/10 border-t border-tangerine/20 px-3.5 py-1 flex items-center gap-1.5 text-[11px] text-[#A63A0B]">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 text-tangerine" />
          <span className="truncate">{error}</span>
        </div>
      )}
    </div>
  );
};
