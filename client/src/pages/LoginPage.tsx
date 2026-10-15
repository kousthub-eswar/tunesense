import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Music, LogIn, AlertCircle, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { PageContainer } from '../components/layout/PageContainer.js';
import { Card } from '../components/ui/Card.js';
import { Input } from '../components/ui/Input.js';
import { Button } from '../components/ui/Button.js';
import { useAuth } from '../contexts/AuthContext.js';
import { preferenceService } from '../services/preferenceService.js';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated } = useAuth();

  // If already authenticated, redirect to home
  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/home', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  // Target to return to after successful login
  const from = (location.state as { from?: { pathname?: string } })?.from?.pathname || '/home';

  const validate = () => {
    const errors: { email?: string; password?: string } = {};
    if (!email.trim()) {
      errors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'Please enter a valid email address';
    }

    if (!password) {
      errors.password = 'Password is required';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validate()) {
      return;
    }

    setIsLoading(true);
    try {
      await login({ email: email.trim(), password });

      // Check whether user has configured preferences; if not, send to onboarding
      try {
        const prefs = await preferenceService.getPreferences();
        const hasConfigured =
          (prefs?.preferredGenres && prefs.preferredGenres.length > 0) ||
          (prefs?.favoriteGenres && prefs.favoriteGenres.length > 0) ||
          Boolean(prefs?.preferredMood);

        if (!hasConfigured) {
          navigate('/onboarding', { replace: true });
          return;
        }
      } catch {
        // If preferences call fails or is unconfigured, guide to onboarding
        navigate('/onboarding', { replace: true });
        return;
      }

      navigate(from, { replace: true });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Invalid credentials. Please verify your email and password.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PageContainer hasBottomNav={false}>
      <div className="max-w-md mx-auto pt-4 pb-12">
        {/* Navigation back to landing page */}
        <div className="mb-4">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs text-content-muted hover:text-content-primary transition-colors py-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to TuneSense</span>
          </Link>
        </div>

        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-500/10 border border-brand-500/20 text-brand-400 mb-4">
            <Music className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-content-primary tracking-tight">
            Welcome Back
          </h1>
          <p className="text-xs text-content-secondary mt-1.5">
            Sign in to your personalized music discovery account
          </p>
        </div>

        {/* Login Form Card */}
        <Card className="p-6 bg-surface border-surface-border shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {error && (
              <div className="flex items-start gap-2.5 p-3 rounded-card bg-vibe-rose/10 border border-vibe-rose/20 text-vibe-rose text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            <Input
              id="login-email"
              type="email"
              label="Email Address"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
              }}
              error={fieldErrors.email}
              autoComplete="email"
              disabled={isLoading}
              required
            />

            <Input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              label="Password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }));
              }}
              error={fieldErrors.password}
              autoComplete="current-password"
              disabled={isLoading}
              required
              rightElement={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-1 text-content-muted hover:text-content-primary transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
            />

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                fullWidth
                size="md"
                isLoading={isLoading}
                leftIcon={<LogIn className="w-4 h-4" />}
              >
                Sign In
              </Button>
            </div>

            {/* Quick-fill Demo Account Personas */}
            <div className="pt-4 border-t border-surface-border/60">
              <p className="text-[11px] font-semibold text-content-muted uppercase tracking-wider mb-2.5 text-center">
                Select Demo Persona to Present
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEmail('alice@demo.tunesense.ai');
                    setPassword('DemoPassword123!');
                    setFieldErrors({});
                  }}
                  className="p-2 text-left rounded-xl bg-surface-secondary/60 hover:bg-surface-secondary border border-surface-border/70 hover:border-brand-500/50 transition-all text-xs group"
                >
                  <div className="font-semibold text-content-primary group-hover:text-brand-300 flex items-center justify-between">
                    <span>Alice Parker</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-brand-500/20 text-brand-300 font-mono">EDM</span>
                  </div>
                  <div className="text-[10px] text-content-muted mt-0.5">Content-Based / Recency</div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEmail('bob@demo.tunesense.ai');
                    setPassword('DemoPassword123!');
                    setFieldErrors({});
                  }}
                  className="p-2 text-left rounded-xl bg-surface-secondary/60 hover:bg-surface-secondary border border-surface-border/70 hover:border-accent-purple/50 transition-all text-xs group"
                >
                  <div className="font-semibold text-content-primary group-hover:text-accent-purple flex items-center justify-between">
                    <span>Bob Martinez</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono">CF</span>
                  </div>
                  <div className="text-[10px] text-content-muted mt-0.5">Collaborative Filter Peer</div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEmail('charlie@demo.tunesense.ai');
                    setPassword('DemoPassword123!');
                    setFieldErrors({});
                  }}
                  className="p-2 text-left rounded-xl bg-surface-secondary/60 hover:bg-surface-secondary border border-surface-border/70 hover:border-accent-amber/50 transition-all text-xs group"
                >
                  <div className="font-semibold text-content-primary group-hover:text-accent-amber flex items-center justify-between">
                    <span>Charlie Vance</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono">Rock</span>
                  </div>
                  <div className="text-[10px] text-content-muted mt-0.5">Negative Filter (Anti-EDM)</div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEmail('dana@demo.tunesense.ai');
                    setPassword('DemoPassword123!');
                    setFieldErrors({});
                  }}
                  className="p-2 text-left rounded-xl bg-surface-secondary/60 hover:bg-surface-secondary border border-surface-border/70 hover:border-accent-emerald/50 transition-all text-xs group"
                >
                  <div className="font-semibold text-content-primary group-hover:text-accent-emerald flex items-center justify-between">
                    <span>Dana Sterling</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">Cold</span>
                  </div>
                  <div className="text-[10px] text-content-muted mt-0.5">Cold-Start / Classical Calm</div>
                </button>
              </div>
            </div>
          </form>
        </Card>

        {/* Footer Links */}
        <div className="text-center mt-6 space-y-3">
          <p className="text-xs text-content-secondary">
            Don't have an account yet?{' '}
            <Link
              to="/signup"
              className="font-medium text-brand-400 hover:text-brand-300 transition-colors underline-offset-4 hover:underline"
            >
              Create Account
            </Link>
          </p>

          <div className="pt-1">
            <Link
              to="/home"
              className="text-xs text-content-muted hover:text-white transition-colors underline-offset-4 hover:underline"
            >
              Continue as Guest →
            </Link>
          </div>
        </div>
      </div>
    </PageContainer>
  );
};

export default LoginPage;
