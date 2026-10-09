import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Play,
  Pause,
  Heart,
  ListPlus,
  ArrowLeft,
  Disc,
  Clock,
  Radio,
  Sparkles,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { PageContainer } from '../components/layout/PageContainer.js';
import { Card } from '../components/ui/Card.js';
import { Button } from '../components/ui/Button.js';
import { Badge } from '../components/ui/Badge.js';
import { MusicArtwork } from '../components/music/MusicArtwork.js';
import { SongCard } from '../components/music/SongCard.js';
import { PlaylistPickerModal } from '../components/music/PlaylistPickerModal.js';
import { useAudioPlayer } from '../contexts/AudioPlayerContext.js';
import { useAuth } from '../contexts/AuthContext.js';
import { fetchTrackById, fetchPopularTracks } from '../services/musicService.js';
import { libraryService } from '../services/libraryService.js';
import { TrackItem } from '../types/index.js';
import { cn } from '../utils/cn.js';

export const SongDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { currentTrack, isPlaying, setQueue, togglePlayPause } = useAudioPlayer();

  const [track, setTrack] = useState<TrackItem | null>(null);
  const [relatedTracks, setRelatedTracks] = useState<TrackItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isLiked, setIsLiked] = useState<boolean>(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState<boolean>(false);

  useEffect(() => {
    if (!id) return;

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    const loadData = async () => {
      try {
        const trackData = await fetchTrackById(id);
        if (!isMounted) return;
        setTrack(trackData);

        // Check liked status if user is authenticated
        if (isAuthenticated) {
          libraryService
            .checkLikes([trackData.id])
            .then((res) => {
              if (isMounted) setIsLiked(Boolean(res[trackData.id]));
            })
            .catch(() => {});
        }

        // Fetch related tracks
        fetchPopularTracks(5)
          .then((pop) => {
            if (isMounted) {
              setRelatedTracks(pop.tracks.filter((t) => t.id !== trackData.id).slice(0, 4));
            }
          })
          .catch(() => {});
      } catch (err: any) {
        if (!isMounted) return;
        console.error('[SongDetailPage] Error loading track:', err);
        setError(err.message || 'Track could not be found or loaded.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [id, isAuthenticated]);

  const handleToggleLike = async () => {
    if (!track || !isAuthenticated) return;
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

  const isCurrentTrackActive = currentTrack?.id === track?.id;

  const handlePlayCurrent = () => {
    if (!track) return;
    if (isCurrentTrackActive) {
      togglePlayPause();
    } else {
      setQueue([track, ...relatedTracks], 0);
    }
  };

  const formatDuration = (seconds?: number): string => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <PageContainer>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
          <Loader2 className="w-8 h-8 text-brand-400 animate-spin" />
          <p className="text-xs text-content-muted">Loading track details...</p>
        </div>
      </PageContainer>
    );
  }

  if (error || !track) {
    return (
      <PageContainer>
        <div className="mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          >
            Back
          </Button>
        </div>
        <Card className="p-8 text-center bg-surface/40 border-surface-border max-w-md mx-auto">
          <div className="w-12 h-12 rounded-full bg-vibe-rose/10 border border-vibe-rose/20 text-vibe-rose flex items-center justify-center mx-auto mb-3">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-content-primary mb-1">Track Unavailable</h2>
          <p className="text-xs text-content-secondary mb-4">{error || 'The requested track could not be loaded.'}</p>
          <Button variant="primary" size="sm" onClick={() => navigate('/discover')}>
            Browse Discover
          </Button>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      {/* Back button */}
      <div className="mb-4">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-xs text-content-muted hover:text-content-primary transition-colors py-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back</span>
        </button>
      </div>

      {/* Track Hero Banner */}
      <Card className="p-6 mb-6 bg-gradient-to-br from-surface via-bg-elevated to-bg-main border-surface-border/80 shadow-xl">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          {/* Large Artwork */}
          <div className="relative w-44 h-44 sm:w-52 sm:h-52 shrink-0 rounded-2xl overflow-hidden shadow-2xl border border-surface-border/60">
            <MusicArtwork
              src={track.artworkUrl}
              alt={track.title}
              size="lg"
              className="w-full h-full object-cover"
              fallbackIcon={<Disc className="w-16 h-16 text-brand-400" />}
            />
          </div>

          {/* Metadata & Actions */}
          <div className="flex-1 min-w-0 flex flex-col justify-between text-center sm:text-left h-full">
            <div>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-2">
                <Badge variant="brand" size="sm">
                  Track
                </Badge>
                {track.provider && (
                  <Badge variant="neutral" size="sm" className="capitalize text-[10px]">
                    {track.provider}
                  </Badge>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl font-bold text-content-primary tracking-tight leading-tight mb-1">
                {track.title}
              </h1>

              <p className="text-base font-medium text-brand-300 mb-2">
                {track.artistName}
              </p>

              {track.albumTitle && (
                <p className="text-xs text-content-secondary mb-3">
                  Album: <span className="text-content-primary">{track.albumTitle}</span>
                </p>
              )}

              {/* Badges / Genres */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 mb-5">
                <span className="inline-flex items-center gap-1 text-[11px] text-content-muted mr-1">
                  <Clock className="w-3 h-3" />
                  {formatDuration(track.durationSeconds)}
                </span>
                {track.genres && track.genres.length > 0 && track.genres.map((g) => (
                  <Badge key={g} variant="cyan" size="sm" className="text-[10px]">
                    {g}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-2 border-t border-surface-border/50">
              <Button
                variant="primary"
                size="md"
                onClick={handlePlayCurrent}
                leftIcon={
                  isCurrentTrackActive && isPlaying ? (
                    <Pause className="w-4 h-4 fill-current" />
                  ) : (
                    <Play className="w-4 h-4 fill-current" />
                  )
                }
                className="shadow-glow px-6"
              >
                {isCurrentTrackActive && isPlaying ? 'Pause' : 'Play Track'}
              </Button>

              {isAuthenticated && (
                <>
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={handleToggleLike}
                    leftIcon={
                      <Heart
                        className={cn(
                          'w-4 h-4',
                          isLiked ? 'text-brand-400 fill-brand-400' : 'text-content-secondary'
                        )}
                      />
                    }
                  >
                    {isLiked ? 'Liked' : 'Like'}
                  </Button>

                  <Button
                    variant="ghost"
                    size="md"
                    onClick={() => setShowPlaylistModal(true)}
                    leftIcon={<ListPlus className="w-4 h-4" />}
                    className="text-content-secondary hover:text-content-primary"
                  >
                    Add to Playlist
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Audio Source & License Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card className="p-4 bg-surface/60 border-surface-border">
          <div className="flex items-center gap-2 mb-2">
            <Radio className="w-4 h-4 text-brand-400" />
            <h3 className="text-xs font-semibold text-content-primary uppercase tracking-wider">
              Audio Source & Streaming
            </h3>
          </div>
          <p className="text-xs text-content-secondary leading-relaxed mb-2">
            Provided via the Jamendo Music Catalogue API. Full legal streaming source licensed under Creative Commons for non-commercial discovery.
          </p>
          <div className="text-[11px] font-mono text-content-muted truncate">
            Provider ID: {track.providerTrackId || track.id}
          </div>
        </Card>

        <Card className="p-4 bg-surface/60 border-surface-border">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-brand-400" />
            <h3 className="text-xs font-semibold text-content-primary uppercase tracking-wider">
              TuneSense Recommendation Context
            </h3>
          </div>
          <p className="text-xs text-content-secondary leading-relaxed">
            When you play, like, or complete this track, TuneSense updates your personal acoustic profile and recalibrates collaborative hybrid candidate weighting.
          </p>
        </Card>
      </div>

      {/* Related Tracks */}
      {relatedTracks.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3 px-0.5">
            <h3 className="text-base font-bold text-content-primary">More to Explore</h3>
            <span className="text-xs text-content-muted">Discover more sounds</span>
          </div>
          <div className="flex flex-col gap-2">
            {relatedTracks.map((rel, idx) => {
              const isRelActive = currentTrack?.id === rel.id;
              return (
                <SongCard
                  key={rel.id}
                  track={rel}
                  isActive={isRelActive}
                  isPlaying={isRelActive && isPlaying}
                  onPlay={() => setQueue(relatedTracks, idx)}
                />
              );
            })}
          </div>
        </div>
      )}

      {showPlaylistModal && (
        <PlaylistPickerModal
          isOpen={showPlaylistModal}
          onClose={() => setShowPlaylistModal(false)}
          track={track}
        />
      )}
    </PageContainer>
  );
};

export default SongDetailPage;
