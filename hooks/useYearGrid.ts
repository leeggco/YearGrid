import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { format, startOfDay, parseISO, isAfter, isBefore, addDays } from 'date-fns';
import { ViewMode } from './useYearProgress';
import { BodyState, CellClickPreference, Entry, RangeMilestone } from '@/lib/types';
import { SavedRange, ThemeColor } from '@/components/RangeSelector';
import { makeUniqueRangeName, safeParseJSON } from '@/lib/utils';
import { 
  normalizeEntries, 
  normalizeRanges, 
  normalizeViewPref
} from '@/lib/normalization';

interface UseYearGridOptions {
  initialNowISO?: string;
}

export function useYearGrid({}: UseYearGridOptions) {
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
  const [highlightWeekends, setHighlightWeekends] = useState(true);
  const [highlightHolidays, setHighlightHolidays] = useState(true);
  const [guideDismissed, setGuideDismissed] = useState(true);
  const [cellClickPreference, setCellClickPreference] = useState<CellClickPreference>('open');
  const [isEditingRange, setIsEditingRange] = useState(false);
  const [rangeDraftColor, setRangeDraftColor] = useState<ThemeColor>('emerald');
  const [rangeDraftGoal, setRangeDraftGoal] = useState('');
  const [rangeDraftMilestones, setRangeDraftMilestones] = useState<RangeMilestone[]>([]);
  const [rangeDraftIsCompleted, setRangeDraftIsCompleted] = useState(false);
  const [rangeDraftCompletedAtISO, setRangeDraftCompletedAtISO] = useState<string | null>(null);
  const [rangeDraftSaving, setRangeDraftSaving] = useState(false);
  const [dragStartISO, setDragStartISO] = useState<string | null>(null);
  const [dragCurrentISO, setDragCurrentISO] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

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
        setRangeDraftColor(found.color || 'emerald');
        setRangeDraftGoal(found.goal || '');
        setRangeDraftMilestones(found.milestones || []);
        setRangeDraftIsCompleted(!!found.isCompleted);
        setRangeDraftCompletedAtISO(found.completedAtISO || null);
        setEntries(found.entries || {});
      }
    } else {
      setEntries({});
    }

    if (pref) {
      if (pref.mode) setViewMode(pref.mode);
      if (pref.anchorISO) setAnchorISO(pref.anchorISO);
      if (pref.cellClickPreference) setCellClickPreference(pref.cellClickPreference);
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
    setRangeDraftColor(found.color || 'emerald');
    setRangeDraftGoal(found.goal || '');
    setRangeDraftMilestones(found.milestones || []);
    setRangeDraftIsCompleted(!!found.isCompleted);
    setRangeDraftCompletedAtISO(found.completedAtISO || null);
  }, [activeRangeId, ranges, rangesLoaded]);

  useEffect(() => {
    if (!viewPrefLoaded) return;
    localStorage.setItem('yeargrid_view_pref_v1', JSON.stringify({
      mode: viewMode,
      anchorISO,
      customStartISO,
      customEndISO,
      activeRangeId,
      cellClickPreference
    }));
  }, [activeRangeId, anchorISO, cellClickPreference, customEndISO, customStartISO, viewMode, viewPrefLoaded]);

  // Handlers
  const applyRangeDraftToActive = useCallback(() => {
    if (!rangeDraftValid) return;
    setCustomStartISO(rangeDraftStartISO);
    setCustomEndISO(rangeDraftEndISO);
    const desiredName = rangeDraftName.trim() || '新篇章';
    const safeGoal = rangeDraftGoal.trim() || undefined;
    const safeMilestones = rangeDraftMilestones.filter((m) => m.text.trim()).slice(0, 20);
    const safeIsCompleted = rangeDraftIsCompleted ? true : undefined;
    const safeCompletedAtISO = rangeDraftIsCompleted
      ? (rangeDraftCompletedAtISO ?? new Date().toISOString())
      : undefined;

    if (!activeRangeId) {
      const id = `range_${Date.now()}`;
      setRanges((prev) => {
        const name = makeUniqueRangeName(desiredName, prev);
        return [
          ...prev,
          {
            id,
            name,
            startISO: rangeDraftStartISO,
            endISO: rangeDraftEndISO,
            color: rangeDraftColor,
            ...(safeGoal ? { goal: safeGoal } : {}),
            ...(safeMilestones.length ? { milestones: safeMilestones } : {}),
            ...(safeIsCompleted ? { isCompleted: safeIsCompleted } : {}),
            ...(safeCompletedAtISO ? { completedAtISO: safeCompletedAtISO } : {})
          }
        ];
      });
      setActiveRangeId(id);
      return;
    }

    setRanges((prev) => prev.map((r) => r.id === activeRangeId ? {
      ...r,
      name: desiredName,
      startISO: rangeDraftStartISO,
      endISO: rangeDraftEndISO,
      color: rangeDraftColor,
      ...(safeGoal ? { goal: safeGoal } : { goal: undefined }),
      milestones: safeMilestones.length ? safeMilestones : undefined,
      isCompleted: safeIsCompleted,
      completedAtISO: safeCompletedAtISO
    } : r));
  }, [
    activeRangeId,
    rangeDraftColor,
    rangeDraftCompletedAtISO,
    rangeDraftEndISO,
    rangeDraftGoal,
    rangeDraftIsCompleted,
    rangeDraftMilestones,
    rangeDraftName,
    rangeDraftStartISO,
    rangeDraftValid
  ]);

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

  const beginCreateRange = useCallback((options?: { startISO?: string; endISO?: string; setVisibleDefault?: boolean; prefillDraft?: boolean; name?: string }) => {
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
    setRangeDraftName(makeUniqueRangeName(options?.name?.trim() || '新篇章', ranges));
    setRangeDraftStartISO(options?.prefillDraft ? startISO : '');
    setRangeDraftEndISO(options?.prefillDraft ? endISO : '');
    setRangeDraftColor('emerald');
    setRangeDraftGoal('');
    setRangeDraftMilestones([]);
    setRangeDraftIsCompleted(false);
    setRangeDraftCompletedAtISO(null);
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
    setRangeDraftGoal('');
    setRangeDraftMilestones([]);
    setRangeDraftIsCompleted(false);
    setRangeDraftCompletedAtISO(null);
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
    guideDismissed, setGuideDismissed,
    cellClickPreference, setCellClickPreference,
    isEditingRange, setIsEditingRange,
    isRangeEditing, isCreatingRange,
    rangeDraftColor, setRangeDraftColor,
    rangeDraftGoal, setRangeDraftGoal,
    rangeDraftMilestones, setRangeDraftMilestones,
    rangeDraftIsCompleted, setRangeDraftIsCompleted,
    rangeDraftCompletedAtISO, setRangeDraftCompletedAtISO,
    rangeDraftSaving, setRangeDraftSaving,
    rangeDraftValid,
    dragStartISO, setDragStartISO,
    dragCurrentISO, setDragCurrentISO,
    isDragging, setIsDragging,
    applyRangeDraftToActive,
    deleteActiveRange,
    beginCreateRange,
    cancelCreateRange,
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
          note,
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
