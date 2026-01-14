'use client';

import { motion } from 'framer-motion';
import type { FocusEvent, KeyboardEvent, MouseEvent } from 'react';
import { memo } from 'react';

import { ThemeColor } from './RangeSelector';
import type { YearDay } from '@/hooks/useYearProgress';

type Props = {
  day: YearDay;
  variant?: 'compact' | 'mini' | 'large';
  onHover: (day: YearDay, event: MouseEvent<HTMLDivElement>) => void;
  onMove: (day: YearDay, event: MouseEvent<HTMLDivElement>) => void;
  onLeave: () => void;
  onClick?: (day: YearDay, event: MouseEvent<HTMLDivElement>) => void;
  onMouseDown?: (day: YearDay, event: MouseEvent<HTMLDivElement>) => void;
  onMouseUp?: (day: YearDay, event: MouseEvent<HTMLDivElement>) => void;
  onFocus?: (day: YearDay, event: FocusEvent<HTMLDivElement>) => void;
  onBlur?: (day: YearDay, event: FocusEvent<HTMLDivElement>) => void;
  onKeyDown?: (day: YearDay, event: KeyboardEvent<HTMLDivElement>) => void;
  dimmed?: boolean;
  selected?: boolean;
  isDragSelected?: boolean;
  forceGray?: boolean;
  themeColor?: ThemeColor;
  entry?: { state: 0 | 1 | 2 | 3 | 4 | 5; note: string } | null;
  tabIndex?: number;
  dataIso?: string;
  showWeekend?: boolean;
  showHoliday?: boolean;
};

const themeClasses: Record<string, { today: string, marked: string, past: string, future: string, ring: string, shadow: string }> = {
  emerald: { today: 'bg-[#009C7B] text-white', marked: 'bg-[#7BC27E] text-zinc-900', past: 'bg-[#D8E9E4] text-zinc-700', future: 'bg-[#EEF3F4] border border-zinc-200/60 text-zinc-900', ring: 'ring-[#009C7B]/30', shadow: 'shadow-[#009C7B]/25' },
  blue: { today: 'bg-blue-600 text-white', marked: 'bg-blue-300 text-zinc-900', past: 'bg-blue-100 text-blue-900', future: 'bg-zinc-50 border border-zinc-200/60 text-zinc-900', ring: 'ring-blue-600/30', shadow: 'shadow-blue-600/25' },
  rose: { today: 'bg-rose-600 text-white', marked: 'bg-rose-300 text-zinc-900', past: 'bg-rose-100 text-rose-900', future: 'bg-zinc-50 border border-zinc-200/60 text-zinc-900', ring: 'ring-rose-600/30', shadow: 'shadow-rose-600/25' },
  amber: { today: 'bg-amber-500 text-white', marked: 'bg-amber-300 text-zinc-900', past: 'bg-amber-100 text-amber-900', future: 'bg-zinc-50 border border-zinc-200/60 text-zinc-900', ring: 'ring-amber-500/30', shadow: 'shadow-amber-500/25' },
  violet: { today: 'bg-violet-600 text-white', marked: 'bg-violet-300 text-zinc-900', past: 'bg-violet-100 text-violet-900', future: 'bg-zinc-50 border border-zinc-200/60 text-zinc-900', ring: 'ring-violet-600/30', shadow: 'shadow-violet-600/25' },
  cyan: { today: 'bg-cyan-500 text-white', marked: 'bg-cyan-300 text-zinc-900', past: 'bg-cyan-100 text-cyan-900', future: 'bg-zinc-50 border border-zinc-200/60 text-zinc-900', ring: 'ring-cyan-500/30', shadow: 'shadow-cyan-500/25' },
};

function entryDotClass(state: 0 | 1 | 2 | 3 | 4 | 5) {
  switch (state) {
    case 0:
      return 'hidden';
    case 1:
      return 'bg-rose-400';
    case 2:
      return 'bg-amber-400';
    case 3:
      return 'bg-zinc-400';
    case 4:
      return 'bg-cyan-400';
    case 5:
      return 'bg-emerald-600';
  }
}

function DayCell({
  day,
  variant = 'compact',
  onHover,
  onMove,
  onLeave,
  onClick,
  onMouseDown,
  onMouseUp,
  onFocus,
  onBlur,
  onKeyDown,
  dimmed,
  selected,
  isDragSelected,
  forceGray,
  themeColor = 'emerald',
  entry,
  tabIndex,
  dataIso,
  showWeekend = false,
  showHoliday = false
}: Props) {
  const theme = themeClasses[themeColor] || themeClasses.emerald;
  const baseClasses =
    variant === 'large'
      ? `relative aspect-square w-full cursor-pointer rounded-2xl shadow-sm transition-all duration-150 ease-out will-change-transform hover:z-10 hover:shadow-md hover:brightness-[1.01] focus-visible:outline focus-visible:outline-2 focus-visible:outline-${themeColor}-600/40 focus-visible:outline-offset-0`
      : variant === 'mini'
        ? `relative aspect-square w-full cursor-pointer rounded-md transition-all duration-150 ease-out will-change-transform hover:z-10 hover:scale-110 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-${themeColor}-600/40 focus-visible:outline-offset-0`
        : `relative aspect-square w-full cursor-pointer rounded-lg transition-all duration-150 ease-out will-change-transform hover:z-10 hover:shadow-md hover:brightness-[1.01] focus-visible:outline focus-visible:outline-2 focus-visible:outline-${themeColor}-600/40 focus-visible:outline-offset-0`;

  const dateNumber = day.date.getDate();
  const isToday = day.state === 'today';

  const entryState = entry?.state ?? 0;
  const entryDot = entryDotClass(entryState);
  const isMarked = !!entry;

  const todayEffectClass = isToday
    ? `ring-2 ${theme.ring} ring-offset-2 ring-offset-white ${theme.shadow} shadow-lg`
    : '';

  const backgroundClass = isDragSelected
    ? theme.marked
    : isToday
      ? theme.today
      : forceGray
        ? 'bg-zinc-200/70 text-zinc-700'
        : isMarked
          ? theme.marked
          : (day.holiday && showHoliday)
            ? 'bg-[#FFB4AD] text-zinc-900'
            : (day.isWeekend && showWeekend)
              ? 'bg-[#D2D5F2] text-zinc-900'
              : day.state === 'past'
                ? theme.past
                : theme.future;

  const primaryLargeTextClass = isToday ? 'text-white' : 'text-zinc-900';
  const secondaryLargeTextClass = isToday ? 'text-white/90' : 'text-zinc-600';

  const contentNode = variant === 'large' ? (
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-0.5 px-1">
        <div
          className={`select-none text-base font-semibold leading-none tabular-nums ${
            primaryLargeTextClass
          }`}
        >
          {dateNumber}
        </div>
        {day.holiday ? (
          <div
            className={`select-none text-[10px] font-semibold leading-none tracking-tight ${
              secondaryLargeTextClass
            }`}
          >
            {day.holiday}
          </div>
        ) : null}
      </div>
    ) : null;

  const stateNode =
    (variant === 'mini' ? entryState !== 0 || !!day.holiday : entryState !== 0) ? (
      <div className="pointer-events-none absolute right-1 top-1">
        <span
          className={`block rounded-full ${
            variant === 'mini' ? 'bg-[#009C7B] ring-1 ring-white' : entryDot
          } ${variant === 'mini' ? 'h-1.5 w-1.5' : 'h-2 w-2'}`}
        />
      </div>
    ) : null;

  const selectedClass =
    selected ? `ring-2 ${theme.ring} ring-offset-2 ring-offset-white` : '';

  const dimmedClass = dimmed ? 'opacity-40' : '';

  if (day.state === 'today') {
    return (
      <motion.div
        role="gridcell"
        aria-label={day.label}
        data-iso={dataIso ?? day.isoDate}
        tabIndex={tabIndex}
        className={`${baseClasses} ${backgroundClass} ${todayEffectClass} ${selectedClass} ${dimmedClass}`}
        onMouseEnter={(e) => onHover(day, e)}
        onMouseMove={(e) => onMove(day, e)}
        onMouseLeave={onLeave}
        onFocus={(e) => onFocus?.(day, e)}
        onBlur={(e) => onBlur?.(day, e)}
        onKeyDown={(e) => onKeyDown?.(day, e)}
        onClick={(e) => onClick?.(day, e)}
        onMouseDown={(e) => onMouseDown?.(day, e)}
        onMouseUp={(e) => onMouseUp?.(day, e)}
      >
        {contentNode}
        {stateNode}
      </motion.div>
    );
  }

  return (
    <div
      role="gridcell"
      aria-label={day.label}
      data-iso={dataIso ?? day.isoDate}
      tabIndex={tabIndex}
      className={`${baseClasses} ${backgroundClass} ${todayEffectClass} ${selectedClass} ${dimmedClass}`}
      onMouseEnter={(e) => onHover(day, e)}
      onMouseMove={(e) => onMove(day, e)}
      onMouseLeave={onLeave}
      onFocus={(e) => onFocus?.(day, e)}
      onBlur={(e) => onBlur?.(day, e)}
      onKeyDown={(e) => onKeyDown?.(day, e)}
      onClick={(e) => onClick?.(day, e)}
      onMouseDown={(e) => onMouseDown?.(day, e)}
      onMouseUp={(e) => onMouseUp?.(day, e)}
    >
      {contentNode}
      {stateNode}
    </div>
  );
}

export default memo(DayCell);
