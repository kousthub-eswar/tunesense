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
    <main
      className={cn(
        'w-full flex-1 px-3.5 sm:px-5 md:px-8 py-4 md:py-6 md:max-w-6xl md:mx-auto overflow-x-hidden',
        hasBottomNav && 'pb-[calc(9.5rem+env(safe-area-inset-bottom))] md:pb-28',
        className
      )}
    >
      {children}
    </main>
  );
};
