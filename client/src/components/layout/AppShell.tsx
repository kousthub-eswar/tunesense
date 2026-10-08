import React from 'react';
import { Outlet } from 'react-router-dom';
import { MobileHeader } from './MobileHeader.js';
import { BottomNavigation } from './BottomNavigation.js';
import { MiniPlayer } from '../music/MiniPlayer.js';
import { cn } from '../../utils/cn.js';

export interface AppShellProps {
  className?: string;
}

export const AppShell: React.FC<AppShellProps> = ({ className }) => {
  return (
    <div className="min-h-screen w-full bg-bg-main flex justify-center selection:bg-brand-500/20">
      {/* Mobile-First Frame: Full width on mobile (360-480px), cleanly contained on larger desktop screens */}
      <div
        className={cn(
          'w-full max-w-md min-h-screen bg-bg-main flex flex-col relative sm:border-x sm:border-surface-border/50 sm:shadow-2xl',
          className
        )}
      >
        {/* Top Header */}
        <MobileHeader />

        {/* Content Outlet */}
        <div className="flex-1 flex flex-col overflow-y-auto">
          <Outlet />
        </div>

        {/* Bottom Floating Stack: MiniPlayer + Bottom Navigation */}
        <div className="sticky bottom-0 left-0 right-0 z-40 bg-gradient-to-t from-bg-main via-bg-main/90 to-transparent pt-3 pointer-events-auto">
          <MiniPlayer />
          <BottomNavigation />
        </div>
      </div>
    </div>
  );
};
