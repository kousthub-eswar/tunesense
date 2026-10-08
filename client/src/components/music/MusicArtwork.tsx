import React from 'react';
import { Music2 } from 'lucide-react';
import { cn } from '../../utils/cn.js';

export interface MusicArtworkProps {
  src?: string;
  alt?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  fallbackIcon?: React.ReactNode;
}

export const MusicArtwork: React.FC<MusicArtworkProps> = ({
  src,
  alt = 'Music Artwork',
  size = 'md',
  className,
  fallbackIcon,
}) => {
  const sizeStyles = {
    sm: 'w-10 h-10 rounded-lg min-w-[40px]',
    md: 'w-14 h-14 rounded-artwork min-w-[56px]',
    lg: 'w-24 h-24 rounded-artwork min-w-[96px]',
    xl: 'w-48 h-48 rounded-2xl min-w-[192px]',
  };

  return (
    <div
      className={cn(
        'relative overflow-hidden bg-surface-hover flex items-center justify-center border border-surface-border shrink-0 shadow-sm',
        sizeStyles[size],
        className
      )}
    >
      {src ? (
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover select-none"
          loading="lazy"
        />
      ) : (
        fallbackIcon || <Music2 className="w-1/2 h-1/2 text-content-muted" />
      )}
    </div>
  );
};
