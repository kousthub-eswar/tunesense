import React from 'react';
import { MusicArtwork } from './MusicArtwork.js';
import { cn } from '../../utils/cn.js';

export interface AlbumCardProps {
  id: string;
  title: string;
  artist: string;
  coverUrl?: string;
  year?: number;
  onClick?: () => void;
  className?: string;
}

export const AlbumCard: React.FC<AlbumCardProps> = ({
  title,
  artist,
  coverUrl,
  year,
  onClick,
  className,
}) => {
  return (
    <div
      onClick={onClick}
      className={cn(
        'group flex flex-col p-2.5 rounded-card bg-surface/50 hover:bg-surface border border-transparent hover:border-surface-border transition-all duration-200 cursor-pointer',
        className
      )}
    >
      <MusicArtwork
        src={coverUrl}
        alt={title}
        size="lg"
        className="w-full aspect-square rounded-artwork mb-2.5"
      />
      <h4 className="text-xs font-semibold text-content-primary truncate">{title}</h4>
      <p className="text-[11px] text-content-secondary truncate mt-0.5">
        {artist} {year ? `• ${year}` : ''}
      </p>
    </div>
  );
};
