import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, ArrowRight, SlidersHorizontal } from 'lucide-react';
import { PageContainer } from '../components/layout/PageContainer.js';

import { Badge } from '../components/ui/Badge.js';
import { Card } from '../components/ui/Card.js';
import { Button } from '../components/ui/Button.js';
import { Input } from '../components/ui/Input.js';
import { SongCard } from '../components/music/SongCard.js';
import { RecommendationSection } from '../components/recommendation/RecommendationSection.js';
import { RecommendationCard } from '../components/recommendation/RecommendationCard.js';
import { MoodSelector } from '../components/recommendation/MoodSelector.js';
import { useHealthCheck } from '../hooks/useHealthCheck.js';
import { useAuth } from '../contexts/AuthContext.js';
import { useAudioPlayer } from '../contexts/AudioPlayerContext.js';
import { recommendationService } from '../services/recommendationService.js';
import { analyticsService } from '../services/analyticsService.js';
import { fetchPopularTracks } from '../services/musicService.js';
import { RecommendationItemDto } from '../types/index.js';
import {
  MOCK_RECENT_TRACKS,
  MOCK_VIBE_CHIPS,
} from '../constants/fixtures.js';

const MOOD_STORAGE_KEY = 'tunesense_active_mood';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { health, loading: healthLoading, error: healthError } = useHealthCheck();
  const { isAuthenticated, user } = useAuth();
  const { playTrack, currentTrack, isPlaying } = useAudioPlayer();

  const [recommendations, setRecommendations] = useState<RecommendationItemDto[]>([]);
  const [recLoading, setRecLoading] = useState<boolean>(true);
  const [activeStrategy, setActiveStrategy] = useState<string>('hybrid');
  const [recRequestId, setRecRequestId] = useState<string | null>(null);
  const [activeMood, setActiveMood] = useState<string | null>(() => {
    return sessionStorage.getItem(MOOD_STORAGE_KEY) || null;
  });

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
        console.warn('[HomePage] Personalized recommendation failed, falling back to popular:', err);
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
      // Guest user: catalogue popular tracks only (non-personalized)
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

  useEffect(() => {
    loadRecommendations(activeMood);
  }, [isAuthenticated, activeMood, loadRecommendations]);

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
      {/* Top Banner: Stage 8 Status & Health */}
      <Card className="mb-5 bg-gradient-to-br from-surface to-bg-elevated border-brand-500/20 shadow-glow">
        <div className="flex items-center justify-between mb-2">
          <Badge variant="brand" size="sm">
            Stage 8 • Mood-Aware Personalization
          </Badge>
          <div className="flex items-center gap-1.5 text-xs">
            {healthLoading ? (
              <span className="flex items-center gap-1 text-content-muted">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                Checking API...
              </span>
            ) : healthError ? (
              <span className="flex items-center gap-1 text-vibe-rose">
                <span className="w-2 h-2 rounded-full bg-vibe-rose" />
                API Offline ({healthError})
              </span>
            ) : (
              <span className="flex items-center gap-1 text-vibe-emerald font-medium">
                <span className="w-2 h-2 rounded-full bg-vibe-emerald" />
                {health?.service} active
              </span>
            )}
          </div>
        </div>

        <h2 className="text-base font-bold text-content-primary">
          {isAuthenticated ? `Welcome back, ${user?.name || 'Listener'}` : 'TuneSense Music Discovery'}
        </h2>

        <p className="text-xs text-content-secondary mt-1">
          {isAuthenticated
            ? `Dynamic hybrid recommendation active (${activeStrategy})${activeMood ? ` • Mood: ${activeMood}` : ''}. Explicit taste & acoustic vibe scoring.`
            : 'Explore catalogue popularity and independent music. Sign in to unlock personalized taste intelligence.'}
        </p>

        {isAuthenticated && (
          <div className="mt-3 pt-3 border-t border-surface-border/60 flex items-center justify-between">
            <span className="text-[11px] text-content-muted">Customize preferences & exploration level</span>
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
          placeholder="Search songs, artists, vibes..."
          onClick={() => navigate('/search')}
          readOnly
        />
      </div>

      {/* Mood Selector (Stage 8) - Active for authenticated listeners */}
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
              : 'Personalized hybrid discovery with explainable recommendations'
            : 'Popular independent tracks from the catalogue'
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
                playTrack(rec.song, {
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

      {/* Quick Recents / Listening Foundation */}
      <div className="mt-4 mb-6">
        <div className="flex items-center justify-between mb-3 px-0.5">
          <h3 className="text-base font-bold text-content-primary">Recent Discovery</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/library')}
            rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
          >
            See all
          </Button>
        </div>

        <div className="flex flex-col gap-2">
          {MOCK_RECENT_TRACKS.map((track) => (
            <SongCard
              key={track.id}
              track={track}
              onClick={() => navigate(`/song/${track.id}`)}
              onOptionsClick={() => {}}
            />
          ))}
        </div>
      </div>

      {/* Architectural Guarantee Notice */}
      <div className="mt-6 p-3.5 rounded-card bg-surface/40 border border-surface-border text-center">
        <div className="flex items-center justify-center gap-1.5 text-brand-400 mb-1">
          <ShieldCheck className="w-4 h-4" />
          <span className="text-xs font-semibold uppercase tracking-wider">Explainable AI Architecture</span>
        </div>
        <p className="text-[11px] text-content-muted leading-relaxed">
          Stage 7 Recommendation Engine: R0 (Popularity) → R1 (Content) → R2 (Behaviour) → R3 (Context) → R4 (Hybrid).
        </p>
      </div>
    </PageContainer>
  );
};
