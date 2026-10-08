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
    'inline-flex items-center justify-center rounded-full transition-all duration-200 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-main disabled:opacity-40 disabled:pointer-events-none select-none';

  const sizeStyles = {
    sm: 'w-8 h-8 text-sm min-w-[32px] min-h-[32px]',
    md: 'w-11 h-11 text-base min-w-[44px] min-h-[44px]',
    lg: 'w-13 h-13 text-lg min-w-[52px] min-h-[52px]',
  };

  const variantStyles = {
    primary: 'bg-brand-500 text-white hover:bg-brand-600 shadow-md shadow-brand-500/25',
    secondary: 'bg-surface hover:bg-surface-hover text-content-primary border border-surface-border',
    ghost: 'bg-transparent hover:bg-white/10 text-content-secondary hover:text-content-primary',
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
