/**
 * Client mood taxonomy matching server moodConfig.ts.
 * Controlled 8 moods for Stage 8 personalization.
 */

export interface MoodOption {
  id: string;
  label: string;
  emoji: string;
  description: string;
}

export const MOOD_OPTIONS: MoodOption[] = [
  { id: 'happy', label: 'Happy', emoji: '☀️', description: 'Bright, cheerful & uplifting melodies' },
  { id: 'energetic', label: 'Energetic', emoji: '⚡', description: 'Driving beats & high-intensity tempo' },
  { id: 'relaxed', label: 'Relaxed', emoji: '🌿', description: 'Laid-back, mellow acoustic textures' },
  { id: 'focused', label: 'Focused', emoji: '🎯', description: 'Steady rhythms for deep work and study' },
  { id: 'romantic', label: 'Romantic', emoji: '🌹', description: 'Warm, emotional & melodic ambiance' },
  { id: 'sad', label: 'Reflective', emoji: '🌧️', description: 'Melancholic, poignant arrangements' },
  { id: 'calm', label: 'Calm', emoji: '🌊', description: 'Tranquil, peaceful sonic landscapes' },
  { id: 'nostalgic', label: 'Nostalgic', emoji: '📼', description: 'Timeless melodies evoking classic warmth' },
];

export const GENRE_OPTIONS = [
  'Electronic',
  'Ambient',
  'Rock',
  'Pop',
  'Hip Hop',
  'Jazz',
  'Classical',
  'Lo-Fi',
  'Indie',
  'Synthwave',
  'Acoustic',
  'Folk',
  'R&B',
  'Metal',
];

export const LANGUAGE_OPTIONS = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'ja', label: 'Japanese' },
  { code: 'ko', label: 'Korean' },
  { code: 'hi', label: 'Hindi' },
  { code: 'instrumental', label: 'Instrumental / No Vocals' },
];
