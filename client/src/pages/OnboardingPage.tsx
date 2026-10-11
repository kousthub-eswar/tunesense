import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Check,
  Compass,
  Plus,
  X,
  Edit2,
} from 'lucide-react';
import { PageContainer } from '../components/layout/PageContainer.js';
import { Card } from '../components/ui/Card.js';
import { Button } from '../components/ui/Button.js';
import { Badge } from '../components/ui/Badge.js';
import { Input } from '../components/ui/Input.js';
import { useAuth } from '../contexts/AuthContext.js';
import { preferenceService } from '../services/preferenceService.js';
import { MOOD_OPTIONS, GENRE_OPTIONS } from '../constants/moods.js';

const POPULAR_ARTIST_SUGGESTIONS = [
  'Tycho',
  'Bonobo',
  'Daft Punk',
  'Hans Zimmer',
  'Ludovico Einaudi',
  'ODESZA',
  'Four Tet',
  'Boards of Canada',
];

export const OnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  // 4 guided steps leading to final submission (Step 4 is Review & Finish)
  const [currentStep, setCurrentStep] = useState<number>(1);

  // User preference state
  const [preferredMood, setPreferredMood] = useState<string | null>('focused');
  const [preferredGenres, setPreferredGenres] = useState<string[]>(['Electronic', 'Ambient']);
  const [preferredArtists, setPreferredArtists] = useState<string[]>([]);
  const [artistInput, setArtistInput] = useState<string>('');
  const [explorationLevel, setExplorationLevel] = useState<number>(0.5);

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, authLoading, navigate]);

  const toggleGenre = (genre: string) => {
    setPreferredGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
  };

  const addArtist = (name?: string) => {
    const target = (name || artistInput).trim();
    if (target && !preferredArtists.includes(target)) {
      setPreferredArtists((prev) => [...prev, target]);
      if (!name) setArtistInput('');
    }
  };

  const removeArtist = (artist: string) => {
    setPreferredArtists((prev) => prev.filter((a) => a !== artist));
  };

  const handleFinish = async () => {
    setIsSaving(true);
    setErrorMsg(null);
    try {
      await preferenceService.updatePreferences({
        preferredGenres,
        preferredLanguages: ['en', 'instrumental'],
        preferredArtists,
        preferredMood: preferredMood || undefined,
        personalizationSettings: {
          explorationLevel,
          diversityLevel: 0.7,
        },
      });

      if (preferredMood) {
        sessionStorage.setItem('tunesense_active_mood', preferredMood);
      }

      navigate('/home');
    } catch (err: any) {
      console.error('[OnboardingPage] Failed to save preferences:', err);
      setErrorMsg(err?.message || 'Failed to save preferences. Please try again.');
      setIsSaving(false);
    }
  };

  const nextStep = () => {
    if (currentStep < 4) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleFinish();
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const selectedMoodObj = MOOD_OPTIONS.find((m) => m.id === preferredMood);

  return (
    <PageContainer hasBottomNav={false}>
      <div className="max-w-xl mx-auto py-4 sm:py-8">
        {/* Progress Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2.5">
            <Badge variant="brand" size="sm">
              Step {currentStep} of 4
            </Badge>
            <div className="flex items-center gap-3">
              <span className="text-xs text-content-muted hidden sm:inline">Taste Profile Setup</span>
              <button
                type="button"
                onClick={() => navigate('/home')}
                className="text-xs text-content-secondary hover:text-white transition-colors underline-offset-4 hover:underline"
              >
                Skip to Home →
              </button>
            </div>
          </div>
          <div className="w-full bg-surface-secondary rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-brand-500 h-1.5 transition-all duration-300 rounded-full"
              style={{ width: `${(currentStep / 4) * 100}%` }}
            />
          </div>
        </div>

        {errorMsg && (
          <Card className="p-3 mb-5 bg-vibe-rose/10 border-vibe-rose/30 text-vibe-rose text-xs">
            {errorMsg}
          </Card>
        )}

        {/* STEP 1: Choose Moods */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold text-content-primary tracking-tight">
                What's your usual listening vibe?
              </h2>
              <p className="text-xs text-content-secondary mt-1">
                TuneSense uses real-time moods to instantly align audio energy with your state of mind.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-2 gap-3 pt-2">
              {MOOD_OPTIONS.map((mood) => {
                const selected = preferredMood === mood.id;
                const MoodIcon = mood.icon;
                return (
                  <button
                    key={mood.id}
                    type="button"
                    onClick={() => setPreferredMood(selected ? null : mood.id)}
                    className={`flex flex-col items-start p-3.5 rounded-2xl text-xs transition-all border text-left ${
                      selected
                        ? 'bg-brand-500/15 border-brand-500 text-brand-300'
                        : 'bg-surface/70 hover:bg-surface border-surface-border text-content-secondary'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <MoodIcon className="w-5 h-5 text-content-secondary" />
                      {selected && <Check className="w-3.5 h-3.5 text-brand-400" />}
                    </div>
                    <span className="font-semibold text-content-primary text-sm">{mood.label}</span>
                    <span className="text-[11px] text-content-muted mt-0.5 leading-tight">
                      {mood.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 2: Choose Favourite Genres */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold text-content-primary tracking-tight">
                Pick your favourite genres
              </h2>
              <p className="text-xs text-content-secondary mt-1">
                Select styles you enjoy. We'll use these to seed your discovery feeds and recommendations.
              </p>
            </div>

            <div className="flex flex-wrap gap-2.5 pt-2">
              {GENRE_OPTIONS.map((genre) => {
                const selected = preferredGenres.includes(genre);
                return (
                  <button
                    key={genre}
                    type="button"
                    onClick={() => toggleGenre(genre)}
                    className={`flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-medium min-h-[44px] transition-all border ${
                      selected
                        ? 'bg-brand-500 text-white border-brand-400'
                        : 'bg-surface/70 hover:bg-surface border-surface-border text-content-secondary hover:text-white'
                    }`}
                  >
                    {selected && <Check className="w-3.5 h-3.5" />}
                    <span>{genre}</span>
                  </button>
                );
              })}
            </div>

            {preferredGenres.length === 0 && (
              <p className="text-[11px] text-brand-300 italic pt-1">
                Tip: Choose at least one genre to help TuneSense get started.
              </p>
            )}
          </div>
        )}

        {/* STEP 3: Select Artists or Tracks */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-content-primary tracking-tight">
                  Any artists you already love?
                </h2>
                <p className="text-xs text-content-secondary mt-1">
                  Add favourite creators, or skip this step to let TuneSense learn dynamically.
                </p>
              </div>
              <Badge variant="cyan" size="sm">Optional</Badge>
            </div>

            <div className="flex gap-2 pt-1">
              <Input
                placeholder="e.g. Tycho, Bonobo, Hans Zimmer..."
                value={artistInput}
                onChange={(e) => setArtistInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addArtist())}
                className="text-xs"
              />
              <Button
                variant="secondary"
                onClick={() => addArtist()}
                leftIcon={<Plus className="w-4 h-4" />}
                className="shrink-0 min-h-[44px] px-4"
              >
                Add
              </Button>
            </div>

            {/* Selected Artists Chips */}
            {preferredArtists.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {preferredArtists.map((artist) => (
                  <span
                    key={artist}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs bg-brand-500/15 border border-brand-500/30 text-brand-300"
                  >
                    <span>{artist}</span>
                    <button
                      type="button"
                      onClick={() => removeArtist(artist)}
                      className="text-content-muted hover:text-vibe-rose"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Quick-add Suggestions */}
            <div className="pt-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-content-muted mb-2">
                Quick Suggestions
              </p>
              <div className="flex flex-wrap gap-2">
                {POPULAR_ARTIST_SUGGESTIONS.map((artist) => {
                  const alreadyAdded = preferredArtists.includes(artist);
                  return (
                    <button
                      key={artist}
                      type="button"
                      disabled={alreadyAdded}
                      onClick={() => addArtist(artist)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-colors flex items-center gap-1 ${
                        alreadyAdded
                          ? 'bg-surface/30 border-surface-border text-content-muted opacity-50 cursor-default'
                          : 'bg-surface/70 border-surface-border text-content-secondary hover:text-white hover:border-brand-500/40'
                      }`}
                    >
                      {alreadyAdded ? <Check className="w-3 h-3 text-content-muted" /> : <Plus className="w-3 h-3" />}
                      <span>{artist}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: Review Preferences */}
        {currentStep === 4 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-2xl font-bold text-content-primary tracking-tight">
                Review your preferences
              </h2>
              <p className="text-xs text-content-secondary mt-1">
                Everything looks ready! Confirm your sound profile before diving in.
              </p>
            </div>

            <div className="space-y-3 pt-1">
              {/* Mood Review Card */}
              <Card className="p-4 bg-surface/70 border-surface-border flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-content-muted tracking-wider">
                    Primary Listening Vibe
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    {selectedMoodObj ? (
                      <selectedMoodObj.icon className="w-4 h-4 text-brand-400" />
                    ) : (
                      <Sparkles className="w-4 h-4 text-brand-400" />
                    )}
                    <span className="text-sm font-semibold text-content-primary">
                      {selectedMoodObj?.label || 'Flexible / Dynamic'}
                    </span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentStep(1)}
                  leftIcon={<Edit2 className="w-3.5 h-3.5" />}
                  className="text-xs text-content-secondary hover:text-white"
                >
                  Change
                </Button>
              </Card>

              {/* Genres Review Card */}
              <Card className="p-4 bg-surface/70 border-surface-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] uppercase font-bold text-content-muted tracking-wider">
                    Selected Genres ({preferredGenres.length})
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentStep(2)}
                    leftIcon={<Edit2 className="w-3.5 h-3.5" />}
                    className="text-xs text-content-secondary hover:text-white"
                  >
                    Edit
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {preferredGenres.length > 0 ? (
                    preferredGenres.map((g) => (
                      <span
                        key={g}
                        className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-brand-500/15 text-brand-300 border border-brand-500/25"
                      >
                        {g}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-content-muted italic">All genres welcomed</span>
                  )}
                </div>
              </Card>

              {/* Artists Review Card */}
              <Card className="p-4 bg-surface/70 border-surface-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] uppercase font-bold text-content-muted tracking-wider">
                    Seed Artists ({preferredArtists.length})
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentStep(3)}
                    leftIcon={<Edit2 className="w-3.5 h-3.5" />}
                    className="text-xs text-content-secondary hover:text-white"
                  >
                    Edit
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {preferredArtists.length > 0 ? (
                    preferredArtists.map((a) => (
                      <span
                        key={a}
                        className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-surface text-content-primary border border-surface-border"
                      >
                        {a}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-content-muted italic">
                      No specific artists seeded (automatic discovery enabled)
                    </span>
                  )}
                </div>
              </Card>

              {/* Discovery Exploration Tuning */}
              <Card className="p-4 bg-surface/70 border-surface-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-content-primary flex items-center gap-1.5">
                    <Compass className="w-4 h-4 text-brand-400" />
                    Discovery Curiosity Level
                  </span>
                  <span className="text-xs font-bold text-brand-400">
                    {Math.round(explorationLevel * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={explorationLevel}
                  onChange={(e) => setExplorationLevel(parseFloat(e.target.value))}
                  className="w-full accent-brand-500 cursor-pointer h-2 bg-surface-border rounded-lg"
                />
                <div className="flex justify-between text-[10px] text-content-muted mt-1.5">
                  <span>Familiar Sounds</span>
                  <span>Balanced Discovery</span>
                  <span>Wild & Exploratory</span>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* Step Navigation Controls */}
        <div className="flex items-center justify-between gap-3 pt-6 mt-6 border-t border-surface-border">
          {currentStep > 1 ? (
            <Button
              variant="ghost"
              onClick={prevStep}
              leftIcon={<ArrowLeft className="w-4 h-4" />}
              className="min-h-[44px]"
              disabled={isSaving}
            >
              Back
            </Button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            {/* Optional Skip on Step 3 */}
            {currentStep === 3 && preferredArtists.length === 0 && (
              <Button
                variant="ghost"
                onClick={nextStep}
                className="text-xs text-content-muted hover:text-white min-h-[44px]"
                disabled={isSaving}
              >
                Skip for now
              </Button>
            )}

            <Button
              variant="primary"
              onClick={nextStep}
              disabled={isSaving}
              isLoading={isSaving}
              rightIcon={currentStep === 4 ? <Sparkles className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
              className="min-h-[44px] px-6"
            >
              {currentStep === 4 ? 'Finish & Start Listening' : 'Continue'}
            </Button>
          </div>
        </div>
      </div>
    </PageContainer>
  );
};

export default OnboardingPage;
