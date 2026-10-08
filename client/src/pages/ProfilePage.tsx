import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Info,
  Server,
  LogIn,
  LogOut,
  UserPlus,
  CheckCircle,
  ShieldCheck,
  SlidersHorizontal,
  Compass,
  VolumeX,
  Heart,
  Plus,
  X,
  Save,
  Check,
  RotateCcw,
  BarChart3,
  ChevronRight,
} from 'lucide-react';
import { PageContainer } from '../components/layout/PageContainer.js';
import { Card } from '../components/ui/Card.js';
import { Badge } from '../components/ui/Badge.js';
import { Button } from '../components/ui/Button.js';
import { Input } from '../components/ui/Input.js';
import { Avatar } from '../components/ui/Avatar.js';
import { useAuth } from '../contexts/AuthContext.js';
import { useHealthCheck } from '../hooks/useHealthCheck.js';
import { APP_INFO } from '../constants/navigation.js';
import { preferenceService } from '../services/preferenceService.js';
import { MOOD_OPTIONS, GENRE_OPTIONS, LANGUAGE_OPTIONS } from '../constants/moods.js';

export const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout, isLoading } = useAuth();
  const { health } = useHealthCheck();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Preference form state
  const [prefLoading, setPrefLoading] = useState(false);
  const [prefSaving, setPrefSaving] = useState(false);
  const [prefSuccess, setPrefSuccess] = useState(false);
  const [prefError, setPrefError] = useState<string | null>(null);

  const [preferredGenres, setPreferredGenres] = useState<string[]>([]);
  const [preferredLanguages, setPreferredLanguages] = useState<string[]>([]);
  const [preferredArtists, setPreferredArtists] = useState<string[]>([]);
  const [artistInput, setArtistInput] = useState('');

  const [dislikedGenres, setDislikedGenres] = useState<string[]>([]);
  const [dislikedGenreInput, setDislikedGenreInput] = useState('');
  const [dislikedArtists, setDislikedArtists] = useState<string[]>([]);
  const [dislikedArtistInput, setDislikedArtistInput] = useState('');

  const [explorationLevel, setExplorationLevel] = useState(0.5);
  const [diversityLevel, setDiversityLevel] = useState(0.7);
  const [preferredMood, setPreferredMood] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      setPrefLoading(true);
      preferenceService
        .getPreferences()
        .then((data) => {
          setPreferredGenres(data.preferredGenres || data.favoriteGenres || []);
          setPreferredLanguages(data.preferredLanguages || ['en']);
          setPreferredArtists(data.preferredArtists || data.favoriteArtists || []);
          setDislikedGenres(data.dislikedGenres || []);
          setDislikedArtists(data.dislikedArtists || []);
          if (data.personalizationSettings) {
            setExplorationLevel(data.personalizationSettings.explorationLevel ?? 0.5);
            setDiversityLevel(data.personalizationSettings.diversityLevel ?? 0.7);
          }
          setPreferredMood(data.preferredMood || null);
        })
        .catch((err) => {
          console.warn('[ProfilePage] Could not load preferences:', err);
        })
        .finally(() => {
          setPrefLoading(false);
        });
    }
  }, [isAuthenticated]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      navigate('/login');
    } catch {
      // Logout completed client-side regardless
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleSavePreferences = async () => {
    setPrefSaving(true);
    setPrefSuccess(false);
    setPrefError(null);
    try {
      await preferenceService.updatePreferences({
        preferredGenres,
        preferredLanguages,
        preferredArtists,
        dislikedGenres,
        dislikedArtists,
        preferredMood: preferredMood || undefined,
        personalizationSettings: {
          explorationLevel,
          diversityLevel,
        },
      });
      setPrefSuccess(true);
      setTimeout(() => setPrefSuccess(false), 4000);
    } catch (err: any) {
      setPrefError(err.message || 'Failed to update preferences');
    } finally {
      setPrefSaving(false);
    }
  };

  const togglePreferredGenre = (g: string) => {
    setPreferredGenres((prev) =>
      prev.includes(g) ? prev.filter((item) => item !== g) : [...prev, g]
    );
  };

  const togglePreferredLanguage = (code: string) => {
    setPreferredLanguages((prev) =>
      prev.includes(code) ? prev.filter((item) => item !== code) : [...prev, code]
    );
  };

  const addPreferredArtist = () => {
    const val = artistInput.trim();
    if (val && !preferredArtists.includes(val)) {
      setPreferredArtists((prev) => [...prev, val]);
      setArtistInput('');
    }
  };

  const addDislikedGenre = () => {
    const val = dislikedGenreInput.trim();
    if (val && !dislikedGenres.includes(val)) {
      setDislikedGenres((prev) => [...prev, val]);
      setDislikedGenreInput('');
    }
  };

  const addDislikedArtist = () => {
    const val = dislikedArtistInput.trim();
    if (val && !dislikedArtists.includes(val)) {
      setDislikedArtists((prev) => [...prev, val]);
      setDislikedArtistInput('');
    }
  };

  return (
    <PageContainer>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-content-primary">Account & Identity</h2>
          <p className="text-xs text-content-secondary mt-0.5">
            Stage 8 Personalization & User Controls
          </p>
        </div>
        <Badge variant={isAuthenticated ? 'emerald' : 'brand'} size="sm">
          {isAuthenticated ? 'Authenticated' : 'Guest'}
        </Badge>
      </div>

      {/* Profile Identity Card */}
      {isAuthenticated && user ? (
        <>
          <Card className="p-4 mb-5 bg-gradient-to-r from-surface to-bg-elevated border-surface-border">
          <div className="flex items-center gap-3.5 mb-4">
            <Avatar name={user.name} size="lg" className="border-brand-500/40 ring-2 ring-brand-500/20" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-content-primary truncate">{user.name}</h3>
                <ShieldCheck className="w-4 h-4 text-vibe-emerald shrink-0" />
              </div>
              <p className="text-xs text-content-secondary truncate">{user.email}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="emerald" size="sm">
                  Active Account
                </Badge>
                <span className="text-[10px] text-content-muted">
                  ID: {user.id.slice(-6)}
                </span>
              </div>
            </div>
          </div>

          <div className="border-t border-surface-border/60 pt-3 flex items-center justify-between">
            <div className="text-xs text-content-secondary">
              Session type:{' '}
              <span className="font-medium text-brand-400">Secure HTTP-Only JWT</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              isLoading={isLoggingOut}
              leftIcon={<LogOut className="w-3.5 h-3.5 text-vibe-rose" />}
              className="text-vibe-rose hover:border-vibe-rose/40 min-h-[36px]"
            >
              Sign Out
            </Button>
          </div>
        </Card>

        {/* Stage 9 Analytics & Offline Benchmarks Entry */}
        <Card
          className="p-3.5 mb-5 bg-gradient-to-r from-brand-900/30 to-surface border-brand-500/30 cursor-pointer hover:border-brand-500/50 transition-all flex items-center justify-between"
          onClick={() => navigate('/analytics')}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-500/20 text-brand-400 flex items-center justify-center flex-shrink-0">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="text-xs font-bold text-content-primary">System Analytics & Benchmarks</h4>
                <Badge variant="brand" size="sm">Stage 9</Badge>
              </div>
              <p className="text-[11px] text-content-secondary mt-0.5">
                Explore listening telemetry, recommendation conversion, and R0–R4 evaluation
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-content-muted flex-shrink-0 ml-2" />
        </Card>
      </>
      ) : (
        <Card className="p-5 mb-5 bg-gradient-to-r from-surface to-bg-elevated border-surface-border">
          <div className="flex items-center gap-3.5 mb-4">
            <Avatar name="Guest User" size="lg" className="border-brand-500/30" />
            <div>
              <h3 className="text-base font-bold text-content-primary">Guest Session</h3>
              <p className="text-xs text-content-secondary">Browsing catalogue anonymously</p>
              <div className="flex items-center gap-1.5 mt-1">
                <Badge variant="cyan" size="sm">
                  Unauthenticated
                </Badge>
              </div>
            </div>
          </div>

          <p className="text-xs text-content-muted mb-4 leading-relaxed">
            Create an account or sign in to establish your TuneSense identity, select your vibes, and customize music preferences.
          </p>

          <div className="grid grid-cols-2 gap-2.5">
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/login')}
              leftIcon={<LogIn className="w-3.5 h-3.5" />}
              disabled={isLoading}
              className="min-h-[44px]"
            >
              Sign In
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/signup')}
              leftIcon={<UserPlus className="w-3.5 h-3.5" />}
              disabled={isLoading}
              className="min-h-[44px]"
            >
              Sign Up
            </Button>
          </div>
        </Card>
      )}

      {/* Stage 8 Personalization & Music Preferences Section */}
      {isAuthenticated && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2 px-1">
            <div className="flex items-center gap-1.5">
              <SlidersHorizontal className="w-4 h-4 text-brand-400" />
              <h3 className="text-sm font-bold text-content-primary">
                Music Preferences & Personalization
              </h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/onboarding')}
              leftIcon={<RotateCcw className="w-3 h-3 text-content-muted" />}
              className="text-[11px] text-content-muted hover:text-brand-300 min-h-[32px]"
            >
              Setup Wizard
            </Button>
          </div>

          <Card className="p-4 space-y-5 bg-surface border-surface-border">
            {prefSuccess && (
              <div className="flex items-center gap-2 p-3 rounded-card bg-vibe-emerald/15 border border-vibe-emerald/30 text-vibe-emerald text-xs">
                <Check className="w-4 h-4 shrink-0" />
                <span>Preferences saved successfully. Your recommendations will reflect these choices immediately.</span>
              </div>
            )}

            {prefError && (
              <div className="p-3 rounded-card bg-vibe-rose/15 border border-vibe-rose/30 text-vibe-rose text-xs">
                {prefError}
              </div>
            )}

            {prefLoading ? (
              <div className="py-8 text-center text-xs text-content-muted animate-pulse">
                Loading your explicit music preferences...
              </div>
            ) : (
              <>
                {/* 1. Preferred Genres */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-content-primary flex items-center gap-1.5">
                      <Heart className="w-3.5 h-3.5 text-brand-400" />
                      Favorite / Preferred Genres
                    </label>
                    <span className="text-[10px] text-content-muted">
                      {preferredGenres.length} selected
                    </span>
                  </div>
                  <p className="text-[11px] text-content-secondary mb-2.5">
                    Tunes in these genres receive explicit scoring boosts.
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {GENRE_OPTIONS.map((g) => {
                      const isSel = preferredGenres.includes(g);
                      return (
                        <button
                          key={g}
                          type="button"
                          onClick={() => togglePreferredGenre(g)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium min-h-[36px] transition-all border ${
                            isSel
                              ? 'bg-brand-500 text-white border-brand-400 shadow-sm'
                              : 'bg-surface-elevated/70 hover:bg-surface-elevated border-surface-border text-content-secondary'
                          }`}
                        >
                          {g}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Preferred Languages */}
                <div className="pt-3 border-t border-surface-border">
                  <label className="text-xs font-semibold text-content-primary block mb-1">
                    Preferred Vocal Languages
                  </label>
                  <p className="text-[11px] text-content-secondary mb-2">
                    Prioritize songs performed in your chosen languages.
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {LANGUAGE_OPTIONS.map((lang) => {
                      const isSel = preferredLanguages.includes(lang.code);
                      return (
                        <button
                          key={lang.code}
                          type="button"
                          onClick={() => togglePreferredLanguage(lang.code)}
                          className={`px-2.5 py-1.5 rounded-card text-xs min-h-[34px] transition-all border ${
                            isSel
                              ? 'bg-brand-500/15 border-brand-500 text-brand-300 font-medium'
                              : 'bg-surface-elevated/70 hover:bg-surface-elevated border-surface-border text-content-secondary'
                          }`}
                        >
                          {lang.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Preferred Artists */}
                <div className="pt-3 border-t border-surface-border">
                  <label className="text-xs font-semibold text-content-primary block mb-1">
                    Favorite Artists
                  </label>
                  <div className="flex gap-2 mb-2">
                    <Input
                      placeholder="Add artist name..."
                      value={artistInput}
                      onChange={(e) => setArtistInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addPreferredArtist())}
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={addPreferredArtist}
                      leftIcon={<Plus className="w-3.5 h-3.5" />}
                      className="shrink-0 min-h-[40px]"
                    >
                      Add
                    </Button>
                  </div>
                  {preferredArtists.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {preferredArtists.map((a) => (
                        <span
                          key={a}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-brand-500/10 border border-brand-500/30 text-brand-300"
                        >
                          <span>{a}</span>
                          <button
                            type="button"
                            onClick={() => setPreferredArtists((prev) => prev.filter((item) => item !== a))}
                            className="text-brand-400 hover:text-vibe-rose"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* 4. Strong Dislikes (Negative Preferences) */}
                <div className="pt-3 border-t border-surface-border">
                  <div className="flex items-center gap-1.5 mb-1">
                    <VolumeX className="w-3.5 h-3.5 text-vibe-rose" />
                    <label className="text-xs font-semibold text-vibe-rose">
                      Disliked Genres & Artists (Negative Preferences)
                    </label>
                  </div>
                  <p className="text-[11px] text-content-secondary mb-2.5">
                    Songs matching these will be heavily penalized or excluded from recommendations.
                  </p>

                  {/* Disliked Genre input */}
                  <div className="flex gap-2 mb-2">
                    <Input
                      placeholder="Dislike genre (e.g. Screamo, Metal)..."
                      value={dislikedGenreInput}
                      onChange={(e) => setDislikedGenreInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addDislikedGenre())}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={addDislikedGenre}
                      className="shrink-0 min-h-[40px] text-vibe-rose border-vibe-rose/30"
                    >
                      Filter Genre
                    </Button>
                  </div>
                  {dislikedGenres.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {dislikedGenres.map((g) => (
                        <span
                          key={g}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-vibe-rose/10 border border-vibe-rose/30 text-vibe-rose"
                        >
                          <span>{g}</span>
                          <button
                            type="button"
                            onClick={() => setDislikedGenres((prev) => prev.filter((item) => item !== g))}
                            className="hover:text-white"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Disliked Artist input */}
                  <div className="flex gap-2 mb-2">
                    <Input
                      placeholder="Dislike artist name..."
                      value={dislikedArtistInput}
                      onChange={(e) => setDislikedArtistInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addDislikedArtist())}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={addDislikedArtist}
                      className="shrink-0 min-h-[40px] text-vibe-rose border-vibe-rose/30"
                    >
                      Filter Artist
                    </Button>
                  </div>
                  {dislikedArtists.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {dislikedArtists.map((a) => (
                        <span
                          key={a}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-vibe-rose/10 border border-vibe-rose/30 text-vibe-rose"
                        >
                          <span>{a}</span>
                          <button
                            type="button"
                            onClick={() => setDislikedArtists((prev) => prev.filter((item) => item !== a))}
                            className="hover:text-white"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* 5. Exploration & Diversity Controls */}
                <div className="pt-3 border-t border-surface-border space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold text-content-primary flex items-center gap-1.5">
                        <Compass className="w-3.5 h-3.5 text-brand-400" />
                        Exploration Level (Novelty)
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
                    <div className="flex justify-between text-[10px] text-content-muted mt-1">
                      <span>0% (Familiar)</span>
                      <span>50% (Balanced)</span>
                      <span>100% (High Novelty)</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold text-content-primary">
                        Artist Diversity Level
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
                    <div className="flex justify-between text-[10px] text-content-muted mt-1">
                      <span>Focused / Top creators</span>
                      <span>Broad catalogue spread</span>
                    </div>
                  </div>
                </div>

                {/* 6. Default / Preferred Mood */}
                <div className="pt-3 border-t border-surface-border">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-content-primary">
                      Default Listening Vibe / Mood
                    </label>
                    {preferredMood && (
                      <button
                        type="button"
                        onClick={() => setPreferredMood(null)}
                        className="text-[10px] text-content-muted hover:text-vibe-rose"
                      >
                        Clear default
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-content-secondary mb-2">
                    Optional starting mood when you open TuneSense.
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {MOOD_OPTIONS.map((m) => {
                      const isSel = preferredMood === m.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setPreferredMood(isSel ? null : m.id)}
                          className={`flex items-center gap-2 p-2.5 rounded-card text-xs min-h-[44px] transition-all border text-left ${
                            isSel
                              ? 'bg-brand-500/15 border-brand-500 text-brand-300 font-medium'
                              : 'bg-surface-elevated/70 hover:bg-surface-elevated border-surface-border text-content-secondary'
                          }`}
                        >
                          <span className="text-base select-none">{m.emoji}</span>
                          <span>{m.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Save Button */}
                <div className="pt-4 border-t border-surface-border">
                  <Button
                    variant="primary"
                    fullWidth
                    size="md"
                    onClick={handleSavePreferences}
                    isLoading={prefSaving}
                    leftIcon={<Save className="w-4 h-4" />}
                    className="min-h-[44px]"
                  >
                    Save Preferences
                  </Button>
                </div>
              </>
            )}
          </Card>
        </div>
      )}

      {/* Account Details / Status Info Card */}
      <div className="mb-4">
        <h3 className="text-xs font-semibold text-content-secondary uppercase tracking-wider mb-2 px-1">
          Identity & Security
        </h3>
        <Card className="p-4 space-y-2.5 text-xs">
          <div className="flex items-center justify-between py-1 border-b border-surface-border">
            <span className="text-content-secondary">Authentication State</span>
            <span className="font-medium flex items-center gap-1.5 text-content-primary">
              <CheckCircle className="w-3.5 h-3.5 text-vibe-emerald" />
              {isAuthenticated ? 'Authenticated User' : 'Guest (Unauthenticated)'}
            </span>
          </div>
          <div className="flex items-center justify-between py-1 border-b border-surface-border">
            <span className="text-content-secondary">Token Storage</span>
            <span className="font-mono text-brand-400">HTTP-Only Cookie (tunesense_token)</span>
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-content-secondary">Password Security</span>
            <span className="font-mono text-content-primary">bcryptjs (Work Factor 12)</span>
          </div>
        </Card>
      </div>

      {/* System Diagnostic & Environment Status */}
      <div className="mb-4">
        <h3 className="text-xs font-semibold text-content-secondary uppercase tracking-wider mb-2 px-1">
          System & Environment
        </h3>
        <Card className="p-4 space-y-2 text-xs">
          <div className="flex items-center justify-between py-1 border-b border-surface-border">
            <span className="text-content-secondary flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-brand-400" />
              API Service
            </span>
            <span className="font-mono text-content-primary">
              {health?.service || 'Connected'}
            </span>
          </div>
          <div className="flex items-center justify-between py-1 border-b border-surface-border">
            <span className="text-content-secondary">Environment</span>
            <span className="font-mono text-brand-400 capitalize">
              {health?.environment || 'development'}
            </span>
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-content-secondary">Current Milestone</span>
            <span className="font-mono text-vibe-emerald">Stage 8 Personalization & Mood</span>
          </div>
        </Card>
      </div>

      {/* Academic Project Identity Card */}
      <Card className="p-4 bg-surface/30 border-surface-border">
        <div className="flex items-start gap-2.5">
          <Info className="w-4 h-4 text-brand-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-bold text-content-primary uppercase tracking-wide">
              Academic Context
            </h4>
            <p className="text-xs text-content-secondary mt-1 leading-relaxed">
              {APP_INFO.academicTitle}
            </p>
          </div>
        </div>
      </Card>
    </PageContainer>
  );
};

export default ProfilePage;
