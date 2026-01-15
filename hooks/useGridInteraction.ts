'use client';

import { useCallback, FocusEvent, KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent } from 'react';
import { isBefore, parseISO } from 'date-fns';
import { YearDay, ViewMode } from './useYearProgress';
import { clamp } from '@/lib/utils';

interface UseGridInteractionOptions {
  viewMode: ViewMode;
  isEditingRange: boolean;
  isRangeEditing: boolean;
  isDragging: boolean;
  setIsDragging: (v: boolean) => void;
  dragStartISO: string | null;
  setDragStartISO: (v: string | null) => void;
  dragCurrentISO: string | null;
  setDragCurrentISO: (v: string | null) => void;
  setSelectedISODate: (v: string | null) => void;
  setFocusedISODate: (v: string | null) => void;
  setTooltip: (v: any) => void; // Using any for now to avoid complex tooltip type import
  clampTooltipPosition: (x: number, y: number) => { x: number; y: number };
  setRangeDraftStartISO: (v: string) => void;
  setRangeDraftEndISO: (v: string) => void;
  activeRangeId: string | null;
  customStartISO: string;
  setCustomStartISO: (v: string) => void;
  customEndISO: string;
  setCustomEndISO: (v: string) => void;
  days: YearDay[];
  dayIndexByISO: Map<string, number>;
  columns: number;
  focusCell: (isoDate: string) => void;
}

export function useGridInteraction({
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
}: UseGridInteractionOptions) {
  const handleCellFocus = useCallback(
    (day: YearDay, e: FocusEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const { x, y } = clampTooltipPosition(rect.right + 12, rect.top + 12);
      setTooltip({ data: day, x, y });
      setFocusedISODate(day.isoDate);
    },
    [clampTooltipPosition, setTooltip, setFocusedISODate]
  );

  const handleCellBlur = useCallback((day: YearDay) => {
    setTooltip((prev: any) => (prev?.data.isoDate === day.isoDate ? null : prev));
  }, [setTooltip]);

  const handleCellHover = useCallback((day: YearDay, e: ReactMouseEvent<HTMLDivElement>) => {
    const { x, y } = clampTooltipPosition(e.clientX + 12, e.clientY + 12);
    setTooltip({ data: day, x, y });
    if (isRangeEditing && isDragging) {
      setDragCurrentISO(day.isoDate);
    }
  }, [clampTooltipPosition, isDragging, isRangeEditing, setTooltip, setDragCurrentISO]);

  const handleCellMouseDown = useCallback(
    (day: YearDay) => {
      if (viewMode !== 'range') return;
      if (!isEditingRange) return;
      setIsDragging(true);
      setDragStartISO(day.isoDate);
      setDragCurrentISO(day.isoDate);
    },
    [isEditingRange, viewMode, setIsDragging, setDragStartISO, setDragCurrentISO]
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
    [activeRangeId, customEndISO, customStartISO, dragStartISO, isDragging, isEditingRange, setIsDragging, setDragStartISO, setDragCurrentISO, setRangeDraftStartISO, setRangeDraftEndISO, setCustomStartISO, setCustomEndISO]
  );

  const handleCellMove = useCallback((day: YearDay, e: ReactMouseEvent<HTMLDivElement>) => {
    setTooltip((prev: any) => {
      if (!prev || prev.data.isoDate !== day.isoDate) return prev;
      const { x, y } = clampTooltipPosition(e.clientX + 12, e.clientY + 12);
      return { data: prev.data, x, y };
    });
  }, [clampTooltipPosition, setTooltip]);

  const handleCellLeave = useCallback(() => setTooltip(null), [setTooltip]);

  const handleCellClick = useCallback((day: YearDay) => {
    if (viewMode === 'range' && isEditingRange) return;
    setFocusedISODate(day.isoDate);
    setSelectedISODate(day.isoDate);
  }, [isEditingRange, viewMode, setFocusedISODate, setSelectedISODate]);

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
    [columns, dayIndexByISO, days, focusCell, handleCellClick, setFocusedISODate]
  );

  return {
    handleCellFocus,
    handleCellBlur,
    handleCellHover,
    handleCellMouseDown,
    handleCellMouseUp,
    handleCellMove,
    handleCellLeave,
    handleCellClick,
    handleCellKeyDown,
  };
}
