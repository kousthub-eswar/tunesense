import React from 'react';
import { Sparkles, X } from 'lucide-react';
import { MOOD_OPTIONS } from '../../constants/moods.js';
import { cn } from '../../utils/cn.js';

interface MoodSelectorProps {
  activeMood?: string | null;
  onSelectMood: (moodId: string) => void;
  onClearMood: () => void;
  className?: string;
}

// User-friendly display mapping
const FRIENDLY_MOOD_NAMES: Record<string, { label: string; emoji: string }> = {
  focused: { label: 'Focus', emoji: '🎯' },
  relaxed: { label: 'Chill', emoji: '🌿' },
  energetic: { label: 'Energetic', emoji: '⚡' },
  calm: { label: 'Late Night', emoji: '🌙' },
  happy: { label: 'Happy', emoji: '☀️' },
  romantic: { label: 'Romantic', emoji: '🌹' },
  sad: { label: 'Reflective', emoji: '🌧️' },
  nostalgic: { label: 'Nostalgic', emoji: '📼' },
};

export const MoodSelector: React.FC<MoodSelectorProps> = ({
  activeMood,
  onSelectMood,
  onClearMood,
  className,
}) => {
  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-center justify-between mb-2.5 px-0.5">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-brand-400" />
          <span className="text-xs font-semibold text-content-secondary uppercase tracking-wider">
            Explore by Mood
          </span>
        </div>
        {activeMood && (
          <button
            type="button"
            onClick={onClearMood}
            className="flex items-center gap-1 text-[11px] font-medium text-content-muted hover:text-brand-300 transition-colors px-2.5 py-0.5 rounded-full bg-surface hover:bg-surface-secondary border border-surface-border"
            title="Reset mood filter"
          >
            <X className="w-3 h-3" />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* Horizontally scrollable chips without page overflow */}
      <div className="flex gap-2 overflow-x-auto pb-1.5 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 scroll-smooth">
        {MOOD_OPTIONS.map((mood) => {
          const isSelected = activeMood?.toLowerCase() === mood.id.toLowerCase();
          const friendly = FRIENDLY_MOOD_NAMES[mood.id] || {
            label: mood.label,
            emoji: mood.emoji,
          };

          return (
            <button
              key={mood.id}
              type="button"
              onClick={() => onSelectMood(mood.id)}
              className={cn(
                'flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200 shrink-0 border select-none',
                isSelected
                  ? 'bg-brand-500 text-white border-brand-400 shadow-sm font-semibold'
                  : 'bg-surface hover:bg-surface-secondary border-surface-border text-content-secondary hover:text-content-primary hover:border-brand-500/35'
              )}
              aria-pressed={isSelected}
            >
              <span className="text-sm select-none">{friendly.emoji}</span>
              <span>{friendly.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default MoodSelector;
