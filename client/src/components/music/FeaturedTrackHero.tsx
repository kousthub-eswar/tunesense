import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Pause, Heart, Sparkles, Disc, ListPlus, Info } from 'lucide-react';
import { TrackItem } from '../../types/index.js';
import { useAuth } from '../../contexts/AuthContext.js';
import { libraryService } from '../../services/libraryService.js';
import { PlaylistPickerModal } from './PlaylistPickerModal.js';
import { cn } from '../../utils/cn.js';

export interface FeaturedTrackHeroProps {
  track: TrackItem;
  isActive?: boolean;
  isPlaying?: boolean;
  onPlay: () => void;
  className?: string;
}

export const FeaturedTrackHero: React.FC<FeaturedTrackHeroProps> = ({
  track,
  isActive = false,
  isPlaying = false,
  onPlay,
  className,
}) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [isLiked, setIsLiked] = useState(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);

  useEffect(() => {
    if (track && isAuthenticated) {
      libraryService
        .checkLikes([track.id])
        .then((res) => {
          setIsLiked(Boolean(res[track.id]));
        })
        .catch(() => {});
    }
  }, [track.id, isAuthenticated]);

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) return;
    const nextState = !isLiked;
    setIsLiked(nextState);
    try {
      if (nextState) {
        await libraryService.likeSong(track.id);
      } else {
        await libraryService.unlikeSong(track.id);
      }
    } catch {
      setIsLiked(!nextState);
    }
  };

  const handlePlaylist = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) return;
    setShowPlaylistModal(true);
  };

  return (
    <>
      <div
        onClick={onPlay}
        className={cn(
          'relative overflow-hidden rounded-[28px] bg-white/75 dark:bg-slate-900/75 hover:bg-white/90 dark:hover:bg-slate-800/90 backdrop-blur-xl border border-white/70 dark:border-white/10 p-4 sm:p-6 transition-all duration-300 shadow-panel cursor-pointer group select-none text-ink dark:text-slate-100',
          isActive && 'ring-2 ring-ultramarine ring-offset-2 ring-offset-fog dark:ring-offset-slate-950',
          className
        )}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
          {/* Artwork with 20px radius */}
          <div className="relative w-28 h-28 sm:w-32 sm:h-32 md:w-36 md:h-36 shrink-0 rounded-[20px] overflow-hidden bg-black/5 shadow-sm">
            {track.artworkUrl ? (
              <img
                src={track.artworkUrl}
                alt={track.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="eager"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-ultramarine">
                <Disc className={cn('w-12 h-12', isActive && isPlaying && 'animate-spin')} style={{ animationDuration: '6s' }} />
              </div>
            )}

            {/* Pulsing indicator when active */}
            {isActive && isPlaying && (
              <div className="absolute inset-0 bg-ultramarine/30 backdrop-blur-[1px] flex items-center justify-center">
                <div className="flex items-center gap-1">
                  <span className="w-1 h-4 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1 h-6 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
          </div>

          {/* Details & Playback Action */}
          <div className="min-w-0 flex-1 w-full flex flex-col justify-between py-0.5">
            <div>
              {/* Contextual Tag (sentence case) */}
              <div className="flex items-center gap-1.5 text-xs font-semibold text-ultramarine mb-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Featured for you</span>
              </div>

              {/* Track Title in confident Bricolage Grotesque */}
              <h2
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/song/${track.id}`);
                }}
                className="font-display text-scale-20 sm:text-scale-28 font-bold text-ink hover:text-ultramarine transition-colors truncate tracking-tight"
                title={track.title}
              >
                {track.title}
              </h2>

              {/* Artist Name */}
              <p className="text-scale-16 text-ink/65 mt-1 truncate font-medium">
                {track.artistName}
                {track.albumTitle && (
                  <span className="text-ink/40 font-normal">
                    {' '}• {track.albumTitle}
                  </span>
                )}
              </p>
            </div>

            {/* Actions Bar */}
            <div className="flex items-center gap-2.5 mt-4 pt-1">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onPlay();
                }}
                className="h-10 px-5 rounded-full bg-ultramarine hover:bg-ultramarine-hover text-white font-semibold text-scale-14 flex items-center gap-2 shadow-sm transition-transform active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-ultramarine"
                aria-label={isActive && isPlaying ? 'Pause featured track' : 'Play featured track'}
              >
                {isActive && isPlaying ? (
                  <>
                    <Pause className="w-4 h-4 fill-white" />
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-white ml-0.5" />
                    <span>Play now</span>
                  </>
                )}
              </button>

              {isAuthenticated && (
                <button
                  type="button"
                  onClick={handleLike}
                  className="w-10 h-10 rounded-full bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-700 text-ink dark:text-slate-100 border border-white/80 dark:border-white/10 shadow-subtle flex items-center justify-center transition-transform active:scale-95"
                  aria-label={isLiked ? 'Unlike song' : 'Like song'}
                >
                  <Heart
                    className={cn(
                      'w-4 h-4 transition-colors',
                      isLiked ? 'text-tangerine fill-tangerine' : 'text-ink/50 dark:text-slate-400'
                    )}
                  />
                </button>
              )}

              {isAuthenticated && (
                <button
                  type="button"
                  onClick={handlePlaylist}
                  className="w-10 h-10 rounded-full bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-700 text-ink dark:text-slate-100 border border-white/80 dark:border-white/10 shadow-subtle flex items-center justify-center transition-transform active:scale-95"
                  aria-label="Add to playlist"
                >
                  <ListPlus className="w-4 h-4 text-ink/60 dark:text-slate-400" />
                </button>
              )}

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/song/${track.id}`);
                }}
                className="w-10 h-10 rounded-full bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-700 text-ink dark:text-slate-100 border border-white/80 dark:border-white/10 shadow-subtle flex items-center justify-center transition-transform active:scale-95 ml-auto"
                aria-label="Track information"
              >
                <Info className="w-4 h-4 text-ink/50 dark:text-slate-400" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {showPlaylistModal && (
        <PlaylistPickerModal
          isOpen={showPlaylistModal}
          onClose={() => setShowPlaylistModal(false)}
          track={track}
        />
      )}
    </>
  );
};
