import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight, ArrowLeft, Check, Compass, Plus, X } from 'lucide-react';
import { PageContainer } from '../components/layout/PageContainer.js';
import { Card } from '../components/ui/Card.js';
import { Button } from '../components/ui/Button.js';
import { Badge } from '../components/ui/Badge.js';
import { Input } from '../components/ui/Input.js';
import { useAuth } from '../contexts/AuthContext.js';
import { preferenceService } from '../services/preferenceService.js';
import { MOOD_OPTIONS, GENRE_OPTIONS, LANGUAGE_OPTIONS } from '../constants/moods.js';

export const OnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [preferredGenres, setPreferredGenres] = useState<string[]>(['Electronic', 'Ambient']);
  const [preferredLanguages, setPreferredLanguages] = useState<string[]>(['en', 'instrumental']);
  const [preferredArtists, setPreferredArtists] = useState<string[]>([]);
  const [artistInput, setArtistInput] = useState<string>('');
  const [explorationLevel, setExplorationLevel] = useState<number>(0.5);
  const [diversityLevel, setDiversityLevel] = useState<number>(0.7);
  const [preferredMood, setPreferredMood] = useState<string | null>(null);

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

  const toggleLanguage = (langCode: string) => {
    setPreferredLanguages((prev) =>
      prev.includes(langCode) ? prev.filter((l) => l !== langCode) : [...prev, langCode]
    );
  };

  const addArtist = () => {
    const trimmed = artistInput.trim();
    if (trimmed && !preferredArtists.includes(trimmed)) {
      setPreferredArtists((prev) => [...prev, trimmed]);
      setArtistInput('');
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
        preferredLanguages,
        preferredArtists,
        preferredMood: preferredMood || undefined,
        personalizationSettings: {
          explorationLevel,
          diversityLevel,
        },
      });
      // Store preferred mood in session if set
      if (preferredMood) {
        sessionStorage.setItem('tunesense_active_mood', preferredMood);
      }
      navigate('/home');
    } catch (err: any) {
      console.error('[OnboardingPage] Failed to save preferences:', err);
      setErrorMsg(err.message || 'Failed to save preferences. Please try again.');
      setIsSaving(false);
    }
  };

  const canProceed = () => {
    if (currentStep === 1) return preferredGenres.length > 0;
    if (currentStep === 2) return preferredLanguages.length > 0;
    return true; // Steps 3, 4, 5 are optional or have defaults
  };

  const nextStep = () => {
    if (currentStep < 5) {
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

  return (
    <PageContainer>
      {/* Progress Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2.5">
          <Badge variant="brand" size="sm">
            Step {currentStep} of 5
          </Badge>
          <div className="flex items-center gap-3">
            <span className="text-xs text-content-muted hidden sm:inline">Personalized Setup</span>
            <button
              onClick={() => navigate('/home')}
              className="text-xs text-content-secondary hover:text-brand-300 transition-colors underline-offset-4 hover:underline"
            >
              Skip to Home →
            </button>
          </div>
        </div>
        <div className="w-full bg-surface-secondary rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-brand-500 h-1.5 transition-all duration-300 rounded-full"
            style={{ width: `${(currentStep / 5) * 100}%` }}
          />
        </div>
      </div>

      {errorMsg && (
        <Card className="p-3 mb-4 bg-vibe-rose/10 border-vibe-rose/30 text-vibe-rose text-xs">
          {errorMsg}
        </Card>
      )}

      {/* Step 1: Genres */}
      {currentStep === 1 && (
        <div>
          <h2 className="text-xl font-bold text-content-primary mb-1">Pick some genres you enjoy</h2>
          <p className="text-xs text-content-secondary mb-5">
            TuneSense will use these explicit choices for content seeding and cold-start recommendations.
          </p>

          <div className="flex flex-wrap gap-2.5 mb-8">
            {GENRE_OPTIONS.map((genre) => {
              const selected = preferredGenres.includes(genre);
              return (
                <button
                  key={genre}
                  type="button"
                  onClick={() => toggleGenre(genre)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-medium min-h-[44px] transition-all border ${
                    selected
                      ? 'bg-brand-500 text-white border-brand-400 shadow-glow'
                      : 'bg-surface/70 hover:bg-surface border-surface-border text-content-secondary'
                  }`}
                >
                  {selected && <Check className="w-3.5 h-3.5" />}
                  <span>{genre}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Step 2: Languages */}
      {currentStep === 2 && (
        <div>
          <h2 className="text-xl font-bold text-content-primary mb-1">Pick languages you listen to</h2>
          <p className="text-xs text-content-secondary mb-5">
            Filter vocal tracks by preferred linguistic regions, or focus on pure instrumentals.
          </p>

          <div className="grid grid-cols-2 gap-2.5 mb-8">
            {LANGUAGE_OPTIONS.map((lang) => {
              const selected = preferredLanguages.includes(lang.code);
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => toggleLanguage(lang.code)}
                  className={`flex items-center justify-between px-3.5 py-3 rounded-card text-xs font-medium min-h-[44px] transition-all border text-left ${
                    selected
                      ? 'bg-brand-500/10 border-brand-500 text-brand-300'
                      : 'bg-surface/70 hover:bg-surface border-surface-border text-content-secondary'
                  }`}
                >
                  <span>{lang.label}</span>
                  {selected && <Check className="w-4 h-4 text-brand-400" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Step 3: Artists (Optional) */}
      {currentStep === 3 && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-xl font-bold text-content-primary">Any artists you already love?</h2>
            <Badge variant="cyan" size="sm">Optional</Badge>
          </div>
          <p className="text-xs text-content-secondary mb-5">
            Seed your profile with specific creators you admire, or skip to let TuneSense discover for you.
          </p>

          <div className="flex gap-2 mb-4">
            <Input
              placeholder="e.g. Carbon Based Lifeforms, Tycho"
              value={artistInput}
              onChange={(e) => setArtistInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addArtist())}
            />
            <Button
              variant="secondary"
              onClick={addArtist}
              leftIcon={<Plus className="w-4 h-4" />}
              className="shrink-0 min-h-[44px]"
            >
              Add
            </Button>
          </div>

          {preferredArtists.length > 0 ? (
            <div className="flex flex-wrap gap-2 mb-8">
              {preferredArtists.map((artist) => (
                <span
                  key={artist}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs bg-surface border border-surface-border text-content-primary"
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
          ) : (
            <p className="text-xs text-content-muted italic mb-8">
              No specific artists added yet. You can always add artists later in your Profile settings.
            </p>
          )}
        </div>
      )}

      {/* Step 4: Adventurousness / Exploration */}
      {currentStep === 4 && (
        <div>
          <h2 className="text-xl font-bold text-content-primary mb-1">How adventurous should TuneSense be?</h2>
          <p className="text-xs text-content-secondary mb-5">
            Control the balance between familiar favorites and unexpected novel sounds.
          </p>

          <div className="space-y-4 mb-8">
            <Card className="p-4 bg-surface/60 border-surface-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-content-primary flex items-center gap-1.5">
                  <Compass className="w-4 h-4 text-brand-400" />
                  Exploration Level
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
                <span>Familiar / Safe</span>
                <span>Balanced Discovery</span>
                <span>Highly Exploratory</span>
              </div>
            </Card>

            <Card className="p-4 bg-surface/60 border-surface-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-content-primary">
                  Artist & Album Diversity
                </span>
                <span className="text-xs font-bold text-vibe-emerald">
                  {Math.round(diversityLevel * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.05"
                value={diversityLevel}
                onChange={(e) => setDiversityLevel(parseFloat(e.target.value))}
                className="w-full accent-vibe-emerald cursor-pointer h-2 bg-surface-border rounded-lg"
              />
              <div className="flex justify-between text-[10px] text-content-muted mt-1.5">
                <span>Focused on top artists</span>
                <span>Wide variety of voices</span>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Step 5: Default Vibe / Mood */}
      {currentStep === 5 && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-xl font-bold text-content-primary">What's your usual listening vibe?</h2>
            <Badge variant="cyan" size="sm">Optional</Badge>
          </div>
          <p className="text-xs text-content-secondary mb-5">
            Set your preferred default mood, or leave flexible to pick in real-time on Home.
          </p>

          <div className="grid grid-cols-2 gap-2.5 mb-8">
            {MOOD_OPTIONS.map((mood) => {
              const selected = preferredMood === mood.id;
              return (
                <button
                  key={mood.id}
                  type="button"
                  onClick={() => setPreferredMood(selected ? null : mood.id)}
                  className={`flex flex-col items-start p-3 rounded-card text-xs min-h-[56px] transition-all border text-left ${
                    selected
                      ? 'bg-brand-500/10 border-brand-500 text-brand-300 ring-1 ring-brand-500'
                      : 'bg-surface/70 hover:bg-surface border-surface-border text-content-secondary'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold mb-1">
                    <span className="text-base">{mood.emoji}</span>
                    <span>{mood.label}</span>
                  </div>
                  <span className="text-[10px] text-content-muted leading-tight">
                    {mood.description}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between gap-3 pt-4 border-t border-surface-border">
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
          {currentStep === 3 && (
            <Button
              variant="ghost"
              onClick={nextStep}
              className="text-xs text-content-muted hover:text-content-primary min-h-[44px]"
              disabled={isSaving}
            >
              Skip
            </Button>
          )}

          <Button
            variant="primary"
            onClick={nextStep}
            disabled={!canProceed() || isSaving}
            isLoading={isSaving}
            rightIcon={currentStep === 5 ? <Sparkles className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
            className="min-h-[44px] px-6"
          >
            {currentStep === 5 ? 'Start Listening' : 'Continue'}
          </Button>
        </div>
      </div>
    </PageContainer>
  );
};

export default OnboardingPage;
