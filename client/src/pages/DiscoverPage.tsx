import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Search,
  TrendingUp,
  Compass,
  Music,
  Headphones,
  Flame,
  Radio,
  RotateCcw,
  AlertCircle,
} from 'lucide-react';
import { PageContainer } from '../components/layout/PageContainer.js';
import { Card } from '../components/ui/Card.js';
import { Button } from '../components/ui/Button.js';
import { Input } from '../components/ui/Input.js';
import { TrackArtworkCard } from '../components/music/TrackArtworkCard.js';
import { fetchPopularTracks } from '../services/musicService.js';
import { useAudioPlayer } from '../contexts/AudioPlayerContext.js';
import { TrackItem } from '../types/index.js';

const DISCOVER_GENRES = [
  {
    name: 'Electronic & Synth',
    query: 'electronic',
    gradient: 'from-purple-950/80 via-indigo-900/40 to-surface',
    border: 'border-purple-500/20 hover:border-purple-500/50',
    tag: 'ELECTRONIC',
    icon: Flame,
  },
  {
    name: 'Ambient & Chill',
    query: 'ambient',
    gradient: 'from-cyan-950/80 via-blue-900/40 to-surface',
    border: 'border-cyan-500/20 hover:border-cyan-500/50',
    tag: 'AMBIENT',
    icon: Headphones,
  },
  {
    name: 'Acoustic & Folk',
    query: 'acoustic',
    gradient: 'from-emerald-950/80 via-teal-900/40 to-surface',
    border: 'border-emerald-500/20 hover:border-emerald-500/50',
    tag: 'ACOUSTIC',
    icon: Music,
  },
  {
    name: 'Lo-Fi & Chillhop',
    query: 'lofi',
    gradient: 'from-amber-950/80 via-orange-900/40 to-surface',
    border: 'border-amber-500/20 hover:border-amber-500/50',
    tag: 'LO-FI',
    icon: Radio,
  },
  {
    name: 'Rock & Alternative',
    query: 'rock',
    gradient: 'from-rose-950/80 via-pink-900/40 to-surface',
    border: 'border-rose-500/20 hover:border-rose-500/50',
    tag: 'INDIE ROCK',
    icon: Sparkles,
  },
  {
    name: 'Pop & Grooves',
    query: 'pop',
    gradient: 'from-violet-950/80 via-fuchsia-900/40 to-surface',
    border: 'border-violet-500/20 hover:border-violet-500/50',
    tag: 'POP',
    icon: Compass,
  },
];

const DISCOVER_MOODS = [
  { id: 'energetic', label: 'High Energy', emoji: '⚡', color: 'hover:border-amber-400/50' },
  { id: 'focused', label: 'Deep Focus', emoji: '🎯', color: 'hover:border-brand-400/50' },
  { id: 'calm', label: 'Calm & Flow', emoji: '🍃', color: 'hover:border-emerald-400/50' },
  { id: 'relaxed', label: 'Relaxed', emoji: '🌊', color: 'hover:border-cyan-400/50' },
  { id: 'happy', label: 'Uplifting', emoji: '☀️', color: 'hover:border-yellow-400/50' },
  { id: 'romantic', label: 'Romantic', emoji: '🌹', color: 'hover:border-rose-400/50' },
  { id: 'sad', label: 'Melancholic', emoji: '🌧️', color: 'hover:border-blue-400/50' },
  { id: 'nostalgic', label: 'Nostalgic', emoji: '📼', color: 'hover:border-purple-400/50' },
];

export const DiscoverPage: React.FC = () => {
  const navigate = useNavigate();
  const { setQueue, currentTrack, isPlaying } = useAudioPlayer();
  const [popularTracks, setPopularTracks] = useState<TrackItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadTracks = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchPopularTracks(14)
      .then((res) => {
        setPopularTracks(res.tracks || []);
        setError(null);
      })
      .catch((err) => {
        console.warn('[DiscoverPage] Failed to fetch popular tracks:', err);
        setError(
          err instanceof Error
            ? err.message
            : 'External music catalogue is temporarily unavailable. Please retry.'
        );
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadTracks();
  }, [loadTracks]);

  const handleSelectMood = (moodId: string) => {
    sessionStorage.setItem('tunesense_active_mood', moodId);
    navigate('/home');
  };

  return (
    <PageContainer>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-content-primary tracking-tight">
            Discover Music
          </h2>
          <p className="text-xs text-content-secondary mt-0.5">
            Explore curated vibe spaces, moods, and independent artists
          </p>
        </div>
      </div>

      {/* Quick Search Bar */}
      <div className="flex gap-2 mb-6">
        <Input
          isSearch
          placeholder="Search tracks, artists, or genres..."
          className="flex-1 cursor-pointer bg-surface/60 border-surface-border hover:border-brand-500/30 transition-colors"
          onClick={() => navigate('/search')}
          readOnly
        />
        <Button
          variant="primary"
          size="md"
          aria-label="Search"
          onClick={() => navigate('/search')}
          className="shrink-0 px-4"
        >
          <Search className="w-4 h-4" />
        </Button>
      </div>

      {/* Mood Exploration Chips */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2.5 px-0.5">
          <span className="text-xs font-semibold text-content-secondary uppercase tracking-wider flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-brand-400" />
            Explore by Mood
          </span>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
          {DISCOVER_MOODS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => handleSelectMood(m.id)}
              className={`shrink-0 flex items-center gap-2 py-2 px-3.5 rounded-full bg-surface/80 hover:bg-surface border border-surface-border text-xs font-medium text-content-primary transition-all hover:scale-105 active:scale-95 shadow-sm ${m.color}`}
            >
              <span className="text-sm select-none">{m.emoji}</span>
              <span>{m.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Trending Horizontal Carousel */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3 px-0.5">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-brand-400" />
            <h3 className="text-base font-bold text-content-primary tracking-tight">
              Trending Independent Tracks
            </h3>
          </div>
          <span className="text-[11px] text-content-muted">Jamendo Creative Commons</span>
        </div>

        {loading ? (
          <div className="flex gap-3 overflow-x-auto pb-3 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="w-36 sm:w-44 h-56 rounded-xl bg-surface/50 border border-surface-border animate-pulse shrink-0"
              />
            ))}
          </div>
        ) : popularTracks.length > 0 ? (
          <div className="flex gap-3 overflow-x-auto pb-3 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
            {popularTracks.map((track, idx) => {
              const isActive = currentTrack?.id === track.id;
              return (
                <TrackArtworkCard
                  key={track.id}
                  track={track}
                  isActive={isActive}
                  isPlaying={isActive && isPlaying}
                  onPlay={() => setQueue(popularTracks, idx)}
                />
              );
            })}
          </div>
        ) : error ? (
          <div className="p-6 text-center border border-vibe-rose/25 bg-vibe-rose/10 rounded-2xl my-2">
            <AlertCircle className="w-8 h-8 text-vibe-rose mx-auto mb-2" />
            <h4 className="text-sm font-semibold text-content-primary">Catalogue Notice</h4>
            <p className="text-xs text-rose-300 mt-1 max-w-sm mx-auto">
              {error}
            </p>
            <div className="flex items-center justify-center gap-2 mt-4">
              <Button
                variant="primary"
                size="sm"
                onClick={loadTracks}
                leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
              >
                Retry Catalogue
              </Button>
            </div>
          </div>
        ) : (
          <Card className="p-6 text-center border-surface-border my-2">
            <Music className="w-8 h-8 text-content-muted mx-auto mb-2 opacity-50" />
            <h4 className="text-xs font-semibold text-content-primary">Catalogue Standby</h4>
            <p className="text-[11px] text-content-secondary mt-1">
              Search directly for specific artists or tap any mood to start listening.
            </p>
          </Card>
        )}
      </div>

      {/* Artwork-Led Genre Spaces */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3 px-0.5">
          <span className="text-xs font-semibold text-content-secondary uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-brand-400" />
            Vibe Spaces & Genres
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {DISCOVER_GENRES.map((genre) => {
            const Icon = genre.icon;
            return (
              <div
                key={genre.name}
                onClick={() => navigate(`/search?q=${encodeURIComponent(genre.query)}`)}
                className={`relative overflow-hidden p-4 rounded-xl bg-gradient-to-br ${genre.gradient} border ${genre.border} cursor-pointer group hover:scale-[1.02] active:scale-[0.99] transition-all flex flex-col justify-between min-h-[115px] select-none shadow-sm`}
              >
                {/* Subtle background ambient icon */}
                <Icon className="absolute -bottom-2 -right-2 w-16 h-16 text-white/[0.05] group-hover:text-white/[0.1] transition-colors pointer-events-none" />

                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono tracking-wider text-brand-300 uppercase font-semibold">
                    {genre.tag}
                  </span>
                  <Sparkles className="w-3.5 h-3.5 text-brand-400 opacity-60 group-hover:opacity-100 transition-opacity" />
                </div>

                <div className="relative z-10 mt-3">
                  <h4 className="text-sm font-bold text-white group-hover:text-brand-200 transition-colors leading-tight">
                    {genre.name}
                  </h4>
                  <p className="text-[11px] text-content-secondary mt-1 group-hover:text-white/80 transition-colors">
                    Explore collection →
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </PageContainer>
  );
};

export default DiscoverPage;
