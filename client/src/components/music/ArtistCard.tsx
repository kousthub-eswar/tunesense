import React from 'react';
import { Avatar } from '../ui/Avatar.js';
import { cn } from '../../utils/cn.js';

export interface ArtistCardProps {
  id: string;
  name: string;
  imageUrl?: string;
  genre?: string;
  onClick?: () => void;
  className?: string;
}

export const ArtistCard: React.FC<ArtistCardProps> = ({
  name,
  imageUrl,
  genre,
  onClick,
  className,
}) => {
  return (
    <div
      onClick={onClick}
      className={cn(
        'flex flex-col items-center p-3 rounded-card bg-surface/40 hover:bg-surface border border-transparent hover:border-surface-border transition-all duration-200 cursor-pointer text-center',
        className
      )}
    >
      <Avatar src={imageUrl} name={name} size="xl" className="mb-2 shadow-md" />
      <span className="text-xs font-semibold text-content-primary truncate max-w-full">
        {name}
      </span>
      {genre && (
        <span className="text-[11px] text-content-muted truncate max-w-full mt-0.5">
          {genre}
        </span>
      )}
    </div>
  );
};
