import React from 'react';
import { cn } from '../../utils/cn.js';

export interface SliderProps {
  min?: number;
  max?: number;
  step?: number;
  value: number;
  onChange: (value: number) => void;
  label?: string;
  valueDisplay?: React.ReactNode;
  'aria-label'?: string;
  disabled?: boolean;
  accent?: 'ultramarine' | 'tangerine' | 'mint' | 'orchid';
  className?: string;
}

export const Slider: React.FC<SliderProps> = ({
  min = 0,
  max = 1,
  step = 0.01,
  value,
  onChange,
  label,
  valueDisplay,
  'aria-label': ariaLabel,
  disabled = false,
  accent = 'ultramarine',
  className,
}) => {
  const percentage = Math.min(Math.max(((value - min) / (max - min)) * 100, 0), 100);

  const accentColorMap = {
    ultramarine: 'bg-ultramarine',
    tangerine: 'bg-tangerine',
    mint: 'bg-mint',
    orchid: 'bg-orchid',
  };

  return (
    <div className={cn('w-full flex flex-col gap-1.5', className)}>
      {(label || valueDisplay) && (
        <div className="flex items-center justify-between text-scale-14 text-ink">
          {label && <span className="font-medium text-ink/80">{label}</span>}
          {valueDisplay && <span className="text-ink/60 tabular-nums">{valueDisplay}</span>}
        </div>
      )}
      <div className="relative flex items-center h-6 w-full cursor-pointer group">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          aria-label={ariaLabel || label || 'Slider'}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer disabled:cursor-not-allowed focus:outline-none"
        />
        {/* Track background */}
        <div className="w-full h-2 rounded-full bg-black/10 overflow-hidden relative">
          {/* Active fill */}
          <div
            className={cn('h-full transition-all duration-75 rounded-full', accentColorMap[accent])}
            style={{ width: `${percentage}%` }}
          />
        </div>
        {/* Thumb */}
        <div
          className="absolute h-4 w-4 bg-white border-2 border-ultramarine rounded-full shadow-sm pointer-events-none transition-transform duration-75 -ml-2 group-hover:scale-110 group-active:scale-95"
          style={{ left: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
