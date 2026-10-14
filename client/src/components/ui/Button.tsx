import React from 'react';
import { cn } from '../../utils/cn.js';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  className,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  isLoading = false,
  disabled = false,
  leftIcon,
  rightIcon,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-medium rounded-full transition-all duration-200 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-ultramarine focus-visible:ring-offset-2 focus-visible:ring-offset-fog dark:focus-visible:ring-offset-slate-950 disabled:opacity-50 disabled:pointer-events-none select-none';

  const sizeStyles = {
    sm: 'text-scale-14 px-3.5 py-1.5 min-h-[36px] gap-1.5',
    md: 'text-scale-16 px-5 py-2.5 min-h-[44px] gap-2',
    lg: 'text-scale-16 px-6 py-3 min-h-[50px] gap-2.5 font-semibold',
  };

  const variantStyles = {
    primary:
      'bg-ultramarine text-white hover:bg-ultramarine-hover shadow-sm active:bg-ultramarine-hover',
    secondary:
      'bg-white/70 dark:bg-slate-800/80 hover:bg-white/95 dark:hover:bg-slate-700 text-ink dark:text-slate-100 border border-white/60 dark:border-white/10 backdrop-blur-md shadow-subtle active:bg-white dark:active:bg-slate-800',
    ghost:
      'bg-transparent hover:bg-black/5 dark:hover:bg-white/5 text-ink/70 dark:text-slate-300 hover:text-ink dark:hover:text-white active:bg-black/10 dark:active:bg-white/10',
    outline:
      'bg-transparent border border-ink/20 dark:border-white/20 text-ink dark:text-slate-100 hover:bg-white/60 dark:hover:bg-white/10 active:bg-white/80 dark:active:bg-white/20',
    danger:
      'bg-tangerine text-white hover:opacity-90 shadow-sm',
  };

  return (
    <button
      className={cn(
        baseStyles,
        sizeStyles[size],
        variantStyles[variant],
        fullWidth && 'w-full',
        className
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        leftIcon
      )}
      <span>{children}</span>
      {!isLoading && rightIcon}
    </button>
  );
};
