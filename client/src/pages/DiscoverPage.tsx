import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Compass, Sparkles, Search } from 'lucide-react';
import { PageContainer } from '../components/layout/PageContainer.js';
import { Card } from '../components/ui/Card.js';
import { Badge } from '../components/ui/Badge.js';
import { Button } from '../components/ui/Button.js';
import { Input } from '../components/ui/Input.js';

const DISCOVER_GENRES = [
  { name: 'Ambient Chill', color: 'from-purple-900/60 to-indigo-900/60', vibe: 'ambient' },
  { name: 'Cyber Synth', color: 'from-cyan-900/60 to-blue-900/60', vibe: 'synth' },
  { name: 'Acoustic Folk', color: 'from-emerald-900/60 to-teal-900/60', vibe: 'acoustic' },
  { name: 'Deep Lo-Fi', color: 'from-amber-900/60 to-orange-900/60', vibe: 'lofi' },
  { name: 'Kinetic Beats', color: 'from-rose-900/60 to-pink-900/60', vibe: 'electronic' },
  { name: 'Indie Wave', color: 'from-violet-900/60 to-fuchsia-900/60', vibe: 'indie' },
];

export const DiscoverPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <PageContainer>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-content-primary">Discover</h2>
          <p className="text-xs text-content-secondary mt-0.5">
            Explore vibes, genres, and independent music
          </p>
        </div>
        <Badge variant="cyan" size="sm">
          Stage 3 • Jamendo
        </Badge>
      </div>

      <div className="flex gap-2 mb-5">
        <Input
          isSearch
          placeholder="Search Jamendo catalogue..."
          className="flex-1 cursor-pointer"
          onClick={() => navigate('/search')}
          readOnly
        />
        <Button
          variant="primary"
          size="md"
          aria-label="Search"
          onClick={() => navigate('/search')}
        >
          <Search className="w-4 h-4" />
        </Button>
      </div>

      <div className="mb-6">
        <h3 className="text-sm font-semibold text-content-secondary uppercase tracking-wider mb-3">
          Curated Vibe Spaces
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {DISCOVER_GENRES.map((genre) => (
            <Card
              key={genre.name}
              interactive
              onClick={() => navigate('/search')}
              className={`p-4 bg-gradient-to-br ${genre.color} border-surface-border flex flex-col justify-between min-h-[105px]`}
            >
              <span className="text-xs font-mono text-content-secondary uppercase">
                {genre.vibe}
              </span>
              <div>
                <h4 className="text-sm font-bold text-white leading-tight">
                  {genre.name}
                </h4>
                <div className="flex items-center gap-1 text-[11px] text-content-muted mt-1">
                  <Sparkles className="w-3 h-3 text-brand-400" />
                  <span>Catalogue Active</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <Card className="p-4 bg-surface/50 border-surface-border text-center">
        <Compass className="w-8 h-8 text-brand-400 mx-auto mb-2" />
        <h4 className="text-sm font-semibold text-content-primary">
          Live Music Provider
        </h4>
        <p className="text-xs text-content-muted mt-1 leading-relaxed">
          Integrated with the Jamendo API behind an abstracted <code className="text-brand-300">IMusicProvider</code> interface.
          Tap Search to browse tracks and test real-time HTML5 audio streaming.
        </p>
      </Card>
    </PageContainer>
  );
};
