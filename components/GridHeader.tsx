'use client';

import { format } from 'date-fns';
import { Legend } from '@/components/legend';
import { RangeProgressHeader } from '@/components/RangeProgressHeader';
import type { ViewMode } from '@/hooks/useYearProgress';
import type { SavedRange } from '@/components/RangeSelector';

interface GridHeaderProps {
  viewMode: ViewMode;
  activeRange: SavedRange | null;
  rangeStart: Date;
  now: Date;
  isEditingRange: boolean;
  highlightWeekends: boolean;
  setHighlightWeekends: (v: boolean) => void;
  highlightHolidays: boolean;
  setHighlightHolidays: (v: boolean) => void;
}

export function GridHeader({
  viewMode,
  activeRange,
  rangeStart,
  now,
  isEditingRange,
  highlightWeekends,
  setHighlightWeekends,
  highlightHolidays,
  setHighlightHolidays
}: GridHeaderProps) {
  if (viewMode === 'range' && activeRange) {
    return (
      <div className="mb-6 space-y-4">
        <div className="flex justify-end">
          <Legend
            showWeekends={highlightWeekends}
            onToggleWeekends={() => setHighlightWeekends(!highlightWeekends)}
            showHolidays={highlightHolidays}
            onToggleHolidays={() => setHighlightHolidays(!highlightHolidays)}
          />
        </div>

        {!isEditingRange && <RangeProgressHeader range={activeRange} now={now} />}
      </div>
    );
  }

  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="text-xl font-semibold text-zinc-900">
        {viewMode === 'year'
          ? format(rangeStart, 'yyyy年')
          : viewMode === 'month'
            ? format(rangeStart, 'M月')
            : viewMode === 'week'
              ? '本周'
              : activeRange?.name?.trim() || '区间'}
      </div>
      <Legend
        showWeekends={highlightWeekends}
        onToggleWeekends={() => setHighlightWeekends(!highlightWeekends)}
        showHolidays={highlightHolidays}
        onToggleHolidays={() => setHighlightHolidays(!highlightHolidays)}
      />
    </div>
  );
}
