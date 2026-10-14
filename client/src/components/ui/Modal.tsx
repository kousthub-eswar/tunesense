import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { IconButton } from './IconButton.js';
import { cn } from '../../utils/cn.js';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  className,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/25 dark:bg-black/60 backdrop-blur-sm"
    >
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={cn(
          'relative w-full max-w-md bg-white/90 dark:bg-slate-900/95 backdrop-blur-2xl border border-white/80 dark:border-white/10 rounded-[28px] p-6 shadow-pill z-10 text-ink dark:text-slate-100',
          className
        )}
      >
        <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/10">
          {title ? (
            <h2 className="text-scale-20 font-display font-bold text-ink dark:text-slate-100">{title}</h2>
          ) : (
            <div />
          )}
          <IconButton
            icon={<X className="w-5 h-5" />}
            aria-label="Close modal"
            onClick={onClose}
            size="sm"
            className="text-ink/60 dark:text-slate-400 hover:text-ink dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 rounded-full"
          />
        </div>
        <div className="pt-4">{children}</div>
      </div>
    </div>
  );
};
