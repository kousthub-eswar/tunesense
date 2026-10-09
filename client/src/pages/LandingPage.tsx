import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Sparkles,
  ArrowRight,
  Play,
  Pause,
  Compass,
  Radio,
  LogIn,
  UserPlus,
  Flame,
  Disc,
  RotateCcw,
  Sliders,
  Heart,
  ChevronRight,
  Headphones,
} from 'lucide-react';
import { Button } from '../components/ui/Button.js';
import { Badge } from '../components/ui/Badge.js';
import { Card } from '../components/ui/Card.js';
import { MusicArtwork } from '../components/music/MusicArtwork.js';
import { useAuth } from '../contexts/AuthContext.js';
import { useAudioPlayer } from '../contexts/AudioPlayerContext.js';
import { fetchPopularTracks } from '../services/musicService.js';
import { MOOD_OPTIONS } from '../constants/moods.js';
import { TrackItem } from '../types/index.js';
import { cn } from '../utils/cn.js';

const MOOD_GRADIENTS: Record<string, string> = {
  happy: 'from-amber-500/20 via-orange-500/10 to-transparent border-amber-500/30 text-amber-300',
  energetic: 'from-orange-500/20 via-red-500/10 to-transparent border-orange-500/30 text-orange-300',
  relaxed: 'from-emerald-500/20 via-teal-500/10 to-transparent border-emerald-500/30 text-emerald-300',
  focused: 'from-violet-500/20 via-purple-500/10 to-transparent border-violet-500/30 text-violet-300',
  romantic: 'from-rose-500/20 via-pink-500/10 to-transparent border-rose-500/30 text-rose-300',
  sad: 'from-blue-500/20 via-slate-500/10 to-transparent border-blue-500/30 text-blue-300',
  calm: 'from-cyan-500/20 via-sky-500/10 to-transparent border-cyan-500/30 text-cyan-300',
  nostalgic: 'from-fuchsia-500/20 via-purple-500/10 to-transparent border-fuchsia-500/30 text-fuchsia-300',
};

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { playTrack, currentTrack, isPlaying, togglePlayPause, setQueue } =
    useAudioPlayer();

  const [tracks, setTracks] = useState<TrackItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // If user is already authenticated, seamlessly redirect to app home without redirect loop
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate('/home', { replace: true });
    }
  }, [isAuthenticated, authLoading, navigate]);

  // Load real catalogue tracks from Jamendo API
  const loadCatalogue = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchPopularTracks(16);
      setTracks(res.tracks || []);
    } catch (err: any) {
      console.warn('[LandingPage] Failed to fetch catalogue tracks:', err);
      setError(err?.message || 'Unable to connect to the music catalogue. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCatalogue();
  }, [loadCatalogue]);

  const featuredTrack = tracks[0] || null;
  const trendingTracks = tracks.slice(1, 9);
  const freshDiscoveries = tracks.slice(9, 15);

  const handlePlaySong = (track: TrackItem, queueList: TrackItem[]) => {
    if (currentTrack?.id === track.id) {
      togglePlayPause();
    } else {
      const index = queueList.findIndex((t) => t.id === track.id);
      if (index !== -1) {
        setQueue(queueList, index);
      } else {
        playTrack(track);
      }
    }
  };

  const handleSelectMood = (moodId: string) => {
    sessionStorage.setItem('tunesense_active_mood', moodId);
    navigate('/discover');
  };

  const formatDuration = (seconds?: number): string => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen w-full bg-bg-main text-content-primary flex flex-col selection:bg-brand-500/30">
      {/* 1. Header: Clean, Compact, Music-First */}
      <header className="sticky top-0 z-50 w-full bg-bg-main/80 backdrop-blur-xl border-b border-surface-border/60 px-4 sm:px-8 py-3.5 flex items-center justify-between transition-all">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-brand-500/15 border border-brand-500/30 flex items-center justify-center text-brand-400 group-hover:scale-105 transition-transform shadow-glow">
            <Radio className="w-5 h-5 text-brand-400" />
          </div>
          <div className="flex flex-col">
            <span className="text-base sm:text-lg font-bold text-content-primary tracking-tight group-hover:text-brand-300 transition-colors leading-none">
              TuneSense
            </span>
            <span className="text-[10px] text-brand-400 font-medium tracking-tight mt-0.5 hidden xs:inline">
              Music that understands your vibe
            </span>
          </div>
        </Link>

        <nav className="flex items-center gap-2 sm:gap-3">
          <Link to="/discover">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-content-secondary hover:text-content-primary"
            >
              <Compass className="w-3.5 h-3.5 mr-1.5" />
              Discover
            </Button>
          </Link>
          <Link to="/login">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-brand-400 hover:text-brand-300"
            >
              <LogIn className="w-3.5 h-3.5 mr-1.5" />
              Sign In
            </Button>
          </Link>
          <Link to="/signup">
            <Button
              variant="primary"
              size="sm"
              className="text-xs shadow-glow"
              leftIcon={<UserPlus className="w-3.5 h-3.5" />}
            >
              Get Started
            </Button>
          </Link>
        </nav>
      </header>

      {/* 2. Hero Section: Consumer-Centric, Music Spotlight */}
      <section className="relative overflow-hidden px-4 sm:px-8 pt-10 pb-16 sm:pt-16 sm:pb-20 max-w-6xl mx-auto w-full">
        {/* Subtle Ambient Background Gradients */}
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[350px] bg-brand-500/10 blur-[130px] rounded-full pointer-events-none -z-10" />
        <div className="absolute top-1/3 right-10 w-[350px] h-[300px] bg-purple-600/10 blur-[120px] rounded-full pointer-events-none -z-10" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          {/* Left Hero Copy */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/25 text-brand-300 text-xs font-semibold shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-brand-400" />
              <span>Personalized Independent Music Discovery</span>
            </div>

            <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.12] text-content-primary">
              Your next favourite <br className="hidden sm:inline" />
              <span className="bg-gradient-to-r from-brand-400 via-purple-300 to-indigo-300 bg-clip-text text-transparent">
                song starts here.
              </span>
            </h1>

            <p className="text-sm sm:text-base text-content-secondary max-w-xl mx-auto lg:mx-0 leading-relaxed">
              Discover music that fits your mood, your taste, and your moment. TuneSense combines real-time vibe mapping, acoustic intelligence, and explainable recommendations across an authentic catalogue.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 pt-2">
              <Link to="/discover">
                <Button
                  variant="primary"
                  size="lg"
                  className="shadow-lg shadow-brand-500/25 text-sm font-semibold px-6"
                  rightIcon={<ArrowRight className="w-4 h-4 ml-1" />}
                >
                  Explore Music
                </Button>
              </Link>
              <Link to="/signup">
                <Button
                  variant="secondary"
                  size="lg"
                  className="text-sm font-medium px-5"
                  leftIcon={<Headphones className="w-4 h-4 mr-1 text-brand-400" />}
                >
                  Get Your Mix
                </Button>
              </Link>
            </div>

            {/* Feature Perks */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 sm:gap-6 pt-2 text-[11px] text-content-muted">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-400 shadow-glow" />
                Live streaming audio
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-400 shadow-glow" />
                Context-aware recommendations
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-400 shadow-glow" />
                Zero subscription required
              </span>
            </div>
          </div>

          {/* Right Hero Spotlight Card: Real Featured Track */}
          <div className="lg:col-span-5 flex justify-center">
            {loading ? (
              <div className="w-full max-w-sm aspect-square rounded-3xl bg-surface/50 border border-surface-border animate-pulse p-6 flex flex-col justify-between" />
            ) : featuredTrack ? (
              <div className="w-full max-w-sm rounded-3xl bg-gradient-to-b from-surface/90 via-surface/60 to-bg-elevated/90 border border-brand-500/30 p-5 shadow-2xl relative overflow-hidden group">
                {/* Glow Backdrop */}
                <div className="absolute -top-12 -right-12 w-48 h-48 bg-brand-500/20 blur-3xl rounded-full pointer-events-none" />

                <div className="flex items-center justify-between mb-3.5">
                  <Badge variant="brand" size="sm" className="font-semibold text-[10px]">
                    <Flame className="w-3 h-3 mr-1" />
                    Featured Spotlight
                  </Badge>
                  <span className="text-[11px] text-content-muted font-mono">
                    {formatDuration(featuredTrack.durationSeconds)}
                  </span>
                </div>

                {/* Big Artwork */}
                <div className="relative aspect-square w-full rounded-2xl overflow-hidden shadow-lg border border-surface-border/50 mb-4 group/art">
                  <MusicArtwork
                    src={featuredTrack.artworkUrl}
                    alt={featuredTrack.title}
                    size="xl"
                    className="w-full h-full object-cover"
                    fallbackIcon={
                      <Disc
                        className={cn(
                          'w-20 h-20 text-brand-400',
                          currentTrack?.id === featuredTrack.id && isPlaying && 'animate-spin'
                        )}
                        style={{ animationDuration: '6s' }}
                      />
                    }
                  />

                  {/* Play Button Overlay */}
                  <button
                    onClick={() => handlePlaySong(featuredTrack, tracks)}
                    className="absolute inset-0 bg-black/40 backdrop-blur-[2px] opacity-0 group-hover/art:opacity-100 flex items-center justify-center transition-opacity"
                    aria-label={
                      currentTrack?.id === featuredTrack.id && isPlaying ? 'Pause' : 'Play'
                    }
                  >
                    <div className="w-16 h-16 rounded-full bg-brand-500 text-white flex items-center justify-center shadow-glow transform hover:scale-110 active:scale-95 transition-transform">
                      {currentTrack?.id === featuredTrack.id && isPlaying ? (
                        <Pause className="w-7 h-7 fill-current" />
                      ) : (
                        <Play className="w-7 h-7 fill-current ml-1" />
                      )}
                    </div>
                  </button>
                </div>

                {/* Track Details & Quick Action */}
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-bold text-content-primary truncate leading-tight">
                      {featuredTrack.title}
                    </h3>
                    <p className="text-xs text-content-secondary truncate mt-0.5">
                      {featuredTrack.artistName}
                    </p>
                    {featuredTrack.genres && featuredTrack.genres[0] && (
                      <span className="inline-block mt-1 text-[10px] text-brand-300 font-medium">
                        #{featuredTrack.genres[0]}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => handlePlaySong(featuredTrack, tracks)}
                    className={cn(
                      'w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-95 shadow-md',
                      currentTrack?.id === featuredTrack.id && isPlaying
                        ? 'bg-brand-500 text-white shadow-glow'
                        : 'bg-brand-500/20 text-brand-300 border border-brand-500/40 hover:bg-brand-500 hover:text-white'
                    )}
                    aria-label={
                      currentTrack?.id === featuredTrack.id && isPlaying
                        ? 'Pause featured track'
                        : 'Play featured track'
                    }
                  >
                    {currentTrack?.id === featuredTrack.id && isPlaying ? (
                      <Pause className="w-5 h-5 fill-current" />
                    ) : (
                      <Play className="w-5 h-5 fill-current ml-0.5" />
                    )}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {/* 3. Section: Trending Now (Music First) */}
      <section className="px-4 sm:px-8 py-10 max-w-6xl mx-auto w-full">
        <div className="flex items-center justify-between mb-5 px-0.5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-brand-500/15 border border-brand-500/30 flex items-center justify-center text-brand-400">
              <Flame className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-content-primary">Trending Now</h2>
              <p className="text-xs text-content-secondary">
                Popular independent tracks streaming right now
              </p>
            </div>
          </div>
          <Link to="/discover">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-brand-400 hover:text-brand-300"
              rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
            >
              See All
            </Button>
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, idx) => (
              <div
                key={idx}
                className="h-24 rounded-card bg-surface/50 border border-surface-border animate-pulse"
              />
            ))}
          </div>
        ) : error ? (
          <Card className="p-8 text-center bg-surface/40 border-surface-border">
            <p className="text-xs text-content-secondary mb-3">{error}</p>
            <Button
              variant="secondary"
              size="sm"
              onClick={loadCatalogue}
              leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
            >
              Retry Loading Music
            </Button>
          </Card>
        ) : trendingTracks.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
            {trendingTracks.map((track) => {
              const isThisPlaying = currentTrack?.id === track.id && isPlaying;
              return (
                <Card
                  key={track.id}
                  className={cn(
                    'p-3 bg-surface/60 border-surface-border/80 flex items-center justify-between gap-3 transition-all duration-200 hover:border-brand-500/40 hover:bg-surface group',
                    isThisPlaying && 'border-brand-500/60 bg-brand-500/10'
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <MusicArtwork
                      src={track.artworkUrl}
                      alt={track.title}
                      size="md"
                      fallbackIcon={
                        <Disc
                          className={cn(
                            'w-5 h-5 text-brand-400',
                            isThisPlaying && 'animate-spin'
                          )}
                        />
                      }
                    />
                    <div className="min-w-0 flex-1">
                      <Link
                        to={`/song/${track.id}`}
                        className="text-xs font-semibold text-content-primary hover:text-brand-300 truncate block transition-colors"
                      >
                        {track.title}
                      </Link>
                      <p className="text-[11px] text-content-secondary truncate mt-0.5">
                        {track.artistName}
                      </p>
                      <span className="text-[10px] text-content-muted font-mono">
                        {formatDuration(track.durationSeconds)}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handlePlaySong(track, tracks)}
                    className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-95 shadow-sm',
                      isThisPlaying
                        ? 'bg-brand-500 text-white'
                        : 'bg-surface-hover text-brand-300 group-hover:bg-brand-500 group-hover:text-white'
                    )}
                    aria-label={isThisPlaying ? `Pause ${track.title}` : `Play ${track.title}`}
                  >
                    {isThisPlaying ? (
                      <Pause className="w-3.5 h-3.5 fill-current" />
                    ) : (
                      <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                    )}
                  </button>
                </Card>
              );
            })}
          </div>
        ) : null}
      </section>

      {/* 4. Section: Explore by Mood */}
      <section className="px-4 sm:px-8 py-10 max-w-6xl mx-auto w-full">
        <div className="flex items-center justify-between mb-5 px-0.5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-brand-500/15 border border-brand-500/30 flex items-center justify-center text-brand-400">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-content-primary">Explore by Mood</h2>
              <p className="text-xs text-content-secondary">
                Select your vibe and discover matched acoustic textures
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {MOOD_OPTIONS.map((mood) => {
            const gradientStyle =
              MOOD_GRADIENTS[mood.id] ||
              'from-brand-500/20 via-purple-500/10 to-transparent border-brand-500/30 text-brand-300';
            return (
              <button
                key={mood.id}
                onClick={() => handleSelectMood(mood.id)}
                className={`p-3.5 rounded-2xl bg-gradient-to-br ${gradientStyle} bg-surface/50 border hover:scale-[1.02] transition-all text-left flex flex-col justify-between group h-28 shadow-sm`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-2xl group-hover:scale-110 transition-transform">
                    {mood.emoji}
                  </span>
                  <ChevronRight className="w-4 h-4 opacity-40 group-hover:opacity-100 transition-opacity" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-content-primary leading-tight">
                    {mood.label}
                  </h4>
                  <p className="text-[10px] text-content-secondary line-clamp-1 mt-0.5">
                    {mood.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* 5. Section: Fresh Discoveries */}
      {freshDiscoveries.length > 0 && (
        <section className="px-4 sm:px-8 py-10 max-w-6xl mx-auto w-full">
          <div className="flex items-center justify-between mb-5 px-0.5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-brand-500/15 border border-brand-500/30 flex items-center justify-center text-brand-400">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-content-primary">
                  Fresh Discoveries
                </h2>
                <p className="text-xs text-content-secondary">
                  Emerging tracks from independent artists
                </p>
              </div>
            </div>
            <Link to="/discover">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-brand-400 hover:text-brand-300"
                rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
              >
                Explore More
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3.5">
            {freshDiscoveries.map((track) => {
              const isThisPlaying = currentTrack?.id === track.id && isPlaying;
              return (
                <Card
                  key={track.id}
                  className={cn(
                    'p-2.5 bg-surface/60 border-surface-border/80 flex flex-col gap-2 transition-all duration-200 hover:border-brand-500/40 hover:bg-surface group',
                    isThisPlaying && 'border-brand-500/60 bg-brand-500/10'
                  )}
                >
                  <div className="relative aspect-square w-full rounded-xl overflow-hidden shadow-sm">
                    <MusicArtwork
                      src={track.artworkUrl}
                      alt={track.title}
                      size="lg"
                      className="w-full h-full object-cover"
                      fallbackIcon={
                        <Disc
                          className={cn(
                            'w-8 h-8 text-brand-400',
                            isThisPlaying && 'animate-spin'
                          )}
                        />
                      }
                    />

                    {/* Play button overlay */}
                    <button
                      onClick={() => handlePlaySong(track, tracks)}
                      className={cn(
                        'absolute bottom-2 right-2 w-8 h-8 rounded-full flex items-center justify-center transition-all shadow-md',
                        isThisPlaying
                          ? 'bg-brand-500 text-white opacity-100 scale-100'
                          : 'bg-black/60 text-white opacity-0 group-hover:opacity-100 hover:bg-brand-500 hover:scale-105'
                      )}
                      aria-label={isThisPlaying ? `Pause ${track.title}` : `Play ${track.title}`}
                    >
                      {isThisPlaying ? (
                        <Pause className="w-3.5 h-3.5 fill-current" />
                      ) : (
                        <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                      )}
                    </button>
                  </div>

                  <div className="min-w-0">
                    <Link
                      to={`/song/${track.id}`}
                      className="text-xs font-semibold text-content-primary hover:text-brand-300 truncate block transition-colors"
                    >
                      {track.title}
                    </Link>
                    <p className="text-[11px] text-content-secondary truncate mt-0.5">
                      {track.artistName}
                    </p>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {/* 6. Section: How TuneSense Works (Consumer-Friendly) */}
      <section className="bg-bg-elevated/40 border-y border-surface-border/50 py-16 px-4 sm:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-xl mx-auto mb-12 space-y-2">
            <Badge variant="brand" size="sm" className="mb-1">
              Music Intelligence
            </Badge>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-content-primary">
              Why TuneSense Hits Different
            </h2>
            <p className="text-xs sm:text-sm text-content-secondary">
              Music discovery built around how you actually listen, not just commercial charts.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <Card className="p-6 bg-surface/60 border-surface-border hover:border-brand-500/30 transition-all space-y-3">
              <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-400 flex items-center justify-center">
                <Sliders className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-content-primary">
                Mood-Aware Discovery
              </h3>
              <p className="text-xs text-content-secondary leading-relaxed">
                Whether you need deep focus, high-tempo workout energy, or peaceful ambient calm, TuneSense dynamically aligns tracks with your vibe.
              </p>
            </Card>

            <Card className="p-6 bg-surface/60 border-surface-border hover:border-brand-500/30 transition-all space-y-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
                <Heart className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-content-primary">
                Adaptive Taste Profile
              </h3>
              <p className="text-xs text-content-secondary leading-relaxed">
                Your profile continuously learns from what you love, what you repeat, and what you skip—creating a personalized mix that gets better every day.
              </p>
            </Card>

            <Card className="p-6 bg-surface/60 border-surface-border hover:border-brand-500/30 transition-all space-y-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-content-primary">
                Explainable Recommendations
              </h3>
              <p className="text-xs text-content-secondary leading-relaxed">
                No black boxes. Every suggested song tells you why it was picked—whether by acoustic similarity, mood match, or community co-listening.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* 7. Section: Ready to Start / Join CTA */}
      <section className="py-20 px-4 sm:px-8 max-w-4xl mx-auto w-full text-center">
        <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-b from-surface via-bg-elevated to-bg-main border border-brand-500/30 shadow-2xl space-y-5 relative overflow-hidden">
          <div className="absolute top-0 right-1/4 w-64 h-64 bg-brand-500/15 blur-3xl rounded-full pointer-events-none" />

          <h2 className="text-2xl sm:text-4xl font-extrabold text-content-primary tracking-tight">
            Start streaming your personalized vibe today.
          </h2>
          <p className="text-xs sm:text-sm text-content-secondary max-w-md mx-auto leading-relaxed">
            Create your free account to build playlists, save favorite tracks, and let TuneSense tailor recommendations to your taste.
          </p>

          <div className="pt-2 flex flex-wrap justify-center gap-3">
            <Link to="/signup">
              <Button
                variant="primary"
                size="md"
                className="shadow-glow px-6 font-semibold"
                rightIcon={<ArrowRight className="w-4 h-4 ml-1" />}
              >
                Create Free Account
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="secondary" size="md" className="px-5">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* 8. Floating Bottom MiniPlayer (Only when audio is actively playing) */}
      {currentTrack && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-bg-elevated/95 backdrop-blur-xl border-t border-surface-border px-4 py-2.5 sm:px-8 flex items-center justify-between shadow-2xl animate-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center gap-3 min-w-0 flex-1 max-w-sm">
            <MusicArtwork
              src={currentTrack.artworkUrl}
              alt={currentTrack.title}
              size="sm"
              fallbackIcon={<Disc className="w-5 h-5 text-brand-400" />}
            />
            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-semibold text-content-primary truncate">
                {currentTrack.title}
              </h4>
              <p className="text-[11px] text-content-secondary truncate">
                {currentTrack.artistName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={togglePlayPause}
              className="w-9 h-9 rounded-full bg-brand-500 text-white flex items-center justify-center shadow-md active:scale-95 transition-transform"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current ml-0.5" />
              )}
            </button>
            <Link to="/signup">
              <Button variant="primary" size="sm" className="text-xs hidden sm:inline-flex">
                Open in App
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* 9. Clean Footer */}
      <footer className="mt-auto border-t border-surface-border/50 py-8 px-4 sm:px-8 text-xs text-content-muted">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-brand-500/15 border border-brand-500/30 flex items-center justify-center text-brand-400">
              <Radio className="w-3.5 h-3.5 text-brand-400" />
            </div>
            <span className="font-semibold text-content-primary">TuneSense</span>
            <span>• Music that understands your vibe</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-5 text-[11px]">
            <Link to="/discover" className="hover:text-content-primary transition-colors">
              Discover
            </Link>
            <Link to="/search" className="hover:text-content-primary transition-colors">
              Search
            </Link>
            <Link to="/login" className="hover:text-content-primary transition-colors">
              Sign In
            </Link>
            <Link to="/signup" className="hover:text-content-primary transition-colors">
              Get Started
            </Link>
          </div>
        </div>

        <div className="max-w-6xl mx-auto mt-4 pt-4 border-t border-surface-border/30 text-center text-[10px] text-content-muted">
          All audio tracks streamed legally via the Jamendo Music API under Creative Commons licenses. Non-commercial music discovery.
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
