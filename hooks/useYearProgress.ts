'use client';

import {
  differenceInSeconds,
  eachDayOfInterval,
  endOfDay,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  isAfter,
  isBefore,
  isSameDay,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear
} from 'date-fns';
import { useEffect, useMemo, useState } from 'react';

export type DayState = 'past' | 'today' | 'future';
export type ViewMode = 'year' | 'month' | 'week' | 'range';

export type YearDay = {
  date: Date;
  isoDate: string;
  month: number;
  isWeekend: boolean;
  isMonthStart: boolean;
  dayOfYear: number;
  state: DayState;
  daysLeft: number;
  label: string;
  holiday?: string;
};

function formatRemaining(totalSeconds: number) {
  const safe = Math.max(0, totalSeconds);

  const days = Math.floor(safe / 86400);
  const hours = Math.floor((safe % 86400) / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;

  return { days, hours, minutes, seconds };
}

export function useYearProgress(
  holidays?: Record<string, string>,
  initialNowISO?: string,
  options?: {
    mode?: ViewMode;
    anchorISO?: string;
    customStartISO?: string;
    customEndISO?: string;
  }
) {
  const [now, setNow] = useState(() =>
    initialNowISO ? new Date(initialNowISO) : new Date()
  );

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const mode = options?.mode ?? 'year';
  const anchor = useMemo(() => {
    if (!options?.anchorISO) return now;
    try {
      return parseISO(options.anchorISO);
    } catch {
      return now;
    }
  }, [now, options?.anchorISO]);

  const rangeStart = useMemo(() => {
    switch (mode) {
      case 'year':
        return startOfYear(anchor);
      case 'month':
        return startOfMonth(anchor);
      case 'week':
        return startOfWeek(anchor, { weekStartsOn: 1 });
      case 'range': {
        if (!options?.customStartISO || !options?.customEndISO) return startOfYear(anchor);
        try {
          const start = startOfDay(parseISO(options.customStartISO));
          const end = startOfDay(parseISO(options.customEndISO));
          if (isAfter(start, end)) return startOfYear(anchor);
          return start;
        } catch {
          return startOfYear(anchor);
        }
      }
    }
  }, [anchor, mode, options?.customEndISO, options?.customStartISO]);

  const rangeEnd = useMemo(() => {
    switch (mode) {
      case 'year':
        return endOfYear(anchor);
      case 'month':
        return endOfMonth(anchor);
      case 'week':
        return endOfWeek(anchor, { weekStartsOn: 1 });
      case 'range': {
        if (!options?.customStartISO || !options?.customEndISO) return endOfYear(anchor);
        try {
          const start = startOfDay(parseISO(options.customStartISO));
          const end = startOfDay(parseISO(options.customEndISO));
          if (isAfter(start, end)) return endOfYear(anchor);
          return endOfDay(end);
        } catch {
          return endOfYear(anchor);
        }
      }
    }
  }, [anchor, mode, options?.customEndISO, options?.customStartISO]);

  const todayStart = useMemo(() => startOfDay(now), [now]);

  const remainingSeconds = useMemo(
    () => Math.max(0, differenceInSeconds(rangeEnd, now)),
    [now, rangeEnd]
  );

  const remaining = useMemo(
    () => formatRemaining(remainingSeconds),
    [remainingSeconds]
  );

  const percent = useMemo(() => {
    const total = differenceInSeconds(rangeEnd, rangeStart);
    const cursor = isBefore(now, rangeStart)
      ? rangeStart
      : isAfter(now, rangeEnd)
        ? rangeEnd
        : now;
    const elapsed = differenceInSeconds(cursor, rangeStart);
    if (total <= 0) return 100;
    const value = (elapsed / total) * 100;
    return Math.min(100, Math.max(0, value));
  }, [now, rangeEnd, rangeStart]);

  const days = useMemo(() => {
    const allDates = eachDayOfInterval({ start: rangeStart, end: rangeEnd });
    const totalDays = allDates.length;

    return allDates.map((date, index) => {
      const dayOfYear = index + 1;
      const state: DayState = isSameDay(date, todayStart)
        ? 'today'
        : isBefore(date, todayStart)
          ? 'past'
          : 'future';

      const daysLeft = Math.max(0, totalDays - dayOfYear);
      const label = `${format(date, 'yyyy年MM月dd日')} · 第${dayOfYear}/${totalDays}天`;
      const isoDate = format(date, 'yyyy-MM-dd');
      const holiday = holidays?.[isoDate];
      const month = date.getMonth() + 1;
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      const isMonthStart = date.getDate() === 1;

      return {
        date,
        isoDate,
        month,
        isWeekend,
        isMonthStart,
        dayOfYear,
        state,
        daysLeft,
        label,
        holiday
      } satisfies YearDay;
    });
  }, [holidays, rangeEnd, rangeStart, todayStart]);

  return {
    now,
    rangeStart,
    rangeEnd,
    mode,
    percent,
    remaining,
    days
  };
}
