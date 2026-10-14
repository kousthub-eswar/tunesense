import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { TopNav } from './TopNav.js';
import { BottomNavigation } from './BottomNavigation.js';
import { MiniPlayer } from '../music/MiniPlayer.js';
import { cn } from '../../utils/cn.js';

export interface AppShellProps {
  className?: string;
}

export const AppShell: React.FC<AppShellProps> = ({ className }) => {
  const location = useLocation();
  const isPlayerPage = location.pathname === '/player';

  return (
    <div className="min-h-screen w-full bg-fog dark:bg-[#0B0E17] text-ink dark:text-slate-100 relative flex flex-col selection:bg-ultramarine/20 selection:text-ink dark:selection:text-white transition-colors duration-300">
      {/* Ambient Two-Color Field Background with 900ms smooth transition */}
      <div className="ambient-field-bg" aria-hidden="true" />

      {/* Slim Top Bar (Logo, 4 Main Links, Profile) */}
      {!isPlayerPage && <TopNav />}

      {/* Main Content Area - max 1200px, left-aligned, generous whitespace */}
      <main
        className={cn(
          'relative z-10 flex-1 w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-32 md:pb-28',
          className
        )}
      >
        <Outlet />
      </main>

      {/* Floating Player Pill docked at bottom center */}
      {!isPlayerPage && (
        <div className="fixed bottom-20 md:bottom-6 left-0 right-0 z-40 px-4 pointer-events-none flex justify-center">
          <div className="w-full max-w-[620px] pointer-events-auto">
            <MiniPlayer />
          </div>
        </div>
      )}

      {/* Mobile Bottom Tab Bar */}
      {!isPlayerPage && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-30">
          <BottomNavigation />
        </div>
      )}
    </div>
  );
};

export default AppShell;
