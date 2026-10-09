import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
  Play,
  RotateCcw,
  Compass,
  Zap,
  Users,
  TrendingUp,
  BrainCircuit,
  Info,
} from 'lucide-react';
import { PageContainer } from '../components/layout/PageContainer.js';
import { Card } from '../components/ui/Card.js';
import { Badge } from '../components/ui/Badge.js';
import { Button } from '../components/ui/Button.js';
import { MoodSelector } from '../components/recommendation/MoodSelector.js';
import { RecommendationCard } from '../components/recommendation/RecommendationCard.js';
import { useAudioPlayer } from '../contexts/AudioPlayerContext.js';
import { recommendationService } from '../services/recommendationService.js';
import { analyticsService } from '../services/analyticsService.js';
import { RecommendationItemDto } from '../types/index.js';

interface StrategyOption {
  id: string;
  name: string;
  code: string;
  icon: React.ElementType;
  description: string;
}

const STRATEGIES: StrategyOption[] = [
  {
    id: 'hybrid',
    name: 'Hybrid AI',
    code: 'R4',
    icon: Sparkles,
    description: 'Blends content features, collaborative signals, and current listening context',
  },
  {
    id: 'collaborativeHybrid',
    name: 'Full Collab Hybrid',
    code: 'R5',
    icon: BrainCircuit,
    description: 'Matrix factorization SVD blended with multi-factor acoustic profile matching',
  },
  {
    id: 'context',
    name: 'Mood & Context',
    code: 'R3',
    icon: Zap,
    description: 'Real-time situational matching using valence, energy, and session vibe',
  },
  {
    id: 'content',
    name: 'Acoustic Similarity',
    code: 'R1',
    icon: Compass,
    description: 'Direct acoustic attribute cosine similarity and genre affinity modeling',
  },
  {
    id: 'collaborative',
    name: 'Co-Listening',
    code: 'R2',
    icon: Users,
    description: 'User-user item collaborative filtering derived from community listening history',
  },
  {
    id: 'popularity',
    name: 'Popularity Baseline',
    code: 'R0',
    icon: TrendingUp,
    description: 'Catalog-wide trending momentum and listener engagement benchmark',
  },
];

const MOOD_STORAGE_KEY = 'tunesense_active_mood';

export const RecommendationsPage: React.FC = () => {
  const { setQueue, currentTrack, isPlaying } = useAudioPlayer();

  const [activeStrategy, setActiveStrategy] = useState<string>('hybrid');
  const [activeMood, setActiveMood] = useState<string | null>(() => {
    return sessionStorage.getItem(MOOD_STORAGE_KEY) || null;
  });
  const [recommendations, setRecommendations] = useState<RecommendationItemDto[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [recRequestId, setRecRequestId] = useState<string | null>(null);

  const fetchRecommendations = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await recommendationService.getRecommendations(
        15,
        activeStrategy,
        activeMood || undefined
      );

      setRecommendations(res.recommendations || []);
      setRecRequestId(res.recommendationRequestId || null);

      // Record recommendation impressions in analytics
      if (res.recommendationRequestId && res.recommendations && res.recommendations.length > 0) {
        const impressionItems = res.recommendations.map((rec, idx) => ({
          songId: rec.song.id,
          strategy: res.strategy,
          recommendationScore: rec.score,
          position: idx + 1,
          mood: activeMood || undefined,
          recommendationRequestId: res.recommendationRequestId!,
        }));
        analyticsService.recordImpressions(impressionItems).catch((err) => {
          console.warn('[RecommendationsPage] Non-blocking impression error:', err);
        });
      }
    } catch (err: any) {
      console.error('[RecommendationsPage] Fetch error:', err);
      const msg = err.message || 'Failed to generate recommendations. Please try another strategy.';
      setError(msg);
      setRecommendations([]);
    } finally {
      setIsLoading(false);
    }
  }, [activeStrategy, activeMood]);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  const handleSelectMood = (moodId: string) => {
    const next = activeMood === moodId ? null : moodId;
    setActiveMood(next);
    if (next) {
      sessionStorage.setItem(MOOD_STORAGE_KEY, next);
    } else {
      sessionStorage.removeItem(MOOD_STORAGE_KEY);
    }
  };

  const handleClearMood = () => {
    setActiveMood(null);
    sessionStorage.removeItem(MOOD_STORAGE_KEY);
  };

  const handlePlayAll = () => {
    if (recommendations.length === 0) return;
    const tracks = recommendations.map((r) => r.song);
    setQueue(tracks, 0, {
      recommendationRequestId: recRequestId || undefined,
      recommendationStrategy: activeStrategy,
      recommendationPosition: 1,
    });
  };

  const currentStrategyObj = STRATEGIES.find((s) => s.id === activeStrategy) || STRATEGIES[0];

  return (
    <PageContainer>
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Badge variant="brand" size="sm">
                <Sparkles className="w-3 h-3 mr-1" />
                Explainable AI Engine
              </Badge>
              <Badge variant="neutral" size="sm" className="font-mono text-[10px]">
                {currentStrategyObj.code}
              </Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-content-primary tracking-tight">
              Recommendation Lab
            </h1>
            <p className="text-xs sm:text-sm text-content-secondary mt-1 max-w-xl">
              Inspect TuneSense's transparent recommendation strategies (R0–R5) with explainability badges and acoustic scoring.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
            <Button
              variant="secondary"
              size="sm"
              onClick={fetchRecommendations}
              disabled={isLoading}
              leftIcon={<RotateCcw className={isLoading ? 'w-3.5 h-3.5 animate-spin' : 'w-3.5 h-3.5'} />}
              className="text-xs"
            >
              Regenerate
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handlePlayAll}
              disabled={isLoading || recommendations.length === 0}
              leftIcon={<Play className="w-3.5 h-3.5 fill-current" />}
              className="text-xs shadow-glow"
            >
              Play All ({recommendations.length})
            </Button>
          </div>
        </div>
      </div>

      {/* Strategy Selector Pills */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2 px-0.5">
          <span className="text-xs font-semibold text-content-muted uppercase tracking-wider">
            Recommendation Strategy
          </span>
          <span className="text-[11px] text-content-muted">
            Algorithm: <strong className="text-brand-300 font-mono">{activeStrategy}</strong>
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {STRATEGIES.map((strat) => {
            const Icon = strat.icon;
            const isSelected = activeStrategy === strat.id;
            return (
              <button
                key={strat.id}
                onClick={() => setActiveStrategy(strat.id)}
                className={`p-3 rounded-xl border text-left transition-all duration-150 flex flex-col justify-between group ${
                  isSelected
                    ? 'bg-brand-500/15 border-brand-500/40 text-brand-300 shadow-sm'
                    : 'bg-surface/60 hover:bg-surface border-surface-border/80 text-content-secondary hover:text-content-primary'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1.5">
                  <Icon
                    className={`w-4 h-4 ${
                      isSelected ? 'text-brand-400' : 'text-content-muted group-hover:text-content-secondary'
                    }`}
                  />
                  <span
                    className={`text-[10px] font-mono px-1 rounded ${
                      isSelected ? 'bg-brand-500/30 text-brand-200' : 'bg-surface text-content-muted'
                    }`}
                  >
                    {strat.code}
                  </span>
                </div>
                <div>
                  <p className="text-xs font-semibold truncate leading-tight">{strat.name}</p>
                  <p className="text-[10px] text-content-muted line-clamp-1 mt-0.5">
                    {strat.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Mood Selector Filter */}
      <div className="mb-6">
        <MoodSelector
          activeMood={activeMood}
          onSelectMood={handleSelectMood}
          onClearMood={handleClearMood}
        />
      </div>

      {/* Explanation Banner */}
      <Card className="mb-6 p-3.5 bg-surface/50 border-surface-border flex items-start gap-3">
        <Info className="w-4 h-4 text-brand-400 shrink-0 mt-0.5" />
        <div className="text-xs text-content-secondary leading-relaxed">
          <strong className="text-content-primary font-semibold">{currentStrategyObj.name} ({currentStrategyObj.code}): </strong>
          {currentStrategyObj.description}. Every card below highlights exactly why each song was selected for your session.
        </div>
      </Card>

      {/* Recommendations Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
          {Array.from({ length: 10 }).map((_, idx) => (
            <div
              key={idx}
              className="h-64 rounded-card bg-surface/50 border border-surface-border animate-pulse"
            />
          ))}
        </div>
      ) : error ? (
        <Card className="p-8 text-center bg-surface/40 border-surface-border">
          <div className="w-12 h-12 rounded-full bg-vibe-rose/10 border border-vibe-rose/20 text-vibe-rose flex items-center justify-center mx-auto mb-3">
            <Zap className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-content-primary mb-1">Recommendation Generation Notice</h3>
          <p className="text-xs text-content-secondary max-w-md mx-auto mb-4">{error}</p>
          <Button variant="secondary" size="sm" onClick={fetchRecommendations}>
            Try Again
          </Button>
        </Card>
      ) : recommendations.length === 0 ? (
        <Card className="p-8 text-center bg-surface/40 border-surface-border">
          <div className="w-12 h-12 rounded-full bg-surface border border-surface-border text-brand-400 flex items-center justify-center mx-auto mb-3">
            <Sparkles className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-content-primary mb-1">No Recommendations Found</h3>
          <p className="text-xs text-content-secondary max-w-md mx-auto mb-4">
            Try switching to another strategy (like Hybrid AI or Popularity) or selecting a different listening mood.
          </p>
          <Button variant="secondary" size="sm" onClick={() => setActiveStrategy('hybrid')}>
            Switch to Hybrid AI
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
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
                key={`${rec.song.id}-${index}`}
                recItem={rec}
                isActive={isActive}
                isPlaying={isActive && isPlaying}
                onPlay={handleRecPlay}
                onClick={handleRecPlay}
                className="w-full min-w-0 max-w-none"
              />
            );
          })}
        </div>
      )}
    </PageContainer>
  );
};

export default RecommendationsPage;
