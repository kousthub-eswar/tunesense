import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Navigation,
  Compass,
  Play,
  Sparkles,
  RotateCcw,
  Info,
} from 'lucide-react';
import { PageContainer } from '../components/layout/PageContainer.js';
import { Card } from '../components/ui/Card.js';
import { Button } from '../components/ui/Button.js';
import { Badge } from '../components/ui/Badge.js';
import { SongCard } from '../components/music/SongCard.js';
import { useAudioPlayer } from '../contexts/AudioPlayerContext.js';
import { recommendationService } from '../services/recommendationService.js';
import { TrackItem } from '../types/index.js';

export interface GpsMoodOption {
  id: string;
  label: string;
  emoji: string;
  valence: number;
  energy: number;
  description: string;
  color: string;
}

/**
 * 9 Controlled Mood Profiles for Emotional GPS:
 * Stressed (0.25, 0.85) + Calm (0.60, 0.20) + 7 harmonic landmarks
 */
export const GPS_MOODS: GpsMoodOption[] = [
  {
    id: 'stressed',
    label: 'Stressed',
    emoji: '🌪️',
    valence: 0.25,
    energy: 0.85,
    description: 'High tension & dynamic agitation seeking relief',
    color: '#EF4444',
  },
  {
    id: 'calm',
    label: 'Calm',
    emoji: '🌊',
    valence: 0.60,
    energy: 0.20,
    description: 'Tranquil & peaceful grounding landscape',
    color: '#10B981',
  },
  {
    id: 'happy',
    label: 'Happy',
    emoji: '☀️',
    valence: 0.85,
    energy: 0.75,
    description: 'Bright, cheerful, and uplifting positivity',
    color: '#F59E0B',
  },
  {
    id: 'energetic',
    label: 'Energetic',
    emoji: '⚡',
    valence: 0.75,
    energy: 0.90,
    description: 'Driving beats & high dynamic intensity',
    color: '#F97316',
  },
  {
    id: 'relaxed',
    label: 'Relaxed',
    emoji: '🌿',
    valence: 0.55,
    energy: 0.30,
    description: 'Laid-back, mellow acoustic textures',
    color: '#14B8A6',
  },
  {
    id: 'focused',
    label: 'Focused',
    emoji: '🎯',
    valence: 0.45,
    energy: 0.50,
    description: 'Steady rhythms for deep work & study',
    color: '#3B82F6',
  },
  {
    id: 'romantic',
    label: 'Romantic',
    emoji: '🌹',
    valence: 0.70,
    energy: 0.48,
    description: 'Warm, emotional & melodic intimacy',
    color: '#EC4899',
  },
  {
    id: 'sad',
    label: 'Reflective',
    emoji: '🌧️',
    valence: 0.20,
    energy: 0.32,
    description: 'Melancholic, somber emotional depth',
    color: '#6366F1',
  },
  {
    id: 'nostalgic',
    label: 'Nostalgic',
    emoji: '📼',
    valence: 0.55,
    energy: 0.52,
    description: 'Timeless melodies evoking classic warmth',
    color: '#A855F7',
  },
];

export interface JourneyPreset {
  id: string;
  name: string;
  from: string;
  to: string;
  emoji: string;
  subtitle: string;
}

export const JOURNEY_PRESETS: JourneyPreset[] = [
  {
    id: 'stressed-calm',
    name: 'Tension Relief (Iso Principle)',
    from: 'stressed',
    to: 'calm',
    emoji: '🌪️ ➔ 🌊',
    subtitle: 'From agitation to serene grounding',
  },
  {
    id: 'sad-happy',
    name: 'Mood Elevator',
    from: 'sad',
    to: 'happy',
    emoji: '🌧️ ➔ ☀️',
    subtitle: 'Gentle climb from sorrow to joy',
  },
  {
    id: 'relaxed-energetic',
    name: 'Energy Booster',
    from: 'relaxed',
    to: 'energetic',
    emoji: '🌿 ➔ ⚡',
    subtitle: 'From mellow chill to dynamic drive',
  },
  {
    id: 'focused-romantic',
    name: 'Evening Wind-down',
    from: 'focused',
    to: 'romantic',
    emoji: '🎯 ➔ 🌹',
    subtitle: 'From work mode to warm intimacy',
  },
];

export interface JourneyWaypoint {
  step: number;
  totalSteps: number;
  valence: number;
  energy: number;
}

export interface JourneyStep {
  step: number;
  totalSteps: number;
  waypoint: JourneyWaypoint;
  song: TrackItem;
  distance: number;
  score: number;
  reason: string;
}

export interface JourneyResult {
  fromMood: string;
  toMood: string;
  fromProfile: GpsMoodOption;
  toProfile: GpsMoodOption;
  steps: number;
  journey: JourneyStep[];
}

export const EmotionalGpsPage: React.FC = () => {
  const { playTrack, setQueue, currentTrack, isPlaying } = useAudioPlayer();

  const [fromMood, setFromMood] = useState<string>('stressed');
  const [toMood, setToMood] = useState<string>('calm');
  const [isPlanning, setIsPlanning] = useState<boolean>(false);
  const [journeyData, setJourneyData] = useState<JourneyResult | null>(null);
  const [activeStep, setActiveStep] = useState<number | null>(null);
  const [hoveredStep, setHoveredStep] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRouteAnimated, setIsRouteAnimated] = useState<boolean>(false);
  const [selectedMapMood, setSelectedMapMood] = useState<GpsMoodOption | null>(null);

  const songCardRefs = useRef<Record<number, HTMLDivElement | null>>({});

  // Active profiles
  const fromProfile = useMemo(
    () => GPS_MOODS.find((m) => m.id === fromMood) || GPS_MOODS[0],
    [fromMood]
  );
  const toProfile = useMemo(
    () => GPS_MOODS.find((m) => m.id === toMood) || GPS_MOODS[1],
    [toMood]
  );

  // SVG Coordinate mapping:
  // Map dimensions: width = 720, height = 440
  // Margins: left: 75, right: 65, top: 50, bottom: 65
  const SVG_WIDTH = 720;
  const SVG_HEIGHT = 440;
  const PAD_LEFT = 75;
  const PAD_RIGHT = 65;
  const PAD_TOP = 50;
  const PAD_BOTTOM = 65;
  const CHART_WIDTH = SVG_WIDTH - PAD_LEFT - PAD_RIGHT;
  const CHART_HEIGHT = SVG_HEIGHT - PAD_TOP - PAD_BOTTOM;

  const mapX = (valence: number) => PAD_LEFT + valence * CHART_WIDTH;
  const mapY = (energy: number) => PAD_TOP + (1 - energy) * CHART_HEIGHT;

  // Plan journey callback
  const handlePlanJourney = useCallback(
    async (startMood = fromMood, endMood = toMood) => {
      if (startMood === endMood) {
        setError('Please select two different emotional states to navigate between them.');
        return;
      }

      setIsPlanning(true);
      setError(null);
      setIsRouteAnimated(false);

      try {
        const data = await recommendationService.getJourneyRecommendations({
          fromMood: startMood,
          toMood: endMood,
          steps: 5,
        });

        setJourneyData(data);
        setActiveStep(null);

        // Trigger path animation
        setTimeout(() => {
          setIsRouteAnimated(true);
        }, 50);
      } catch (err: any) {
        console.error('[EmotionalGpsPage] Failed to plan journey:', err);
        setError(err.message || 'Failed to calculate emotional journey. Please try again.');
      } finally {
        setIsPlanning(false);
      }
    },
    [fromMood, toMood]
  );

  // Reactive updates: whenever fromMood or toMood changes, immediately re-plot the journey!
  useEffect(() => {
    handlePlanJourney(fromMood, toMood);
  }, [fromMood, toMood, handlePlanJourney]);

  const handleSwapMoods = () => {
    const currentFrom = fromMood;
    const currentTo = toMood;
    setFromMood(currentTo);
    setToMood(currentFrom);
  };

  const handleSelectPreset = (preset: JourneyPreset) => {
    setFromMood(preset.from);
    setToMood(preset.to);
  };

  const handleStepClick = (stepNumber: number) => {
    setActiveStep((prev) => (prev === stepNumber ? null : stepNumber));
    // Scroll smoothly to song card
    const cardEl = songCardRefs.current[stepNumber];
    if (cardEl) {
      cardEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  const handlePlayJourney = () => {
    if (!journeyData || journeyData.journey.length === 0) return;
    const tracks = journeyData.journey.map((item) => item.song);
    setQueue(tracks, 0, { recommendationStrategy: 'emotional-gps' });
  };

  const handlePlaySingle = (song: TrackItem, index: number) => {
    playTrack(song, {
      recommendationStrategy: 'emotional-gps',
      recommendationPosition: index + 1,
    });
  };

  // Compute SVG straight line path string directly between origin and destination
  const routePathD = useMemo(() => {
    const x1 = mapX(fromProfile.valence);
    const y1 = mapY(fromProfile.energy);
    const x2 = mapX(toProfile.valence);
    const y2 = mapY(toProfile.energy);
    return `M ${x1} ${y1} L ${x2} ${y2}`;
  }, [fromProfile, toProfile]);

  // Signature moment: Color field smoothly changes between fromMood and toMood
  useEffect(() => {
    if (fromProfile?.color && toProfile?.color) {
      document.documentElement.style.setProperty('--field-a', fromProfile.color);
      document.documentElement.style.setProperty('--field-b', toProfile.color);
    }
    return () => {
      document.documentElement.style.setProperty('--field-a', '#3D3BF3');
      document.documentElement.style.setProperty('--field-b', '#C77DFF');
    };
  }, [fromProfile?.color, toProfile?.color]);

  return (
    <div className="min-h-screen text-ink pb-20">
      <PageContainer className="pt-6 sm:pt-8 px-4 sm:px-6 space-y-8">
        {/* Header Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-black/5 pb-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-full bg-ultramarine/10 text-ultramarine flex items-center justify-center shadow-sm">
                <Navigation className="w-5 h-5 transform -rotate-45" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-display text-scale-28 sm:text-scale-44 font-bold tracking-tight text-ink">
                    Emotional GPS
                  </h1>
                  <Badge variant="neutral" size="sm" className="font-mono text-[11px]">
                    Waypoint guidance
                  </Badge>
                </div>
                <p className="text-scale-16 text-ink/65 mt-0.5">
                  Navigate smoothly from where you are emotionally to where you want to be through music.
                </p>
              </div>
            </div>
          </div>

          {/* Action Trigger */}
          <div className="flex items-center gap-3">
            <Button
              variant="primary"
              size="md"
              onClick={() => handlePlanJourney(fromMood, toMood)}
              disabled={isPlanning}
              className="gap-2 shadow-lg shadow-brand-500/10"
            >
              {isPlanning ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-bg-main border-t-transparent animate-spin" />
                  <span>Planning route...</span>
                </>
              ) : (
                <>
                  <Compass className="w-4 h-4" />
                  <span>Plan my journey</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Iso Principle & Innovation Explainer Banner */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-ultramarine/10 via-brand-500/10 to-teal-500/10 border border-ultramarine/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-ultramarine/20 text-ultramarine flex items-center justify-center shrink-0 mt-0.5">
              <Info className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-content-primary">
                  Navigation for Emotions: The Iso Principle
                </h3>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-ultramarine/20 text-ultramarine font-semibold">
                  Music Therapy
                </span>
              </div>
              <p className="text-xs text-content-secondary mt-1 leading-relaxed">
                Jumping straight from stressful music to calm music is jarring and ineffective. Emotional GPS uses the <strong>iso principle</strong>: matching your current emotional state first (Stop 1), then smoothly easing energy and lifting mood across 5 harmonic stops toward your destination.
              </p>
            </div>
          </div>
          <div className="text-xs font-mono text-content-muted shrink-0 bg-surface/80 px-3.5 py-2 rounded-xl border border-surface-border">
            “Plans a route from where you are to where you want to be.”
          </div>
        </div>

        {/* Quick Route Presets */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-content-secondary uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-brand-400" />
              Quick Emotion Routes:
            </span>
            <span className="text-[11px] text-content-muted">
              Click any route to update map instantly
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {JOURNEY_PRESETS.map((p) => {
              const isSelected = fromMood === p.from && toMood === p.to;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelectPreset(p)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'bg-brand-500/15 border-brand-400 text-brand-400 shadow-sm ring-1 ring-brand-400/40'
                      : 'bg-surface/70 hover:bg-surface border-surface-border hover:border-brand-500/40 text-content-primary'
                  }`}
                >
                  <div className="text-xs font-bold flex items-center gap-1.5 truncate">
                    <span>{p.emoji}</span>
                    <span className="truncate">{p.name}</span>
                  </div>
                  <div className="text-[11px] text-content-muted truncate mt-0.5">
                    {p.subtitle}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Mood Selectors: "I feel" and "I want to feel" */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          {/* Selector 1: Starting State */}
          <Card className="md:col-span-5 p-4 sm:p-5 bg-surface/70 border-surface-border/80 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-content-muted uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: fromProfile.color }} />
                Origin (I feel)
              </span>
              <span className="text-xs font-medium text-content-secondary font-mono">
                Valence: {Math.round(fromProfile.valence * 100)}% • Energy: {Math.round(fromProfile.energy * 100)}%
              </span>
            </div>

            <label htmlFor="from-mood-select" className="block text-sm font-bold text-content-primary mb-2">
              Start Point:
            </label>
            <div className="relative">
              <select
                id="from-mood-select"
                value={fromMood}
                onChange={(e) => setFromMood(e.target.value)}
                className="w-full bg-surface-secondary/80 text-content-primary border border-surface-border rounded-xl px-3.5 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/40 cursor-pointer appearance-none"
              >
                {GPS_MOODS.map((mood) => (
                  <option key={mood.id} value={mood.id} className="bg-bg-main text-content-primary">
                    {mood.emoji} {mood.label} (Valence: {mood.valence}, Energy: {mood.energy})
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-content-muted">
                ▼
              </div>
            </div>
            <p className="text-[11px] text-content-secondary mt-2 flex items-center gap-1">
              <span>{fromProfile.emoji}</span>
              <span>{fromProfile.description}</span>
            </p>
          </Card>

          {/* Swap Button Divider */}
          <div className="md:col-span-2 flex justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSwapMoods}
              className="rounded-full w-11 h-11 p-0 flex items-center justify-center border-surface-border hover:bg-surface-secondary text-content-secondary hover:text-content-primary transition-all shadow-sm"
              title="Reverse journey direction"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>

          {/* Selector 2: Destination State */}
          <Card className="md:col-span-5 p-4 sm:p-5 bg-surface/70 border-surface-border/80 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-content-muted uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: toProfile.color }} />
                Destination (I want to feel)
              </span>
              <span className="text-xs font-medium text-content-secondary font-mono">
                Valence: {Math.round(toProfile.valence * 100)}% • Energy: {Math.round(toProfile.energy * 100)}%
              </span>
            </div>

            <label htmlFor="to-mood-select" className="block text-sm font-bold text-content-primary mb-2">
              End Point:
            </label>
            <div className="relative">
              <select
                id="to-mood-select"
                value={toMood}
                onChange={(e) => setToMood(e.target.value)}
                className="w-full bg-surface-secondary/80 text-content-primary border border-surface-border rounded-xl px-3.5 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/40 cursor-pointer appearance-none"
              >
                {GPS_MOODS.map((mood) => (
                  <option key={mood.id} value={mood.id} className="bg-bg-main text-content-primary">
                    {mood.emoji} {mood.label} (Valence: {mood.valence}, Energy: {mood.energy})
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-content-muted">
                ▼
              </div>
            </div>
            <p className="text-[11px] text-content-secondary mt-2 flex items-center gap-1">
              <span>{toProfile.emoji}</span>
              <span>{toProfile.description}</span>
            </p>
          </Card>
        </div>

        {error && (
          <Card className="p-4 bg-red-500/10 border-red-500/20 text-red-400 text-xs sm:text-sm rounded-xl">
            {error}
          </Card>
        )}

        {/* SVG Emotional GPS Map Section */}
        <Card className="p-5 sm:p-6 bg-surface/50 border-surface-border/80 rounded-3xl overflow-hidden relative backdrop-blur-md shadow-xl">
          {/* Header toolbar within map */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <Compass className="w-5 h-5 text-brand-400" />
                <h2 className="text-base sm:text-lg font-bold text-content-primary">
                  Valence-Energy Emotional Navigation Map
                </h2>
              </div>
              <p className="text-xs text-content-secondary mt-0.5">
                Straight line joined from <strong>{fromProfile.label}</strong> to <strong>{toProfile.label}</strong>, divided into 5 evenly spaced stops.
              </p>
            </div>

            {journeyData && journeyData.journey.length > 0 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handlePlayJourney}
                  className="gap-2 shrink-0 bg-ultramarine text-white hover:bg-ultramarine-hover font-semibold shadow-md"
                >
                  <Play className="w-3.5 h-3.5 fill-white text-white" />
                  Play 5-step journey
                </Button>
              </div>
            )}
          </div>

          {/* SVG Canvas Map */}
          <div className="w-full aspect-[16/10] max-h-[460px] bg-[#0c0d14] rounded-2xl border border-surface-border/80 relative overflow-hidden select-none shadow-inner">
            <svg
              viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
              className="w-full h-full"
              style={{ overflow: 'visible' }}
            >
              <defs>
                {/* Linear gradient along the route line */}
                <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={fromProfile.color} />
                  <stop offset="100%" stopColor={toProfile.color} />
                </linearGradient>

                {/* Subtle grid pattern */}
                <pattern id="grid" width="28" height="28" patternUnits="userSpaceOnUse">
                  <path d="M 28 0 L 0 0 0 28" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                </pattern>

                {/* Glow filter */}
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3.5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Background Grid */}
              <rect x={PAD_LEFT} y={PAD_TOP} width={CHART_WIDTH} height={CHART_HEIGHT} fill="url(#grid)" />

              {/* 4 Colored Emotional Quadrants */}
              {/* Q1: Top-Left (Tension / High Energy + Somber) */}
              <rect
                x={PAD_LEFT}
                y={PAD_TOP}
                width={CHART_WIDTH / 2}
                height={CHART_HEIGHT / 2}
                fill="rgba(239, 68, 68, 0.04)"
              />
              {/* Q2: Top-Right (Joy / High Energy + Positive) */}
              <rect
                x={mapX(0.5)}
                y={PAD_TOP}
                width={CHART_WIDTH / 2}
                height={CHART_HEIGHT / 2}
                fill="rgba(245, 158, 11, 0.04)"
              />
              {/* Q3: Bottom-Left (Melancholy / Low Energy + Somber) */}
              <rect
                x={PAD_LEFT}
                y={mapY(0.5)}
                width={CHART_WIDTH / 2}
                height={CHART_HEIGHT / 2}
                fill="rgba(99, 102, 241, 0.04)"
              />
              {/* Q4: Bottom-Right (Calm / Low Energy + Positive) */}
              <rect
                x={mapX(0.5)}
                y={mapY(0.5)}
                width={CHART_WIDTH / 2}
                height={CHART_HEIGHT / 2}
                fill="rgba(16, 185, 129, 0.04)"
              />

              {/* Center Quadrant Crosshairs (Valence = 0.5, Energy = 0.5) */}
              <line
                x1={mapX(0.5)}
                y1={PAD_TOP}
                x2={mapX(0.5)}
                y2={PAD_TOP + CHART_HEIGHT}
                stroke="rgba(255,255,255,0.15)"
                strokeDasharray="4 4"
                strokeWidth="1.2"
              />
              <line
                x1={PAD_LEFT}
                y1={mapY(0.5)}
                x2={PAD_LEFT + CHART_WIDTH}
                y2={mapY(0.5)}
                stroke="rgba(255,255,255,0.15)"
                strokeDasharray="4 4"
                strokeWidth="1.2"
              />

              {/* Quadrant High-Contrast Titles */}
              <text x={PAD_LEFT + 14} y={PAD_TOP + 20} fill="#f87171" fontSize="11" fontWeight="700" fontFamily="sans-serif">
                ⚡ HIGH ENERGY • 🌪️ TENSION / STRESS
              </text>
              <text x={PAD_LEFT + CHART_WIDTH - 14} y={PAD_TOP + 20} textAnchor="end" fill="#fbbf24" fontSize="11" fontWeight="700" fontFamily="sans-serif">
                ⚡ HIGH ENERGY • ☀️ JOY / EUPHORIA
              </text>
              <text x={PAD_LEFT + 14} y={PAD_TOP + CHART_HEIGHT - 12} fill="#818cf8" fontSize="11" fontWeight="700" fontFamily="sans-serif">
                🌊 LOW ENERGY • 🌧️ MELANCHOLY / REFLECTIVE
              </text>
              <text x={PAD_LEFT + CHART_WIDTH - 14} y={PAD_TOP + CHART_HEIGHT - 12} textAnchor="end" fill="#34d399" fontSize="11" fontWeight="700" fontFamily="sans-serif">
                🌊 LOW ENERGY • 🌿 PEACE / CALM
              </text>

              {/* Axes Labels */}
              <text
                x={PAD_LEFT + CHART_WIDTH / 2}
                y={SVG_HEIGHT - 18}
                textAnchor="middle"
                fill="rgba(255,255,255,0.8)"
                fontSize="12"
                fontWeight="600"
                fontFamily="sans-serif"
              >
                ← Somber / Low Valence | Mood / Valence (Emotional Positivity) | High Valence / Joyful →
              </text>
              <text
                x={22}
                y={PAD_TOP + CHART_HEIGHT / 2}
                textAnchor="middle"
                fill="rgba(255,255,255,0.8)"
                fontSize="12"
                fontWeight="600"
                fontFamily="sans-serif"
                transform={`rotate(-90 22 ${PAD_TOP + CHART_HEIGHT / 2})`}
              >
                Low Energy / Calm ↑ Energy (Acoustic Intensity) ↑ High Dynamic Drive
              </text>

              {/* Benchmark Mood Points Across the 2D Map (Clickable to set Start or Goal) */}
              {GPS_MOODS.map((mood) => {
                const mx = mapX(mood.valence);
                const my = mapY(mood.energy);
                const isOrigin = mood.id === fromMood;
                const isTarget = mood.id === toMood;

                if (isOrigin || isTarget) return null; // Drawn as Stops on the route

                return (
                  <g
                    key={mood.id}
                    className="cursor-pointer group"
                    onClick={() => setSelectedMapMood(selectedMapMood?.id === mood.id ? null : mood)}
                  >
                    <circle
                      cx={mx}
                      cy={my}
                      r={5}
                      fill={mood.color}
                      fillOpacity="0.75"
                      className="transition-transform group-hover:scale-150"
                    />
                    <text
                      x={mx}
                      y={my - 9}
                      textAnchor="middle"
                      fill="rgba(255,255,255,0.65)"
                      fontSize="10"
                      fontWeight="600"
                      fontFamily="sans-serif"
                      className="group-hover:fill-white transition-colors"
                    >
                      {mood.emoji} {mood.label}
                    </text>
                  </g>
                );
              })}

              {/* The Joined Straight Navigation Line between Start and Goal */}
              <line
                x1={mapX(fromProfile.valence)}
                y1={mapY(fromProfile.energy)}
                x2={mapX(toProfile.valence)}
                y2={mapY(toProfile.energy)}
                stroke="rgba(255,255,255,0.18)"
                strokeWidth="2"
                strokeDasharray="6 4"
              />

              <path
                d={routePathD}
                fill="none"
                stroke="url(#routeGradient)"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#glow)"
                style={{
                  strokeDasharray: 1000,
                  strokeDashoffset: isRouteAnimated ? 0 : 1000,
                  transition: 'stroke-dashoffset 0.9s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
                className="motion-reduce:transition-none"
              />

              {/* Animated Luminous GPS Beacon Pulse Traveling Along the Straight Line */}
              {isRouteAnimated && (
                <circle r="5" fill="#FFFFFF" filter="url(#glow)">
                  <animateMotion
                    path={routePathD}
                    dur="2.8s"
                    repeatCount="indefinite"
                  />
                </circle>
              )}

              {/* The 5 Evenly Spaced Stops Along the Straight Line */}
              {journeyData?.journey.map((stepItem) => {
                const wx = mapX(stepItem.waypoint.valence);
                const wy = mapY(stepItem.waypoint.energy);
                const isSelected = activeStep === stepItem.step;
                const isHovered = hoveredStep === stepItem.step;
                const isCurrentActive = isSelected || isHovered;
                const isStart = stepItem.step === 1;
                const isEnd = stepItem.step === stepItem.totalSteps;

                // Stop node colors:
                const nodeColor = isStart
                  ? fromProfile.color
                  : isEnd
                  ? toProfile.color
                  : '#38bdf8';

                return (
                  <g
                    key={stepItem.step}
                    transform={`translate(${wx}, ${wy})`}
                    className="cursor-pointer transition-transform duration-200"
                    onMouseEnter={() => setHoveredStep(stepItem.step)}
                    onMouseLeave={() => setHoveredStep(null)}
                    onClick={() => handleStepClick(stepItem.step)}
                  >
                    {/* Glowing outer pulse for Start and Goal */}
                    {(isStart || isEnd || isCurrentActive) && (
                      <circle
                        r={isStart || isEnd ? 18 : 15}
                        fill={nodeColor}
                        fillOpacity="0.22"
                        className="animate-ping motion-reduce:animate-none"
                      />
                    )}

                    {/* Active highlight ring */}
                    {isCurrentActive && (
                      <circle
                        r="20"
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="2.5"
                        strokeDasharray="4 4"
                      />
                    )}

                    {/* Main Stop Circle */}
                    <circle
                      r={isStart || isEnd ? 14 : isCurrentActive ? 13 : 11}
                      fill={isCurrentActive ? '#10b981' : nodeColor}
                      stroke="#0f172a"
                      strokeWidth="2.5"
                      className="transition-all duration-200"
                    />

                    {/* Step Number */}
                    <text
                      x="0"
                      y="4"
                      textAnchor="middle"
                      fill="#FFFFFF"
                      fontSize="10"
                      fontWeight="bold"
                      fontFamily="sans-serif"
                    >
                      {stepItem.step}
                    </text>

                    {/* Stop Header Label for Start and Goal */}
                    {isStart && (
                      <g transform="translate(0, -20)">
                        <rect
                          x="-50"
                          y="-10"
                          width="100"
                          height="18"
                          rx="4"
                          fill="rgba(15, 23, 42, 0.9)"
                          stroke={fromProfile.color}
                          strokeWidth="1"
                        />
                        <text
                          x="0"
                          y="3"
                          textAnchor="middle"
                          fill={fromProfile.color}
                          fontSize="10"
                          fontWeight="bold"
                          fontFamily="sans-serif"
                        >
                          🚩 1 • {fromProfile.label}
                        </text>
                      </g>
                    )}

                    {isEnd && (
                      <g transform="translate(0, -20)">
                        <rect
                          x="-50"
                          y="-10"
                          width="100"
                          height="18"
                          rx="4"
                          fill="rgba(15, 23, 42, 0.9)"
                          stroke={toProfile.color}
                          strokeWidth="1"
                        />
                        <text
                          x="0"
                          y="3"
                          textAnchor="middle"
                          fill={toProfile.color}
                          fontSize="10"
                          fontWeight="bold"
                          fontFamily="sans-serif"
                        >
                          🏁 5 • {toProfile.label}
                        </text>
                      </g>
                    )}

                    {/* Detailed Stop Popover on Hover/Click */}
                    {isCurrentActive && (
                      <g transform={`translate(0, ${wy > CHART_HEIGHT / 2 ? -75 : 28})`}>
                        <rect
                          x="-105"
                          y="-8"
                          width="210"
                          height="54"
                          rx="8"
                          fill="#09090D"
                          stroke={nodeColor}
                          strokeWidth="1.5"
                          filter="url(#glow)"
                        />
                        <text
                          x="0"
                          y="8"
                          textAnchor="middle"
                          fill="#FFFFFF"
                          fontSize="11"
                          fontWeight="bold"
                          fontFamily="sans-serif"
                        >
                          Stop {stepItem.step} of 5: {stepItem.song.title.slice(0, 22)}
                        </text>
                        <text
                          x="0"
                          y="22"
                          textAnchor="middle"
                          fill="#38bdf8"
                          fontSize="9.5"
                          fontWeight="500"
                          fontFamily="sans-serif"
                        >
                          by {stepItem.song.artistName}
                        </text>
                        <text
                          x="0"
                          y="36"
                          textAnchor="middle"
                          fill="#94a3b8"
                          fontSize="9"
                          fontFamily="sans-serif"
                        >
                          Valence: {Math.round(stepItem.waypoint.valence * 100)}% • Energy: {Math.round(stepItem.waypoint.energy * 100)}%
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}

              {/* Floating Action Menu for Clicked Map Mood */}
              {selectedMapMood && (
                <g transform={`translate(${mapX(selectedMapMood.valence)}, ${mapY(selectedMapMood.energy) + 16})`}>
                  <rect
                    x="-90"
                    y="0"
                    width="180"
                    height="46"
                    rx="8"
                    fill="#0f172a"
                    stroke="#38bdf8"
                    strokeWidth="1.5"
                    filter="url(#glow)"
                  />
                  <text
                    x="0"
                    y="14"
                    textAnchor="middle"
                    fill="#FFFFFF"
                    fontSize="10"
                    fontWeight="bold"
                    fontFamily="sans-serif"
                  >
                    Select {selectedMapMood.label} for:
                  </text>
                  {/* Set as Start Button */}
                  <g
                    className="cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFromMood(selectedMapMood.id);
                      setSelectedMapMood(null);
                    }}
                  >
                    <rect x="-82" y="20" width="76" height="20" rx="4" fill="#ef4444" />
                    <text x="-44" y="34" textAnchor="middle" fill="#FFFFFF" fontSize="9.5" fontWeight="bold">
                      Set as Start
                    </text>
                  </g>
                  {/* Set as Goal Button */}
                  <g
                    className="cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      setToMood(selectedMapMood.id);
                      setSelectedMapMood(null);
                    }}
                  >
                    <rect x="6" y="20" width="76" height="20" rx="4" fill="#10b981" />
                    <text x="44" y="34" textAnchor="middle" fill="#FFFFFF" fontSize="9.5" fontWeight="bold">
                      Set as Goal
                    </text>
                  </g>
                </g>
              )}
            </svg>
          </div>

          {/* Small Caption Under the Map */}
          <div className="mt-4 flex flex-col sm:flex-row items-center justify-between text-xs text-content-muted gap-2">
            <span className="flex items-center gap-1.5 font-medium">
              <Compass className="w-3.5 h-3.5 text-brand-400" />
              Your emotional path, step by step: Stop 1 matches where you are, Stop 5 arrives at where you want to be.
            </span>
            <span className="font-mono text-[11px] text-content-secondary">
              5 stops • 0 repeats • 5 distinct artists
            </span>
          </div>
        </Card>

        {/* Ordered Song Recommendations List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand-400" />
              <h2 className="text-lg sm:text-xl font-bold text-content-primary">
                Journey Path ({journeyData?.journey.length || 0} Steps)
              </h2>
            </div>
            {activeStep !== null && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveStep(null)}
                className="text-xs text-content-secondary hover:text-content-primary"
              >
                Clear selection
              </Button>
            )}
          </div>

          {isPlanning ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((stepIdx) => (
                <div
                  key={stepIdx}
                  className="p-4 rounded-2xl border border-surface-border/50 bg-surface/30 animate-pulse flex flex-col gap-2"
                >
                  <div className="h-4 w-48 bg-surface-secondary rounded" />
                  <div className="h-12 w-full bg-surface-secondary/60 rounded-xl" />
                  <div className="h-4 w-72 bg-surface-secondary/40 rounded" />
                </div>
              ))}
              <p className="text-center text-xs text-content-muted font-medium pt-2">
                Calculating linear interpolation in valence-energy space and matching unique harmonic waypoints...
              </p>
            </div>
          ) : journeyData && journeyData.journey.length > 0 ? (
            <div className="space-y-3">
              {journeyData.journey.map((item, index) => {
                const isCardSelected = activeStep === item.step;
                const isCardHovered = hoveredStep === item.step;
                const isTrackActive = currentTrack?.id === item.song.id;

                return (
                  <div
                    key={item.song.id}
                    ref={(el) => (songCardRefs.current[item.step] = el)}
                    onMouseEnter={() => setHoveredStep(item.step)}
                    onMouseLeave={() => setHoveredStep(null)}
                    className={`p-3 sm:p-4 rounded-2xl border transition-all duration-300 ${
                      isCardSelected || isCardHovered
                        ? 'bg-surface/90 border-brand-400/80 shadow-lg shadow-brand-500/10'
                        : 'bg-surface/40 border-surface-border/60 hover:border-surface-border'
                    }`}
                  >
                    {/* Step Header Badge & Waypoint Info */}
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-brand-400/20 text-brand-400 font-bold text-xs flex items-center justify-center font-mono border border-brand-400/30">
                          {item.step}
                        </span>
                        <span className="text-xs font-bold text-content-primary">
                          Waypoint {item.step} of {item.totalSteps}
                        </span>
                        <span className="text-[11px] font-mono text-content-muted">
                          (Valence: {item.waypoint.valence.toFixed(2)}, Energy: {item.waypoint.energy.toFixed(2)})
                        </span>
                      </div>

                      <div className="text-[11px] font-mono text-content-secondary">
                        Acoustic Match {Math.round((item.score || 0.8) * 100)}%
                      </div>
                    </div>

                    {/* Integrated SongCard */}
                    <SongCard
                      track={item.song}
                      isActive={isTrackActive}
                      isPlaying={isTrackActive && isPlaying}
                      onPlay={() => handlePlaySingle(item.song, index)}
                      className="bg-transparent border-0 px-0 hover:bg-surface/60"
                    />

                    {/* Step Transition Reason */}
                    <div className="mt-2.5 px-3 py-2 rounded-xl bg-surface-secondary/70 border border-surface-border/50 flex items-center gap-2 text-xs text-content-secondary">
                      <Sparkles className="w-3.5 h-3.5 text-brand-400 shrink-0" />
                      <span className="font-medium text-content-primary">
                        {item.reason}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <Card className="p-8 text-center bg-surface/30 border-surface-border text-content-secondary">
              <Compass className="w-8 h-8 text-brand-400 mx-auto mb-2 opacity-70" />
              <h3 className="text-sm font-bold text-content-primary mb-1">No Journey Route Generated</h3>
              <p className="text-xs text-content-muted max-w-sm mx-auto mb-4">
                Select your starting emotional state and destination mood above, then tap "Plan my journey" to calculate your 5-step musical path.
              </p>
              <Button variant="secondary" size="sm" onClick={() => handlePlanJourney('stressed', 'calm')}>
                Plan Default Route (Stressed ➔ Calm)
              </Button>
            </Card>
          )}
        </div>
      </PageContainer>
    </div>
  );
};
