'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import DayCell from '@/components/DayCell';
import type { YearDay } from '@/hooks/useYearProgress';
import { useYearProgress } from '@/hooks/useYearProgress';

type MarkKind = 'done' | 'event';

type Mark = {
  kind: MarkKind;
  note: string;
};

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

export default function YearGrid({
  holidays
}: {
  holidays?: Record<string, string>;
}) {
  const { now, percent, remaining, days } = useYearProgress(holidays);
  const [tooltip, setTooltip] = useState<TooltipState>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const headerRef = useRef<HTMLElement | null>(null);
  const [columns, setColumns] = useState(32);
  const [marks, setMarks] = useState<Record<string, Mark>>({});
  const [selectedISODate, setSelectedISODate] = useState<string | null>(null);
  const [highlightWeekends, setHighlightWeekends] = useState(false);
  const [highlightHolidays, setHighlightHolidays] = useState(false);
  const [highlightThisMonth, setHighlightThisMonth] = useState(false);
  const [guideDismissed, setGuideDismissed] = useState(true);

  const todayDayOfYear = useMemo(() => {
    const today = days.find((d) => d.state === 'today');
    return today?.dayOfYear ?? 1;
  }, [days]);

  const currentMonth = useMemo(() => now.getMonth() + 1, [now]);

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
    const raw = localStorage.getItem('yeargrid_marks_v1');
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as unknown;
        if (parsed && typeof parsed === 'object') {
          setMarks(parsed as Record<string, Mark>);
        }
      } catch {}
    }

    setGuideDismissed(localStorage.getItem('yeargrid_guide_dismissed_v1') === '1');
  }, []);

  useEffect(() => {
    localStorage.setItem('yeargrid_marks_v1', JSON.stringify(marks));
  }, [marks]);

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

  const selectedDay = useMemo(() => {
    if (!selectedISODate) return null;
    return days.find((d) => d.isoDate === selectedISODate) ?? null;
  }, [days, selectedISODate]);

  const anyHighlight = highlightWeekends || highlightHolidays || highlightThisMonth;

  const guideVisible = useMemo(() => {
    if (guideDismissed) return false;
    return Object.keys(marks).length === 0;
  }, [guideDismissed, marks]);

  const legendItems = useMemo(
    () => [
      { label: '过去', swatch: 'bg-zinc-200/60 border border-zinc-200/70' },
      { label: '今天', swatch: 'bg-cyan-500' },
      { label: '未来', swatch: 'bg-white/25 border border-zinc-300/70' },
      { label: '节日', swatch: 'bg-amber-200/60 border border-amber-300/70' }
    ],
    []
  );

  return (
    <div ref={rootRef} className="relative flex h-full w-full flex-col">
      <header ref={headerRef} className="mb-6 md:mb-8">
        <div className="flex flex-col items-center text-center">
          <div className="text-[76px] font-semibold leading-none tracking-tight md:text-[112px]">
            <span className="font-mono tabular-nums">{percentText}</span>
          </div>
          <div className="mt-3 text-sm text-zinc-600 md:text-lg">
            <span className="inline-block w-[30ch] font-mono tabular-nums">
              {remainingText}
            </span>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-xs text-zinc-700">
            {legendItems.map((item) => (
              <div key={item.label} className="flex items-center gap-1.5">
                <span className={`h-2.5 w-2.5 rounded-[2px] ${item.swatch}`} />
                <span className="font-mono">{item.label}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs">
            <button
              type="button"
              aria-pressed={highlightWeekends}
              className={`rounded-md border px-2 py-1 font-mono transition ${
                highlightWeekends
                  ? 'border-cyan-600/30 bg-cyan-50 text-cyan-900'
                  : 'border-zinc-200 bg-white/60 text-zinc-700 hover:bg-white'
              }`}
              onClick={() => setHighlightWeekends((v) => !v)}
            >
              仅高亮周末
            </button>
            <button
              type="button"
              aria-pressed={highlightHolidays}
              className={`rounded-md border px-2 py-1 font-mono transition ${
                highlightHolidays
                  ? 'border-cyan-600/30 bg-cyan-50 text-cyan-900'
                  : 'border-zinc-200 bg-white/60 text-zinc-700 hover:bg-white'
              }`}
              onClick={() => setHighlightHolidays((v) => !v)}
            >
              仅高亮节日
            </button>
            <button
              type="button"
              aria-pressed={highlightThisMonth}
              className={`rounded-md border px-2 py-1 font-mono transition ${
                highlightThisMonth
                  ? 'border-cyan-600/30 bg-cyan-50 text-cyan-900'
                  : 'border-zinc-200 bg-white/60 text-zinc-700 hover:bg-white'
              }`}
              onClick={() => setHighlightThisMonth((v) => !v)}
            >
              仅高亮本月
            </button>
          </div>
          {guideVisible ? (
            <div className="mt-4 w-full max-w-[720px] rounded-lg border border-zinc-200 bg-white/70 px-4 py-3 text-left text-xs text-zinc-700 backdrop-blur">
              <div className="font-mono text-zinc-900">
                提示：点击格子可标记“完成/事件/备注”
              </div>
              <div className="mt-1 font-mono">
                鼠标悬停查看详情；用“仅高亮”快速过滤
              </div>
              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  className="rounded-md border border-zinc-200 bg-white px-2 py-1 font-mono text-zinc-700 hover:bg-zinc-50"
                  onClick={() => {
                    localStorage.setItem('yeargrid_guide_dismissed_v1', '1');
                    setGuideDismissed(true);
                  }}
                >
                  知道了
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </header>

      <div
        role="grid"
        aria-label="本年度每天网格"
        className="grid w-full flex-1"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gap: 4 }}
      >
        {days.map((day) => {
          const matchesHighlight =
            !anyHighlight ||
            (highlightWeekends && day.isWeekend) ||
            (highlightHolidays && !!day.holiday) ||
            (highlightThisMonth && day.month === currentMonth);
          const dimmed = anyHighlight && !matchesHighlight;
          const mark = marks[day.isoDate] ?? null;
          const selected = selectedISODate === day.isoDate;

          return (
            <DayCell
              key={day.dayOfYear}
              day={day}
              dimmed={dimmed}
              selected={selected}
              mark={mark}
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
              onClick={(d) => {
                setSelectedISODate(d.isoDate);
                const existing = marks[d.isoDate];
                if (!existing) {
                  setMarks((prev) => ({
                    ...prev,
                    [d.isoDate]: { kind: 'done', note: '' }
                  }));
                  return;
                }

                if (existing.kind === 'done' && existing.note.trim() === '') {
                  setMarks((prev) => {
                    const next = { ...prev };
                    delete next[d.isoDate];
                    return next;
                  });
                }
              }}
            />
          );
        })}
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
          {tooltip.day.holiday ? (
            <div className="mt-1 text-zinc-600">
              节日：{tooltip.day.holiday}
            </div>
          ) : null}
          {marks[tooltip.day.isoDate] ? (
            <div className="mt-1 text-zinc-600">
              标记：
              {marks[tooltip.day.isoDate].kind === 'done' ? '完成' : '事件'}
              {marks[tooltip.day.isoDate].note.trim()
                ? ` · ${marks[tooltip.day.isoDate].note.trim().slice(0, 24)}`
                : ''}
            </div>
          ) : null}
        </div>
      ) : null}

      {selectedDay ? (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/20 p-4 md:items-center">
          <div className="w-full max-w-[520px] rounded-xl border border-zinc-200 bg-white/95 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.18)] backdrop-blur">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-mono text-sm text-zinc-950">
                  {selectedDay.label}
                </div>
                <div className="mt-1 font-mono text-xs text-zinc-600">
                  {selectedDay.holiday ? `节日：${selectedDay.holiday}` : ' '}
                </div>
              </div>
              <button
                type="button"
                className="rounded-md border border-zinc-200 bg-white px-2 py-1 font-mono text-xs text-zinc-700 hover:bg-zinc-50"
                onClick={() => setSelectedISODate(null)}
              >
                关闭
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {(['none', 'done', 'event'] as const).map((kind) => {
                const active =
                  kind === 'none'
                    ? !marks[selectedDay.isoDate]
                    : marks[selectedDay.isoDate]?.kind === kind;
                return (
                  <button
                    key={kind}
                    type="button"
                    className={`rounded-md border px-2 py-1 font-mono text-xs transition ${
                      active
                        ? 'border-cyan-600/30 bg-cyan-50 text-cyan-900'
                        : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
                    }`}
                    onClick={() => {
                      if (kind === 'none') {
                        setMarks((prev) => {
                          const next = { ...prev };
                          delete next[selectedDay.isoDate];
                          return next;
                        });
                        return;
                      }
                      setMarks((prev) => ({
                        ...prev,
                        [selectedDay.isoDate]: {
                          kind,
                          note: prev[selectedDay.isoDate]?.note ?? ''
                        }
                      }));
                    }}
                  >
                    {kind === 'none' ? '无标记' : kind === 'done' ? '完成' : '事件'}
                  </button>
                );
              })}
            </div>

            <div className="mt-4">
              <textarea
                className="w-full resize-none rounded-lg border border-zinc-200 bg-white/80 px-3 py-2 font-mono text-xs text-zinc-900 outline-none transition focus:border-cyan-600/30 focus:ring-2 focus:ring-cyan-500/10"
                rows={4}
                placeholder="备注（可选）"
                value={marks[selectedDay.isoDate]?.note ?? ''}
                onChange={(e) => {
                  const nextNote = e.target.value;
                  setMarks((prev) => {
                    const existing = prev[selectedDay.isoDate];
                    const nextKind = existing?.kind ?? 'event';
                    return {
                      ...prev,
                      [selectedDay.isoDate]: { kind: nextKind, note: nextNote }
                    };
                  });
                }}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
