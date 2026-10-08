import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Search, TrendingUp, Loader2 } from 'lucide-react';
import { PageContainer } from '../components/layout/PageContainer.js';
import { Card } from '../components/ui/Card.js';
import { Badge } from '../components/ui/Badge.js';
import { Button } from '../components/ui/Button.js';
import { Input } from '../components/ui/Input.js';
import { SongCard } from '../components/music/SongCard.js';
import { fetchPopularTracks } from '../services/musicService.js';
import { useAudioPlayer } from '../contexts/AudioPlayerContext.js';
import { TrackItem } from '../types/index.js';

const DISCOVER_GENRES = [
  { name: 'Electronic & Synth', query: 'electronic', color: 'from-purple-900/60 to-indigo-900/60', vibe: 'electronic' },
  { name: 'Ambient & Chill', query: 'ambient', color: 'from-cyan-900/60 to-blue-900/60', vibe: 'ambient' },
  { name: 'Acoustic & Folk', query: 'acoustic', color: 'from-emerald-900/60 to-teal-900/60', vibe: 'acoustic' },
  { name: 'Lo-Fi & Chillhop', query: 'lofi', color: 'from-amber-900/60 to-orange-900/60', vibe: 'lofi' },
  { name: 'Rock & Indie', query: 'rock', color: 'from-rose-900/60 to-pink-900/60', vibe: 'rock' },
  { name: 'Pop & Dance', query: 'pop', color: 'from-violet-900/60 to-fuchsia-900/60', vibe: 'pop' },
];

const DISCOVER_MOODS = [
  { id: 'happy', label: 'Happy', emoji: '☀️' },
  { id: 'energetic', label: 'Energetic', emoji: '⚡' },
  { id: 'relaxed', label: 'Relaxed', emoji: '🌊' },
  { id: 'focused', label: 'Focused', emoji: '🎯' },
  { id: 'romantic', label: 'Romantic', emoji: '🌹' },
  { id: 'sad', label: 'Melancholic', emoji: '🌧️' },
  { id: 'calm', label: 'Calm', emoji: '🍃' },
  { id: 'nostalgic', label: 'Nostalgic', emoji: '📼' },
];

export const DiscoverPage: React.FC = () => {
  const navigate = useNavigate();
  const { setQueue, currentTrack, isPlaying } = useAudioPlayer();
  const [popularTracks, setPopularTracks] = useState<TrackItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchPopularTracks(10)
      .then((res) => {
        setPopularTracks(res.tracks);
      })
      .catch((err) => {
        console.warn('[DiscoverPage] Failed to fetch popular tracks:', err);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSelectMood = (moodId: string) => {
    sessionStorage.setItem('tunesense_active_mood', moodId);
    navigate('/home');
  };

  return (
    <PageContainer>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-content-primary">Discover</h2>
          <p className="text-xs text-content-secondary mt-0.5">
            Explore vibes, genres, and independent music
          </p>
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="flex gap-2 mb-5">
        <Input
          isSearch
          placeholder="Search songs, artists, albums..."
          className="flex-1 cursor-pointer"
          onClick={() => navigate('/search')}
          readOnly
        />
        <Button
          variant="primary"
          size="md"
          aria-label="Search"
          onClick={() => navigate('/search')}
        >
          <Search className="w-4 h-4" />
        </Button>
      </div>

      {/* Mood Exploration Pills */}
      <div className="mb-6">
        <h3 className="text-xs font-semibold text-content-secondary uppercase tracking-wider mb-2.5 px-0.5">
          Explore by Mood
        </h3>
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {DISCOVER_MOODS.map((m) => (
            <Badge
              key={m.id}
              variant="neutral"
              className="cursor-pointer hover:scale-105 transition-transform shrink-0 flex items-center gap-1.5 py-1.5 px-3 bg-surface hover:bg-surface-border text-content-primary"
              onClick={() => handleSelectMood(m.id)}
            >
              <span>{m.emoji}</span>
              <span>{m.label}</span>
            </Badge>
          ))}
        </div>
      </div>

      {/* Genre Spaces */}
      <div className="mb-6">
        <h3 className="text-xs font-semibold text-content-secondary uppercase tracking-wider mb-3 px-0.5">
          Curated Vibe Spaces
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {DISCOVER_GENRES.map((genre) => (
            <Card
              key={genre.name}
              interactive
              onClick={() => navigate(`/search?q=${encodeURIComponent(genre.query)}`)}
              className={`p-4 bg-gradient-to-br ${genre.color} border-surface-border flex flex-col justify-between min-h-[105px] cursor-pointer hover:scale-[1.02] transition-transform`}
            >
              <span className="text-xs font-mono text-content-secondary uppercase">
                {genre.vibe}
              </span>
              <div>
                <h4 className="text-sm font-bold text-white leading-tight">
                  {genre.name}
                </h4>
                <div className="flex items-center gap-1 text-[11px] text-content-muted mt-1">
                  <Sparkles className="w-3 h-3 text-brand-400" />
                  <span>Explore Tracks</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Trending / Popular Catalogue */}
      <div className="space-y-3 mb-6">
        <div className="flex items-center justify-between px-0.5">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-brand-400" />
            <h3 className="text-sm font-bold text-content-primary uppercase tracking-wider">
              Popular Independent Music
            </h3>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-content-muted gap-2 text-xs">
            <Loader2 className="w-5 h-5 animate-spin text-brand-400" />
            Loading tracks...
          </div>
        ) : popularTracks.length > 0 ? (
          <div className="flex flex-col gap-2">
            {popularTracks.map((track, idx) => {
              const isActive = currentTrack?.id === track.id;
              return (
                <SongCard
                  key={track.id}
                  track={track}
                  isActive={isActive}
                  isPlaying={isActive && isPlaying}
                  onPlay={() => {
                    setQueue(popularTracks, idx);
                  }}
                />
              );
            })}
          </div>
        ) : (
          <div className="p-4 rounded-card bg-surface/40 border border-surface-border text-center text-xs text-content-muted">
            No tracks found. Check network connection or configuration.
          </div>
        )}
      </div>
    </PageContainer>
  );
};
