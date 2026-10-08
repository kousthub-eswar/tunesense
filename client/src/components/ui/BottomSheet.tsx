import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { IconButton } from './IconButton.js';
import { cn } from '../../utils/cn.js';

export interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
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
      className="fixed inset-0 z-50 flex flex-col justify-end bg-black/70 backdrop-blur-xs transition-opacity"
    >
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={cn(
          'relative w-full max-w-lg mx-auto bg-bg-elevated border-t border-surface-border rounded-t-3xl px-5 pt-3 pb-8 shadow-2xl z-10 transition-transform',
          className
        )}
      >
        {/* Grab Handle */}
        <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-3" />

        <div className="flex items-center justify-between pb-3 border-b border-surface-border/50">
          <h2 className="text-base font-semibold text-content-primary">{title || ''}</h2>
          <IconButton
            icon={<X className="w-4 h-4" />}
            aria-label="Close bottom sheet"
            onClick={onClose}
            size="sm"
          />
        </div>

        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
};
