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
        'w-full flex-1 px-4 py-4 overflow-y-auto overflow-x-hidden',
        hasBottomNav && 'pb-32', // clearance for MiniPlayer and BottomNavigation
        className
      )}
    >
      {children}
    </main>
  );
};
