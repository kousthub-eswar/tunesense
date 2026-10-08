import React from 'react';
import { Search } from 'lucide-react';
import { cn } from '../../utils/cn.js';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  isSearch?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  isSearch = false,
  className,
  id,
  ...props
}) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-semibold text-content-secondary mb-1.5 uppercase tracking-wider">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {isSearch && (
          <div className="absolute left-3.5 pointer-events-none text-content-muted">
            <Search className="w-4 h-4" />
          </div>
        )}
        <input
          id={inputId}
          className={cn(
            'w-full bg-surface text-content-primary rounded-input border border-surface-border px-3.5 py-2.5 text-sm placeholder:text-content-muted',
            'transition-colors duration-200 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500',
            isSearch && 'pl-10',
            error && 'border-vibe-rose focus:border-vibe-rose focus:ring-vibe-rose',
            className
          )}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-vibe-rose mt-1.5">{error}</p>}
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
        <label htmlFor={selectId} className="block text-xs font-semibold text-content-secondary mb-1.5 uppercase tracking-wider">
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={cn(
          'w-full bg-surface text-content-primary rounded-input border border-surface-border px-3.5 py-2.5 text-sm appearance-none cursor-pointer',
          'transition-colors duration-200 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500',
          error && 'border-vibe-rose',
          className
        )}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-bg-elevated text-content-primary">
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-vibe-rose mt-1.5">{error}</p>}
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
            checked ? 'bg-brand-500 border-brand-500' : 'bg-surface hover:bg-surface-hover border-surface-border',
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
      {label && <span className="text-sm text-content-primary">{label}</span>}
    </label>
  );
};
