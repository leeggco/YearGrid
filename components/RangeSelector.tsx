"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDown, Plus, Check, Trash2, Copy, Settings2, X } from "lucide-react";
import { format, parseISO, startOfDay, isBefore, isAfter, differenceInCalendarDays } from "date-fns";

import { ThemeColor, SavedRange } from '@/lib/types';

export { type ThemeColor, type SavedRange };

export const themeTokens: Record<
  ThemeColor,
  {
    dotBg: string;
    progressBg: string;
    progressText: string;
    progressBarFrom: string;
    progressBarTo: string;
    progressTag: string;
    dayToday: string;
    dayMarked: string;
    dayPast: string;
    dayFuture: string;
    dayRing: string;
    dayShadow: string;
    dayFocusOutline: string;
  }
> = {
  emerald: {
    dotBg: "bg-emerald-500",
    progressBg: "bg-emerald-50",
    progressText: "text-emerald-600",
    progressBarFrom: "from-emerald-500",
    progressBarTo: "to-teal-400",
    progressTag: "bg-emerald-50 text-emerald-600",
    dayToday: "bg-[#009C7B] text-white",
    dayMarked: "bg-[#7BC27E] text-zinc-900",
    dayPast: "bg-[#D8E9E4] text-zinc-700",
    dayFuture: "bg-[#EEF3F4] border border-zinc-200/60 text-zinc-900",
    dayRing: "ring-[#009C7B]/30",
    dayShadow: "shadow-[#009C7B]/25",
    dayFocusOutline: "focus-visible:outline-[#009C7B]/40",
  },
  blue: {
    dotBg: "bg-blue-500",
    progressBg: "bg-blue-50",
    progressText: "text-blue-600",
    progressBarFrom: "from-blue-500",
    progressBarTo: "to-cyan-400",
    progressTag: "bg-blue-50 text-blue-600",
    dayToday: "bg-blue-600 text-white",
    dayMarked: "bg-blue-300 text-zinc-900",
    dayPast: "bg-blue-100 text-blue-900",
    dayFuture: "bg-zinc-50 border border-zinc-200/60 text-zinc-900",
    dayRing: "ring-blue-600/30",
    dayShadow: "shadow-blue-600/25",
    dayFocusOutline: "focus-visible:outline-blue-600/40",
  },
  rose: {
    dotBg: "bg-rose-500",
    progressBg: "bg-rose-50",
    progressText: "text-rose-600",
    progressBarFrom: "from-rose-500",
    progressBarTo: "to-pink-400",
    progressTag: "bg-rose-50 text-rose-600",
    dayToday: "bg-rose-600 text-white",
    dayMarked: "bg-rose-300 text-zinc-900",
    dayPast: "bg-rose-100 text-rose-900",
    dayFuture: "bg-zinc-50 border border-zinc-200/60 text-zinc-900",
    dayRing: "ring-rose-600/30",
    dayShadow: "shadow-rose-600/25",
    dayFocusOutline: "focus-visible:outline-rose-600/40",
  },
  amber: {
    dotBg: "bg-amber-500",
    progressBg: "bg-amber-50",
    progressText: "text-amber-600",
    progressBarFrom: "from-amber-500",
    progressBarTo: "to-orange-400",
    progressTag: "bg-amber-50 text-amber-600",
    dayToday: "bg-amber-500 text-white",
    dayMarked: "bg-amber-300 text-zinc-900",
    dayPast: "bg-amber-100 text-amber-900",
    dayFuture: "bg-zinc-50 border border-zinc-200/60 text-zinc-900",
    dayRing: "ring-amber-500/30",
    dayShadow: "shadow-amber-500/25",
    dayFocusOutline: "focus-visible:outline-amber-600/40",
  },
  violet: {
    dotBg: "bg-violet-500",
    progressBg: "bg-violet-50",
    progressText: "text-violet-600",
    progressBarFrom: "from-violet-500",
    progressBarTo: "to-purple-400",
    progressTag: "bg-violet-50 text-violet-600",
    dayToday: "bg-violet-600 text-white",
    dayMarked: "bg-violet-300 text-zinc-900",
    dayPast: "bg-violet-100 text-violet-900",
    dayFuture: "bg-zinc-50 border border-zinc-200/60 text-zinc-900",
    dayRing: "ring-violet-600/30",
    dayShadow: "shadow-violet-600/25",
    dayFocusOutline: "focus-visible:outline-violet-600/40",
  },
  cyan: {
    dotBg: "bg-cyan-500",
    progressBg: "bg-cyan-50",
    progressText: "text-cyan-600",
    progressBarFrom: "from-cyan-500",
    progressBarTo: "to-sky-400",
    progressTag: "bg-cyan-50 text-cyan-600",
    dayToday: "bg-cyan-500 text-white",
    dayMarked: "bg-cyan-300 text-zinc-900",
    dayPast: "bg-cyan-100 text-cyan-900",
    dayFuture: "bg-zinc-50 border border-zinc-200/60 text-zinc-900",
    dayRing: "ring-cyan-500/30",
    dayShadow: "shadow-cyan-500/25",
    dayFocusOutline: "focus-visible:outline-cyan-600/40",
  },
};

interface RangeSelectorProps {
  ranges: SavedRange[];
  activeRangeId: string | null;
  onSelect: (rangeId: string) => void;
  onAdd: () => void;
  onEdit: (range: SavedRange) => void;
  onDelete: (rangeId: string) => void;
  onDuplicate: (rangeId: string) => void;
}

const fallbackTheme: ThemeColor = "emerald";

function safeFormatISODate(iso: string | null | undefined) {
  if (!iso) return "—";
  try {
    const date = parseISO(iso);
    if (Number.isNaN(date.getTime())) return "—";
    return format(date, "yyyy.MM.dd");
  } catch {
    return "—";
  }
}

export function RangeSelector({
  ranges,
  activeRangeId,
  onSelect,
  onAdd,
  onEdit,
  onDelete,
  onDuplicate,
}: RangeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeRange = ranges.find((r) => r.id === activeRangeId);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-lg border border-zinc-200/60 bg-white pl-4 pr-3 py-2 text-sm font-medium text-zinc-900 shadow-sm transition-all hover:bg-zinc-50 active:scale-[0.98]"
      >
        <span className="truncate max-w-[120px] md:max-w-[200px]">
          {activeRange ? activeRange.name : "选择区间"}
        </span>
        <ChevronDown className={`h-4 w-4 text-zinc-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 z-50 mt-2 w-[280px] rounded-xl border border-zinc-200/60 bg-white p-2 shadow-xl animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="mb-2 px-2 py-1.5 text-xs font-medium text-zinc-400">
            我的篇章 ({ranges.length})
          </div>
          
          <div className="max-h-[300px] overflow-y-auto space-y-1 custom-scrollbar">
            {ranges.map((range) => {
              const isActive = range.id === activeRangeId;
              return (
                <div
                  key={range.id}
                  className={`group relative flex items-center justify-between rounded-lg px-2 py-2 text-sm transition-colors ${
                    isActive ? "bg-emerald-50 text-emerald-900" : "hover:bg-zinc-50 text-zinc-700"
                  }`}
                >
                  <button
                    className="flex-1 text-left truncate pr-8"
                    onClick={() => {
                      onSelect(range.id);
                      setIsOpen(false);
                    }}
                  >
                    <div className="font-medium truncate flex items-center gap-2">
                      {range.color && (
                        <span className={`w-2 h-2 rounded-full ${themeTokens[range.color]?.dotBg ?? themeTokens[fallbackTheme].dotBg}`} />
                      )}
                      {range.name}
                    </div>
                    <div className={`text-[10px] ${isActive ? "text-emerald-600/80" : "text-zinc-400"}`}>
                      {safeFormatISODate(range.startISO)} - {safeFormatISODate(range.endISO)}
                    </div>
                  </button>

                  {isActive && <Check className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-600" />}
                  
                  {/* Hover Actions (Desktop) - simplified for MVP */}
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-1 bg-white/80 backdrop-blur-sm rounded-md pl-1 shadow-sm border border-zinc-100">
                     <button 
                        onClick={(e) => { e.stopPropagation(); onEdit(range); setIsOpen(false); }}
                        className="p-1 hover:bg-zinc-100 rounded text-zinc-500 hover:text-zinc-900"
                        title="编辑"
                     >
                        <Settings2 className="h-3 w-3" />
                     </button>
                     <button 
                        onClick={(e) => { e.stopPropagation(); onDuplicate(range.id); }}
                        className="p-1 hover:bg-zinc-100 rounded text-zinc-500 hover:text-zinc-900"
                        title="复制"
                     >
                        <Copy className="h-3 w-3" />
                     </button>
                     <button 
                        onClick={(e) => { e.stopPropagation(); onDelete(range.id); }}
                        className="p-1 hover:bg-rose-50 rounded text-zinc-400 hover:text-rose-600"
                        title="删除"
                     >
                        <Trash2 className="h-3 w-3" />
                     </button>
                  </div>
                </div>
              );
            })}
            
            {ranges.length === 0 && (
              <div className="px-2 py-4 text-center text-xs text-zinc-400">
                暂无区间，开始创建吧
              </div>
            )}
          </div>

          <div className="mt-2 border-t border-zinc-100 pt-2">
            <button
              onClick={() => {
                onAdd();
                setIsOpen(false);
              }}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-zinc-900 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
            >
              <Plus className="h-4 w-4" />
              新建篇章
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

type RangeStatus = 'active' | 'upcoming' | 'ended';

function getRangeStatus(range: SavedRange, now: Date): RangeStatus {
  const start = startOfDay(parseISO(range.startISO));
  const end = startOfDay(parseISO(range.endISO));
  const today = startOfDay(now);
  if (isBefore(today, start)) return 'upcoming';
  if (isAfter(today, end)) return 'ended';
  return 'active';
}

function getRangeSummary(range: SavedRange, now: Date) {
  const start = startOfDay(parseISO(range.startISO));
  const end = startOfDay(parseISO(range.endISO));
  const today = startOfDay(now);
  const totalDays = differenceInCalendarDays(end, start) + 1;
  const status = getRangeStatus(range, now);

  if (status === 'upcoming') {
    return {
      status,
      totalDays,
      label: '未开始',
      detail: `还有 ${Math.max(0, differenceInCalendarDays(start, today))} 天`
    };
  }

  if (status === 'ended') {
    return {
      status,
      totalDays,
      label: '已结束',
      detail: '已完成'
    };
  }

  const daysPassed = Math.max(0, Math.min(totalDays, differenceInCalendarDays(today, start)));
  const daysRemaining = Math.max(0, totalDays - daysPassed);
  return {
    status,
    totalDays,
    label: '进行中',
    detail: `剩余 ${daysRemaining} 天`
  };
}

function sortRangesByCreatedDesc(ranges: SavedRange[]) {
  return [...ranges].reverse();
}

interface RangeNavProps extends RangeSelectorProps {
  now: Date;
  variant: 'sidebar' | 'drawer';
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function RangeNav({
  ranges,
  activeRangeId,
  onSelect,
  onAdd,
  onEdit,
  onDelete,
  onDuplicate,
  now,
  variant,
  open,
  onOpenChange
}: RangeNavProps) {
  const sortedRanges = useMemo(() => sortRangesByCreatedDesc(ranges), [ranges]);

  useEffect(() => {
    if (variant !== 'drawer' || !open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange?.(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onOpenChange, variant]);

  const content = (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-zinc-900">
          我的篇章
          <span className="ml-2 text-xs font-medium text-zinc-400">({ranges.length})</span>
        </div>
        {variant === 'drawer' && (
          <button
            type="button"
            className="rounded-md p-2 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
            onClick={() => onOpenChange?.(false)}
            aria-label="关闭"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto rounded-xl border border-zinc-200/60 bg-white p-2 custom-scrollbar">
        {sortedRanges.map((range) => {
          const isActive = range.id === activeRangeId;
          const theme = themeTokens[range.color || fallbackTheme] ?? themeTokens[fallbackTheme];
          const summary = getRangeSummary(range, now);

          const statusPill =
            summary.status === 'active' ? (
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${theme.progressTag}`}>{summary.label}</span>
            ) : summary.status === 'upcoming' ? (
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-600">{summary.label}</span>
            ) : (
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-500">{summary.label}</span>
            );

          return (
            <div
              key={range.id}
              className={`group relative flex items-start justify-between rounded-lg px-2 py-2 text-sm transition-colors ${
                isActive ? "bg-emerald-50 text-emerald-900" : "hover:bg-zinc-50 text-zinc-700"
              }`}
            >
              <button
                className="flex-1 text-left pr-8"
                onClick={() => {
                  onSelect(range.id);
                  if (variant === 'drawer') onOpenChange?.(false);
                }}
              >
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${theme.dotBg}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="truncate font-medium">{range.name}</div>
                      {statusPill}
                    </div>
                    <div className={`mt-0.5 flex items-center justify-between text-[10px] ${
                      isActive ? "text-emerald-600/80" : "text-zinc-400"
                    }`}>
                      <span className="truncate">
                        {safeFormatISODate(range.startISO)} - {safeFormatISODate(range.endISO)}
                      </span>
                      <span className="ml-2 shrink-0 tabular-nums">{summary.detail}</span>
                    </div>
                  </div>
                </div>
              </button>

              {isActive && <Check className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-600" />}

              <div className="absolute right-2 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-1 bg-white/80 backdrop-blur-sm rounded-md pl-1 shadow-sm border border-zinc-100">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(range);
                    if (variant === 'drawer') onOpenChange?.(false);
                  }}
                  className="p-1 hover:bg-zinc-100 rounded text-zinc-500 hover:text-zinc-900"
                  title="编辑"
                >
                  <Settings2 className="h-3 w-3" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDuplicate(range.id);
                  }}
                  className="p-1 hover:bg-zinc-100 rounded text-zinc-500 hover:text-zinc-900"
                  title="复制"
                >
                  <Copy className="h-3 w-3" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(range.id);
                  }}
                  className="p-1 hover:bg-rose-50 rounded text-zinc-400 hover:text-rose-600"
                  title="删除"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          );
        })}

        {sortedRanges.length === 0 && (
          <div className="px-2 py-4 text-center text-xs text-zinc-400">
            暂无区间，开始创建吧
          </div>
        )}
      </div>

      <button
        onClick={() => {
          onAdd();
          if (variant === 'drawer') onOpenChange?.(false);
        }}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-zinc-900 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
        type="button"
      >
        <Plus className="h-4 w-4" />
        新建篇章
      </button>
    </div>
  );

  if (variant === 'sidebar') {
    return <div className="h-full">{content}</div>;
  }

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        onClick={() => onOpenChange?.(false)}
        aria-label="关闭"
      />
      <div className="absolute inset-y-0 right-0 w-[320px] max-w-[90vw] bg-white shadow-2xl p-4">
        {content}
      </div>
    </div>
  );
}
