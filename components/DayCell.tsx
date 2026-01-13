'use client';

import { motion } from 'framer-motion';
import type { MouseEvent } from 'react';

import type { DayState, YearDay } from '@/hooks/useYearProgress';

type Props = {
  day: YearDay;
  onHover: (day: YearDay, event: MouseEvent<HTMLDivElement>) => void;
  onMove: (day: YearDay, event: MouseEvent<HTMLDivElement>) => void;
  onLeave: () => void;
  onClick?: (day: YearDay, event: MouseEvent<HTMLDivElement>) => void;
  dimmed?: boolean;
  selected?: boolean;
  entry?: { state: 0 | 1 | 2 | 3 | 4 | 5; note: string } | null;
};

function cellBase(state: DayState) {
  switch (state) {
    case 'past':
      return 'border border-zinc-300/60 bg-zinc-200/65';
    case 'today':
      return 'bg-cyan-500';
    case 'future':
      return 'border border-zinc-200/60 bg-white/85';
  }
}

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
      return 'bg-emerald-400';
  }
}

export default function DayCell({
  day,
  onHover,
  onMove,
  onLeave,
  onClick,
  dimmed,
  selected,
  entry
}: Props) {
  const baseClasses =
    'relative aspect-square w-full cursor-pointer rounded-[4px] transition-[transform,filter,background-color,border-color,opacity] duration-150 ease-out will-change-transform hover:z-10 hover:scale-[1.06] hover:brightness-105';

  const holiday = day.holiday;
  const holidayNode = holiday ? (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-0.5">
      <span
        className={`select-none text-[10px] font-semibold leading-none tracking-tight ${
          day.state === 'today' ? 'text-white/95' : 'text-zinc-700/85'
        }`}
      >
        {holiday}
      </span>
    </div>
  ) : null;

  const monthNode = day.isMonthStart && !holiday ? (
    <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
      <span
        className={`select-none text-[11px] font-semibold leading-none tracking-tight ${
          day.state === 'today' ? 'text-white/95' : 'text-zinc-700/70'
        }`}
      >
        {day.month}月
      </span>
    </div>
  ) : null;


  const entryState = entry?.state ?? 0;
  const entryDot = entryDotClass(entryState);

  const stateNode =
    entryState === 0 ? null : (
      <div className="pointer-events-none absolute right-0.5 top-0.5">
        <span className={`block h-3 w-3 rounded-full ${entryDot}`} />
      </div>
    );

  const weekendClass =
    entryState === 0 && day.isWeekend && day.state !== 'today'
      ? day.state === 'future'
        ? 'bg-zinc-50/70'
        : 'bg-zinc-300/65'
      : '';

  const holidayClass =
    holiday && day.state !== 'today'
      ? day.state === 'future'
        ? 'border border-amber-200/80 bg-amber-50/70'
        : 'border border-amber-300/70 bg-amber-100/65'
      : '';

  const selectedClass =
    selected ? 'outline outline-2 outline-cyan-600/35 outline-offset-0' : '';

  const dimmedClass = dimmed ? 'opacity-25' : '';

  if (day.state === 'today') {
    return (
      <motion.div
        role="gridcell"
        aria-label={day.label}
        className={`${baseClasses} ${cellBase(day.state)} ${selectedClass} ${dimmedClass}`}
        animate={{
          opacity: [0.92, 1, 0.92]
        }}
        transition={{
          duration: 2.8,
          ease: 'easeInOut',
          repeat: Infinity
        }}
        onMouseEnter={(e) => onHover(day, e)}
        onMouseMove={(e) => onMove(day, e)}
        onMouseLeave={onLeave}
        onClick={(e) => onClick?.(day, e)}
      >
        {monthNode}
        {holidayNode}
        {stateNode}
      </motion.div>
    );
  }

  return (
    <div
      role="gridcell"
      aria-label={day.label}
      className={`${baseClasses} ${cellBase(day.state)} ${weekendClass} ${holidayClass} ${selectedClass} ${dimmedClass}`}
      onMouseEnter={(e) => onHover(day, e)}
      onMouseMove={(e) => onMove(day, e)}
      onMouseLeave={onLeave}
      onClick={(e) => onClick?.(day, e)}
    >
      {monthNode}
      {holidayNode}
      {stateNode}
    </div>
  );
}
