import React from 'react';
import { cn } from '../../utils/cn.js';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'brand' | 'cyan' | 'emerald' | 'amber' | 'rose' | 'neutral' | 'ultramarine' | 'tangerine' | 'mint' | 'orchid';
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
    brand: 'bg-ultramarine/10 dark:bg-ultramarine/20 text-ultramarine dark:text-indigo-300 border-ultramarine/20 dark:border-ultramarine/40',
    ultramarine: 'bg-ultramarine/10 dark:bg-ultramarine/20 text-ultramarine dark:text-indigo-300 border-ultramarine/20 dark:border-ultramarine/40',
    cyan: 'bg-mood-chill/15 dark:bg-mood-chill/20 text-sky-700 dark:text-sky-300 border-mood-chill/30 dark:border-mood-chill/40',
    emerald: 'bg-mint/15 dark:bg-mint/20 text-emerald-800 dark:text-emerald-300 border-mint/30 dark:border-mint/40',
    mint: 'bg-mint/15 dark:bg-mint/20 text-emerald-800 dark:text-emerald-300 border-mint/30 dark:border-mint/40',
    amber: 'bg-mood-happy/15 dark:bg-mood-happy/20 text-amber-800 dark:text-amber-300 border-mood-happy/30 dark:border-mood-happy/40',
    rose: 'bg-mood-party/15 dark:bg-mood-party/20 text-rose-800 dark:text-rose-300 border-mood-party/30 dark:border-mood-party/40',
    tangerine: 'bg-tangerine/15 dark:bg-tangerine/20 text-orange-800 dark:text-orange-300 border-tangerine/30 dark:border-tangerine/40',
    orchid: 'bg-orchid/15 dark:bg-orchid/20 text-purple-800 dark:text-purple-300 border-orchid/30 dark:border-orchid/40',
    neutral: 'bg-black/5 dark:bg-white/10 text-ink/80 dark:text-slate-200 border-black/10 dark:border-white/15',
  };

  const sizeStyles = {
    sm: 'text-scale-14 px-2.5 py-0.5 text-xs',
    md: 'text-scale-14 px-3 py-1 text-sm',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-[10px] border normal-case',
        variantStyles[variant as keyof typeof variantStyles] || variantStyles.neutral,
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};
