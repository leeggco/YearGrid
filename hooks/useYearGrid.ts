import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { format, startOfDay, parseISO, isAfter, isBefore, addDays } from 'date-fns';
import { ViewMode } from './useYearProgress';
import { BodyState, CellClickPreference, Entry, RangeMilestone } from '@/lib/types';
import { SavedRange, ThemeColor } from '@/components/RangeSelector';
import { makeUniqueRangeName } from '@/lib/utils';
import { getSupabaseClient } from '@/lib/supabaseClient';

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
  const [guideDismissed, setGuideDismissed] = useState(false);
  const [cellClickPreference, setCellClickPreference] = useState<CellClickPreference>('open');
  const [viewPrefUpdatedAtISO, setViewPrefUpdatedAtISO] = useState<string | null>(null);
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
  const [entryTombstones, setEntryTombstones] = useState<Record<string, string>>({});
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'ok' | 'error'>('idle');
  const [syncError, setSyncError] = useState<string | null>(null);
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  const prevActiveRangeIdRef = useRef<string | null>(null);
  const createOriginActiveRangeIdRef = useRef<string | null>(null);
  const createOriginCustomStartISORef = useRef<string | null>(null);
  const createOriginCustomEndISORef = useRef<string | null>(null);
  const isApplyingRemoteRef = useRef(false);
  const syncedUserIdRef = useRef<string | null>(null);
  const initialSyncInFlightRef = useRef(false);
  const rangesDirtyRef = useRef(false);
  const entriesDirtyRef = useRef(false);
  const prefDirtyRef = useRef(false);
  const tombstonesDirtyRef = useRef(false);
  const lastPrefSnapshotRef = useRef<string>('');

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

    setRanges([defaultRange]);
    setRangesLoaded(true);
    setActiveRangeId(defaultRange.id);
    setCustomStartISO(defaultRange.startISO);
    setCustomEndISO(defaultRange.endISO);
    setRangeDraftStartISO(defaultRange.startISO);
    setRangeDraftEndISO(defaultRange.endISO);
    setRangeDraftName(defaultRange.name);
    setRangeDraftColor(defaultRange.color || 'emerald');
    setEntries({});
    setEntriesLoaded(true);
    setViewPrefLoaded(true);

    rangesDirtyRef.current = true;
    prefDirtyRef.current = true;
    setIsDirty(true);
    setSyncStatus('idle');
    setSyncError(null);
  }, []);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    let canceled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (canceled) return;
      setAuthUserId(data.session?.user?.id ?? null);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthUserId(session?.user?.id ?? null);
    });

    return () => {
      canceled = true;
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (authUserId) return;
    syncedUserIdRef.current = null;
    initialSyncInFlightRef.current = false;
    setSyncStatus('idle');
    setSyncError(null);
  }, [authUserId]);

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
    if (isApplyingRemoteRef.current) return;
    const snapshot = JSON.stringify({
      viewMode,
      anchorISO,
      customStartISO,
      customEndISO,
      activeRangeId,
      cellClickPreference
    });
    if (!lastPrefSnapshotRef.current) {
      lastPrefSnapshotRef.current = snapshot;
      return;
    }
    if (snapshot === lastPrefSnapshotRef.current) return;
    lastPrefSnapshotRef.current = snapshot;
    const nowISO = new Date().toISOString();
    setViewPrefUpdatedAtISO(nowISO);
    prefDirtyRef.current = true;
    setIsDirty(true);
    setSyncStatus('idle');
    setSyncError(null);
  }, [
    activeRangeId,
    anchorISO,
    cellClickPreference,
    customEndISO,
    customStartISO,
    viewMode,
    viewPrefLoaded
  ]);

  useEffect(() => {
    if (!viewPrefLoaded) return;
    if (isApplyingRemoteRef.current) return;
    if (!viewPrefUpdatedAtISO) return;
    prefDirtyRef.current = true;
    setIsDirty(true);
    setSyncStatus('idle');
    setSyncError(null);
  }, [viewPrefLoaded, viewPrefUpdatedAtISO]);

  useEffect(() => {
    if (!rangesLoaded) return;
    if (isApplyingRemoteRef.current) return;
    rangesDirtyRef.current = true;
    setIsDirty(true);
    setSyncStatus('idle');
    setSyncError(null);
  }, [ranges, rangesLoaded]);

  useEffect(() => {
    if (!entriesLoaded) return;
    if (isApplyingRemoteRef.current) return;
    entriesDirtyRef.current = true;
    setIsDirty(true);
    setSyncStatus('idle');
    setSyncError(null);
  }, [entries, entriesLoaded]);

  useEffect(() => {
    if (!viewPrefLoaded) return;
    if (isApplyingRemoteRef.current) return;
    tombstonesDirtyRef.current = true;
    setIsDirty(true);
    setSyncStatus('idle');
    setSyncError(null);
  }, [entryTombstones, viewPrefLoaded]);

  const saveToSupabase = useCallback(async () => {
    if (!viewPrefLoaded || !rangesLoaded || !entriesLoaded) return false;
    if (!authUserId) return false;
    if (!isDirty) return false;
    if (syncStatus === 'syncing') return false;
    if (initialSyncInFlightRef.current) return false;
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    setSyncStatus('syncing');
    setSyncError(null);

    const nowISO = new Date().toISOString();
    const userId = authUserId;

    const rangesPayload = ranges.map((r) => ({
      user_id: userId,
      range_id: r.id,
      name: r.name,
      start_iso: r.startISO,
      end_iso: r.endISO,
      color: r.color ?? null,
      goal: r.goal ?? null,
      milestones: r.milestones ?? null,
      is_completed: r.isCompleted ?? null,
      completed_at: r.completedAtISO ?? null,
      updated_at: r.updatedAtISO ?? nowISO,
      deleted_at: r.deletedAtISO ?? null
    }));

    const { error: rangesError } = await supabase.from('yeargrid_ranges').upsert(rangesPayload, {
      onConflict: 'user_id,range_id'
    });
    if (rangesError) {
      setSyncStatus('error');
      setSyncError(rangesError.message);
      return false;
    }

    const prefPayload = {
      user_id: userId,
      mode: viewMode,
      anchor_iso: anchorISO,
      custom_start_iso: customStartISO || null,
      custom_end_iso: customEndISO || null,
      active_range_id: activeRangeId,
      cell_click_preference: cellClickPreference,
      updated_at: viewPrefUpdatedAtISO ?? nowISO
    };
    const { error: prefError } = await supabase.from('yeargrid_prefs').upsert(prefPayload, {
      onConflict: 'user_id'
    });
    if (prefError) {
      setSyncStatus('error');
      setSyncError(prefError.message);
      return false;
    }

    const rangeId = activeRangeId;
    if (rangeId) {
      const rows = Object.entries(entries).map(([isoDate, entry]) => ({
        user_id: userId,
        range_id: rangeId,
        iso_date: isoDate,
        state: entry.state,
        note: entry.note,
        updated_at: entry.updatedAtISO ?? nowISO,
        deleted_at: null
      }));

      const tombstoneRows = Object.entries(entryTombstones)
        .filter(([k]) => k.startsWith(`${rangeId}:`))
        .map(([k, deletedAtISO]) => {
          const isoDate = k.slice(rangeId.length + 1);
          return {
            user_id: userId,
            range_id: rangeId,
            iso_date: isoDate,
            state: 0,
            note: '',
            updated_at: deletedAtISO ?? nowISO,
            deleted_at: deletedAtISO ?? nowISO
          };
        });

      const combined = [...rows, ...tombstoneRows];
      if (combined.length) {
        const { error: entriesError } = await supabase.from('yeargrid_entries').upsert(combined, {
          onConflict: 'user_id,range_id,iso_date'
        });
        if (entriesError) {
          setSyncStatus('error');
          setSyncError(entriesError.message);
          return false;
        }
      }
    }

    rangesDirtyRef.current = false;
    entriesDirtyRef.current = false;
    prefDirtyRef.current = false;
    tombstonesDirtyRef.current = false;
    setIsDirty(false);
    setSyncStatus('ok');
    setSyncError(null);

    if (rangeId) {
      setEntryTombstones((prev) => {
        const prefix = `${rangeId}:`;
        const keys = Object.keys(prev).filter((k) => k.startsWith(prefix));
        if (keys.length === 0) return prev;
        const next = { ...prev };
        for (const k of keys) delete next[k];
        return next;
      });
    }
    return true;
  }, [
    activeRangeId,
    anchorISO,
    authUserId,
    cellClickPreference,
    customEndISO,
    customStartISO,
    entries,
    entriesLoaded,
    entryTombstones,
    isDirty,
    ranges,
    rangesLoaded,
    syncStatus,
    viewMode,
    viewPrefLoaded,
    viewPrefUpdatedAtISO
  ]);

  const applyRemoteMerge = useCallback(
    (nextRanges: SavedRange[], nextPref?: Partial<{
      mode: ViewMode;
      anchorISO: string;
      customStartISO: string | null;
      customEndISO: string | null;
      activeRangeId: string | null;
      cellClickPreference: CellClickPreference;
      updatedAtISO: string | null;
    }>) => {
      isApplyingRemoteRef.current = true;
      setRanges(nextRanges);

      const visible = nextRanges.filter((r) => !r.deletedAtISO);
      const desiredActive =
        (nextPref?.activeRangeId ? visible.find((r) => r.id === nextPref.activeRangeId)?.id : null) ??
        (activeRangeId ? visible.find((r) => r.id === activeRangeId)?.id : null) ??
        (visible[0]?.id ?? null);
      setActiveRangeId(desiredActive);

      if (nextPref) {
        if (nextPref.mode) setViewMode(nextPref.mode);
        if (nextPref.anchorISO) setAnchorISO(nextPref.anchorISO);
        if (nextPref.customStartISO !== undefined) setCustomStartISO(nextPref.customStartISO ?? '');
        if (nextPref.customEndISO !== undefined) setCustomEndISO(nextPref.customEndISO ?? '');
        if (nextPref.cellClickPreference) setCellClickPreference(nextPref.cellClickPreference);
        if (nextPref.updatedAtISO !== undefined) setViewPrefUpdatedAtISO(nextPref.updatedAtISO);
      }

      const active = desiredActive ? nextRanges.find((r) => r.id === desiredActive) ?? null : null;
      setEntries(active?.entries ?? {});
      setEntryTombstones({});

      rangesDirtyRef.current = false;
      entriesDirtyRef.current = false;
      prefDirtyRef.current = false;
      tombstonesDirtyRef.current = false;
      setIsDirty(false);
      setSyncStatus('ok');
      setSyncError(null);
      window.setTimeout(() => {
        isApplyingRemoteRef.current = false;
      }, 0);
    },
    [activeRangeId]
  );

  useEffect(() => {
    if (!viewPrefLoaded || !rangesLoaded || !entriesLoaded) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const userId = authUserId;
    if (!userId) return;
    if (syncedUserIdRef.current === userId) return;

    syncedUserIdRef.current = userId;
    (async () => {
      initialSyncInFlightRef.current = true;
      setSyncStatus('syncing');
      setSyncError(null);

      try {
        const [{ data: remoteRanges, error: rangesError }, { data: remoteEntries, error: entriesError }, { data: remotePref, error: prefError }] =
          await Promise.all([
            supabase
              .from('yeargrid_ranges')
              .select(
                'range_id,name,start_iso,end_iso,color,goal,milestones,is_completed,completed_at,updated_at,deleted_at'
              )
              .eq('user_id', userId),
            supabase
              .from('yeargrid_entries')
              .select('range_id,iso_date,state,note,updated_at,deleted_at')
              .eq('user_id', userId),
            supabase
              .from('yeargrid_prefs')
              .select('mode,anchor_iso,custom_start_iso,custom_end_iso,active_range_id,cell_click_preference,updated_at')
              .eq('user_id', userId)
              .maybeSingle()
          ]);

        const anyError = rangesError ?? entriesError ?? prefError ?? null;
        if (anyError) {
          setSyncStatus('error');
          setSyncError(anyError.message);
          return;
        }

        const remoteRangeRows = remoteRanges ?? [];
        if (remoteRangeRows.length === 0) {
          setEntryTombstones({});
          rangesDirtyRef.current = true;
          prefDirtyRef.current = true;
          setIsDirty(true);
          setSyncStatus('idle');
          setSyncError(null);
          return;
        }

        const nextRangesById = new Map<string, SavedRange>();
        for (const row of remoteRangeRows) {
          const id = row.range_id as string;
          if (!id) continue;
          nextRangesById.set(id, {
            id,
            name: (row.name as string) || '区间',
            startISO: (row.start_iso as string) || '',
            endISO: (row.end_iso as string) || '',
            ...(row.color ? { color: row.color as ThemeColor } : {}),
            ...(typeof row.goal === 'string' && row.goal.trim() ? { goal: row.goal.trim() } : {}),
            ...(Array.isArray(row.milestones) ? { milestones: row.milestones as RangeMilestone[] } : {}),
            ...(typeof row.is_completed === 'boolean' ? { isCompleted: row.is_completed as boolean } : {}),
            ...(typeof row.completed_at === 'string' ? { completedAtISO: row.completed_at as string } : {}),
            ...(typeof row.updated_at === 'string' ? { updatedAtISO: row.updated_at as string } : {}),
            ...(typeof row.deleted_at === 'string' ? { deletedAtISO: row.deleted_at as string } : {})
          });
        }

        const entriesByRangeId = new Map<string, Record<string, Entry>>();
        for (const row of remoteEntries ?? []) {
          const rangeId = row.range_id as string;
          const isoDate = row.iso_date as string;
          if (!rangeId || !isoDate) continue;
          const deletedAtISO = typeof row.deleted_at === 'string' ? (row.deleted_at as string) : null;
          if (deletedAtISO) continue;
          const state = (row.state ?? 0) as BodyState;
          const note = typeof row.note === 'string' ? (row.note as string) : '';
          const updatedAtISO = typeof row.updated_at === 'string' ? (row.updated_at as string) : undefined;
          const map = entriesByRangeId.get(rangeId) ?? {};
          map[isoDate] = {
            state,
            note,
            ...(updatedAtISO ? { updatedAtISO } : {})
          };
          entriesByRangeId.set(rangeId, map);
        }

        const nextRanges: SavedRange[] = [];
        for (const [id, range] of nextRangesById.entries()) {
          const rangeEntries = entriesByRangeId.get(id);
          nextRanges.push(
            rangeEntries && Object.keys(rangeEntries).length
              ? { ...range, entries: rangeEntries }
              : range
          );
        }

        const pref = remotePref
          ? {
              mode:
                remotePref.mode === 'year' ||
                remotePref.mode === 'month' ||
                remotePref.mode === 'week' ||
                remotePref.mode === 'range'
                  ? (remotePref.mode as ViewMode)
                  : undefined,
              anchorISO: typeof remotePref.anchor_iso === 'string' ? (remotePref.anchor_iso as string) : undefined,
              customStartISO:
                typeof remotePref.custom_start_iso === 'string' ? (remotePref.custom_start_iso as string) : null,
              customEndISO:
                typeof remotePref.custom_end_iso === 'string' ? (remotePref.custom_end_iso as string) : null,
              activeRangeId:
                typeof remotePref.active_range_id === 'string' ? (remotePref.active_range_id as string) : null,
              cellClickPreference:
                remotePref.cell_click_preference === 'open' || remotePref.cell_click_preference === 'quick_record'
                  ? (remotePref.cell_click_preference as CellClickPreference)
                  : undefined,
              updatedAtISO: typeof remotePref.updated_at === 'string' ? (remotePref.updated_at as string) : null
            }
          : undefined;

        applyRemoteMerge(nextRanges, pref);
      } finally {
        initialSyncInFlightRef.current = false;
      }
    })();
  }, [applyRemoteMerge, authUserId, entriesLoaded, ranges, rangesLoaded, viewPrefLoaded, viewPrefUpdatedAtISO]);

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
            updatedAtISO: new Date().toISOString(),
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
      updatedAtISO: new Date().toISOString(),
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
    const deletedAtISO = new Date().toISOString();
    const nextRanges = ranges.map((r) =>
      r.id === activeRangeId ? { ...r, deletedAtISO, updatedAtISO: deletedAtISO } : r
    );
    const visible = nextRanges.filter((r) => !r.deletedAtISO);
    const nextActive = visible.length > 0 ? visible[Math.min(index, visible.length - 1)] : null;
    
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
    syncStatus,
    syncError,
    isDirty,
    isAuthenticated: !!authUserId,
    saveChanges: saveToSupabase,
    dismissGuide: () => {
      setGuideDismissed(true);
    },
    startNewRange: () => {
      setViewMode('range');
      beginCreateRange({ setVisibleDefault: true });
    },
    updateEntry: (isoDate: string, state: BodyState, note: string) => {
      if (activeRangeId) {
        const key = `${activeRangeId}:${isoDate}`;
        setEntryTombstones((prev) => {
          if (!prev[key]) return prev;
          const next = { ...prev };
          delete next[key];
          return next;
        });
      }
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
      if (activeRangeId) {
        const key = `${activeRangeId}:${isoDate}`;
        const deletedAtISO = new Date().toISOString();
        setEntryTombstones((prev) => ({ ...prev, [key]: deletedAtISO }));
      }
      setEntries((prev) => {
        const next = { ...prev };
        delete next[isoDate];
        return next;
      });
    }
  };
}
