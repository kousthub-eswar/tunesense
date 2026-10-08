import React from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Construction, ArrowLeft, Layers } from 'lucide-react';
import { PageContainer } from '../components/layout/PageContainer.js';
import { Card } from '../components/ui/Card.js';
import { Badge } from '../components/ui/Badge.js';
import { Button } from '../components/ui/Button.js';

interface RouteMilestoneInfo {
  title: string;
  stage: string;
  description: string;
  badgeVariant: 'brand' | 'cyan' | 'amber' | 'emerald' | 'rose';
}

const ROUTE_META_MAP: Record<string, RouteMilestoneInfo> = {
  '/login': {
    title: 'User Authentication',
    stage: 'Future Stage: Auth & JWT',
    description: 'Secure JWT authentication with bcrypt password hashing and token refresh.',
    badgeVariant: 'amber',
  },
  '/signup': {
    title: 'Account Registration',
    stage: 'Future Stage: Auth & JWT',
    description: 'New user registration, onboarding profile creation, and initial cold-start preference seed.',
    badgeVariant: 'amber',
  },
  '/onboarding': {
    title: 'Vibe Onboarding',
    stage: 'Future Stage: Cold Start Preference',
    description: 'Initial taste profile builder to solve the recommendation cold-start problem.',
    badgeVariant: 'brand',
  },
  '/search': {
    title: 'Music & Vibe Search',
    stage: 'Future Stage: Catalog Integration',
    description: 'Full-text catalog querying via abstracted MusicProvider interface (Jamendo).',
    badgeVariant: 'cyan',
  },
  '/player': {
    title: 'Full Screen Music Player',
    stage: 'Future Stage: Playback Engine',
    description: 'Full screen player with audio buffer, waveform, queue management, and like/skip events.',
    badgeVariant: 'brand',
  },
  '/recommendations': {
    title: 'Explainable AI Engine',
    stage: 'Future Stage: Recommendation Core',
    description: 'Context-aware, mood-aware, and hybrid collaborative recommendations with explainability badges.',
    badgeVariant: 'emerald',
  },
};

export const PlaceholderPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams();

  // Match route or dynamic route patterns
  let meta = ROUTE_META_MAP[location.pathname];

  if (!meta) {
    if (location.pathname.startsWith('/playlist/')) {
      meta = {
        title: `Playlist (${params.id || 'Custom'})`,
        stage: 'Future Stage: NoSQL Playlists',
        description: 'Mongoose playlist document schema with track sequencing and user ownership.',
        badgeVariant: 'emerald',
      };
    } else if (location.pathname.startsWith('/song/')) {
      meta = {
        title: `Track View (${params.id || 'Details'})`,
        stage: 'Future Stage: Track Details & Audio',
        description: 'Audio metadata, provider streaming source, and real-time interaction hooks.',
        badgeVariant: 'cyan',
      };
    } else {
      meta = {
        title: 'Architectural Placeholder',
        stage: 'Subsequent Stage',
        description: 'This route shell is defined in the application routing hierarchy for later expansion.',
        badgeVariant: 'brand',
      };
    }
  }

  return (
    <PageContainer>
      <div className="flex items-center gap-2 mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          leftIcon={<ArrowLeft className="w-4 h-4" />}
        >
          Back
        </Button>
      </div>

      <Card className="p-6 text-center border-brand-500/20 bg-gradient-to-b from-surface to-bg-elevated">
        <div className="w-12 h-12 rounded-2xl bg-brand-500/15 border border-brand-500/30 text-brand-400 flex items-center justify-center mx-auto mb-3">
          <Construction className="w-6 h-6" />
        </div>

        <div className="mb-2">
          <Badge variant={meta.badgeVariant} size="sm">
            {meta.stage}
          </Badge>
        </div>

        <h2 className="text-lg font-bold text-content-primary mb-2">
          {meta.title}
        </h2>

        <p className="text-xs text-content-secondary max-w-xs mx-auto leading-relaxed mb-6">
          {meta.description}
        </p>

        <div className="p-3 bg-bg-main/60 rounded-card border border-surface-border text-left mb-6">
          <div className="flex items-center gap-2 text-content-primary font-semibold text-xs mb-1">
            <Layers className="w-4 h-4 text-brand-400" />
            <span>Architecture Readiness</span>
          </div>
          <p className="text-[11px] text-content-muted leading-tight">
            Route defined at <code className="text-brand-300 font-mono">{location.pathname}</code>.
            Boundaries for Express API, MongoDB, and Provider modules established.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          fullWidth
          onClick={() => navigate('/home')}
        >
          Return to Home
        </Button>
      </Card>
    </PageContainer>
  );
};
