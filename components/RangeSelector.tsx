"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Plus, Check, Trash2, Copy, Settings2 } from "lucide-react";
import { format, parseISO } from "date-fns";

export type ThemeColor = 'emerald' | 'blue' | 'rose' | 'amber' | 'violet' | 'cyan';

export type SavedRange = {
  id: string;
  name: string;
  startISO: string;
  endISO: string;
  color?: ThemeColor;
  entries?: Record<string, { state: 0 | 1 | 2 | 3 | 4 | 5; note: string }>;
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

const colorMap: Record<string, string> = {
  emerald: "bg-emerald-500",
  blue: "bg-blue-500",
  rose: "bg-rose-500",
  amber: "bg-amber-500",
  violet: "bg-violet-500",
  cyan: "bg-cyan-500",
};

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
                        <span className={`w-2 h-2 rounded-full ${colorMap[range.color] || "bg-emerald-500"}`} />
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
