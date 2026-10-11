import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Compass, Library, User } from 'lucide-react';
import { NAVIGATION_ITEMS } from '../../constants/navigation.js';
import { cn } from '../../utils/cn.js';

export interface BottomNavigationProps {
  className?: string;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({ className }) => {
  const renderIcon = (name: string, active: boolean) => {
    const iconClass = cn('w-5 h-5 transition-transform duration-200', active ? 'scale-110 text-brand-400' : 'text-content-muted');
    switch (name) {
      case 'Home':
        return <Home className={iconClass} />;
      case 'Compass':
        return <Compass className={iconClass} />;
      case 'Library':
        return <Library className={iconClass} />;
      case 'User':
        return <User className={iconClass} />;
      default:
        return null;
    }
  };

  return (
    <nav
      aria-label="Main Mobile Navigation"
      className={cn(
        'w-full bg-[#09090D]/95 backdrop-blur-xl border-t border-surface-border px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] flex items-center justify-around z-40',
        className
      )}
    >
      {NAVIGATION_ITEMS.map((item) => (
        <NavLink
          key={item.id}
          to={item.path}
          className={({ isActive }) =>
            cn(
              'flex flex-col items-center justify-center flex-1 py-1 px-1.5 rounded-xl transition-all duration-200 select-none tap-target',
              isActive
                ? 'text-brand-400 font-semibold'
                : 'text-content-muted hover:text-content-secondary'
            )
          }
        >
          {({ isActive }) => (
            <>
              {renderIcon(item.iconName, isActive)}
              <span className="text-[10px] sm:text-[11px] mt-1 font-medium tracking-tight">
                {item.label}
              </span>
              {isActive && (
                <span className="w-1 h-1 rounded-full bg-brand-400 mt-0.5" />
              )}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
};
