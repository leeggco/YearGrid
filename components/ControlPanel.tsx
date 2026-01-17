'use client';

import { format, addMonths, addWeeks, parseISO } from 'date-fns';
import { 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  Settings2, 
  Check, 
  X, 
  Trash2, 
  MousePointer2,
  Download,
  Upload
} from 'lucide-react';
import { ViewMode } from '@/hooks/useYearProgress';
import { ThemeColor, CustomRange, BodyState } from '@/lib/types';
import { BODY_STATE_META } from '@/lib/constants';

interface ControlPanelProps {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  anchorISO: string;
  setAnchorISO: (iso: string) => void;
  rangeStart: Date;
  rangeEnd: Date;
  now: Date;
  showFilters: boolean;
  setShowFilters: (show: boolean) => void;
  highlightWeekends: boolean;
  setHighlightWeekends: (v: boolean) => void;
  highlightHolidays: boolean;
  setHighlightHolidays: (v: boolean) => void;
  highlightThisMonth: boolean;
  setHighlightThisMonth: (v: boolean) => void;
  noteOnly: boolean;
  setNoteOnly: (v: boolean) => void;
  recordFilter: 'all' | 'recorded' | 'unrecorded';
  setRecordFilter: (v: 'all' | 'recorded' | 'unrecorded') => void;
  
  // Range related
  ranges: CustomRange[];
  activeRangeId: string | null;
  setActiveRangeId: (id: string | null) => void;
  activeRange: CustomRange | null;
  isEditingRange: boolean;
  setIsEditingRange: (v: boolean) => void;
  isRangeEditing: boolean;
  rangeDraftName: string;
  setRangeDraftName: (v: string) => void;
  rangeDraftColor: ThemeColor;
  setRangeDraftColor: (v: ThemeColor) => void;
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
  applyRangeDraftToActive: () => void;
  cancelCreateRange: () => void;
  
  // Custom range selection
  customStartISO: string;
  setCustomStartISO: (v: string) => void;
  customEndISO: string;
  setCustomEndISO: (v: string) => void;

  // Filters
  stateFilters: BodyState[];
  toggleStateFilter: (state: BodyState) => void;
  noteQuery: string;
  setNoteQuery: (v: string) => void;
  clearFilters: () => void;
  exportData: () => void;
  triggerImport: () => void;
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
  showFilters,
  setShowFilters,
  highlightWeekends,
  setHighlightWeekends,
  highlightHolidays,
  setHighlightHolidays,
  highlightThisMonth,
  setHighlightThisMonth,
  noteOnly,
  setNoteOnly,
  recordFilter,
  setRecordFilter,
  
  ranges,
  activeRangeId,
  setActiveRangeId,
  activeRange,
  isEditingRange,
  setIsEditingRange,
  isRangeEditing,
  rangeDraftName,
  setRangeDraftName,
  rangeDraftColor,
  setRangeDraftColor,
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

  stateFilters,
  toggleStateFilter,
  noteQuery,
  setNoteQuery,
  clearFilters,
  exportData,
  triggerImport,
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
                  setIsEditingRange(false);
                }
                if (m !== 'year') setHighlightThisMonth(false);
              }}
            >
              {m === 'year' ? '年' : m === 'month' ? '月' : m === 'week' ? '周' : '区间'}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          className={`rounded-lg border p-2.5 transition-all ${
            showFilters
              ? 'border-emerald-600 bg-emerald-600 text-white shadow-md'
              : 'border-zinc-200/60 bg-white text-zinc-500 shadow-sm hover:border-emerald-600/50 hover:text-zinc-900'
          }`}
        >
          <Filter className="h-4 w-4" />
        </button>
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
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => openRangeNav?.()}
                className="flex items-center gap-2 rounded-lg border border-zinc-200/60 bg-white pl-4 pr-3 py-2 text-sm font-medium text-zinc-900 shadow-sm transition-all hover:bg-zinc-50 active:scale-[0.98] lg:hidden"
              >
                <span className="truncate max-w-[120px]">我的篇章</span>
                <ChevronRight className="h-4 w-4 text-zinc-400 rotate-90" />
              </button>

              <button
                type="button"
                disabled={!activeRangeId || isEditingRange}
                className="flex items-center gap-2 rounded-lg border border-zinc-200/60 bg-white px-3 py-2 text-sm font-medium text-zinc-700 shadow-sm transition-all hover:bg-zinc-50 hover:text-zinc-900 disabled:bg-zinc-50 disabled:text-zinc-400"
                onClick={() => {
                  if (!activeRangeId) return;
                  const r = ranges.find((item) => item.id === activeRangeId);
                  if (!r) return;
                  setActiveRangeId(r.id);
                  setRangeDraftName(r.name);
                  setRangeDraftStartISO(r.startISO);
                  setRangeDraftEndISO(r.endISO);
                  setRangeDraftColor(r.color || 'emerald');
                  setIsEditingRange(true);
                  setRangeDraftSaving(false);
                }}
                title="编辑"
              >
                <Settings2 className="h-4 w-4" />
                编辑
              </button>
            </div>

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
                    onClick={() => {
                      if (rangeDraftSaving) return;
                      setRangeDraftSaving(true);
                      applyRangeDraftToActive();
                      setIsEditingRange(false);
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
                      <MousePointer2 className="mt-0.5 h-4 w-4 text-amber-700" />
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

      {showFilters && (
        <div className="mb-6 mt-6 rounded-xl border border-zinc-200/60 bg-white p-4 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="mb-4 flex items-center justify-between">
            <div className="text-sm font-medium text-zinc-900">筛选选项</div>
            <button
              type="button"
              className="text-zinc-400 transition-colors hover:text-zinc-700"
              onClick={() => setShowFilters(false)}
              aria-label="关闭筛选"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex flex-wrap gap-6">
            <label className="group flex items-center gap-2">
              <input
                type="checkbox"
                checked={highlightWeekends}
                onChange={(e) => setHighlightWeekends(e.target.checked)}
                className="h-4 w-4 cursor-pointer rounded border-zinc-300 bg-white accent-emerald-600"
              />
              <span className="cursor-pointer text-sm text-zinc-900 transition-colors group-hover:text-emerald-700">
                显示周末
              </span>
            </label>

            <label className="group flex items-center gap-2">
              <input
                type="checkbox"
                checked={highlightHolidays}
                onChange={(e) => setHighlightHolidays(e.target.checked)}
                className="h-4 w-4 cursor-pointer rounded border-zinc-300 bg-white accent-emerald-600"
              />
              <span className="cursor-pointer text-sm text-zinc-900 transition-colors group-hover:text-emerald-700">
                显示节假日
              </span>
            </label>

            {viewMode === 'year' && (
              <label className="group flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={highlightThisMonth}
                  onChange={(e) => setHighlightThisMonth(e.target.checked)}
                  className="h-4 w-4 cursor-pointer rounded border-zinc-300 bg-white accent-emerald-600"
                />
                <span className="cursor-pointer text-sm text-zinc-900 transition-colors group-hover:text-emerald-700">
                  高亮本月
                </span>
              </label>
            )}

            <label className="group flex items-center gap-2">
              <input
                type="checkbox"
                checked={noteOnly}
                onChange={(e) => setNoteOnly(e.target.checked)}
                className="h-4 w-4 cursor-pointer rounded border-zinc-300 bg-white accent-emerald-600"
              />
              <span className="cursor-pointer text-sm text-zinc-900 transition-colors group-hover:text-emerald-700">
                仅有备注
              </span>
            </label>

            <div className="flex items-center gap-2">
              <span className="text-sm text-zinc-500">记录:</span>
              <select
                value={recordFilter}
                onChange={(e) => setRecordFilter(e.target.value as typeof recordFilter)}
                className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-900 outline-none transition focus:border-emerald-600/40 focus:ring-2 focus:ring-emerald-600/15"
              >
                <option value="all">全部</option>
                <option value="recorded">已记录</option>
                <option value="unrecorded">未记录</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-zinc-500">体感:</span>
              <div className="flex items-center gap-1">
                {([1, 2, 3, 4, 5] as const).map((s) => {
                  const active = stateFilters.includes(s);
                  return (
                    <button
                      key={s}
                      type="button"
                      aria-pressed={active}
                      className={`flex h-8 w-8 items-center justify-center rounded-lg border text-sm transition-colors ${
                        active
                          ? 'border-emerald-600 bg-emerald-600 text-white'
                          : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
                      }`}
                      onClick={() => toggleStateFilter(s)}
                      title={BODY_STATE_META[s].label}
                    >
                      {BODY_STATE_META[s].emoji}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-zinc-500">备注:</span>
              <input
                type="text"
                className="w-[18ch] rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-900 outline-none transition focus:border-emerald-600/40 focus:ring-2 focus:ring-emerald-600/15"
                placeholder="搜备注"
                value={noteQuery}
                onChange={(e) => setNoteQuery(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900"
                onClick={clearFilters}
              >
                清除
              </button>
              <button
                type="button"
                className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900"
                onClick={exportData}
              >
                <Download className="h-4 w-4" />
                导出
              </button>
              <button
                type="button"
                className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900"
                onClick={triggerImport}
              >
                <Upload className="h-4 w-4" />
                导入
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
