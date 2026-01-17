'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  format,
  isAfter,
  startOfDay
} from 'date-fns';

import { BodyState } from '@/lib/types';
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
  const [isRangeNavOpen, setIsRangeNavOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const headerRef = useRef<HTMLElement | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);

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
    entries,
    selectedISODate, setSelectedISODate,
    focusedISODate, setFocusedISODate,
    highlightWeekends, setHighlightWeekends,
    highlightHolidays, setHighlightHolidays,
    highlightThisMonth, setHighlightThisMonth,
    recordFilter, setRecordFilter,
    noteOnly, setNoteOnly,
    stateFilters,
    noteQuery, setNoteQuery,
    guideDismissed,
    showFilters, setShowFilters,
    isEditingRange, setIsEditingRange,
    isRangeEditing, isCreatingRange,
    rangeDraftColor, setRangeDraftColor,
    rangeDraftSaving, setRangeDraftSaving,
    rangeDraftValid,
    dragStartISO, setDragStartISO,
    dragCurrentISO, setDragCurrentISO,
    isDragging, setIsDragging,
    setIOStatus,
    applyRangeDraftToActive,
    deleteActiveRange,
    beginCreateRange,
    cancelCreateRange,
    toggleStateFilter,
    clearFilters,
    exportData,
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

  const { columns } = useResponsiveGridLayout({
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

  const triggerImport = useCallback(() => {
    setIOStatus(null);
    importInputRef.current?.click();
  }, [setIOStatus]);

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

  const effectiveHighlightThisMonth = viewMode === 'year' && highlightThisMonth;

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
    setIsEditingRange(false);
    setIsRangeNavOpen(false);
  }, [
    ranges,
    setActiveRangeId,
    setCustomEndISO,
    setCustomStartISO,
    setIsEditingRange,
    setRangeDraftEndISO,
    setRangeDraftName,
    setRangeDraftStartISO
  ]);

  const handleAddRange = useCallback(() => {
    beginCreateRange({ setVisibleDefault: true });
    setIsRangeNavOpen(false);
  }, [beginCreateRange]);

  const handleEditRange = useCallback((r: SavedRange) => {
    setActiveRangeId(r.id);
    setRangeDraftName(r.name);
    setRangeDraftStartISO(r.startISO);
    setRangeDraftEndISO(r.endISO);
    setRangeDraftColor(r.color || 'emerald');
    setIsEditingRange(true);
    setRangeDraftSaving(false);
    setIsRangeNavOpen(false);
  }, [
    setActiveRangeId,
    setIsEditingRange,
    setRangeDraftColor,
    setRangeDraftEndISO,
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
            showFilters={showFilters}
            setShowFilters={setShowFilters}
            highlightWeekends={highlightWeekends}
            setHighlightWeekends={setHighlightWeekends}
            highlightHolidays={highlightHolidays}
            setHighlightHolidays={setHighlightHolidays}
            highlightThisMonth={highlightThisMonth}
            setHighlightThisMonth={setHighlightThisMonth}
            noteOnly={noteOnly}
            setNoteOnly={setNoteOnly}
            recordFilter={recordFilter}
            setRecordFilter={setRecordFilter}
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
            stateFilters={stateFilters}
            toggleStateFilter={toggleStateFilter}
            noteQuery={noteQuery}
            setNoteQuery={setNoteQuery}
            clearFilters={clearFilters}
            exportData={exportData}
            triggerImport={triggerImport}
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
                    effectiveHighlightThisMonth={effectiveHighlightThisMonth}
                    currentMonth={currentMonth}
                    recordFilter={recordFilter}
                    noteOnly={noteOnly}
                    stateFilters={stateFilters}
                    noteQuery={noteQuery}
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
                    onCellClick={handleCellClick}
                    onCellMouseDown={handleCellMouseDown}
                    onCellMouseUp={handleCellMouseUp}
                  />
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
                  effectiveHighlightThisMonth={effectiveHighlightThisMonth}
                  currentMonth={currentMonth}
                  recordFilter={recordFilter}
                  noteOnly={noteOnly}
                  stateFilters={stateFilters}
                  noteQuery={noteQuery}
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
                  onCellClick={handleCellClick}
                  onCellMouseDown={handleCellMouseDown}
                  onCellMouseUp={handleCellMouseUp}
                />
              </>
            )}
          </div>
        )}
      </div>

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
          onStateChange={(state) => {
            updateEntry(selectedDay.isoDate, state, selectedEntry?.note ?? '');
          }}
          onNoteChange={(note) => {
            updateEntry(selectedDay.isoDate, selectedEntry?.state ?? 0, note);
          }}
          onDelete={() => {
            deleteEntry(selectedDay.isoDate);
            setSelectedISODate(null);
          }}
        />
      ) : null}
    </div>
  );
}
