import React from 'react';
import { cn } from '../../utils/cn.js';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
  padded?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  interactive = false,
  padded = true,
  ...props
}) => {
  return (
    <div
      className={cn(
        'bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-[28px] border border-white/60 dark:border-white/10 shadow-panel transition-all duration-200 text-ink dark:text-slate-100',
        padded && 'p-5 md:p-6',
        interactive && 'cursor-pointer hover:bg-white/90 dark:hover:bg-slate-800/90 hover:shadow-pill active:scale-[0.99]',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
