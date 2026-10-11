/**
 * Client mood taxonomy matching server moodConfig.ts.
 * Controlled 8 moods for Stage 8 personalization.
 */

import {
  Sun,
  Zap,
  Feather,
  Target,
  Heart,
  CloudRain,
  Moon,
  Radio,
  type LucideIcon,
} from 'lucide-react';

export interface MoodOption {
  id: string;
  label: string;
  icon: LucideIcon;
  description: string;
}

export const MOOD_OPTIONS: MoodOption[] = [
  { id: 'happy', label: 'Happy', icon: Sun, description: 'Bright, cheerful & uplifting melodies' },
  { id: 'energetic', label: 'Energetic', icon: Zap, description: 'Driving beats & high-intensity tempo' },
  { id: 'relaxed', label: 'Relaxed', icon: Feather, description: 'Laid-back, mellow acoustic textures' },
  { id: 'focused', label: 'Focused', icon: Target, description: 'Steady rhythms for deep work and study' },
  { id: 'romantic', label: 'Romantic', icon: Heart, description: 'Warm, emotional & melodic ambiance' },
  { id: 'sad', label: 'Reflective', icon: CloudRain, description: 'Melancholic, poignant arrangements' },
  { id: 'calm', label: 'Calm', icon: Moon, description: 'Tranquil, peaceful sonic landscapes' },
  { id: 'nostalgic', label: 'Nostalgic', icon: Radio, description: 'Timeless melodies evoking classic warmth' },
];

export const MOOD_ICON_MAP: Record<string, LucideIcon> = {
  happy: Sun,
  energetic: Zap,
  relaxed: Feather,
  focused: Target,
  romantic: Heart,
  sad: CloudRain,
  calm: Moon,
  nostalgic: Radio,
};

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
