import React, { useState, useEffect } from 'react';
import { Search as SearchIcon, X, Music, AlertCircle, Loader2 } from 'lucide-react';
import { PageContainer } from '../components/layout/PageContainer.js';
import { Input } from '../components/ui/Input.js';
import { Button } from '../components/ui/Button.js';
import { Badge } from '../components/ui/Badge.js';
import { Card } from '../components/ui/Card.js';
import { Skeleton } from '../components/ui/Skeleton.js';
import { SongCard } from '../components/music/SongCard.js';
import { ArtistCard } from '../components/music/ArtistCard.js';
import { AlbumCard } from '../components/music/AlbumCard.js';
import { useAudioPlayer } from '../contexts/AudioPlayerContext.js';
import { searchMusic } from '../services/musicService.js';
import { TrackItem, ArtistItem, AlbumItem } from '../types/index.js';

type SearchFilter = 'all' | 'tracks' | 'artists' | 'albums';

export const SearchPage: React.FC = () => {
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<SearchFilter>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [tracks, setTracks] = useState<TrackItem[]>([]);
  const [artists, setArtists] = useState<ArtistItem[]>([]);
  const [albums, setAlbums] = useState<AlbumItem[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const { playTrack, currentTrack, isPlaying } = useAudioPlayer();

  const handleSearch = async (searchQuery: string) => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setTracks([]);
      setArtists([]);
      setAlbums([]);
      setHasSearched(false);
      setError(null);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setHasSearched(true);

      const results = await searchMusic(trimmed, 20);
      setTracks(results.tracks || []);
      setArtists(results.artists || []);
      setAlbums(results.albums || []);
    } catch (err) {
      console.error('[SearchPage] Search failed:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load music from catalogue right now. Please try again.'
      );
      setTracks([]);
      setArtists([]);
      setAlbums([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Debounced search when query changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim()) {
        void handleSearch(query);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [query]);

  const handleClear = () => {
    setQuery('');
    setTracks([]);
    setArtists([]);
    setAlbums([]);
    setHasSearched(false);
    setError(null);
  };

  const showTracks = activeFilter === 'all' || activeFilter === 'tracks';
  const showArtists = activeFilter === 'all' || activeFilter === 'artists';
  const showAlbums = activeFilter === 'all' || activeFilter === 'albums';

  const totalResultsCount = tracks.length + artists.length + albums.length;

  return (
    <PageContainer>
      {/* Header & Search Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2 px-0.5">
          <h2 className="text-xl font-bold text-content-primary">Catalogue Search</h2>
          <Badge variant="cyan" size="sm">
            Jamendo API
          </Badge>
        </div>

        <div className="relative flex items-center">
          <Input
            isSearch
            placeholder="Search tracks, artists, albums..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          {query && (
            <button
              onClick={handleClear}
              className="absolute right-3 p-1 text-content-muted hover:text-content-primary"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      {hasSearched && (
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1 no-scrollbar">
          <Button
            variant={activeFilter === 'all' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setActiveFilter('all')}
          >
            All ({totalResultsCount})
          </Button>
          <Button
            variant={activeFilter === 'tracks' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setActiveFilter('tracks')}
          >
            Tracks ({tracks.length})
          </Button>
          <Button
            variant={activeFilter === 'artists' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setActiveFilter('artists')}
          >
            Artists ({artists.length})
          </Button>
          <Button
            variant={activeFilter === 'albums' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setActiveFilter('albums')}
          >
            Albums ({albums.length})
          </Button>
        </div>
      )}

      {/* Loading Skeletons */}
      {isLoading && (
        <div className="space-y-3 mt-4">
          <div className="flex items-center gap-2 text-xs text-content-muted mb-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-400" />
            <span>Searching Jamendo catalogue...</span>
          </div>
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      )}

      {/* Error Message */}
      {error && !isLoading && (
        <Card className="p-4 bg-vibe-rose/10 border-vibe-rose/30 text-center my-4">
          <AlertCircle className="w-6 h-6 text-vibe-rose mx-auto mb-2" />
          <h4 className="text-sm font-semibold text-content-primary">Catalogue Notice</h4>
          <p className="text-xs text-rose-300 mt-1 max-w-sm mx-auto">{error}</p>
        </Card>
      )}

      {/* Empty State after search */}
      {!isLoading && !error && hasSearched && totalResultsCount === 0 && (
        <Card className="p-8 text-center border-surface-border my-6">
          <Music className="w-10 h-10 text-content-muted mx-auto mb-2 opacity-50" />
          <h4 className="text-sm font-semibold text-content-primary">No results found</h4>
          <p className="text-xs text-content-secondary mt-1">
            No music found matching "{query}". Try a different keyword or artist.
          </p>
        </Card>
      )}

      {/* Initial Guidance State before search */}
      {!hasSearched && !isLoading && (
        <div className="mt-8 text-center px-4">
          <div className="w-12 h-12 rounded-2xl bg-brand-500/10 text-brand-400 flex items-center justify-center mx-auto mb-3">
            <SearchIcon className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-content-primary">Explore Independent Music</h3>
          <p className="text-xs text-content-muted mt-1 leading-relaxed max-w-xs mx-auto">
            Search tracks and artists licensed under Creative Commons via the Jamendo music provider.
          </p>
        </div>
      )}

      {/* Results Content */}
      {!isLoading && hasSearched && (
        <div className="space-y-6">
          {/* Tracks Section */}
          {showTracks && tracks.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-2 px-0.5">
                <h3 className="text-sm font-bold text-content-primary uppercase tracking-wider">
                  Tracks ({tracks.length})
                </h3>
              </div>
              <div className="space-y-2">
                {tracks.map((track) => (
                  <SongCard
                    key={track.id}
                    track={track}
                    isActive={currentTrack?.id === track.id}
                    isPlaying={isPlaying && currentTrack?.id === track.id}
                    onPlay={() => void playTrack(track)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Artists Section */}
          {showArtists && artists.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-2 px-0.5">
                <h3 className="text-sm font-bold text-content-primary uppercase tracking-wider">
                  Artists ({artists.length})
                </h3>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {artists.map((artist) => (
                  <ArtistCard
                    key={artist.providerArtistId}
                    id={artist.providerArtistId}
                    name={artist.name}
                    imageUrl={artist.imageUrl}
                    genre={artist.genres?.[0]}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Albums Section */}
          {showAlbums && albums.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-2 px-0.5">
                <h3 className="text-sm font-bold text-content-primary uppercase tracking-wider">
                  Albums ({albums.length})
                </h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {albums.map((album) => (
                  <AlbumCard
                    key={album.providerAlbumId}
                    id={album.providerAlbumId}
                    title={album.title}
                    artist={album.artistName}
                    coverUrl={album.artworkUrl}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </PageContainer>
  );
};
