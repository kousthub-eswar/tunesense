import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  VolumeX,
  Heart,
  Maximize2,
  Disc,
  Loader2,
} from 'lucide-react';
import { useAudioPlayer } from '../../contexts/AudioPlayerContext.js';
import { useAuth } from '../../contexts/AuthContext.js';
import { libraryService } from '../../services/libraryService.js';
import { MusicArtwork } from './MusicArtwork.js';
import { IconButton } from '../ui/IconButton.js';
import { cn } from '../../utils/cn.js';

export const DesktopPlayer: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const {
    currentTrack,
    isPlaying,
    isLoading,
    currentTime,
    duration,
    volume,
    isMuted,
    isShuffle,
    repeatMode,
    togglePlayPause,
    playNext,
    playPrevious,
    toggleShuffle,
    toggleRepeat,
    seek,
    setVolume,
    toggleMute,
  } = useAudioPlayer();

  const [isLiked, setIsLiked] = useState<boolean>(false);

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

  const handleToggleLike = async () => {
    if (!currentTrack || !isAuthenticated) return;
    const nextState = !isLiked;
    setIsLiked(nextState);
    try {
      if (nextState) {
        await libraryService.likeSong(currentTrack.id);
      } else {
        await libraryService.unlikeSong(currentTrack.id);
      }
    } catch {
      setIsLiked(!nextState);
    }
  };

  const formatTime = (secs: number): string => {
    if (!secs || isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Standby bar when no track is queued
  if (!currentTrack) {
    return (
      <div className="hidden md:flex fixed bottom-0 left-0 right-0 h-20 bg-bg-elevated/95 backdrop-blur-xl border-t border-surface-border px-6 items-center justify-between z-40 select-none">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-surface/80 border border-surface-border flex items-center justify-center text-content-muted">
            <Disc className="w-6 h-6 text-brand-400/60" />
          </div>
          <div>
            <p className="text-xs font-semibold text-content-secondary">Audio Player Standby</p>
            <p className="text-[11px] text-content-muted">Select any song, mood, or recommendation to start listening</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-content-muted">
          <span>Creative Commons Audio via Jamendo API</span>
        </div>
      </div>
    );
  }

  return (
    <footer className="hidden md:flex fixed bottom-0 left-0 right-0 h-20 bg-bg-elevated/95 backdrop-blur-xl border-t border-surface-border px-6 items-center justify-between z-40 select-none transition-all duration-200">
      {/* Left: Track Information */}
      <div className="flex items-center gap-3 w-1/4 min-w-[200px] max-w-[320px]">
        <MusicArtwork
          src={currentTrack.artworkUrl}
          alt={currentTrack.title}
          size="md"
          fallbackIcon={
            <Disc className={cn('w-6 h-6 text-brand-400', isPlaying && 'animate-spin')} style={{ animationDuration: '4s' }} />
          }
        />
        <div className="min-w-0 flex-1">
          <NavLink
            to={`/song/${currentTrack.id}`}
            className="text-xs font-semibold text-content-primary hover:text-brand-300 truncate block transition-colors"
          >
            {currentTrack.title}
          </NavLink>
          <p className="text-[11px] text-content-secondary truncate">
            {currentTrack.artistName}
          </p>
        </div>

        {isAuthenticated && (
          <IconButton
            icon={
              <Heart
                className={cn(
                  'w-4 h-4 transition-colors',
                  isLiked ? 'text-brand-400 fill-brand-400' : 'text-content-muted hover:text-content-primary'
                )}
              />
            }
            aria-label={isLiked ? 'Unlike song' : 'Like song'}
            size="sm"
            onClick={handleToggleLike}
          />
        )}
      </div>

      {/* Center: Playback Controls & Progress Bar */}
      <div className="flex flex-col items-center justify-center flex-1 max-w-xl px-4">
        {/* Buttons */}
        <div className="flex items-center gap-3 mb-1.5">
          <IconButton
            icon={
              <Shuffle
                className={cn(
                  'w-3.5 h-3.5',
                  isShuffle ? 'text-brand-400' : 'text-content-muted hover:text-content-primary'
                )}
              />
            }
            aria-label="Toggle shuffle"
            size="sm"
            onClick={toggleShuffle}
          />

          <IconButton
            icon={<SkipBack className="w-4 h-4 text-content-secondary hover:text-content-primary" />}
            aria-label="Previous track"
            size="sm"
            onClick={playPrevious}
          />

          <button
            onClick={togglePlayPause}
            disabled={isLoading}
            className="w-9 h-9 rounded-full bg-brand-500 hover:bg-brand-400 text-white flex items-center justify-center transition-transform active:scale-95 shadow-md shadow-brand-500/25"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isPlaying ? (
              <Pause className="w-4 h-4 fill-current" />
            ) : (
              <Play className="w-4 h-4 fill-current ml-0.5" />
            )}
          </button>

          <IconButton
            icon={<SkipForward className="w-4 h-4 text-content-secondary hover:text-content-primary" />}
            aria-label="Next track"
            size="sm"
            onClick={playNext}
          />

          <IconButton
            icon={
              repeatMode === 'one' ? (
                <Repeat1 className="w-3.5 h-3.5 text-brand-400" />
              ) : (
                <Repeat
                  className={cn(
                    'w-3.5 h-3.5',
                    repeatMode === 'all' ? 'text-brand-400' : 'text-content-muted hover:text-content-primary'
                  )}
                />
              )
            }
            aria-label="Toggle repeat"
            size="sm"
            onClick={toggleRepeat}
          />
        </div>

        {/* Progress Seek Scrubber */}
        <div className="w-full flex items-center gap-2.5 text-[10px] text-content-muted font-mono">
          <span>{formatTime(currentTime)}</span>
          <div
            className="relative flex-1 h-1.5 bg-white/10 rounded-full cursor-pointer group flex items-center"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const clickX = e.clientX - rect.left;
              const ratio = Math.max(0, Math.min(clickX / rect.width, 1));
              seek(ratio * duration);
            }}
          >
            <div
              className="bg-brand-500 h-1.5 rounded-full transition-all group-hover:bg-brand-400"
              style={{ width: `${progressPercent}%` }}
            />
            <div
              className="absolute w-2.5 h-2.5 bg-white rounded-full -ml-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow"
              style={{ left: `${progressPercent}%` }}
            />
          </div>
          <span>{formatTime(duration || currentTrack.durationSeconds)}</span>
        </div>
      </div>

      {/* Right: Volume & Fullscreen Trigger */}
      <div className="flex items-center justify-end gap-3 w-1/4 min-w-[180px]">
        <div className="flex items-center gap-2">
          <IconButton
            icon={
              isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4 text-vibe-rose" />
              ) : (
                <Volume2 className="w-4 h-4 text-content-secondary hover:text-content-primary" />
              )
            }
            aria-label={isMuted ? 'Unmute' : 'Mute'}
            size="sm"
            onClick={toggleMute}
          />
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={isMuted ? 0 : volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="w-20 sm:w-24 h-1 bg-surface-border rounded-lg appearance-none cursor-pointer accent-brand-500 hover:accent-brand-400"
            aria-label="Volume slider"
          />
        </div>

        <IconButton
          icon={<Maximize2 className="w-4 h-4 text-content-muted hover:text-content-primary" />}
          aria-label="Open full player view"
          size="sm"
          onClick={() => navigate('/player')}
        />
      </div>
    </footer>
  );
};

export default DesktopPlayer;
