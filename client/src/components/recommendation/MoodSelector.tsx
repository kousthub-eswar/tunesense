import React, { useEffect } from 'react';
import { Sparkles, X } from 'lucide-react';
import { MOOD_OPTIONS, MOOD_ICON_MAP } from '../../constants/moods.js';
import { cn } from '../../utils/cn.js';

interface MoodSelectorProps {
  activeMood?: string | null;
  onSelectMood: (moodId: string) => void;
  onClearMood: () => void;
  className?: string;
}

const MOOD_COLOR_MAP: Record<string, { a: string; b: string; accent: string }> = {
  energetic: { a: '#FF7A3D', b: '#FFC93C', accent: 'bg-tangerine' },
  happy: { a: '#FFC93C', b: '#FF7A3D', accent: 'bg-[#FFC93C]' },
  relaxed: { a: '#5ADBB5', b: '#6EC6FF', accent: 'bg-mint' },
  chill: { a: '#6EC6FF', b: '#5ADBB5', accent: 'bg-[#6EC6FF]' },
  melancholic: { a: '#6C7BD9', b: '#C77DFF', accent: 'bg-[#6C7BD9]' },
  focus: { a: '#3D3BF3', b: '#6C7BD9', accent: 'bg-ultramarine' },
  focused: { a: '#3D3BF3', b: '#6C7BD9', accent: 'bg-ultramarine' },
  party: { a: '#FF4D8D', b: '#FF7A3D', accent: 'bg-[#FF4D8D]' },
  sleepy: { a: '#C77DFF', b: '#6C7BD9', accent: 'bg-orchid' },
  calm: { a: '#5ADBB5', b: '#6EC6FF', accent: 'bg-mint' },
};

const DEFAULT_FIELD_A = '#3D3BF3';
const DEFAULT_FIELD_B = '#C77DFF';

export const MoodSelector: React.FC<MoodSelectorProps> = ({
  activeMood,
  onSelectMood,
  onClearMood,
  className,
}) => {
  // Signature moment: Color field smoothly changes when mood changes
  useEffect(() => {
    if (activeMood) {
      const moodConfig = MOOD_COLOR_MAP[activeMood.toLowerCase()];
      if (moodConfig) {
        document.documentElement.style.setProperty('--field-a', moodConfig.a);
        document.documentElement.style.setProperty('--field-b', moodConfig.b);
      }
    } else {
      document.documentElement.style.setProperty('--field-a', DEFAULT_FIELD_A);
      document.documentElement.style.setProperty('--field-b', DEFAULT_FIELD_B);
    }
  }, [activeMood]);

  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-center justify-between mb-3 px-0.5">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-ultramarine" />
          <span className="text-scale-14 font-semibold text-ink dark:text-slate-100">
            Explore by mood
          </span>
        </div>
        {activeMood && (
          <button
            type="button"
            onClick={onClearMood}
            className="flex items-center gap-1.5 text-xs font-medium text-ink/65 dark:text-slate-300 hover:text-ink dark:hover:text-white transition-colors px-3 py-1 rounded-full bg-white/70 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-700 border border-white/60 dark:border-white/10 shadow-subtle"
            title="Reset mood filter"
          >
            <X className="w-3.5 h-3.5" />
            <span>Reset mood</span>
          </button>
        )}
      </div>

      {/* Horizontally scrollable chips */}
      <div className="flex gap-2.5 overflow-x-auto pb-1.5 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
        {MOOD_OPTIONS.map((mood) => {
          const isSelected = activeMood?.toLowerCase() === mood.id.toLowerCase();
          const Icon = mood.icon || MOOD_ICON_MAP[mood.id] || Sparkles;
          const moodConfig = MOOD_COLOR_MAP[mood.id.toLowerCase()];

          return (
            <button
              key={mood.id}
              type="button"
              onClick={() => onSelectMood(mood.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-full text-scale-14 font-medium whitespace-nowrap transition-all duration-200 shrink-0 border select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-ultramarine',
                isSelected
                  ? 'bg-ultramarine text-white border-ultramarine shadow-sm font-semibold'
                  : 'bg-white/70 dark:bg-slate-900/70 hover:bg-white dark:hover:bg-slate-800 border-white/60 dark:border-white/10 text-ink/75 dark:text-slate-300 hover:text-ink dark:hover:text-white shadow-subtle'
              )}
              style={
                isSelected && moodConfig
                  ? { backgroundColor: moodConfig.a, borderColor: moodConfig.a }
                  : undefined
              }
              aria-pressed={isSelected}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{mood.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default MoodSelector;
