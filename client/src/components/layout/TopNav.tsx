import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { Radio, Sparkles, Camera, Compass, LogIn, Sun, Moon } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext.js';
import { useAppConfig } from '../../contexts/AppConfigContext.js';
import { cn } from '../../utils/cn.js';

export const TopNav: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const { isDarkMode, toggleTheme } = useAppConfig();

  const navLinks = [
    { label: 'Home', path: '/home', icon: Radio },
    { label: 'Recommendations', path: '/recommendations', icon: Sparkles },
    { label: 'Photo to Music', path: '/photo-music', icon: Camera },
    { label: 'Emotional GPS', path: '/emotional-gps', icon: Compass },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-white/75 dark:bg-slate-950/80 backdrop-blur-xl border-b border-white/60 dark:border-white/10 transition-colors duration-300">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link
          to="/home"
          className="flex items-center gap-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-ultramarine rounded-full pr-2"
        >
          <div className="w-9 h-9 rounded-full bg-ultramarine text-white flex items-center justify-center shadow-sm">
            <span className="font-display font-extrabold text-lg leading-none">T</span>
          </div>
          <span className="font-display font-bold text-scale-20 text-ink dark:text-white tracking-tight">
            TuneSense
          </span>
        </Link>

        {/* 4 Main Links (Desktop) */}
        <nav
          aria-label="Main navigation"
          className="hidden md:flex items-center gap-1 bg-black/5 dark:bg-white/5 p-1 rounded-full border border-black/5 dark:border-white/5"
        >
          {navLinks.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    'inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-scale-14 transition-all duration-200 select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-ultramarine',
                    isActive
                      ? 'bg-white dark:bg-slate-800 text-ink dark:text-white font-semibold shadow-sm'
                      : 'text-ink/65 dark:text-slate-300 hover:text-ink dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/10'
                  )
                }
              >
                <Icon className="w-4 h-4 opacity-75" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* User Profile / Auth Area & Dark Mode Toggle */}
        <div className="flex items-center gap-2">
          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            className="w-9 h-9 rounded-full flex items-center justify-center text-ink/75 dark:text-slate-300 hover:text-ink dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ultramarine border border-transparent hover:border-black/5 dark:hover:border-white/10"
            title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDarkMode ? (
              <Sun className="w-4 h-4 text-amber-400 animate-in fade-in zoom-in-75 duration-200" />
            ) : (
              <Moon className="w-4 h-4 text-ink dark:text-slate-200 animate-in fade-in zoom-in-75 duration-200" />
            )}
          </button>

          {isAuthenticated && user ? (
            <Link
              to="/profile"
              className="flex items-center gap-2.5 p-1 pr-3 rounded-full hover:bg-white/60 dark:hover:bg-white/10 transition-all duration-200 border border-transparent hover:border-white/60 dark:hover:border-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-ultramarine"
            >
              <div className="w-8 h-8 rounded-full overflow-hidden bg-ultramarine/10 flex items-center justify-center text-ultramarine font-semibold text-sm border border-ultramarine/20">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  <span>{user.name.charAt(0).toUpperCase()}</span>
                )}
              </div>
              <span className="hidden sm:inline text-scale-14 font-medium text-ink dark:text-slate-200 max-w-[120px] truncate">
                {user.name.split(' ')[0]}
              </span>
            </Link>
          ) : (
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-ultramarine text-white text-scale-14 font-medium hover:bg-ultramarine-hover transition-colors shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ultramarine"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign in</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};
