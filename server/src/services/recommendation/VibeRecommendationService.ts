import { Song } from '../../models/Song.js';
import { getDatabaseState } from '../../config/database.js';
import { RecommendationItemDto, RecommendationResultDto } from './types.js';
import { CatalogueTrackDto } from '../music/MusicCatalogueService.js';

export interface VibeInput {
  energy: number;
  valence: number;
  danceability: number;
  limit?: number;
}

export interface VibeCandidate {
  track: CatalogueTrackDto;
  energy: number;
  valence: number;
  danceability: number;
  distance: number;
  score: number;
  reason: string;
}

export class VibeRecommendationService {
  /**
   * Generates music recommendations matching the acoustic vibe (energy, valence, danceability)
   * extracted from an uploaded image.
   */
  public async getRecommendationsByVibe(input: VibeInput): Promise<RecommendationResultDto> {
    const energy = Math.max(0, Math.min(1, input.energy));
    const valence = Math.max(0, Math.min(1, input.valence));
    const danceability = Math.max(0, Math.min(1, input.danceability));
    const limit = Math.max(1, Math.min(20, input.limit ?? 6));

    // 1. Retrieve candidates from MongoDB or fallback catalogue
    const candidates = await this.getCandidateSongs();

    // 2. Score candidates by weighted Euclidean distance
    const scoredCandidates: VibeCandidate[] = candidates.map((cand) => {
      const candEnergy = typeof cand.energy === 'number' ? cand.energy : 0.5;
      const candValence = typeof cand.valence === 'number' ? cand.valence : 0.5;
      const candDanceability = typeof cand.danceability === 'number' ? cand.danceability : 0.5;

      // Weights: energy (brightness) = 0.40, valence (warmth) = 0.40, danceability (saturation) = 0.20
      const wE = 0.40;
      const wV = 0.40;
      const wD = 0.20;

      const diffE = energy - candEnergy;
      const diffV = valence - candValence;
      const diffD = danceability - candDanceability;

      const distance = Math.sqrt(
        wE * diffE * diffE +
        wV * diffV * diffV +
        wD * diffD * diffD
      );

      const score = Math.max(0, Math.min(1, Number((1 - distance).toFixed(4))));
      const reason = this.generateVibeReason(energy, valence, danceability, candEnergy, candValence, candDanceability);

      return {
        track: cand.track,
        energy: candEnergy,
        valence: candValence,
        danceability: candDanceability,
        distance,
        score,
        reason,
      };
    });

    // 3. Rank ascending by distance (descending by score), stable tie-breaker by ID
    scoredCandidates.sort((a, b) => {
      const diff = a.distance - b.distance;
      if (Math.abs(diff) > 0.0001) return diff;
      return a.track.id.localeCompare(b.track.id);
    });

    const topK = scoredCandidates.slice(0, limit);

    // 4. Map to existing RecommendationResultDto shape
    const recommendations: RecommendationItemDto[] = topK.map((c) => ({
      song: c.track,
      score: c.score,
      reason: c.reason,
      reasonType: 'audioFeature',
      components: {
        popularity: 0.5,
        content: c.score,
        behaviour: 0.5,
        context: 0.5,
        novelty: 0.5,
        mood: c.score,
      },
    }));

    const requestId = `vibe_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    return {
      recommendationRequestId: requestId,
      strategy: 'vibe' as any,
      generatedAt: new Date().toISOString(),
      recommendations,
      confidence: 1.0,
      totalCandidatesEvaluated: scoredCandidates.length,
      activeMood: this.describeOverallMood(valence, energy),
    };
  }

  /**
   * Generates a descriptive, explainable reason string linking visual attributes to acoustic attributes.
   * e.g., "Somber, cool photo -> melancholic piano melody"
   */
  private generateVibeReason(
    photoE: number,
    photoV: number,
    photoD: number,
    songE: number,
    songV: number,
    _songD: number
  ): string {
    // 1. Visual tone descriptors based on emotional valence and energy
    let toneDesc = 'Balanced photo';
    if (photoV <= 0.35 && photoE <= 0.40) {
      toneDesc = 'Somber, melancholic photo';
    } else if (photoV <= 0.35 && photoE > 0.60) {
      toneDesc = 'Moody, intense photo';
    } else if (photoV >= 0.65 && photoE >= 0.60) {
      toneDesc = 'Vibrant, joyful photo';
    } else if (photoV >= 0.60 && photoE <= 0.40) {
      toneDesc = 'Peaceful, warm photo';
    } else if (photoV >= 0.55) {
      toneDesc = 'Warm, bright photo';
    } else if (photoV <= 0.42) {
      toneDesc = 'Cool, moody photo';
    }

    // 2. Music emotion descriptor based on acoustic attributes
    let trackVibe = 'balanced, rhythmic groove';
    if (songV <= 0.30 && songE <= 0.35) {
      trackVibe = 'somber, melancholic melody';
    } else if (songV <= 0.35 && songE > 0.65) {
      trackVibe = 'intense, brooding rhythm';
    } else if (songE >= 0.65 && songV >= 0.60) {
      trackVibe = 'upbeat, positive track';
    } else if (songE < 0.40 && songV >= 0.55) {
      trackVibe = 'gentle, soothing acoustics';
    } else if (songE < 0.45 && songV < 0.45) {
      trackVibe = 'ambient, reflective track';
    } else if (photoD >= 0.65) {
      trackVibe = 'vibrant, danceable rhythm';
    } else if (photoD <= 0.35) {
      trackVibe = 'calm, delicate texture';
    }

    return `${toneDesc} -> ${trackVibe}`;
  }

  private describeOverallMood(valence: number, energy: number): string {
    if (energy <= 0.45 && valence <= 0.42) return 'melancholic';
    if (energy >= 0.65 && valence >= 0.60) return 'energetic';
    if (energy <= 0.45 && valence >= 0.55) return 'calm';
    if (energy >= 0.60 && valence <= 0.42) return 'intense';
    if (valence >= 0.70) return 'happy';
    if (energy <= 0.40) return 'peaceful';
    return 'ambient';
  }

  /**
   * Retrieves songs from database with populated artists/albums, or supplies offline fallback tracks.
   */
  private async getCandidateSongs(): Promise<Array<{
    track: CatalogueTrackDto;
    energy: number;
    valence: number;
    danceability: number;
  }>> {
    const dbState = getDatabaseState();

    if (dbState.isConnected) {
      try {
        const songDocs = await Song.find({})
          .populate('artistIds')
          .populate('albumId')
          .limit(100)
          .lean();

        if (songDocs && songDocs.length > 0) {
          return songDocs.map((doc: any) => {
            const primaryArtist = Array.isArray(doc.artistIds) && doc.artistIds.length > 0 ? doc.artistIds[0] : null;
            const primaryAlbum = doc.albumId;
            const artistIdStr = primaryArtist ? primaryArtist._id?.toString() || primaryArtist.toString() : undefined;
            const idStr = doc._id.toString();

            const meta = doc.metadata || {};
            // If acoustic features are missing, estimate smoothly from genre or defaults
            const genreStr = (doc.genres || []).join(' ').toLowerCase();
            let defaultE = 0.55;
            let defaultV = 0.50;
            let defaultD = 0.50;

            if (genreStr.includes('electronic') || genreStr.includes('dance') || genreStr.includes('synth')) {
              defaultE = 0.82; defaultV = 0.70; defaultD = 0.75;
            } else if (genreStr.includes('ambient') || genreStr.includes('chill') || genreStr.includes('meditation')) {
              defaultE = 0.25; defaultV = 0.45; defaultD = 0.30;
            } else if (genreStr.includes('rock') || genreStr.includes('metal')) {
              defaultE = 0.88; defaultV = 0.60; defaultD = 0.52;
            } else if (genreStr.includes('classical') || genreStr.includes('piano')) {
              defaultE = 0.28; defaultV = 0.52; defaultD = 0.25;
            } else if (genreStr.includes('lofi') || genreStr.includes('acoustic')) {
              defaultE = 0.45; defaultV = 0.62; defaultD = 0.55;
            }

            const energy = typeof meta.energy === 'number' ? meta.energy : defaultE;
            const valence = typeof meta.valence === 'number' ? meta.valence : defaultV;
            const danceability = typeof meta.danceability === 'number' ? meta.danceability : defaultD;

            return {
              track: {
                id: idStr,
                title: doc.title,
                artistId: artistIdStr,
                artistName: primaryArtist && primaryArtist.name ? primaryArtist.name : 'Unknown Artist',
                albumId: primaryAlbum ? primaryAlbum._id?.toString() || primaryAlbum.toString() : undefined,
                albumTitle: primaryAlbum && primaryAlbum.title ? primaryAlbum.title : undefined,
                durationSeconds: doc.durationSeconds || 180,
                artworkUrl: doc.artworkUrl,
                genres: doc.genres || [],
                languages: doc.languages || [],
                provider: doc.provider || 'custom',
                providerTrackId: doc.providerTrackId || idStr,
              },
              energy,
              valence,
              danceability,
            };
          });
        }
      } catch (err) {
        console.warn('[VibeRecommendationService] Error reading database songs:', err);
      }
    }

    // Diverse, emotionally balanced catalogue spanning all 4 emotional quadrants
    return [
      // --- 1. SAD / MELANCHOLIC / SOMBER (Low Valence, Low/Medium Energy) ---
      {
        track: {
          id: 'vibe_sad_1',
          title: 'Tears in the Autumn Rain',
          artistId: 'artist_rostova',
          artistName: 'Elena Rostova',
          albumTitle: 'Nocturnes for Solitude',
          durationSeconds: 245,
          artworkUrl: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=400&q=80',
          streamUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3',
          genres: ['classical', 'piano', 'melancholic'],
          languages: ['instrumental'],
          provider: 'custom',
          providerTrackId: 'vsad1',
        },
        energy: 0.18,
        valence: 0.15,
        danceability: 0.14,
      },
      {
        track: {
          id: 'vibe_sad_2',
          title: 'Rain on Copper Roofs',
          artistId: 'artist_ember_days',
          artistName: 'Ember Days',
          albumTitle: 'Quiet Storms',
          durationSeconds: 220,
          artworkUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&q=80',
          streamUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3',
          genres: ['acoustic', 'folk', 'melancholic'],
          languages: ['en'],
          provider: 'custom',
          providerTrackId: 'vsad2',
        },
        energy: 0.28,
        valence: 0.20,
        danceability: 0.22,
      },
      {
        track: {
          id: 'vibe_sad_3',
          title: 'Solitary Echoes',
          artistId: 'artist_nocturne_trio',
          artistName: 'Nocturne Trio',
          albumTitle: 'Wistful Horizons',
          durationSeconds: 260,
          artworkUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&q=80',
          streamUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-12.mp3',
          genres: ['cello', 'ambient', 'sad'],
          languages: ['instrumental'],
          provider: 'custom',
          providerTrackId: 'vsad3',
        },
        energy: 0.22,
        valence: 0.18,
        danceability: 0.16,
      },
      {
        track: {
          id: 'vibe_sad_4',
          title: 'Midnight Melancholia',
          artistId: 'artist_blue_hour',
          artistName: 'Blue Hour',
          albumTitle: 'After Hours Gloom',
          durationSeconds: 235,
          artworkUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&q=80',
          streamUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
          genres: ['lofi', 'sad', 'chillout'],
          languages: ['instrumental'],
          provider: 'custom',
          providerTrackId: 'vsad4',
        },
        energy: 0.32,
        valence: 0.25,
        danceability: 0.30,
      },
      {
        track: {
          id: 'vibe_dark_1',
          title: 'Shadows of the Abyss',
          artistId: 'artist_velvet_strings',
          artistName: 'Velvet Strings',
          albumTitle: 'Abyssal Shadows',
          durationSeconds: 275,
          artworkUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&q=80',
          streamUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-11.mp3',
          genres: ['dark ambient', 'drone', 'somber'],
          languages: ['instrumental'],
          provider: 'custom',
          providerTrackId: 'vd1',
        },
        energy: 0.12,
        valence: 0.10,
        danceability: 0.12,
      },
      {
        track: {
          id: 'vibe_dark_2',
          title: 'Cimmerian Gloom',
          artistId: 'artist_obscura',
          artistName: 'Obscura Sound',
          albumTitle: 'Abyssal Shadows',
          durationSeconds: 290,
          artworkUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&q=80',
          streamUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-12.mp3',
          genres: ['ambient', 'minimalism', 'sad'],
          languages: ['instrumental'],
          provider: 'custom',
          providerTrackId: 'vd2',
        },
        energy: 0.14,
        valence: 0.10,
        danceability: 0.18,
      },
      {
        track: {
          id: 'vibe_sample_6',
          title: 'Shadow Drift',
          artistId: 'artist_vibe_6',
          artistName: 'Obscura Sound',
          albumTitle: 'Dark Matter',
          durationSeconds: 310,
          artworkUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&q=80',
          streamUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3',
          genres: ['darkwave', 'ambient'],
          languages: [],
          provider: 'custom',
          providerTrackId: 'vs6',
        },
        energy: 0.40,
        valence: 0.22,
        danceability: 0.35,
      },

      // --- 2. HAPPY / JOYFUL / UPLIFTING (High Valence, High Energy) ---
      {
        track: {
          id: 'vibe_bright_1',
          title: 'Sunburst Festival',
          artistId: 'artist_solar_echoes',
          artistName: 'Solar Echoes',
          albumTitle: 'Solar Brilliance',
          durationSeconds: 195,
          artworkUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&q=80',
          streamUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3',
          genres: ['pop', 'dance', 'happy'],
          languages: ['en'],
          provider: 'custom',
          providerTrackId: 'vb1',
        },
        energy: 0.96,
        valence: 0.94,
        danceability: 0.90,
      },
      {
        track: {
          id: 'vibe_bright_2',
          title: 'Daybreak Radiance',
          artistId: 'artist_neon_wave',
          artistName: 'Neon Wave',
          albumTitle: 'Solar Brilliance',
          durationSeconds: 210,
          artworkUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&q=80',
          streamUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3',
          genres: ['electronic', 'indie pop', 'happy'],
          languages: ['en'],
          provider: 'custom',
          providerTrackId: 'vb2',
        },
        energy: 0.91,
        valence: 0.89,
        danceability: 0.84,
      },
      {
        track: {
          id: 'vibe_sample_1',
          title: 'Sunlit Horizons',
          artistId: 'artist_vibe_1',
          artistName: 'Solar Flare',
          albumTitle: 'Golden Afternoon',
          durationSeconds: 218,
          artworkUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=400&q=80',
          streamUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
          genres: ['electronic', 'synthwave', 'upbeat'],
          languages: ['en'],
          provider: 'custom',
          providerTrackId: 'vs1',
        },
        energy: 0.88,
        valence: 0.82,
        danceability: 0.76,
      },
      {
        track: {
          id: 'vibe_sample_7',
          title: 'Golden Groove',
          artistId: 'artist_vibe_7',
          artistName: 'Velvet Funk',
          albumTitle: 'Sun Drenched',
          durationSeconds: 210,
          artworkUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&q=80',
          streamUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3',
          genres: ['funk', 'soul', 'happy'],
          languages: ['en'],
          provider: 'custom',
          providerTrackId: 'vs7',
        },
        energy: 0.72,
        valence: 0.86,
        danceability: 0.82,
      },

      // --- 3. CALM / SERENE / RELAXED (High/Mid Valence, Low Energy) ---
      {
        track: {
          id: 'vibe_sample_5',
          title: 'Gentle Nocturne',
          artistId: 'artist_vibe_5',
          artistName: 'Serene Strings',
          albumTitle: 'Whispering Strings',
          durationSeconds: 275,
          artworkUrl: 'https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=400&q=80',
          streamUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
          genres: ['classical', 'acoustic', 'calm'],
          languages: [],
          provider: 'custom',
          providerTrackId: 'vs5',
        },
        energy: 0.22,
        valence: 0.65,
        danceability: 0.25,
      },
      {
        track: {
          id: 'vibe_sample_8',
          title: 'Rainy Cafe',
          artistId: 'artist_vibe_8',
          artistName: 'Mellow Beats',
          albumTitle: 'Coffee & Rain',
          durationSeconds: 185,
          artworkUrl: 'https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=400&q=80',
          streamUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3',
          genres: ['lofi', 'jazz', 'relaxed'],
          languages: [],
          provider: 'custom',
          providerTrackId: 'vs8',
        },
        energy: 0.38,
        valence: 0.58,
        danceability: 0.54,
      },
      {
        track: {
          id: 'vibe_sample_3',
          title: 'Urban Sunset',
          artistId: 'artist_vibe_3',
          artistName: 'Synthflow',
          albumTitle: 'Metropolis Glow',
          durationSeconds: 195,
          artworkUrl: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=400&q=80',
          streamUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
          genres: ['lofi', 'chillhop'],
          languages: [],
          provider: 'custom',
          providerTrackId: 'vs3',
        },
        energy: 0.50,
        valence: 0.68,
        danceability: 0.65,
      },

      // --- 4. ENERGETIC / INTENSE / DRIVING (High Energy, Variable Valence) ---
      {
        track: {
          id: 'vibe_sample_4',
          title: 'Neon Cascade',
          artistId: 'artist_vibe_4',
          artistName: 'Kinetic Waves',
          albumTitle: 'Pulse Vector',
          durationSeconds: 230,
          artworkUrl: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=400&q=80',
          streamUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
          genres: ['electronic', 'dance', 'energetic'],
          languages: ['en'],
          provider: 'custom',
          providerTrackId: 'vs4',
        },
        energy: 0.92,
        valence: 0.58,
        danceability: 0.84,
      },
      {
        track: {
          id: 'vibe_sample_2',
          title: 'Midnight Resonance',
          artistId: 'artist_vibe_2',
          artistName: 'Luna Echo',
          albumTitle: 'Deep Hours',
          durationSeconds: 240,
          artworkUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&q=80',
          streamUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
          genres: ['ambient', 'chillout'],
          languages: [],
          provider: 'custom',
          providerTrackId: 'vs2',
        },
        energy: 0.30,
        valence: 0.35,
        danceability: 0.32,
      },
    ];
  }
}

export const vibeRecommendationService = new VibeRecommendationService();
