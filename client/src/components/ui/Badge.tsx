import React from 'react';
import { cn } from '../../utils/cn.js';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'brand' | 'cyan' | 'emerald' | 'amber' | 'rose' | 'neutral';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  className,
  variant = 'neutral',
  size = 'md',
  ...props
}) => {
  const variantStyles = {
    brand: 'bg-brand-500/15 text-brand-400 border-brand-500/30',
    cyan: 'bg-vibe-cyan/15 text-cyan-400 border-vibe-cyan/30',
    emerald: 'bg-vibe-emerald/15 text-emerald-400 border-vibe-emerald/30',
    amber: 'bg-vibe-amber/15 text-amber-400 border-vibe-amber/30',
    rose: 'bg-vibe-rose/15 text-rose-400 border-vibe-rose/30',
    neutral: 'bg-white/5 text-content-secondary border-surface-border',
  };

  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full border tracking-wide uppercase',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};
