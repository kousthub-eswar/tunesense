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
        'w-full flex-1 px-4 py-4 md:px-8 md:py-6 md:max-w-6xl md:mx-auto overflow-y-auto overflow-x-hidden',
        hasBottomNav && 'pb-32 md:pb-28', // clearance for MiniPlayer & BottomNavigation on mobile, and DesktopPlayer on desktop
        className
      )}
    >
      {children}
    </main>
  );
};
