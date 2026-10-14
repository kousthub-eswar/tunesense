import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera,
  Upload,
  Sparkles,
  Play,
  RotateCcw,
  Music2,
  Palette,
  Sun,
  Flame,
  Activity,
  AlertCircle,
  Disc,
} from 'lucide-react';
import { PageContainer } from '../components/layout/PageContainer.js';
import { Card } from '../components/ui/Card.js';
import { Button } from '../components/ui/Button.js';
import { Badge } from '../components/ui/Badge.js';
import { SongCard } from '../components/music/SongCard.js';
import { useAudioPlayer } from '../contexts/AudioPlayerContext.js';
import { recommendationService } from '../services/recommendationService.js';
import { RecommendationItemDto } from '../types/index.js';

interface ExtractedVibe {
  brightness: number;   // 0 - 1
  warmth: number;       // 0 - 1
  saturation: number;   // 0 - 1
  energy: number;       // acoustic intensity (0 - 1)
  valence: number;      // emotional positivity vs sorrow (0 - 1)
  danceability: number; // rhythmic movement (0 - 1)
  dominantColors: string[]; // 3 hex codes
  emotionKey: string;
  emotionLabel: string;
  emotionEmoji: string;
  emotionDescription: string;
}

export interface EmotionPreset {
  key: string;
  label: string;
  emoji: string;
  vibe: { valence: number; energy: number; danceability: number };
  description: string;
}

export const EMOTION_PRESETS: EmotionPreset[] = [
  {
    key: 'melancholic',
    label: 'Sad / Melancholic',
    emoji: '🌧️',
    vibe: { valence: 0.16, energy: 0.22, danceability: 0.15 },
    description: 'Somber solo piano, rainy cello, and quiet acoustic sorrow',
  },
  {
    key: 'wistful',
    label: 'Reflective / Wistful',
    emoji: '🥀',
    vibe: { valence: 0.28, energy: 0.35, danceability: 0.28 },
    description: 'Slow rainy lo-fi, muted strings, and midnight contemplation',
  },
  {
    key: 'peaceful',
    label: 'Calm / Serene',
    emoji: '🌿',
    vibe: { valence: 0.55, energy: 0.28, danceability: 0.35 },
    description: 'Meditative ambient, gentle nature flow, and soft serenity',
  },
  {
    key: 'joyful',
    label: 'Happy / Joyful',
    emoji: '☀️',
    vibe: { valence: 0.88, energy: 0.78, danceability: 0.75 },
    description: 'Bright pop melodies, positive acoustic drive, and sunshine vibes',
  },
  {
    key: 'energetic',
    label: 'High Energy / Club',
    emoji: '⚡',
    vibe: { valence: 0.80, energy: 0.92, danceability: 0.88 },
    description: 'Pulsing synths, fast driving beats, and electric grooves',
  },
];

export function detectEmotionFromAcoustics(valence: number, energy: number): {
  key: string;
  label: string;
  emoji: string;
  description: string;
} {
  if (valence <= 0.35 && energy <= 0.45) {
    return {
      key: 'melancholic',
      label: 'Sad & Melancholic',
      emoji: '🌧️',
      description: 'Somber solo piano, rainy cello, and gentle acoustic sorrow',
    };
  } else if (valence <= 0.42 && energy <= 0.60) {
    return {
      key: 'wistful',
      label: 'Reflective & Wistful',
      emoji: '🥀',
      description: 'Slow lo-fi, muted strings, and midnight contemplation',
    };
  } else if (valence >= 0.65 && energy >= 0.60) {
    return {
      key: 'joyful',
      label: 'Joyful & Uplifting',
      emoji: '☀️',
      description: 'Bright pop melodies, positive acoustic drive, and sunshine vibes',
    };
  } else if (energy >= 0.70) {
    return {
      key: 'energetic',
      label: 'High Energy & Dynamic',
      emoji: '⚡',
      description: 'Pulsing synths, fast rhythms, and electric dance grooves',
    };
  } else if (valence >= 0.45 && valence <= 0.65 && energy <= 0.50) {
    return {
      key: 'peaceful',
      label: 'Calm & Peaceful',
      emoji: '🌿',
      description: 'Meditative ambient, gentle nature flow, and soft lo-fi',
    };
  } else {
    return {
      key: 'atmospheric',
      label: 'Atmospheric & Moody',
      emoji: '🌌',
      description: 'Deep textured soundscapes and balanced sonic aesthetics',
    };
  }
}

const PRESET_VIBES = [
  {
    name: 'Rainy Melancholy',
    tag: 'Sad & Somber',
    previewColor: '#475569',
    url: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=400&q=80',
  },
  {
    name: 'Sunset Glow',
    tag: 'Warm & Vibrant',
    previewColor: '#f97316',
    url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&q=80',
  },
  {
    name: 'Neon Cyber',
    tag: 'Electric & Driving',
    previewColor: '#8b5cf6',
    url: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=400&q=80',
  },
  {
    name: 'Misty Woods',
    tag: 'Cool & Ambient',
    previewColor: '#065f46',
    url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=400&q=80',
  },
];

export const PhotoMusicPage: React.FC = () => {
  const { playTrack, setQueue, currentTrack, isPlaying } = useAudioPlayer();

  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [extractedVibe, setExtractedVibe] = useState<ExtractedVibe | null>(null);
  const [animatedMeters, setAnimatedMeters] = useState({ energy: 0, valence: 0, danceability: 0 });
  const [recommendations, setRecommendations] = useState<RecommendationItemDto[]>([]);
  const [isLoadingRecs, setIsLoadingRecs] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Smooth meter animation when vibe is extracted
  useEffect(() => {
    if (extractedVibe) {
      const timer = setTimeout(() => {
        setAnimatedMeters({
          energy: extractedVibe.energy,
          valence: extractedVibe.valence,
          danceability: extractedVibe.danceability,
        });
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setAnimatedMeters({ energy: 0, valence: 0, danceability: 0 });
    }
  }, [extractedVibe]);

  /**
   * Client-side visual analysis:
   * Downscales to 64x64 on an offscreen canvas and computes:
   * - brightness (0-1)
   * - warmth ((avgR - avgB)/255 mapped to 0-1)
   * - saturation (0-1)
   * - 3 dominant colors via simple RGB bucketing
   */
  const processImage = useCallback(async (imgElement: HTMLImageElement) => {
    setIsProcessing(true);
    setError(null);

    try {
      const canvas = canvasRef.current || document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        throw new Error('Canvas 2D context is not available.');
      }

      ctx.clearRect(0, 0, 64, 64);
      ctx.drawImage(imgElement, 0, 0, 64, 64);

      const imgData = ctx.getImageData(0, 0, 64, 64);
      const data = imgData.data;
      const pixelCount = 64 * 64;

      let totalBrightness = 0;
      let totalR = 0;
      let totalB = 0;
      let totalSaturation = 0;

      // Color bucketing: 32-step buckets (8 levels per channel = 512 bins)
      const colorBuckets = new Map<string, { r: number; g: number; b: number; count: number }>();

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];

        if (a < 128) continue; // Skip transparent pixels

        // 1. Brightness: standard perceived luminance (ITU-R BT.601)
        const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        totalBrightness += lum;

        // 2. Warmth components (R vs B)
        totalR += r;
        totalB += b;

        // 3. Saturation: HSL saturation calculation
        const max = Math.max(r, g, b) / 255;
        const min = Math.min(r, g, b) / 255;
        const delta = max - min;
        const lightness = (max + min) / 2;
        let s = 0;
        if (delta > 0.001) {
          s = lightness > 0.5 ? delta / (2 - 2 * lightness) : delta / (2 * lightness);
        }
        totalSaturation += s;

        // 4. Color bucketing: round channels to bucket centers
        const binR = Math.floor(r / 32) * 32 + 16;
        const binG = Math.floor(g / 32) * 32 + 16;
        const binB = Math.floor(b / 32) * 32 + 16;
        const key = `${binR},${binG},${binB}`;

        const existing = colorBuckets.get(key);
        if (existing) {
          existing.count += 1;
        } else {
          colorBuckets.set(key, { r: binR, g: binG, b: binB, count: 1 });
        }
      }

      const avgBrightness = Math.max(0, Math.min(1, totalBrightness / pixelCount));
      const avgR = totalR / pixelCount;
      const avgB = totalB / pixelCount;

      // Warmth: ((avgR - avgB) / 255) mapped from [-1, 1] to [0, 1]
      const rawWarmthDiff = (avgR - avgB) / 255;
      const avgWarmth = Math.max(0, Math.min(1, (rawWarmthDiff + 1) / 2));
      const avgSaturation = Math.max(0, Math.min(1, totalSaturation / pixelCount));

      // Extract top 3 dominant colors with perceptual diversity
      const sortedBuckets = Array.from(colorBuckets.values()).sort((a, b) => b.count - a.count);
      const dominantHexes: string[] = [];

      for (const bucket of sortedBuckets) {
        if (dominantHexes.length >= 3) break;

        // Ensure distinctness from already selected colors (Euclidean distance > 40)
        const isDistinct = dominantHexes.every((hex) => {
          const parsed = parseInt(hex.slice(1), 16);
          const pr = (parsed >> 16) & 255;
          const pg = (parsed >> 8) & 255;
          const pb = parsed & 255;
          const dist = Math.sqrt(
            Math.pow(bucket.r - pr, 2) + Math.pow(bucket.g - pg, 2) + Math.pow(bucket.b - pb, 2)
          );
          return dist > 40;
        });

        if (isDistinct || dominantHexes.length === 0) {
          const hex = `#${((1 << 24) + (bucket.r << 16) + (bucket.g << 8) + bucket.b)
            .toString(16)
            .slice(1)}`;
          dominantHexes.push(hex);
        }
      }

      // Safe fallback if palette is monochromatic
      while (dominantHexes.length < 3) {
        dominantHexes.push(dominantHexes[0] || '#10b981');
      }

      // --- Calibrated Visual-to-Emotion Mapping ---
      // Visual psychology principles:
      // 1. Sadness / Melancholy is visually indicated by desaturation (grayscale / muted colors),
      //    cool or neutral color temperatures (blue/gray > warm red), and subdued brightness/shadows.
      // 2. Joy / Happiness is visually indicated by warm tones (red/yellow/amber), high luminance, and high saturation.
      // 3. Energy / Excitement is driven by vibrancy and brightness.
      
      let computedValence = 0.50;
      // Warmth contribution: warm (+0.35 max), cool (-0.35 max)
      computedValence += rawWarmthDiff * 0.70;
      // Luminance contribution: bright (+0.20 max), dark (-0.20 max)
      computedValence += (avgBrightness - 0.50) * 0.40;

      // Saturation contribution: desaturated/grayscale drops valence sharply into sad zone
      if (avgSaturation < 0.32) {
        const desatDrop = (0.32 - avgSaturation) * 1.5; // up to 0.48 drop
        computedValence -= desatDrop;
      } else {
        computedValence += (avgSaturation - 0.50) * 0.35;
      }

      // Additional emotional cues: cool + desaturated or dim + desaturated = melancholy
      if (rawWarmthDiff <= 0.05 && avgSaturation <= 0.35) {
        computedValence -= 0.12;
      }
      if (avgBrightness <= 0.45 && avgSaturation <= 0.35) {
        computedValence -= 0.10;
      }

      const valence = Math.max(0.08, Math.min(0.96, computedValence));

      // Energy calculation:
      let computedEnergy = (avgBrightness * 0.55) + (avgSaturation * 0.45);
      if (valence < 0.32) {
        // Melancholic / sad photos evoke quiet, subdued acoustic tone
        computedEnergy = Math.min(computedEnergy, 0.35);
      }
      const energy = Math.max(0.10, Math.min(0.96, computedEnergy));

      // Danceability calculation:
      let computedDanceability = (avgSaturation * 0.60) + (avgBrightness * 0.40);
      if (valence < 0.32) {
        computedDanceability = Math.min(computedDanceability, 0.25);
      }
      const danceability = Math.max(0.08, Math.min(0.95, computedDanceability));

      const emotion = detectEmotionFromAcoustics(valence, energy);

      const vibe: ExtractedVibe = {
        brightness: avgBrightness,
        warmth: avgWarmth,
        saturation: avgSaturation,
        energy,
        valence,
        danceability,
        dominantColors: dominantHexes,
        emotionKey: emotion.key,
        emotionLabel: emotion.label,
        emotionEmoji: emotion.emoji,
        emotionDescription: emotion.description,
      };

      setExtractedVibe(vibe);
      setIsProcessing(false);

      // Query recommendations matching the vibe
      await fetchVibeRecommendations(vibe);
    } catch (err: any) {
      console.error('[PhotoMusicPage] Image processing error:', err);
      setError(err.message || 'Failed to analyze photo. Please try a different image.');
      setIsProcessing(false);
    }
  }, []);

  const handleSelectEmotion = (preset: EmotionPreset) => {
    if (!extractedVibe) return;
    const updatedVibe: ExtractedVibe = {
      ...extractedVibe,
      energy: preset.vibe.energy,
      valence: preset.vibe.valence,
      danceability: preset.vibe.danceability,
      emotionKey: preset.key,
      emotionLabel: preset.label,
      emotionEmoji: preset.emoji,
      emotionDescription: preset.description,
    };
    setExtractedVibe(updatedVibe);
    fetchVibeRecommendations(updatedVibe);
  };

  const fetchVibeRecommendations = async (vibe: ExtractedVibe) => {
    setIsLoadingRecs(true);
    setError(null);
    try {
      const res = await recommendationService.getRecommendationsByVibe({
        energy: vibe.energy,
        valence: vibe.valence,
        danceability: vibe.danceability,
        limit: 6,
        dominantColors: vibe.dominantColors,
      });

      setRecommendations(res.recommendations || []);
    } catch (err: any) {
      console.error('[PhotoMusicPage] Recommendation error:', err);
      setError(err.message || 'Unable to fetch recommendations for this vibe.');
      setRecommendations([]);
    } finally {
      setIsLoadingRecs(false);
    }
  };

  const prevObjectUrlRef = useRef<string | null>(null);

  const loadImageFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please upload or paste a valid image file (PNG, JPG, WebP).');
      return;
    }

    setError(null);
    setIsProcessing(true);

    // Clean up previous blob URL to prevent memory leaks
    if (prevObjectUrlRef.current) {
      URL.revokeObjectURL(prevObjectUrlRef.current);
    }

    // Instant zero-delay object URL (no base64 FileReader blocking)
    const objectUrl = URL.createObjectURL(file);
    prevObjectUrlRef.current = objectUrl;
    setImageSrc(objectUrl);

    const img = new Image();
    img.onload = () => {
      processImage(img);
    };
    img.onerror = () => {
      setError('Failed to load this image file. Please try another.');
      setIsProcessing(false);
    };
    img.src = objectUrl;
  }, [processImage]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      loadImageFile(file);
    }
  };

  // Clipboard Paste Support (Cmd+V on Mac / Ctrl+V on Windows)
  useEffect(() => {
    const handleWindowPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            loadImageFile(file);
            return;
          }
        }
      }
    };

    window.addEventListener('paste', handleWindowPaste);
    return () => {
      window.removeEventListener('paste', handleWindowPaste);
    };
  }, [loadImageFile]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only set dragging false if leaving window/container
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      loadImageFile(file);
    }
  };

  const handlePresetClick = (presetUrl: string) => {
    setImageSrc(presetUrl);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => processImage(img);
    img.onerror = () => {
      setError('Could not read external image CORS. Please upload or paste a local file.');
    };
    img.src = presetUrl;
  };

  const handleReset = () => {
    if (prevObjectUrlRef.current) {
      URL.revokeObjectURL(prevObjectUrlRef.current);
      prevObjectUrlRef.current = null;
    }
    setImageSrc(null);
    setExtractedVibe(null);
    setRecommendations([]);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handlePlaySong = (song: any, index: number) => {
    playTrack(song, {
      recommendationStrategy: 'by-vibe',
      recommendationPosition: index + 1,
    });
  };

  const handlePlayAll = () => {
    if (recommendations.length === 0) return;
    const tracks = recommendations.map((r) => r.song);
    setQueue(tracks, 0, { recommendationStrategy: 'by-vibe' });
  };

  // Dynamic ambient background transition to photo's dominant colors
  const dominantColors = extractedVibe?.dominantColors || [];
  const primaryAccent = dominantColors[0] || '#3D3BF3';

  // Signature moment: Color field smoothly changes when photo is uploaded
  useEffect(() => {
    if (dominantColors.length >= 2) {
      document.documentElement.style.setProperty('--field-a', dominantColors[0]);
      document.documentElement.style.setProperty('--field-b', dominantColors[1]);
    } else if (dominantColors.length === 1) {
      document.documentElement.style.setProperty('--field-a', dominantColors[0]);
    }
    return () => {
      document.documentElement.style.setProperty('--field-a', '#3D3BF3');
      document.documentElement.style.setProperty('--field-b', '#C77DFF');
    };
  }, [dominantColors]);

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="min-h-screen text-ink relative"
    >
      {/* Hidden offscreen canvas for 64x64 pixel extraction */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Full-screen drag overlay when hovering with an image file */}
      {isDragging && (
        <div className="fixed inset-0 z-50 bg-ultramarine/25 backdrop-blur-md border-4 border-dashed border-ultramarine flex flex-col items-center justify-center pointer-events-none animate-in fade-in duration-150">
          <Upload className="w-14 h-14 text-white mb-3 animate-bounce" />
          <p className="text-lg font-bold text-white drop-shadow">
            Drop image here to analyze vibe instantly
          </p>
        </div>
      )}

      {/* Hidden global file input always accessible */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      <PageContainer className="py-6 sm:py-8 max-w-5xl">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center transition-colors duration-700 motion-reduce:transition-none"
                style={{ backgroundColor: `${primaryAccent}20`, color: primaryAccent }}
              >
                <Camera className="w-4 h-4" />
              </div>
              <Badge
                variant="neutral"
                size="sm"
                className="transition-colors duration-700 motion-reduce:transition-none"
                style={{
                  backgroundColor: `${primaryAccent}15`,
                  color: primaryAccent,
                  borderColor: `${primaryAccent}30`,
                }}
              >
                Visual synesthesia
              </Badge>
            </div>
            <h1 className="font-display text-scale-28 sm:text-scale-44 font-bold tracking-tight text-ink">
              Photo to music
            </h1>
            <p className="text-scale-16 text-ink/65 mt-1">
              Drop or paste an image (<kbd className="font-mono bg-black/5 dark:bg-white/10 px-1.5 py-0.5 rounded text-xs">Cmd+V</kbd>) to instantly extract energy, warmth, and saturation.
            </p>
          </div>

          {extractedVibe && (
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="gap-2 text-content-primary"
              >
                <Upload className="w-3.5 h-3.5" />
                Choose Another
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="gap-2 text-content-secondary hover:text-content-primary"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </Button>
            </div>
          )}
        </div>

        {error && (
          <Card className="mb-6 p-4 border-rose-500/30 bg-rose-500/10 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="text-sm text-rose-200 flex-1">{error}</div>
          </Card>
        )}

        {/* Upload State / Inactive View */}
        {!imageSrc ? (
          <div className="space-y-6">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="relative border-2 border-dashed border-surface-border hover:border-ultramarine/60 bg-surface/40 hover:bg-surface/70 rounded-2xl p-8 sm:p-14 text-center cursor-pointer transition-all duration-300"
            >
              <div className="w-16 h-16 rounded-2xl bg-surface border border-surface-border flex items-center justify-center mx-auto mb-4 text-ultramarine shadow-sm group-hover:scale-105 transition-transform">
                <Upload className="w-7 h-7" />
              </div>

              <h2 className="text-lg font-semibold text-content-primary mb-1">
                Upload, paste, or drop an image
              </h2>
              <p className="text-xs sm:text-sm text-content-secondary max-w-md mx-auto mb-5">
                Paste from clipboard (<kbd className="font-mono bg-black/10 dark:bg-white/10 px-1.5 py-0.5 rounded text-[11px] font-semibold">Cmd+V</kbd> / <kbd className="font-mono bg-black/10 dark:bg-white/10 px-1.5 py-0.5 rounded text-[11px] font-semibold">Ctrl+V</kbd>), drop any image file, or click to browse.
              </p>

              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-ultramarine text-white font-semibold text-xs shadow-md hover:bg-ultramarine-hover transition-colors">
                <Camera className="w-4 h-4" />
                Browse Photo
              </div>
            </div>

            {/* Presets Row */}
            <div>
              <p className="text-xs uppercase font-bold tracking-wider text-content-muted mb-3 px-1">
                Or pick an aesthetic preset:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {PRESET_VIBES.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => handlePresetClick(preset.url)}
                    className="flex items-center gap-3 p-3 rounded-xl bg-surface/50 hover:bg-surface border border-surface-border text-left transition-all hover:scale-[1.01]"
                  >
                    <div
                      className="w-10 h-10 rounded-lg shrink-0 border border-white/10"
                      style={{ backgroundColor: preset.previewColor }}
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-content-primary truncate">
                        {preset.name}
                      </div>
                      <div className="text-[11px] text-content-muted truncate">
                        {preset.tag}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Active Extracted Vibe View */
          <div className="space-y-8">
            {/* Top Analysis Grid: Photo Preview + Dominant Palette + 3 Meters */}
            <Card className="p-5 sm:p-6 bg-surface/60 backdrop-blur-md border-surface-border/80 shadow-xl">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                {/* Photo Preview */}
                <div className="md:col-span-4 flex flex-col items-center">
                  <div
                    className="relative w-44 h-44 sm:w-48 sm:h-48 rounded-2xl overflow-hidden border-2 shadow-lg transition-colors duration-1000 motion-reduce:transition-none"
                    style={{ borderColor: `${primaryAccent}60`, boxShadow: `0 12px 30px -10px ${primaryAccent}40` }}
                  >
                    <img
                      src={imageSrc}
                      alt="Uploaded vibe"
                      className="w-full h-full object-cover"
                    />

                    {/* Detected Emotion Badge Overlay */}
                    {extractedVibe && !isProcessing && (
                      <div className="absolute top-2 left-2 z-10 px-2.5 py-1 rounded-full bg-black/80 backdrop-blur-md border border-white/20 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md">
                        <span>{extractedVibe.emotionEmoji}</span>
                        <span className="truncate max-w-[130px]">{extractedVibe.emotionLabel}</span>
                      </div>
                    )}

                    {isProcessing && (
                      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center text-xs text-white gap-2">
                        <Disc className="w-4 h-4 animate-spin" />
                        Analyzing vibe & emotion...
                      </div>
                    )}
                  </div>

                  {/* Dominant Palette Swatches */}
                  {dominantColors.length > 0 && (
                    <div className="mt-3 flex items-center gap-2">
                      <Palette className="w-3.5 h-3.5 text-content-muted" />
                      <div className="flex gap-1.5">
                        {dominantColors.map((color, idx) => (
                          <div
                            key={idx}
                            title={color}
                            className="w-5 h-5 rounded-md border border-white/20 shadow-sm cursor-help hover:scale-110 transition-transform"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Extracted Acoustic Meters */}
                <div className="md:col-span-8 flex flex-col justify-center space-y-4">
                  <div className="border-b border-surface-border/60 pb-2 flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-bold text-content-primary tracking-tight">
                        Extracted Acoustic & Emotional Features
                      </h2>
                      <p className="text-[11px] text-content-secondary">
                        In-browser affective computer vision & 3D Euclidean matching
                      </p>
                    </div>
                    {extractedVibe && (
                      <span className="text-[11px] font-mono text-content-muted">
                        3-feature Euclidean match
                      </span>
                    )}
                  </div>

                  {/* Meter 1: Energy (Intensity) */}
                  <div>
                    <div className="flex justify-between items-center text-xs mb-1">
                      <div className="flex items-center gap-1.5 font-medium text-content-primary">
                        <Sun className="w-3.5 h-3.5 text-amber-400" />
                        <span>Energy (Acoustic Drive)</span>
                      </div>
                      <span className="font-mono font-bold text-xs" style={{ color: dominantColors[0] || '#f59e0b' }}>
                        {Math.round((extractedVibe?.energy ?? 0) * 100)}%
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-1000 ease-out motion-reduce:transition-none"
                        style={{
                          width: `${animatedMeters.energy * 100}%`,
                          backgroundColor: dominantColors[0] || '#f59e0b',
                        }}
                      />
                    </div>
                    <p className="text-[10px] text-content-muted mt-0.5">
                      {extractedVibe && extractedVibe.energy >= 0.65
                        ? 'High dynamic power -> driving beats and vibrant rhythm'
                        : extractedVibe && extractedVibe.energy <= 0.35
                        ? 'Low luminance & muted tone -> quiet, gentle acoustic atmosphere'
                        : 'Balanced lighting -> moderate acoustic drive'}
                    </p>
                  </div>

                  {/* Meter 2: Mood / Valence (Emotional Positivity vs Sadness) */}
                  <div>
                    <div className="flex justify-between items-center text-xs mb-1">
                      <div className="flex items-center gap-1.5 font-medium text-content-primary">
                        <Flame className="w-3.5 h-3.5 text-rose-400" />
                        <span>Emotional Mood (Valence: Positivity vs Sorrow)</span>
                      </div>
                      <span className="font-mono font-bold text-xs" style={{ color: dominantColors[1] || '#f43f5e' }}>
                        {Math.round((extractedVibe?.valence ?? 0) * 100)}%
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-1000 ease-out motion-reduce:transition-none"
                        style={{
                          width: `${animatedMeters.valence * 100}%`,
                          backgroundColor: dominantColors[1] || '#f43f5e',
                        }}
                      />
                    </div>
                    <p className="text-[10px] text-content-muted mt-0.5">
                      {extractedVibe && extractedVibe.valence >= 0.65
                        ? 'Warm color temperature & vivid light -> uplifting, joyful happiness'
                        : extractedVibe && extractedVibe.valence <= 0.35
                        ? 'Desaturated / cool / somber tones -> melancholy, sadness, and wistful solitude'
                        : 'Neutral harmonic balance -> peaceful, contemplative state'}
                    </p>
                  </div>

                  {/* Meter 3: Rhythm / Danceability (Saturation) */}
                  <div>
                    <div className="flex justify-between items-center text-xs mb-1">
                      <div className="flex items-center gap-1.5 font-medium text-content-primary">
                        <Activity className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Rhythm (Vibrancy & Danceability)</span>
                      </div>
                      <span className="font-mono font-bold text-xs" style={{ color: dominantColors[2] || '#10b981' }}>
                        {Math.round((extractedVibe?.danceability ?? 0) * 100)}%
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-1000 ease-out motion-reduce:transition-none"
                        style={{
                          width: `${animatedMeters.danceability * 100}%`,
                          backgroundColor: dominantColors[2] || '#10b981',
                        }}
                      />
                    </div>
                    <p className="text-[10px] text-content-muted mt-0.5">
                      {extractedVibe && extractedVibe.danceability >= 0.60
                        ? 'Vivid saturated hues -> rhythmic danceability'
                        : 'Muted or sad palette -> slow, flowing acoustic movement'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Interactive Emotion Bar: Fine-tuning & Emotion Override */}
              <div className="mt-5 pt-4 border-t border-surface-border/80 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-content-primary flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      Detected Emotion:
                    </span>
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-brand-500/15 text-brand-400 border border-brand-500/30 flex items-center gap-1">
                      {extractedVibe?.emotionEmoji} {extractedVibe?.emotionLabel}
                    </span>
                  </div>
                  <p className="text-[11px] text-content-secondary mt-1">
                    {extractedVibe?.emotionDescription}
                  </p>
                </div>

                {/* Quick Emotion Switch Pills */}
                <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                  <span className="text-[11px] text-content-muted mr-1">Switch emotion:</span>
                  {EMOTION_PRESETS.map((preset) => {
                    const isActive = extractedVibe?.emotionKey === preset.key;
                    return (
                      <button
                        key={preset.key}
                        type="button"
                        onClick={() => handleSelectEmotion(preset)}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all flex items-center gap-1 border ${
                          isActive
                            ? 'bg-brand-500 text-white border-brand-400 shadow-sm'
                            : 'bg-surface/90 hover:bg-surface-secondary text-content-primary border-surface-border hover:border-brand-500/50'
                        }`}
                      >
                        <span>{preset.emoji}</span>
                        <span>{preset.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </Card>

            {/* Recommendations Section */}
            <div>
              <div className="flex items-center justify-between mb-4 px-1">
                <div className="flex items-center gap-2">
                  <Music2 className="w-4 h-4 text-brand-400" />
                  <h2 className="text-base sm:text-lg font-bold text-content-primary">
                    Vibe-Matched Recommendations
                  </h2>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-content-secondary font-mono">
                    Top {recommendations.length}
                  </span>
                </div>

                {recommendations.length > 0 && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handlePlayAll}
                    className="gap-1.5"
                    style={{ backgroundColor: primaryAccent, color: '#FFFFFF' }}
                  >
                    <Play className="w-3.5 h-3.5 fill-white text-white" />
                    Play All
                  </Button>
                )}
              </div>

              {isLoadingRecs ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[1, 2, 3, 4, 5, 6].map((idx) => (
                      <div
                        key={idx}
                        className="h-28 rounded-2xl bg-surface/40 border border-surface-border/60 animate-pulse p-3 flex flex-col justify-between"
                      >
                        <div className="flex gap-3 items-center">
                          <div className="w-12 h-12 rounded-xl bg-surface-secondary/70 shrink-0" />
                          <div className="space-y-2 flex-1">
                            <div className="h-3 w-3/4 bg-surface-secondary/70 rounded" />
                            <div className="h-2.5 w-1/2 bg-surface-secondary/50 rounded" />
                          </div>
                        </div>
                        <div className="h-2 w-full bg-surface-secondary/30 rounded" />
                      </div>
                    ))}
                  </div>
                  <p className="text-center text-xs text-content-muted pt-2 font-medium">
                    Calculating 3-feature weighted Euclidean distance for your photo's energy, warmth, and saturation...
                  </p>
                </div>
              ) : recommendations.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {recommendations.map((rec, index) => {
                    const isTrackActive = currentTrack?.id === rec.song.id;
                    return (
                      <div
                        key={rec.song.id}
                        className="flex flex-col gap-1.5 p-1 rounded-2xl bg-surface/40 border border-surface-border/60 hover:border-surface-border transition-all"
                      >
                        <SongCard
                          track={rec.song}
                          isActive={isTrackActive}
                          isPlaying={isTrackActive && isPlaying}
                          onPlay={() => handlePlaySong(rec.song, index)}
                          className="bg-transparent border-0 hover:bg-surface/80"
                        />

                        {/* Reason badge connecting visual tone to track attributes */}
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-secondary/70 border border-surface-border/40 text-[11px] text-content-secondary">
                          <Sparkles
                            className="w-3.5 h-3.5 shrink-0"
                            style={{ color: primaryAccent }}
                          />
                          <span className="truncate font-medium">{rec.reason}</span>
                          <span className="ml-auto text-[10px] font-mono text-content-muted shrink-0">
                            Match {Math.round((rec.score || 0.8) * 100)}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <Card className="p-8 text-center bg-surface/40 border-surface-border text-content-secondary">
                  <Camera className="w-8 h-8 text-brand-400 mx-auto mb-2 opacity-70" />
                  <h3 className="text-sm font-bold text-content-primary mb-1">No Matching Tracks Found</h3>
                  <p className="text-xs text-content-muted max-w-sm mx-auto mb-4">
                    No songs in the catalogue matched this visual tone. Try uploading an image with higher lighting contrast or pick an aesthetic preset.
                  </p>
                  <Button variant="secondary" size="sm" onClick={handleReset}>
                    Upload Another Photo
                  </Button>
                </Card>
              )}
            </div>
          </div>
        )}
      </PageContainer>
    </div>
  );
};
