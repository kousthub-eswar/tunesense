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
          'relative overflow-hidden rounded-2xl bg-gradient-to-r from-surface-secondary via-surface to-surface border border-surface-border p-3.5 sm:p-5 transition-all duration-300 hover:border-brand-500/35 cursor-pointer group select-none shadow-sm',
          isActive && 'border-brand-500/40 ring-1 ring-brand-500/20',
          className
        )}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3.5 sm:gap-5">
          {/* Compact Artwork */}
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 shrink-0 rounded-xl overflow-hidden bg-surface-secondary border border-surface-border shadow-md">
            {track.artworkUrl ? (
              <img
                src={track.artworkUrl}
                alt={track.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="eager"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-brand-400">
                <Disc className="w-10 h-10 animate-spin" style={{ animationDuration: '6s' }} />
              </div>
            )}

            {/* Pulsing indicator when active */}
            {isActive && isPlaying && (
              <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center">
                <div className="flex items-center gap-1">
                  <span className="w-1 h-4 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1 h-6 bg-brand-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1 h-3 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
          </div>

          {/* Details & Playback Action */}
          <div className="min-w-0 flex-1 w-full flex flex-col justify-between py-0.5">
            <div>
              {/* Contextual Tag */}
              <div className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wider uppercase text-brand-400 mb-1">
                <Sparkles className="w-3 h-3 text-brand-400" />
                <span>Featured for You</span>
              </div>

              {/* Track Title */}
              <h2
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/song/${track.id}`);
                }}
                className="text-base sm:text-lg md:text-xl font-bold text-content-primary hover:text-brand-300 transition-colors truncate tracking-tight"
                title={track.title}
              >
                {track.title}
              </h2>

              {/* Artist Name */}
              <p className="text-xs sm:text-sm text-content-secondary mt-0.5 truncate font-medium">
                {track.artistName}
                {track.albumTitle && (
                  <span className="text-content-muted font-normal">
                    {' '}• {track.albumTitle}
                  </span>
                )}
              </p>
            </div>

            {/* Actions Bar */}
            <div className="flex items-center gap-2.5 mt-3 sm:mt-4 pt-1">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onPlay();
                }}
                className="h-9 sm:h-10 px-4 sm:px-5 rounded-full bg-brand-500 hover:bg-brand-600 text-white font-semibold text-xs flex items-center gap-2 shadow-sm transition-transform active:scale-95"
                aria-label={isActive && isPlaying ? 'Pause featured track' : 'Play featured track'}
              >
                {isActive && isPlaying ? (
                  <>
                    <Pause className="w-3.5 h-3.5 fill-white" />
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
                    <span>Play Now</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/song/${track.id}`);
                }}
                className="h-9 sm:h-10 px-3.5 rounded-full bg-surface-secondary hover:bg-surface-hover border border-surface-border text-content-secondary hover:text-content-primary text-xs font-medium flex items-center gap-1.5 transition-colors"
                title="View track details"
              >
                <Info className="w-3.5 h-3.5" />
                <span>Details</span>
              </button>

              {isAuthenticated && (
                <>
                  <button
                    type="button"
                    onClick={handleLike}
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-surface-secondary hover:bg-surface-hover border border-surface-border flex items-center justify-center text-content-secondary hover:text-content-primary transition-colors active:scale-95 ml-auto sm:ml-0"
                    aria-label={isLiked ? 'Unlike song' : 'Like song'}
                  >
                    <Heart
                      className={cn(
                        'w-3.5 h-3.5 transition-colors',
                        isLiked ? 'text-brand-400 fill-brand-400' : 'text-content-secondary'
                      )}
                    />
                  </button>

                  <button
                    type="button"
                    onClick={handlePlaylist}
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-surface-secondary hover:bg-surface-hover border border-surface-border flex items-center justify-center text-content-secondary hover:text-content-primary transition-colors active:scale-95"
                    aria-label="Add to playlist"
                  >
                    <ListPlus className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
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

export default FeaturedTrackHero;
