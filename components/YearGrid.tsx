'use client';

import {
  Check,
  ChevronLeft,
  ChevronRight,
  Filter,
  Plus,
  Settings2,
  X
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  addMonths,
  addWeeks,
  differenceInCalendarDays,
  endOfMonth,
  format,
  isAfter,
  parseISO,
  startOfDay,
  startOfMonth
} from 'date-fns';

import DayCell from '@/components/DayCell';
import type { ViewMode, YearDay } from '@/hooks/useYearProgress';
import { useYearProgress } from '@/hooks/useYearProgress';

type BodyState = 0 | 1 | 2 | 3 | 4 | 5;

type Entry = {
  state: BodyState;
  note: string;
};

type SavedRange = {
  id: string;
  name: string;
  startISO: string;
  endISO: string;
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

function activeStateButtonClass(state: BodyState) {
  switch (state) {
    case 0:
      return 'border-zinc-300 bg-zinc-50 text-zinc-900 shadow-sm';
    case 1:
      return 'border-rose-300 bg-rose-50 text-rose-900 shadow-sm';
    case 2:
      return 'border-amber-300 bg-amber-50 text-amber-900 shadow-sm';
    case 3:
      return 'border-zinc-300 bg-zinc-100 text-zinc-900 shadow-sm';
    case 4:
      return 'border-cyan-300 bg-cyan-50 text-cyan-900 shadow-sm';
    case 5:
      return 'border-emerald-300 bg-emerald-50 text-emerald-900 shadow-sm';
  }
}

export default function YearGrid({
  holidays,
  initialNowISO
}: {
  holidays?: Record<string, string>;
  initialNowISO?: string;
}) {
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [anchorISO, setAnchorISO] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [customStartISO, setCustomStartISO] = useState(() =>
    format(startOfMonth(new Date()), 'yyyy-MM-dd')
  );
  const [customEndISO, setCustomEndISO] = useState(() =>
    format(endOfMonth(new Date()), 'yyyy-MM-dd')
  );
  const [ranges, setRanges] = useState<SavedRange[]>([]);
  const [activeRangeId, setActiveRangeId] = useState<string | null>(null);
  const [rangeDraftStartISO, setRangeDraftStartISO] = useState(() =>
    format(startOfMonth(new Date()), 'yyyy-MM-dd')
  );
  const [rangeDraftEndISO, setRangeDraftEndISO] = useState(() =>
    format(endOfMonth(new Date()), 'yyyy-MM-dd')
  );
  const [rangeDraftName, setRangeDraftName] = useState('');
  const [viewPrefLoaded, setViewPrefLoaded] = useState(false);
  const [rangesLoaded, setRangesLoaded] = useState(false);

  const { now, percent, remaining, days, rangeStart, rangeEnd } = useYearProgress(
    holidays,
    initialNowISO,
    { mode: viewMode, anchorISO, customStartISO, customEndISO }
  );
  const [tooltip, setTooltip] = useState<TooltipState>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const headerRef = useRef<HTMLElement | null>(null);
  const [columns, setColumns] = useState(32);
  const [gridMaxWidth, setGridMaxWidth] = useState<number | undefined>(undefined);
  const [entries, setEntries] = useState<Record<string, Entry>>({});
  const [entriesLoaded, setEntriesLoaded] = useState(false);
  const [selectedISODate, setSelectedISODate] = useState<string | null>(null);
  const [highlightWeekends, setHighlightWeekends] = useState(false);
  const [highlightHolidays, setHighlightHolidays] = useState(false);
  const [highlightThisMonth, setHighlightThisMonth] = useState(false);
  const [guideDismissed, setGuideDismissed] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [isEditingRange, setIsEditingRange] = useState(false);

  const currentMonth = useMemo(() => now.getMonth() + 1, [now]);
  const todayStart = useMemo(() => startOfDay(now), [now]);
  const activeRange = useMemo(() => {
    if (!activeRangeId) return null;
    return ranges.find((r) => r.id === activeRangeId) ?? null;
  }, [activeRangeId, ranges]);

  const rangeDraftValid = useMemo(() => {
    try {
      const start = startOfDay(parseISO(rangeDraftStartISO));
      const end = startOfDay(parseISO(rangeDraftEndISO));
      return !isAfter(start, end);
    } catch {
      return false;
    }
  }, [rangeDraftEndISO, rangeDraftStartISO]);

  const rangeDraftResolvedName = useMemo(() => {
    const trimmed = rangeDraftName.trim();
    if (trimmed) return trimmed;
    return `区间${ranges.length + 1}`;
  }, [rangeDraftName, ranges.length]);

  const applyRangeDraftToActive = () => {
    if (!rangeDraftValid) return;
    setCustomStartISO(rangeDraftStartISO);
    setCustomEndISO(rangeDraftEndISO);
    if (!activeRangeId) return;
    const nextName = rangeDraftName.trim();
    setRanges((prev) =>
      prev.map((r) =>
        r.id === activeRangeId
          ? {
              ...r,
              name: nextName ? nextName : r.name,
              startISO: rangeDraftStartISO,
              endISO: rangeDraftEndISO
            }
          : r
      )
    );
  };

  const addNewRangeFromDraft = () => {
    if (!rangeDraftValid) return;
    const id = `range_${Date.now()}`;
    const next: SavedRange = {
      id,
      name: rangeDraftResolvedName,
      startISO: rangeDraftStartISO,
      endISO: rangeDraftEndISO
    };
    setRanges((prev) => [...prev, next]);
    setActiveRangeId(id);
    setCustomStartISO(next.startISO);
    setCustomEndISO(next.endISO);
    setRangeDraftName('');
  };

  const percentText = useMemo(
    () => `${Math.floor(percent).toString()}%`,
    [percent]
  );

  const stateMeta = useMemo(() => {
    const map: Record<BodyState, { label: string; emoji: string; dotClass: string }> =
      {
        0: { label: '未记录', emoji: '◻︎', dotClass: 'bg-zinc-300' },
        1: { label: '很差', emoji: '😣', dotClass: 'bg-rose-400' },
        2: { label: '偏差', emoji: '😕', dotClass: 'bg-amber-400' },
        3: { label: '一般', emoji: '😐', dotClass: 'bg-zinc-400' },
        4: { label: '不错', emoji: '🙂', dotClass: 'bg-cyan-400' },
        5: { label: '很好', emoji: '😄', dotClass: 'bg-emerald-400' }
      };
    return map;
  }, []);

  const stateText = useMemo(() => {
    const map: Record<BodyState, string> = {
      0: `${stateMeta[0].emoji} ${stateMeta[0].label}`,
      1: `${stateMeta[1].emoji} ${stateMeta[1].label}`,
      2: `${stateMeta[2].emoji} ${stateMeta[2].label}`,
      3: `${stateMeta[3].emoji} ${stateMeta[3].label}`,
      4: `${stateMeta[4].emoji} ${stateMeta[4].label}`,
      5: `${stateMeta[5].emoji} ${stateMeta[5].label}`
    };
    return map;
  }, [stateMeta]);

  useEffect(() => {
    let initialEntries: Record<string, Entry> | null = null;
    const rawEntries = localStorage.getItem('yeargrid_entries_v1');
    if (rawEntries) {
      try {
        const parsed = JSON.parse(rawEntries) as unknown;
        if (parsed && typeof parsed === 'object') {
          initialEntries = parsed as Record<string, Entry>;
        }
      } catch {}
    }

    if (!initialEntries) {
      const rawMarks = localStorage.getItem('yeargrid_marks_v1');
      if (rawMarks) {
        try {
          const parsed = JSON.parse(rawMarks) as unknown;
          if (parsed && typeof parsed === 'object') {
            const next: Record<string, Entry> = {};
            for (const [isoDate, value] of Object.entries(parsed as Record<string, unknown>)) {
              if (!value || typeof value !== 'object') continue;
              const kind = (value as { kind?: unknown }).kind;
              const note = typeof (value as { note?: unknown }).note === 'string' ? (value as { note: string }).note : '';
              const state: BodyState = kind === 'done' ? 4 : kind === 'event' ? 3 : 0;
              if (state !== 0 || note.trim() !== '') next[isoDate] = { state, note: note.slice(0, 50) };
            }
            initialEntries = next;
            localStorage.setItem('yeargrid_entries_v1', JSON.stringify(next));
            localStorage.removeItem('yeargrid_marks_v1');
          }
        } catch {}
      }
    }

    if (initialEntries) setEntries(initialEntries);
    setEntriesLoaded(true);
    setGuideDismissed(localStorage.getItem('yeargrid_guide_dismissed_v1') === '1');
  }, []);

  useEffect(() => {
    if (!entriesLoaded) return;
    localStorage.setItem('yeargrid_entries_v1', JSON.stringify(entries));
  }, [entries, entriesLoaded]);

  useEffect(() => {
    const today = new Date();
    const defaultStartISO = format(startOfMonth(today), 'yyyy-MM-dd');
    const defaultEndISO = format(endOfMonth(today), 'yyyy-MM-dd');
    const defaultRange: SavedRange = {
      id: `range_${today.getTime()}`,
      name: '区间1',
      startISO: defaultStartISO,
      endISO: defaultEndISO
    };

    let loadedRanges: SavedRange[] = [defaultRange];
    const rawRanges = localStorage.getItem('yeargrid_ranges_v1');
    if (rawRanges) {
      try {
        const parsed = JSON.parse(rawRanges) as unknown;
        if (Array.isArray(parsed)) {
          const cleaned: SavedRange[] = [];
          for (const item of parsed) {
            if (!item || typeof item !== 'object') continue;
            const id = (item as { id?: unknown }).id;
            const name = (item as { name?: unknown }).name;
            const startISO = (item as { startISO?: unknown }).startISO;
            const endISO = (item as { endISO?: unknown }).endISO;
            if (
              typeof id === 'string' &&
              typeof name === 'string' &&
              typeof startISO === 'string' &&
              typeof endISO === 'string'
            ) {
              cleaned.push({ id, name, startISO, endISO });
            }
          }
          if (cleaned.length > 0) loadedRanges = cleaned;
        }
      } catch {}
    }

    setRanges(loadedRanges);
    setActiveRangeId(loadedRanges[0]?.id ?? null);
    if (loadedRanges[0]) {
      setCustomStartISO(loadedRanges[0].startISO);
      setCustomEndISO(loadedRanges[0].endISO);
      setRangeDraftStartISO(loadedRanges[0].startISO);
      setRangeDraftEndISO(loadedRanges[0].endISO);
    }

    const rawPref = localStorage.getItem('yeargrid_view_pref_v1');
    if (rawPref) {
      try {
        const parsed = JSON.parse(rawPref) as unknown;
        if (parsed && typeof parsed === 'object') {
          const mode = (parsed as { mode?: unknown }).mode;
          const anchorISO = (parsed as { anchorISO?: unknown }).anchorISO;
          const customStartISO = (parsed as { customStartISO?: unknown }).customStartISO;
          const customEndISO = (parsed as { customEndISO?: unknown }).customEndISO;
          const activeRangeId = (parsed as { activeRangeId?: unknown }).activeRangeId;

          if (mode === 'year' || mode === 'month' || mode === 'week' || mode === 'range') {
            setViewMode(mode);
          }
          if (typeof anchorISO === 'string') setAnchorISO(anchorISO);

          if (typeof activeRangeId === 'string') {
            const found = loadedRanges.find((r) => r.id === activeRangeId) ?? null;
            if (found) {
              setActiveRangeId(found.id);
              setCustomStartISO(found.startISO);
              setCustomEndISO(found.endISO);
            }
          } else if (typeof customStartISO === 'string' && typeof customEndISO === 'string') {
            setCustomStartISO(customStartISO);
            setCustomEndISO(customEndISO);
            setRangeDraftStartISO(customStartISO);
            setRangeDraftEndISO(customEndISO);
            if (mode === 'range') {
              const id = `range_${Date.now()}`;
              const nextName = `区间${loadedRanges.length + 1}`;
              const next: SavedRange = { id, name: nextName, startISO: customStartISO, endISO: customEndISO };
              loadedRanges = [...loadedRanges, next];
              setRanges(loadedRanges);
              setActiveRangeId(id);
            }
          }
        }
      } catch {}
    }

    setRangesLoaded(true);
    setViewPrefLoaded(true);
  }, []);

  useEffect(() => {
    if (!rangesLoaded) return;
    localStorage.setItem('yeargrid_ranges_v1', JSON.stringify(ranges));
  }, [ranges, rangesLoaded]);

  useEffect(() => {
    if (!viewPrefLoaded) return;
    localStorage.setItem(
      'yeargrid_view_pref_v1',
      JSON.stringify({
        mode: viewMode,
        anchorISO,
        customStartISO,
        customEndISO,
        activeRangeId
      })
    );
  }, [activeRangeId, anchorISO, customEndISO, customStartISO, viewMode, viewPrefLoaded]);

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
      const minCols = viewMode === 'year' ? 18 : 12;
      const maxCols = 48;
      const count = days.length;

      let bestCols = clamp(32, minCols, maxCols);
      let bestCellSize = 0;

      // Fixed layout for Month and Week views
      if (viewMode === 'month' || viewMode === 'week') {
        bestCols = 7;
        const idealCellSize = 52;
        const neededWidth = bestCols * idealCellSize + (bestCols - 1) * gap;
        setColumns(7);
        setGridMaxWidth(neededWidth);
        return;
      }

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
        bestCellSize = Math.floor((availableWidth - gap * (bestCols - 1)) / bestCols);
      }

      setColumns((prev) => (prev === bestCols ? prev : bestCols));

      // For Range view (or Year view fallback), constrain max cell size to keep it looking good
      if (viewMode === 'range') {
        const idealMaxCellSize = 52;
        if (bestCellSize > idealMaxCellSize) {
          const constrainedWidth = bestCols * idealMaxCellSize + (bestCols - 1) * gap;
          setGridMaxWidth(constrainedWidth);
        } else {
          setGridMaxWidth(undefined);
        }
      } else {
        setGridMaxWidth(undefined);
      }
    };

    update();

    const ro = new ResizeObserver(() => update());
    ro.observe(root);
    ro.observe(header);

    return () => ro.disconnect();
  }, [days.length, viewMode]);

  const selectedDay = useMemo(() => {
    if (!selectedISODate) return null;
    return days.find((d) => d.isoDate === selectedISODate) ?? null;
  }, [days, selectedISODate]);

  const selectedEntry = useMemo(() => {
    if (!selectedDay) return null;
    return entries[selectedDay.isoDate] ?? null;
  }, [entries, selectedDay]);

  const effectiveHighlightThisMonth = viewMode === 'year' && highlightThisMonth;
  const anyHighlight = highlightWeekends || highlightHolidays || effectiveHighlightThisMonth;

  const guideVisible = useMemo(() => {
    if (guideDismissed) return false;
    return Object.keys(entries).length === 0;
  }, [guideDismissed, entries]);

  const legendItems = useMemo(
    () => [
      { label: `${stateMeta[1].emoji} ${stateMeta[1].label}`, dotClass: stateMeta[1].dotClass },
      { label: `${stateMeta[2].emoji} ${stateMeta[2].label}`, dotClass: stateMeta[2].dotClass },
      { label: `${stateMeta[3].emoji} ${stateMeta[3].label}`, dotClass: stateMeta[3].dotClass },
      { label: `${stateMeta[4].emoji} ${stateMeta[4].label}`, dotClass: stateMeta[4].dotClass },
      { label: `${stateMeta[5].emoji} ${stateMeta[5].label}`, dotClass: stateMeta[5].dotClass },
      { label: '今天', dotClass: 'bg-cyan-500' }
    ],
    [stateMeta]
  );

  return (
    <div ref={rootRef} className="relative flex h-full w-full flex-col bg-zinc-50/30">
      <header
        ref={headerRef}
        className="sticky top-0 z-20 mb-4 border-b border-zinc-200/60 bg-white/80 px-4 py-3 backdrop-blur-md md:mb-6"
      >
        {/* Top Bar: Remaining | View Switcher | Percent */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex w-24 flex-col items-start gap-0.5 md:w-32">
            <span className="text-[10px] font-medium text-zinc-400 md:text-xs">
              剩余时间
            </span>
            <div className="flex items-center gap-1 font-mono text-xs text-zinc-700 md:text-sm">
              <span className="tabular-nums">
                {remaining.days}d {remaining.hours}h
              </span>
            </div>
          </div>

          <div className="flex items-center rounded-lg bg-zinc-100/80 p-1 shadow-inner">
            {(['year', 'month', 'week', 'range'] as const).map((m) => (
              <button
                key={m}
                type="button"
                className={`rounded-md px-3 py-1 text-xs font-medium transition-all ${
                  viewMode === m
                    ? 'bg-white text-zinc-900 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-700'
                }`}
                onClick={() => {
                  setTooltip(null);
                  setSelectedISODate(null);
                  setViewMode(m);
                  if (m === 'month' || m === 'week' || m === 'year') {
                    setAnchorISO(format(now, 'yyyy-MM-dd'));
                  }
                  if (m === 'range') {
                    const startISO = activeRange?.startISO ?? customStartISO;
                    const endISO = activeRange?.endISO ?? customEndISO;
                    setRangeDraftStartISO(startISO);
                    setRangeDraftEndISO(endISO);
                    setRangeDraftName(activeRange?.name ?? '');
                    setIsEditingRange(false);
                  }
                  if (m !== 'year') setHighlightThisMonth(false);
                }}
              >
                {m === 'year' ? '年' : m === 'month' ? '月' : m === 'week' ? '周' : '区间'}
              </button>
            ))}
          </div>

          <div className="flex w-24 items-center justify-end gap-3 md:w-32">
            <div className="text-xl font-bold tracking-tight text-zinc-900 md:text-2xl">
              {percentText}
            </div>
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`rounded-full p-1.5 transition ${
                showFilters
                  ? 'bg-zinc-200 text-zinc-900'
                  : 'text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600'
              }`}
            >
              <Filter className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Sub-Control Bar: Navigation & Context */}
        <div className="mt-3 flex items-center justify-center gap-4">
          {viewMode === 'year' && (
            <div className="flex h-8 items-center text-sm font-medium text-zinc-900">
              {format(rangeStart, 'yyyy年')}
            </div>
          )}

          {(viewMode === 'month' || viewMode === 'week') && (
            <div className="flex items-center gap-3 rounded-full bg-zinc-100/50 px-1 py-0.5">
              <button
                type="button"
                className="rounded-full p-1 text-zinc-500 hover:bg-white hover:text-zinc-900 hover:shadow-sm"
                onClick={() => {
                  const next =
                    viewMode === 'month'
                      ? addMonths(parseISO(anchorISO), -1)
                      : addWeeks(parseISO(anchorISO), -1);
                  setAnchorISO(format(next, 'yyyy-MM-dd'));
                }}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="min-w-[80px] text-center text-xs font-medium tabular-nums text-zinc-900">
                {viewMode === 'month'
                  ? format(rangeStart, 'yyyy年MM月')
                  : `${format(rangeStart, 'MM.dd')} - ${format(rangeEnd, 'MM.dd')}`}
              </span>
              <button
                type="button"
                className="rounded-full p-1 text-zinc-500 hover:bg-white hover:text-zinc-900 hover:shadow-sm"
                onClick={() => {
                  const next =
                    viewMode === 'month'
                      ? addMonths(parseISO(anchorISO), 1)
                      : addWeeks(parseISO(anchorISO), 1);
                  setAnchorISO(format(next, 'yyyy-MM-dd'));
                }}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <div className="mx-1 h-3 w-px bg-zinc-300/50" />
              <button
                type="button"
                className="mr-1 rounded-full px-2 py-0.5 text-[10px] font-medium text-zinc-500 hover:bg-white hover:text-zinc-900 hover:shadow-sm"
                onClick={() => setAnchorISO(format(now, 'yyyy-MM-dd'))}
              >
                回到当前
              </button>
            </div>
          )}

          {viewMode === 'range' && (
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-2">
                <div className="scrollbar-hide flex max-w-[240px] items-center gap-1.5 overflow-x-auto px-1 md:max-w-[400px]">
                  {ranges.map((r) => {
                    const active = r.id === activeRangeId;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => {
                          setActiveRangeId(r.id);
                          setCustomStartISO(r.startISO);
                          setCustomEndISO(r.endISO);
                          setRangeDraftStartISO(r.startISO);
                          setRangeDraftEndISO(r.endISO);
                          setRangeDraftName(r.name);
                          setIsEditingRange(false);
                        }}
                        className={`whitespace-nowrap rounded-md px-2.5 py-1 text-xs transition-all ${
                          active
                            ? 'bg-zinc-800 font-medium text-zinc-50 shadow-sm'
                            : 'bg-white text-zinc-600 ring-1 ring-zinc-200 hover:bg-zinc-50 hover:text-zinc-900'
                        }`}
                      >
                        {r.name}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={addNewRangeFromDraft}
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-700"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="h-4 w-px bg-zinc-200" />

                <button
                  type="button"
                  onClick={() => setIsEditingRange(!isEditingRange)}
                  className={`rounded-full p-1.5 transition ${
                    isEditingRange
                      ? 'bg-zinc-200 text-zinc-900'
                      : 'text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600'
                  }`}
                >
                  <Settings2 className="h-3.5 w-3.5" />
                </button>
              </div>

              {isEditingRange && (
                <div className="absolute top-full z-30 mt-1 flex animate-in fade-in slide-in-from-top-2 items-center gap-2 rounded-xl border border-zinc-200/60 bg-white/90 p-2 shadow-lg backdrop-blur-xl">
                  <input
                    type="text"
                    className="w-[10ch] rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs text-zinc-900 outline-none focus:border-zinc-300"
                    placeholder="名称"
                    value={rangeDraftName}
                    onChange={(e) => setRangeDraftName(e.target.value)}
                  />
                  <div className="h-4 w-px bg-zinc-200" />
                  <input
                    type="date"
                    className="rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs text-zinc-900 outline-none focus:border-zinc-300"
                    value={rangeDraftStartISO}
                    onChange={(e) => setRangeDraftStartISO(e.target.value)}
                  />
                  <span className="text-zinc-300">-</span>
                  <input
                    type="date"
                    className="rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs text-zinc-900 outline-none focus:border-zinc-300"
                    value={rangeDraftEndISO}
                    onChange={(e) => setRangeDraftEndISO(e.target.value)}
                  />
                  <button
                    type="button"
                    disabled={!rangeDraftValid || !activeRangeId}
                    className="ml-1 flex h-6 w-6 items-center justify-center rounded-full bg-zinc-900 text-white shadow-sm hover:bg-zinc-700 disabled:bg-zinc-200"
                    onClick={() => {
                      applyRangeDraftToActive();
                      setIsEditingRange(false);
                    }}
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Collapsible Filters & Legend */}
        {showFilters && (
          <div className="mt-4 animate-in fade-in slide-in-from-top-2 border-t border-zinc-100 pt-4">
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
              {/* Filters */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">
                  过滤
                </span>
                <button
                  type="button"
                  aria-pressed={highlightWeekends}
                  className={`rounded-full border px-2.5 py-0.5 text-[10px] transition ${
                    highlightWeekends
                      ? 'border-zinc-300 bg-zinc-100 text-zinc-900'
                      : 'border-zinc-200 bg-white text-zinc-500 hover:bg-zinc-50'
                  }`}
                  onClick={() => setHighlightWeekends((v) => !v)}
                >
                  周末
                </button>
                <button
                  type="button"
                  aria-pressed={highlightHolidays}
                  className={`rounded-full border px-2.5 py-0.5 text-[10px] transition ${
                    highlightHolidays
                      ? 'border-zinc-300 bg-zinc-100 text-zinc-900'
                      : 'border-zinc-200 bg-white text-zinc-500 hover:bg-zinc-50'
                  }`}
                  onClick={() => setHighlightHolidays((v) => !v)}
                >
                  节日
                </button>
                {viewMode === 'year' && (
                  <button
                    type="button"
                    aria-pressed={highlightThisMonth}
                    className={`rounded-full border px-2.5 py-0.5 text-[10px] transition ${
                      highlightThisMonth
                        ? 'border-zinc-300 bg-zinc-100 text-zinc-900'
                        : 'border-zinc-200 bg-white text-zinc-500 hover:bg-zinc-50'
                    }`}
                    onClick={() => setHighlightThisMonth((v) => !v)}
                  >
                    本月
                  </button>
                )}
              </div>

              <div className="h-4 w-px bg-zinc-200" />

              {/* Legend */}
              <div className="flex items-center gap-3">
                {legendItems.map((item) => (
                  <div key={item.label} className="flex items-center gap-1.5">
                    <span className={`h-1.5 w-1.5 rounded-full ${item.dotClass}`} />
                    <span className="text-[10px] text-zinc-500">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {guideVisible && (
          <div className="absolute left-1/2 top-full z-40 mt-2 w-full max-w-[320px] -translate-x-1/2 rounded-xl border border-zinc-200 bg-white p-3 shadow-xl md:max-w-[400px]">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs font-medium text-zinc-900">
                  点击格子记录体感（1–5）
                </div>
                <div className="mt-1 text-[10px] text-zinc-500">
                  支持添加备注，或使用过滤功能快速查看特定日期
                </div>
              </div>
              <button
                type="button"
                className="text-zinc-400 hover:text-zinc-600"
                onClick={() => {
                  localStorage.setItem('yeargrid_guide_dismissed_v1', '1');
                  setGuideDismissed(true);
                }}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </header>

      <div className="flex w-full flex-1 justify-center overflow-y-auto px-4 pb-4">
        <div
          role="grid"
          aria-label={
            viewMode === 'year'
              ? '本年度每天网格'
              : viewMode === 'month'
              ? '本月每天网格'
              : viewMode === 'week'
              ? '本周每天网格'
              : '区间每天网格'
          }
          className="grid w-full h-fit"
          style={{
            gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
            gap: 4,
            maxWidth: gridMaxWidth ? `${gridMaxWidth}px` : '100%'
          }}
        >
          {days.map((day) => {
          const matchesHighlight =
            !anyHighlight ||
            (highlightWeekends && day.isWeekend) ||
            (highlightHolidays && !!day.holiday) ||
            (effectiveHighlightThisMonth && day.month === currentMonth);
          const dimmed = anyHighlight && !matchesHighlight;
          const entry = entries[day.isoDate] ?? null;
          const selected = selectedISODate === day.isoDate;

          return (
            <DayCell
              key={day.isoDate}
              day={day}
              dimmed={dimmed}
              selected={selected}
              entry={entry}
              onHover={(d, e) => {
                const x = clamp(e.clientX + 12, 12, window.innerWidth - 12);
                const y = clamp(e.clientY + 12, 12, window.innerHeight - 12);
                setTooltip({ day: d, x, y });
              }}
              onMove={(d, e) => {
                setTooltip((prev) => {
                  if (!prev || prev.day.isoDate !== d.isoDate) return prev;
                  const x = clamp(e.clientX + 12, 12, window.innerWidth - 12);
                  const y = clamp(e.clientY + 12, 12, window.innerHeight - 12);
                  return { day: prev.day, x, y };
                });
              }}
              onLeave={() => setTooltip(null)}
              onClick={(d) => {
                setSelectedISODate(d.isoDate);
              }}
            />
          );
        })}
      </div>
    </div>

      {tooltip ? (
        <div
          className="pointer-events-none fixed z-50 w-max max-w-[80vw] rounded-xl border border-zinc-200/70 bg-white/80 px-3 py-2 text-xs text-zinc-900 shadow-[0_14px_40px_rgba(0,0,0,0.10)] backdrop-blur-xl"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          <div className="tabular-nums text-zinc-950">
            {tooltip.day.label}
          </div>
          <div className="mt-1 text-zinc-600">
            {tooltip.day.state === 'past'
              ? `已过去 ${Math.max(0, differenceInCalendarDays(todayStart, tooltip.day.date))} 天`
              : tooltip.day.state === 'today'
                ? '今天'
                : `还剩 ${Math.max(0, differenceInCalendarDays(tooltip.day.date, todayStart))} 天`}
          </div>
          <div className="mt-1 text-zinc-600">
            体感：{stateText[(entries[tooltip.day.isoDate]?.state ?? 0) as BodyState]}
          </div>
          {tooltip.day.holiday ? (
            <div className="mt-1 text-zinc-600">
              节日：{tooltip.day.holiday}
            </div>
          ) : null}
          {entries[tooltip.day.isoDate]?.note.trim() ? (
            <div className="mt-1 text-zinc-600">
              备注：{entries[tooltip.day.isoDate].note.trim().slice(0, 24)}
            </div>
          ) : null}
        </div>
      ) : null}

      {selectedDay ? (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/20 p-4 md:items-center">
          <div className="w-full max-w-[520px] rounded-2xl border border-zinc-200/70 bg-white/90 p-4 shadow-[0_22px_70px_rgba(0,0,0,0.14)] backdrop-blur-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm text-zinc-950">
                  {selectedDay.label}
                </div>
                <div className="mt-1 text-xs text-zinc-600">
                  {selectedDay.holiday ? `节日：${selectedDay.holiday}` : ' '}
                </div>
                <div className="mt-1 text-xs text-zinc-600">
                  体感：{stateText[(selectedEntry?.state ?? 0) as BodyState]}
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {(
                [
                  { state: 0 as const, label: `${stateMeta[0].emoji} ${stateMeta[0].label}` },
                  { state: 1 as const, label: `${stateMeta[1].emoji} ${stateMeta[1].label}` },
                  { state: 2 as const, label: `${stateMeta[2].emoji} ${stateMeta[2].label}` },
                  { state: 3 as const, label: `${stateMeta[3].emoji} ${stateMeta[3].label}` },
                  { state: 4 as const, label: `${stateMeta[4].emoji} ${stateMeta[4].label}` },
                  { state: 5 as const, label: `${stateMeta[5].emoji} ${stateMeta[5].label}` }
                ] as const
              ).map((item) => {
                const active = (selectedEntry?.state ?? 0) === item.state;
                return (
                  <button
                    key={item.state}
                    type="button"
                    className={`rounded-full border px-3 py-1 text-xs transition ${
                      active
                        ? activeStateButtonClass(item.state)
                        : 'border-zinc-200 bg-white/60 text-zinc-700 hover:bg-white'
                    }`}
                    onClick={() => {
                      setEntries((prev) => {
                        const existing = prev[selectedDay.isoDate];
                        const note = (existing?.note ?? '').slice(0, 50);
                        if (item.state === 0 && note.trim() === '') {
                          const next = { ...prev };
                          delete next[selectedDay.isoDate];
                          return next;
                        }
                        return {
                          ...prev,
                          [selectedDay.isoDate]: { state: item.state, note }
                        };
                      });
                    }}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>

            <div className="mt-4">
              <textarea
                className="w-full resize-none rounded-xl border border-zinc-200 bg-white/75 px-3 py-2 text-xs text-zinc-900 outline-none transition focus:border-zinc-300 focus:ring-2 focus:ring-zinc-200/60"
                rows={4}
                placeholder="备注（可选）"
                maxLength={50}
                value={selectedEntry?.note ?? ''}
                onChange={(e) => {
                  const nextNote = e.target.value.slice(0, 50);
                  setEntries((prev) => {
                    const existing = prev[selectedDay.isoDate];
                    const nextState = (existing?.state ?? 3) as BodyState;
                    if (nextState === 0 && nextNote.trim() === '') {
                      const next = { ...prev };
                      delete next[selectedDay.isoDate];
                      return next;
                    }
                    return {
                      ...prev,
                      [selectedDay.isoDate]: { state: nextState, note: nextNote }
                    };
                  });
                }}
              />
              <div className="mt-3 flex items-center justify-between gap-3">
                <div className="text-left mt-[-30px] text-[11px] text-zinc-500 tabular-nums">
                  {(selectedEntry?.note ?? '').length}/50
                </div>
                <button
                  type="button"
                  className="rounded-full border border-zinc-200 bg-white/70 px-3 py-1 text-xs text-zinc-700 hover:bg-white"
                  onClick={() => setSelectedISODate(null)}
                >
                  确认
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
