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
    'inline-flex items-center justify-center font-medium transition-all duration-200 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-main disabled:opacity-50 disabled:pointer-events-none select-none rounded-button';

  const sizeStyles = {
    sm: 'text-xs px-3 py-2 min-h-[36px] gap-1.5',
    md: 'text-sm px-4 py-2.5 min-h-[44px] gap-2',
    lg: 'text-base px-6 py-3 min-h-[50px] gap-2.5',
  };

  const variantStyles = {
    primary:
      'bg-brand-500 text-white hover:bg-brand-600 shadow-lg shadow-brand-500/25 active:bg-brand-700',
    secondary:
      'bg-surface hover:bg-surface-hover text-content-primary border border-surface-border active:border-surface-border-active',
    ghost:
      'bg-transparent hover:bg-white/5 text-content-secondary hover:text-content-primary active:bg-white/10',
    outline:
      'bg-transparent border border-surface-border text-content-primary hover:bg-white/5 active:bg-white/10',
    danger:
      'bg-vibe-rose text-white hover:bg-rose-600 shadow-lg shadow-rose-500/20',
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
