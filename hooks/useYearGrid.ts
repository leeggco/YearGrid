import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { format, startOfDay, parseISO, isAfter, isBefore, addDays } from 'date-fns';
import { ViewMode, YearDay } from './useYearProgress';
import { BodyState, Entry } from '@/lib/types';
import { SavedRange, ThemeColor } from '@/components/RangeSelector';
import { makeUniqueRangeName, safeParseJSON, clamp } from '@/lib/utils';
import { 
  normalizeEntries, 
  normalizeRanges, 
  normalizeViewPref, 
  mergeRanges 
} from '@/lib/normalization';

interface UseYearGridOptions {
  initialNowISO?: string;
}

export function useYearGrid({ initialNowISO }: UseYearGridOptions) {
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [anchorISO, setAnchorISO] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [customStartISO, setCustomStartISO] = useState('');
  const [customEndISO, setCustomEndISO] = useState('');
  const [ranges, setRanges] = useState<SavedRange[]>([]);
  const [activeRangeId, setActiveRangeId] = useState<string | null>(null);
  const [rangeDraftStartISO, setRangeDraftStartISO] = useState('');
  const [rangeDraftEndISO, setRangeDraftEndISO] = useState('');
  const [rangeDraftName, setRangeDraftName] = useState('');
  const [viewPrefLoaded, setViewPrefLoaded] = useState(false);
  const [rangesLoaded, setRangesLoaded] = useState(false);
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
  const [ioStatus, setIOStatus] = useState<{ kind: 'ok' | 'error'; message: string } | null>(null);

  const prevActiveRangeIdRef = useRef<string | null>(null);
  const createOriginActiveRangeIdRef = useRef<string | null>(null);
  const createOriginCustomStartISORef = useRef<string | null>(null);
  const createOriginCustomEndISORef = useRef<string | null>(null);

  const activeRange = useMemo(() => {
    if (!activeRangeId) return null;
    return ranges.find((r) => r.id === activeRangeId) ?? null;
  }, [activeRangeId, ranges]);

  const isRangeEditing = viewMode === 'range' && isEditingRange;
  const isCreatingRange = isRangeEditing && activeRangeId === null;

  const rangeDraftValid = useMemo(() => {
    try {
      const start = startOfDay(parseISO(rangeDraftStartISO));
      const end = startOfDay(parseISO(rangeDraftEndISO));
      return !isAfter(start, end);
    } catch {
      return false;
    }
  }, [rangeDraftEndISO, rangeDraftStartISO]);

  // Initial load
  useEffect(() => {
    const defaultRange: SavedRange = {
      id: 'default',
      name: '我的年份',
      startISO: format(new Date(new Date().getFullYear(), 0, 1), 'yyyy-MM-dd'),
      endISO: format(new Date(new Date().getFullYear(), 11, 31), 'yyyy-MM-dd'),
      color: 'emerald'
    };

    const rawRanges = localStorage.getItem('yeargrid_ranges_v1');
    let loadedRanges: SavedRange[] = [];
    let isCorruptRanges = false;
    let normalizedFromRaw: SavedRange[] | null = null;
    const hasStoredRangesKey = rawRanges !== null;

    if (rawRanges) {
      const parsedRanges = safeParseJSON(rawRanges);
      normalizedFromRaw = normalizeRanges(parsedRanges);
      if (normalizedFromRaw === null && parsedRanges !== null) {
        isCorruptRanges = true;
      }
      loadedRanges = normalizedFromRaw ?? [];
    }

    if (loadedRanges.length === 0 && !isCorruptRanges) {
      loadedRanges = [defaultRange];
    } else if (isCorruptRanges) {
      loadedRanges = normalizedFromRaw ?? [];
    }

    const rawEntries = localStorage.getItem('yeargrid_entries_v1');
    if (rawEntries) {
      const parsedEntries = safeParseJSON(rawEntries);
      const normalizedEntries = normalizeEntries(parsedEntries);
      if (normalizedEntries && Object.keys(normalizedEntries).length > 0) {
        if (loadedRanges.length === 0 && !hasStoredRangesKey) {
          loadedRanges = [{ ...defaultRange, entries: normalizedEntries }];
        } else if (loadedRanges[0] && (!loadedRanges[0].entries || Object.keys(loadedRanges[0].entries).length === 0)) {
          loadedRanges[0].entries = normalizedEntries;
        }
      }
    }

    setRanges(loadedRanges);
    setRangesLoaded(true);

    const rawPref = localStorage.getItem('yeargrid_view_pref_v1');
    const pref = normalizeViewPref(safeParseJSON(rawPref));
    let initialActiveId = loadedRanges[0]?.id ?? null;
    
    if (pref?.activeRangeId) {
      const found = loadedRanges.find((r) => r.id === pref.activeRangeId);
      if (found) initialActiveId = found.id;
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
        setEntries(found.entries || {});
      }
    } else {
      setEntries({});
    }

    if (pref) {
      if (pref.mode) setViewMode(pref.mode);
      if (pref.anchorISO) setAnchorISO(pref.anchorISO);
    }

    setEntriesLoaded(true);
    setViewPrefLoaded(true);
    setGuideDismissed(localStorage.getItem('yeargrid_guide_dismissed_v1') === '1');
  }, []);

  // Persistence effects
  useEffect(() => {
    if (!entriesLoaded || !rangesLoaded || !activeRangeId) return;
    setRanges(prev => {
      const idx = prev.findIndex(r => r.id === activeRangeId);
      if (idx === -1 || prev[idx].entries === entries) return prev;
      const nextRanges = [...prev];
      nextRanges[idx] = { ...prev[idx], entries };
      return nextRanges;
    });
  }, [entries, activeRangeId, entriesLoaded, rangesLoaded]);

  useEffect(() => {
    if (rangesLoaded) localStorage.setItem('yeargrid_ranges_v1', JSON.stringify(ranges));
  }, [ranges, rangesLoaded]);

  useEffect(() => {
    if (!rangesLoaded || !activeRangeId || prevActiveRangeIdRef.current === activeRangeId) return;
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
    setRangeDraftName(found.name);
  }, [activeRangeId, ranges, rangesLoaded]);

  useEffect(() => {
    if (!viewPrefLoaded) return;
    localStorage.setItem('yeargrid_view_pref_v1', JSON.stringify({
      mode: viewMode,
      anchorISO,
      customStartISO,
      customEndISO,
      activeRangeId
    }));
  }, [activeRangeId, anchorISO, customEndISO, customStartISO, viewMode, viewPrefLoaded]);

  // Handlers
  const applyRangeDraftToActive = useCallback(() => {
    if (!rangeDraftValid) return;
    setCustomStartISO(rangeDraftStartISO);
    setCustomEndISO(rangeDraftEndISO);
    const desiredName = rangeDraftName.trim() || '新篇章';

    if (!activeRangeId) {
      const id = `range_${Date.now()}`;
      setRanges((prev) => {
        const name = makeUniqueRangeName(desiredName, prev);
        return [...prev, { id, name, startISO: rangeDraftStartISO, endISO: rangeDraftEndISO, color: rangeDraftColor }];
      });
      setActiveRangeId(id);
      return;
    }

    setRanges((prev) => prev.map((r) => r.id === activeRangeId ? {
      ...r, name: desiredName, startISO: rangeDraftStartISO, endISO: rangeDraftEndISO, color: rangeDraftColor
    } : r));
  }, [activeRangeId, rangeDraftColor, rangeDraftEndISO, rangeDraftName, rangeDraftStartISO, rangeDraftValid]);

  const deleteActiveRange = useCallback(() => {
    if (!activeRangeId) return;
    const index = ranges.findIndex((r) => r.id === activeRangeId);
    if (index < 0) return;
    const nextRanges = ranges.filter((r) => r.id !== activeRangeId);
    const nextActive = nextRanges.length > 0 ? nextRanges[Math.min(index, nextRanges.length - 1)] : null;
    
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
      setEntries({});
    }
    setIsEditingRange(false);
  }, [activeRangeId, ranges]);

  const beginCreateRange = useCallback((options?: { startISO?: string; endISO?: string; setVisibleDefault?: boolean }) => {
    const base = startOfDay(new Date());
    const startISO = options?.startISO ?? format(base, 'yyyy-MM-dd');
    const endISO = options?.endISO ?? format(addDays(base, 100), 'yyyy-MM-dd');

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
  }, [activeRangeId, customEndISO, customStartISO, ranges]);

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

  const toggleStateFilter = useCallback((state: BodyState) => {
    if (state === 0) return;
    setStateFilters((prev) => {
      const exists = prev.includes(state);
      const next = exists ? prev.filter((s) => s !== state) : [...prev, state];
      next.sort((a, b) => a - b);
      return next;
    });
  }, []);

  const clearFilters = useCallback(() => {
    setHighlightWeekends(false);
    setHighlightHolidays(false);
    setHighlightThisMonth(false);
    setRecordFilter('all');
    setNoteOnly(false);
    setStateFilters([]);
    setNoteQuery('');
  }, []);

  const exportData = useCallback(() => {
    const payload = {
      version: 1,
      exportedAtISO: new Date().toISOString(),
      entries,
      ranges,
      viewPref: { mode: viewMode, anchorISO, customStartISO, customEndISO, activeRangeId },
      guideDismissed
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
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

      const nextRanges: SavedRange[] =
        importedRanges && importedRanges.length > 0
          ? overwrite
            ? importedRanges
            : mergeRanges(ranges, importedRanges)
          : ranges;

      setEntries(nextEntries);
      if (importedRanges && importedRanges.length > 0) {
        setRanges(nextRanges);
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
      }

      setIsEditingRange(false);
      setIOStatus({ kind: 'ok', message: overwrite ? '导入完成：已覆盖本地数据。' : '导入完成：已合并本地数据。' });
    },
    [entries, ranges]
  );

  return {
    viewMode, setViewMode,
    anchorISO, setAnchorISO,
    customStartISO, setCustomStartISO,
    customEndISO, setCustomEndISO,
    ranges, setRanges,
    activeRangeId, setActiveRangeId,
    activeRange,
    rangeDraftStartISO, setRangeDraftStartISO,
    rangeDraftEndISO, setRangeDraftEndISO,
    rangeDraftName, setRangeDraftName,
    entries, setEntries,
    selectedISODate, setSelectedISODate,
    focusedISODate, setFocusedISODate,
    highlightWeekends, setHighlightWeekends,
    highlightHolidays, setHighlightHolidays,
    highlightThisMonth, setHighlightThisMonth,
    recordFilter, setRecordFilter,
    noteOnly, setNoteOnly,
    stateFilters, setStateFilters,
    noteQuery, setNoteQuery,
    guideDismissed, setGuideDismissed,
    showFilters, setShowFilters,
    isEditingRange, setIsEditingRange,
    isRangeEditing, isCreatingRange,
    rangeDraftColor, setRangeDraftColor,
    rangeDraftSaving, setRangeDraftSaving,
    rangeDraftValid,
    dragStartISO, setDragStartISO,
    dragCurrentISO, setDragCurrentISO,
    isDragging, setIsDragging,
    ioStatus, setIOStatus,
    applyRangeDraftToActive,
    deleteActiveRange,
    beginCreateRange,
    cancelCreateRange,
    toggleStateFilter,
    clearFilters,
    exportData,
    onImportFileChange,
    dismissGuide: () => {
      localStorage.setItem('yeargrid_guide_dismissed_v1', '1');
      setGuideDismissed(true);
    },
    startNewRange: () => {
      setViewMode('range');
      beginCreateRange({ setVisibleDefault: true });
    },
    updateEntry: (isoDate: string, state: BodyState, note: string) => {
      setEntries((prev) => ({
        ...prev,
        [isoDate]: {
          state,
          note: note.slice(0, 50),
          updatedAtISO: new Date().toISOString()
        }
      }));
    },
    deleteEntry: (isoDate: string) => {
      setEntries((prev) => {
        const next = { ...prev };
        delete next[isoDate];
        return next;
      });
    }
  };
}
