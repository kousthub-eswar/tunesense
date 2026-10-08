import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  useCallback,
} from 'react';
import { TrackItem } from '../types/index.js';
import { fetchTrackStream } from '../services/musicService.js';
import { useAuth } from './AuthContext.js';
import { listeningEventService } from '../services/listeningEventService.js';

export interface AudioPlayerTrackAttribution {
  recommendationRequestId?: string;
  recommendationStrategy?: string;
  recommendationPosition?: number;
}

interface PlaybackSession {
  trackId: string;
  hasPlayed: boolean;
  hasCompleted: boolean;
  duration: number;
  lastPosition: number;
  attribution?: AudioPlayerTrackAttribution;
}

export type RepeatMode = 'off' | 'one' | 'all';

export interface AudioPlayerContextType {
  currentTrack: TrackItem | null;
  isPlaying: boolean;
  isLoading: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  error: string | null;
  queue: TrackItem[];
  queueIndex: number;
  isShuffle: boolean;
  repeatMode: RepeatMode;
  playTrack: (track: TrackItem, attribution?: AudioPlayerTrackAttribution) => Promise<void>;
  setQueue: (tracks: TrackItem[], startIndex?: number, attribution?: AudioPlayerTrackAttribution) => Promise<void>;
  addToQueue: (track: TrackItem) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  playNext: () => Promise<void>;
  playPrevious: () => Promise<void>;
  togglePlayPause: () => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  seek: (seconds: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
}

const AudioPlayerContext = createContext<AudioPlayerContextType | undefined>(undefined);

export const AudioPlayerProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { isAuthenticated } = useAuth();
  const [currentTrack, setCurrentTrack] = useState<TrackItem | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolumeState] = useState<number>(0.85);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Queue & Modes State
  const [queue, setQueueState] = useState<TrackItem[]>([]);
  const [queueIndex, setQueueIndex] = useState<number>(-1);
  const [isShuffle, setIsShuffle] = useState<boolean>(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('off');

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isAuthRef = useRef<boolean>(isAuthenticated);
  const playbackRef = useRef<PlaybackSession | null>(null);

  // Refs for current playback options in event listeners
  const queueRef = useRef<TrackItem[]>([]);
  const queueIndexRef = useRef<number>(-1);
  const repeatModeRef = useRef<RepeatMode>('off');
  const isShuffleRef = useRef<boolean>(false);

  useEffect(() => {
    isAuthRef.current = isAuthenticated;
  }, [isAuthenticated]);

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  useEffect(() => {
    queueIndexRef.current = queueIndex;
  }, [queueIndex]);

  useEffect(() => {
    repeatModeRef.current = repeatMode;
  }, [repeatMode]);

  useEffect(() => {
    isShuffleRef.current = isShuffle;
  }, [isShuffle]);

  // Core track playback function
  const playTrackInternal = useCallback(async (track: TrackItem, attribution?: AudioPlayerTrackAttribution) => {
    const audio = audioRef.current;
    if (!audio) return;

    // Track Switching: Record skip for previous track if interrupted early
    const previousSession = playbackRef.current;
    if (
      previousSession &&
      previousSession.trackId !== track.id &&
      previousSession.hasPlayed &&
      !previousSession.hasCompleted &&
      isAuthRef.current
    ) {
      const dur = previousSession.duration || 1;
      const completionRatio = previousSession.lastPosition / dur;
      if (completionRatio < 0.95) {
        listeningEventService.recordSkip(
          previousSession.trackId,
          previousSession.lastPosition,
          previousSession.duration,
          previousSession.attribution
        );
      }
    }

    // Initialize clean playback session
    playbackRef.current = {
      trackId: track.id,
      hasPlayed: false,
      hasCompleted: false,
      duration: track.durationSeconds || 0,
      lastPosition: 0,
      attribution,
    };

    try {
      setError(null);
      setIsLoading(true);
      setCurrentTrack(track);

      let streamUrl = track.streamUrl;

      // If streamUrl is not directly present, query backend stream endpoint
      if (!streamUrl) {
        const streamInfo = await fetchTrackStream(track.id);
        streamUrl = streamInfo.streamUrl;
      }

      if (!streamUrl) {
        throw new Error('No valid playable stream URL returned for this track.');
      }

      audio.src = streamUrl;
      audio.volume = isMuted ? 0 : volume;
      await audio.play();
      setIsPlaying(true);
    } catch (err) {
      console.error('[AudioPlayer] Playback failed:', err);
      setError(
        err instanceof Error ? err.message : 'Unable to play this track. Please try again.'
      );
      setIsPlaying(false);
    } finally {
      setIsLoading(false);
    }
  }, [volume, isMuted]);

  // Advance to next track
  const playNext = useCallback(async () => {
    const currentQueue = queueRef.current;
    const currentIndex = queueIndexRef.current;
    const mode = repeatModeRef.current;

    if (currentQueue.length === 0) return;

    let nextIndex = currentIndex + 1;
    if (nextIndex >= currentQueue.length) {
      if (mode === 'all') {
        nextIndex = 0;
      } else {
        // End of queue reached
        setIsPlaying(false);
        return;
      }
    }

    setQueueIndex(nextIndex);
    queueIndexRef.current = nextIndex;
    const nextTrack = currentQueue[nextIndex];
    if (nextTrack) {
      await playTrackInternal(nextTrack);
    }
  }, [playTrackInternal]);

  // Go to previous track or restart current track
  const playPrevious = useCallback(async () => {
    const audio = audioRef.current;
    const currentQueue = queueRef.current;
    const currentIndex = queueIndexRef.current;

    // If playback is past 3 seconds, restart current track
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      setCurrentTime(0);
      return;
    }

    if (currentQueue.length === 0) return;

    let prevIndex = currentIndex - 1;
    if (prevIndex < 0) {
      prevIndex = currentQueue.length - 1; // Wrap around if at start
    }

    setQueueIndex(prevIndex);
    queueIndexRef.current = prevIndex;
    const prevTrack = currentQueue[prevIndex];
    if (prevTrack) {
      await playTrackInternal(prevTrack);
    }
  }, [playTrackInternal]);

  // Single track play helper: sets queue to [track]
  const playTrack = useCallback(async (track: TrackItem, attribution?: AudioPlayerTrackAttribution) => {
    setQueueState([track]);
    setQueueIndex(0);
    queueRef.current = [track];
    queueIndexRef.current = 0;
    await playTrackInternal(track, attribution);
  }, [playTrackInternal]);

  // Set an entire queue and start playback at startIndex
  const setQueue = useCallback(async (
    tracks: TrackItem[],
    startIndex = 0,
    attribution?: AudioPlayerTrackAttribution
  ) => {
    if (!tracks || tracks.length === 0) return;
    const validIndex = Math.max(0, Math.min(startIndex, tracks.length - 1));
    setQueueState(tracks);
    setQueueIndex(validIndex);
    queueRef.current = tracks;
    queueIndexRef.current = validIndex;
    await playTrackInternal(tracks[validIndex], attribution);
  }, [playTrackInternal]);

  const addToQueue = useCallback((track: TrackItem) => {
    setQueueState((prev) => [...prev, track]);
  }, []);

  const removeFromQueue = useCallback((index: number) => {
    setQueueState((prev) => {
      const next = [...prev];
      next.splice(index, 1);
      return next;
    });
    setQueueIndex((prevIdx) => {
      if (index < prevIdx) return prevIdx - 1;
      if (index === prevIdx) return Math.max(0, prevIdx - 1);
      return prevIdx;
    });
  }, []);

  const clearQueue = useCallback(() => {
    setQueueState([]);
    setQueueIndex(-1);
  }, []);

  const toggleShuffle = useCallback(() => {
    setIsShuffle((prev) => {
      const nextShuffle = !prev;
      if (nextShuffle && queueRef.current.length > 1) {
        // Keep currently playing track at index 0, shuffle remaining
        const cur = queueRef.current[queueIndexRef.current];
        const others = queueRef.current.filter((_, idx) => idx !== queueIndexRef.current);
        // Fisher-Yates shuffle
        for (let i = others.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [others[i], others[j]] = [others[j], others[i]];
        }
        const newQueue = cur ? [cur, ...others] : others;
        setQueueState(newQueue);
        setQueueIndex(0);
        queueRef.current = newQueue;
        queueIndexRef.current = 0;
      }
      return nextShuffle;
    });
  }, []);

  const toggleRepeat = useCallback(() => {
    setRepeatMode((prev) => {
      if (prev === 'off') return 'all';
      if (prev === 'all') return 'one';
      return 'off';
    });
  }, []);

  // Initialize native HTML5 Audio element
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'metadata';
    audioRef.current = audio;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      if (playbackRef.current) {
        playbackRef.current.lastPosition = audio.currentTime;
        if (audio.duration && !isNaN(audio.duration)) {
          playbackRef.current.duration = audio.duration;
        }
      }
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration || 0);
      setIsLoading(false);
      if (playbackRef.current && audio.duration) {
        playbackRef.current.duration = audio.duration;
      }
    };

    const handlePlay = () => {
      setIsPlaying(true);
      setError(null);
    };

    const handlePause = () => {
      setIsPlaying(false);
      const session = playbackRef.current;
      if (
        session &&
        session.hasPlayed &&
        !session.hasCompleted &&
        isAuthRef.current &&
        !audio.ended
      ) {
        listeningEventService.recordPause(
          session.trackId,
          audio.currentTime,
          audio.duration || session.duration,
          session.attribution
        );
      }
    };

    const handleWaiting = () => {
      setIsLoading(true);
    };

    const handlePlaying = () => {
      setIsLoading(false);
      setIsPlaying(true);

      const session = playbackRef.current;
      if (session && !session.hasPlayed && isAuthRef.current) {
        session.hasPlayed = true;
        listeningEventService.recordPlay(
          session.trackId,
          audio.currentTime,
          audio.duration || session.duration,
          session.attribution
        );
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);

      const session = playbackRef.current;
      if (session && session.hasPlayed && !session.hasCompleted && isAuthRef.current) {
        session.hasCompleted = true;
        listeningEventService.recordComplete(
          session.trackId,
          audio.duration || session.duration,
          session.attribution
        );
      }

      // Handle Repeat and Queue Advancement
      const mode = repeatModeRef.current;
      if (mode === 'one') {
        audio.currentTime = 0;
        audio.play().catch((err) => console.error('[AudioPlayer] Repeat-one play failed:', err));
      } else {
        playNext();
      }
    };

    const handleError = () => {
      setIsLoading(false);
      setIsPlaying(false);
      setError('Audio stream unavailable or blocked by network.');
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('playing', handlePlaying);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('waiting', handleWaiting);
      audio.removeEventListener('playing', handlePlaying);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.src = '';
    };
  }, [playNext]);

  const togglePlayPause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch((err) => {
        console.error('[AudioPlayer] Resume failed:', err);
        setError('Playback could not resume.');
      });
    }
  }, [isPlaying, currentTrack]);

  const seek = useCallback((seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    const clamped = Math.max(0, Math.min(seconds, audio.duration || 0));
    audio.currentTime = clamped;
    setCurrentTime(clamped);
  }, []);

  const setVolume = useCallback((newVolume: number) => {
    const audio = audioRef.current;
    const clamped = Math.max(0, Math.min(newVolume, 1));
    setVolumeState(clamped);
    if (audio) {
      audio.volume = clamped;
      if (clamped > 0 && isMuted) {
        audio.muted = false;
        setIsMuted(false);
      }
    }
  }, [isMuted]);

  const toggleMute = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    audio.muted = nextMuted;
  }, [isMuted]);

  return (
    <AudioPlayerContext.Provider
      value={{
        currentTrack,
        isPlaying,
        isLoading,
        currentTime,
        duration,
        volume,
        isMuted,
        error,
        queue,
        queueIndex,
        isShuffle,
        repeatMode,
        playTrack,
        setQueue,
        addToQueue,
        removeFromQueue,
        clearQueue,
        playNext,
        playPrevious,
        togglePlayPause,
        toggleShuffle,
        toggleRepeat,
        seek,
        setVolume,
        toggleMute,
      }}
    >
      {children}
    </AudioPlayerContext.Provider>
  );
};

export function useAudioPlayer(): AudioPlayerContextType {
  const context = useContext(AudioPlayerContext);
  if (!context) {
    throw new Error('useAudioPlayer must be used within an AudioPlayerProvider');
  }
  return context;
}
