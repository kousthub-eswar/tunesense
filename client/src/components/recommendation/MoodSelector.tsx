import React from 'react';
import { Sparkles, X } from 'lucide-react';
import { MOOD_OPTIONS } from '../../constants/moods.js';

interface MoodSelectorProps {
  activeMood?: string | null;
  onSelectMood: (moodId: string) => void;
  onClearMood: () => void;
}

export const MoodSelector: React.FC<MoodSelectorProps> = ({
  activeMood,
  onSelectMood,
  onClearMood,
}) => {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2.5 px-0.5">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-brand-400" />
          <span className="text-xs font-semibold text-content-secondary uppercase tracking-wider">
            What's your vibe right now?
          </span>
        </div>
        {activeMood && (
          <button
            type="button"
            onClick={onClearMood}
            className="flex items-center gap-1 text-[11px] font-medium text-content-muted hover:text-vibe-rose transition-colors px-2 py-1 rounded-full bg-surface/60 hover:bg-surface border border-surface-border min-h-[32px]"
            title="Reset to all-vibe recommendations"
          >
            <X className="w-3 h-3" />
            <span>Clear mood</span>
          </button>
        )}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar -mx-4 px-4 scroll-smooth">
        {MOOD_OPTIONS.map((mood) => {
          const isSelected = activeMood?.toLowerCase() === mood.id.toLowerCase();
          return (
            <button
              key={mood.id}
              type="button"
              onClick={() => onSelectMood(mood.id)}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200 min-h-[44px] shrink-0 border ${
                isSelected
                  ? 'bg-gradient-to-r from-brand-500 to-brand-600 text-white border-brand-400 shadow-glow scale-[1.03]'
                  : 'bg-surface/80 hover:bg-surface border-surface-border text-content-secondary hover:text-content-primary hover:border-brand-500/30'
              }`}
            >
              <span className="text-base select-none">{mood.emoji}</span>
              <span>{mood.label}</span>
            </button>
          );
        })}
      </div>

      {activeMood && (
        <div className="mt-1 px-1 flex items-center justify-between text-[11px] text-content-muted">
          <span>
            Filtering by <span className="text-brand-400 font-medium capitalize">{activeMood}</span> acoustic profile
          </span>
          <span className="text-[10px] text-brand-400/80">Adaptive hybrid weights active</span>
        </div>
      )}
    </div>
  );
};
