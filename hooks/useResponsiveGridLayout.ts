import type { RefObject } from 'react';
import { useEffect, useRef, useState } from 'react';

import type { ViewMode } from '@/hooks/useYearProgress';

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function useResponsiveGridLayout(options: {
  rootRef: RefObject<HTMLElement | null>;
  headerRef: RefObject<HTMLElement | null>;
  viewMode: ViewMode;
  daysCount: number;
}) {
  const { rootRef, headerRef, viewMode, daysCount } = options;

  const [columns, setColumns] = useState(32);
  const [gridMaxWidth, setGridMaxWidth] = useState<number | undefined>(undefined);
  const columnsRef = useRef<number>(columns);

  useEffect(() => {
    columnsRef.current = columns;
  }, [columns]);

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
      const count = daysCount;

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
        const fallbackCols = clamp(Math.round(availableWidth / 18), minCols, maxCols);
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
  }, [daysCount, headerRef, rootRef, viewMode]);

  return { columns, gridMaxWidth };
}
