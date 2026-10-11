import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  ArrowRight,
  TrendingUp,
  LogIn,
  Music,
  RotateCcw,
  AlertCircle,
  Search,
  User,
  Clock,
  Headphones,
  Flame,
  Radio,
  Coffee,
  Guitar,
  Target,
} from 'lucide-react';
import { PageContainer } from '../components/layout/PageContainer.js';
import { Button } from '../components/ui/Button.js';
import { SongCard } from '../components/music/SongCard.js';
import { FeaturedTrackHero } from '../components/music/FeaturedTrackHero.js';
import { TrackArtworkCard } from '../components/music/TrackArtworkCard.js';
import { RecommendationCard } from '../components/recommendation/RecommendationCard.js';
import { MoodSelector } from '../components/recommendation/MoodSelector.js';
import { useAuth } from '../contexts/AuthContext.js';
import { useAudioPlayer } from '../contexts/AudioPlayerContext.js';
import { recommendationService } from '../services/recommendationService.js';
import { analyticsService } from '../services/analyticsService.js';
import { libraryService } from '../services/libraryService.js';
import { fetchPopularTracks, searchMusic } from '../services/musicService.js';
import { RecommendationItemDto, TrackItem, HistoryItem } from '../types/index.js';
import { cn } from '../utils/cn.js';

const MOOD_STORAGE_KEY = 'tunesense_active_mood';

// Functional curated genre & vibe tiles for visual variety
const GENRE_VIBE_TILES = [
  {
    id: 'electronic',
    label: 'Electronic & Synth',
    query: 'electronic synth',
    gradient: 'from-[#1e1433] via-[#151322] to-[#13131B]',
    border: 'border-brand-500/30 hover:border-brand-500/60',
    accentColor: 'text-brand-300',
    icon: Flame,
  },
  {
    id: 'ambient',
    label: 'Ambient Chill',
    query: 'ambient chillout',
    gradient: 'from-[#102030] via-[#121924] to-[#13131B]',
    border: 'border-sky-500/30 hover:border-sky-500/60',
    accentColor: 'text-sky-300',
    icon: Headphones,
  },
  {
    id: 'lofi',
    label: 'Lo-Fi Beats',
    query: 'lofi beats',
    gradient: 'from-[#281c15] via-[#1d1717] to-[#13131B]',
    border: 'border-amber-500/30 hover:border-amber-500/60',
    accentColor: 'text-amber-300',
    icon: Coffee,
  },
  {
    id: 'acoustic',
    label: 'Acoustic & Folk',
    query: 'acoustic folk',
    gradient: 'from-[#12241f] via-[#131c19] to-[#13131B]',
    border: 'border-emerald-500/30 hover:border-emerald-500/60',
    accentColor: 'text-emerald-300',
    icon: Guitar,
  },
  {
    id: 'indie',
    label: 'Indie & Alt Rock',
    query: 'indie rock',
    gradient: 'from-[#281523] via-[#1c141c] to-[#13131B]',
    border: 'border-rose-500/30 hover:border-rose-500/60',
    accentColor: 'text-rose-300',
    icon: Radio,
  },
  {
    id: 'focus',
    label: 'Focus & Flow',
    query: 'focus deep study',
    gradient: 'from-[#161633] via-[#141525] to-[#13131B]',
    border: 'border-indigo-500/30 hover:border-indigo-500/60',
    accentColor: 'text-indigo-300',
    icon: Target,
  },
];

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const { setQueue, currentTrack, isPlaying } = useAudioPlayer();

  // 1. Personalized or Vibe Discovery section
  const [recommendations, setRecommendations] = useState<RecommendationItemDto[]>([]);
  const [recLoading, setRecLoading] = useState<boolean>(true);
  const [recError, setRecError] = useState<string | null>(null);
  const [activeStrategy, setActiveStrategy] = useState<string>('hybrid');
  const [recRequestId, setRecRequestId] = useState<string | null>(null);

  // Active mood filter
  const [activeMood, setActiveMood] = useState<string | null>(() => {
    return sessionStorage.getItem(MOOD_STORAGE_KEY) || null;
  });

  // Selected genre tile filter (if user taps a tile)
  const [activeGenreQuery, setActiveGenreQuery] = useState<string | null>(null);

  // 2. Trending / Popular section
  const [popularTracks, setPopularTracks] = useState<TrackItem[]>([]);
  const [popularLoading, setPopularLoading] = useState<boolean>(true);
  const [popularError, setPopularError] = useState<string | null>(null);

  // 3. User Listening History (authenticated only)
  const [recentHistory, setRecentHistory] = useState<HistoryItem[]>([]);

  // Contextual time greeting
  const getGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Good morning';
    if (hour >= 12 && hour < 17) return 'Good afternoon';
    if (hour >= 17 && hour < 22) return 'Good evening';
    return 'Good night';
  };

  const displayName = user?.name ? user.name.split(' ')[0] : 'Listener';

  /**
   * Load Personalized or Genre/Mood Discovery Tracks.
   * This is guaranteed to be UNIQUE from popularTracks.
   */
  const loadDiscoveryTracks = useCallback(
    async (mood?: string | null, genreQuery?: string | null) => {
      setRecLoading(true);
      setRecError(null);

      // A) Authenticated user with personal profile
      if (isAuthenticated && !genreQuery) {
        try {
          const res = await recommendationService.getRecommendations(
            10,
            'hybrid',
            mood || undefined
          );
          setRecommendations(res.recommendations);
          setActiveStrategy(res.strategy);
          setRecRequestId(res.recommendationRequestId || null);
          setRecError(null);

          // Background analytics impression logging
          if (res.recommendationRequestId && res.recommendations.length > 0) {
            const impressionItems = res.recommendations.map((rec, idx) => ({
              songId: rec.song.id,
              strategy: res.strategy,
              recommendationScore: rec.score,
              position: idx + 1,
              mood: mood || undefined,
              recommendationRequestId: res.recommendationRequestId!,
            }));
            analyticsService.recordImpressions(impressionItems).catch(() => {});
          }
          return;
        } catch (err) {
          console.warn('[HomePage] Authenticated recommendation fallback:', err);
          // Fall through to query-based discovery below
        }
      }

      // B) Guest user OR specific genre/mood discovery query
      // Guarantees distinct tracks that never duplicate the Popular tracks
      try {
        const query = genreQuery || (mood ? `${mood} music` : 'ambient chillout electronic');
        const searchRes = await searchMusic(query, 12, 0);
        const searchTracks = searchRes.tracks || [];

        setRecommendations(
          searchTracks.map((track) => ({
            song: track,
            score: 0.9,
            reason: genreQuery
              ? `Curated ${genreQuery} vibe`
              : mood
              ? `Acoustic match for ${mood}`
              : 'Curated discovery pick',
            reasonType: (genreQuery ? 'genre' : mood ? 'mood' : 'novelty') as
              | 'genre'
              | 'mood'
              | 'novelty',
          }))
        );
        setActiveStrategy('content');
        setRecRequestId(null);
        setRecError(null);
      } catch (err) {
        console.warn('[HomePage] Catalogue discovery error:', err);
        setRecommendations([]);
        setRecRequestId(null);
        setRecError(
          err instanceof Error
            ? err.message
            : 'Unable to connect to the music catalogue. Please try again.'
        );
      } finally {
        setRecLoading(false);
      }
    },
    [isAuthenticated]
  );

  /**
   * Load Popular / Trending Tracks from the catalogue.
   */
  const loadTrendingTracks = useCallback(async () => {
    setPopularLoading(true);
    setPopularError(null);
    try {
      if (isAuthenticated) {
        const history = await libraryService.getHistory(6);
        setRecentHistory(history);
      }
      const pop = await fetchPopularTracks(12);
      setPopularTracks(pop.tracks || []);
      setPopularError(null);
    } catch (err) {
      console.warn('[HomePage] Error loading trending tracks:', err);
      setPopularError(
        err instanceof Error
          ? err.message
          : 'Unable to connect to the music catalogue. Please try again.'
      );
    } finally {
      setPopularLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadDiscoveryTracks(activeMood, activeGenreQuery);
    loadTrendingTracks();
  }, [activeMood, activeGenreQuery, loadDiscoveryTracks, loadTrendingTracks]);

  const handleSelectMood = (moodId: string) => {
    const nextMood = activeMood === moodId ? null : moodId;
    setActiveMood(nextMood);
    setActiveGenreQuery(null); // Reset genre query when mood is chosen
    if (nextMood) {
      sessionStorage.setItem(MOOD_STORAGE_KEY, nextMood);
    } else {
      sessionStorage.removeItem(MOOD_STORAGE_KEY);
    }
  };

  const handleClearMood = () => {
    setActiveMood(null);
    setActiveGenreQuery(null);
    sessionStorage.removeItem(MOOD_STORAGE_KEY);
  };

  const handleSelectGenreTile = (tileQuery: string) => {
    if (activeGenreQuery === tileQuery) {
      setActiveGenreQuery(null);
    } else {
      setActiveGenreQuery(tileQuery);
      setActiveMood(null);
      sessionStorage.removeItem(MOOD_STORAGE_KEY);
    }
  };

  // Top featured track spotlight
  const featuredTrack = popularTracks[0] || recommendations[0]?.song || null;

  const handlePlayFeatured = () => {
    if (!featuredTrack) return;
    const allTracks =
      popularTracks.length > 0
        ? popularTracks
        : recommendations.map((r) => r.song);
    const idx = allTracks.findIndex((t) => t.id === featuredTrack.id);
    setQueue(allTracks, idx >= 0 ? idx : 0, {
      recommendationRequestId: recRequestId || undefined,
      recommendationStrategy: activeStrategy,
    });
  };

  return (
    <PageContainer>
      {/* 1. COMPACT EDITORIAL HEADER */}
      <header className="flex items-center justify-between gap-3 mb-5 pt-1">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-content-primary tracking-tight truncate">
              {getGreeting()}, {displayName}
            </h1>
          </div>
          <p className="text-xs text-content-secondary mt-0.5 truncate">
            {activeGenreQuery
              ? `Exploring ${activeGenreQuery} sounds`
              : activeMood
              ? `Tuned for ${activeMood} vibe • Mood-aware discovery`
              : isAuthenticated
              ? 'Your personalized daily mix and soundscapes'
              : 'Music that understands your vibe'}
          </p>
        </div>

        {/* Search Shortcut & Profile Action */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => navigate('/search')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface hover:bg-surface-secondary border border-surface-border text-content-secondary hover:text-content-primary text-xs font-medium transition-colors"
            title="Search music, artists, genres"
            aria-label="Search catalogue"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Search</span>
          </button>

          {isAuthenticated ? (
            <button
              type="button"
              onClick={() => navigate('/profile')}
              className="w-8 h-8 rounded-full bg-brand-500/15 border border-brand-500/30 text-brand-300 hover:text-white flex items-center justify-center text-xs font-semibold transition-colors"
              title="Profile and taste settings"
              aria-label="User Profile"
            >
              <User className="w-4 h-4" />
            </button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/login')}
              leftIcon={<LogIn className="w-3.5 h-3.5" />}
              className="text-xs h-8 px-3 rounded-full shadow-sm"
            >
              Sign In
            </Button>
          )}
        </div>
      </header>

      {/* 2. MOOD SELECTION CHIPS */}
      <section className="mb-6">
        <MoodSelector
          activeMood={activeMood}
          onSelectMood={handleSelectMood}
          onClearMood={handleClearMood}
        />
      </section>

      {/* 3. COMPACT FEATURED TRACK SPOTLIGHT */}
      {featuredTrack && (
        <section className="mb-8">
          <FeaturedTrackHero
            track={featuredTrack}
            isActive={currentTrack?.id === featuredTrack.id}
            isPlaying={currentTrack?.id === featuredTrack.id && isPlaying}
            onPlay={handlePlayFeatured}
          />
        </section>
      )}

      {/* 4. VISUAL VARIETY: COMPACT GENRE & VIBE TILES */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-3 px-0.5">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-content-primary tracking-tight">
              Explore by Sound & Vibe
            </h2>
            <p className="text-xs text-content-secondary mt-0.5">
              Jump directly into distinctive acoustic spaces
            </p>
          </div>
          {activeGenreQuery && (
            <button
              onClick={() => setActiveGenreQuery(null)}
              className="text-[11px] text-content-muted hover:text-brand-300 transition-colors"
            >
              Clear filter
            </button>
          )}
        </div>

        {/* 6-Tile Grid filling desktop space cleanly without stretching cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
          {GENRE_VIBE_TILES.map((tile) => {
            const Icon = tile.icon;
            const isTileActive = activeGenreQuery === tile.query;

            return (
              <div
                key={tile.id}
                onClick={() => handleSelectGenreTile(tile.query)}
                className={cn(
                  'p-3 sm:p-3.5 rounded-xl bg-gradient-to-br border transition-all duration-200 cursor-pointer select-none flex items-center justify-between group min-h-[58px]',
                  tile.gradient,
                  tile.border,
                  isTileActive
                    ? 'ring-2 ring-brand-400 border-brand-400 bg-surface shadow-md'
                    : 'hover:scale-[1.02] shadow-sm'
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={cn(
                      'w-7 h-7 rounded-lg bg-surface/80 border border-surface-border flex items-center justify-center shrink-0',
                      tile.accentColor
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-semibold text-content-primary truncate tracking-tight">
                    {tile.label}
                  </span>
                </div>
                <ArrowRight
                  className={cn(
                    'w-3.5 h-3.5 text-content-muted group-hover:text-content-primary transition-transform group-hover:translate-x-0.5 shrink-0 ml-1.5',
                    isTileActive && 'text-brand-400 translate-x-0.5'
                  )}
                />
              </div>
            );
          })}
        </div>
      </section>

      {/* 5. POPULAR & TRENDING TRACKS (POPULARITY-BASED SECTION) */}
      {(popularLoading || popularTracks.length > 0 || popularError) && (
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3 px-0.5">
            <div>
              <div className="flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-brand-400" />
                <h2 className="text-base sm:text-lg font-bold text-content-primary tracking-tight">
                  Trending Tracks
                </h2>
              </div>
              <p className="text-xs text-content-secondary mt-0.5">
                Most popular independent tracks across TuneSense right now
              </p>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/discover')}
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              className="text-xs text-content-secondary hover:text-content-primary"
            >
              See all
            </Button>
          </div>

          {popularLoading ? (
            <div className="w-full max-w-full flex gap-3 overflow-x-auto pb-2 no-scrollbar">
              {[1, 2, 3, 4, 5].map((n) => (
                <div
                  key={n}
                  className="w-36 sm:w-40 md:w-44 h-52 rounded-xl bg-surface/50 border border-surface-border animate-pulse shrink-0"
                />
              ))}
            </div>
          ) : popularError ? (
            <div className="p-5 rounded-2xl bg-vibe-rose/10 border border-vibe-rose/25 text-center my-2">
              <AlertCircle className="w-6 h-6 text-vibe-rose mx-auto mb-2" />
              <h3 className="text-xs font-semibold text-content-primary">Catalogue Notice</h3>
              <p className="text-[11px] text-rose-300 mt-1 max-w-sm mx-auto">
                {popularError}
              </p>
              <Button
                variant="secondary"
                size="sm"
                onClick={loadTrendingTracks}
                leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                className="mt-3 text-xs"
              >
                Retry Trending
              </Button>
            </div>
          ) : (
            <div className="w-full max-w-full flex gap-3.5 overflow-x-auto pb-2 no-scrollbar scroll-smooth">
              {popularTracks.map((track, idx) => {
                const isActive = currentTrack?.id === track.id;
                return (
                  <TrackArtworkCard
                    key={track.id}
                    track={track}
                    isActive={isActive}
                    isPlaying={isActive && isPlaying}
                    badge={idx < 3 ? `#${idx + 1} TRENDING` : undefined}
                    onPlay={() => setQueue(popularTracks, idx)}
                  />
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* 6. GENUINELY DISTINCT DISCOVERY: MADE FOR YOU / CURATED VIBE PICKS */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-3 px-0.5">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-content-primary tracking-tight">
                {isAuthenticated && !activeGenreQuery
                  ? activeMood
                    ? `Curated for ${activeMood}`
                    : 'Made for You'
                  : activeGenreQuery
                  ? `Discover: ${activeGenreQuery}`
                  : activeMood
                  ? `Vibe Discovery: ${activeMood}`
                  : 'Curated Soundscapes'}
              </h2>
              {isAuthenticated && !activeGenreQuery && (
                <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-brand-500/15 text-brand-400 border border-brand-500/25">
                  Personalized
                </span>
              )}
            </div>
            <p className="text-xs text-content-secondary mt-0.5">
              {isAuthenticated && !activeGenreQuery
                ? 'Unique algorithmic matches based on your acoustic taste'
                : 'Independent creators and soundscapes beyond the mainstream charts'}
            </p>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(isAuthenticated ? '/recommendations' : '/discover')}
            rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
            className="text-xs text-content-secondary hover:text-content-primary"
          >
            Explore
          </Button>
        </div>

        {/* Loading State */}
        {recLoading ? (
          <div className="w-full max-w-full flex gap-3 overflow-x-auto pb-2 no-scrollbar">
            {[1, 2, 3, 4, 5].map((n) => (
              <div
                key={n}
                className="w-36 sm:w-40 md:w-44 h-52 rounded-xl bg-surface/50 border border-surface-border animate-pulse shrink-0"
              />
            ))}
          </div>
        ) : recError ? (
          <div className="p-5 rounded-2xl bg-vibe-rose/10 border border-vibe-rose/25 text-center my-2">
            <AlertCircle className="w-6 h-6 text-vibe-rose mx-auto mb-2" />
            <h3 className="text-xs font-semibold text-content-primary">Catalogue Notice</h3>
            <p className="text-[11px] text-rose-300 mt-1 max-w-sm mx-auto">
              {recError}
            </p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => loadDiscoveryTracks(activeMood, activeGenreQuery)}
              leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
              className="mt-3 text-xs"
            >
              Retry
            </Button>
          </div>
        ) : recommendations.length > 0 ? (
          <div className="w-full max-w-full flex gap-3.5 overflow-x-auto pb-2 no-scrollbar scroll-smooth">
            {recommendations.map((rec, index) => {
              const isActive = currentTrack?.id === rec.song.id;
              const handleRecPlay = () => {
                const recSongs = recommendations.map((r) => r.song);
                setQueue(recSongs, index, {
                  recommendationRequestId: recRequestId || undefined,
                  recommendationStrategy: activeStrategy,
                  recommendationPosition: index + 1,
                });
              };
              return (
                <RecommendationCard
                  key={rec.song.id}
                  recItem={rec}
                  isActive={isActive}
                  isPlaying={isActive && isPlaying}
                  onPlay={handleRecPlay}
                  onClick={handleRecPlay}
                />
              );
            })}

            {/* Guest Sign-In Invitation Card at End of Tray */}
            {!isAuthenticated && (
              <div
                onClick={() => navigate('/signup')}
                className="w-36 sm:w-40 md:w-44 shrink-0 rounded-xl p-3 bg-gradient-to-br from-surface-secondary to-surface border border-brand-500/25 flex flex-col items-center justify-center text-center cursor-pointer hover:border-brand-500/50 transition-colors select-none group"
              >
                <div className="w-10 h-10 rounded-full bg-brand-500/15 border border-brand-500/30 text-brand-400 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h3 className="text-xs font-bold text-content-primary">Tailor Your Taste</h3>
                <p className="text-[10px] text-content-secondary mt-1 leading-tight">
                  Sign in to get algorithmic recommendations that evolve with you.
                </p>
                <span className="text-[11px] font-semibold text-brand-400 mt-2.5 group-hover:underline">
                  Get Started →
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="p-5 rounded-2xl bg-surface/50 border border-surface-border text-center my-2">
            <Music className="w-6 h-6 text-brand-400 mx-auto mb-2" />
            <h3 className="text-xs font-semibold text-content-primary">No Tracks Found for this Filter</h3>
            <p className="text-[11px] text-content-secondary mt-1">
              Try picking another vibe or reset filters to browse all sounds.
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearMood}
              className="mt-2 text-xs text-brand-300"
            >
              Reset Filters
            </Button>
          </div>
        )}
      </section>

      {/* 7. RECENTLY PLAYED (AUTHENTICATED LISTENERS WITH HISTORY) */}
      {isAuthenticated && recentHistory.length > 0 && (
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3 px-0.5">
            <div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-brand-400" />
                <h2 className="text-base sm:text-lg font-bold text-content-primary tracking-tight">
                  Recently Played
                </h2>
              </div>
              <p className="text-xs text-content-secondary mt-0.5">
                Pick up where you left off
              </p>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/library?tab=history')}
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              className="text-xs text-content-secondary hover:text-content-primary"
            >
              History
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {recentHistory.slice(0, 6).map((item, idx) => {
              const isActive = currentTrack?.id === item.song.id;
              return (
                <SongCard
                  key={`${item.song.id}-${idx}`}
                  track={item.song}
                  isActive={isActive}
                  isPlaying={isActive && isPlaying}
                  onPlay={() => {
                    const tracks = recentHistory.map((h) => h.song);
                    setQueue(tracks, idx);
                  }}
                />
              );
            })}
          </div>
        </section>
      )}
    </PageContainer>
  );
};

export default HomePage;
