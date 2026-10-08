import React from 'react';
import { cn } from '../../utils/cn.js';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
  padded?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  interactive = false,
  padded = true,
  ...props
}) => {
  return (
    <div
      className={cn(
        'bg-surface rounded-card border border-surface-border transition-all duration-200',
        padded && 'p-4',
        interactive && 'cursor-pointer hover:bg-surface-hover hover:border-surface-border-active active:scale-[0.99]',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
