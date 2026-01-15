'use client';

import { Plus } from 'lucide-react';

interface RangeEmptyStateProps {
  onStartNewRange: () => void;
}

export function RangeEmptyState({ onStartNewRange }: RangeEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/50 py-24 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
        <Plus className="h-8 w-8" />
      </div>
      <h3 className="mb-2 text-lg font-medium text-zinc-900">开始你的第一个区间</h3>
      <p className="mb-6 max-w-sm text-sm text-zinc-500">
        区间可以是一段旅行、一个项目周期、或者任何你想特别标记的时间段。
      </p>
      <button
        type="button"
        onClick={onStartNewRange}
        className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-emerald-600 hover:shadow-md active:scale-[0.98]"
      >
        <Plus className="h-4 w-4" />
        创建新区间
      </button>
    </div>
  );
}
