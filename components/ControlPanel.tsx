'use client';

import { format, addMonths, addWeeks, parseISO } from 'date-fns';
import { 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  X, 
  Trash2
} from 'lucide-react';
import { ViewMode } from '@/hooks/useYearProgress';
import { RangeMilestone, ThemeColor, CustomRange } from '@/lib/types';

interface ControlPanelProps {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  anchorISO: string;
  setAnchorISO: (iso: string) => void;
  rangeStart: Date;
  rangeEnd: Date;
  now: Date;
  onSave: (range: CustomRange | null) => Promise<boolean>;
  
  // Range related
  ranges: CustomRange[];
  activeRangeId: string | null;
  activeRange: CustomRange | null;
  isEditingRange: boolean;
  setIsEditingRange: (v: boolean) => void;
  isRangeEditing: boolean;
  rangeDraftName: string;
  setRangeDraftName: (v: string) => void;
  rangeDraftColor: ThemeColor;
  setRangeDraftColor: (v: ThemeColor) => void;
  rangeDraftGoal: string;
  setRangeDraftGoal: (v: string) => void;
  rangeDraftMilestones: RangeMilestone[];
  setRangeDraftMilestones: (v: RangeMilestone[]) => void;
  rangeDraftIsCompleted: boolean;
  setRangeDraftIsCompleted: (v: boolean) => void;
  rangeDraftCompletedAtISO: string | null;
  setRangeDraftCompletedAtISO: (v: string | null) => void;
  rangeDraftStartISO: string;
  setRangeDraftStartISO: (v: string) => void;
  rangeDraftEndISO: string;
  setRangeDraftEndISO: (v: string) => void;
  rangeDraftValid: boolean;
  rangeDraftSaving: boolean;
  setRangeDraftSaving: (v: boolean) => void;
  
  // Handlers
  setTooltip: (v: null) => void;
  setSelectedISODate: (v: null) => void;
  deleteActiveRange: () => void;
  applyRangeDraftToActive: () => CustomRange | null;
  cancelCreateRange: () => void;
  
  // Custom range selection
  customStartISO: string;
  setCustomStartISO: (v: string) => void;
  customEndISO: string;
  setCustomEndISO: (v: string) => void;

  // Filters
  openRangeNav?: () => void;
}

export function ControlPanel({
  viewMode,
  setViewMode,
  anchorISO,
  setAnchorISO,
  rangeStart,
  rangeEnd,
  now,
  onSave,
  ranges,
  activeRangeId,
  activeRange,
  isEditingRange,
  setIsEditingRange,
  isRangeEditing,
  rangeDraftName,
  setRangeDraftName,
  rangeDraftColor,
  setRangeDraftColor,
  rangeDraftGoal,
  setRangeDraftGoal,
  rangeDraftMilestones,
  setRangeDraftMilestones,
  rangeDraftIsCompleted,
  setRangeDraftIsCompleted,
  rangeDraftCompletedAtISO,
  setRangeDraftCompletedAtISO,
  rangeDraftStartISO,
  setRangeDraftStartISO,
  rangeDraftEndISO,
  setRangeDraftEndISO,
  rangeDraftValid,
  rangeDraftSaving,
  setRangeDraftSaving,
  
  setTooltip,
  setSelectedISODate,
  deleteActiveRange,
  applyRangeDraftToActive,
  cancelCreateRange,
  
  customStartISO,
  setCustomStartISO,
  customEndISO,
  setCustomEndISO,

  openRangeNav,
}: ControlPanelProps) {
  return (
    <div className="flex flex-col items-end gap-4">
      <div className="flex items-center gap-4">
        <div className="flex items-center rounded-lg border border-zinc-200/60 bg-zinc-100/60 p-1 shadow-sm">
          {(['year', 'month', 'week', 'range'] as const).map((m) => (
            <button
              key={m}
              type="button"
              className={`rounded-md px-4 py-2 text-sm font-medium transition-all ${
                viewMode === m
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-zinc-500 hover:bg-zinc-100/80 hover:text-zinc-900'
              }`}
              onClick={() => {
                setTooltip(null);
                setSelectedISODate(null);
                setViewMode(m);
                if (m === 'month' || m === 'week' || m === 'year') {
                  setAnchorISO(format(now, 'yyyy-MM-dd'));
                }
                if (m === 'range') {
                  const startISO = activeRange?.startISO ?? customStartISO;
                  const endISO = activeRange?.endISO ?? customEndISO;
                  setRangeDraftStartISO(startISO);
                  setRangeDraftEndISO(endISO);
                  setRangeDraftName(activeRange?.name ?? '');
                  setRangeDraftColor(activeRange?.color || 'emerald');
                  setRangeDraftGoal(activeRange?.goal ?? '');
                  setRangeDraftMilestones(activeRange?.milestones ?? []);
                  setRangeDraftIsCompleted(!!activeRange?.isCompleted);
                  setRangeDraftCompletedAtISO(activeRange?.completedAtISO ?? null);
                  setIsEditingRange(false);
                }
              }}
            >
              {m === 'year' ? '年' : m === 'month' ? '月' : m === 'week' ? '周' : '区间'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-end gap-4">
        {viewMode === 'year' && (
          <div className="flex h-10 items-center rounded-lg border border-zinc-200/60 bg-white px-4 text-sm font-medium text-zinc-900 shadow-sm">
            {format(rangeStart, 'yyyy年')}
          </div>
        )}

        {(viewMode === 'month' || viewMode === 'week') && (
          <div className="flex items-center gap-2 rounded-lg border border-zinc-200/60 bg-zinc-100/60 p-1 shadow-sm">
            <button
              type="button"
              className="rounded-md p-2 text-zinc-500 transition-colors hover:bg-white hover:text-zinc-900"
              onClick={() => {
                const next =
                  viewMode === 'month'
                    ? addMonths(parseISO(anchorISO), -1)
                    : addWeeks(parseISO(anchorISO), -1);
                setAnchorISO(format(next, 'yyyy-MM-dd'));
              }}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[132px] px-1 text-center text-sm font-medium tabular-nums text-zinc-900">
              {viewMode === 'month'
                ? format(rangeStart, 'yyyy年MM月')
                : `${format(rangeStart, 'MM.dd')} - ${format(rangeEnd, 'MM.dd')}`}
            </span>
            <button
              type="button"
              className="rounded-md p-2 text-zinc-500 transition-colors hover:bg-white hover:text-zinc-900"
              onClick={() => {
                const next =
                  viewMode === 'month'
                    ? addMonths(parseISO(anchorISO), 1)
                    : addWeeks(parseISO(anchorISO), 1);
                setAnchorISO(format(next, 'yyyy-MM-dd'));
              }}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <div className="mx-1 h-5 w-px bg-zinc-200" />
            <button
              type="button"
              className="rounded-md px-3 py-2 text-sm text-zinc-600 transition-colors hover:bg-white hover:text-zinc-900"
              onClick={() => setAnchorISO(format(now, 'yyyy-MM-dd'))}
            >
              回到当前
            </button>
          </div>
        )}

        {viewMode === 'range' && (ranges.length > 0 || isEditingRange) && (
          <div className="relative flex flex-col items-end gap-2">
            <button
              type="button"
              onClick={() => openRangeNav?.()}
              className="flex items-center gap-2 rounded-lg border border-zinc-200/60 bg-white pl-4 pr-3 py-2 text-sm font-medium text-zinc-900 shadow-sm transition-all hover:bg-zinc-50 active:scale-[0.98] lg:hidden"
            >
              <span className="truncate max-w-[120px]">我的篇章</span>
              <ChevronRight className="h-4 w-4 text-zinc-400 rotate-90" />
            </button>

            {isEditingRange && (
              <div className="absolute top-full right-0 z-30 mt-2 flex w-[600px] max-w-[90vw] flex-col gap-4 rounded-xl border border-zinc-200/60 bg-white p-4 shadow-xl animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex flex-wrap items-center gap-3">
                  <input
                    type="text"
                    className="h-10 flex-1 rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-emerald-600/40 focus:ring-2 focus:ring-emerald-600/15"
                    placeholder="名称"
                    value={rangeDraftName}
                    onChange={(e) => setRangeDraftName(e.target.value)}
                  />
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <input
                    type="text"
                    className="h-10 flex-1 rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-emerald-600/40 focus:ring-2 focus:ring-emerald-600/15"
                    placeholder="目标一句话（可选）"
                    value={rangeDraftGoal}
                    onChange={(e) => setRangeDraftGoal(e.target.value)}
                  />
                  <label className="flex h-10 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-700">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-emerald-600"
                      checked={rangeDraftIsCompleted}
                      onChange={(e) => {
                        const next = e.target.checked;
                        setRangeDraftIsCompleted(next);
                        if (next && !rangeDraftCompletedAtISO) {
                          setRangeDraftCompletedAtISO(new Date().toISOString());
                        }
                        if (!next) {
                          setRangeDraftCompletedAtISO(null);
                        }
                      }}
                    />
                    完成
                  </label>
                </div>

                <div className="rounded-xl border border-zinc-200/60 bg-zinc-50/40 p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-medium text-zinc-600">关键里程碑</div>
                    <button
                      type="button"
                      className="rounded-md bg-white px-2 py-1 text-xs font-medium text-zinc-700 shadow-sm ring-1 ring-zinc-200/60 transition hover:bg-zinc-50"
                      onClick={() => {
                        const id = `m_${Date.now()}`;
                        setRangeDraftMilestones([...rangeDraftMilestones, { id, text: '', done: false }]);
                      }}
                    >
                      添加
                    </button>
                  </div>
                  <div className="mt-2 grid gap-2">
                    {rangeDraftMilestones.map((m, idx) => (
                      <div key={m.id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-emerald-600"
                          checked={!!m.done}
                          onChange={(e) => {
                            const next = [...rangeDraftMilestones];
                            next[idx] = { ...next[idx], done: e.target.checked };
                            setRangeDraftMilestones(next);
                          }}
                        />
                        <input
                          type="text"
                          className="h-9 flex-1 rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-emerald-600/40 focus:ring-2 focus:ring-emerald-600/15"
                          placeholder={`里程碑 ${idx + 1}`}
                          value={m.text}
                          onChange={(e) => {
                            const next = [...rangeDraftMilestones];
                            next[idx] = { ...next[idx], text: e.target.value };
                            setRangeDraftMilestones(next);
                          }}
                        />
                        <button
                          type="button"
                          className="h-9 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-600 transition hover:bg-zinc-50 hover:text-zinc-900"
                          onClick={() => {
                            setRangeDraftMilestones(rangeDraftMilestones.filter((x) => x.id !== m.id));
                          }}
                        >
                          移除
                        </button>
                      </div>
                    ))}
                    {rangeDraftMilestones.length === 0 ? (
                      <div className="text-[11px] text-zinc-500">用里程碑把篇章拆成更清晰的阶段。</div>
                    ) : null}
                  </div>
                </div>

                <div className="flex items-center gap-3 px-1">
                  <span className="text-sm font-medium text-zinc-500">主题色</span>
                  <div className="flex items-center gap-2">
                    {['emerald', 'blue', 'rose', 'amber', 'violet', 'cyan'].map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setRangeDraftColor(c as ThemeColor)}
                        className={`h-6 w-6 rounded-full border border-white shadow-sm ring-1 ring-inset transition-transform ${
                          rangeDraftColor === c ? 'ring-zinc-900 scale-110' : 'ring-zinc-200 hover:scale-105'
                        } ${
                          c === 'emerald' ? 'bg-emerald-500' :
                          c === 'blue' ? 'bg-blue-500' :
                          c === 'rose' ? 'bg-rose-500' :
                          c === 'amber' ? 'bg-amber-500' :
                          c === 'violet' ? 'bg-violet-500' :
                          'bg-cyan-500'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex flex-1 items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50/50 p-1">
                    <input
                      type="date"
                      className="h-9 w-full min-w-0 bg-transparent px-2 text-sm text-zinc-900 outline-none"
                      value={rangeDraftStartISO}
                      onChange={(e) => {
                        const nextStart = e.target.value;
                        setRangeDraftStartISO(nextStart);
                        if (activeRangeId === null && isRangeEditing && nextStart) {
                          if (!customStartISO || nextStart < customStartISO) setCustomStartISO(nextStart);
                          if (rangeDraftEndISO && (!customEndISO || rangeDraftEndISO > customEndISO)) {
                            setCustomEndISO(rangeDraftEndISO);
                          }
                        }
                      }}
                    />
                    <span className="text-zinc-400">-</span>
                    <input
                      type="date"
                      className="h-9 w-full min-w-0 bg-transparent px-2 text-sm text-zinc-900 outline-none"
                      value={rangeDraftEndISO}
                      onChange={(e) => {
                        const nextEnd = e.target.value;
                        setRangeDraftEndISO(nextEnd);
                        if (activeRangeId === null && isRangeEditing && nextEnd) {
                          if (!customEndISO || nextEnd > customEndISO) setCustomEndISO(nextEnd);
                          if (rangeDraftStartISO && (!customStartISO || rangeDraftStartISO < customStartISO)) {
                            setCustomStartISO(rangeDraftStartISO);
                          }
                        }
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    disabled={!rangeDraftValid || rangeDraftSaving}
                    className="flex h-11 items-center gap-2 rounded-lg bg-emerald-600 px-6 text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:bg-zinc-100 disabled:text-zinc-400"
                    onClick={async () => {
                      if (rangeDraftSaving) return;
                      setRangeDraftSaving(true);
                      try {
                        const range = applyRangeDraftToActive();
                        const ok = await onSave(range);
                        if (ok) setIsEditingRange(false);
                      } finally {
                        setRangeDraftSaving(false);
                      }
                    }}
                    title="保存"
                  >
                    <Check className="h-4 w-4" />
                    保存
                  </button>
                  {activeRangeId === null && (
                    <button
                      type="button"
                      disabled={rangeDraftSaving}
                      className="flex h-11 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900 disabled:opacity-40"
                      onClick={cancelCreateRange}
                      title="取消创建"
                    >
                      <X className="h-4 w-4" />
                      取消
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={!activeRangeId || ranges.length <= 1}
                    className="flex h-11 w-11 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900 disabled:opacity-40"
                    onClick={deleteActiveRange}
                    title={ranges.length <= 1 ? '至少保留一个区间' : '删除'}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                
                {activeRangeId === null && rangeDraftStartISO === '' && rangeDraftEndISO === '' && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                    <div className="flex items-start gap-2">
                      <ChevronRight className="mt-0.5 h-4 w-4 text-amber-700" />
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-amber-900">拖拽选择时间</div>
                        <div className="mt-0.5 text-[11px] leading-4 text-amber-900/80">
                          在日历上按住鼠标拖拽，可自动填入开始/结束日期。
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
