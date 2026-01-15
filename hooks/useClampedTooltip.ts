import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export type ClampedTooltipState<T> =
  | {
      data: T;
      x: number;
      y: number;
    }
  | null;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function useClampedTooltip<T>(options: { getKey: (data: T) => string; margin?: number }) {
  const { getKey, margin = 12 } = options;

  const [tooltip, setTooltip] = useState<ClampedTooltipState<T>>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const sizeRef = useRef<{ w: number; h: number } | null>(null);
  const tooltipRefState = useRef<ClampedTooltipState<T>>(null);

  useEffect(() => {
    tooltipRefState.current = tooltip;
  }, [tooltip]);

  const tooltipKey = useMemo(() => {
    if (!tooltip) return null;
    return getKey(tooltip.data);
  }, [getKey, tooltip]);

  const clampPosition = useCallback(
    (x: number, y: number) => {
      const size = sizeRef.current;
      if (!size) {
        return {
          x: clamp(x, margin, window.innerWidth - margin),
          y: clamp(y, margin, window.innerHeight - margin)
        };
      }
      const maxLeft = Math.max(margin, window.innerWidth - margin - size.w);
      const maxTop = Math.max(margin, window.innerHeight - margin - size.h);
      return { x: clamp(x, margin, maxLeft), y: clamp(y, margin, maxTop) };
    },
    [margin]
  );

  useEffect(() => {
    if (!tooltipKey) {
      sizeRef.current = null;
      return;
    }

    sizeRef.current = null;

    const measureAndClamp = () => {
      const el = tooltipRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      sizeRef.current = { w: rect.width, h: rect.height };
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
  }, [margin, tooltipKey]);

  useEffect(() => {
    const onResize = () => {
      if (!tooltipRefState.current) return;
      const el = tooltipRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      sizeRef.current = { w: rect.width, h: rect.height };
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
  }, [margin]);

  return { tooltip, setTooltip, tooltipRef, clampPosition };
}

