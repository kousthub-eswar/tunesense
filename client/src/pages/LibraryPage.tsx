import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Heart,
  Clock,
  ListMusic,
  Plus,
  Play,
  Music,
  Loader2,
  LogIn,
  Disc,
  Sparkles,
  Compass,
} from 'lucide-react';
import { PageContainer } from '../components/layout/PageContainer.js';
import { Button } from '../components/ui/Button.js';
import { SongCard } from '../components/music/SongCard.js';
import { MusicArtwork } from '../components/music/MusicArtwork.js';
import { CreatePlaylistModal } from '../components/music/CreatePlaylistModal.js';
import { libraryService } from '../services/libraryService.js';
import { playlistService } from '../services/playlistService.js';
import { useAudioPlayer } from '../contexts/AudioPlayerContext.js';
import { useAuth } from '../contexts/AuthContext.js';
import { PlaylistSummaryDto, TrackItem, HistoryItem } from '../types/index.js';
import { cn } from '../utils/cn.js';

type Tab = 'playlists' | 'likes' | 'history';

export const LibraryPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') as Tab | null;
  const [activeTab, setActiveTab] = useState<Tab>(
    tabParam === 'playlists' || tabParam === 'likes' || tabParam === 'history'
      ? tabParam
      : 'playlists'
  );

  useEffect(() => {
    if (tabParam && (tabParam === 'playlists' || tabParam === 'likes' || tabParam === 'history')) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { setQueue, currentTrack, isPlaying } = useAudioPlayer();

  // Data states
  const [playlists, setPlaylists] = useState<PlaylistSummaryDto[]>([]);
  const [likedSongs, setLikedSongs] = useState<TrackItem[]>([]);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);

  const loadData = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      if (activeTab === 'playlists') {
        const data = await playlistService.getUserPlaylists();
        setPlaylists(data);
      } else if (activeTab === 'likes') {
        const songs = await libraryService.getLikedSongs();
        setLikedSongs(songs);
      } else if (activeTab === 'history') {
        const history = await libraryService.getHistory(30);
        setHistoryItems(history);
      }
    } catch (err) {
      console.error('[LibraryPage] Error loading library data:', err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, activeTab]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handlePlaylistCreated = (pl: PlaylistSummaryDto) => {
    setPlaylists((prev) => [pl, ...prev]);
  };

  const handlePlayAllLikes = () => {
    if (likedSongs.length > 0) {
      setQueue(likedSongs, 0);
    }
  };

  return (
    <PageContainer>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-content-primary tracking-tight">
            Your Library
          </h2>
          <p className="text-xs text-content-secondary mt-0.5">
            Playlists, favorite tracks, and listening history
          </p>
        </div>

        {isAuthenticated && activeTab === 'playlists' && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowCreateModal(true)}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
            className="text-xs"
          >
            New Playlist
          </Button>
        )}
      </div>

      {/* Guest Sign-In Callout (Compact & Intentional) */}
      {!isAuthenticated && (
        <div className="mb-5 p-3.5 rounded-xl bg-surface border border-surface-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-surface-secondary text-brand-400 flex items-center justify-center shrink-0">
              <Disc className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-semibold text-white">Save & Sync Your Sound</h4>
              <p className="text-[11px] text-content-secondary mt-0.5">
                Sign in to save favorite tracks, create playlists, and track listening history.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/login')}
              leftIcon={<LogIn className="w-3.5 h-3.5" />}
              className="text-xs"
            >
              Sign In
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/signup')}
              className="text-xs text-content-secondary hover:text-white"
            >
              Register
            </Button>
          </div>
        </div>
      )}

      {/* Cohesive Library Tabs */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
        <button
          type="button"
          onClick={() => setActiveTab('playlists')}
          className={cn(
            'flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-semibold shrink-0 transition-all select-none',
            activeTab === 'playlists'
              ? 'bg-brand-500 text-white shadow-sm'
              : 'bg-surface/80 hover:bg-surface text-content-secondary hover:text-white border border-surface-border'
          )}
        >
          <ListMusic className="w-3.5 h-3.5" />
          <span>Playlists</span>
          {isAuthenticated && playlists.length > 0 && (
            <span className="text-[10px] bg-white/20 px-1.5 py-0.2 rounded-full">
              {playlists.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('likes')}
          className={cn(
            'flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-semibold shrink-0 transition-all select-none',
            activeTab === 'likes'
              ? 'bg-brand-500 text-white shadow-sm'
              : 'bg-surface/80 hover:bg-surface text-content-secondary hover:text-white border border-surface-border'
          )}
        >
          <Heart className="w-3.5 h-3.5" />
          <span>Liked Songs</span>
          {isAuthenticated && likedSongs.length > 0 && (
            <span className="text-[10px] bg-white/20 px-1.5 py-0.2 rounded-full">
              {likedSongs.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={cn(
            'flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-semibold shrink-0 transition-all select-none',
            activeTab === 'history'
              ? 'bg-brand-500 text-white shadow-sm'
              : 'bg-surface/80 hover:bg-surface text-content-secondary hover:text-white border border-surface-border'
          )}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>History</span>
          {isAuthenticated && historyItems.length > 0 && (
            <span className="text-[10px] bg-white/20 px-1.5 py-0.2 rounded-full">
              {historyItems.length}
            </span>
          )}
        </button>
      </div>

      {/* Tab Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-content-muted gap-2 text-xs">
          <Loader2 className="w-6 h-6 animate-spin text-brand-400" />
          Loading your collection...
        </div>
      ) : activeTab === 'playlists' ? (
        /* PLAYLISTS TAB */
        <div className="space-y-4">
          {isAuthenticated && (
            <div
              onClick={() => setShowCreateModal(true)}
              className="border border-dashed border-surface-border hover:border-brand-500/50 rounded-xl p-4 flex items-center gap-3.5 cursor-pointer bg-surface/30 hover:bg-surface/50 transition-all group"
            >
              <div className="w-12 h-12 rounded-lg bg-brand-500/10 text-brand-400 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                <Plus className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-content-primary">Create New Playlist</h4>
                <p className="text-xs text-content-secondary mt-0.5">
                  Curate your personal mixtape and organize your tracks
                </p>
              </div>
            </div>
          )}

          {playlists.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {playlists.map((pl) => (
                <div
                  key={pl.id}
                  onClick={() => navigate(`/playlist/${pl.id}`)}
                  className="flex items-center gap-3.5 p-3 rounded-xl bg-surface/60 hover:bg-surface border border-surface-border/60 hover:border-brand-500/40 cursor-pointer transition-all shadow-sm group"
                >
                  <div className="w-14 h-14 rounded-lg overflow-hidden bg-surface shrink-0 border border-surface-border/50">
                    <MusicArtwork
                      src={pl.coverArtworkUrl}
                      alt={pl.name}
                      size="md"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      fallbackIcon={<Music className="w-6 h-6 text-brand-400" />}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-semibold text-content-primary truncate group-hover:text-brand-300 transition-colors">
                      {pl.name}
                    </h4>
                    <p className="text-xs text-content-secondary truncate mt-0.5">
                      {pl.songCount} {pl.songCount === 1 ? 'track' : 'tracks'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 rounded-2xl bg-surface/30 border border-surface-border text-center my-4">
              <div className="w-12 h-12 rounded-2xl bg-brand-500/10 text-brand-400 flex items-center justify-center mx-auto mb-3">
                <ListMusic className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-semibold text-content-primary">No playlists yet</h4>
              <p className="text-xs text-content-secondary mt-1 max-w-xs mx-auto leading-relaxed">
                Create a custom playlist to collect your favorite independent releases.
              </p>
              <div className="flex items-center justify-center gap-2.5 mt-4">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => isAuthenticated ? setShowCreateModal(true) : navigate('/login')}
                  leftIcon={<Plus className="w-3.5 h-3.5" />}
                >
                  Create Playlist
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate('/discover')}
                >
                  Discover Music
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : activeTab === 'likes' ? (
        /* LIKED TRACKS TAB */
        <div className="space-y-3">
          {likedSongs.length > 0 && (
            <div className="flex items-center justify-between pb-3 border-b border-surface-border">
              <span className="text-xs font-medium text-content-secondary">
                {likedSongs.length} {likedSongs.length === 1 ? 'liked track' : 'liked tracks'}
              </span>
              <Button
                variant="primary"
                size="sm"
                onClick={handlePlayAllLikes}
                leftIcon={<Play className="w-3.5 h-3.5 fill-white" />}
                className="text-xs"
              >
                Play All
              </Button>
            </div>
          )}

          {likedSongs.length > 0 ? (
            <div className="space-y-2">
              {likedSongs.map((track, idx) => {
                const isActive = currentTrack?.id === track.id;
                return (
                  <SongCard
                    key={track.id}
                    track={track}
                    isActive={isActive}
                    isPlaying={isActive && isPlaying}
                    isLikedInitially={true}
                    onPlay={() => setQueue(likedSongs, idx)}
                  />
                );
              })}
            </div>
          ) : (
            <div className="p-8 rounded-2xl bg-surface/30 border border-surface-border text-center my-4">
              <div className="w-12 h-12 rounded-2xl bg-brand-500/10 text-brand-400 flex items-center justify-center mx-auto mb-3">
                <Heart className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-semibold text-content-primary">No liked songs yet</h4>
              <p className="text-xs text-content-secondary mt-1 max-w-xs mx-auto leading-relaxed">
                Tap the heart icon on any track or recommendation to save it to your collection.
              </p>
              <div className="flex items-center justify-center gap-2.5 mt-4">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => navigate('/home')}
                  leftIcon={<Compass className="w-3.5 h-3.5" />}
                >
                  Discover Music
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* HISTORY TAB */
        <div className="space-y-2">
          {historyItems.length > 0 ? (
            historyItems.map((item, idx) => {
              const isActive = currentTrack?.id === item.song.id;
              const allHistoryTracks = historyItems.map((h) => h.song);

              return (
                <SongCard
                  key={`${item.song.id}-${idx}`}
                  track={item.song}
                  isActive={isActive}
                  isPlaying={isActive && isPlaying}
                  onPlay={() => setQueue(allHistoryTracks, idx)}
                />
              );
            })
          ) : (
            <div className="p-8 rounded-2xl bg-surface/30 border border-surface-border text-center my-4">
              <div className="w-12 h-12 rounded-2xl bg-brand-500/10 text-brand-400 flex items-center justify-center mx-auto mb-3">
                <Clock className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-semibold text-content-primary">No listening history yet</h4>
              <p className="text-xs text-content-secondary mt-1 max-w-xs mx-auto leading-relaxed">
                Play any song to start building your real-time listening history and personalized taste profile.
              </p>
              <div className="flex items-center justify-center gap-2.5 mt-4">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => navigate('/discover')}
                  leftIcon={<Sparkles className="w-3.5 h-3.5" />}
                >
                  Start Listening
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create Playlist Modal */}
      <CreatePlaylistModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={handlePlaylistCreated}
      />
    </PageContainer>
  );
};

export default LibraryPage;
