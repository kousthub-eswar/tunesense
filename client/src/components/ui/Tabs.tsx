import React from 'react';
import { cn } from '../../utils/cn.js';

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
  'aria-label'?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  className,
  'aria-label': ariaLabel = 'Navigation tabs',
}) => {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        'inline-flex items-center p-1 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-white/60 dark:border-white/10 rounded-full shadow-subtle gap-1 overflow-x-auto no-scrollbar',
        className
      )}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2 text-scale-14 rounded-full font-medium transition-all duration-200 whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-ultramarine focus-visible:ring-offset-1',
              isActive
                ? 'bg-white dark:bg-slate-800 text-ink dark:text-white font-semibold shadow-sm'
                : 'text-ink/65 dark:text-slate-300 hover:text-ink dark:hover:text-white hover:bg-white/40 dark:hover:bg-white/10'
            )}
          >
            {tab.icon && <span className="w-4 h-4">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className={cn(
                  'text-[11px] px-1.5 py-0.2 rounded-full font-semibold',
                  isActive ? 'bg-ultramarine/10 text-ultramarine' : 'bg-black/5 dark:bg-white/10 text-ink/60 dark:text-slate-300'
                )}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
