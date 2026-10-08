import React from 'react';
import { Sparkles } from 'lucide-react';
import { cn } from '../../utils/cn.js';

export interface RecommendationSectionProps {
  title: string;
  subtitle?: string;
  badge?: string;
  children: React.ReactNode;
  className?: string;
}

export const RecommendationSection: React.FC<RecommendationSectionProps> = ({
  title,
  subtitle,
  badge,
  children,
  className,
}) => {
  return (
    <section className={cn('py-3', className)}>
      <div className="flex items-start justify-between mb-3 px-1">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-content-primary tracking-tight">
              {title}
            </h3>
            {badge && (
              <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-brand-500/15 text-brand-400 border border-brand-500/30">
                {badge}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-content-secondary mt-0.5">{subtitle}</p>
          )}
        </div>
        <Sparkles className="w-4 h-4 text-brand-400 shrink-0 mt-1 opacity-70" />
      </div>
      <div>{children}</div>
    </section>
  );
};
