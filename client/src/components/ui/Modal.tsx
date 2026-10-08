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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in"
    >
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={cn(
          'relative w-full max-w-md bg-bg-elevated border border-surface-border rounded-card p-6 shadow-2xl z-10',
          className
        )}
      >
        <div className="flex items-center justify-between pb-3 border-b border-surface-border">
          {title ? (
            <h2 className="text-lg font-semibold text-content-primary">{title}</h2>
          ) : (
            <div />
          )}
          <IconButton
            icon={<X className="w-5 h-5" />}
            aria-label="Close modal"
            onClick={onClose}
            size="sm"
          />
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
};
