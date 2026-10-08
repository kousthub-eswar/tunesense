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

export interface AudioPlayerContextType {
  currentTrack: TrackItem | null;
  isPlaying: boolean;
  isLoading: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  error: string | null;
  playTrack: (track: TrackItem, attribution?: AudioPlayerTrackAttribution) => Promise<void>;
  togglePlayPause: () => void;
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

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isAuthRef = useRef<boolean>(isAuthenticated);
  const playbackRef = useRef<PlaybackSession | null>(null);

  useEffect(() => {
    isAuthRef.current = isAuthenticated;
  }, [isAuthenticated]);

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
      // Emit pause event if track was playing and has not naturally finished
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

      // Deduplicated play event: fire exactly once per playback session
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

      // Emit complete event exactly once per playback session
      const session = playbackRef.current;
      if (session && session.hasPlayed && !session.hasCompleted && isAuthRef.current) {
        session.hasCompleted = true;
        listeningEventService.recordComplete(
          session.trackId,
          audio.duration || session.duration,
          session.attribution
        );
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
  }, []);

  const playTrack = useCallback(async (track: TrackItem, attribution?: AudioPlayerTrackAttribution) => {
    const audio = audioRef.current;
    if (!audio) return;

    // Track Switching: If moving from Track A to Track B before completion, record 'skip' for Track A
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

    // Initialize clean playback session for the incoming track
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
        playTrack,
        togglePlayPause,
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
