import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  Home,
  Compass,
  Search,
  Sparkles,
  Library,
  ListMusic,
  BarChart3,
  User,
  Radio,
  LogOut,
  LogIn,
  UserPlus,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext.js';
import { Avatar } from '../ui/Avatar.js';
import { Button } from '../ui/Button.js';
import { Badge } from '../ui/Badge.js';
import { cn } from '../../utils/cn.js';

export const DesktopSidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuth();

  const activeMood = sessionStorage.getItem('tunesense_active_mood');

  const navLinks = [
    { label: 'Home', path: '/home', icon: Home },
    { label: 'Discover', path: '/discover', icon: Compass },
    { label: 'Search', path: '/search', icon: Search },
    { label: 'Recommendations', path: '/recommendations', icon: Sparkles, badge: 'Explainable' },
    { label: 'Your Library', path: '/library', icon: Library },
    { label: 'Playlists', path: '/library?tab=playlists', icon: ListMusic },
    { label: 'Analytics & RecSys', path: '/analytics', icon: BarChart3 },
    { label: 'Profile & Settings', path: '/profile', icon: User },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/', { replace: true });
  };

  return (
    <aside className="hidden md:flex flex-col w-64 h-screen bg-bg-main border-r border-surface-border/80 sticky top-0 shrink-0 select-none z-30">
      {/* Brand Header */}
      <div className="p-5 border-b border-surface-border/60">
        <NavLink to="/home" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-brand-500/15 border border-brand-500/30 flex items-center justify-center text-brand-400 group-hover:scale-105 transition-transform shadow-glow">
            <Radio className="w-5 h-5 text-brand-400" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-bold text-content-primary tracking-tight leading-none group-hover:text-brand-300 transition-colors">
              TuneSense
            </h1>
            <p className="text-[11px] text-brand-400 font-medium mt-1 truncate">
              Music that understands your vibe
            </p>
          </div>
        </NavLink>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 py-4 px-3 overflow-y-auto space-y-1">
        <div className="px-3 pb-2">
          <span className="text-[10px] font-bold text-content-muted uppercase tracking-wider">
            Menu
          </span>
        </div>

        {navLinks.map((item) => {
          const itemPathOnly = item.path.split('?')[0];
          const itemQuery = item.path.includes('?') ? item.path.split('?')[1] : null;
          const isActive = itemQuery
            ? location.pathname === itemPathOnly && location.search.includes(itemQuery)
            : (location.pathname === itemPathOnly || location.pathname.startsWith(`${itemPathOnly}/`)) && (!location.search.includes('tab=playlists') || item.label === 'Playlists');

          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 group',
                isActive
                  ? 'bg-brand-500/15 text-brand-300 border border-brand-500/25 shadow-sm'
                  : 'text-content-secondary hover:text-content-primary hover:bg-surface/60'
              )}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={cn(
                    'w-4 h-4 transition-transform group-hover:scale-110',
                    isActive ? 'text-brand-400' : 'text-content-muted group-hover:text-content-secondary'
                  )}
                />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <Badge variant="brand" size="sm" className="text-[9px] py-0 px-1.5 opacity-90">
                  {item.badge}
                </Badge>
              )}
            </NavLink>
          );
        })}

        {/* Active Mood Pill (if set) */}
        {activeMood && (
          <div className="mt-5 mx-2 p-3 rounded-xl bg-surface/50 border border-brand-500/20">
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="text-content-muted uppercase font-bold text-[9px] tracking-wider">Active Vibe</span>
              <button
                onClick={() => {
                  sessionStorage.removeItem('tunesense_active_mood');
                  navigate(location.pathname);
                }}
                className="text-[10px] text-content-muted hover:text-vibe-rose transition-colors"
                title="Clear active mood"
              >
                Clear
              </button>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-brand-300 font-medium capitalize">
              <Sparkles className="w-3.5 h-3.5 text-brand-400" />
              <span>{activeMood}</span>
            </div>
          </div>
        )}
      </div>

      {/* User Footer Card */}
      <div className="p-3 border-t border-surface-border/60 bg-bg-elevated/40">
        {isAuthenticated && user ? (
          <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-surface/40 border border-surface-border/40">
            <NavLink to="/profile" className="flex items-center gap-2.5 min-w-0 flex-1 hover:opacity-80 transition-opacity">
              <Avatar name={user.name} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-content-primary truncate">{user.name}</p>
                <p className="text-[10px] text-content-muted truncate">{user.email}</p>
              </div>
            </NavLink>
            <button
              onClick={handleLogout}
              className="p-1.5 text-content-muted hover:text-vibe-rose hover:bg-vibe-rose/10 rounded-lg transition-colors"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <Button
              variant="primary"
              size="sm"
              fullWidth
              onClick={() => navigate('/signup')}
              leftIcon={<UserPlus className="w-3.5 h-3.5" />}
              className="text-xs shadow-glow"
            >
              Get Started
            </Button>
            <Button
              variant="ghost"
              size="sm"
              fullWidth
              onClick={() => navigate('/login')}
              leftIcon={<LogIn className="w-3.5 h-3.5" />}
              className="text-xs text-content-secondary"
            >
              Sign In
            </Button>
          </div>
        )}
      </div>
    </aside>
  );
};

export default DesktopSidebar;
