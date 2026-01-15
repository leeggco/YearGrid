'use client';

import { X } from 'lucide-react';

interface GuideProps {
  visible: boolean;
  onDismiss: () => void;
}

export function Guide({ visible, onDismiss }: GuideProps) {
  if (!visible) return null;

  return (
    <div className="absolute left-1/2 top-full z-40 mt-2 w-full max-w-[320px] -translate-x-1/2 rounded-xl border border-zinc-200 bg-white p-3 shadow-xl md:max-w-[400px]">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-medium text-zinc-900">
            点击格子记录体感（1–5）
          </div>
          <div className="mt-1 text-[10px] text-zinc-500">
            支持添加备注，或使用过滤功能快速查看特定日期
          </div>
        </div>
        <button
          type="button"
          className="text-zinc-400 hover:text-zinc-600"
          onClick={onDismiss}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
