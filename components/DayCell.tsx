'use client';

import { motion } from 'framer-motion';
import type { MouseEvent } from 'react';

import type { DayState, YearDay } from '@/hooks/useYearProgress';

type Props = {
  day: YearDay;
  todayElapsedRatio?: number;
  onHover: (day: YearDay, event: MouseEvent<HTMLDivElement>) => void;
  onMove: (day: YearDay, event: MouseEvent<HTMLDivElement>) => void;
  onLeave: () => void;
};

function cellBase(state: DayState) {
  switch (state) {
    case 'past':
      return 'bg-zinc-200/55';
    case 'today':
      return 'bg-cyan-500';
    case 'future':
      return 'border border-zinc-200/60 bg-white/15';
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export default function DayCell({
  day,
  todayElapsedRatio,
  onHover,
  onMove,
  onLeave
}: Props) {
  const baseClasses =
    'relative aspect-square w-full cursor-pointer rounded-[2px] transition-[transform,filter,background-color,border-color] duration-150 ease-out will-change-transform hover:z-10 hover:scale-[1.12] hover:brightness-105';

  if (day.state === 'today') {
    return (
      <motion.div
        role="gridcell"
        aria-label={day.label}
        className={`${baseClasses} ${cellBase(day.state)}`}
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
      />
    );
  }

  return (
    <div
      role="gridcell"
      aria-label={day.label}
      className={`${baseClasses} ${cellBase(day.state)}`}
      onMouseEnter={(e) => onHover(day, e)}
      onMouseMove={(e) => onMove(day, e)}
      onMouseLeave={onLeave}
    />
  );
}
