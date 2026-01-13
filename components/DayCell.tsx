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
  mark?: { kind: 'done' | 'event'; note?: string } | null;
};

function cellBase(state: DayState) {
  switch (state) {
    case 'past':
      return 'border border-zinc-200/70 bg-zinc-200/60';
    case 'today':
      return 'bg-cyan-500';
    case 'future':
      return 'border border-zinc-300/70 bg-white/25';
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
  mark
}: Props) {
  const baseClasses =
    'relative aspect-square w-full cursor-pointer rounded-[2px] transition-[transform,filter,background-color,border-color,box-shadow,opacity] duration-150 ease-out will-change-transform hover:z-10 hover:scale-[1.12] hover:brightness-105 hover:shadow-[0_10px_24px_rgba(0,0,0,0.08)]';

  const holiday = day.holiday;
  const holidayNode = holiday ? (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-0.5">
      <span
        className={`select-none font-mono text-[10px] font-semibold leading-none tracking-tight ${
          day.state === 'today' ? 'text-white/95' : 'text-zinc-700/85'
        }`}
      >
        {holiday}
      </span>
    </div>
  ) : null;

  const monthNode = day.isMonthStart ? (
    <div className="pointer-events-none absolute left-0.5 top-0.5">
      <span
        className={`select-none font-mono text-[9px] font-semibold leading-none tracking-tight ${
          day.state === 'today' ? 'text-white/95' : 'text-zinc-700/70'
        }`}
      >
        {day.month}月
      </span>
    </div>
  ) : null;

  const markNode = mark ? (
    <div className="pointer-events-none absolute bottom-0.5 right-0.5">
      <span
        className={`select-none font-mono text-[10px] font-semibold leading-none ${
          day.state === 'today' ? 'text-white/95' : 'text-zinc-700/85'
        }`}
      >
        {mark.kind === 'done' ? '✓' : '•'}
      </span>
    </div>
  ) : null;

  const weekendClass =
    day.isWeekend && day.state !== 'today'
      ? day.state === 'future'
        ? 'bg-zinc-50/70'
        : 'bg-zinc-200/75'
      : '';

  const holidayClass =
    day.holiday && day.state !== 'today'
      ? 'border-amber-300/70 bg-amber-50/40'
      : '';

  const selectedClass =
    selected && day.state !== 'today'
      ? 'shadow-[0_0_0_2px_rgba(14,116,144,0.35)]'
      : '';

  const dimmedClass = dimmed ? 'opacity-25' : '';

  if (day.state === 'today') {
    return (
      <motion.div
        role="gridcell"
        aria-label={day.label}
        className={`${baseClasses} ${cellBase(day.state)} ${dimmedClass}`}
        animate={{
          opacity: [0.92, 1, 0.92],
          boxShadow: [
            '0 0 0px rgba(6, 182, 212, 0.0)',
            '0 0 26px rgba(6, 182, 212, 0.35)',
            '0 0 0px rgba(6, 182, 212, 0.0)'
          ]
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
        {markNode}
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
      {markNode}
    </div>
  );
}
