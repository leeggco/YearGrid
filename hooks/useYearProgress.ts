'use client';

import {
  differenceInSeconds,
  eachDayOfInterval,
  endOfDay,
  endOfYear,
  format,
  getDayOfYear,
  isBefore,
  isSameDay,
  startOfDay,
  startOfYear
} from 'date-fns';
import { useEffect, useMemo, useState } from 'react';

export type DayState = 'past' | 'today' | 'future';

export type YearDay = {
  date: Date;
  dayOfYear: number;
  state: DayState;
  daysLeft: number;
  label: string;
};

function formatRemaining(totalSeconds: number) {
  const safe = Math.max(0, totalSeconds);

  const days = Math.floor(safe / 86400);
  const hours = Math.floor((safe % 86400) / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;

  return { days, hours, minutes, seconds };
}

export function useYearProgress() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const yearStart = useMemo(() => startOfYear(now), [now]);
  const yearEnd = useMemo(() => endOfYear(now), [now]);

  const todayStart = useMemo(() => startOfDay(now), [now]);
  const todayEnd = useMemo(() => endOfDay(now), [now]);
  const todayTotalSeconds = useMemo(
    () => differenceInSeconds(todayEnd, todayStart) + 1,
    [todayEnd, todayStart]
  );
  const todayRemainingSeconds = useMemo(
    () => Math.max(0, differenceInSeconds(todayEnd, now)),
    [now, todayEnd]
  );
  const todayElapsedRatio = useMemo(() => {
    if (todayTotalSeconds <= 0) return 1;
    const elapsed = todayTotalSeconds - todayRemainingSeconds;
    const ratio = elapsed / todayTotalSeconds;
    return Math.min(1, Math.max(0, ratio));
  }, [todayRemainingSeconds, todayTotalSeconds]);

  const remainingSeconds = useMemo(
    () => Math.max(0, differenceInSeconds(yearEnd, now)),
    [now, yearEnd]
  );

  const remaining = useMemo(
    () => formatRemaining(remainingSeconds),
    [remainingSeconds]
  );

  const percent = useMemo(() => {
    const total = differenceInSeconds(yearEnd, yearStart);
    const elapsed = differenceInSeconds(now, yearStart);
    if (total <= 0) return 100;
    const value = (elapsed / total) * 100;
    return Math.min(100, Math.max(0, value));
  }, [now, yearEnd, yearStart]);

  const days = useMemo(() => {
    const totalDays = getDayOfYear(yearEnd);

    const allDates = eachDayOfInterval({ start: yearStart, end: yearEnd });

    return allDates.map((date) => {
      const dayOfYear = getDayOfYear(date);
      const state: DayState = isSameDay(date, todayStart)
        ? 'today'
        : isBefore(date, todayStart)
          ? 'past'
          : 'future';

      const daysLeft = Math.max(0, totalDays - dayOfYear);
      const label = `${format(date, 'yyyy年MM月dd日')} · 第${dayOfYear}天`;

      return { date, dayOfYear, state, daysLeft, label } satisfies YearDay;
    });
  }, [todayStart, yearEnd, yearStart]);

  return {
    now,
    yearStart,
    yearEnd,
    percent,
    remaining,
    days
  };
}
