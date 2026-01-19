'use client';

import { format } from 'date-fns';
import { useEffect, useState } from 'react';
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
  rangeDraftName?: string;
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
  rangeDraftName,
  highlightWeekends,
  setHighlightWeekends,
  highlightHolidays,
  setHighlightHolidays
}: GridHeaderProps) {
  const [showRangeHint, setShowRangeHint] = useState(false);

  useEffect(() => {
    if (viewMode !== 'range') return;
    setShowRangeHint(true);
    const id = window.setTimeout(() => setShowRangeHint(false), 8000);
    return () => window.clearTimeout(id);
  }, [viewMode]);

  if (viewMode === 'range' && activeRange && !isEditingRange) {
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

        {showRangeHint ? (
          <div className="text-xs text-zinc-500">
            篇章：自定义一段时间范围，用来做目标、阶段或倒数。
          </div>
        ) : null}

        <RangeProgressHeader range={activeRange} now={now} />
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
              : (isEditingRange ? rangeDraftName : activeRange?.name)?.trim() || '区间'}
      </div>
      <div className="flex flex-col items-end gap-1">
        <Legend
          showWeekends={highlightWeekends}
          onToggleWeekends={() => setHighlightWeekends(!highlightWeekends)}
          showHolidays={highlightHolidays}
          onToggleHolidays={() => setHighlightHolidays(!highlightHolidays)}
        />
        {viewMode === 'range' && showRangeHint ? (
          <div className="text-xs text-zinc-500">
            篇章：自定义一段时间范围，用来做目标、阶段或倒数。
          </div>
        ) : null}
      </div>
    </div>
  );
}
