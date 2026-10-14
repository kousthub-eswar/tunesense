import React from 'react';
import { cn } from '../../utils/cn.js';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  'aria-label': string;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  className,
  variant = 'ghost',
  size = 'md',
  disabled,
  'aria-label': ariaLabel,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center rounded-full transition-all duration-200 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-ultramarine focus-visible:ring-offset-2 focus-visible:ring-offset-fog dark:focus-visible:ring-offset-slate-950 disabled:opacity-40 disabled:pointer-events-none select-none';

  const sizeStyles = {
    sm: 'w-8 h-8 text-sm min-w-[32px] min-h-[32px]',
    md: 'w-11 h-11 text-base min-w-[44px] min-h-[44px]',
    lg: 'w-13 h-13 text-lg min-w-[52px] min-h-[52px]',
  };

  const variantStyles = {
    primary: 'bg-ultramarine text-white hover:bg-ultramarine-hover shadow-sm',
    secondary: 'bg-white/70 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-700 text-ink dark:text-slate-100 border border-white/60 dark:border-white/10 shadow-subtle',
    ghost: 'bg-transparent hover:bg-black/5 dark:hover:bg-white/5 text-ink/70 dark:text-slate-300 hover:text-ink dark:hover:text-white',
  };

  return (
    <button
      aria-label={ariaLabel}
      className={cn(baseStyles, sizeStyles[size], variantStyles[variant], className)}
      disabled={disabled}
      {...props}
    >
      {icon}
    </button>
  );
};
