import React, { useMemo } from 'react';
import { YearDay, ViewMode } from '@/hooks/useYearProgress';
import DayCell from '@/components/DayCell';
import { BodyState, Entry } from '@/lib/types';
import { ThemeColor } from '@/components/RangeSelector';

interface YearGridBodyProps {
  viewMode: ViewMode;
  days: YearDay[];
  columns: number;
  gridGap: number;
  entries: Record<string, Entry>;
  selectedISODate: string | null;
  focusedISODate: string | null;
  highlightWeekends: boolean;
  highlightHolidays: boolean;
  effectiveHighlightThisMonth: boolean;
  currentMonth: number;
  recordFilter: 'all' | 'recorded' | 'unrecorded';
  noteOnly: boolean;
  stateFilters: BodyState[];
  noteQuery: string;
  isDragging: boolean;
  dragStartISO: string | null;
  dragCurrentISO: string | null;
  isRangeEditing: boolean;
  rangeDraftColor: ThemeColor;
  rangeDraftStartISO: string;
  rangeDraftEndISO: string;
  onCellHover: (day: YearDay, e: React.MouseEvent<HTMLDivElement>) => void;
  onCellMove: (day: YearDay, e: React.MouseEvent<HTMLDivElement>) => void;
  onCellLeave: () => void;
  onCellFocus: (day: YearDay, e: React.FocusEvent<HTMLDivElement>) => void;
  onCellBlur: (day: YearDay) => void;
  onCellKeyDown: (day: YearDay, e: React.KeyboardEvent<HTMLDivElement>) => void;
  onCellClick: (day: YearDay) => void;
  onCellMouseDown: (day: YearDay) => void;
  onCellMouseUp: (day: YearDay) => void;
}

export const YearGridBody: React.FC<YearGridBodyProps> = ({
  viewMode,
  days,
  columns,
  gridGap,
  entries,
  selectedISODate,
  focusedISODate,
  highlightWeekends,
  highlightHolidays,
  effectiveHighlightThisMonth,
  currentMonth,
  recordFilter,
  noteOnly,
  stateFilters,
  noteQuery,
  isDragging,
  dragStartISO,
  dragCurrentISO,
  isRangeEditing,
  rangeDraftColor,
  rangeDraftStartISO,
  rangeDraftEndISO,
  onCellHover,
  onCellMove,
  onCellLeave,
  onCellFocus,
  onCellBlur,
  onCellKeyDown,
  onCellClick,
  onCellMouseDown,
  onCellMouseUp,
}) => {
  const yearMonthBlocks = useMemo(() => {
    if (viewMode !== 'year') return [];
    const byMonth = new Map<number, YearDay[]>();
    for (const d of days) {
      const arr = byMonth.get(d.month);
      if (arr) arr.push(d);
      else byMonth.set(d.month, [d]);
    }
    const blocks: Array<{ month: number; offset: number; days: YearDay[] }> = [];
    for (let m = 1; m <= 12; m += 1) {
      const monthDays = byMonth.get(m) ?? [];
      if (monthDays.length === 0) continue;
      const dow = monthDays[0].date.getDay();
      const offset = (dow + 6) % 7;
      blocks.push({ month: m, offset, days: monthDays });
    }
    return blocks;
  }, [days, viewMode]);

  const renderDayCell = (day: YearDay, variant: 'compact' | 'mini' | 'large') => {
    const entry = entries[day.isoDate] ?? null;
    const selected = selectedISODate === day.isoDate;

    const propertyHighlightActive = effectiveHighlightThisMonth;
    const propertyMatch =
      !propertyHighlightActive ||
      (effectiveHighlightThisMonth && day.month === currentMonth);

    const recorded = !!entry;
    const hasNote = !!entry?.note.trim();
    const recordMatch =
      recordFilter === 'all'
        ? true
        : recordFilter === 'recorded'
          ? recorded
          : !recorded;
    const noteMatch = !noteOnly || hasNote;
    const stateMatch =
      stateFilters.length === 0 ? true : entry ? stateFilters.includes(entry.state) : false;
    const q = noteQuery.trim().toLowerCase();
    const queryMatch = !q || (hasNote && entry!.note.toLowerCase().includes(q));

    const anyFilter =
      propertyHighlightActive ||
      recordFilter !== 'all' ||
      noteOnly ||
      stateFilters.length > 0 ||
      q !== '';
    const matches = propertyMatch && recordMatch && noteMatch && stateMatch && queryMatch;
    const dimmed = viewMode !== 'range' && anyFilter && !matches;

    let isDragSelected = false;
    if (isDragging && dragStartISO && dragCurrentISO) {
      const s = dragStartISO < dragCurrentISO ? dragStartISO : dragCurrentISO;
      const e = dragStartISO > dragCurrentISO ? dragStartISO : dragCurrentISO;
      isDragSelected = day.isoDate >= s && day.isoDate <= e;
    } else if (isRangeEditing && rangeDraftStartISO && rangeDraftEndISO) {
      isDragSelected = day.isoDate >= rangeDraftStartISO && day.isoDate <= rangeDraftEndISO;
    }

    const cellThemeColor = isRangeEditing && isDragSelected ? rangeDraftColor : 'emerald';

    return (
      <DayCell
        key={day.isoDate}
        variant={variant}
        dataIso={day.isoDate}
        tabIndex={focusedISODate === day.isoDate ? 0 : -1}
        day={day}
        dimmed={dimmed}
        selected={selected}
        isDragSelected={isDragSelected}
        forceGray={isRangeEditing && !isDragSelected}
        themeColor={cellThemeColor}
        entry={isRangeEditing ? null : entry}
        showWeekend={highlightWeekends}
        showHoliday={highlightHolidays}
        onHover={onCellHover}
        onMove={onCellMove}
        onLeave={onCellLeave}
        onFocus={onCellFocus}
        onBlur={onCellBlur}
        onKeyDown={onCellKeyDown}
        onClick={onCellClick}
        onMouseDown={onCellMouseDown}
        onMouseUp={onCellMouseUp}
      />
    );
  };

  if (viewMode === 'year') {
    return (
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {yearMonthBlocks.map((block) => (
          <div key={block.month} className="flex flex-col">
            <div className="mb-3 flex items-baseline justify-between">
              <span className="text-sm font-semibold text-zinc-900">{block.month}月</span>
              <span className="text-[10px] text-zinc-400">
                {block.days.length}天
              </span>
            </div>
            <div
              className="grid gap-1.5"
              style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}
            >
              {['一', '二', '三', '四', '五', '六', '日'].map((wd) => (
                <div
                  key={wd}
                  className="mb-1 text-center text-[10px] font-medium text-zinc-400"
                >
                  {wd}
                </div>
              ))}
              {Array.from({ length: block.offset }).map((_, i) => (
                <div key={`offset-${i}`} />
              ))}
              {block.days.map((day) => renderDayCell(day, 'mini'))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      className="grid"
      style={{
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: `${gridGap}px`,
      }}
    >
      {days.map((day) =>
        renderDayCell(
          day,
          viewMode === 'month' || viewMode === 'week' || viewMode === 'range'
            ? 'compact'
            : 'large'
        )
      )}
    </div>
  );
};
