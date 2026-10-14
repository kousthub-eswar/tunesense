import React from 'react';
import { NavLink } from 'react-router-dom';
import { Radio, Sparkles, Camera, Compass, User } from 'lucide-react';
import { cn } from '../../utils/cn.js';

export interface BottomNavigationProps {
  className?: string;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({ className }) => {
  const items = [
    { label: 'Home', path: '/home', icon: Radio },
    { label: 'For you', path: '/recommendations', icon: Sparkles },
    { label: 'Photo vibe', path: '/photo-music', icon: Camera },
    { label: 'GPS', path: '/emotional-gps', icon: Compass },
    { label: 'Profile', path: '/profile', icon: User },
  ];

  return (
    <nav
      aria-label="Main Mobile Navigation"
      className={cn(
        'w-full bg-white/85 dark:bg-slate-950/85 backdrop-blur-2xl border-t border-white/70 dark:border-white/10 px-2 pt-1.5 pb-[max(0.6rem,env(safe-area-inset-bottom))] flex items-center justify-around z-40 shadow-pill',
        className
      )}
    >
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-2xl transition-all duration-200 select-none tap-target',
                isActive
                  ? 'text-ultramarine font-semibold'
                  : 'text-ink/50 dark:text-slate-400 hover:text-ink dark:hover:text-white'
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={cn('w-5 h-5 transition-transform duration-200', isActive && 'scale-110')} />
                <span className="text-[11px] mt-1 font-medium tracking-tight">
                  {item.label}
                </span>
                {isActive && (
                  <span className="w-1 h-1 rounded-full bg-ultramarine mt-0.5" />
                )}
              </>
            )}
          </NavLink>
        );
      })}
    </nav>
  );
};
