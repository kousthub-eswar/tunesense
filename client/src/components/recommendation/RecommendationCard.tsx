import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Play,
  Pause,
  Heart,
  ListPlus,
  Disc,
  SlidersHorizontal,
  X,
  Sparkles,
  Compass,
  Activity,
  Zap,
  TrendingUp,
  Info,
} from 'lucide-react';
import { RecommendationMetadata, RecommendationItemDto } from '../../types/index.js';
import { useAuth } from '../../contexts/AuthContext.js';
import { libraryService } from '../../services/libraryService.js';
import { PlaylistPickerModal } from '../music/PlaylistPickerModal.js';
import { cn } from '../../utils/cn.js';

export interface RecommendationCardProps {
  item?: RecommendationMetadata;
  recItem?: RecommendationItemDto;
  onPlay?: () => void;
  onClick?: () => void;
  isActive?: boolean;
  isPlaying?: boolean;
  className?: string;
}

export const RecommendationCard: React.FC<RecommendationCardProps> = ({
  item,
  recItem,
  onPlay,
  onClick,
  isActive = false,
  isPlaying = false,
  className,
}) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [isLiked, setIsLiked] = useState<boolean>(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState<boolean>(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

  const song = recItem?.song;
  const title = song ? song.title : item?.title || 'Unknown Title';
  const subtitle = song ? song.artistName : item?.subtitle || 'Unknown Artist';
  const artwork = song ? song.artworkUrl : undefined;
  const reason = recItem ? recItem.reason : item?.reason || 'Recommended for you';
  const components = recItem?.components;
  const overallScore = recItem?.score ?? 0.85;

  // Close drawer on Escape
  useEffect(() => {
    if (!isDrawerOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsDrawerOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDrawerOpen]);

  // Check like state
  useEffect(() => {
    if (song?.id && isAuthenticated) {
      libraryService
        .checkLikes([song.id])
        .then((res) => {
          setIsLiked(Boolean(res[song.id]));
        })
        .catch(() => {});
    }
  }, [song?.id, isAuthenticated]);

  const handleLikeClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!song?.id || !isAuthenticated) return;
    const nextLiked = !isLiked;
    setIsLiked(nextLiked);
    try {
      if (nextLiked) {
        await libraryService.likeSong(song.id);
      } else {
        await libraryService.unlikeSong(song.id);
      }
    } catch {
      setIsLiked(!nextLiked);
    }
  };

  const handlePlaylistClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) return;
    setShowPlaylistModal(true);
  };

  const scoreComponents = [
    {
      key: 'content',
      label: 'Content preference',
      description: 'Acoustic feature similarity and genre match',
      icon: Sparkles,
      color: 'bg-ultramarine',
      value: components?.content ?? 0.82,
    },
    {
      key: 'behaviour',
      label: 'Recent behavior',
      description: 'Alignment with your recent repeat listening sessions',
      icon: Activity,
      color: 'bg-orchid',
      value: components?.behaviour ?? 0.74,
    },
    {
      key: 'context',
      label: 'Contextual fit',
      description: 'Temporal, day-of-week, and session context match',
      icon: Compass,
      color: 'bg-mint',
      value: components?.context ?? 0.68,
    },
    {
      key: 'popularity',
      label: 'Popularity weight',
      description: 'Global streaming density and catalogue velocity',
      icon: TrendingUp,
      color: 'bg-mood-happy',
      value: components?.popularity ?? 0.55,
    },
    {
      key: 'novelty',
      label: 'Novelty & exploration',
      description: 'Discovery bonus for fresh sounds and artists',
      icon: Zap,
      color: 'bg-tangerine',
      value: components?.novelty ?? 0.65,
    },
  ];

  return (
    <>
      <div
        onClick={onClick || onPlay}
        className={cn(
          'group relative flex flex-col p-4 bg-white/75 dark:bg-slate-900/75 hover:bg-white/95 dark:hover:bg-slate-800/95 backdrop-blur-xl border border-white/70 dark:border-white/10 rounded-[28px] shadow-panel transition-all duration-200 cursor-pointer select-none text-ink dark:text-slate-100',
          isActive && 'ring-2 ring-ultramarine ring-offset-2 ring-offset-fog dark:ring-offset-slate-950',
          className
        )}
      >
        {/* Large Album Artwork (20px radius) */}
        <div className="relative aspect-square w-full rounded-[20px] overflow-hidden mb-3.5 shadow-sm bg-black/5">
          {artwork ? (
            <img
              src={artwork}
              alt={title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-black/5 text-ultramarine">
              <Disc className="w-10 h-10 opacity-60" />
            </div>
          )}

          {/* Quick Play Overlay */}
          <div className="absolute inset-0 bg-ink/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-3">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onPlay?.();
              }}
              className="w-12 h-12 rounded-full bg-ultramarine text-white flex items-center justify-center shadow-pill hover:scale-110 active:scale-95 transition-transform"
              aria-label={isActive && isPlaying ? `Pause ${title}` : `Play ${title}`}
            >
              {isActive && isPlaying ? (
                <Pause className="w-5 h-5 fill-white" />
              ) : (
                <Play className="w-5 h-5 fill-white ml-0.5" />
              )}
            </button>
          </div>

          {/* Top Corner Quick Actions */}
          {isAuthenticated && (
            <div
              className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={handleLikeClick}
                className="w-8 h-8 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center text-ink shadow-sm hover:scale-105 transition-transform"
                aria-label={isLiked ? 'Unlike song' : 'Like song'}
              >
                <Heart
                  className={cn(
                    'w-4 h-4 transition-colors',
                    isLiked ? 'text-tangerine fill-tangerine' : 'text-ink/60'
                  )}
                />
              </button>
              <button
                type="button"
                onClick={handlePlaylistClick}
                className="w-8 h-8 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center text-ink shadow-sm hover:scale-105 transition-transform"
                aria-label="Add to playlist"
              >
                <ListPlus className="w-4 h-4 text-ink/60" />
              </button>
            </div>
          )}
        </div>

        {/* Text Details */}
        <div className="min-w-0 flex flex-col flex-1 justify-between">
          <div>
            <h4
              onClick={(e) => {
                if (song?.id) {
                  e.stopPropagation();
                  navigate(`/song/${song.id}`);
                }
              }}
              className={cn(
                'font-display text-scale-16 font-bold line-clamp-2 leading-snug hover:text-ultramarine transition-colors',
                isActive ? 'text-ultramarine' : 'text-ink'
              )}
              title={title}
            >
              {title}
            </h4>
            <p className="text-scale-14 text-ink/60 truncate mt-0.5 font-medium">
              {subtitle}
            </p>
          </div>

          {/* Contextual Reason */}
          {reason && (
            <p className="text-xs text-ink/50 truncate mt-2 font-normal">
              {reason}
            </p>
          )}

          {/* "How this recommendation works" drawer trigger button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsDrawerOpen(true);
            }}
            className="mt-3 flex items-center gap-1.5 text-xs text-ink/65 hover:text-ultramarine font-medium transition-colors group/btn py-1 px-2.5 rounded-full bg-black/5 hover:bg-black/10 w-fit focus:outline-none focus-visible:ring-2 focus-visible:ring-ultramarine"
            title="Inspect score breakdown and components"
          >
            <SlidersHorizontal className="w-3 h-3 text-ultramarine group-hover/btn:scale-110 transition-transform" />
            <span>How this recommendation works</span>
          </button>
        </div>
      </div>

      {/* "How this recommendation works" Drawer Modal */}
      {isDrawerOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="drawer-title"
          className="fixed inset-0 z-50 bg-ink/30 backdrop-blur-sm flex justify-end"
          onClick={() => setIsDrawerOpen(false)}
        >
          <div
            className="w-full max-w-md h-full bg-white/95 dark:bg-slate-950/95 backdrop-blur-2xl border-l border-white/80 dark:border-white/10 shadow-pill p-6 flex flex-col overflow-y-auto text-ink dark:text-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="flex items-start justify-between pb-5 border-b border-black/5 dark:border-white/10">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-14 h-14 rounded-[20px] overflow-hidden shrink-0 shadow-sm border border-black/5 dark:border-white/10 bg-black/5 dark:bg-white/5">
                  {artwork ? (
                    <img src={artwork} alt={title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-ultramarine">
                      <Disc className="w-7 h-7" />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <h3 id="drawer-title" className="font-display font-bold text-scale-16 text-ink dark:text-slate-100 truncate">
                    {title}
                  </h3>
                  <p className="text-scale-14 text-ink/65 dark:text-slate-400 truncate">{subtitle}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="w-2 h-2 rounded-full bg-mint" />
                    <span className="text-xs text-ink/70 dark:text-slate-300 font-semibold">
                      Match confidence: {Math.round(overallScore * 100)}%
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 flex items-center justify-center text-ink/60 dark:text-slate-400 hover:text-ink dark:hover:text-white transition-colors"
                aria-label="Close drawer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Explanation Summary */}
            <div className="mt-5 p-4 rounded-[20px] bg-fog dark:bg-slate-900/80 border border-black/5 dark:border-white/10">
              <div className="flex items-start gap-2.5">
                <Info className="w-4 h-4 text-ultramarine mt-0.5 shrink-0" />
                <div>
                  <h4 className="text-xs font-semibold text-ink dark:text-slate-200">
                    Recommendation reason
                  </h4>
                  <p className="text-xs text-ink/75 dark:text-slate-300 mt-1 leading-relaxed">
                    {reason}
                  </p>
                </div>
              </div>
            </div>

            {/* Score Components Breakdown */}
            <div className="mt-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-display font-bold text-scale-16 text-ink dark:text-slate-100">
                  Scoring dimensions
                </h4>
                <span className="text-xs text-ink/50 dark:text-slate-400">Normalized score</span>
              </div>

              <div className="space-y-4">
                {scoreComponents.map((comp) => {
                  const Icon = comp.icon;
                  const pct = Math.round(comp.value * 100);
                  return (
                    <div
                      key={comp.key}
                      className="p-3.5 rounded-[20px] bg-fog/70 dark:bg-slate-900/60 border border-black/5 dark:border-white/10 flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={cn('w-6 h-6 rounded-full flex items-center justify-center text-white', comp.color)}>
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <span className="text-scale-14 font-semibold text-ink dark:text-slate-200">
                            {comp.label}
                          </span>
                        </div>
                        <span className="text-scale-14 font-bold text-ink dark:text-slate-100 tabular-nums">
                          {pct}%
                        </span>
                      </div>

                      <div className="w-full bg-black/10 dark:bg-white/10 h-2 rounded-full overflow-hidden">
                        <div
                          className={cn('h-full transition-all duration-500 rounded-full', comp.color)}
                          style={{ width: `${pct}%` }}
                        />
                      </div>

                      <p className="text-[11px] text-ink/55 dark:text-slate-400 leading-tight">
                        {comp.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Action Buttons in Drawer */}
            <div className="mt-auto pt-6 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsDrawerOpen(false);
                  onPlay?.();
                }}
                className="flex-1 py-3 px-4 rounded-full bg-ultramarine text-white text-scale-14 font-semibold hover:bg-ultramarine-hover transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                {isActive && isPlaying ? (
                  <>
                    <Pause className="w-4 h-4 fill-white" />
                    <span>Pause track</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-white" />
                    <span>Play track</span>
                  </>
                )}
              </button>
              {isAuthenticated && (
                <button
                  type="button"
                  onClick={handleLikeClick}
                  className="p-3 rounded-full border border-black/10 hover:bg-black/5 transition-colors text-ink"
                  aria-label={isLiked ? 'Unlike song' : 'Like song'}
                >
                  <Heart
                    className={cn(
                      'w-5 h-5 transition-colors',
                      isLiked ? 'text-tangerine fill-tangerine' : 'text-ink/60'
                    )}
                  />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {showPlaylistModal && song && (
        <PlaylistPickerModal
          isOpen={showPlaylistModal}
          onClose={() => setShowPlaylistModal(false)}
          track={{
            id: song.id,
            title: song.title,
            artistName: song.artistName,
            albumTitle: song.albumTitle,
            artworkUrl: song.artworkUrl,
            durationSeconds: song.durationSeconds,
            provider: song.provider,
            providerTrackId: song.providerTrackId,
          }}
        />
      )}
    </>
  );
};
