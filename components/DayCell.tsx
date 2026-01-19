'use client';

import { motion } from 'framer-motion';
import type { FocusEvent, KeyboardEvent, MouseEvent } from 'react';
import { memo } from 'react';

import { themeTokens, ThemeColor } from './RangeSelector';
import type { YearDay } from '@/hooks/useYearProgress';
import { BODY_STATE_META } from '@/lib/constants';
import type { BodyState } from '@/lib/types';

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
  entry?: { state: BodyState; note: string } | null;
  tabIndex?: number;
  dataIso?: string;
  showWeekend?: boolean;
  showHoliday?: boolean;
  showDateNumber?: boolean;
  dimDateNumber?: boolean;
};

function entryDotClass(state: BodyState) {
  return BODY_STATE_META[state].dotClass;
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
  showHoliday = false,
  showDateNumber = false,
  dimDateNumber = false
}: Props) {
  const theme = themeTokens[themeColor] || themeTokens.emerald;
  const baseClasses =
    variant === 'large'
      ? 'relative aspect-square w-full cursor-pointer rounded-2xl shadow-sm transition-all duration-150 ease-out will-change-transform hover:z-10 hover:shadow-md hover:brightness-[1.01] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0'
      : variant === 'mini'
        ? 'relative aspect-square w-full cursor-pointer rounded-md transition-all duration-150 ease-out will-change-transform hover:z-10 hover:scale-110 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0'
        : 'relative aspect-square w-full cursor-pointer rounded-lg transition-all duration-150 ease-out will-change-transform hover:z-10 hover:shadow-md hover:brightness-[1.01] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0';

  const dateNumber = day.date.getDate();
  const isToday = day.state === 'today';
  const showHolidayLabel = !!day.holiday && showHoliday;
  const showMiniDate = showDateNumber && (variant === 'mini' || variant === 'compact');

  const entryState = entry?.state ?? 0;
  const entryDot = entryDotClass(entryState);
  const isMarked = !!entry;

  const todayEffectClass = isToday
    ? `ring-2 ${theme.dayRing} ring-offset-2 ring-offset-white ${theme.dayShadow} shadow-lg`
    : '';

  const backgroundClass = day.state === 'past'
    ? 'bg-[#888888] text-white'
    : isDragSelected
      ? theme.dayMarked
      : isToday
        ? theme.dayToday
        : forceGray
          ? 'bg-zinc-200/70 text-zinc-700'
          : isMarked
            ? theme.dayMarked
            : (day.holiday && showHoliday)
              ? 'bg-[#FFB4AD] text-zinc-900'
              : (day.isWeekend && showWeekend)
                ? 'bg-[#D2D5F2] text-zinc-900'
                : theme.dayFuture;

  const primaryLargeTextClass = isToday ? 'text-white' : 'text-zinc-900';
  const secondaryLargeTextClass = isToday ? 'text-white/90' : 'text-zinc-600';

  const contentNode =
    variant === 'large' ? (
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-0.5 px-1">
        <div
          className={`select-none text-lg font-semibold leading-none tabular-nums ${
            primaryLargeTextClass
          } ${dimDateNumber ? 'opacity-30' : ''}`}
        >
          {dateNumber}
        </div>
        {showHolidayLabel ? (
          <div
            className={`select-none text-[12px] font-semibold leading-none tracking-tight ${
              secondaryLargeTextClass
            }`}
          >
            {day.holiday}
          </div>
        ) : null}
      </div>
    ) : showMiniDate || showHolidayLabel ? (
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-0.5">
        <div className="flex max-w-full flex-col items-center justify-center gap-0.5">
          {showMiniDate ? (
            <div
              className={`select-none font-semibold leading-none tabular-nums ${
                variant === 'mini' ? 'text-[10px]' : 'text-[13px]'
              } ${dimDateNumber ? 'opacity-30' : ''}`}
            >
              {dateNumber}
            </div>
          ) : null}
          {showHolidayLabel ? (
            <div
              className={`select-none font-semibold leading-none tracking-tight ${
                variant === 'mini' ? 'text-[8px]' : 'text-[10px]'
              } truncate`}
            >
              {day.holiday}
            </div>
          ) : null}
        </div>
      </div>
    ) : null;

  const stateNode =
    entryState !== 0 ? (
      <div className="pointer-events-none absolute right-1 top-1">
        <span
          className={`block rounded-full ${
            variant === 'mini' ? 'bg-[#009C7B] ring-1 ring-white' : entryDot
          } ${variant === 'mini' ? 'h-1.5 w-1.5' : 'h-2 w-2'}`}
        />
      </div>
    ) : null;

  const selectedClass =
    selected ? `ring-2 ${theme.dayRing} ring-offset-2 ring-offset-white` : '';

  const dimmedClass = dimmed ? 'opacity-40' : '';

  if (day.state === 'today') {
    return (
      <motion.div
        role="gridcell"
        aria-label={day.label}
        data-iso={dataIso ?? day.isoDate}
        tabIndex={tabIndex}
        className={`${baseClasses} ${theme.dayFocusOutline} ${backgroundClass} ${todayEffectClass} ${selectedClass} ${dimmedClass}`}
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
      className={`${baseClasses} ${theme.dayFocusOutline} ${backgroundClass} ${todayEffectClass} ${selectedClass} ${dimmedClass}`}
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
