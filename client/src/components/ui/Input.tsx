import React from 'react';
import { Search } from 'lucide-react';
import { cn } from '../../utils/cn.js';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  isSearch?: boolean;
  rightElement?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  isSearch = false,
  rightElement,
  className,
  id,
  ...props
}) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-scale-14 font-medium text-ink/80 dark:text-slate-300 mb-1.5">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {isSearch && (
          <div className="absolute left-3.5 pointer-events-none text-ink/40 dark:text-slate-500">
            <Search className="w-4 h-4" />
          </div>
        )}
        <input
          id={inputId}
          className={cn(
            'w-full bg-white/80 dark:bg-slate-900/80 text-ink dark:text-slate-100 rounded-[14px] border border-slate-200/80 dark:border-white/10 px-4 py-2.5 text-scale-14 placeholder:text-ink/40 dark:placeholder:text-slate-500 shadow-sm',
            'transition-all duration-200 focus:outline-none focus:border-ultramarine focus:ring-2 focus:ring-ultramarine/20',
            isSearch && 'pl-10',
            Boolean(rightElement) && 'pr-11',
            error && 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20',
            className
          )}
          {...props}
        />
        {rightElement && (
          <div className="absolute right-3 flex items-center text-ink/40 dark:text-slate-400">
            {rightElement}
          </div>
        )}
      </div>
      {error && <p className="text-xs text-rose-500 mt-1.5 font-medium">{error}</p>}
    </div>
  );
};

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { label: string; value: string }[];
}

export const Select: React.FC<SelectProps> = ({
  label,
  error,
  options,
  className,
  id,
  ...props
}) => {
  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={selectId} className="block text-scale-14 font-medium text-ink/80 dark:text-slate-300 mb-1.5">
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={cn(
          'w-full bg-white/80 dark:bg-slate-900/80 text-ink dark:text-slate-100 rounded-[14px] border border-slate-200/80 dark:border-white/10 px-4 py-2.5 text-scale-14 appearance-none cursor-pointer shadow-sm',
          'transition-all duration-200 focus:outline-none focus:border-ultramarine focus:ring-2 focus:ring-ultramarine/20',
          error && 'border-rose-500',
          className
        )}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-white dark:bg-slate-900 text-ink dark:text-slate-100">
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-rose-500 mt-1.5 font-medium">{error}</p>}
    </div>
  );
};

export interface ToggleProps {
  id?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}

export const Toggle: React.FC<ToggleProps> = ({
  id,
  checked,
  onChange,
  label,
  disabled = false,
}) => {
  return (
    <label htmlFor={id} className="inline-flex items-center gap-3 cursor-pointer select-none">
      <div className="relative">
        <input
          id={id}
          type="checkbox"
          className="sr-only"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
        />
        <div
          className={cn(
            'w-11 h-6 rounded-full transition-colors duration-200 border',
            checked ? 'bg-ultramarine border-ultramarine' : 'bg-slate-200 dark:bg-slate-800 border-slate-300 dark:border-slate-700',
            disabled && 'opacity-40 cursor-not-allowed'
          )}
        />
        <div
          className={cn(
            'absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform duration-200 shadow-sm',
            checked && 'translate-x-5'
          )}
        />
      </div>
      {label && <span className="text-scale-14 text-ink dark:text-slate-200 font-medium">{label}</span>}
    </label>
  );
};
