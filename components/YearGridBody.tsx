import React, { useMemo, useState } from 'react';
import { YearDay, ViewMode } from '@/hooks/useYearProgress';
import DayCell from '@/components/DayCell';
import { Entry } from '@/lib/types';
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
  currentMonth: number;
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
  onCellClick: (day: YearDay, e: React.MouseEvent<HTMLDivElement>) => void;
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
  currentMonth,
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
  const [hoveredMonth, setHoveredMonth] = useState<number | null>(null);
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

  const renderDayCell = (
    day: YearDay,
    variant: 'compact' | 'mini' | 'large' = 'compact',
    isActiveMonth: boolean = false
  ) => {
    const entry = entries[day.isoDate] ?? null;
    const selected = selectedISODate === day.isoDate;
    const dimmed = false;

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
        showDateNumber={variant === 'mini' || viewMode === 'month' ? true : isActiveMonth}
        dimDateNumber={(variant === 'mini' || viewMode === 'month') && !isActiveMonth}
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

  if (viewMode === 'month') {
    if (days.length === 0) return null;
    const offset = (days[0].date.getDay() + 6) % 7;
    const totalCells = offset + days.length;
    const trailing = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);

    return (
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}
      >
        {['一', '二', '三', '四', '五', '六', '日'].map((wd) => (
          <div
            key={wd}
            className="mb-1 text-center text-xs font-medium text-zinc-400"
          >
            {wd}
          </div>
        ))}
        {Array.from({ length: offset }).map((_, i) => (
          <div key={`offset-${i}`} />
        ))}
        {days.map((day) => renderDayCell(day, 'compact', true))}
        {Array.from({ length: trailing }).map((_, i) => (
          <div key={`trailing-${i}`} />
        ))}
      </div>
    );
  }

  if (viewMode === 'year') {
    return (
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {yearMonthBlocks.map((block) => {
          const isCurrentMonth = block.month === currentMonth;
          const isHovered = hoveredMonth === block.month;
          const isActive = isCurrentMonth || isHovered;
          
          return (
          <div
            key={block.month}
            className={`flex flex-col rounded-2xl transition-all duration-300 ease-out ${
              isActive ? 'bg-zinc-50' : ''
            } ${
              isCurrentMonth 
                ? 'sm:col-span-2 sm:row-span-2 p-6 shadow-sm ring-1 ring-zinc-200/50' 
                : 'p-3'
            }`}
            onMouseEnter={() => setHoveredMonth(block.month)}
            onMouseLeave={() => setHoveredMonth(null)}
          >
            <div className="mb-3 flex items-baseline justify-between">
              <span className={`${isCurrentMonth ? 'text-xl' : 'text-sm'} font-semibold text-zinc-900`}>
                {block.month}月
              </span>
              <span className={`${isCurrentMonth ? 'text-xs' : 'text-[10px]'} text-zinc-400`}>
                {block.days.length}天
              </span>
            </div>
            <div
              className={`grid ${isCurrentMonth ? 'gap-2' : 'gap-1.5'}`}
              style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}
            >
              {['一', '二', '三', '四', '五', '六', '日'].map((wd) => (
                <div
                  key={wd}
                  className={`mb-1 text-center font-medium text-zinc-400 ${
                    isCurrentMonth ? 'text-xs' : 'text-[10px]'
                  }`}
                >
                  {wd}
                </div>
              ))}
              {Array.from({ length: block.offset }).map((_, i) => (
                <div key={`offset-${i}`} />
              ))}
              {block.days.map((day) => renderDayCell(day, isCurrentMonth ? 'compact' : 'mini', isActive))}
            </div>
          </div>
        )})}
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
      {days.map((day) => renderDayCell(day, 'compact', true))}
    </div>
  );
};
