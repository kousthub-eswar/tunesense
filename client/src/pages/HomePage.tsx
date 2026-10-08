import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  ArrowRight,
  SlidersHorizontal,
  Clock,
  TrendingUp,
  LogIn,
} from 'lucide-react';
import { PageContainer } from '../components/layout/PageContainer.js';
import { Badge } from '../components/ui/Badge.js';
import { Card } from '../components/ui/Card.js';
import { Button } from '../components/ui/Button.js';
import { Input } from '../components/ui/Input.js';
import { SongCard } from '../components/music/SongCard.js';
import { RecommendationSection } from '../components/recommendation/RecommendationSection.js';
import { RecommendationCard } from '../components/recommendation/RecommendationCard.js';
import { MoodSelector } from '../components/recommendation/MoodSelector.js';
import { useAuth } from '../contexts/AuthContext.js';
import { useAudioPlayer } from '../contexts/AudioPlayerContext.js';
import { recommendationService } from '../services/recommendationService.js';
import { analyticsService } from '../services/analyticsService.js';
import { libraryService } from '../services/libraryService.js';
import { fetchPopularTracks } from '../services/musicService.js';
import { RecommendationItemDto, TrackItem, HistoryItem } from '../types/index.js';
import { MOCK_VIBE_CHIPS } from '../constants/fixtures.js';

const MOOD_STORAGE_KEY = 'tunesense_active_mood';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const { setQueue, currentTrack, isPlaying } = useAudioPlayer();

  const [recommendations, setRecommendations] = useState<RecommendationItemDto[]>([]);
  const [recLoading, setRecLoading] = useState<boolean>(true);
  const [activeStrategy, setActiveStrategy] = useState<string>('hybrid');
  const [recRequestId, setRecRequestId] = useState<string | null>(null);
  const [activeMood, setActiveMood] = useState<string | null>(() => {
    return sessionStorage.getItem(MOOD_STORAGE_KEY) || null;
  });

  // Real recent history and popular tracks
  const [recentHistory, setRecentHistory] = useState<HistoryItem[]>([]);
  const [popularTracks, setPopularTracks] = useState<TrackItem[]>([]);

  // Dynamic greeting based on time of day
  const getGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Good morning';
    if (hour >= 12 && hour < 17) return 'Good afternoon';
    if (hour >= 17 && hour < 22) return 'Good evening';
    return 'Good night';
  };

  const firstName = user?.name ? user.name.split(' ')[0] : 'Listener';

  const loadRecommendations = useCallback(async (mood?: string | null) => {
    setRecLoading(true);

    if (isAuthenticated) {
      try {
        const res = await recommendationService.getRecommendations(10, 'hybrid', mood || undefined);
        setRecommendations(res.recommendations);
        setActiveStrategy(res.strategy);
        setRecRequestId(res.recommendationRequestId || null);

        // Record recommendation impressions in background
        if (res.recommendationRequestId && res.recommendations.length > 0) {
          const impressionItems = res.recommendations.map((rec, idx) => ({
            songId: rec.song.id,
            strategy: res.strategy,
            recommendationScore: rec.score,
            position: idx + 1,
            mood: mood || undefined,
            recommendationRequestId: res.recommendationRequestId!,
          }));
          analyticsService.recordImpressions(impressionItems).catch((impErr) => {
            console.warn('[HomePage] Impression logging non-blocking error:', impErr);
          });
        }
      } catch (err) {
        console.warn('[HomePage] Personalized recommendation fallback:', err);
        try {
          const pop = await fetchPopularTracks(10);
          setRecommendations(
            pop.tracks.map((t) => ({
              song: t,
              score: 0.85,
              reason: 'Popular across TuneSense listeners',
              reasonType: 'popularity' as const,
            }))
          );
          setActiveStrategy('popularity');
          setRecRequestId(null);
        } catch {
          setRecommendations([]);
          setRecRequestId(null);
        }
      } finally {
        setRecLoading(false);
      }
    } else {
      // Guest user: catalogue popular tracks
      try {
        const pop = await fetchPopularTracks(10);
        setRecommendations(
          pop.tracks.map((t) => ({
            song: t,
            score: 0.85,
            reason: 'Popular across TuneSense listeners',
            reasonType: 'popularity' as const,
          }))
        );
        setActiveStrategy('popularity');
        setRecRequestId(null);
      } catch (err) {
        console.warn('[HomePage] Could not fetch popular tracks for guest:', err);
        setRecommendations([]);
        setRecRequestId(null);
      } finally {
        setRecLoading(false);
      }
    }
  }, [isAuthenticated]);

  const loadExtraSections = useCallback(async () => {
    try {
      if (isAuthenticated) {
        const history = await libraryService.getHistory(5);
        setRecentHistory(history);
      }
      const pop = await fetchPopularTracks(6);
      setPopularTracks(pop.tracks);
    } catch (err) {
      console.warn('[HomePage] Error loading extra sections:', err);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadRecommendations(activeMood);
    loadExtraSections();
  }, [isAuthenticated, activeMood, loadRecommendations, loadExtraSections]);

  const handleSelectMood = (moodId: string) => {
    const nextMood = activeMood === moodId ? null : moodId;
    setActiveMood(nextMood);
    if (nextMood) {
      sessionStorage.setItem(MOOD_STORAGE_KEY, nextMood);
    } else {
      sessionStorage.removeItem(MOOD_STORAGE_KEY);
    }
  };

  const handleClearMood = () => {
    setActiveMood(null);
    sessionStorage.removeItem(MOOD_STORAGE_KEY);
  };

  return (
    <PageContainer>
      {/* Hero Greeting & Dashboard Header */}
      <Card className="mb-5 bg-gradient-to-br from-surface to-bg-elevated border-brand-500/20 shadow-glow">
        <div className="flex items-center justify-between mb-2">
          <Badge variant="brand" size="sm">
            <Sparkles className="w-3 h-3 mr-1" />
            TuneSense Intelligence
          </Badge>
          {isAuthenticated ? (
            <span className="text-[11px] text-brand-400 font-medium capitalize">
              {activeMood ? `Mood: ${activeMood}` : 'Personalized'}
            </span>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/login')}
              leftIcon={<LogIn className="w-3.5 h-3.5" />}
              className="text-xs text-brand-400 -mr-2"
            >
              Sign In
            </Button>
          )}
        </div>

        <h1 className="text-xl sm:text-2xl font-bold text-content-primary">
          {isAuthenticated ? `${getGreeting()}, ${firstName}` : 'Discover Your Next Favorite Track'}
        </h1>

        <p className="text-xs text-content-secondary mt-1 max-w-lg leading-relaxed">
          {isAuthenticated
            ? `TuneSense adapts to your listening habits, acoustic preferences, and real-time vibe.`
            : 'Explore trending independent music with explainable context and acoustic intelligence.'}
        </p>

        {isAuthenticated && (
          <div className="mt-3 pt-3 border-t border-surface-border/60 flex items-center justify-between">
            <span className="text-[11px] text-content-muted">Fine-tune your acoustic taste & exploration</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/profile')}
              leftIcon={<SlidersHorizontal className="w-3.5 h-3.5 text-brand-400" />}
              className="text-xs text-brand-400 hover:text-brand-300"
            >
              Preferences
            </Button>
          </div>
        )}
      </Card>

      {/* Quick Search Bar */}
      <div className="mb-4">
        <Input
          isSearch
          placeholder="Search songs, artists, genres..."
          onClick={() => navigate('/search')}
          readOnly
        />
      </div>

      {/* Mood Selector (Interactive for authenticated listeners) */}
      {isAuthenticated && (
        <MoodSelector
          activeMood={activeMood}
          onSelectMood={handleSelectMood}
          onClearMood={handleClearMood}
        />
      )}

      {/* Vibe / Mood Chips */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2 px-0.5">
          <span className="text-xs font-semibold text-content-secondary uppercase tracking-wider">
            Explore Vibes
          </span>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {MOCK_VIBE_CHIPS.map((chip) => (
            <Badge
              key={chip.label}
              variant={chip.variant}
              className="cursor-pointer hover:scale-105 transition-transform shrink-0"
              onClick={() => navigate('/discover')}
            >
              {chip.label}
            </Badge>
          ))}
        </div>
      </div>

      {/* Personalized / Popular Recommendation Showcase */}
      <RecommendationSection
        title={isAuthenticated ? 'Made For You' : 'Trending on TuneSense'}
        subtitle={
          isAuthenticated
            ? activeMood
              ? `Because you're feeling ${activeMood} • Explainable hybrid discovery`
              : 'Personalized hybrid recommendations based on your listening'
            : 'Popular independent tracks across the catalogue'
        }
        badge={
          isAuthenticated
            ? activeMood
              ? `${activeMood.toUpperCase()} VIBE`
              : 'Personalized'
            : 'Popular'
        }
      >
        {recLoading ? (
          <div className="flex gap-3 overflow-x-auto pb-3 no-scrollbar -mx-4 px-4">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="min-w-[200px] h-64 rounded-card bg-surface/50 border border-surface-border animate-pulse"
              />
            ))}
          </div>
        ) : recommendations.length > 0 ? (
          <div className="flex gap-3 overflow-x-auto pb-3 no-scrollbar -mx-4 px-4">
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
          </div>
        ) : (
          <div className="p-4 rounded-card bg-surface/40 border border-surface-border text-center text-xs text-content-muted">
            No recommendations currently available.
          </div>
        )}
      </RecommendationSection>

      {/* Recently Played Section (if user has history) */}
      {isAuthenticated && recentHistory.length > 0 && (
        <div className="mt-6 mb-6">
          <div className="flex items-center justify-between mb-3 px-0.5">
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-brand-400" />
              <h3 className="text-base font-bold text-content-primary">Recently Played</h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/library')}
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              className="text-xs text-content-secondary"
            >
              See all
            </Button>
          </div>

          <div className="flex flex-col gap-2">
            {recentHistory.map((item, idx) => {
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
        </div>
      )}

      {/* Popular Catalogue Showcase */}
      {popularTracks.length > 0 && (
        <div className="mt-6 mb-6">
          <div className="flex items-center justify-between mb-3 px-0.5">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-brand-400" />
              <h3 className="text-base font-bold text-content-primary">Top Tracks</h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/discover')}
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              className="text-xs text-content-secondary"
            >
              Explore
            </Button>
          </div>

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
        </div>
      )}
    </PageContainer>
  );
};
