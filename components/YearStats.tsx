'use client';

import { format } from 'date-fns';
import { ViewMode } from '@/hooks/useYearProgress';

interface YearStatsProps {
  percent: number;
  percentText: string;
  timeRemainingText: string;
  elapsedDays: number;
  totalDays: number;
  viewMode: ViewMode;
  rangeStart: Date;
  isCreatingRange: boolean;
  createRangePreview: {
    percent: number;
    remainingText: string;
    elapsedDays: number;
    totalDays: number;
  } | null;
}

export function YearStats({
  percent,
  percentText,
  timeRemainingText,
  elapsedDays,
  totalDays,
  viewMode,
  rangeStart,
  isCreatingRange,
  createRangePreview
}: YearStatsProps) {
  const displayPercent = isCreatingRange ? (createRangePreview?.percent ?? 0) : percent;
  const displayPercentText = isCreatingRange
    ? createRangePreview
      ? `${Math.floor(createRangePreview.percent).toString()}%`
      : '--'
    : percentText;
  const displayRemainingText = isCreatingRange
    ? createRangePreview?.remainingText ?? '--'
    : timeRemainingText;
  const displayElapsedDays = isCreatingRange
    ? createRangePreview?.elapsedDays ?? '--'
    : `${elapsedDays} 天`;
  const displayTotalDays = isCreatingRange
    ? createRangePreview?.totalDays ?? '--'
    : `${totalDays} 天`;

  const viewModeLabel = 
    viewMode === 'year'
      ? format(rangeStart, 'yyyy年')
      : viewMode === 'month'
        ? format(rangeStart, 'M月')
        : viewMode === 'week'
          ? '本周'
          : '区间';

  return (
    <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
      <div className="relative">
        <svg className="h-32 w-32 -rotate-90" viewBox="0 0 128 128">
          <defs>
            <linearGradient id="ygProgressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgb(5 150 105)" />
              <stop offset="100%" stopColor="rgb(14 116 144)" />
            </linearGradient>
          </defs>
          <circle
            cx="64"
            cy="64"
            r="56"
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            className="text-zinc-200"
          />
          <circle
            cx="64"
            cy="64"
            r="56"
            stroke="url(#ygProgressGradient)"
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
            className="transition-all duration-1000"
            strokeDasharray={`${displayPercent * 3.52} 352`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-zinc-900">
            {displayPercentText}
          </span>
          <span className="text-xs text-zinc-500">
            {viewModeLabel}
          </span>
        </div>
      </div>

      <div className="space-y-3 rounded-xl border border-zinc-200/60 bg-white p-4 shadow-sm">
        <div>
          <p className="text-sm text-zinc-500">剩余时间</p>
          <p className="text-2xl font-semibold text-zinc-900 tabular-nums">
            {displayRemainingText}
          </p>
        </div>
        <div className="flex gap-6">
          <div>
            <p className="text-xs text-zinc-500">已过</p>
            <p className="text-lg font-medium text-emerald-600 tabular-nums">
              {displayElapsedDays}
            </p>
          </div>
          <div>
            <p className="text-xs text-zinc-500">总计</p>
            <p className="text-lg font-medium text-zinc-900 tabular-nums">
              {displayTotalDays}
            </p>
          </div>
        </div>
        <div className="h-2 w-48 overflow-hidden rounded-full bg-zinc-100">
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{
              width: `${displayPercent}%`,
              background: 'linear-gradient(90deg, rgb(5 150 105), rgb(14 116 144))'
            }}
          />
        </div>
      </div>
    </div>
  );
}
