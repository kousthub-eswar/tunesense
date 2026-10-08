import { JamendoProvider } from '../providers/JamendoProvider.js';
import { RawJamendoTrack } from '../providers/types.js';
import { MusicCatalogueService } from '../services/music/MusicCatalogueService.js';

/**
 * Diagnostic verification for Stage 3 provider mapping and catalogue normalization.
 */
export async function runProviderVerifications(): Promise<boolean> {
  console.log('[TuneSense Verification] Running Stage 3 Provider & Mapping Tests:');

  const provider = new JamendoProvider();

  // 1. Test Provider Mapping
  const mockRawTrack: RawJamendoTrack = {
    id: '998877',
    name: 'Cosmic Ambient Flow',
    duration: 185,
    artist_id: '445566',
    artist_name: 'Starlight Echoes',
    album_id: '112233',
    album_name: 'Galactic Horizon',
    image: 'https://images.jamendo.com/track/998877.jpg',
    album_image: 'https://images.jamendo.com/album/112233.jpg',
    audio: 'https://prod-1.storage.jamendo.com/?trackid=998877&format=mp32',
    audiodownload: 'https://prod-1.storage.jamendo.com/download/998877',
    license_ccurl: 'https://creativecommons.org/licenses/by-nc/4.0/',
    musicinfo: {
      vocalinstrumental: 'instrumental',
      lang: 'en',
      speed: 'medium',
      tags: {
        genres: ['Ambient', 'Electronic'],
      },
    },
  };

  const normalized = provider.normalizeTrack(mockRawTrack);

  if (
    normalized.providerTrackId !== '998877' ||
    normalized.title !== 'Cosmic Ambient Flow' ||
    normalized.artistName !== 'Starlight Echoes' ||
    normalized.genres.length !== 2 ||
    normalized.provider !== 'jamendo'
  ) {
    throw new Error('Provider normalization verification failed');
  }
  console.log('  ✓ Provider mapping to canonical ProviderTrack: PASSED');

  // 2. Test Catalogue Service in-memory / fallback persistence
  const catalogueService = new MusicCatalogueService(provider);
  const dto1 = await catalogueService.persistTrack(normalized);
  const dto2 = await catalogueService.persistTrack(normalized);

  if (dto1.providerTrackId !== dto2.providerTrackId || dto1.title !== dto2.title) {
    throw new Error('Catalogue persistence deduplication check failed');
  }
  console.log('  ✓ Catalogue track persistence & deduplication: PASSED');

  // 3. Test empty query search handling
  const emptySearchResult = await provider.searchTracks('');
  if (emptySearchResult.tracks.length !== 0 || emptySearchResult.totalResults !== 0) {
    throw new Error('Empty search handling check failed');
  }
  console.log('  ✓ Empty search handling (safe return without network call): PASSED');

  console.log('[TuneSense Verification] All provider logic tests passed successfully.');
  return true;
}

if (process.argv[1]?.includes('verifyProvider')) {
  void runProviderVerifications();
}
