'use client';

import { differenceInCalendarDays } from 'date-fns';
import { YearDay } from '@/hooks/useYearProgress';
import { BodyState, Entry } from '@/lib/types';
import { BODY_STATE_TEXT } from '@/lib/constants';

interface DayTooltipProps {
  tooltip: {
    x: number;
    y: number;
    data: YearDay;
  };
  tooltipRef: React.RefObject<HTMLDivElement>;
  todayStart: Date;
  entries: Record<string, Entry>;
}

export function DayTooltip({
  tooltip,
  tooltipRef,
  todayStart,
  entries
}: DayTooltipProps) {
  const entry = entries[tooltip.data.isoDate];
  const state = (entry?.state ?? 0) as BodyState;
  const note = entry?.note.trim();

  return (
    <div
      ref={tooltipRef}
      className="pointer-events-none fixed z-50 w-max max-w-[80vw] rounded-xl border border-zinc-200/70 bg-white/80 px-3 py-2 text-xs text-zinc-900 shadow-[0_14px_40px_rgba(0,0,0,0.10)] backdrop-blur-xl"
      style={{ left: tooltip.x, top: tooltip.y }}
    >
      <div className="tabular-nums text-zinc-950">
        {tooltip.data.label}
      </div>
      <div className="mt-1 text-zinc-600">
        {tooltip.data.state === 'past'
          ? `已过去 ${Math.max(0, differenceInCalendarDays(todayStart, tooltip.data.date))} 天`
          : tooltip.data.state === 'today'
            ? '今天'
            : `还剩 ${Math.max(0, differenceInCalendarDays(tooltip.data.date, todayStart))} 天`}
      </div>
      <div className="mt-1 text-zinc-600">
        体感：{BODY_STATE_TEXT[state]}
      </div>
      {tooltip.data.holiday ? (
        <div className="text-xs font-medium text-zinc-500">
          节日：{tooltip.data.holiday}
        </div>
      ) : null}

      {note ? (
        <div className="text-xs font-medium text-zinc-500">
          备注：{note.slice(0, 24)}
        </div>
      ) : null}
    </div>
  );
}
