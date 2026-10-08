import React from 'react';
import { cn } from '../../utils/cn.js';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'rectangular' | 'circular' | 'rounded';
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className,
  variant = 'rounded',
  ...props
}) => {
  const variantStyles = {
    rectangular: 'rounded-none',
    circular: 'rounded-full',
    rounded: 'rounded-card',
  };

  return (
    <div
      className={cn(
        'animate-pulse bg-surface/80',
        variantStyles[variant],
        className
      )}
      {...props}
    />
  );
};
