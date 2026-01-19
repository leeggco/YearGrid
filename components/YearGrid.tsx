'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  addDays,
  addMonths,
  format,
  isAfter,
  subDays,
  startOfDay
} from 'date-fns';

import { BodyState, Entry } from '@/lib/types';
import type { YearDay } from '@/hooks/useYearProgress';
import { useClampedTooltip } from '@/hooks/useClampedTooltip';
import { useResponsiveGridLayout } from '@/hooks/useResponsiveGridLayout';
import { useYearProgress } from '@/hooks/useYearProgress';
import { DayEditModal } from '@/components/DayEditModal';
import { DayTooltip } from '@/components/DayTooltip';
import { YearStats } from '@/components/YearStats';
import { YearGridBody } from '@/components/YearGridBody';
import { useYearGrid } from '@/hooks/useYearGrid';
import { useGridInteraction } from '@/hooks/useGridInteraction';
import { ControlPanel } from '@/components/ControlPanel';
import { Guide } from '@/components/Guide';
import { RangeEmptyState } from '@/components/RangeEmptyState';
import { GridHeader } from '@/components/GridHeader';
import { computeRangePreview } from '@/lib/normalization';
import { RangeNav, type SavedRange } from '@/components/RangeSelector';
import { makeUniqueRangeName } from '@/lib/utils';

export default function YearGrid({
  holidays,
  initialNowISO
}: {
  holidays?: Record<string, string>;
  initialNowISO?: string;
}) {
  const searchParams = useSearchParams();
  const [isRangeNavOpen, setIsRangeNavOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const headerRef = useRef<HTMLElement | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);

  const [justSavedISO, setJustSavedISO] = useState<string | null>(null);
  const justSavedTimerRef = useRef<number | null>(null);
  const [undoToast, setUndoToast] = useState<
    | {
        isoDate: string;
        entry: Entry;
      }
    | null
  >(null);
  const undoToastTimerRef = useRef<number | null>(null);

  const {
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
    rangeDraftGoal, setRangeDraftGoal,
    rangeDraftMilestones, setRangeDraftMilestones,
    rangeDraftIsCompleted, setRangeDraftIsCompleted,
    rangeDraftCompletedAtISO, setRangeDraftCompletedAtISO,
    entries,
    selectedISODate, setSelectedISODate,
    focusedISODate, setFocusedISODate,
    highlightWeekends, setHighlightWeekends,
    highlightHolidays, setHighlightHolidays,
    guideDismissed,
    cellClickPreference, setCellClickPreference,
    isEditingRange, setIsEditingRange,
    isRangeEditing, isCreatingRange,
    rangeDraftColor, setRangeDraftColor,
    rangeDraftSaving, setRangeDraftSaving,
    rangeDraftValid,
    dragStartISO, setDragStartISO,
    dragCurrentISO, setDragCurrentISO,
    isDragging, setIsDragging,
    applyRangeDraftToActive,
    deleteActiveRange,
    beginCreateRange,
    cancelCreateRange,
    dismissGuide,
    startNewRange,
    updateEntry,
    deleteEntry
  } = useYearGrid({ initialNowISO });

  const { now, percent, remaining, days, rangeStart, rangeEnd } = useYearProgress(
    holidays,
    initialNowISO,
    {
      mode: viewMode,
      anchorISO: anchorISO,
      customStartISO: customStartISO,
      customEndISO: customEndISO
    }
  );

  const { columns, gridMaxWidth } = useResponsiveGridLayout({
    rootRef,
    headerRef,
    viewMode,
    daysCount: days.length
  });

  const {
    tooltip,
    setTooltip,
    tooltipRef,
    clampPosition: clampTooltipPosition
  } = useClampedTooltip<YearDay>({
    getKey: (d) => d.isoDate
  });

  const nowYear = useMemo(
    () => parseInt(initialNowISO?.slice(0, 4) || format(new Date(), 'yyyy')),
    [initialNowISO]
  );
  const nowMonthIndex = useMemo(
    () => parseInt(initialNowISO?.slice(5, 7) || format(new Date(), 'MM')) - 1,
    [initialNowISO]
  );
  const nowDate = useMemo(
    () => parseInt(initialNowISO?.slice(8, 10) || format(new Date(), 'dd')),
    [initialNowISO]
  );

  const dayIndexByISO = useMemo(() => {
    const map = new Map<string, number>();
    days.forEach((day, index) => {
      map.set(day.isoDate, index);
    });
    return map;
  }, [days]);

  const currentMonth = useMemo(() => nowMonthIndex + 1, [nowMonthIndex]);
  const todayStart = useMemo(
    () => startOfDay(new Date(nowYear, nowMonthIndex, nowDate)),
    [nowYear, nowMonthIndex, nowDate]
  );

  const createRangePreview = useMemo(() => {
    if (!isCreatingRange) return null;
    return computeRangePreview({
      now,
      todayStart,
      dragStartISO,
      dragCurrentISO,
      isDragging,
      rangeDraftStartISO,
      rangeDraftEndISO
    });
  }, [
    dragCurrentISO,
    dragStartISO,
    isCreatingRange,
    isDragging,
    now,
    rangeDraftEndISO,
    rangeDraftStartISO,
    todayStart
  ]);

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
  }, [selectedDay, setSelectedISODate]);

  useEffect(() => {
    if (selectedDay) return;
    lastFocusedRef.current?.focus();
  }, [selectedDay]);

  const selectedEntry = useMemo(() => {
    if (!selectedDay) return null;
    return entries[selectedDay.isoDate] ?? null;
  }, [entries, selectedDay]);

  const focusCell = useCallback((isoDate: string) => {
    const root = gridRef.current;
    if (!root) return;
    const el = root.querySelector<HTMLElement>(`[data-iso="${isoDate}"]`);
    el?.focus();
  }, []);

  useEffect(() => {
    const date = searchParams.get('date');
    if (!date) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
    setViewMode('month');
    setAnchorISO(date);
    setSelectedISODate(date);
    setFocusedISODate(date);
    requestAnimationFrame(() => focusCell(date));
  }, [focusCell, searchParams, setAnchorISO, setFocusedISODate, setSelectedISODate, setViewMode]);

  const {
    handleCellFocus,
    handleCellBlur,
    handleCellHover,
    handleCellMouseDown,
    handleCellMouseUp,
    handleCellMove,
    handleCellLeave,
    handleCellClick,
    handleCellKeyDown,
  } = useGridInteraction({
    viewMode,
    isEditingRange,
    isRangeEditing,
    isDragging,
    setIsDragging,
    dragStartISO,
    setDragStartISO,
    dragCurrentISO,
    setDragCurrentISO,
    setSelectedISODate,
    setFocusedISODate,
    setTooltip,
    clampTooltipPosition,
    setRangeDraftStartISO,
    setRangeDraftEndISO,
    activeRangeId,
    customStartISO,
    setCustomStartISO,
    customEndISO,
    setCustomEndISO,
    days,
    dayIndexByISO,
    columns,
    focusCell,
  });

  const guideVisible = useMemo(() => {
    if (guideDismissed) return false;
    return Object.keys(entries).length === 0;
  }, [guideDismissed, entries]);

  const gridGap = viewMode === 'month' || viewMode === 'week' || viewMode === 'range' ? 8 : 6;

  useEffect(() => {
    if (viewMode !== 'range') setIsRangeNavOpen(false);
  }, [viewMode]);

  const handleSelectRange = useCallback((id: string) => {
    const r = ranges.find((item) => item.id === id);
    if (!r) return;
    setActiveRangeId(r.id);
    setCustomStartISO(r.startISO);
    setCustomEndISO(r.endISO);
    setRangeDraftStartISO(r.startISO);
    setRangeDraftEndISO(r.endISO);
    setRangeDraftName(r.name);
    setRangeDraftColor(r.color || 'emerald');
    setRangeDraftGoal(r.goal || '');
    setRangeDraftMilestones(r.milestones || []);
    setRangeDraftIsCompleted(!!r.isCompleted);
    setRangeDraftCompletedAtISO(r.completedAtISO || null);
    setIsEditingRange(false);
    setIsRangeNavOpen(false);
  }, [
    ranges,
    setActiveRangeId,
    setCustomEndISO,
    setCustomStartISO,
    setIsEditingRange,
    setRangeDraftColor,
    setRangeDraftCompletedAtISO,
    setRangeDraftEndISO,
    setRangeDraftGoal,
    setRangeDraftIsCompleted,
    setRangeDraftMilestones,
    setRangeDraftName,
    setRangeDraftStartISO
  ]);

  const handleAddRange = useCallback(() => {
    beginCreateRange({ setVisibleDefault: true });
    setIsRangeNavOpen(false);
  }, [beginCreateRange]);

  const handleAddRangeTemplate = useCallback((template: 'sprint_2w' | 'quarter_3m' | 'travel') => {
    const base = startOfDay(now);
    const startISO = format(base, 'yyyy-MM-dd');
    const preset = (() => {
      switch (template) {
        case 'sprint_2w':
          return { name: '短期冲刺', end: addDays(base, 13) };
        case 'quarter_3m':
          return { name: '季度目标', end: subDays(addMonths(base, 3), 1) };
        default:
          return { name: '旅行倒数', end: addDays(base, 6) };
      }
    })();
    const endISO = format(preset.end, 'yyyy-MM-dd');
    beginCreateRange({
      startISO,
      endISO,
      setVisibleDefault: true,
      prefillDraft: true,
      name: preset.name
    });
    setIsRangeNavOpen(false);
  }, [beginCreateRange, now]);

  const handleEditRange = useCallback((r: SavedRange) => {
    setActiveRangeId(r.id);
    setRangeDraftName(r.name);
    setRangeDraftStartISO(r.startISO);
    setRangeDraftEndISO(r.endISO);
    setRangeDraftColor(r.color || 'emerald');
    setRangeDraftGoal(r.goal || '');
    setRangeDraftMilestones(r.milestones || []);
    setRangeDraftIsCompleted(!!r.isCompleted);
    setRangeDraftCompletedAtISO(r.completedAtISO || null);
    setIsEditingRange(true);
    setRangeDraftSaving(false);
    setIsRangeNavOpen(false);
  }, [
    setActiveRangeId,
    setIsEditingRange,
    setRangeDraftColor,
    setRangeDraftCompletedAtISO,
    setRangeDraftEndISO,
    setRangeDraftGoal,
    setRangeDraftIsCompleted,
    setRangeDraftMilestones,
    setRangeDraftName,
    setRangeDraftSaving,
    setRangeDraftStartISO
  ]);

  const handleDeleteRange = useCallback((id: string) => {
    const index = ranges.findIndex(r => r.id === id);
    if (index < 0) return;
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
  }, [
    activeRangeId,
    ranges,
    setActiveRangeId,
    setCustomEndISO,
    setCustomStartISO,
    setRanges
  ]);

  const handleDuplicateRange = useCallback((id: string) => {
    const r = ranges.find(item => item.id === id);
    if (!r) return;
    const newId = `range_${Date.now()}`;
    const desired = `${r.name} 副本`;
    const name = makeUniqueRangeName(desired, ranges);
    const next = { ...r, id: newId, name };
    setRanges((prev) => [...prev, next]);
    setActiveRangeId(newId);
    setCustomStartISO(next.startISO);
    setCustomEndISO(next.endISO);
  }, [
    ranges,
    setActiveRangeId,
    setCustomEndISO,
    setCustomStartISO,
    setRanges
  ]);

  const activeStateButtonClass = (state: BodyState) => {
    switch (state) {
      case 1: return 'border-emerald-200 bg-emerald-50 text-emerald-700';
      case 2: return 'border-blue-200 bg-blue-50 text-blue-700';
      case 3: return 'border-rose-200 bg-rose-50 text-rose-700';
      case 4: return 'border-amber-200 bg-amber-50 text-amber-700';
      case 5: return 'border-violet-200 bg-violet-50 text-violet-700';
      default: return 'border-zinc-900 bg-zinc-900 text-white';
    }
  };

  const flashSaved = useCallback((isoDate: string) => {
    setJustSavedISO(isoDate);
    if (justSavedTimerRef.current !== null) {
      window.clearTimeout(justSavedTimerRef.current);
    }
    justSavedTimerRef.current = window.setTimeout(() => {
      setJustSavedISO((prev) => (prev === isoDate ? null : prev));
    }, 1200);
  }, []);

  const showUndoDeleteToast = useCallback((isoDate: string, entry: Entry) => {
    setUndoToast({ isoDate, entry });
    if (undoToastTimerRef.current !== null) {
      window.clearTimeout(undoToastTimerRef.current);
    }
    undoToastTimerRef.current = window.setTimeout(() => {
      setUndoToast(null);
    }, 5000);
  }, []);

  useEffect(() => {
    return () => {
      if (justSavedTimerRef.current !== null) {
        window.clearTimeout(justSavedTimerRef.current);
      }
      if (undoToastTimerRef.current !== null) {
        window.clearTimeout(undoToastTimerRef.current);
      }
    };
  }, []);

  const handleUpdateEntry = useCallback(
    (isoDate: string, state: BodyState, note: string) => {
      updateEntry(isoDate, state, note);
      flashSaved(isoDate);
    },
    [flashSaved, updateEntry]
  );

  const handleDeleteEntryWithUndo = useCallback(
    (isoDate: string) => {
      const entry = entries[isoDate] ?? null;
      deleteEntry(isoDate);
      if (entry) showUndoDeleteToast(isoDate, entry);
    },
    [deleteEntry, entries, showUndoDeleteToast]
  );

  const handleUndoDelete = useCallback(() => {
    if (!undoToast) return;
    handleUpdateEntry(undoToast.isoDate, undoToast.entry.state, undoToast.entry.note);
    setUndoToast(null);
  }, [handleUpdateEntry, undoToast]);

  const cycleEntryState = useCallback(
    (isoDate: string) => {
      const current = (entries[isoDate]?.state ?? 0) as BodyState;
      const next = ((current + 1) % 6) as BodyState;
      if (next === 0) {
        deleteEntry(isoDate);
        flashSaved(isoDate);
        return;
      }
      handleUpdateEntry(isoDate, next, entries[isoDate]?.note ?? '');
    },
    [deleteEntry, entries, flashSaved, handleUpdateEntry]
  );

  const handleCellClickWithQuickRecord = useCallback(
    (day: YearDay, e: ReactMouseEvent<HTMLDivElement>) => {
      if (cellClickPreference === 'quick_record') {
        if (e.shiftKey) {
          handleCellClick(day);
          return;
        }
        if (viewMode === 'range' && isEditingRange) return;
        setFocusedISODate(day.isoDate);
        cycleEntryState(day.isoDate);
        return;
      }

      if (e.shiftKey) {
        if (viewMode === 'range' && isEditingRange) return;
        setFocusedISODate(day.isoDate);
        cycleEntryState(day.isoDate);
        return;
      }
      handleCellClick(day);
    },
    [cellClickPreference, cycleEntryState, handleCellClick, isEditingRange, setFocusedISODate, viewMode]
  );

  return (
    <div ref={rootRef} className="relative flex w-full flex-col">
      <header ref={headerRef} className="mb-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <YearStats
            percent={percent}
            percentText={percentText}
            timeRemainingText={timeRemainingText}
            elapsedDays={elapsedDays}
            totalDays={days.length}
            viewMode={viewMode}
            rangeStart={rangeStart}
            isCreatingRange={isCreatingRange}
            createRangePreview={createRangePreview}
          />

          <ControlPanel
            viewMode={viewMode}
            setViewMode={setViewMode}
            anchorISO={anchorISO}
            setAnchorISO={setAnchorISO}
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
            now={now}
            cellClickPreference={cellClickPreference}
            setCellClickPreference={setCellClickPreference}
            ranges={ranges}
            activeRangeId={activeRangeId}
            setActiveRangeId={setActiveRangeId}
            activeRange={activeRange}
            isEditingRange={isEditingRange}
            setIsEditingRange={setIsEditingRange}
            isRangeEditing={isRangeEditing}
            rangeDraftName={rangeDraftName}
            setRangeDraftName={setRangeDraftName}
            rangeDraftColor={rangeDraftColor}
            setRangeDraftColor={setRangeDraftColor}
            rangeDraftGoal={rangeDraftGoal}
            setRangeDraftGoal={setRangeDraftGoal}
            rangeDraftMilestones={rangeDraftMilestones}
            setRangeDraftMilestones={setRangeDraftMilestones}
            rangeDraftIsCompleted={rangeDraftIsCompleted}
            setRangeDraftIsCompleted={setRangeDraftIsCompleted}
            rangeDraftCompletedAtISO={rangeDraftCompletedAtISO}
            setRangeDraftCompletedAtISO={setRangeDraftCompletedAtISO}
            rangeDraftStartISO={rangeDraftStartISO}
            setRangeDraftStartISO={setRangeDraftStartISO}
            rangeDraftEndISO={rangeDraftEndISO}
            setRangeDraftEndISO={setRangeDraftEndISO}
            rangeDraftValid={rangeDraftValid}
            rangeDraftSaving={rangeDraftSaving}
            setRangeDraftSaving={setRangeDraftSaving}
            setTooltip={setTooltip}
            setSelectedISODate={setSelectedISODate}
            deleteActiveRange={deleteActiveRange}
            applyRangeDraftToActive={applyRangeDraftToActive}
            cancelCreateRange={cancelCreateRange}
            customStartISO={customStartISO}
            setCustomStartISO={setCustomStartISO}
            customEndISO={customEndISO}
            setCustomEndISO={setCustomEndISO}
            openRangeNav={() => setIsRangeNavOpen(true)}
          />
        </div>

        <Guide
          visible={guideVisible}
          onDismiss={dismissGuide}
        />
      </header>

      {/* 主内容区域：承载不同视图（年 / 月 / 周 / 区间）的网格 */}
      <div className="w-full pb-12">
        {viewMode === 'range' && ranges.length === 0 && !isEditingRange ? (
          <RangeEmptyState onStartNewRange={startNewRange} />
        ) : (
          /* 重点卡片：标题 + 网格（年视图为 12 个月块；其他视图为连续日网格） */
          <div className="w-full rounded-2xl border border-zinc-200/60 bg-white p-6 shadow-sm">
            {viewMode === 'range' ? (
              <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
                <div className="hidden lg:block">
                  <RangeNav
                    variant="sidebar"
                    now={now}
                    ranges={ranges}
                    activeRangeId={activeRangeId}
                    onSelect={handleSelectRange}
                    onAdd={handleAddRange}
                    onAddTemplate={handleAddRangeTemplate}
                    onEdit={handleEditRange}
                    onDelete={handleDeleteRange}
                    onDuplicate={handleDuplicateRange}
                  />
                </div>

                <div className="min-w-0">
                  <GridHeader
                    viewMode={viewMode}
                    activeRange={activeRange}
                    rangeStart={rangeStart}
                    now={now}
                    isEditingRange={isEditingRange}
                    rangeDraftName={rangeDraftName}
                    highlightWeekends={highlightWeekends}
                    setHighlightWeekends={setHighlightWeekends}
                    highlightHolidays={highlightHolidays}
                    setHighlightHolidays={setHighlightHolidays}
                  />

                  <div
                    ref={gridRef}
                    style={
                      gridMaxWidth
                        ? { maxWidth: `${gridMaxWidth}px`, marginLeft: 'auto', marginRight: 'auto' }
                        : undefined
                    }
                  >
                    <YearGridBody
                      viewMode={viewMode}
                      days={days}
                      columns={columns}
                      gridGap={gridGap}
                      entries={entries}
                      selectedISODate={selectedISODate}
                      focusedISODate={focusedISODate}
                      highlightWeekends={highlightWeekends}
                      highlightHolidays={highlightHolidays}
                      currentMonth={currentMonth}
                      isDragging={isDragging}
                      dragStartISO={dragStartISO}
                      dragCurrentISO={dragCurrentISO}
                      isRangeEditing={isRangeEditing}
                      rangeDraftColor={rangeDraftColor}
                      rangeDraftStartISO={rangeDraftStartISO}
                      rangeDraftEndISO={rangeDraftEndISO}
                      onCellHover={handleCellHover}
                      onCellMove={handleCellMove}
                      onCellLeave={handleCellLeave}
                      onCellFocus={handleCellFocus}
                      onCellBlur={handleCellBlur}
                      onCellKeyDown={handleCellKeyDown}
                      onCellClick={handleCellClickWithQuickRecord}
                      onCellMouseDown={handleCellMouseDown}
                      onCellMouseUp={handleCellMouseUp}
                    />
                  </div>
                </div>

                <RangeNav
                  variant="drawer"
                  now={now}
                  open={isRangeNavOpen}
                  onOpenChange={setIsRangeNavOpen}
                  ranges={ranges}
                  activeRangeId={activeRangeId}
                  onSelect={handleSelectRange}
                  onAdd={handleAddRange}
                  onAddTemplate={handleAddRangeTemplate}
                  onEdit={handleEditRange}
                  onDelete={handleDeleteRange}
                  onDuplicate={handleDuplicateRange}
                />
              </div>
            ) : (
              <>
                <GridHeader
                  viewMode={viewMode}
                  activeRange={activeRange}
                  rangeStart={rangeStart}
                  now={now}
                  isEditingRange={isEditingRange}
                  rangeDraftName={rangeDraftName}
                  highlightWeekends={highlightWeekends}
                  setHighlightWeekends={setHighlightWeekends}
                  highlightHolidays={highlightHolidays}
                  setHighlightHolidays={setHighlightHolidays}
                />

                <div ref={gridRef}>
                  <YearGridBody
                    viewMode={viewMode}
                    days={days}
                    columns={columns}
                    gridGap={gridGap}
                    entries={entries}
                    selectedISODate={selectedISODate}
                    focusedISODate={focusedISODate}
                    highlightWeekends={highlightWeekends}
                    highlightHolidays={highlightHolidays}
                    currentMonth={currentMonth}
                    isDragging={isDragging}
                    dragStartISO={dragStartISO}
                    dragCurrentISO={dragCurrentISO}
                    isRangeEditing={isRangeEditing}
                    rangeDraftColor={rangeDraftColor}
                    rangeDraftStartISO={rangeDraftStartISO}
                    rangeDraftEndISO={rangeDraftEndISO}
                    onCellHover={handleCellHover}
                    onCellMove={handleCellMove}
                    onCellLeave={handleCellLeave}
                    onCellFocus={handleCellFocus}
                    onCellBlur={handleCellBlur}
                    onCellKeyDown={handleCellKeyDown}
                    onCellClick={handleCellClickWithQuickRecord}
                    onCellMouseDown={handleCellMouseDown}
                    onCellMouseUp={handleCellMouseUp}
                  />
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {undoToast ? (
        <div className="fixed bottom-4 right-4 z-50 max-w-[90vw]">
          <div className="flex items-center gap-3 rounded-xl border border-zinc-200/70 bg-white/90 px-4 py-3 text-sm text-zinc-900 shadow-[0_18px_60px_rgba(0,0,0,0.14)] backdrop-blur-xl">
            <div className="min-w-0">
              <div className="font-medium">已删除记录</div>
              <div className="mt-0.5 text-xs text-zinc-500 tabular-nums">{undoToast.isoDate}</div>
            </div>
            <button
              type="button"
              onClick={handleUndoDelete}
              className="shrink-0 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-zinc-800"
            >
              撤销
            </button>
          </div>
        </div>
      ) : null}

      {tooltip ? (
        <DayTooltip
          tooltip={tooltip}
          tooltipRef={tooltipRef}
          todayStart={todayStart}
          entries={entries}
        />
      ) : null}

      {selectedDay ? (
        <DayEditModal
          selectedDay={selectedDay}
          selectedEntry={selectedEntry}
          modalRef={modalRef as React.LegacyRef<HTMLDivElement>}
          onClose={() => setSelectedISODate(null)}
          activeStateButtonClass={activeStateButtonClass}
          justSaved={justSavedISO === selectedDay.isoDate}
          onStateChange={(state) => {
            handleUpdateEntry(selectedDay.isoDate, state, selectedEntry?.note ?? '');
          }}
          onNoteChange={(note) => {
            handleUpdateEntry(selectedDay.isoDate, selectedEntry?.state ?? 0, note);
          }}
          onDelete={() => {
            handleDeleteEntryWithUndo(selectedDay.isoDate);
            setSelectedISODate(null);
          }}
        />
      ) : null}
    </div>
  );
}
