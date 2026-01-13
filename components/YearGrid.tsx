'use client';

import { Calendar } from 'lucide-react';
import { useMemo, useState } from 'react';

import DayCell from '@/components/DayCell';
import type { YearDay } from '@/hooks/useYearProgress';
import { useYearProgress } from '@/hooks/useYearProgress';

type TooltipState =
  | {
      day: YearDay;
      x: number;
      y: number;
    }
  | null;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export default function YearGrid() {
  const { percent, remaining, days } = useYearProgress();
  const [tooltip, setTooltip] = useState<TooltipState>(null);

  const percentText = useMemo(
    () => `${Math.floor(percent).toString()}%`,
    [percent]
  );

  const remainingText = useMemo(() => {
    const d = remaining.days.toString();
    const h = remaining.hours.toString().padStart(2, '0');
    const m = remaining.minutes.toString().padStart(2, '0');
    const s = remaining.seconds.toString().padStart(2, '0');
    return `Remaining: ${d}d ${h}h ${m}m ${s}s`;
  }, [remaining.days, remaining.hours, remaining.minutes, remaining.seconds]);

  return (
    <div className="relative w-full">
      <header className="mb-10">
        <div className="flex items-end justify-between gap-6">
          <div>
            <div className="text-[72px] font-semibold leading-none tracking-tight md:text-[96px]">
              <span className="font-mono tabular-nums">{percentText}</span>
            </div>
            <div className="mt-3 text-sm text-zinc-400 md:text-base">
              <span className="font-mono tabular-nums">{remainingText}</span>
            </div>
          </div>

          <div className="hidden items-center gap-2 text-zinc-400 md:flex">
            <Calendar className="h-4 w-4" aria-hidden="true" />
            <span className="text-sm">Year view</span>
          </div>
        </div>
      </header>

      <div
        role="grid"
        aria-label="Days of the year"
        className="grid grid-cols-[repeat(28,minmax(0,1fr))] gap-1 sm:grid-cols-[repeat(32,minmax(0,1fr))] md:grid-cols-[repeat(40,minmax(0,1fr))] md:gap-1.5"
      >
        {days.map((day) => (
          <DayCell
            key={day.dayOfYear}
            day={day}
            onHover={(d, e) => {
              const x = clamp(e.clientX + 12, 12, window.innerWidth - 12);
              const y = clamp(e.clientY + 12, 12, window.innerHeight - 12);
              setTooltip({ day: d, x, y });
            }}
            onMove={(d, e) => {
              setTooltip((prev) => {
                if (!prev || prev.day.dayOfYear !== d.dayOfYear) return prev;
                const x = clamp(e.clientX + 12, 12, window.innerWidth - 12);
                const y = clamp(e.clientY + 12, 12, window.innerHeight - 12);
                return { day: prev.day, x, y };
              });
            }}
            onLeave={() => setTooltip(null)}
          />
        ))}
      </div>

      {tooltip ? (
        <div
          className="pointer-events-none fixed z-50 w-max max-w-[80vw] rounded-md border border-zinc-800 bg-zinc-950/90 px-3 py-2 text-xs text-zinc-200 shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          <div className="font-mono tabular-nums text-zinc-100">
            {tooltip.day.label}
          </div>
          <div className="mt-1 text-zinc-400">
            {tooltip.day.state === 'past'
              ? 'Passed'
              : tooltip.day.state === 'today'
                ? 'Today'
                : `${tooltip.day.daysLeft} days left`}
          </div>
        </div>
      ) : null}
    </div>
  );
}

