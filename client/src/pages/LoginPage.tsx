import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Music, LogIn, AlertCircle, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { PageContainer } from '../components/layout/PageContainer.js';
import { Card } from '../components/ui/Card.js';
import { Input } from '../components/ui/Input.js';
import { Button } from '../components/ui/Button.js';
import { useAuth } from '../contexts/AuthContext.js';

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
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-500/10 border border-brand-500/20 text-brand-400 mb-4 shadow-lg shadow-brand-500/10">
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
                className="shadow-glow"
              >
                Sign In
              </Button>
            </div>
          </form>
        </Card>

        {/* Footer Links */}
        <div className="text-center mt-6 space-y-2">
          <p className="text-xs text-content-secondary">
            Don't have an account yet?{' '}
            <Link
              to="/signup"
              className="font-medium text-brand-400 hover:text-brand-300 transition-colors underline-offset-4 hover:underline"
            >
              Create Account
            </Link>
          </p>
        </div>
      </div>
    </PageContainer>
  );
};

export default LoginPage;
