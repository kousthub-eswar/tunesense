/**
 * Controlled Mood Taxonomy & Acoustic Target Heuristics for TuneSense Stage 8.
 * Maps explicit user moods to acoustic feature characteristics for explainable matching.
 */

export type MoodType =
  | 'happy'
  | 'energetic'
  | 'relaxed'
  | 'focused'
  | 'romantic'
  | 'sad'
  | 'calm'
  | 'nostalgic';

export interface MoodAcousticProfile {
  name: MoodType;
  label: string;
  emoji: string;
  energy: number;          // Target energy [0, 1]
  valence: number;         // Target valence / musical positivity [0, 1]
  danceability?: number;   // Target danceability [0, 1]
  tempo?: number;          // Target tempo in BPM
  acousticness?: number;   // Target acousticness [0, 1]
  instrumentalness?: number;// Target instrumentalness [0, 1]
  description: string;
  explanationPhrase: string;
}

export const MOOD_DEFINITIONS: Record<MoodType, MoodAcousticProfile> = {
  happy: {
    name: 'happy',
    label: 'Happy',
    emoji: '☀️',
    energy: 0.75,
    valence: 0.85,
    danceability: 0.70,
    tempo: 120,
    description: 'Bright, cheerful, and uplifting melodies with high positivity',
    explanationPhrase: 'Fits your happy, upbeat mood',
  },
  energetic: {
    name: 'energetic',
    label: 'Energetic',
    emoji: '⚡',
    energy: 0.90,
    valence: 0.75,
    danceability: 0.85,
    tempo: 130,
    description: 'High-octane, driving beats with intense dynamic energy',
    explanationPhrase: 'Matches your energetic, high-intensity vibe',
  },
  relaxed: {
    name: 'relaxed',
    label: 'Relaxed',
    emoji: '🌿',
    energy: 0.30,
    valence: 0.55,
    danceability: 0.40,
    tempo: 85,
    acousticness: 0.70,
    description: 'Laid-back, mellow acoustic textures for winding down',
    explanationPhrase: 'Fits your relaxed, laid-back mood',
  },
  focused: {
    name: 'focused',
    label: 'Focused',
    emoji: '🎯',
    energy: 0.50,
    valence: 0.45,
    danceability: 0.45,
    tempo: 105,
    instrumentalness: 0.65,
    description: 'Steady, non-distracting rhythms conducive to deep work or study',
    explanationPhrase: 'Picked for your focused study and work rhythm',
  },
  romantic: {
    name: 'romantic',
    label: 'Romantic',
    emoji: '🌹',
    energy: 0.48,
    valence: 0.70,
    danceability: 0.55,
    tempo: 95,
    acousticness: 0.45,
    description: 'Warm, melodic, and emotional songs with intimate ambiance',
    explanationPhrase: 'Fits your romantic, intimate mood',
  },
  sad: {
    name: 'sad',
    label: 'Reflective / Sad',
    emoji: '🌧️',
    energy: 0.32,
    valence: 0.20,
    danceability: 0.30,
    tempo: 80,
    acousticness: 0.60,
    description: 'Melancholic, poignant arrangements with somber emotional depth',
    explanationPhrase: 'Matches your reflective, emotional mood',
  },
  calm: {
    name: 'calm',
    label: 'Calm',
    emoji: '🌊',
    energy: 0.22,
    valence: 0.50,
    danceability: 0.30,
    tempo: 75,
    acousticness: 0.80,
    instrumentalness: 0.50,
    description: 'Tranquil, peaceful sonic landscapes for mindfulness and meditation',
    explanationPhrase: 'Suits your peaceful, calming vibe',
  },
  nostalgic: {
    name: 'nostalgic',
    label: 'Nostalgic',
    emoji: '📼',
    energy: 0.52,
    valence: 0.55,
    danceability: 0.50,
    tempo: 96,
    acousticness: 0.50,
    description: 'Warm, timeless melodies that evoke fond memories and classic sounds',
    explanationPhrase: 'Evokes your nostalgic, reflective mindset',
  },
};

export const ALLOWED_MOODS: readonly MoodType[] = Object.keys(MOOD_DEFINITIONS) as MoodType[];

export function isValidMood(mood?: string | null): mood is MoodType {
  if (!mood) return false;
  return ALLOWED_MOODS.includes(mood.toLowerCase().trim() as MoodType);
}

export function getMoodProfile(mood?: string | null): MoodAcousticProfile | null {
  if (!mood || !isValidMood(mood)) return null;
  return MOOD_DEFINITIONS[mood.toLowerCase().trim() as MoodType] || null;
}
