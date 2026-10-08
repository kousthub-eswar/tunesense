import { TrackMetadata, RecommendationMetadata } from '../types/index.js';

/**
 * Stage 1 Isolated Visual Fixtures
 * These fixtures are strictly for visual foundation and UI demonstration in Stage 1.
 * They will be cleanly replaced with live provider and recommendation services in subsequent stages.
 */
export const MOCK_FEATURED_RECOMMENDATIONS: RecommendationMetadata[] = [
  {
    id: 'rec-1',
    title: 'Midnight Resonance',
    subtitle: 'Electronic / Ambient Vibe',
    reason: 'Matches late-night focus sessions',
    confidenceScore: 0.94,
    tags: ['Electronic', 'Chill', 'Focus'],
  },
  {
    id: 'rec-2',
    title: 'Acoustic Horizons',
    subtitle: 'Neo-Folk & Indie Strings',
    reason: 'Similar acoustic timbre to your recent likes',
    confidenceScore: 0.88,
    tags: ['Acoustic', 'Indie', 'Warm'],
  },
  {
    id: 'rec-3',
    title: 'Urban Synthesis',
    subtitle: 'Lo-Fi Chillhop Beats',
    reason: 'Aligns with your morning study rhythm',
    confidenceScore: 0.91,
    tags: ['Lo-Fi', 'Beat', 'Relax'],
  },
];

export const MOCK_RECENT_TRACKS: TrackMetadata[] = [
  {
    id: 'track-1',
    title: 'Cosmic Drift',
    artist: 'Astral Wave',
    album: 'Zero Gravity',
    durationSeconds: 214,
  },
  {
    id: 'track-2',
    title: 'Neon Horizon',
    artist: 'Synthflow',
    album: 'Retro Metropolis',
    durationSeconds: 188,
  },
  {
    id: 'track-3',
    title: 'Ethereal Shadows',
    artist: 'Luna Pulse',
    album: 'Midnight Echoes',
    durationSeconds: 245,
  },
];

export const MOCK_VIBE_CHIPS = [
  { label: 'Deep Focus', variant: 'brand' as const },
  { label: 'Late Night', variant: 'cyan' as const },
  { label: 'Energetic Gym', variant: 'amber' as const },
  { label: 'Acoustic Calm', variant: 'emerald' as const },
  { label: 'Melancholic Drift', variant: 'rose' as const },
];
