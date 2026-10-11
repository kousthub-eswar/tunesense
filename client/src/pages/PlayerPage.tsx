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
  ArrowLeft,
  Sparkles,
  Music2,
  Radio,
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
  const [mobileShowQueue, setMobileShowQueue] = useState<boolean>(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState<boolean>(false);

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
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center select-none">
        <div className="w-16 h-16 rounded-full bg-surface border border-surface-border flex items-center justify-center text-brand-400 mb-4 animate-pulse shadow-glow">
          <Disc className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-content-primary">No Track Playing</h2>
        <p className="text-xs text-content-secondary mt-1.5 max-w-sm">
          Explore trending songs, mood mixes, or your saved playlists to start listening.
        </p>
        <div className="flex items-center gap-3 mt-6">
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/home')}
            className="shadow-glow"
          >
            Go to Home
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/discover')}
          >
            Explore Vibes
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="w-full min-h-screen bg-[#0b0b10] text-content-primary flex flex-col justify-between select-none">
        {/* ========================================================= */}
        {/* MOBILE VIEW (< md) - Full-screen expanded player          */}
        {/* ========================================================= */}
        <div className="md:hidden flex flex-col justify-between min-h-screen p-4 pb-8">
          {/* Mobile Top Header */}
          <div className="flex items-center justify-between py-1">
            <button
              onClick={() => navigate(-1)}
              className="p-2 -ml-2 rounded-full text-content-secondary hover:text-white transition-colors"
              aria-label="Close player"
            >
              <ChevronDown className="w-6 h-6" />
            </button>

            <div className="text-center">
              <span className="text-[11px] font-semibold text-content-muted uppercase tracking-wider">
                {mobileShowQueue
                  ? `Queue (${queueIndex + 1}/${queue.length})`
                  : 'Now Playing'}
              </span>
            </div>

            <button
              onClick={() => setMobileShowQueue(!mobileShowQueue)}
              className={cn(
                'p-2 -mr-2 rounded-full transition-colors flex items-center justify-center',
                mobileShowQueue
                  ? 'text-brand-400 bg-brand-500/15'
                  : 'text-content-secondary hover:text-white'
              )}
              aria-label="Toggle playback queue"
            >
              <ListMusic className="w-5 h-5" />
            </button>
          </div>

          {/* Mobile Artwork or Queue View */}
          <div className="my-auto py-4">
            {mobileShowQueue ? (
              /* Mobile Queue View */
              <div className="w-full h-80 rounded-2xl bg-surface/90 border border-surface-border p-4 flex flex-col overflow-hidden shadow-2xl">
                <div className="flex items-center justify-between pb-3 border-b border-surface-border">
                  <div className="flex items-center gap-2">
                    <ListMusic className="w-4 h-4 text-brand-400" />
                    <h4 className="text-xs font-bold text-white">Playback Queue</h4>
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
                          'flex items-center justify-between p-2 rounded-xl cursor-pointer transition-colors text-left',
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
                            <p className="text-[11px] text-content-secondary truncate">
                              {track.artistName}
                            </p>
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
              /* Mobile Large Artwork */
              <div className="relative w-full max-w-[280px] xs:max-w-xs mx-auto aspect-square rounded-2xl overflow-hidden shadow-2xl border border-white/10">
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

          {/* Mobile Track Details & Controls */}
          <div className="space-y-4">
            {/* Title, Artist, and Action Icons */}
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1 pr-3">
                <h1 className="text-xl font-bold text-white truncate">{currentTrack.title}</h1>
                <p className="text-xs text-content-secondary truncate mt-0.5">
                  {currentTrack.artistName}
                  {currentTrack.albumTitle ? ` • ${currentTrack.albumTitle}` : ''}
                </p>
              </div>

              <div className="flex items-center gap-1 shrink-0">
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
                      size="sm"
                      onClick={handleLikeToggle}
                    />

                    <IconButton
                      icon={<ListPlus className="w-5 h-5 text-content-secondary" />}
                      aria-label="Add to playlist"
                      size="sm"
                      onClick={() => setShowPlaylistModal(true)}
                    />
                  </>
                )}
              </div>
            </div>

            {/* Scrubber Progress Bar */}
            <div className="space-y-1.5">
              <div
                className="w-full bg-white/10 h-2 rounded-full cursor-pointer relative group flex items-center"
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
                  className="absolute w-3.5 h-3.5 bg-white rounded-full shadow -ml-1.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                  style={{ left: `${progressPercent}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] font-mono text-content-muted">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration || currentTrack.durationSeconds)}</span>
              </div>
            </div>

            {/* Playback Controls */}
            <div className="flex items-center justify-between pt-1">
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

              <IconButton
                icon={<SkipBack className="w-6 h-6 text-white fill-current" />}
                aria-label="Previous track"
                variant="ghost"
                size="lg"
                onClick={playPrevious}
              />

              <IconButton
                icon={
                  isLoading ? (
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                  ) : isPlaying ? (
                    <Pause className="w-7 h-7 text-white fill-white" />
                  ) : (
                    <Play className="w-7 h-7 text-white fill-white ml-0.5" />
                  )
                }
                aria-label={isPlaying ? 'Pause' : 'Play'}
                variant="primary"
                size="lg"
                className="w-14 h-14 rounded-full shadow-glow"
                onClick={togglePlayPause}
                disabled={isLoading}
              />

              <IconButton
                icon={<SkipForward className="w-6 h-6 text-white fill-current" />}
                aria-label="Next track"
                variant="ghost"
                size="lg"
                onClick={playNext}
              />

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

            {/* Mobile Volume Slider */}
            <div className="flex items-center gap-3 pt-2 px-1">
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

        {/* ========================================================= */}
        {/* DESKTOP VIEW (>= md) - Balanced, Intentional 2-Column     */}
        {/* ========================================================= */}
        <div className="hidden md:flex flex-col flex-1 max-w-6xl w-full mx-auto p-8 lg:p-10">
          {/* Desktop Top Bar */}
          <div className="flex items-center justify-between pb-6 border-b border-surface-border/60 mb-8">
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-2 text-xs font-medium text-content-secondary hover:text-white transition-colors py-1.5 px-3 rounded-lg hover:bg-surface"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>

            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-brand-400" />
              <span className="text-xs font-semibold uppercase tracking-wider text-content-muted">
                TuneSense Listening Room
              </span>
            </div>

            <div className="w-16" />
          </div>

          {/* Desktop 2-Column Grid */}
          <div className="grid grid-cols-12 gap-10 lg:gap-14 items-start flex-1">
            {/* LEFT COLUMN: Large Artwork, Track Details & Controls */}
            <div className="col-span-5 flex flex-col space-y-6">
              {/* Artwork with ambient backdrop glow */}
              <div className="relative w-full aspect-square max-w-[360px] mx-auto rounded-3xl overflow-hidden shadow-2xl border border-white/10 bg-surface/50 group">
                <MusicArtwork
                  src={currentTrack.artworkUrl}
                  alt={currentTrack.title}
                  size="lg"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  fallbackIcon={
                    <Disc
                      className={cn('w-28 h-28 text-brand-400', isPlaying && 'animate-spin')}
                      style={{ animationDuration: '8s' }}
                    />
                  }
                />
              </div>

              {/* Track Title, Artist, and Actions */}
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <h1 className="text-2xl font-extrabold text-white tracking-tight truncate">
                    {currentTrack.title}
                  </h1>
                  <p className="text-sm font-medium text-content-secondary truncate mt-1">
                    {currentTrack.artistName}
                    {currentTrack.albumTitle ? ` • ${currentTrack.albumTitle}` : ''}
                  </p>
                </div>

                <div className="flex items-center gap-1 shrink-0 pt-1">
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
              <div className="space-y-2">
                <div
                  className="w-full bg-white/10 h-2 rounded-full cursor-pointer relative group flex items-center"
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

                <div className="flex items-center justify-between text-xs font-mono text-content-muted">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration || currentTrack.durationSeconds)}</span>
                </div>
              </div>

              {/* Playback Controls Row */}
              <div className="flex items-center justify-center gap-6 pt-1">
                <IconButton
                  icon={
                    <Shuffle
                      className={cn(
                        'w-5 h-5 transition-colors',
                        isShuffle ? 'text-brand-400' : 'text-content-muted hover:text-white'
                      )}
                    />
                  }
                  aria-label={isShuffle ? 'Shuffle enabled' : 'Shuffle disabled'}
                  variant="ghost"
                  size="md"
                  onClick={toggleShuffle}
                />

                <IconButton
                  icon={<SkipBack className="w-6 h-6 text-white fill-current" />}
                  aria-label="Previous track"
                  variant="ghost"
                  size="lg"
                  onClick={playPrevious}
                />

                <IconButton
                  icon={
                    isLoading ? (
                      <Loader2 className="w-6 h-6 text-white animate-spin" />
                    ) : isPlaying ? (
                      <Pause className="w-7 h-7 text-white fill-white" />
                    ) : (
                      <Play className="w-7 h-7 text-white fill-white ml-0.5" />
                    )
                  }
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                  variant="primary"
                  size="lg"
                  className="w-16 h-16 rounded-full shadow-glow"
                  onClick={togglePlayPause}
                  disabled={isLoading}
                />

                <IconButton
                  icon={<SkipForward className="w-6 h-6 text-white fill-current" />}
                  aria-label="Next track"
                  variant="ghost"
                  size="lg"
                  onClick={playNext}
                />

                <IconButton
                  icon={
                    repeatMode === 'one' ? (
                      <Repeat1 className="w-5 h-5 text-brand-400" />
                    ) : (
                      <Repeat
                        className={cn(
                          'w-5 h-5 transition-colors',
                          repeatMode === 'all' ? 'text-brand-400' : 'text-content-muted hover:text-white'
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

              {/* Volume Slider Row */}
              <div className="flex items-center gap-3 pt-2 px-4 bg-surface/40 border border-surface-border/50 rounded-2xl py-2.5">
                <IconButton
                  icon={
                    isMuted || volume === 0 ? (
                      <VolumeX className="w-4 h-4 text-vibe-rose" />
                    ) : (
                      <Volume2 className="w-4 h-4 text-content-secondary hover:text-white" />
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
                  className="w-full accent-brand-500 h-1.5 cursor-pointer bg-white/10 rounded-lg hover:accent-brand-400"
                  aria-label="Volume slider"
                />
                <span className="text-[11px] font-mono text-content-muted w-8 text-right">
                  {Math.round((isMuted ? 0 : volume) * 100)}%
                </span>
              </div>
            </div>

            {/* RIGHT COLUMN: Listening Panel & Up Next Queue */}
            <div className="col-span-7 flex flex-col space-y-4">
              {/* Queue Panel Card */}
              <div className="bg-surface/60 border border-surface-border rounded-3xl p-6 shadow-xl flex flex-col h-[520px]">
                {/* Queue Header */}
                <div className="flex items-center justify-between pb-4 border-b border-surface-border">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-brand-500/15 border border-brand-500/30 flex items-center justify-center text-brand-400">
                      <ListMusic className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white tracking-tight">
                        Up Next & Playback Queue
                      </h3>
                      <p className="text-[11px] text-content-muted">
                        Playing {queueIndex + 1} of {queue.length} tracks
                      </p>
                    </div>
                  </div>

                  {queue.length > 1 && (
                    <button
                      onClick={clearQueue}
                      className="text-xs text-content-muted hover:text-vibe-rose transition-colors flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-vibe-rose/10"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Clear Queue</span>
                    </button>
                  )}
                </div>

                {/* Queue Track List */}
                <div className="flex-1 overflow-y-auto space-y-2 py-3 pr-1">
                  {queue.map((track, idx) => {
                    const isCurrent = idx === queueIndex;
                    return (
                      <div
                        key={`${track.id}-${idx}`}
                        onClick={() => setQueue(queue, idx)}
                        className={cn(
                          'flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-all text-left group',
                          isCurrent
                            ? 'bg-brand-500/15 border border-brand-500/35 text-brand-300 shadow-glow/10'
                            : 'hover:bg-surface/80 border border-transparent hover:border-surface-border text-content-primary'
                        )}
                      >
                        <div className="flex items-center gap-3.5 min-w-0 flex-1">
                          <span
                            className={cn(
                              'text-xs font-mono w-5 text-right shrink-0',
                              isCurrent ? 'text-brand-400 font-bold' : 'text-content-muted'
                            )}
                          >
                            {isCurrent && isPlaying ? (
                              <Sparkles className="w-3.5 h-3.5 text-brand-400 animate-pulse inline" />
                            ) : (
                              idx + 1
                            )}
                          </span>

                          <MusicArtwork
                            src={track.artworkUrl}
                            alt={track.title}
                            size="sm"
                            className="w-10 h-10 rounded-xl object-cover shrink-0"
                          />

                          <div className="min-w-0 flex-1">
                            <p
                              className={cn(
                                'text-xs font-semibold truncate',
                                isCurrent ? 'text-white' : 'text-content-primary'
                              )}
                            >
                              {track.title}
                            </p>
                            <p className="text-[11px] text-content-secondary truncate mt-0.5">
                              {track.artistName}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0 ml-3">
                          <span className="text-[11px] font-mono text-content-muted">
                            {formatTime(track.durationSeconds)}
                          </span>

                          {queue.length > 1 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeFromQueue(idx);
                              }}
                              className="p-1.5 text-content-muted hover:text-vibe-rose opacity-0 group-hover:opacity-100 transition-opacity"
                              aria-label={`Remove ${track.title} from queue`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Queue Footer Info */}
                <div className="pt-3 border-t border-surface-border flex items-center justify-between text-[11px] text-content-muted">
                  <div className="flex items-center gap-1.5">
                    <Music2 className="w-3.5 h-3.5 text-brand-400" />
                    <span>Free Streaming Catalogue</span>
                  </div>
                  <span className="font-mono text-[10px] text-content-secondary">
                    Lossless 320kbps MP3
                  </span>
                </div>
              </div>
            </div>
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

export default PlayerPage;
