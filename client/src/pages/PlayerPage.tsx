import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronDown,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Heart,
  ListPlus,
  ListMusic,
  Volume2,
  VolumeX,
  Disc,
  Loader2,
  Trash2,
} from 'lucide-react';
import { useAudioPlayer } from '../contexts/AudioPlayerContext.js';
import { useAuth } from '../contexts/AuthContext.js';
import { libraryService } from '../services/libraryService.js';
import { PlaylistPickerModal } from '../components/music/PlaylistPickerModal.js';
import { MusicArtwork } from '../components/music/MusicArtwork.js';
import { IconButton } from '../components/ui/IconButton.js';
import { Button } from '../components/ui/Button.js';
import { cn } from '../utils/cn.js';

export const PlayerPage: React.FC = () => {
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
    queue,
    queueIndex,
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
    setQueue,
    removeFromQueue,
    clearQueue,
  } = useAudioPlayer();

  const [isLiked, setIsLiked] = useState<boolean>(false);
  const [showQueue, setShowQueue] = useState<boolean>(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState<boolean>(false);

  useEffect(() => {
    if (currentTrack && isAuthenticated) {
      libraryService.checkLikes([currentTrack.id]).then((res) => {
        setIsLiked(Boolean(res[currentTrack.id]));
      }).catch(() => {});
    }
  }, [currentTrack?.id, isAuthenticated]);

  const handleLikeToggle = async () => {
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

  if (!currentTrack) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-surface border border-surface-border flex items-center justify-center text-brand-400 mb-4 animate-pulse">
          <Disc className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-bold text-content-primary">No Track Playing</h2>
        <p className="text-xs text-content-secondary mt-1 max-w-xs">
          Explore recommendations, search for songs, or open your library to start listening.
        </p>
        <Button
          variant="primary"
          size="sm"
          onClick={() => navigate('/home')}
          className="mt-5"
        >
          Go to Home
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-b from-bg-elevated via-bg to-bg flex flex-col justify-between p-4 sm:p-6 pb-24 max-w-lg mx-auto select-none">
        {/* Top Navigation Bar */}
        <div className="flex items-center justify-between py-2">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-full text-content-secondary hover:text-content-primary hover:bg-surface transition-colors tap-target flex items-center justify-center"
            aria-label="Close player"
          >
            <ChevronDown className="w-6 h-6" />
          </button>

          <div className="text-center">
            <span className="text-[11px] font-semibold text-content-muted uppercase tracking-wider">
              {queue.length > 1 ? `Playing from Queue (${queueIndex + 1}/${queue.length})` : 'Now Playing'}
            </span>
          </div>

          <button
            onClick={() => setShowQueue(!showQueue)}
            className={cn(
              'p-2 -mr-2 rounded-full transition-colors tap-target flex items-center justify-center',
              showQueue ? 'text-brand-400 bg-brand-500/15' : 'text-content-secondary hover:text-content-primary hover:bg-surface'
            )}
            aria-label="Toggle playback queue"
          >
            <ListMusic className="w-5 h-5" />
          </button>
        </div>

        {/* Center Artwork or Queue View */}
        <div className="my-auto py-4">
          {showQueue ? (
            /* Queue Drawer / View */
            <div className="w-full h-80 sm:h-96 rounded-card bg-surface/80 border border-surface-border p-4 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between pb-3 border-b border-surface-border">
                <div className="flex items-center gap-2">
                  <ListMusic className="w-4 h-4 text-brand-400" />
                  <h4 className="text-sm font-bold text-content-primary">Playback Queue</h4>
                </div>
                {queue.length > 1 && (
                  <button
                    onClick={clearQueue}
                    className="text-xs text-vibe-rose hover:underline flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" /> Clear
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto space-y-1.5 py-2 no-scrollbar">
                {queue.map((track, idx) => {
                  const isCurrent = idx === queueIndex;
                  return (
                    <div
                      key={`${track.id}-${idx}`}
                      onClick={() => setQueue(queue, idx)}
                      className={cn(
                        'flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors text-left tap-target',
                        isCurrent
                          ? 'bg-brand-500/20 border border-brand-500/40 text-brand-400'
                          : 'hover:bg-surface text-content-primary'
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <span className="text-xs font-mono text-content-muted w-4 text-right">
                          {idx + 1}
                        </span>
                        <MusicArtwork src={track.artworkUrl} alt={track.title} size="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold truncate">{track.title}</p>
                          <p className="text-[11px] text-content-secondary truncate">{track.artistName}</p>
                        </div>
                      </div>

                      {queue.length > 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFromQueue(idx);
                          }}
                          className="p-1.5 text-content-muted hover:text-vibe-rose transition-colors"
                          aria-label={`Remove ${track.title} from queue`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Album Artwork Hero */
            <div className="relative w-full max-w-xs sm:max-w-sm mx-auto aspect-square rounded-2xl overflow-hidden shadow-2xl border border-surface-border/50">
              <MusicArtwork
                src={currentTrack.artworkUrl}
                alt={currentTrack.title}
                size="lg"
                className="w-full h-full aspect-square object-cover"
                fallbackIcon={
                  <Disc
                    className={cn('w-20 h-20 text-brand-400', isPlaying && 'animate-spin')}
                    style={{ animationDuration: '6s' }}
                  />
                }
              />
            </div>
          )}
        </div>

        {/* Track Info & Like / Playlist Row */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1 pr-3">
              <h1 className="text-xl sm:text-2xl font-bold text-content-primary truncate">
                {currentTrack.title}
              </h1>
              <p className="text-sm text-content-secondary truncate mt-0.5">
                {currentTrack.artistName}
                {currentTrack.albumTitle ? ` • ${currentTrack.albumTitle}` : ''}
              </p>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {isAuthenticated && (
                <>
                  <IconButton
                    icon={
                      <Heart
                        className={cn(
                          'w-5 h-5 transition-colors',
                          isLiked ? 'text-brand-400 fill-brand-400' : 'text-content-secondary'
                        )}
                      />
                    }
                    aria-label={isLiked ? 'Unlike song' : 'Like song'}
                    size="md"
                    onClick={handleLikeToggle}
                  />

                  <IconButton
                    icon={<ListPlus className="w-5 h-5 text-content-secondary" />}
                    aria-label="Add to playlist"
                    size="md"
                    onClick={() => setShowPlaylistModal(true)}
                  />
                </>
              )}
            </div>
          </div>

          {/* Scrubber Progress Bar */}
          <div className="space-y-1.5">
            <div
              className="w-full bg-white/10 h-2 rounded-full cursor-pointer relative group tap-target flex items-center"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const ratio = Math.max(0, Math.min(clickX / rect.width, 1));
                seek(ratio * duration);
              }}
            >
              <div
                className="bg-brand-500 h-2 rounded-full transition-all duration-100 group-hover:bg-brand-400"
                style={{ width: `${progressPercent}%` }}
              />
              <div
                className="absolute w-4 h-4 bg-white rounded-full shadow -ml-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                style={{ left: `${progressPercent}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] font-mono text-content-muted">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration || currentTrack.durationSeconds)}</span>
            </div>
          </div>

          {/* Playback Controls (Shuffle, Previous, Play/Pause, Next, Repeat) */}
          <div className="flex items-center justify-between pt-2">
            {/* Shuffle Button */}
            <IconButton
              icon={
                <Shuffle
                  className={cn(
                    'w-5 h-5 transition-colors',
                    isShuffle ? 'text-brand-400' : 'text-content-muted'
                  )}
                />
              }
              aria-label={isShuffle ? 'Shuffle enabled' : 'Shuffle disabled'}
              variant="ghost"
              size="md"
              onClick={toggleShuffle}
            />

            {/* Previous Track */}
            <IconButton
              icon={<SkipBack className="w-6 h-6 text-content-primary fill-current" />}
              aria-label="Previous track"
              variant="ghost"
              size="lg"
              onClick={playPrevious}
            />

            {/* Main Play / Pause */}
            <IconButton
              icon={
                isLoading ? (
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                ) : isPlaying ? (
                  <Pause className="w-7 h-7 text-white fill-white" />
                ) : (
                  <Play className="w-7 h-7 text-white fill-white ml-1" />
                )
              }
              aria-label={isPlaying ? 'Pause' : 'Play'}
              variant="primary"
              size="lg"
              className="w-16 h-16 rounded-full shadow-glow"
              onClick={togglePlayPause}
              disabled={isLoading}
            />

            {/* Next Track */}
            <IconButton
              icon={<SkipForward className="w-6 h-6 text-content-primary fill-current" />}
              aria-label="Next track"
              variant="ghost"
              size="lg"
              onClick={playNext}
            />

            {/* Repeat Button */}
            <IconButton
              icon={
                repeatMode === 'one' ? (
                  <Repeat1 className="w-5 h-5 text-brand-400" />
                ) : (
                  <Repeat
                    className={cn(
                      'w-5 h-5 transition-colors',
                      repeatMode === 'all' ? 'text-brand-400' : 'text-content-muted'
                    )}
                  />
                )
              }
              aria-label={`Repeat mode: ${repeatMode}`}
              variant="ghost"
              size="md"
              onClick={toggleRepeat}
            />
          </div>

          {/* Volume Control Row */}
          <div className="flex items-center gap-3 pt-3 px-2">
            <IconButton
              icon={
                isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4 text-vibe-rose" />
                ) : (
                  <Volume2 className="w-4 h-4 text-content-muted" />
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
              className="w-full accent-brand-500 h-1.5 cursor-pointer bg-white/10 rounded-lg"
              aria-label="Volume slider"
            />
          </div>
        </div>
      </div>

      {showPlaylistModal && (
        <PlaylistPickerModal
          isOpen={showPlaylistModal}
          onClose={() => setShowPlaylistModal(false)}
          track={currentTrack}
        />
      )}
    </>
  );
};
