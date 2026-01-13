'use client';

import { motion } from 'framer-motion';
import type { MouseEvent } from 'react';

import type { DayState, YearDay } from '@/hooks/useYearProgress';

type Props = {
  day: YearDay;
  onHover: (day: YearDay, event: MouseEvent<HTMLDivElement>) => void;
  onMove: (day: YearDay, event: MouseEvent<HTMLDivElement>) => void;
  onLeave: () => void;
};

function cellBase(state: DayState) {
  switch (state) {
    case 'past':
      return 'bg-zinc-800/60 opacity-80';
    case 'today':
      return 'bg-amber-500';
    case 'future':
      return 'border border-zinc-800/80 bg-transparent';
  }
}

export default function DayCell({ day, onHover, onMove, onLeave }: Props) {
  const baseClasses =
    'relative aspect-square w-full rounded-[2px] transition-colors';

  if (day.state === 'today') {
    return (
      <motion.div
        role="gridcell"
        aria-label={day.label}
        className={`${baseClasses} ${cellBase(day.state)}`}
        animate={{
          opacity: [0.85, 1, 0.85],
          boxShadow: [
            '0 0 0px rgba(245, 158, 11, 0.0)',
            '0 0 18px rgba(245, 158, 11, 0.55)',
            '0 0 0px rgba(245, 158, 11, 0.0)'
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

