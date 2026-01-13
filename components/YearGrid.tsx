'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

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
  const { percent, remaining, days, todayElapsedRatio } = useYearProgress();
  const [tooltip, setTooltip] = useState<TooltipState>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const headerRef = useRef<HTMLElement | null>(null);
  const [columns, setColumns] = useState(32);

  const todayDayOfYear = useMemo(() => {
    const today = days.find((d) => d.state === 'today');
    return today?.dayOfYear ?? 1;
  }, [days]);

  const percentText = useMemo(
    () => `${Math.floor(percent).toString()}%`,
    [percent]
  );

  const remainingText = useMemo(() => {
    const d = remaining.days.toString();
    const h = remaining.hours.toString().padStart(2, '0');
    const m = remaining.minutes.toString().padStart(2, '0');
    const s = remaining.seconds.toString().padStart(2, '0');
    return `剩余：${d}天 ${h}小时 ${m}分 ${s}秒`;
  }, [remaining.days, remaining.hours, remaining.minutes, remaining.seconds]);

  useEffect(() => {
    const root = rootRef.current;
    const header = headerRef.current;
    if (!root || !header) return;

    const update = () => {
      const rootRect = root.getBoundingClientRect();
      const headerRect = header.getBoundingClientRect();
      const availableWidth = Math.max(0, rootRect.width);
      const availableHeight = Math.max(0, rootRect.height - headerRect.height - 20);

      const gap = 4;
      const minCols = 18;
      const maxCols = 48;
      const count = days.length;

      let bestCols = 32;
      let bestCellSize = 0;

      for (let cols = minCols; cols <= maxCols; cols += 1) {
        const cellSize = Math.floor((availableWidth - gap * (cols - 1)) / cols);
        if (cellSize <= 2) continue;
        const rows = Math.ceil(count / cols);
        const gridHeight = rows * cellSize + gap * (rows - 1);
        if (gridHeight <= availableHeight && cellSize > bestCellSize) {
          bestCols = cols;
          bestCellSize = cellSize;
        }
      }

      if (bestCellSize === 0) {
        const fallbackCols = clamp(
          Math.round(availableWidth / 18),
          minCols,
          maxCols
        );
        bestCols = fallbackCols;
      }

      setColumns((prev) => (prev === bestCols ? prev : bestCols));
    };

    update();

    const ro = new ResizeObserver(() => update());
    ro.observe(root);
    ro.observe(header);

    return () => ro.disconnect();
  }, [days.length]);

  return (
    <div ref={rootRef} className="relative flex h-full w-full flex-col">
      <header ref={headerRef} className="mb-6 md:mb-8">
        <div className="flex flex-col items-center text-center">
          <div className="text-[92px] font-semibold leading-none tracking-tight md:text-[132px]">
            <span className="font-mono tabular-nums">{percentText}</span>
          </div>
          <div className="mt-3 text-sm text-zinc-600 md:text-lg">
            <span className="inline-block w-[30ch] font-mono tabular-nums">
              {remainingText}
            </span>
          </div>
        </div>
      </header>

      <div
        role="grid"
        aria-label="本年度每天网格"
        className="grid w-full flex-1"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gap: 4 }}
      >
        {days.map((day) => (
          <DayCell
            key={day.dayOfYear}
            day={day}
            todayElapsedRatio={day.state === 'today' ? todayElapsedRatio : undefined}
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
          className="pointer-events-none fixed z-50 w-max max-w-[80vw] rounded-md border border-zinc-200 bg-white/90 px-3 py-2 text-xs text-zinc-900 shadow-[0_10px_30px_rgba(0,0,0,0.12)] backdrop-blur"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          <div className="font-mono tabular-nums text-zinc-950">
            {tooltip.day.label}
          </div>
          <div className="mt-1 text-zinc-600">
            {tooltip.day.state === 'past'
              ? `已过去 ${Math.max(0, todayDayOfYear - tooltip.day.dayOfYear)} 天`
              : tooltip.day.state === 'today'
                ? '今天'
                : `还剩 ${tooltip.day.daysLeft} 天`}
          </div>
        </div>
      ) : null}
    </div>
  );
}
