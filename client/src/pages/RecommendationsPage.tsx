import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
  Play,
  RotateCcw,
  Compass,
  Zap,
  Users,
  TrendingUp,
  Info,
  Activity,
} from 'lucide-react';
import { PageContainer } from '../components/layout/PageContainer.js';
import { Badge } from '../components/ui/Badge.js';
import { Button } from '../components/ui/Button.js';
import { MoodSelector } from '../components/recommendation/MoodSelector.js';
import { RecommendationCard } from '../components/recommendation/RecommendationCard.js';
import { SongCard } from '../components/music/SongCard.js';
import { useAudioPlayer } from '../contexts/AudioPlayerContext.js';
import { recommendationService } from '../services/recommendationService.js';
import { analyticsService } from '../services/analyticsService.js';
import { RecommendationItemDto, RecordImpressionItem } from '../types/index.js';
import { cn } from '../utils/cn.js';

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
    name: 'Hybrid personalization',
    code: 'R4',
    icon: Sparkles,
    description: 'Blends content features, collaborative signals, and current listening context',
  },
  {
    id: 'collaborative',
    name: 'Collaborative personalization',
    code: 'R5',
    icon: Users,
    description: 'Cosine similarity over sparse user interaction matrices blended with acoustic matching',
  },
  {
    id: 'context',
    name: 'Context-aware',
    code: 'R3',
    icon: Zap,
    description: 'Real-time situational matching across time of day and day of week patterns',
  },
  {
    id: 'behaviour',
    name: 'Behavioral personalization',
    code: 'R2',
    icon: Activity,
    description: 'Emphasizes recent completion rates, repeat listening habits, and emerging trends',
  },
  {
    id: 'content',
    name: 'Acoustic similarity',
    code: 'R1',
    icon: Compass,
    description: 'Direct acoustic attribute cosine similarity and genre affinity modeling',
  },
  {
    id: 'popularity',
    name: 'Popularity baseline',
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
    return sessionStorage.getItem(MOOD_STORAGE_KEY);
  });
  const [recommendations, setRecommendations] = useState<RecommendationItemDto[]>([]);
  const [recRequestId, setRecRequestId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecommendations = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await recommendationService.getRecommendations(
        12,
        activeStrategy,
        activeMood || undefined
      );

      setRecommendations(res.recommendations || []);
      setRecRequestId(res.recommendationRequestId || null);

      if (res.recommendationRequestId && res.recommendations && res.recommendations.length > 0) {
        const impressionItems: RecordImpressionItem[] = res.recommendations.map((r, idx) => ({
          songId: r.song.id,
          strategy: activeStrategy,
          recommendationScore: r.score,
          position: idx + 1,
          mood: activeMood || undefined,
          recommendationRequestId: res.recommendationRequestId!,
        }));
        analyticsService.recordImpressions(impressionItems).catch(() => {});
      }
    } catch (err) {
      console.error('[RecommendationsPage] Error fetching recommendations:', err);
      setRecommendations([]);
      setRecRequestId(null);
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to generate personalized recommendations. Please try again.'
      );
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

  const featuredRec = recommendations[0];
  const listRecs = recommendations.slice(1);

  return (
    <PageContainer>
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="ultramarine" size="sm">
                <Sparkles className="w-3 h-3 mr-1" />
                Explainable recommendations
              </Badge>
              <Badge variant="neutral" size="sm" className="font-mono">
                {currentStrategyObj.code}
              </Badge>
            </div>
            <h1 className="font-display text-scale-28 sm:text-scale-44 font-bold text-ink tracking-tight">
              Recommendation lab
            </h1>
            <p className="text-scale-16 text-ink/65 mt-1 max-w-xl">
              Inspect transparent recommendation models (R0 to R5) with score dimension breakdowns and explainability signals.
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-center shrink-0">
            <Button
              variant="secondary"
              size="sm"
              onClick={fetchRecommendations}
              disabled={isLoading}
              leftIcon={<RotateCcw className={isLoading ? 'w-3.5 h-3.5 animate-spin' : 'w-3.5 h-3.5'} />}
            >
              Regenerate
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handlePlayAll}
              disabled={isLoading || recommendations.length === 0}
              leftIcon={<Play className="w-3.5 h-3.5 fill-current" />}
            >
              Play all ({recommendations.length})
            </Button>
          </div>
        </div>
      </div>

      {/* Strategy Selector Pills */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2.5 px-0.5">
          <span className="text-xs font-semibold text-ink/70">
            Recommendation strategy
          </span>
          <span className="text-xs text-ink/50">
            Active: <strong className="text-ultramarine font-semibold">{currentStrategyObj.name}</strong>
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {STRATEGIES.map((strat) => {
            const Icon = strat.icon;
            const isSelected = activeStrategy === strat.id;
            return (
              <button
                key={strat.id}
                onClick={() => setActiveStrategy(strat.id)}
                className={cn(
                  'p-3.5 rounded-[20px] border text-left transition-all duration-200 flex flex-col justify-between group shadow-subtle select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-ultramarine',
                  isSelected
                    ? 'bg-white dark:bg-slate-800 text-ink dark:text-white border-ultramarine/40 shadow-pill ring-1 ring-ultramarine/30'
                    : 'bg-white/70 dark:bg-slate-900/70 hover:bg-white dark:hover:bg-slate-800 border-white/60 dark:border-white/10 text-ink/75 dark:text-slate-300 hover:text-ink dark:hover:text-white'
                )}
              >
                <div className="flex items-center justify-between w-full mb-2">
                  <div className={cn('w-7 h-7 rounded-full flex items-center justify-center text-xs', isSelected ? 'bg-ultramarine text-white' : 'bg-black/5 dark:bg-white/10 text-ink/70 dark:text-slate-300')}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[11px] font-mono font-semibold px-1.5 py-0.5 rounded-[10px] bg-black/5 dark:bg-white/10 text-ink/60 dark:text-slate-400">
                    {strat.code}
                  </span>
                </div>
                <div>
                  <p className="text-scale-14 font-semibold text-ink dark:text-slate-100 truncate leading-tight">{strat.name}</p>
                  <p className="text-xs text-ink/50 dark:text-slate-400 line-clamp-2 mt-1 leading-snug">
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

      {/* Strategy Explanation Notice */}
      <div className="mb-8 p-4 rounded-[28px] bg-white/70 dark:bg-slate-900/75 backdrop-blur-xl border border-white/60 dark:border-white/10 shadow-panel flex items-start gap-3 text-ink dark:text-slate-100">
        <Info className="w-4 h-4 text-ultramarine shrink-0 mt-0.5" />
        <div className="text-xs text-ink/75 dark:text-slate-300 leading-relaxed">
          <strong className="text-ink dark:text-white font-semibold">{currentStrategyObj.name} ({currentStrategyObj.code}): </strong>
          {currentStrategyObj.description}. Use the drawer trigger on each card to inspect exact mathematical component weights.
        </div>
      </div>

      {/* Recommendations Content */}
      {isLoading ? (
        <div className="space-y-4">
          <div className="flex flex-col gap-3">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                className="h-16 rounded-[20px] bg-white/50 border border-white/60 animate-pulse"
              />
            ))}
          </div>
          <p className="text-center text-xs text-ink/50 font-medium pt-2">
            Scoring candidates via {currentStrategyObj.name} ({currentStrategyObj.code})...
          </p>
        </div>
      ) : error ? (
        <div className="p-8 rounded-[28px] text-center bg-white/75 backdrop-blur-xl border border-white/70 shadow-panel">
          <div className="w-12 h-12 rounded-full bg-tangerine/10 text-tangerine flex items-center justify-center mx-auto mb-3">
            <Zap className="w-6 h-6" />
          </div>
          <h3 className="font-display text-scale-16 font-bold text-ink mb-1">
            Recommendation notice
          </h3>
          <p className="text-xs text-ink/65 max-w-md mx-auto mb-4">{error}</p>
          <Button variant="secondary" size="sm" onClick={fetchRecommendations}>
            Try again
          </Button>
        </div>
      ) : recommendations.length === 0 ? (
        <div className="p-8 rounded-[28px] text-center bg-white/75 backdrop-blur-xl border border-white/70 shadow-panel">
          <div className="w-12 h-12 rounded-full bg-ultramarine/10 text-ultramarine flex items-center justify-center mx-auto mb-3">
            <Sparkles className="w-6 h-6" />
          </div>
          <h3 className="font-display text-scale-16 font-bold text-ink mb-1">
            No recommendations found
          </h3>
          <p className="text-xs text-ink/65 max-w-md mx-auto mb-4">
            Try switching to another strategy (like Hybrid Personalization) or selecting a different listening mood.
          </p>
          <Button variant="secondary" size="sm" onClick={() => setActiveStrategy('hybrid')}>
            Switch to hybrid personalization
          </Button>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Featured Top Recommendation (Large Card with edge-to-edge artwork) */}
          {featuredRec && (
            <div>
              <div className="flex items-center justify-between mb-3 px-0.5">
                <span className="text-xs font-semibold text-ink/60">
                  Top algorithmic match
                </span>
                <span className="text-xs font-semibold text-ultramarine">
                  Rank #1
                </span>
              </div>
              <div className="max-w-md">
                <RecommendationCard
                  recItem={featuredRec}
                  isActive={currentTrack?.id === featuredRec.song.id}
                  isPlaying={currentTrack?.id === featuredRec.song.id && isPlaying}
                  onPlay={() => {
                    const recSongs = recommendations.map((r) => r.song);
                    setQueue(recSongs, 0, {
                      recommendationRequestId: recRequestId || undefined,
                      recommendationStrategy: activeStrategy,
                      recommendationPosition: 1,
                    });
                  }}
                  className="w-full"
                />
              </div>
            </div>
          )}

          {/* Subsequent Recommendations: Song List as Elegant Rows */}
          {listRecs.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3 px-0.5">
                <span className="text-xs font-semibold text-ink/60">
                  Subsequent recommendations
                </span>
                <span className="text-xs text-ink/50">
                  {listRecs.length} tracks
                </span>
              </div>
              <div className="flex flex-col gap-2.5">
                {listRecs.map((rec, index) => {
                  const actualIndex = index + 1;
                  const isActive = currentTrack?.id === rec.song.id;
                  const handleRecPlay = () => {
                    const recSongs = recommendations.map((r) => r.song);
                    setQueue(recSongs, actualIndex, {
                      recommendationRequestId: recRequestId || undefined,
                      recommendationStrategy: activeStrategy,
                      recommendationPosition: actualIndex + 1,
                    });
                  };

                  return (
                    <SongCard
                      key={`${rec.song.id}-${actualIndex}`}
                      track={rec.song}
                      reason={rec.reason}
                      isActive={isActive}
                      isPlaying={isActive && isPlaying}
                      onPlay={handleRecPlay}
                      onClick={handleRecPlay}
                      variant="row"
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </PageContainer>
  );
};

export default RecommendationsPage;
