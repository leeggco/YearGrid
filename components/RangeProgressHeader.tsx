"use client";

import { useMemo } from "react";
import { differenceInCalendarDays, format, isAfter, isBefore, startOfDay, parseISO, endOfDay, differenceInSeconds } from "date-fns";
import { motion } from "framer-motion";
import { SavedRange, themeTokens } from "./RangeSelector";

interface RangeProgressHeaderProps {
  range: SavedRange;
  now: Date;
}

export function RangeProgressHeader({ range, now }: RangeProgressHeaderProps) {
  const theme = themeTokens[range.color || "emerald"] || themeTokens.emerald;
  const stats = useMemo(() => {
    if (!range.startISO || !range.endISO) return null;

    let start: Date, end: Date;
    try {
      start = startOfDay(parseISO(range.startISO));
      end = startOfDay(parseISO(range.endISO));
      if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
    } catch {
      return null;
    }

    const today = startOfDay(now);

    const totalDays = differenceInCalendarDays(end, start) + 1;
    
    let daysPassed = 0;
    if (isAfter(today, start)) {
      daysPassed = differenceInCalendarDays(today, start); 
    }
    
    if (isBefore(today, start)) daysPassed = 0;
    if (isAfter(today, end)) daysPassed = totalDays;

    let currentDayIndex = 0;
    if (!isBefore(today, start) && !isAfter(today, end)) {
      currentDayIndex = differenceInCalendarDays(today, start) + 1;
    }

    const daysRemaining = totalDays - daysPassed;

    let progressPercent = 0;
    if (isAfter(today, end)) {
        progressPercent = 100;
    } else if (isBefore(today, start)) {
        progressPercent = 0;
    } else {
        const endAt = endOfDay(end);
        const totalSeconds = differenceInSeconds(endAt, start);
        const elapsedSeconds = differenceInSeconds(now, start);
        if (totalSeconds <= 0) {
            progressPercent = 100;
        } else {
            progressPercent = Math.min(100, Math.max(0, (elapsedSeconds / totalSeconds) * 100));
        }
    }

    return {
      totalDays,
      daysPassed,
      daysRemaining,
      progressPercent,
      isEnded: isAfter(today, end),
      isUpcoming: isBefore(today, start),
      currentDayIndex,
      formattedStart: format(start, "yyyy.MM.dd"),
      formattedEnd: format(end, "yyyy.MM.dd")
    };
  }, [range, now]);

  if (!stats) return null;

  return (
    <div className="mb-8 flex flex-col gap-6">
      {/* Title & Meta */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 flex items-center gap-2">
            {range.name}
            {stats.isEnded && <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-500 font-medium">已结束</span>}
            {stats.isUpcoming && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">未开始</span>}
            {!stats.isEnded && !stats.isUpcoming && <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${theme.progressTag}`}>进行中</span>}
          </h2>
          <div className="text-sm text-zinc-500 mt-1 font-medium tabular-nums">
            {stats.formattedStart} - {stats.formattedEnd}
            <span className="mx-2">·</span>
            共 {stats.totalDays} 天
          </div>
        </div>

        {/* Big Stats */}
        <div className="flex items-center gap-6">
            {!stats.isUpcoming && !stats.isEnded && (
                <div className="text-right">
                    <div className="text-sm text-zinc-500">已过</div>
                    <div className={`text-2xl font-bold tabular-nums text-emerald-600`}>{stats.daysPassed}<span className="text-sm font-normal text-zinc-400 ml-1">天</span></div>
                </div>
            )}
            {!stats.isUpcoming && !stats.isEnded && (
                <div className="text-right">
                    <div className="text-sm text-zinc-500">剩余</div>
                    <div className="text-2xl font-bold text-zinc-900 tabular-nums">{stats.daysRemaining}<span className="text-sm font-normal text-zinc-400 ml-1">天</span></div>
                </div>
            )}
            {stats.isUpcoming && (
                 <div className="text-right">
                    <div className="text-sm text-zinc-500">距离开始</div>
                    <div className="text-2xl font-bold text-blue-600 tabular-nums">{differenceInCalendarDays(parseISO(range.startISO), now)}<span className="text-sm font-normal text-zinc-400 ml-1">天</span></div>
                </div>
            )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="relative h-4 w-full overflow-hidden rounded-full bg-zinc-100">
        <motion.div
          className={`absolute inset-y-0 left-0 bg-gradient-to-r ${theme.progressBarFrom} ${theme.progressBarTo}`}
          initial={{ width: 0 }}
          animate={{ width: `${stats.progressPercent}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
        <div className="absolute inset-0 opacity-10 bg-[length:10px_10px] bg-[linear-gradient(45deg,rgba(255,255,255,0.5)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.5)_50%,rgba(255,255,255,0.5)_75%,transparent_75%,transparent)]" />
      </div>
      
      {/* Percentage Label */}
      <div className="flex justify-between text-xs font-medium text-zinc-400 mt-[-16px]">
        <span>0%</span>
        <span className={`tabular-nums ${theme.progressText}`}>{stats.progressPercent.toFixed(3)}%</span>
        <span>100%</span>
      </div>
    </div>
  );
}
