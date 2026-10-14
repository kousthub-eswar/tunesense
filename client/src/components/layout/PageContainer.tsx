import React from 'react';
import { cn } from '../../utils/cn.js';

export interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
  hasBottomNav?: boolean;
}

export const PageContainer: React.FC<PageContainerProps> = ({
  children,
  className,
  hasBottomNav = true,
}) => {
  return (
    <div
      className={cn(
        'w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 overflow-x-hidden text-ink',
        hasBottomNav && 'pb-24 md:pb-20',
        className
      )}
    >
      {children}
    </div>
  );
};
