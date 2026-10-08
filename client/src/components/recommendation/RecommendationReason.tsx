import React from 'react';
import { Sparkles, Users } from 'lucide-react';
import { cn } from '../../utils/cn.js';

export interface RecommendationReasonProps {
  reason: string;
  reasonType?: string;
  className?: string;
}

export const RecommendationReason: React.FC<RecommendationReasonProps> = ({
  reason,
  reasonType,
  className,
}) => {
  const isCollab = reasonType === 'collaborative' || reason.toLowerCase().includes('listeners');

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium transition-colors',
        isCollab
          ? 'bg-purple-500/10 border border-purple-500/25 text-purple-300'
          : 'bg-brand-500/10 border border-brand-500/20 text-brand-300',
        className
      )}
    >
      {isCollab ? (
        <Users className="w-3 h-3 text-purple-400 shrink-0" />
      ) : (
        <Sparkles className="w-3 h-3 text-brand-400 shrink-0" />
      )}
      <span className="truncate">{reason}</span>
    </div>
  );
};
