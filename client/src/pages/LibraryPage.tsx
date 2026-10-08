import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Library, Heart, Clock, ListMusic, Plus } from 'lucide-react';
import { PageContainer } from '../components/layout/PageContainer.js';
import { Card } from '../components/ui/Card.js';
import { Badge } from '../components/ui/Badge.js';
import { Button } from '../components/ui/Button.js';

type Tab = 'playlists' | 'likes' | 'history';

export const LibraryPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('playlists');
  const navigate = useNavigate();

  return (
    <PageContainer>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-content-primary">Your Library</h2>
          <p className="text-xs text-content-secondary mt-0.5">
            Playlists, favorite tracks, and listening history
          </p>
        </div>
        <Badge variant="emerald" size="sm">
          Stage 1 Shell
        </Badge>
      </div>

      {/* Library Filter Pills */}
      <div className="flex gap-2 mb-5">
        <Button
          variant={activeTab === 'playlists' ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('playlists')}
          leftIcon={<ListMusic className="w-3.5 h-3.5" />}
        >
          Playlists
        </Button>
        <Button
          variant={activeTab === 'likes' ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('likes')}
          leftIcon={<Heart className="w-3.5 h-3.5" />}
        >
          Liked Tracks
        </Button>
        <Button
          variant={activeTab === 'history' ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('history')}
          leftIcon={<Clock className="w-3.5 h-3.5" />}
        >
          History
        </Button>
      </div>

      {/* Tab Content Placeholder */}
      <div className="space-y-3">
        <Card
          interactive
          onClick={() => navigate('/playlist/new')}
          className="border-dashed border-surface-border flex items-center justify-center p-6 text-center"
        >
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 rounded-full bg-brand-500/10 text-brand-400 flex items-center justify-center mb-2">
              <Plus className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-semibold text-content-primary">Create New Playlist</h4>
            <p className="text-xs text-content-muted mt-0.5">
              Playlist persistence schema mapped in MongoDB design
            </p>
          </div>
        </Card>

        <Card className="p-4 bg-surface/30 border-surface-border text-center">
          <Library className="w-7 h-7 text-content-muted mx-auto mb-2" />
          <h4 className="text-sm font-semibold text-content-primary">
            NoSQL Storage Ready
          </h4>
          <p className="text-xs text-content-muted mt-1 max-w-xs mx-auto">
            User libraries and listening interaction logs will be connected to MongoDB Atlas in subsequent stages.
          </p>
        </Card>
      </div>
    </PageContainer>
  );
};
