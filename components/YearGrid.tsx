'use client';

import {
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  MousePointer2,
  Plus,
  Settings2,
  Trash2,
  Upload,
  X
} from 'lucide-react';
import type { FocusEvent, KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  addDays,
  addMonths,
  addWeeks,
  differenceInCalendarDays,
  differenceInSeconds,
  endOfDay,
  endOfMonth,
  format,
  isAfter,
  isBefore,
  parseISO,
  startOfDay,
  startOfMonth
} from 'date-fns';

import DayCell from '@/components/DayCell';
import { Legend } from '@/components/legend';
import { RangeProgressHeader } from '@/components/RangeProgressHeader';
import { RangeSelector, SavedRange, ThemeColor } from '@/components/RangeSelector';
import type { ViewMode, YearDay } from '@/hooks/useYearProgress';
import { useYearProgress } from '@/hooks/useYearProgress';

type BodyState = 0 | 1 | 2 | 3 | 4 | 5;

type Entry = {
  state: BodyState;
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

function makeUniqueRangeName(desired: string, ranges: SavedRange[]) {
  const base = desired.trim() || '区间';
  const taken = new Set(ranges.map((r) => r.name.trim()));
  if (!taken.has(base)) return base;
  let i = 2;
  while (taken.has(`${base}-${i}`)) i += 1;
  return `${base}-${i}`;
}

function safeParseJSON(raw: string | null): unknown | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

function isBodyState(value: unknown): value is BodyState {
  return value === 0 || value === 1 || value === 2 || value === 3 || value === 4 || value === 5;
}

function isThemeColor(value: unknown): value is ThemeColor {
  return (
    value === 'emerald' ||
    value === 'blue' ||
    value === 'rose' ||
    value === 'amber' ||
    value === 'violet' ||
    value === 'cyan'
  );
}

function isISODateKey(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  try {
    return format(parseISO(value), 'yyyy-MM-dd') === value;
  } catch {
    return false;
  }
}

function normalizeEntries(value: unknown) {
  if (!value || typeof value !== 'object') return null;
  const next: Record<string, Entry> = {};
  for (const [isoDate, entry] of Object.entries(value as Record<string, unknown>)) {
    if (!isISODateKey(isoDate)) continue;
    if (!entry || typeof entry !== 'object') continue;
    const state = (entry as { state?: unknown }).state;
    const note = (entry as { note?: unknown }).note;
    if (!isBodyState(state)) continue;
    const safeNote = typeof note === 'string' ? note.slice(0, 50) : '';
    if (state === 0 && safeNote.trim() === '') continue;
    next[isoDate] = { state, note: safeNote };
  }
  return next;
}

function normalizeRanges(value: unknown) {
  if (!Array.isArray(value)) return null;
  const cleaned: SavedRange[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const id = (item as { id?: unknown }).id;
    const name = (item as { name?: unknown }).name;
    const startISO = (item as { startISO?: unknown }).startISO;
    const endISO = (item as { endISO?: unknown }).endISO;
    const color = (item as { color?: unknown }).color;
    const entries = (item as { entries?: unknown }).entries;
    if (typeof id !== 'string' || typeof startISO !== 'string' || typeof endISO !== 'string') continue;
    const safeName = typeof name === 'string' ? name.trim() : '';
    try {
      const start = startOfDay(parseISO(startISO));
      const end = startOfDay(parseISO(endISO));
      if (isAfter(start, end)) continue;
    } catch {
      continue;
    }
    const safeColor = isThemeColor(color) ? color : undefined;
    const normalizedEntries = normalizeEntries(entries) ?? undefined;
    cleaned.push({
      id,
      name: safeName || '区间',
      startISO,
      endISO,
      ...(safeColor ? { color: safeColor } : {}),
      ...(normalizedEntries ? { entries: normalizedEntries } : {})
    });
  }
  if (cleaned.length === 0) return [];
  const usedIds = new Set<string>();
  const usedNames = new Set<string>();
  const result: SavedRange[] = [];
  for (const r of cleaned) {
    const baseId = r.id.trim() || `range_${Date.now()}`;
    let nextId = baseId;
    while (usedIds.has(nextId)) nextId = `${baseId}_${Math.floor(Math.random() * 100000)}`;
    usedIds.add(nextId);
    const baseName = r.name.trim() || '区间';
    let nextName = baseName;
    if (usedNames.has(nextName)) {
      let i = 2;
      while (usedNames.has(`${baseName}-${i}`)) i += 1;
      nextName = `${baseName}-${i}`;
    }
    usedNames.add(nextName);
    result.push({ ...r, id: nextId, name: nextName });
  }
  return result;
}

function normalizeViewPref(value: unknown) {
  if (!value || typeof value !== 'object') return null;
  const mode = (value as { mode?: unknown }).mode;
  const anchorISO = (value as { anchorISO?: unknown }).anchorISO;
  const customStartISO = (value as { customStartISO?: unknown }).customStartISO;
  const customEndISO = (value as { customEndISO?: unknown }).customEndISO;
  const activeRangeId = (value as { activeRangeId?: unknown }).activeRangeId;
  const safeMode: ViewMode | null =
    mode === 'year' || mode === 'month' || mode === 'week' || mode === 'range' ? mode : null;
  const normalized = {
    mode: safeMode,
    anchorISO: typeof anchorISO === 'string' ? anchorISO : null,
    customStartISO: typeof customStartISO === 'string' ? customStartISO : null,
    customEndISO: typeof customEndISO === 'string' ? customEndISO : null,
    activeRangeId: typeof activeRangeId === 'string' ? activeRangeId : null
  };
  if (
    !normalized.mode &&
    !normalized.anchorISO &&
    !normalized.customStartISO &&
    !normalized.customEndISO &&
    !normalized.activeRangeId
  ) {
    return null;
  }
  return normalized;
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
  const [rangeDraftStartISO, setRangeDraftStartISO] = useState('');
  const [rangeDraftEndISO, setRangeDraftEndISO] = useState('');
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
  const gridRef = useRef<HTMLDivElement | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);
  const [columns, setColumns] = useState(32);
  const [gridMaxWidth, setGridMaxWidth] = useState<number | undefined>(undefined);
  const [entries, setEntries] = useState<Record<string, Entry>>({});
  const [entriesLoaded, setEntriesLoaded] = useState(false);
  const [selectedISODate, setSelectedISODate] = useState<string | null>(null);
  const [focusedISODate, setFocusedISODate] = useState<string | null>(null);
  const [highlightWeekends, setHighlightWeekends] = useState(false);
  const [highlightHolidays, setHighlightHolidays] = useState(false);
  const [highlightThisMonth, setHighlightThisMonth] = useState(false);
  const [recordFilter, setRecordFilter] = useState<'all' | 'recorded' | 'unrecorded'>('all');
  const [noteOnly, setNoteOnly] = useState(false);
  const [stateFilters, setStateFilters] = useState<BodyState[]>([]);
  const [noteQuery, setNoteQuery] = useState('');
  const [guideDismissed, setGuideDismissed] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [isEditingRange, setIsEditingRange] = useState(false);
  const [rangeDraftColor, setRangeDraftColor] = useState<ThemeColor>('emerald');
  const [rangeDraftSaving, setRangeDraftSaving] = useState(false);
  const [dragStartISO, setDragStartISO] = useState<string | null>(null);
  const [dragCurrentISO, setDragCurrentISO] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [storageStatus, setStorageStatus] = useState<string | null>(null);
  const [ioStatus, setIOStatus] = useState<{ kind: 'ok' | 'error'; message: string } | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const tooltipSizeRef = useRef<{ w: number; h: number } | null>(null);
  const tooltipStateRef = useRef<TooltipState>(null);
  const columnsRef = useRef<number>(columns);
  const prevActiveRangeIdRef = useRef<string | null>(null);
  const createOriginActiveRangeIdRef = useRef<string | null>(null);
  const createOriginCustomStartISORef = useRef<string | null>(null);
  const createOriginCustomEndISORef = useRef<string | null>(null);

  const nowYear = now.getFullYear();
  const nowMonthIndex = now.getMonth();
  const nowDate = now.getDate();
  const tooltipKey = tooltip?.day.isoDate ?? null;

  useEffect(() => {
    columnsRef.current = columns;
  }, [columns]);

  useEffect(() => {
    tooltipStateRef.current = tooltip;
  }, [tooltip]);

  const currentMonth = useMemo(() => nowMonthIndex + 1, [nowMonthIndex]);
  const todayStart = useMemo(
    () => startOfDay(new Date(nowYear, nowMonthIndex, nowDate)),
    [nowYear, nowMonthIndex, nowDate]
  );
  const activeRange = useMemo(() => {
    if (!activeRangeId) return null;
    return ranges.find((r) => r.id === activeRangeId) ?? null;
  }, [activeRangeId, ranges]);

  const isRangeEditing = viewMode === 'range' && isEditingRange;

  const isCreatingRange = isRangeEditing && activeRangeId === null;

  const createRangePreview = useMemo(() => {
    if (!isCreatingRange) return null;

    const bounds = (() => {
      if (isDragging && dragStartISO && dragCurrentISO && dragStartISO !== dragCurrentISO) {
        const s = dragStartISO < dragCurrentISO ? dragStartISO : dragCurrentISO;
        const e = dragStartISO > dragCurrentISO ? dragStartISO : dragCurrentISO;
        return { startISO: s, endISO: e };
      }
      if (rangeDraftStartISO && rangeDraftEndISO) {
        return { startISO: rangeDraftStartISO, endISO: rangeDraftEndISO };
      }
      return null;
    })();

    if (!bounds) return null;

    try {
      const start = startOfDay(parseISO(bounds.startISO));
      const end = startOfDay(parseISO(bounds.endISO));
      if (isAfter(start, end)) return null;

      const endAt = endOfDay(end);
      const totalSeconds = differenceInSeconds(endAt, start);
      const cursor = isBefore(now, start) ? start : isAfter(now, endAt) ? endAt : now;
      const elapsedSeconds = differenceInSeconds(cursor, start);
      const percent =
        totalSeconds <= 0 ? 100 : Math.min(100, Math.max(0, (elapsedSeconds / totalSeconds) * 100));

      const remainingSeconds = Math.max(0, differenceInSeconds(endAt, now));
      const remDays = Math.floor(remainingSeconds / 86400);
      const remHours = Math.floor((remainingSeconds % 86400) / 3600);
      const remMinutes = Math.floor((remainingSeconds % 3600) / 60);
      const remSeconds = remainingSeconds % 60;
      const remainingText = `${remDays}天 ${remHours.toString().padStart(2, '0')}:${remMinutes
        .toString()
        .padStart(2, '0')}:${remSeconds.toString().padStart(2, '0')}`;

      const totalDays = differenceInCalendarDays(end, start) + 1;
      const elapsedDays = isBefore(now, start)
        ? 0
        : isAfter(now, endAt)
          ? totalDays
          : differenceInCalendarDays(todayStart, start) + 1;

      return {
        startISO: bounds.startISO,
        endISO: bounds.endISO,
        percent,
        remainingText,
        elapsedDays,
        totalDays
      };
    } catch {
      return null;
    }
  }, [dragCurrentISO, dragStartISO, isCreatingRange, isDragging, now, rangeDraftEndISO, rangeDraftStartISO, todayStart]);

  const rangeDraftValid = useMemo(() => {
    try {
      const start = startOfDay(parseISO(rangeDraftStartISO));
      const end = startOfDay(parseISO(rangeDraftEndISO));
      return !isAfter(start, end);
    } catch {
      return false;
    }
  }, [rangeDraftEndISO, rangeDraftStartISO]);

  useEffect(() => {
    if (!isEditingRange) return;
    setRangeDraftSaving(false);
  }, [isEditingRange]);

  const applyRangeDraftToActive = () => {
    if (!rangeDraftValid) return;
    setCustomStartISO(rangeDraftStartISO);
    setCustomEndISO(rangeDraftEndISO);
    
    const desiredName = rangeDraftName.trim() || '新篇章';

    if (!activeRangeId) {
      const id = `range_${Date.now()}`;
      setRanges((prev) => {
        const name = makeUniqueRangeName(desiredName, prev);
        const newRange: SavedRange = {
          id,
          name,
          startISO: rangeDraftStartISO,
          endISO: rangeDraftEndISO,
          color: rangeDraftColor
        };
        return [...prev, newRange];
      });
      setActiveRangeId(id);
      return;
    }

    setRanges((prev) =>
      prev.map((r) =>
        r.id === activeRangeId
          ? {
              ...r,
              name: desiredName,
              startISO: rangeDraftStartISO,
              endISO: rangeDraftEndISO,
              color: rangeDraftColor
            }
          : r
      )
    );
  };

  const deleteActiveRange = useCallback(() => {
    if (!activeRangeId) return;
    // Allow deleting the last range
    const index = ranges.findIndex((r) => r.id === activeRangeId);
    if (index < 0) return;
    const nextRanges = ranges.filter((r) => r.id !== activeRangeId);
    const nextActive = nextRanges.length > 0 
        ? nextRanges[Math.min(index, nextRanges.length - 1)] 
        : null;
    
    setRanges(nextRanges);
    setActiveRangeId(nextActive?.id ?? null);
    
    if (nextActive) {
      setCustomStartISO(nextActive.startISO);
      setCustomEndISO(nextActive.endISO);
      setRangeDraftStartISO(nextActive.startISO);
      setRangeDraftEndISO(nextActive.endISO);
      setRangeDraftName(nextActive.name);
      setEntries(nextActive.entries || {});
    } else {
      // Empty state
      setEntries({});
    }
    setIsEditingRange(false);
  }, [activeRangeId, ranges]);

  const beginCreateRange = useCallback(
    (options?: { startISO?: string; endISO?: string; setVisibleDefault?: boolean }) => {
      const base = startOfDay(new Date());
      const defaultStartISO = format(base, 'yyyy-MM-dd');
      const defaultEndISO = format(addDays(base, 100), 'yyyy-MM-dd');
      const startISO = options?.startISO ?? defaultStartISO;
      const endISO = options?.endISO ?? defaultEndISO;

      createOriginActiveRangeIdRef.current = activeRangeId;

      if (options?.setVisibleDefault) {
        createOriginCustomStartISORef.current = customStartISO;
        createOriginCustomEndISORef.current = customEndISO;
        setCustomStartISO(startISO);
        setCustomEndISO(endISO);
      }

      setActiveRangeId(null);
      setRangeDraftName(makeUniqueRangeName('新篇章', ranges));
      setRangeDraftStartISO('');
      setRangeDraftEndISO('');
      setRangeDraftColor('emerald');
      setIsEditingRange(true);
      setRangeDraftSaving(false);
    },
    [activeRangeId, customEndISO, customStartISO, ranges]
  );

  const cancelCreateRange = useCallback(() => {
    if (!isRangeEditing || activeRangeId !== null) return;
    setIsDragging(false);
    setDragStartISO(null);
    setDragCurrentISO(null);
    setRangeDraftName('');
    setRangeDraftColor('emerald');
    setRangeDraftSaving(false);
    setIsEditingRange(false);
    setActiveRangeId(createOriginActiveRangeIdRef.current);
    createOriginActiveRangeIdRef.current = null;

    if (createOriginCustomStartISORef.current && createOriginCustomEndISORef.current) {
      setCustomStartISO(createOriginCustomStartISORef.current);
      setCustomEndISO(createOriginCustomEndISORef.current);
    }
    createOriginCustomStartISORef.current = null;
    createOriginCustomEndISORef.current = null;
  }, [activeRangeId, isRangeEditing]);

  const exportData = useCallback(() => {
    const payload = {
      version: 1,
      exportedAtISO: new Date().toISOString(),
      entries,
      ranges,
      viewPref: {
        mode: viewMode,
        anchorISO,
        customStartISO,
        customEndISO,
        activeRangeId
      },
      guideDismissed
    };
    const text = JSON.stringify(payload, null, 2);
    const blob = new Blob([text], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `yeargrid_backup_${format(new Date(), 'yyyyMMdd_HHmmss')}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 5000);
    setIOStatus({ kind: 'ok', message: '已导出备份文件。' });
  }, [activeRangeId, anchorISO, customEndISO, customStartISO, entries, guideDismissed, ranges, viewMode]);

  const triggerImport = useCallback(() => {
    setIOStatus(null);
    importInputRef.current?.click();
  }, []);

  const onImportFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0] ?? null;
      e.target.value = '';
      if (!file) return;

      if (file.size > 5 * 1024 * 1024) {
        setIOStatus({ kind: 'error', message: '导入失败：文件过大（请使用 5MB 以内）。' });
        return;
      }

      let raw = '';
      try {
        raw = await file.text();
      } catch {
        setIOStatus({ kind: 'error', message: '导入失败：无法读取文件内容。' });
        return;
      }

      const parsed = safeParseJSON(raw);
      if (!parsed || typeof parsed !== 'object') {
        setIOStatus({ kind: 'error', message: '导入失败：文件不是有效的 JSON 对象。' });
        return;
      }

      const root = parsed as Record<string, unknown>;
      const importedEntries = normalizeEntries(root.entries ?? root);
      const importedRanges = normalizeRanges(root.ranges);
      const importedPref = normalizeViewPref(root.viewPref ?? root);

      const hasEntries = !!(importedEntries && Object.keys(importedEntries).length > 0);
      const hasRanges = importedRanges !== null && importedRanges.length > 0;
      const hasPref = importedPref !== null;
      const hasGuide = typeof root.guideDismissed === 'boolean';

      if (!hasEntries && !hasRanges && !hasPref && !hasGuide) {
        setIOStatus({ kind: 'error', message: '导入失败：未识别到可用数据。' });
        return;
      }

      const overwrite = window.confirm('导入会覆盖本地数据。确定=覆盖；取消=合并。');

      const nextEntries: Record<string, Entry> = overwrite
        ? importedEntries ?? {}
        : {
            ...entries,
            ...(importedEntries ?? {})
          };

      const mergeRanges = (base: SavedRange[], incoming: SavedRange[]) => {
        const usedIds = new Set(base.map((r) => r.id));
        const usedNames = new Set(base.map((r) => r.name.trim()));
        const out = [...base];
        for (const r of incoming) {
          let id = r.id;
          if (!id || usedIds.has(id)) id = `range_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
          usedIds.add(id);
          let name = r.name.trim() || '区间';
          if (usedNames.has(name)) {
            let i = 2;
            while (usedNames.has(`${name}-${i}`)) i += 1;
            name = `${name}-${i}`;
          }
          usedNames.add(name);
          out.push({ ...r, id, name });
        }
        return out;
      };

      const nextRanges: SavedRange[] =
        importedRanges && importedRanges.length > 0
          ? overwrite
            ? importedRanges
            : mergeRanges(ranges, importedRanges)
          : ranges;

      setEntries(nextEntries);
      try {
        localStorage.setItem('yeargrid_entries_v1', JSON.stringify(nextEntries));
      } catch {
        setIOStatus({ kind: 'error', message: '导入完成，但保存到本地失败（可能是存储空间不足）。' });
        return;
      }

      if (importedRanges && importedRanges.length > 0) {
        setRanges(nextRanges);
        try {
          localStorage.setItem('yeargrid_ranges_v1', JSON.stringify(nextRanges));
        } catch {
          setIOStatus({ kind: 'error', message: '导入完成，但保存区间到本地失败（可能是存储空间不足）。' });
          return;
        }
      }

      if (overwrite && importedPref) {
        if (importedPref.mode) setViewMode(importedPref.mode);
        if (importedPref.anchorISO) setAnchorISO(importedPref.anchorISO);

        const preferActive = importedPref.activeRangeId
          ? nextRanges.find((r) => r.id === importedPref.activeRangeId) ?? null
          : null;

        if (preferActive) {
          setActiveRangeId(preferActive.id);
          setCustomStartISO(preferActive.startISO);
          setCustomEndISO(preferActive.endISO);
          setRangeDraftStartISO(preferActive.startISO);
          setRangeDraftEndISO(preferActive.endISO);
          setRangeDraftName(preferActive.name);
        } else if (importedPref.customStartISO && importedPref.customEndISO) {
          setActiveRangeId(null);
          setCustomStartISO(importedPref.customStartISO);
          setCustomEndISO(importedPref.customEndISO);
          setRangeDraftStartISO(importedPref.customStartISO);
          setRangeDraftEndISO(importedPref.customEndISO);
          setRangeDraftName('');
        }
      }

      if (typeof root.guideDismissed === 'boolean') {
        setGuideDismissed(root.guideDismissed);
        try {
          localStorage.setItem('yeargrid_guide_dismissed_v1', root.guideDismissed ? '1' : '0');
        } catch {
          setIOStatus({ kind: 'error', message: '导入完成，但保存引导状态到本地失败（可能是存储空间不足）。' });
          return;
        }
      }

      setIsEditingRange(false);
      setIOStatus({ kind: 'ok', message: overwrite ? '导入完成：已覆盖本地数据。' : '导入完成：已合并本地数据。' });
    },
    [entries, ranges]
  );

  const percentText = useMemo(
    () => `${Math.floor(percent).toString()}%`,
    [percent]
  );

  const elapsedDays = useMemo(() => {
    const idx = days.findIndex((d) => d.state === 'today');
    if (idx >= 0) return idx;
    if (days.length === 0) return 0;
    const last = days[days.length - 1]?.date;
    if (!last) return 0;
    return isAfter(now, last) ? days.length : 0;
  }, [days, now]);

  const timeRemainingText = useMemo(() => {
    const hh = remaining.hours.toString().padStart(2, '0');
    const mm = remaining.minutes.toString().padStart(2, '0');
    const ss = remaining.seconds.toString().padStart(2, '0');
    return `${remaining.days}天 ${hh}:${mm}:${ss}`;
  }, [remaining.days, remaining.hours, remaining.minutes, remaining.seconds]);

  const stateMeta = useMemo(() => {
    const map: Record<BodyState, { label: string; emoji: string; dotClass: string }> =
      {
        0: { label: '未记录', emoji: '◻︎', dotClass: 'bg-zinc-300' },
        1: { label: '很差', emoji: '😣', dotClass: 'bg-rose-400' },
        2: { label: '偏差', emoji: '😕', dotClass: 'bg-amber-400' },
        3: { label: '一般', emoji: '😐', dotClass: 'bg-zinc-400' },
        4: { label: '不错', emoji: '🙂', dotClass: 'bg-cyan-400' },
        5: { label: '很好', emoji: '😄', dotClass: 'bg-emerald-600' }
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
    // Migrate legacy entries to active range if needed, or just initialize ranges with embedded entries
    const today = new Date();
    const defaultStartISO = format(startOfMonth(today), 'yyyy-MM-dd');
    const defaultEndISO = format(endOfMonth(today), 'yyyy-MM-dd');
    const defaultRange: SavedRange = {
      id: `range_${today.getTime()}`,
      name: '区间1',
      startISO: defaultStartISO,
      endISO: defaultEndISO,
      entries: {}
    };

    // Load ranges first
    let loadedRanges: SavedRange[] = [];
    const rawRanges = localStorage.getItem('yeargrid_ranges_v1');
    const hasStoredRangesKey = rawRanges !== null;
    const parsedRanges = safeParseJSON(rawRanges);
    const normalizedRanges = normalizeRanges(parsedRanges);
    const isCorruptRanges = rawRanges !== null && parsedRanges === null;
    
    if (isCorruptRanges) {
      localStorage.setItem(`yeargrid_ranges_v1_corrupt_${Date.now()}`, rawRanges);
      localStorage.removeItem('yeargrid_ranges_v1');
      setStorageStatus((prev) => prev ?? '检测到本地 ranges 数据损坏，已备份并重置。');
    }
    
    if (!isCorruptRanges && normalizedRanges) {
      loadedRanges = normalizedRanges;
    }

    // Load legacy global entries
    const rawEntries = localStorage.getItem('yeargrid_entries_v1');
    if (rawEntries) {
      const parsedEntries = safeParseJSON(rawEntries);
      const normalizedEntries = normalizeEntries(parsedEntries);
      
      if (normalizedEntries && Object.keys(normalizedEntries).length > 0) {
        if (loadedRanges.length === 0 && !hasStoredRangesKey && !isCorruptRanges) {
          loadedRanges = [{ ...defaultRange, entries: normalizedEntries }];
        } else if (
          loadedRanges[0] &&
          (!loadedRanges[0].entries || Object.keys(loadedRanges[0].entries).length === 0)
        ) {
          loadedRanges[0].entries = normalizedEntries;
        }
      }
      // Consider clearing legacy entries after successful migration, 
      // but for safety we might keep it or rename it? 
      // Let's rename it to avoid re-reading next time if we want to be strict,
      // but here we just read it if ranges are empty-ish.
      // actually, let's not delete it yet to be safe.
    }

    setRanges(loadedRanges);
    setRangesLoaded(true);

    // Initialize active range
    const rawPref = localStorage.getItem('yeargrid_view_pref_v1');
    const parsedPref = safeParseJSON(rawPref);
    const pref = normalizeViewPref(parsedPref);
    
    let initialActiveId = loadedRanges[0]?.id ?? null;
    
    if (pref?.activeRangeId) {
      const found = loadedRanges.find((r) => r.id === pref.activeRangeId);
      if (found) {
        initialActiveId = found.id;
      }
    }

    setActiveRangeId(initialActiveId);
    
    if (initialActiveId) {
      const found = loadedRanges.find(r => r.id === initialActiveId);
      if (found) {
        setCustomStartISO(found.startISO);
        setCustomEndISO(found.endISO);
        setRangeDraftStartISO(found.startISO);
        setRangeDraftEndISO(found.endISO);
        setRangeDraftName(found.name);
        // Load entries for the active range into state
        setEntries(found.entries || {});
      }
    } else {
        setEntries({});
        setCustomStartISO('');
        setCustomEndISO('');
        setRangeDraftStartISO('');
        setRangeDraftEndISO('');
        setRangeDraftName('');
    }

    if (pref) {
      if (pref.mode) setViewMode(pref.mode);
      if (pref.anchorISO) setAnchorISO(pref.anchorISO);
    }

    setEntriesLoaded(true); // Signal that we are ready
    setViewPrefLoaded(true);
    setGuideDismissed(localStorage.getItem('yeargrid_guide_dismissed_v1') === '1');
  }, []);

  // Sync entries back to active range and persist ranges
  useEffect(() => {
    if (!entriesLoaded || !rangesLoaded) return;
    
    setRanges(prev => {
      // If no active range, nothing to sync entries to
      if (!activeRangeId) return prev;
      
      const idx = prev.findIndex(r => r.id === activeRangeId);
      if (idx === -1) return prev;

      // Check if entries actually changed to avoid loop?
      // Strict equality check is hard, but we can rely on React state updates.
      // actually, we need to update the range object with new entries
      const currentRange = prev[idx];
      if (currentRange.entries === entries) return prev; // optimization if reference is same

      const nextRanges = [...prev];
      nextRanges[idx] = { ...currentRange, entries };
      
      // Persist to local storage
      localStorage.setItem('yeargrid_ranges_v1', JSON.stringify(nextRanges));
      return nextRanges;
    });
  }, [entries, activeRangeId, entriesLoaded, rangesLoaded]);

  // Persist ranges when they change (other properties like name/color/dates)
  // Note: The above effect handles entries syncing. 
  // We also need to save ranges when `ranges` state changes due to other reasons (add/delete/rename)
  // BUT: `setRanges` in the above effect triggers this one if we are not careful.
  // Let's combine persistence logic or separate concerns carefully.
  // Actually, simpler: Whenever `ranges` changes, save it.
  useEffect(() => {
      if (!rangesLoaded) return;
      localStorage.setItem('yeargrid_ranges_v1', JSON.stringify(ranges));
  }, [ranges, rangesLoaded]);

  // When active range changes, load its entries
  useEffect(() => {
    if (!rangesLoaded) return;
    if (!activeRangeId) return;
    if (prevActiveRangeIdRef.current === activeRangeId) return;
    prevActiveRangeIdRef.current = activeRangeId;

    const found = ranges.find((r) => r.id === activeRangeId);
    if (!found) {
      setEntries({});
      return;
    }

    setEntries(found.entries || {});
    setCustomStartISO(found.startISO);
    setCustomEndISO(found.endISO);
    setRangeDraftStartISO(found.startISO);
    setRangeDraftEndISO(found.endISO);
  }, [activeRangeId, ranges, rangesLoaded]);

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

      const gap = viewMode === 'month' || viewMode === 'week' || viewMode === 'range' ? 8 : 6;
      const minCols = 12;
      const maxCols = 48;
      const count = days.length;

      let bestCols = clamp(32, minCols, maxCols);
      let bestCellSize = 0;

      if (viewMode === 'year') {
        setColumns((prev) => (prev === 7 ? prev : 7));
        setGridMaxWidth((prev) => (prev === undefined ? prev : undefined));
        return;
      }

      if (viewMode === 'month' || viewMode === 'week' || viewMode === 'range') {
        if (viewMode === 'week') {
          bestCols = 7;
        } else {
          bestCols = availableWidth < 640 ? 7 : 10;
        }
        setColumns((prev) => (prev === bestCols ? prev : bestCols));
        setGridMaxWidth((prev) => (prev === undefined ? prev : undefined));
        return;
      }

      const currentCols = clamp(columnsRef.current, minCols, maxCols);
      const candidates: Array<{ cols: number; cellSize: number }> = [];
      for (let cols = minCols; cols <= maxCols; cols += 1) {
        const cellSize = Math.floor((availableWidth - gap * (cols - 1)) / cols);
        if (cellSize <= 2) continue;
        const rows = Math.ceil(count / cols);
        const gridHeight = rows * cellSize + gap * (rows - 1);
        if (gridHeight <= availableHeight) {
          candidates.push({ cols, cellSize });
        }
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
      } else {
        const tolerance = 1;
        const nearBest = candidates.filter((c) => c.cellSize >= bestCellSize - tolerance);
        if (nearBest.length > 0) {
          nearBest.sort((a, b) => {
            const da = Math.abs(a.cols - currentCols);
            const db = Math.abs(b.cols - currentCols);
            if (da !== db) return da - db;
            if (a.cellSize !== b.cellSize) return b.cellSize - a.cellSize;
            return a.cols - b.cols;
          });
          bestCols = nearBest[0]!.cols;
          bestCellSize = nearBest[0]!.cellSize;
        }
      }

      setColumns((prev) => (prev === bestCols ? prev : bestCols));

      // For Range view (or Year view fallback), constrain max cell size to keep it looking good
      if (viewMode === 'range') {
        const idealMaxCellSize = 52;
        if (bestCellSize > idealMaxCellSize) {
          const constrainedWidth = bestCols * idealMaxCellSize + (bestCols - 1) * gap;
          setGridMaxWidth((prev) => (prev === constrainedWidth ? prev : constrainedWidth));
        } else {
          setGridMaxWidth((prev) => (prev === undefined ? prev : undefined));
        }
      } else {
        setGridMaxWidth((prev) => (prev === undefined ? prev : undefined));
      }
    };

    let raf = 0;
    const schedule = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        update();
      });
    };

    schedule();

    const ro = new ResizeObserver(() => schedule());
    ro.observe(root);
    ro.observe(header);
    window.addEventListener('resize', schedule);

    return () => {
      window.removeEventListener('resize', schedule);
      ro.disconnect();
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [days.length, viewMode]);

  const selectedDay = useMemo(() => {
    if (!selectedISODate) return null;
    return days.find((d) => d.isoDate === selectedISODate) ?? null;
  }, [days, selectedISODate]);

  useEffect(() => {
    if (!selectedDay) return;
    lastFocusedRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    requestAnimationFrame(() => modalRef.current?.focus());

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedISODate(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedDay]);

  useEffect(() => {
    if (selectedDay) return;
    lastFocusedRef.current?.focus();
  }, [selectedDay]);

  const selectedEntry = useMemo(() => {
    if (!selectedDay) return null;
    return entries[selectedDay.isoDate] ?? null;
  }, [entries, selectedDay]);

  const dayIndexByISO = useMemo(() => {
    const map = new Map<string, number>();
    for (let i = 0; i < days.length; i += 1) {
      map.set(days[i].isoDate, i);
    }
    return map;
  }, [days]);

  useEffect(() => {
    if (days.length === 0) return;
    const existing = focusedISODate ? dayIndexByISO.has(focusedISODate) : false;
    if (existing) return;
    const next =
      days.find((d) => d.state === 'today')?.isoDate ?? days[0].isoDate;
    setFocusedISODate(next);
  }, [dayIndexByISO, days, focusedISODate]);

  const focusCell = useCallback((isoDate: string) => {
    const root = gridRef.current;
    if (!root) return;
    const el = root.querySelector<HTMLElement>(`[data-iso="${isoDate}"]`);
    el?.focus();
  }, []);

  const clampTooltipPosition = useCallback((x: number, y: number) => {
    const margin = 12;
    const size = tooltipSizeRef.current;
    if (!size) {
      return {
        x: clamp(x, margin, window.innerWidth - margin),
        y: clamp(y, margin, window.innerHeight - margin)
      };
    }
    const maxLeft = Math.max(margin, window.innerWidth - margin - size.w);
    const maxTop = Math.max(margin, window.innerHeight - margin - size.h);
    return { x: clamp(x, margin, maxLeft), y: clamp(y, margin, maxTop) };
  }, []);

  const handleCellFocus = useCallback(
    (day: YearDay, e: FocusEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const { x, y } = clampTooltipPosition(rect.right + 12, rect.top + 12);
      setTooltip({ day, x, y });
      setFocusedISODate(day.isoDate);
    },
    [clampTooltipPosition]
  );

  const handleCellBlur = useCallback((day: YearDay) => {
    setTooltip((prev) => (prev?.day.isoDate === day.isoDate ? null : prev));
  }, []);

  const handleCellHover = useCallback((day: YearDay, e: ReactMouseEvent<HTMLDivElement>) => {
    const { x, y } = clampTooltipPosition(e.clientX + 12, e.clientY + 12);
    setTooltip({ day, x, y });
    if (isRangeEditing && isDragging) {
      setDragCurrentISO(day.isoDate);
    }
  }, [clampTooltipPosition, isDragging, isRangeEditing]);

  const handleCellMouseDown = useCallback(
    (day: YearDay) => {
      if (viewMode !== 'range') return;
      if (!isEditingRange) return;
      setIsDragging(true);
      setDragStartISO(day.isoDate);
      setDragCurrentISO(day.isoDate);
    },
    [isEditingRange, viewMode]
  );

  const handleCellMouseUp = useCallback(
    (day: YearDay) => {
      if (!isEditingRange) return;
      if (!isDragging || !dragStartISO) return;
      setIsDragging(false);
      
      const d1 = parseISO(dragStartISO);
      const d2 = parseISO(day.isoDate);
      const start = isBefore(d1, d2) ? dragStartISO : day.isoDate;
      const end = isBefore(d1, d2) ? day.isoDate : dragStartISO;

      if (start === end) {
          setDragStartISO(null);
          setDragCurrentISO(null);
          return;
      }
      setRangeDraftStartISO(start);
      setRangeDraftEndISO(end);

      if (activeRangeId === null) {
        if (!customStartISO || start < customStartISO) setCustomStartISO(start);
        if (!customEndISO || end > customEndISO) setCustomEndISO(end);
      }
      
      setDragStartISO(null);
      setDragCurrentISO(null);
    },
    [activeRangeId, customEndISO, customStartISO, dragStartISO, isDragging, isEditingRange]
  );

  const handleCellMove = useCallback((day: YearDay, e: ReactMouseEvent<HTMLDivElement>) => {
    setTooltip((prev) => {
      if (!prev || prev.day.isoDate !== day.isoDate) return prev;
      const { x, y } = clampTooltipPosition(e.clientX + 12, e.clientY + 12);
      return { day: prev.day, x, y };
    });
  }, [clampTooltipPosition]);

  const handleCellLeave = useCallback(() => setTooltip(null), []);

  useEffect(() => {
    if (!tooltipKey) {
      tooltipSizeRef.current = null;
      return;
    }

    tooltipSizeRef.current = null;

    const measureAndClamp = () => {
      const el = tooltipRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      tooltipSizeRef.current = { w: rect.width, h: rect.height };
      const margin = 12;
      const maxLeft = Math.max(margin, window.innerWidth - margin - rect.width);
      const maxTop = Math.max(margin, window.innerHeight - margin - rect.height);
      setTooltip((prev) => {
        if (!prev) return prev;
        const nextX = clamp(prev.x, margin, maxLeft);
        const nextY = clamp(prev.y, margin, maxTop);
        if (Math.abs(nextX - prev.x) < 1 && Math.abs(nextY - prev.y) < 1) return prev;
        return { ...prev, x: nextX, y: nextY };
      });
    };

    const raf = window.requestAnimationFrame(measureAndClamp);
    return () => {
      window.cancelAnimationFrame(raf);
    };
  }, [tooltipKey]);

  useEffect(() => {
    const onResize = () => {
      if (!tooltipStateRef.current) return;
      const el = tooltipRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      tooltipSizeRef.current = { w: rect.width, h: rect.height };
      const margin = 12;
      const maxLeft = Math.max(margin, window.innerWidth - margin - rect.width);
      const maxTop = Math.max(margin, window.innerHeight - margin - rect.height);
      setTooltip((prev) => {
        if (!prev) return prev;
        const nextX = clamp(prev.x, margin, maxLeft);
        const nextY = clamp(prev.y, margin, maxTop);
        if (Math.abs(nextX - prev.x) < 1 && Math.abs(nextY - prev.y) < 1) return prev;
        return { ...prev, x: nextX, y: nextY };
      });
    };

    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const handleCellClick = useCallback((day: YearDay) => {
    if (viewMode === 'range' && isEditingRange) return;
    setFocusedISODate(day.isoDate);
    setSelectedISODate(day.isoDate);
  }, [isEditingRange, viewMode]);

  const handleCellKeyDown = useCallback(
    (day: YearDay, e: ReactKeyboardEvent<HTMLDivElement>) => {
      if (
        e.key === 'ArrowLeft' ||
        e.key === 'ArrowRight' ||
        e.key === 'ArrowUp' ||
        e.key === 'ArrowDown' ||
        e.key === 'Home' ||
        e.key === 'End'
      ) {
        e.preventDefault();
      }

      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleCellClick(day);
        return;
      }

      const currentIndex = dayIndexByISO.get(day.isoDate);
      if (currentIndex === undefined) return;

      let nextIndex: number | null = null;
      if (e.key === 'ArrowLeft') nextIndex = currentIndex - 1;
      if (e.key === 'ArrowRight') nextIndex = currentIndex + 1;
      if (e.key === 'ArrowUp') nextIndex = currentIndex - columns;
      if (e.key === 'ArrowDown') nextIndex = currentIndex + columns;
      if (e.key === 'Home') nextIndex = 0;
      if (e.key === 'End') nextIndex = days.length - 1;
      if (nextIndex === null) return;

      nextIndex = clamp(nextIndex, 0, days.length - 1);
      const nextISO = days[nextIndex]?.isoDate;
      if (!nextISO) return;

      setFocusedISODate(nextISO);
      requestAnimationFrame(() => focusCell(nextISO));
    },
    [columns, dayIndexByISO, days, focusCell, handleCellClick]
  );

  const toggleStateFilter = useCallback((state: BodyState) => {
    if (state === 0) return;
    setStateFilters((prev) => {
      const exists = prev.includes(state);
      const next = exists ? prev.filter((s) => s !== state) : [...prev, state];
      next.sort((a, b) => a - b);
      return next;
    });
  }, []);

  const effectiveHighlightThisMonth = viewMode === 'year' && highlightThisMonth;

  const guideVisible = useMemo(() => {
    if (guideDismissed) return false;
    return Object.keys(entries).length === 0;
  }, [guideDismissed, entries]);

  const gridGap = viewMode === 'month' || viewMode === 'week' || viewMode === 'range' ? 8 : 6;

  const yearMonthBlocks = useMemo(() => {
    if (viewMode !== 'year') return [];
    const byMonth = new Map<number, YearDay[]>();
    for (const d of days) {
      const arr = byMonth.get(d.month);
      if (arr) arr.push(d);
      else byMonth.set(d.month, [d]);
    }
    const blocks: Array<{ month: number; offset: number; days: YearDay[] }> = [];
    for (let m = 1; m <= 12; m += 1) {
      const monthDays = byMonth.get(m) ?? [];
      if (monthDays.length === 0) continue;
      const dow = monthDays[0].date.getDay();
      const offset = (dow + 6) % 7;
      blocks.push({ month: m, offset, days: monthDays });
    }
    return blocks;
  }, [days, viewMode]);

  const startNewRange = useCallback(() => {
    setViewMode('range');
    beginCreateRange({ setVisibleDefault: true });
  }, [beginCreateRange]);

  const buildDayCell = useCallback(
    (day: YearDay, variant: 'compact' | 'mini' | 'large') => {
      const entry = entries[day.isoDate] ?? null;
      const selected = selectedISODate === day.isoDate;

      const propertyHighlightActive = effectiveHighlightThisMonth;
      const propertyMatch =
        !propertyHighlightActive ||
        (effectiveHighlightThisMonth && day.month === currentMonth);

      const recorded = !!entry;
      const hasNote = !!entry?.note.trim();
      const recordMatch =
        recordFilter === 'all'
          ? true
          : recordFilter === 'recorded'
            ? recorded
            : !recorded;
      const noteMatch = !noteOnly || hasNote;
      const stateMatch =
        stateFilters.length === 0 ? true : entry ? stateFilters.includes(entry.state) : false;
      const q = noteQuery.trim().toLowerCase();
      const queryMatch = !q || (hasNote && entry!.note.toLowerCase().includes(q));

      const anyFilter =
        propertyHighlightActive ||
        recordFilter !== 'all' ||
        noteOnly ||
        stateFilters.length > 0 ||
        q !== '';
      const matches = propertyMatch && recordMatch && noteMatch && stateMatch && queryMatch;
      const dimmed = viewMode !== 'range' && anyFilter && !matches;

      // Special handling for range creation/editing:
      // All cells are dimmed by default unless selected by drag or explicitly selected
      // We also want to hide dots during creation/editing (implemented via entry prop below)
      let isDragSelected = false;
      if (isDragging && dragStartISO && dragCurrentISO) {
        const s = dragStartISO < dragCurrentISO ? dragStartISO : dragCurrentISO;
        const e = dragStartISO > dragCurrentISO ? dragStartISO : dragCurrentISO;
        isDragSelected = day.isoDate >= s && day.isoDate <= e;
      } else if (isRangeEditing && rangeDraftStartISO && rangeDraftEndISO) {
        isDragSelected = day.isoDate >= rangeDraftStartISO && day.isoDate <= rangeDraftEndISO;
      }

      const cellThemeColor = isRangeEditing && isDragSelected ? rangeDraftColor : 'emerald';

      return (
        <DayCell
          key={day.isoDate}
          variant={variant}
          dataIso={day.isoDate}
          tabIndex={focusedISODate === day.isoDate ? 0 : -1}
          day={day}
          dimmed={dimmed}
          selected={selected}
          isDragSelected={isDragSelected}
          forceGray={isRangeEditing && !isDragSelected}
          // If editing range and selected/dragged, show theme color, otherwise emerald or gray
          themeColor={cellThemeColor}
          // Hide entries during range editing to avoid visual clutter
          entry={isRangeEditing ? null : entry}
          showWeekend={highlightWeekends}
          showHoliday={highlightHolidays}
          onHover={handleCellHover}
          onMove={handleCellMove}
          onLeave={handleCellLeave}
          onFocus={handleCellFocus}
          onBlur={handleCellBlur}
          onKeyDown={handleCellKeyDown}
          onClick={handleCellClick}
          onMouseDown={handleCellMouseDown}
          onMouseUp={handleCellMouseUp}
        />
      );
    },
    [
      currentMonth,
      effectiveHighlightThisMonth,
      entries,
      focusedISODate,
      handleCellBlur,
      handleCellClick,
      handleCellFocus,
      handleCellHover,
      handleCellKeyDown,
      handleCellLeave,
      handleCellMove,
      handleCellMouseDown,
      handleCellMouseUp,
      highlightHolidays,
      highlightWeekends,
      noteOnly,
      noteQuery,
      recordFilter,
      selectedISODate,
      stateFilters,
      isDragging,
      dragStartISO,
      dragCurrentISO,
      isRangeEditing,
      rangeDraftColor,
      rangeDraftStartISO,
      rangeDraftEndISO,
      viewMode
    ]
  );

  return (
    <div ref={rootRef} className="relative flex w-full flex-col">
      <header ref={headerRef} className="mb-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
            <div className="relative">
              <svg className="h-32 w-32 -rotate-90" viewBox="0 0 128 128">
                <defs>
                  <linearGradient id="ygProgressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="rgb(5 150 105)" />
                    <stop offset="100%" stopColor="rgb(14 116 144)" />
                  </linearGradient>
                </defs>
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  className="text-zinc-200"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="url(#ygProgressGradient)"
                  strokeWidth="8"
                  fill="none"
                  strokeLinecap="round"
                  className="transition-all duration-1000"
                  strokeDasharray={`${(isCreatingRange ? (createRangePreview?.percent ?? 0) : percent) * 3.52} 352`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-zinc-900">
                  {isCreatingRange
                    ? createRangePreview
                      ? `${Math.floor(createRangePreview.percent).toString()}%`
                      : '--'
                    : percentText}
                </span>
                <span className="text-xs text-zinc-500">
                  {viewMode === 'year'
                    ? format(rangeStart, 'yyyy年')
                    : viewMode === 'month'
                      ? format(rangeStart, 'M月')
                      : viewMode === 'week'
                        ? '本周'
                        : '区间'}
                </span>
              </div>
            </div>

            <div className="space-y-3 rounded-xl border border-zinc-200/60 bg-white p-4 shadow-sm">
              <div>
                <p className="text-sm text-zinc-500">剩余时间</p>
                <p className="text-2xl font-semibold text-zinc-900 tabular-nums">
                  {isCreatingRange ? createRangePreview?.remainingText ?? '--' : timeRemainingText}
                </p>
              </div>
              <div className="flex gap-6">
                <div>
                  <p className="text-xs text-zinc-500">已过</p>
                  <p className="text-lg font-medium text-emerald-600 tabular-nums">
                    {isCreatingRange
                      ? createRangePreview
                        ? `${createRangePreview.elapsedDays} 天`
                        : '--'
                      : `${elapsedDays} 天`}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500">总计</p>
                  <p className="text-lg font-medium text-zinc-900 tabular-nums">
                    {isCreatingRange
                      ? createRangePreview
                        ? `${createRangePreview.totalDays} 天`
                        : '--'
                      : `${days.length} 天`}
                  </p>
                </div>
              </div>
              <div className="h-2 w-48 overflow-hidden rounded-full bg-zinc-100">
                <div
                  className="h-full rounded-full transition-all duration-1000"
                  style={{
                    width: `${isCreatingRange ? (createRangePreview?.percent ?? 0) : percent}%`,
                    background: 'linear-gradient(90deg, rgb(5 150 105), rgb(14 116 144))'
                  }}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center rounded-lg border border-zinc-200/60 bg-zinc-100/60 p-1 shadow-sm">
                {(['year', 'month', 'week', 'range'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    className={`rounded-md px-4 py-2 text-sm font-medium transition-all ${
                      viewMode === m
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-zinc-500 hover:bg-zinc-100/80 hover:text-zinc-900'
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

                <button
                  type="button"
                  onClick={() => setShowFilters(!showFilters)}
                  className={`rounded-lg border p-2.5 transition-all ${
                    showFilters
                      ? 'border-emerald-600 bg-emerald-600 text-white shadow-md'
                      : 'border-zinc-200/60 bg-white text-zinc-500 shadow-sm hover:border-emerald-600/50 hover:text-zinc-900'
                  }`}
                >
                  <Filter className="h-4 w-4" />
                </button>
            </div>

            {/* Sub-Control Bar: Navigation & Context */}
            <div className="flex items-center justify-end gap-4">
              {viewMode === 'year' && (
                <div className="flex h-10 items-center rounded-lg border border-zinc-200/60 bg-white px-4 text-sm font-medium text-zinc-900 shadow-sm">
                  {format(rangeStart, 'yyyy年')}
                </div>
              )}

              {(viewMode === 'month' || viewMode === 'week') && (
                <div className="flex items-center gap-2 rounded-lg border border-zinc-200/60 bg-zinc-100/60 p-1 shadow-sm">
                  <button
                    type="button"
                    className="rounded-md p-2 text-zinc-500 transition-colors hover:bg-white hover:text-zinc-900"
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
                  <span className="min-w-[132px] px-1 text-center text-sm font-medium tabular-nums text-zinc-900">
                    {viewMode === 'month'
                      ? format(rangeStart, 'yyyy年MM月')
                      : `${format(rangeStart, 'MM.dd')} - ${format(rangeEnd, 'MM.dd')}`}
                  </span>
                  <button
                    type="button"
                    className="rounded-md p-2 text-zinc-500 transition-colors hover:bg-white hover:text-zinc-900"
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
                  <div className="mx-1 h-5 w-px bg-zinc-200" />
                  <button
                    type="button"
                    className="rounded-md px-3 py-2 text-sm text-zinc-600 transition-colors hover:bg-white hover:text-zinc-900"
                    onClick={() => setAnchorISO(format(now, 'yyyy-MM-dd'))}
                  >
                    回到当前
                  </button>
                </div>
              )}

              {viewMode === 'range' && (ranges.length > 0 || isEditingRange) && (
                <div className="relative flex flex-col items-center gap-2">
                  <div className="flex items-center gap-2">
                    <RangeSelector
                      ranges={ranges}
                      activeRangeId={activeRangeId}
                      onSelect={(id) => {
                        const r = ranges.find((item) => item.id === id);
                        if (r) {
                          setActiveRangeId(r.id);
                          setCustomStartISO(r.startISO);
                          setCustomEndISO(r.endISO);
                          setRangeDraftStartISO(r.startISO);
                          setRangeDraftEndISO(r.endISO);
                          setRangeDraftName(r.name);
                          setIsEditingRange(false);
                        }
                      }}
                      onAdd={() => {
                        beginCreateRange({ setVisibleDefault: true });
                      }}
                      onEdit={(r) => {
                        setActiveRangeId(r.id); // Ensure we are editing the right one
                        setRangeDraftName(r.name);
                        setRangeDraftStartISO(r.startISO);
                        setRangeDraftEndISO(r.endISO);
                        setRangeDraftColor(r.color || 'emerald');
                        setIsEditingRange(true);
                        setRangeDraftSaving(false);
                      }}
                      onDelete={(id) => {
                         // We need to implement delete by ID, currently deleteActiveRange deletes the active one
                         if (id === activeRangeId) {
                            deleteActiveRange();
                         } else {
                            // Temporary: switch to it then delete (hacky but safe for MVP with existing logic)
                            // Or better: refactor deleteActiveRange to accept ID. 
                            // For MVP, let's just use the existing logic which relies on activeRangeId
                            // If user deletes non-active, we might need to switch state.
                            // Actually RangeSelector's delete button on active item is enough for now.
                            // If I click delete on a dropdown item that is NOT active, I should warn or switch.
                            // Let's keep it simple: Select it first then delete logic runs.
                            const index = ranges.findIndex(r => r.id === id);
                            if (index >= 0) {
                                const nextRanges = ranges.filter(r => r.id !== id);
                                setRanges(nextRanges);
                                if (activeRangeId === id) {
                                    const nextActive = nextRanges[Math.min(index, nextRanges.length - 1)] ?? null;
                                    setActiveRangeId(nextActive?.id ?? null);
                                    if (nextActive) {
                                        setCustomStartISO(nextActive.startISO);
                                        setCustomEndISO(nextActive.endISO);
                                    }
                                }
                            }
                         }
                      }}
                      onDuplicate={(id) => {
                          const r = ranges.find(item => item.id === id);
                          if (!r) return;
                          const newId = `range_${Date.now()}`;
                          const desired = `${r.name} 副本`;
                          const name = makeUniqueRangeName(desired, ranges);
                          const next = { ...r, id: newId, name };
                          setRanges(prev => [...prev, next]);
                          // Switch to new
                          setActiveRangeId(newId);
                          setCustomStartISO(next.startISO);
                          setCustomEndISO(next.endISO);
                      }}
                    />

                    <div className="h-4 w-px bg-zinc-200" />

                    <button
                      type="button"
                      onClick={() => setIsEditingRange(!isEditingRange)}
                      className={`rounded-lg border p-2.5 transition-all ${
                        isEditingRange
                          ? 'border-emerald-600 bg-emerald-600 text-white shadow-md'
                          : 'border-zinc-200/60 bg-white text-zinc-500 shadow-sm hover:border-emerald-600/50 hover:text-zinc-900'
                      }`}
                      title="区间设置"
                    >
                      <Settings2 className="h-4 w-4" />
                    </button>
                  </div>

                  {isEditingRange && (
                    <div className="absolute top-full right-0 z-30 mt-2 flex w-[600px] max-w-[90vw] flex-col gap-4 rounded-xl border border-zinc-200/60 bg-white p-4 shadow-xl animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="flex flex-wrap items-center gap-3">
                        <input
                          type="text"
                          className="h-10 flex-1 rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-emerald-600/40 focus:ring-2 focus:ring-emerald-600/15"
                          placeholder="名称"
                          value={rangeDraftName}
                          onChange={(e) => setRangeDraftName(e.target.value)}
                        />
                      </div>

                      <div className="flex items-center gap-3 px-1">
                         <span className="text-sm font-medium text-zinc-500">主题色</span>
                         <div className="flex items-center gap-2">
                            {['emerald', 'blue', 'rose', 'amber', 'violet', 'cyan'].map((c) => (
                              <button
                                key={c}
                                type="button"
                                onClick={() => setRangeDraftColor(c as ThemeColor)}
                                className={`h-6 w-6 rounded-full border border-white shadow-sm ring-1 ring-inset transition-transform ${
                                   rangeDraftColor === c ? 'ring-zinc-900 scale-110' : 'ring-zinc-200 hover:scale-105'
                                } ${
                                  c === 'emerald' ? 'bg-emerald-500' :
                                  c === 'blue' ? 'bg-blue-500' :
                                  c === 'rose' ? 'bg-rose-500' :
                                  c === 'amber' ? 'bg-amber-500' :
                                  c === 'violet' ? 'bg-violet-500' :
                                  'bg-cyan-500'
                                }`}
                              />
                            ))}
                          </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex flex-1 items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50/50 p-1">
                            <input
                              type="date"
                              className="h-9 w-full min-w-0 bg-transparent px-2 text-sm text-zinc-900 outline-none"
                              value={rangeDraftStartISO}
                              onChange={(e) => {
                                const nextStart = e.target.value;
                                setRangeDraftStartISO(nextStart);
                                if (activeRangeId === null && isRangeEditing && nextStart) {
                                  if (!customStartISO || nextStart < customStartISO) setCustomStartISO(nextStart);
                                  if (rangeDraftEndISO && (!customEndISO || rangeDraftEndISO > customEndISO)) {
                                    setCustomEndISO(rangeDraftEndISO);
                                  }
                                }
                              }}
                            />
                            <span className="text-zinc-400">-</span>
                            <input
                              type="date"
                              className="h-9 w-full min-w-0 bg-transparent px-2 text-sm text-zinc-900 outline-none"
                              value={rangeDraftEndISO}
                              onChange={(e) => {
                                const nextEnd = e.target.value;
                                setRangeDraftEndISO(nextEnd);
                                if (activeRangeId === null && isRangeEditing && nextEnd) {
                                  if (!customEndISO || nextEnd > customEndISO) setCustomEndISO(nextEnd);
                                  if (rangeDraftStartISO && (!customStartISO || rangeDraftStartISO < customStartISO)) {
                                    setCustomStartISO(rangeDraftStartISO);
                                  }
                                }
                              }}
                            />
                        </div>
                        <button
                          type="button"
                          disabled={!rangeDraftValid || rangeDraftSaving}
                          className="flex h-11 items-center gap-2 rounded-lg bg-emerald-600 px-6 text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:bg-zinc-100 disabled:text-zinc-400"
                          onClick={() => {
                            if (rangeDraftSaving) return;
                            setRangeDraftSaving(true);
                            applyRangeDraftToActive();
                            setIsEditingRange(false);
                          }}
                          title="保存"
                        >
                          <Check className="h-4 w-4" />
                          保存
                        </button>
                        {activeRangeId === null && (
                          <button
                            type="button"
                            disabled={rangeDraftSaving}
                            className="flex h-11 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900 disabled:opacity-40"
                            onClick={cancelCreateRange}
                            title="取消创建"
                          >
                            <X className="h-4 w-4" />
                            取消
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={!activeRangeId || ranges.length <= 1}
                          className="flex h-11 w-11 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900 disabled:opacity-40"
                          onClick={deleteActiveRange}
                          title={ranges.length <= 1 ? '至少保留一个区间' : '删除'}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      
                      {activeRangeId === null && rangeDraftStartISO === '' && rangeDraftEndISO === '' && (
                        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                          <div className="flex items-start gap-2">
                            <MousePointer2 className="mt-0.5 h-4 w-4 text-amber-700" />
                            <div className="min-w-0">
                              <div className="text-xs font-medium text-amber-900">拖拽选择时间</div>
                              <div className="mt-0.5 text-[11px] leading-4 text-amber-900/80">
                                在日历上按住鼠标拖拽，可自动填入开始/结束日期。
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Collapsible Filters */}
        {showFilters && (
          <div className="mb-6 mt-6 rounded-xl border border-zinc-200/60 bg-white p-4 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="mb-4 flex items-center justify-between">
              <div className="text-sm font-medium text-zinc-900">筛选选项</div>
              <button
                type="button"
                className="text-zinc-400 transition-colors hover:text-zinc-700"
                onClick={() => setShowFilters(false)}
                aria-label="关闭筛选"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex flex-wrap gap-6">
              <label className="group flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={highlightWeekends}
                  onChange={(e) => setHighlightWeekends(e.target.checked)}
                  className="h-4 w-4 cursor-pointer rounded border-zinc-300 bg-white accent-emerald-600"
                />
                <span className="cursor-pointer text-sm text-zinc-900 transition-colors group-hover:text-emerald-700">
                  显示周末
                </span>
              </label>

              <label className="group flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={highlightHolidays}
                  onChange={(e) => setHighlightHolidays(e.target.checked)}
                  className="h-4 w-4 cursor-pointer rounded border-zinc-300 bg-white accent-emerald-600"
                />
                <span className="cursor-pointer text-sm text-zinc-900 transition-colors group-hover:text-emerald-700">
                  显示节假日
                </span>
              </label>

              {viewMode === 'year' && (
                <label className="group flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={highlightThisMonth}
                    onChange={(e) => setHighlightThisMonth(e.target.checked)}
                    className="h-4 w-4 cursor-pointer rounded border-zinc-300 bg-white accent-emerald-600"
                  />
                  <span className="cursor-pointer text-sm text-zinc-900 transition-colors group-hover:text-emerald-700">
                    高亮本月
                  </span>
                </label>
              )}

              <label className="group flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={noteOnly}
                  onChange={(e) => setNoteOnly(e.target.checked)}
                  className="h-4 w-4 cursor-pointer rounded border-zinc-300 bg-white accent-emerald-600"
                />
                <span className="cursor-pointer text-sm text-zinc-900 transition-colors group-hover:text-emerald-700">
                  仅有备注
                </span>
              </label>

              <div className="flex items-center gap-2">
                <span className="text-sm text-zinc-500">记录:</span>
                <select
                  value={recordFilter}
                  onChange={(e) => setRecordFilter(e.target.value as typeof recordFilter)}
                  className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-900 outline-none transition focus:border-emerald-600/40 focus:ring-2 focus:ring-emerald-600/15"
                >
                  <option value="all">全部</option>
                  <option value="recorded">已记录</option>
                  <option value="unrecorded">未记录</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-zinc-500">体感:</span>
                <div className="flex items-center gap-1">
                  {([1, 2, 3, 4, 5] as const).map((s) => {
                    const active = stateFilters.includes(s);
                    return (
                      <button
                        key={s}
                        type="button"
                        aria-pressed={active}
                        className={`flex h-8 w-8 items-center justify-center rounded-lg border text-sm transition-colors ${
                          active
                            ? 'border-emerald-600 bg-emerald-600 text-white'
                            : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
                        }`}
                        onClick={() => toggleStateFilter(s)}
                        title={stateMeta[s].label}
                      >
                        {stateMeta[s].emoji}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-zinc-500">备注:</span>
                <input
                  type="text"
                  className="w-[18ch] rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-900 outline-none transition focus:border-emerald-600/40 focus:ring-2 focus:ring-emerald-600/15"
                  placeholder="搜备注"
                  value={noteQuery}
                  onChange={(e) => setNoteQuery(e.target.value)}
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900"
                  onClick={() => {
                    setHighlightWeekends(false);
                    setHighlightHolidays(false);
                    setHighlightThisMonth(false);
                    setRecordFilter('all');
                    setNoteOnly(false);
                    setStateFilters([]);
                    setNoteQuery('');
                  }}
                >
                  清除
                </button>
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900"
                  onClick={exportData}
                >
                  <Download className="h-4 w-4" />
                  导出
                </button>
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900"
                  onClick={triggerImport}
                >
                  <Upload className="h-4 w-4" />
                  导入
                </button>
                <input
                  ref={importInputRef}
                  type="file"
                  accept="application/json"
                  className="hidden"
                  onChange={onImportFileChange}
                />
              </div>
            </div>
            {(storageStatus || ioStatus) && (
              <div className="mt-3 flex items-center justify-center">
                <div
                  className={`rounded-full border px-3 py-1 text-xs ${
                    (ioStatus?.kind ?? 'ok') === 'error'
                      ? 'border-rose-200 bg-rose-50 text-rose-700'
                      : 'border-zinc-200 bg-white text-zinc-600'
                  }`}
                >
                  {(ioStatus?.message ?? storageStatus) as string}
                </div>
              </div>
            )}
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
      
      {/* 主内容区域：承载不同视图（年 / 月 / 周 / 区间）的网格 */}
      <div className="w-full pb-12">
        {viewMode === 'range' && ranges.length === 0 && !isEditingRange ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/50 py-24 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <Plus className="h-8 w-8" />
            </div>
            <h3 className="mb-2 text-lg font-medium text-zinc-900">开始你的第一个区间</h3>
            <p className="mb-6 max-w-sm text-sm text-zinc-500">
              区间可以是一段旅行、一个项目周期、或者任何你想特别标记的时间段。
            </p>
            <button
              type="button"
              onClick={startNewRange}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-emerald-600 hover:shadow-md active:scale-[0.98]"
            >
              <Plus className="h-4 w-4" />
              创建新区间
            </button>
          </div>
        ) : (
        /* 重点卡片：标题 + 网格（年视图为 12 个月块；其他视图为连续日网格） */
        <div className="w-full rounded-2xl border border-zinc-200/60 bg-white p-6 shadow-sm">
          <div className="mb-6">
            {viewMode === 'range' && activeRange ? (
              <div className="space-y-4">
                <div className="flex justify-end">
                  <Legend
                    showWeekends={highlightWeekends}
                    onToggleWeekends={() => setHighlightWeekends(!highlightWeekends)}
                    showHolidays={highlightHolidays}
                    onToggleHolidays={() => setHighlightHolidays(!highlightHolidays)}
                  />
                </div>

                {!isEditingRange && <RangeProgressHeader range={activeRange} now={now} />}
              </div>
            ) : (
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="text-xl font-semibold text-zinc-900">
                  {viewMode === 'year'
                    ? format(rangeStart, 'yyyy年')
                    : viewMode === 'month'
                      ? format(rangeStart, 'M月')
                      : viewMode === 'week'
                        ? '本周'
                        : activeRange?.name?.trim() || '区间'}
                </div>
                <Legend
                  showWeekends={highlightWeekends}
                  onToggleWeekends={() => setHighlightWeekends(!highlightWeekends)}
                  showHolidays={highlightHolidays}
                  onToggleHolidays={() => setHighlightHolidays(!highlightHolidays)}
                />
              </div>
            )}
          </div>

          {viewMode === 'year' ? (
            /* 年视图：按月分组的 12 个小网格（mini 单元格），用于总览 */
            <div
              ref={gridRef}
              className="grid h-fit w-full grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            >
              {yearMonthBlocks.map((block) => {
                return (
                  /* 单个月块：7 列网格 + 前后补位，确保星期对齐 */
                  <div
                    key={block.month}
                    className="space-y-2 rounded-xl p-3 transition-colors hover:bg-zinc-100/70"
                  >
                    <div className="text-sm font-medium text-emerald-600">{block.month}月</div>
                    <div role="grid" aria-label={`${block.month}月`} className="grid w-full grid-cols-7 gap-1">
                      {/* 月初补位：让 1 号对齐到正确的星期列 */}
                      {Array.from({ length: block.offset }).map((_, i) => (
                        <div
                          key={`spacer_${block.month}_${i}`}
                          aria-hidden="true"
                          className="aspect-square w-full"
                        />
                      ))}
                      {/* 当月日期：使用 mini 单元格 */}
                      {block.days.map((d) => buildDayCell(d, 'mini'))}
                      {/* 月末补位：补齐最后一行的 7 列 */}
                      {Array.from({
                        length: (() => {
                          const used = block.offset + block.days.length;
                          const rem = used % 7;
                          return rem === 0 ? 0 : 7 - rem;
                        })()
                      }).map((_, i) => (
                        <div
                          key={`tail_${block.month}_${i}`}
                          aria-hidden="true"
                          className="aspect-square w-full"
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* 月/周/区间视图：连续日网格（large 单元格），列数由响应式计算控制 */
            <div
              ref={gridRef}
              role="grid"
              aria-label={
                viewMode === 'month'
                  ? '本月每天网格'
                  : viewMode === 'week'
                    ? '本周每天网格'
                    : '区间每天网格'
              }
              className="grid h-fit w-full"
              style={{
                gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                gap: gridGap,
                maxWidth: gridMaxWidth ? `${gridMaxWidth}px` : '100%'
              }}
            >
              {/* 当前范围内每天：月/周/区间使用 large 单元格，便于展示日期/节日文本 */}
              {days.map((day) =>
                buildDayCell(
                  day,
                  viewMode === 'month' || viewMode === 'week' || viewMode === 'range'
                    ? 'large'
                    : 'compact'
                )
              )}
            </div>
          )}
        </div>
      )}
      </div>

      {tooltip ? (
        <div
          ref={tooltipRef}
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
        <div
          className="fixed inset-0 z-40 flex items-end justify-center bg-black/20 p-4 md:items-center"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setSelectedISODate(null);
          }}
        >
          <div
            ref={modalRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`day-dialog-title-${selectedDay.isoDate}`}
            className="w-full max-w-[520px] rounded-2xl border border-zinc-200/70 bg-white/90 p-4 shadow-[0_22px_70px_rgba(0,0,0,0.14)] backdrop-blur-xl outline-none"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div
                  id={`day-dialog-title-${selectedDay.isoDate}`}
                  className="text-sm text-zinc-950"
                >
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
