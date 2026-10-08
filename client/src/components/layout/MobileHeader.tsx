import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Radio } from 'lucide-react';
import { IconButton } from '../ui/IconButton.js';
import { cn } from '../../utils/cn.js';

export interface MobileHeaderProps {
  title?: string;
  showSearch?: boolean;
  className?: string;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({
  title,
  showSearch = true,
  className,
}) => {
  const navigate = useNavigate();

  return (
    <header
      className={cn(
        'sticky top-0 z-40 w-full bg-bg-main/90 backdrop-blur-md border-b border-surface-border px-4 py-3 flex items-center justify-between',
        className
      )}
    >
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-brand-500/15 border border-brand-500/30 flex items-center justify-center text-brand-400">
          <Radio className="w-4 h-4 text-brand-400" />
        </div>
        <div>
          <h1 className="text-base font-bold text-content-primary leading-tight tracking-tight">
            {title || 'TuneSense'}
          </h1>
          {!title && (
            <p className="text-[11px] text-brand-400 font-medium leading-none">
              Music that understands your vibe
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1">
        {showSearch && (
          <IconButton
            icon={<Search className="w-4 h-4 text-content-secondary" />}
            aria-label="Search"
            size="sm"
            onClick={() => navigate('/search')}
          />
        )}
      </div>
    </header>
  );
};
