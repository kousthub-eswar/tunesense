import React from 'react';
import { Outlet } from 'react-router-dom';
import { MobileHeader } from './MobileHeader.js';
import { DesktopSidebar } from './DesktopSidebar.js';
import { BottomNavigation } from './BottomNavigation.js';
import { MiniPlayer } from '../music/MiniPlayer.js';
import { DesktopPlayer } from '../music/DesktopPlayer.js';
import { cn } from '../../utils/cn.js';

export interface AppShellProps {
  className?: string;
}

export const AppShell: React.FC<AppShellProps> = ({ className }) => {
  return (
    <div className="min-h-screen w-full bg-bg-main flex flex-col md:flex-row selection:bg-brand-500/20 text-content-primary">
      {/* Desktop Sidebar (visible on md screens and above) */}
      <DesktopSidebar />

      {/* Main App Content Area */}
      <div className={cn('flex-1 flex flex-col min-w-0 min-h-screen relative', className)}>
        {/* Mobile Header (hidden on md and above) */}
        <div className="md:hidden">
          <MobileHeader />
        </div>

        {/* Content Outlet */}
        <div className="flex-1 flex flex-col">
          <Outlet />
        </div>

        {/* Mobile Floating Stack: MiniPlayer + Bottom Navigation (hidden on md and above) */}
        <div className="md:hidden sticky bottom-0 left-0 right-0 z-40 bg-gradient-to-t from-bg-main via-bg-main/90 to-transparent pt-3 pointer-events-auto">
          <MiniPlayer />
          <BottomNavigation />
        </div>
      </div>

      {/* Desktop Persistent Bottom Player (hidden on mobile, visible on md and above) */}
      <DesktopPlayer />
    </div>
  );
};

