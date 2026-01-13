'use client';

import {
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Filter,
  Plus,
  Settings2,
  Trash2,
  Upload,
  X
} from 'lucide-react';
import type { FocusEvent, KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
    if (typeof id !== 'string' || typeof startISO !== 'string' || typeof endISO !== 'string') continue;
    const safeName = typeof name === 'string' ? name.trim() : '';
    try {
      const start = startOfDay(parseISO(startISO));
      const end = startOfDay(parseISO(endISO));
      if (isAfter(start, end)) continue;
    } catch {
      continue;
    }
    cleaned.push({
      id,
      name: safeName || '区间',
      startISO,
      endISO
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
  const [storageStatus, setStorageStatus] = useState<string | null>(null);
  const [ioStatus, setIOStatus] = useState<{ kind: 'ok' | 'error'; message: string } | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const tooltipSizeRef = useRef<{ w: number; h: number } | null>(null);
  const tooltipStateRef = useRef<TooltipState>(null);
  const columnsRef = useRef<number>(columns);

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

  const activeRangeIndex = useMemo(() => {
    if (!activeRangeId) return -1;
    return ranges.findIndex((r) => r.id === activeRangeId);
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

  const rangeDraftNameDuplicate = useMemo(() => {
    const candidate = rangeDraftResolvedName.trim();
    if (!candidate) return false;
    return ranges.some((r) => r.id !== activeRangeId && r.name.trim() === candidate);
  }, [activeRangeId, rangeDraftResolvedName, ranges]);

  const rangeDraftOverlapWith = useMemo(() => {
    if (!rangeDraftValid) return null;
    try {
      const draftStart = startOfDay(parseISO(rangeDraftStartISO));
      const draftEnd = startOfDay(parseISO(rangeDraftEndISO));
      for (const r of ranges) {
        if (r.id === activeRangeId) continue;
        const start = startOfDay(parseISO(r.startISO));
        const end = startOfDay(parseISO(r.endISO));
        const overlap = !isAfter(draftStart, end) && !isAfter(start, draftEnd);
        if (overlap) return r.name;
      }
      return null;
    } catch {
      return null;
    }
  }, [activeRangeId, rangeDraftEndISO, rangeDraftStartISO, rangeDraftValid, ranges]);

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
    const uniqueName = makeUniqueRangeName(rangeDraftResolvedName, ranges);
    const next: SavedRange = {
      id,
      name: uniqueName,
      startISO: rangeDraftStartISO,
      endISO: rangeDraftEndISO
    };
    setRanges((prev) => [...prev, next]);
    setActiveRangeId(id);
    setCustomStartISO(next.startISO);
    setCustomEndISO(next.endISO);
    setRangeDraftName('');
  };

  const moveActiveRange = useCallback(
    (direction: -1 | 1) => {
      if (!activeRangeId) return;
      const index = ranges.findIndex((r) => r.id === activeRangeId);
      if (index < 0) return;
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= ranges.length) return;
      const next = [...ranges];
      const tmp = next[index];
      next[index] = next[nextIndex];
      next[nextIndex] = tmp;
      setRanges(next);
    },
    [activeRangeId, ranges]
  );

  const deleteActiveRange = useCallback(() => {
    if (!activeRangeId) return;
    if (ranges.length <= 1) return;
    const index = ranges.findIndex((r) => r.id === activeRangeId);
    if (index < 0) return;
    const nextRanges = ranges.filter((r) => r.id !== activeRangeId);
    const nextActive = nextRanges[Math.min(index, nextRanges.length - 1)] ?? null;
    setRanges(nextRanges);
    setActiveRangeId(nextActive?.id ?? null);
    if (nextActive) {
      setCustomStartISO(nextActive.startISO);
      setCustomEndISO(nextActive.endISO);
      setRangeDraftStartISO(nextActive.startISO);
      setRangeDraftEndISO(nextActive.endISO);
      setRangeDraftName(nextActive.name);
    }
    setIsEditingRange(false);
  }, [activeRangeId, ranges]);

  const duplicateActiveRange = useCallback(() => {
    if (!activeRangeId) return;
    const index = ranges.findIndex((r) => r.id === activeRangeId);
    if (index < 0) return;
    const current = ranges[index];
    if (!current) return;
    const id = `range_${Date.now()}`;
    const desired = `${current.name} 副本`;
    const name = makeUniqueRangeName(desired, ranges);
    const next: SavedRange = { id, name, startISO: current.startISO, endISO: current.endISO };
    const nextRanges = [...ranges.slice(0, index + 1), next, ...ranges.slice(index + 1)];
    setRanges(nextRanges);
    setActiveRangeId(id);
    setCustomStartISO(next.startISO);
    setCustomEndISO(next.endISO);
    setRangeDraftStartISO(next.startISO);
    setRangeDraftEndISO(next.endISO);
    setRangeDraftName(next.name);
    setIsEditingRange(false);
  }, [activeRangeId, ranges]);

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

  const scopeLabel = useMemo(() => {
    if (viewMode === 'year') return format(rangeStart, 'yyyy年');
    if (viewMode === 'month') return format(rangeStart, 'yyyy年MM月');
    if (viewMode === 'week')
      return `${format(rangeStart, 'MM.dd')} - ${format(rangeEnd, 'MM.dd')}`;
    return `${format(rangeStart, 'MM.dd')} - ${format(rangeEnd, 'MM.dd')}`;
  }, [rangeEnd, rangeStart, viewMode]);

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
    const rawEntries = localStorage.getItem('yeargrid_entries_v1');
    const parsedEntries = safeParseJSON(rawEntries);
    const normalizedEntries = normalizeEntries(parsedEntries);
    if (rawEntries && parsedEntries === null) {
      localStorage.setItem(`yeargrid_entries_v1_corrupt_${Date.now()}`, rawEntries);
      localStorage.removeItem('yeargrid_entries_v1');
      setStorageStatus('检测到本地 entries 数据损坏，已备份并重置。');
    }

    if (normalizedEntries) {
      setEntries(normalizedEntries);
    } else {
      const rawMarks = localStorage.getItem('yeargrid_marks_v1');
      const parsedMarks = safeParseJSON(rawMarks);
      if (rawMarks && parsedMarks === null) {
        localStorage.setItem(`yeargrid_marks_v1_corrupt_${Date.now()}`, rawMarks);
        localStorage.removeItem('yeargrid_marks_v1');
        setStorageStatus((prev) => prev ?? '检测到本地 marks 数据损坏，已备份并重置。');
      }

      if (parsedMarks && typeof parsedMarks === 'object') {
        const next: Record<string, Entry> = {};
        for (const [isoDate, value] of Object.entries(parsedMarks as Record<string, unknown>)) {
          if (!value || typeof value !== 'object') continue;
          const kind = (value as { kind?: unknown }).kind;
          const note =
            typeof (value as { note?: unknown }).note === 'string'
              ? (value as { note: string }).note
              : '';
          const state: BodyState = kind === 'done' ? 4 : kind === 'event' ? 3 : 0;
          if (state !== 0 || note.trim() !== '') next[isoDate] = { state, note: note.slice(0, 50) };
        }
        setEntries(next);
        localStorage.setItem('yeargrid_entries_v1', JSON.stringify(next));
        localStorage.removeItem('yeargrid_marks_v1');
      }
    }

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
    const parsedRanges = safeParseJSON(rawRanges);
    const normalizedRanges = normalizeRanges(parsedRanges);
    if (rawRanges && parsedRanges === null) {
      localStorage.setItem(`yeargrid_ranges_v1_corrupt_${Date.now()}`, rawRanges);
      localStorage.removeItem('yeargrid_ranges_v1');
      setStorageStatus((prev) => prev ?? '检测到本地 ranges 数据损坏，已备份并重置。');
    }
    if (normalizedRanges && normalizedRanges.length > 0) {
      loadedRanges = normalizedRanges;
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
    const parsedPref = safeParseJSON(rawPref);
    const pref = normalizeViewPref(parsedPref);
    if (rawPref && parsedPref === null) {
      localStorage.setItem(`yeargrid_view_pref_v1_corrupt_${Date.now()}`, rawPref);
      localStorage.removeItem('yeargrid_view_pref_v1');
      setStorageStatus((prev) => prev ?? '检测到本地 view_pref 数据损坏，已备份并重置。');
    }
    if (pref) {
      if (pref.mode) setViewMode(pref.mode);
      if (pref.anchorISO) setAnchorISO(pref.anchorISO);

      if (pref.activeRangeId) {
        const found = loadedRanges.find((r) => r.id === pref.activeRangeId) ?? null;
        if (found) {
          setActiveRangeId(found.id);
          setCustomStartISO(found.startISO);
          setCustomEndISO(found.endISO);
          setRangeDraftStartISO(found.startISO);
          setRangeDraftEndISO(found.endISO);
          setRangeDraftName(found.name);
        }
      } else if (pref.customStartISO && pref.customEndISO) {
        setCustomStartISO(pref.customStartISO);
        setCustomEndISO(pref.customEndISO);
        setRangeDraftStartISO(pref.customStartISO);
        setRangeDraftEndISO(pref.customEndISO);
        if (pref.mode === 'range') {
          const id = `range_${Date.now()}`;
          const desiredName = `区间${loadedRanges.length + 1}`;
          const name = makeUniqueRangeName(desiredName, loadedRanges);
          const next: SavedRange = { id, name, startISO: pref.customStartISO, endISO: pref.customEndISO };
          loadedRanges = [...loadedRanges, next];
          setRanges(loadedRanges);
          setActiveRangeId(id);
          setRangeDraftName(name);
        }
      }
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
        setColumns((prev) => (prev === 7 ? prev : 7));
        const nextMax = Math.min(availableWidth, neededWidth);
        setGridMaxWidth((prev) => (prev === nextMax ? prev : nextMax));
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
  }, [clampTooltipPosition]);

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
    setFocusedISODate(day.isoDate);
    setSelectedISODate(day.isoDate);
  }, []);

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
        className="sticky top-14 z-20 mb-4 border-b border-zinc-200/60 bg-white/80 px-4 py-3 backdrop-blur-md md:mb-6"
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
            <div className="flex flex-col items-end">
              <div className="text-xl font-bold tracking-tight text-zinc-900 md:text-2xl">
                {percentText}
              </div>
              <div className="mt-0.5 text-[10px] font-medium text-zinc-400">
                {scopeLabel}
              </div>
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

        <div className="mt-3">
          <div className="h-1.5 w-full rounded-full bg-zinc-100">
            <div
              className="h-1.5 rounded-full bg-zinc-900/80"
              style={{ width: `${percent}%` }}
            />
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
                <div className="absolute top-full z-30 mt-1 flex animate-in fade-in slide-in-from-top-2 flex-col gap-2 rounded-xl border border-zinc-200/60 bg-white/90 p-2 shadow-lg backdrop-blur-xl">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={activeRangeIndex <= 0}
                      className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-700 disabled:opacity-40"
                      onClick={() => moveActiveRange(-1)}
                      title="左移"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={activeRangeIndex < 0 || activeRangeIndex >= ranges.length - 1}
                      className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-700 disabled:opacity-40"
                      onClick={() => moveActiveRange(1)}
                      title="右移"
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                    <div className="h-4 w-px bg-zinc-200" />
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
                      title="保存"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={!activeRangeId}
                      className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-700 disabled:opacity-40"
                      onClick={duplicateActiveRange}
                      title="复制当前区间"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={!activeRangeId || ranges.length <= 1}
                      className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-700 disabled:opacity-40"
                      onClick={deleteActiveRange}
                      title={ranges.length <= 1 ? '至少保留一个区间' : '删除当前区间'}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {(rangeDraftNameDuplicate || rangeDraftOverlapWith) && (
                    <div className="flex flex-col gap-1 px-1 text-[10px] text-amber-600">
                      {rangeDraftNameDuplicate && <div>名称与其他区间重复</div>}
                      {rangeDraftOverlapWith && (
                        <div>与“{rangeDraftOverlapWith}”时间重叠</div>
                      )}
                    </div>
                  )}
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
              <div className="flex flex-wrap items-center gap-2">
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
                <div className="h-4 w-px bg-zinc-200" />
                <button
                  type="button"
                  aria-pressed={recordFilter === 'recorded'}
                  className={`rounded-full border px-2.5 py-0.5 text-[10px] transition ${
                    recordFilter === 'recorded'
                      ? 'border-zinc-300 bg-zinc-100 text-zinc-900'
                      : 'border-zinc-200 bg-white text-zinc-500 hover:bg-zinc-50'
                  }`}
                  onClick={() =>
                    setRecordFilter((v) => (v === 'recorded' ? 'all' : 'recorded'))
                  }
                >
                  已记录
                </button>
                <button
                  type="button"
                  aria-pressed={recordFilter === 'unrecorded'}
                  className={`rounded-full border px-2.5 py-0.5 text-[10px] transition ${
                    recordFilter === 'unrecorded'
                      ? 'border-zinc-300 bg-zinc-100 text-zinc-900'
                      : 'border-zinc-200 bg-white text-zinc-500 hover:bg-zinc-50'
                  }`}
                  onClick={() =>
                    setRecordFilter((v) => (v === 'unrecorded' ? 'all' : 'unrecorded'))
                  }
                >
                  未记录
                </button>
                <button
                  type="button"
                  aria-pressed={noteOnly}
                  className={`rounded-full border px-2.5 py-0.5 text-[10px] transition ${
                    noteOnly
                      ? 'border-zinc-300 bg-zinc-100 text-zinc-900'
                      : 'border-zinc-200 bg-white text-zinc-500 hover:bg-zinc-50'
                  }`}
                  onClick={() => setNoteOnly((v) => !v)}
                >
                  有备注
                </button>
                <div className="h-4 w-px bg-zinc-200" />
                <div className="flex items-center gap-1">
                  {([1, 2, 3, 4, 5] as const).map((s) => {
                    const active = stateFilters.includes(s);
                    return (
                      <button
                        key={s}
                        type="button"
                        aria-pressed={active}
                        className={`rounded-full border px-2 py-0.5 text-[10px] transition ${
                          active
                            ? 'border-zinc-300 bg-zinc-100 text-zinc-900'
                            : 'border-zinc-200 bg-white text-zinc-500 hover:bg-zinc-50'
                        }`}
                        onClick={() => toggleStateFilter(s)}
                        title={stateMeta[s].label}
                      >
                        {stateMeta[s].emoji}
                      </button>
                    );
                  })}
                </div>
                <div className="h-4 w-px bg-zinc-200" />
                <input
                  type="text"
                  className="h-6 w-[18ch] rounded-md border border-zinc-200 bg-white px-2 text-[10px] text-zinc-900 outline-none focus:border-zinc-300"
                  placeholder="搜备注"
                  value={noteQuery}
                  onChange={(e) => setNoteQuery(e.target.value)}
                />
                <button
                  type="button"
                  className="rounded-full border border-zinc-200 bg-white px-2.5 py-0.5 text-[10px] text-zinc-500 hover:bg-zinc-50"
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
                  className="flex items-center gap-1 rounded-full border border-zinc-200 bg-white px-2.5 py-0.5 text-[10px] text-zinc-500 hover:bg-zinc-50"
                  onClick={exportData}
                >
                  <Download className="h-3 w-3" />
                  导出
                </button>
                <button
                  type="button"
                  className="flex items-center gap-1 rounded-full border border-zinc-200 bg-white px-2.5 py-0.5 text-[10px] text-zinc-500 hover:bg-zinc-50"
                  onClick={triggerImport}
                >
                  <Upload className="h-3 w-3" />
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
            {(storageStatus || ioStatus) && (
              <div className="mt-3 flex items-center justify-center">
                <div
                  className={`rounded-full border px-3 py-1 text-[10px] ${
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

      <div className="flex w-full flex-1 justify-center overflow-y-auto px-4 pb-4">
        <div
          ref={gridRef}
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
          className="grid h-fit w-full"
          style={{
            gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
            gap: 4,
            maxWidth: gridMaxWidth ? `${gridMaxWidth}px` : '100%'
          }}
        >
          {days.map((day) => {
            const entry = entries[day.isoDate] ?? null;
            const selected = selectedISODate === day.isoDate;

            const propertyHighlightActive =
              highlightWeekends || highlightHolidays || effectiveHighlightThisMonth;
            const propertyMatch =
              !propertyHighlightActive ||
              (highlightWeekends && day.isWeekend) ||
              (highlightHolidays && !!day.holiday) ||
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
            const dimmed = anyFilter && !matches;

            return (
              <DayCell
                key={day.isoDate}
                dataIso={day.isoDate}
                tabIndex={focusedISODate === day.isoDate ? 0 : -1}
                day={day}
                dimmed={dimmed}
                selected={selected}
                entry={entry}
                onHover={handleCellHover}
                onMove={handleCellMove}
                onLeave={handleCellLeave}
                onFocus={handleCellFocus}
                onBlur={handleCellBlur}
                onKeyDown={handleCellKeyDown}
                onClick={handleCellClick}
              />
            );
          })}
      </div>
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
