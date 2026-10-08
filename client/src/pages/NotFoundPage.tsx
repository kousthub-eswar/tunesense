import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { PageContainer } from '../components/layout/PageContainer.js';
import { Card } from '../components/ui/Card.js';
import { Button } from '../components/ui/Button.js';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <PageContainer>
      <Card className="p-8 text-center border-surface-border">
        <div className="w-12 h-12 rounded-full bg-vibe-rose/15 text-vibe-rose flex items-center justify-center mx-auto mb-3">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-content-primary mb-1">Page Not Found</h2>
        <p className="text-xs text-content-secondary mb-6">
          The requested path does not exist in TuneSense.
        </p>
        <Button variant="primary" size="md" onClick={() => navigate('/home')}>
          Go to Home
        </Button>
      </Card>
    </PageContainer>
  );
};
