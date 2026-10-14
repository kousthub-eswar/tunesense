import { Song } from '../../models/Song.js';
import { getDatabaseState } from '../../config/database.js';
import { CatalogueTrackDto } from '../music/MusicCatalogueService.js';
import { GpsMoodKey } from '../../validators/journeyValidators.js';

export interface GpsMoodCoordinate {
  id: GpsMoodKey;
  label: string;
  emoji: string;
  valence: number;
  energy: number;
  description: string;
}

/**
 * Mood coordinates in 2D Valence-Energy space.
 * Includes existing 8 moods plus explicitly defined 'stressed' (0.25, 0.85) and 'calm' (0.6, 0.2).
 */
export const GPS_MOOD_PROFILES: Record<GpsMoodKey, GpsMoodCoordinate> = {
  happy: {
    id: 'happy',
    label: 'Happy',
    emoji: '☀️',
    valence: 0.85,
    energy: 0.75,
    description: 'Bright, cheerful, and uplifting positivity',
  },
  energetic: {
    id: 'energetic',
    label: 'Energetic',
    emoji: '⚡',
    valence: 0.75,
    energy: 0.90,
    description: 'High dynamic beats and intense drive',
  },
  relaxed: {
    id: 'relaxed',
    label: 'Relaxed',
    emoji: '🌿',
    valence: 0.55,
    energy: 0.30,
    description: 'Laid-back, mellow acoustic textures',
  },
  focused: {
    id: 'focused',
    label: 'Focused',
    emoji: '🎯',
    valence: 0.45,
    energy: 0.50,
    description: 'Steady, non-distracting work and study rhythms',
  },
  romantic: {
    id: 'romantic',
    label: 'Romantic',
    emoji: '🌹',
    valence: 0.70,
    energy: 0.48,
    description: 'Warm, emotional, and melodic intimacy',
  },
  sad: {
    id: 'sad',
    label: 'Reflective / Sad',
    emoji: '🌧️',
    valence: 0.20,
    energy: 0.32,
    description: 'Somber, poignant arrangements with emotional depth',
  },
  nostalgic: {
    id: 'nostalgic',
    label: 'Nostalgic',
    emoji: '📼',
    valence: 0.55,
    energy: 0.52,
    description: 'Timeless warmth evoking fond memories',
  },
  calm: {
    id: 'calm',
    label: 'Calm',
    emoji: '🌊',
    valence: 0.60,
    energy: 0.20,
    description: 'Tranquil, peaceful sonic landscapes for grounding',
  },
  stressed: {
    id: 'stressed',
    label: 'Stressed',
    emoji: '🌪️',
    valence: 0.25,
    energy: 0.85,
    description: 'High-tension dynamic agitation seeking relief',
  },
};

export interface JourneyWaypoint {
  step: number;
  totalSteps: number;
  valence: number;
  energy: number;
}

export interface JourneyStepDto {
  step: number;
  totalSteps: number;
  waypoint: JourneyWaypoint;
  song: CatalogueTrackDto;
  distance: number;
  score: number;
  reason: string;
}

export interface JourneyResultDto {
  fromMood: GpsMoodKey;
  toMood: GpsMoodKey;
  fromProfile: GpsMoodCoordinate;
  toProfile: GpsMoodCoordinate;
  steps: number;
  journey: JourneyStepDto[];
  generatedAt: string;
}

export interface JourneyServiceInput {
  fromMood: GpsMoodKey;
  toMood: GpsMoodKey;
  steps?: number;
}

export class JourneyRecommendationService {
  /**
   * Plans an emotional music journey from starting mood to target mood across N steps.
   */
  public async planJourney(input: JourneyServiceInput): Promise<JourneyResultDto> {
    const fromProfile = GPS_MOOD_PROFILES[input.fromMood] || GPS_MOOD_PROFILES.stressed;
    const toProfile = GPS_MOOD_PROFILES[input.toMood] || GPS_MOOD_PROFILES.calm;
    const steps = Math.max(3, Math.min(10, input.steps ?? 5));

    // 1. Interpolate evenly spaced waypoints along the line in (valence, energy) space
    const waypoints: JourneyWaypoint[] = [];
    for (let i = 0; i < steps; i++) {
      const t = steps > 1 ? i / (steps - 1) : 0;
      const v = Number((fromProfile.valence + t * (toProfile.valence - fromProfile.valence)).toFixed(2));
      const e = Number((fromProfile.energy + t * (toProfile.energy - fromProfile.energy)).toFixed(2));

      waypoints.push({
        step: i + 1,
        totalSteps: steps,
        valence: v,
        energy: e,
      });
    }

    // 2. Fetch candidate songs from database or fallback catalogue
    const candidates = await this.getCandidateSongs();

    // 3. Greedily match nearest song for each waypoint under constraints:
    //    - no repeats (distinct song IDs)
    //    - max 1 per artist (distinct artist IDs / artist names)
    const usedSongIds = new Set<string>();
    const usedArtists = new Set<string>();
    const journey: JourneyStepDto[] = [];

    for (let i = 0; i < waypoints.length; i++) {
      const wp = waypoints[i];
      const prevWp = i > 0 ? waypoints[i - 1] : null;

      // Score all candidates by Euclidean distance to this waypoint
      interface ScoredCandidate {
        track: CatalogueTrackDto;
        energy: number;
        valence: number;
        distance: number;
        artistKey: string;
      }

      const scoredList: ScoredCandidate[] = candidates.map((cand) => {
        const cEnergy = cand.energy;
        const cValence = cand.valence;
        const diffV = wp.valence - cValence;
        const diffE = wp.energy - cEnergy;
        const distance = Math.sqrt(diffV * diffV + diffE * diffE);
        const artistKey = (cand.track.artistId || cand.track.artistName).toLowerCase().trim();

        return {
          track: cand.track,
          energy: cEnergy,
          valence: cValence,
          distance,
          artistKey,
        };
      });

      // Sort by closest distance
      scoredList.sort((a, b) => a.distance - b.distance);

      // Filter obeying constraints: no repeated song, max 1 per artist
      let chosen = scoredList.find(
        (c) => !usedSongIds.has(c.track.id) && !usedArtists.has(c.artistKey)
      );

      // Fallback: If catalogue is too small to enforce unique artists, relax artist constraint but maintain unique song
      if (!chosen) {
        chosen = scoredList.find((c) => !usedSongIds.has(c.track.id));
      }

      // Absolute emergency fallback if catalogue has fewer songs than steps
      if (!chosen) {
        chosen = scoredList[0];
      }

      if (chosen) {
        usedSongIds.add(chosen.track.id);
        usedArtists.add(chosen.artistKey);

        const reason = this.generateStepReason(
          wp.step,
          steps,
          prevWp,
          wp,
          fromProfile,
          toProfile
        );

        const score = Math.max(0, Math.min(1, Number((1 - chosen.distance).toFixed(4))));

        journey.push({
          step: wp.step,
          totalSteps: steps,
          waypoint: wp,
          song: chosen.track,
          distance: Number(chosen.distance.toFixed(4)),
          score,
          reason,
        });
      }
    }

    return {
      fromMood: input.fromMood,
      toMood: input.toMood,
      fromProfile,
      toProfile,
      steps,
      journey,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Generates explainable step reason such as:
   * "Step 2 of 5: easing energy from 0.85 to 0.70 while lifting mood"
   */
  private generateStepReason(
    step: number,
    totalSteps: number,
    prevWp: JourneyWaypoint | null,
    currWp: JourneyWaypoint,
    fromProfile: GpsMoodCoordinate,
    toProfile: GpsMoodCoordinate
  ): string {
    if (step === 1 || !prevWp) {
      return `Step 1 of ${totalSteps}: Starting at ${currWp.energy.toFixed(2)} energy and ${currWp.valence.toFixed(2)} mood (${fromProfile.label})`;
    }

    if (step === totalSteps) {
      const energyWord = currWp.energy > prevWp.energy ? 'reaching peak energy' : 'settling into low energy';
      return `Step ${step} of ${totalSteps}: ${energyWord} at ${currWp.energy.toFixed(2)} and landing at ${toProfile.label} (${currWp.valence.toFixed(2)} mood)`;
    }

    const diffE = currWp.energy - prevWp.energy;
    const diffV = currWp.valence - prevWp.valence;

    let energyPhrase: string;
    if (diffE <= -0.04) {
      energyPhrase = `easing energy from ${prevWp.energy.toFixed(2)} to ${currWp.energy.toFixed(2)}`;
    } else if (diffE >= 0.04) {
      energyPhrase = `lifting energy from ${prevWp.energy.toFixed(2)} to ${currWp.energy.toFixed(2)}`;
    } else {
      energyPhrase = `sustaining energy at ${currWp.energy.toFixed(2)}`;
    }

    let moodPhrase: string;
    if (diffV >= 0.04) {
      moodPhrase = 'while lifting mood';
    } else if (diffV <= -0.04) {
      moodPhrase = 'while grounding emotional mood';
    } else {
      moodPhrase = 'with balanced emotional tone';
    }

    return `Step ${step} of ${totalSteps}: ${energyPhrase} ${moodPhrase}`;
  }

  /**
   * Retrieves songs from database with populated artists/albums, or supplies offline fallback tracks.
   */
  private async getCandidateSongs(): Promise<
    Array<{
      track: CatalogueTrackDto;
      energy: number;
      valence: number;
    }>
  > {
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
            const primaryArtist =
              Array.isArray(doc.artistIds) && doc.artistIds.length > 0
                ? doc.artistIds[0]
                : null;
            const primaryAlbum = doc.albumId;
            const artistIdStr = primaryArtist
              ? primaryArtist._id?.toString() || primaryArtist.toString()
              : undefined;
            const idStr = doc._id.toString();

            const meta = doc.metadata || {};
            const defaultE = 0.5;
            const defaultV = 0.5;

            const energy = typeof meta.energy === 'number' ? meta.energy : defaultE;
            const valence = typeof meta.valence === 'number' ? meta.valence : defaultV;

            return {
              track: {
                id: idStr,
                providerTrackId: doc.providerTrackId || idStr,
                title: doc.title,
                artistName: primaryArtist?.name || doc.artistName || 'Unknown Artist',
                artistId: artistIdStr,
                albumTitle: primaryAlbum?.title || doc.albumTitle,
                albumId: primaryAlbum?._id?.toString(),
                durationSeconds: doc.durationSeconds || meta.duration || 210,
                artworkUrl:
                  doc.artworkUrl ||
                  primaryAlbum?.coverImageUrl ||
                  'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&q=80',
                streamUrl: doc.audioUrl,
                genres: doc.genres || [],
                languages: doc.languages || ['en'],
                provider: 'local',
              },
              energy,
              valence,
            };
          });
        }
      } catch (err) {
        console.warn('[JourneyRecommendationService] Failed to query Mongo songs, using fallback catalogue:', err);
      }
    }

    // Offline / Standalone Fallback Catalogue with rich distribution across (valence, energy) space
    return [
      {
        track: {
          id: 'gps_song_1',
          providerTrackId: 'gps_p_1',
          title: 'Solar Flare Groove',
          artistName: 'Aura Nova',
          artistId: 'artist_aura_nova',
          durationSeconds: 215,
          artworkUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&q=80',
          streamUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
          genres: ['Synthwave', 'Electronic'],
          languages: ['en'],
          provider: 'demo',
        },
        energy: 0.90,
        valence: 0.82,
      },
      {
        track: {
          id: 'gps_song_2',
          providerTrackId: 'gps_p_2',
          title: 'Deep Midnight Drift',
          artistName: 'Kallisto',
          artistId: 'artist_kallisto',
          durationSeconds: 260,
          artworkUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=300&q=80',
          streamUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
          genres: ['Ambient', 'Lo-Fi'],
          languages: ['en'],
          provider: 'demo',
        },
        energy: 0.22,
        valence: 0.25,
      },
      {
        track: {
          id: 'gps_song_3',
          providerTrackId: 'gps_p_3',
          title: 'Oceanic Horizon',
          artistName: 'Tidal Waves',
          artistId: 'artist_tidal_waves',
          durationSeconds: 245,
          artworkUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=300&q=80',
          streamUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
          genres: ['Chillout', 'Acoustic'],
          languages: ['en'],
          provider: 'demo',
        },
        energy: 0.20,
        valence: 0.62,
      },
      {
        track: {
          id: 'gps_song_4',
          providerTrackId: 'gps_p_4',
          title: 'Kinetic Highway',
          artistName: 'Overdrive Club',
          artistId: 'artist_overdrive_club',
          durationSeconds: 198,
          artworkUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=300&q=80',
          streamUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
          genres: ['Rock', 'Electro'],
          languages: ['en'],
          provider: 'demo',
        },
        energy: 0.86,
        valence: 0.28,
      },
      {
        track: {
          id: 'gps_song_5',
          providerTrackId: 'gps_p_5',
          title: 'Morning Bloom',
          artistName: 'Solana Echo',
          artistId: 'artist_solana_echo',
          durationSeconds: 185,
          artworkUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&q=80',
          streamUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
          genres: ['Pop', 'Indie'],
          languages: ['en'],
          provider: 'demo',
        },
        energy: 0.72,
        valence: 0.85,
      },
      {
        track: {
          id: 'gps_song_6',
          providerTrackId: 'gps_p_6',
          title: 'Rain on Copper Roofs',
          artistName: 'Ember Days',
          artistId: 'artist_ember_days',
          durationSeconds: 220,
          artworkUrl: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=300&q=80',
          streamUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3',
          genres: ['Acoustic', 'Folk'],
          languages: ['en'],
          provider: 'demo',
        },
        energy: 0.32,
        valence: 0.22,
      },
      {
        track: {
          id: 'gps_song_7',
          providerTrackId: 'gps_p_7',
          title: 'Steady Focus Pulse',
          artistName: 'Monochrome',
          artistId: 'artist_monochrome',
          durationSeconds: 230,
          artworkUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&q=80',
          streamUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3',
          genres: ['Minimalist', 'Electronic'],
          languages: ['en'],
          provider: 'demo',
        },
        energy: 0.52,
        valence: 0.46,
      },
      {
        track: {
          id: 'gps_song_8',
          providerTrackId: 'gps_p_8',
          title: 'Twilight Reverie',
          artistName: 'Luna Bay',
          artistId: 'artist_luna_bay',
          durationSeconds: 205,
          artworkUrl: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=300&q=80',
          streamUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3',
          genres: ['Lo-Fi', 'Chillhop'],
          languages: ['en'],
          provider: 'demo',
        },
        energy: 0.42,
        valence: 0.58,
      },
      {
        track: {
          id: 'gps_song_9',
          providerTrackId: 'gps_p_9',
          title: 'Cascade of Light',
          artistName: 'Prism Sound',
          artistId: 'artist_prism_sound',
          durationSeconds: 225,
          artworkUrl: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=300&q=80',
          streamUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3',
          genres: ['House', 'Dance'],
          languages: ['en'],
          provider: 'demo',
        },
        energy: 0.68,
        valence: 0.72,
      },
      {
        track: {
          id: 'gps_song_10',
          providerTrackId: 'gps_p_10',
          title: 'Serene Meadow',
          artistName: 'Forest Whisper',
          artistId: 'artist_forest_whisper',
          durationSeconds: 240,
          artworkUrl: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=300&q=80',
          streamUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3',
          genres: ['Ambient', 'Nature'],
          languages: ['en'],
          provider: 'demo',
        },
        energy: 0.25,
        valence: 0.65,
      },
      {
        track: {
          id: 'gps_song_11',
          providerTrackId: 'gps_p_11',
          title: 'Tension Release',
          artistName: 'Vortex Unit',
          artistId: 'artist_vortex_unit',
          durationSeconds: 195,
          artworkUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&q=80',
          streamUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-11.mp3',
          genres: ['Electronic', 'Breakbeat'],
          languages: ['en'],
          provider: 'demo',
        },
        energy: 0.78,
        valence: 0.40,
      },
      {
        track: {
          id: 'gps_song_12',
          providerTrackId: 'gps_p_12',
          title: 'Velvet Afternoon',
          artistName: 'Silk & Strings',
          artistId: 'artist_silk_strings',
          durationSeconds: 210,
          artworkUrl: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=300&q=80',
          streamUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-12.mp3',
          genres: ['Soul', 'R&B'],
          languages: ['en'],
          provider: 'demo',
        },
        energy: 0.45,
        valence: 0.68,
      },
    ];
  }
}

export const journeyRecommendationService = new JourneyRecommendationService();
