import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Radio,
  Search,
  Menu,
  X,
  Home,
  Compass,
  Sparkles,
  Library,
  ListMusic,
  BarChart3,
  User,
  LogOut,
  LogIn,
  UserPlus,
  Camera,
  Navigation,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext.js';
import { Avatar } from '../ui/Avatar.js';
import { Button } from '../ui/Button.js';
import { cn } from '../../utils/cn.js';

export interface MobileHeaderProps {
  title?: string;
  className?: string;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({
  title,
  className,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // All navigation destinations matching desktop sidebar
  const navItems = [
    { label: 'Home', path: '/home', icon: Home },
    { label: 'Discover', path: '/discover', icon: Compass },
    { label: 'Photo to Music', path: '/photo-music', icon: Camera, badge: 'Vibe' },
    { label: 'Emotional GPS', path: '/emotional-gps', icon: Navigation, badge: 'Journey' },
    { label: 'Search', path: '/search', icon: Search },
    { label: 'Recommendations', path: '/recommendations', icon: Sparkles, badge: 'Explainable' },
    { label: 'Your Library', path: '/library', icon: Library },
    { label: 'Playlists', path: '/library?tab=playlists', icon: ListMusic },
    { label: 'Analytics & RecSys', path: '/analytics', icon: BarChart3 },
    { label: 'Profile & Settings', path: '/profile', icon: User },
  ];

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isDrawerOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      // Focus close button on open
      setTimeout(() => closeButtonRef.current?.focus(), 50);

      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isDrawerOpen]);

  // Close drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isDrawerOpen) {
        setIsDrawerOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDrawerOpen]);

  // Close drawer on route change
  useEffect(() => {
    setIsDrawerOpen(false);
  }, [location.pathname, location.search]);

  const handleNavClick = (path: string) => {
    setIsDrawerOpen(false);
    navigate(path);
  };

  const handleLogout = async () => {
    setIsDrawerOpen(false);
    await logout();
    navigate('/', { replace: true });
  };

  const isItemActive = (path: string): boolean => {
    if (path.includes('tab=playlists')) {
      return location.pathname === '/library' && location.search.includes('tab=playlists');
    }
    if (path === '/library') {
      return location.pathname === '/library' && !location.search.includes('tab=playlists');
    }
    return location.pathname === path;
  };

  return (
    <>
      {/* ======================================================== */}
      {/* 1. COMPACT MOBILE TOP HEADER (60–64px tall, fits 320px)  */}
      {/* ======================================================== */}
      <header
        className={cn(
          'sticky top-0 z-40 w-full h-16 bg-[#09090D]/95 backdrop-blur-md border-b border-surface-border px-3.5 sm:px-4 flex items-center justify-between select-none',
          className
        )}
      >
        {/* Left: TuneSense Branding (Fits narrow 320px screens) */}
        <div
          onClick={() => navigate('/home')}
          className="flex items-center gap-2.5 cursor-pointer group min-w-0"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && navigate('/home')}
          aria-label="TuneSense Home"
        >
          <div className="w-9 h-9 rounded-xl bg-brand-500/15 border border-brand-500/30 flex items-center justify-center text-brand-400 group-hover:scale-105 transition-transform shrink-0">
            <Radio className="w-4 h-4 text-brand-400" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-1.5 truncate">
              {title || 'TuneSense'}
              <span className="w-1.5 h-1.5 rounded-full bg-brand-400 shrink-0" />
            </h1>
            <p className="text-[10px] text-content-secondary font-medium leading-none truncate hidden xs:block">
              Music Discovery
            </p>
          </div>
        </div>

        {/* Right: Search Action & Menu Drawer Trigger */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Accessible Search Button */}
          <button
            type="button"
            onClick={() => navigate('/search')}
            className="w-10 h-10 rounded-xl bg-surface hover:bg-surface-secondary border border-surface-border text-content-secondary hover:text-white flex items-center justify-center transition-colors tap-target"
            aria-label="Search music catalogue"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Menu Drawer Toggle Button */}
          <button
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            className="w-10 h-10 rounded-xl bg-surface hover:bg-surface-secondary border border-surface-border text-content-secondary hover:text-white flex items-center justify-center transition-colors tap-target relative"
            aria-label="Open navigation menu"
            aria-expanded={isDrawerOpen}
            aria-controls="mobile-navigation-drawer"
          >
            <Menu className="w-4 h-4" />
            {isAuthenticated && (
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-brand-400 ring-2 ring-bg-main" />
            )}
          </button>
        </div>
      </header>

      {/* ======================================================== */}
      {/* 2. SLIDE-OUT MOBILE MENU DRAWER & BACKDROP               */}
      {/* ======================================================== */}
      {isDrawerOpen && (
        <div
          className="fixed inset-0 z-50 flex justify-end"
          role="dialog"
          aria-modal="true"
          id="mobile-navigation-drawer"
          aria-label="Navigation Menu"
        >
          {/* Backdrop Blur Overlay */}
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity duration-300"
            onClick={() => setIsDrawerOpen(false)}
            aria-hidden="true"
          />

          {/* Slide-out Drawer Panel */}
          <div
            ref={drawerRef}
            className="relative w-[85vw] max-w-sm sm:w-80 h-full bg-[#09090D] border-l border-surface-border flex flex-col z-50 shadow-2xl overflow-hidden animate-in slide-in-from-right duration-300"
          >
            {/* Drawer Header */}
            <div className="h-16 px-4 border-b border-surface-border flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-brand-500/15 border border-brand-500/30 flex items-center justify-center text-brand-400 shrink-0">
                  <Radio className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-sm font-bold text-white tracking-tight">TuneSense</span>
                  <p className="text-[10px] text-brand-400 font-medium leading-none">Navigation</p>
                </div>
              </div>

              <button
                ref={closeButtonRef}
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                className="w-10 h-10 rounded-xl bg-surface hover:bg-surface-secondary border border-surface-border text-content-secondary hover:text-white flex items-center justify-center transition-colors tap-target"
                aria-label="Close navigation menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Navigation Links */}
            <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5 no-scrollbar" aria-label="Mobile Menu Navigation">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isItemActive(item.path);

                return (
                  <button
                    key={item.path}
                    type="button"
                    onClick={() => handleNavClick(item.path)}
                    className={cn(
                      'w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-medium transition-all text-left tap-target',
                      active
                        ? 'bg-brand-500/15 text-brand-300 border border-brand-500/30 font-semibold shadow-sm'
                        : 'text-content-secondary hover:text-white hover:bg-surface border border-transparent'
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon
                        className={cn(
                          'w-4 h-4 shrink-0 transition-colors',
                          active ? 'text-brand-400' : 'text-content-muted'
                        )}
                      />
                      <span className="truncate">{item.label}</span>
                    </div>

                    {item.badge && (
                      <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Drawer Footer: User Profile / Guest Actions */}
            <div className="p-3.5 border-t border-surface-border bg-surface/50 shrink-0">
              {isAuthenticated && user ? (
                <div className="space-y-2.5">
                  <div
                    onClick={() => handleNavClick('/profile')}
                    className="flex items-center gap-2.5 p-2 rounded-xl bg-surface border border-surface-border cursor-pointer hover:border-brand-500/30 transition-colors"
                  >
                    <Avatar name={user.name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-white truncate">{user.name}</p>
                      <p className="text-[10px] text-content-muted truncate">{user.email}</p>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    fullWidth
                    onClick={handleLogout}
                    leftIcon={<LogOut className="w-3.5 h-3.5 text-vibe-rose" />}
                    className="text-xs text-content-secondary hover:text-vibe-rose justify-center h-9"
                  >
                    Sign Out
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Button
                    variant="primary"
                    size="sm"
                    fullWidth
                    onClick={() => handleNavClick('/signup')}
                    leftIcon={<UserPlus className="w-3.5 h-3.5" />}
                    className="text-xs font-semibold shadow-sm h-10"
                  >
                    Get Started
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    fullWidth
                    onClick={() => handleNavClick('/login')}
                    leftIcon={<LogIn className="w-3.5 h-3.5" />}
                    className="text-xs text-content-secondary hover:text-white h-10"
                  >
                    Sign In
                  </Button>
                </div>
              )}

              {/* Legal navigation */}
              <div className="mt-3 pt-2.5 border-t border-surface-border/40 flex items-center justify-center gap-3 text-[11px] text-content-muted">
                <button
                  type="button"
                  onClick={() => handleNavClick('/privacy-policy')}
                  className="hover:text-white transition-colors"
                >
                  Privacy Policy
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={() => handleNavClick('/terms-and-conditions')}
                  className="hover:text-white transition-colors"
                >
                  Terms & Conditions
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MobileHeader;
