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
} from 'lucide-react';
import { PageContainer } from '../components/layout/PageContainer.js';
import { Card } from '../components/ui/Card.js';
import { Button } from '../components/ui/Button.js';
import { SongCard } from '../components/music/SongCard.js';
import { MusicArtwork } from '../components/music/MusicArtwork.js';
import { CreatePlaylistModal } from '../components/music/CreatePlaylistModal.js';
import { libraryService } from '../services/libraryService.js';
import { playlistService } from '../services/playlistService.js';
import { useAudioPlayer } from '../contexts/AudioPlayerContext.js';
import { useAuth } from '../contexts/AuthContext.js';
import { PlaylistSummaryDto, TrackItem, HistoryItem } from '../types/index.js';

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

  if (!isAuthenticated) {
    return (
      <PageContainer>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-content-primary">Your Library</h2>
            <p className="text-xs text-content-secondary mt-0.5">
              Playlists, favorite tracks, and listening history
            </p>
          </div>
        </div>

        <Card className="p-8 bg-surface/50 border-surface-border text-center max-w-md mx-auto my-8">
          <div className="w-14 h-14 rounded-full bg-brand-500/15 text-brand-400 flex items-center justify-center mx-auto mb-3">
            <Disc className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-content-primary">Sign in to build your library</h3>
          <p className="text-xs text-content-secondary mt-1.5 leading-relaxed">
            Create custom playlists, save your favorite tracks, and track your personalized listening history with TuneSense.
          </p>
          <div className="flex items-center justify-center gap-3 mt-6">
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/login')}
              leftIcon={<LogIn className="w-4 h-4" />}
            >
              Sign In
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/signup')}
            >
              Create Account
            </Button>
          </div>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-content-primary">Your Library</h2>
          <p className="text-xs text-content-secondary mt-0.5">
            Playlists, favorite tracks, and listening history
          </p>
        </div>
      </div>

      {/* Library Filter Pills */}
      <div className="flex gap-2 mb-5">
        <Button
          variant={activeTab === 'playlists' ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('playlists')}
          leftIcon={<ListMusic className="w-3.5 h-3.5" />}
        >
          Playlists
        </Button>
        <Button
          variant={activeTab === 'likes' ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('likes')}
          leftIcon={<Heart className="w-3.5 h-3.5" />}
        >
          Liked Tracks
        </Button>
        <Button
          variant={activeTab === 'history' ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('history')}
          leftIcon={<Clock className="w-3.5 h-3.5" />}
        >
          Recently Played
        </Button>
      </div>

      {/* Tab Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-content-muted gap-2 text-xs">
          <Loader2 className="w-6 h-6 animate-spin text-brand-400" />
          Loading...
        </div>
      ) : activeTab === 'playlists' ? (
        /* PLAYLISTS TAB */
        <div className="space-y-3">
          {/* Create New Playlist Card */}
          <Card
            interactive
            onClick={() => setShowCreateModal(true)}
            className="border-dashed border-surface-border flex items-center justify-center p-5 text-center cursor-pointer hover:border-brand-500/50 transition-colors"
          >
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-brand-500/15 text-brand-400 flex items-center justify-center mb-2">
                <Plus className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-semibold text-content-primary">Create New Playlist</h4>
              <p className="text-[11px] text-content-muted mt-0.5">
                Collect and organize your favorite songs
              </p>
            </div>
          </Card>

          {/* User Playlists List */}
          {playlists.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {playlists.map((pl) => (
                <div
                  key={pl.id}
                  onClick={() => navigate(`/playlist/${pl.id}`)}
                  className="flex items-center gap-3.5 p-3 rounded-card bg-surface/60 hover:bg-surface border border-surface-border/60 hover:border-brand-500/40 cursor-pointer transition-all tap-target"
                >
                  <div className="w-14 h-14 rounded-artwork overflow-hidden bg-surface shrink-0 border border-surface-border/50">
                    <MusicArtwork
                      src={pl.coverArtworkUrl}
                      alt={pl.name}
                      size="md"
                      className="w-full h-full object-cover"
                      fallbackIcon={<Music className="w-6 h-6 text-brand-400" />}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-semibold text-content-primary truncate">{pl.name}</h4>
                    <p className="text-xs text-content-secondary truncate mt-0.5">
                      {pl.songCount} {pl.songCount === 1 ? 'track' : 'tracks'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-xs text-content-muted">
              You haven't created any playlists yet.
            </div>
          )}
        </div>
      ) : activeTab === 'likes' ? (
        /* LIKED TRACKS TAB */
        <div className="space-y-3">
          {likedSongs.length > 0 && (
            <div className="flex items-center justify-between pb-2 border-b border-surface-border">
              <span className="text-xs text-content-secondary">
                {likedSongs.length} {likedSongs.length === 1 ? 'liked track' : 'liked tracks'}
              </span>
              <Button
                variant="primary"
                size="sm"
                onClick={handlePlayAllLikes}
                leftIcon={<Play className="w-3.5 h-3.5 fill-white" />}
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
            <div className="text-center py-12 rounded-card bg-surface/30 border border-surface-border p-6">
              <Heart className="w-8 h-8 text-content-muted mx-auto mb-2" />
              <h4 className="text-sm font-semibold text-content-primary">No liked tracks yet</h4>
              <p className="text-xs text-content-muted mt-1 max-w-xs mx-auto">
                Tap the heart icon on any song or recommendation to add it to your favorites.
              </p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate('/home')}
                className="mt-4"
              >
                Discover Music
              </Button>
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
            <div className="text-center py-12 rounded-card bg-surface/30 border border-surface-border p-6">
              <Clock className="w-8 h-8 text-content-muted mx-auto mb-2" />
              <h4 className="text-sm font-semibold text-content-primary">No listening history yet</h4>
              <p className="text-xs text-content-muted mt-1 max-w-xs mx-auto">
                Play music to build your real-time listening history and personalized taste profile.
              </p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate('/home')}
                className="mt-4"
              >
                Start Listening
              </Button>
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
