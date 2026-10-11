import React, { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Radio,
  Sparkles,
  ArrowRight,
  LogIn,
  UserPlus,
  Compass,
  Headphones,
  Sliders,
  Disc,
} from 'lucide-react';
import { Button } from '../components/ui/Button.js';
import { useAuth } from '../contexts/AuthContext.js';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();

  // If already authenticated, redirect directly to Home without flashing
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate('/home', { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  return (
    <div className="min-h-screen bg-[#0b0b10] text-content-primary flex flex-col justify-between relative overflow-x-hidden select-none">
      {/* Background Ambient Glow Gradients */}
      <div
        className="pointer-events-none absolute top-[-10%] left-1/2 -translate-x-1/2 w-[600px] h-[500px] rounded-full bg-brand-500/10 blur-[130px] -z-10"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute bottom-[10%] right-[-10%] w-[450px] h-[450px] rounded-full bg-vibe-cyan/10 blur-[140px] -z-10"
        aria-hidden="true"
      />

      {/* Top Header Bar */}
      <header className="w-full max-w-6xl mx-auto px-5 py-5 sm:py-6 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-brand-500/15 border border-brand-500/30 flex items-center justify-center text-brand-400 shadow-glow">
            <Radio className="w-5 h-5 text-brand-400" />
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
              TuneSense
              <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
            </span>
          </div>
        </div>

        <Link
          to="/login"
          className="text-xs font-semibold text-content-secondary hover:text-white transition-colors flex items-center gap-1.5 py-1.5 px-3 rounded-full hover:bg-white/5 border border-transparent hover:border-surface-border"
        >
          <LogIn className="w-3.5 h-3.5" />
          <span>Sign In</span>
        </Link>
      </header>

      {/* Main Hero & Visual Composition */}
      <main className="w-full max-w-5xl mx-auto px-5 py-6 sm:py-10 flex-1 flex flex-col items-center justify-center text-center">
        {/* Subtle Vibe Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/25 text-brand-300 text-xs font-medium mb-6 shadow-glow/30">
          <Sparkles className="w-3.5 h-3.5 text-brand-400" />
          <span>Next-Generation Music Discovery</span>
        </div>

        {/* Primary Tagline */}
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white max-w-3xl leading-[1.15]">
          Music that understands <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-brand-300 via-brand-400 to-vibe-cyan bg-clip-text text-transparent">
            your vibe.
          </span>
        </h1>

        {/* Benefit Statement */}
        <p className="mt-4 sm:mt-5 text-sm sm:text-base text-content-secondary max-w-xl mx-auto leading-relaxed">
          TuneSense adapts to how you feel. Discover curated tracks, mood-aligned playlists, and transparent recommendations tailored to your unique taste.
        </p>

        {/* Tasteful Visual Music Composition */}
        <div className="mt-8 mb-8 sm:mt-10 sm:mb-10 w-full max-w-md sm:max-w-lg mx-auto relative px-4">
          <div className="relative mx-auto w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center">
            {/* Ambient Record Glow */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-brand-600/20 via-brand-500/30 to-vibe-cyan/20 blur-xl" />

            {/* Glowing Vinyl Visual */}
            <div className="relative w-56 h-56 sm:w-64 sm:h-64 rounded-full bg-gradient-to-br from-[#1a1a26] via-[#101018] to-[#0d0d14] border border-white/10 shadow-2xl flex items-center justify-center">
              {/* Concentric Grooves */}
              <div className="absolute inset-3 rounded-full border border-white/[0.04]" />
              <div className="absolute inset-7 rounded-full border border-white/[0.04]" />
              <div className="absolute inset-12 rounded-full border border-white/[0.06]" />
              <div className="absolute inset-16 rounded-full border border-white/[0.04]" />

              {/* Center Vinyl Label */}
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-br from-brand-700 via-brand-600 to-brand-900 border-2 border-brand-400/40 shadow-glow flex flex-col items-center justify-center p-2 text-center">
                <Disc className="w-7 h-7 text-white/90 animate-spin" style={{ animationDuration: '10s' }} />
                <span className="text-[10px] font-bold tracking-wider text-white uppercase mt-1">
                  TuneSense
                </span>
                <span className="text-[8px] text-brand-200">Hi-Fi Audio</span>
              </div>
            </div>

            {/* Floating Mood Chip 1 (Top Left) */}
            <div className="absolute -top-1 -left-2 sm:-left-6 bg-surface/90 backdrop-blur-md border border-brand-500/30 px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 animate-bounce" style={{ animationDuration: '4s' }}>
              <span className="text-xs">🎯</span>
              <span className="text-[11px] font-semibold text-brand-300">Deep Focus</span>
            </div>

            {/* Floating Mood Chip 2 (Bottom Right) */}
            <div className="absolute -bottom-1 -right-2 sm:-right-6 bg-surface/90 backdrop-blur-md border border-vibe-cyan/30 px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 animate-bounce" style={{ animationDuration: '5s' }}>
              <span className="text-xs">🌿</span>
              <span className="text-[11px] font-semibold text-vibe-cyan">Chill Ambient</span>
            </div>

            {/* Floating Mood Chip 3 (Top Right) */}
            <div className="absolute top-4 -right-1 sm:-right-4 bg-surface/90 backdrop-blur-md border border-brand-400/20 px-2.5 py-1 rounded-full shadow-md hidden xs:flex items-center gap-1">
              <span className="text-xs">⚡</span>
              <span className="text-[10px] font-medium text-white">Energetic</span>
            </div>
          </div>
        </div>

        {/* Action Buttons Section */}
        <div className="w-full max-w-sm mx-auto space-y-3.5">
          {/* Primary CTA: Create Account */}
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={() => navigate('/signup')}
            leftIcon={<UserPlus className="w-4 h-4" />}
            rightIcon={<ArrowRight className="w-4 h-4" />}
            className="text-sm font-semibold shadow-glow py-3.5 rounded-xl"
          >
            Create Account
          </Button>

          {/* Secondary CTA: Sign In */}
          <Button
            variant="secondary"
            size="lg"
            fullWidth
            onClick={() => navigate('/login')}
            leftIcon={<LogIn className="w-4 h-4" />}
            className="text-sm font-medium py-3 rounded-xl border border-surface-border hover:border-brand-500/40"
          >
            Sign In
          </Button>

          {/* Clearly Visible Text Option: Continue as Guest */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => navigate('/home')}
              className="text-xs text-content-secondary hover:text-white transition-colors underline-offset-4 hover:underline font-medium inline-flex items-center gap-1.5 py-2 px-3 rounded-lg hover:bg-white/5"
            >
              <span>Continue as Guest</span>
              <ArrowRight className="w-3.5 h-3.5 text-brand-400" />
            </button>
          </div>
        </div>

        {/* Trust & Feature Badges */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-[11px] text-content-muted">
          <div className="flex items-center gap-1.5">
            <Headphones className="w-3.5 h-3.5 text-brand-400" />
            <span>Instant Free Playback</span>
          </div>
          <span className="text-surface-border hidden sm:inline">•</span>
          <div className="flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-vibe-cyan" />
            <span>Mood & Genre Tuner</span>
          </div>
          <span className="text-surface-border hidden sm:inline">•</span>
          <div className="flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-brand-300" />
            <span>Explainable RecSys</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-5xl mx-auto px-5 py-4 text-center border-t border-surface-border/40">
        <p className="text-[11px] text-content-muted">
          TuneSense • Personalized, context-aware music discovery & streaming
        </p>
      </footer>
    </div>
  );
};

export default LandingPage;
