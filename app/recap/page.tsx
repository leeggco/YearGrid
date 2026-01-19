'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { format, startOfDay, subDays } from 'date-fns';
import { BODY_STATE_META } from '@/lib/constants';
import { getSupabaseClient } from '@/lib/supabaseClient';
import type { Entry, SavedRange } from '@/lib/types';

type WindowDays = 7 | 30;
type NoteItem = { isoDate: string; note: string; state: Entry['state'] };

function computeWindowEntries(now: Date, windowDays: WindowDays, entries: Record<string, Entry>) {
  const today = startOfDay(now);
  const rows: Array<{ isoDate: string; entry: Entry | null }> = [];
  for (let i = windowDays - 1; i >= 0; i -= 1) {
    const d = subDays(today, i);
    const isoDate = format(d, 'yyyy-MM-dd');
    rows.push({ isoDate, entry: entries[isoDate] ?? null });
  }
  return rows;
}

export default function RecapPage() {
  const [windowDays, setWindowDays] = useState<WindowDays>(7);
  const [activeRange, setActiveRange] = useState<SavedRange | null>(null);
  const [rows, setRows] = useState<Array<{ isoDate: string; entry: Entry | null }>>([]);

  useEffect(() => {
    const supabase = getSupabaseClient();
    const now = new Date();
    if (!supabase) {
      setActiveRange(null);
      setRows(computeWindowEntries(now, windowDays, {}));
      return;
    }

    let canceled = false;
    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user?.id ?? null;
      if (!userId) {
        if (canceled) return;
        setActiveRange(null);
        setRows(computeWindowEntries(now, windowDays, {}));
        return;
      }

      const [{ data: rangesRows, error: rangesError }, { data: prefRow, error: prefError }] = await Promise.all([
        supabase
          .from('yeargrid_ranges')
          .select('range_id,name,start_iso,end_iso,color,goal,milestones,is_completed,completed_at,updated_at,deleted_at')
          .eq('user_id', userId),
        supabase
          .from('yeargrid_prefs')
          .select('active_range_id')
          .eq('user_id', userId)
          .maybeSingle()
      ]);
      const anyError = rangesError ?? prefError ?? null;
      if (anyError) {
        if (canceled) return;
        setActiveRange(null);
        setRows(computeWindowEntries(now, windowDays, {}));
        return;
      }

      const ranges: SavedRange[] = (rangesRows ?? []).map((row) => ({
        id: row.range_id as string,
        name: (row.name as string) || '区间',
        startISO: (row.start_iso as string) || '',
        endISO: (row.end_iso as string) || '',
        ...(row.color ? { color: row.color as SavedRange['color'] } : {}),
        ...(typeof row.goal === 'string' && row.goal.trim() ? { goal: row.goal.trim() } : {}),
        ...(Array.isArray(row.milestones) ? { milestones: row.milestones as SavedRange['milestones'] } : {}),
        ...(typeof row.is_completed === 'boolean' ? { isCompleted: row.is_completed as boolean } : {}),
        ...(typeof row.completed_at === 'string' ? { completedAtISO: row.completed_at as string } : {}),
        ...(typeof row.updated_at === 'string' ? { updatedAtISO: row.updated_at as string } : {}),
        ...(typeof row.deleted_at === 'string' ? { deletedAtISO: row.deleted_at as string } : {})
      }));

      const visibleRanges = ranges.filter((r) => !r.deletedAtISO);
      const desiredId =
        (typeof prefRow?.active_range_id === 'string' ? (prefRow.active_range_id as string) : null) ??
        (visibleRanges[0]?.id ?? null);
      const desiredActiveRange = desiredId ? visibleRanges.find((r) => r.id === desiredId) ?? null : null;

      if (!desiredActiveRange) {
        if (canceled) return;
        setActiveRange(null);
        setRows(computeWindowEntries(now, windowDays, {}));
        return;
      }

      const { data: entryRows, error: entryError } = await supabase
        .from('yeargrid_entries')
        .select('iso_date,state,note,updated_at,deleted_at')
        .eq('user_id', userId)
        .eq('range_id', desiredActiveRange.id);
      if (entryError) {
        if (canceled) return;
        setActiveRange(desiredActiveRange);
        setRows(computeWindowEntries(now, windowDays, {}));
        return;
      }

      const entries: Record<string, Entry> = {};
      for (const row of entryRows ?? []) {
        const isoDate = row.iso_date as string;
        if (!isoDate) continue;
        const deletedAtISO = typeof row.deleted_at === 'string' ? (row.deleted_at as string) : null;
        if (deletedAtISO) continue;
        entries[isoDate] = {
          state: (row.state ?? 0) as Entry['state'],
          note: typeof row.note === 'string' ? (row.note as string) : '',
          ...(typeof row.updated_at === 'string' ? { updatedAtISO: row.updated_at as string } : {})
        };
      }

      if (canceled) return;
      setActiveRange(desiredActiveRange);
      setRows(computeWindowEntries(now, windowDays, entries));
    })();

    return () => {
      canceled = true;
    };
  }, [windowDays]);

  const stats = useMemo(() => {
    const states = rows.map((r) => (r.entry?.state ?? 0));
    const nonZero = states.filter((s) => s !== 0);
    const avg = nonZero.length ? nonZero.reduce((a, b) => a + b, 0) / nonZero.length : null;
    const recordedDays = nonZero.length;
    return { avg, recordedDays };
  }, [rows]);

  const notes = useMemo(() => {
    return rows
      .map((r) => {
        const note = (r.entry?.note ?? '').trim();
        if (!note) return null;
        return { isoDate: r.isoDate, note, state: r.entry?.state ?? 0 } satisfies NoteItem;
      })
      .filter((n): n is NoteItem => n !== null)
      .reverse();
  }, [rows]);

  return (
    <main className="app-container py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-2xl font-bold text-zinc-900">复盘</div>
          <div className="mt-1 text-sm text-zinc-500">
            {activeRange ? `当前篇章：${activeRange.name}` : '未找到篇章数据'}
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-zinc-200/60 bg-white p-1 shadow-sm">
          {[7, 30].map((d) => (
            <button
              key={d}
              type="button"
              className={`rounded-md px-4 py-2 text-sm font-medium transition-all ${
                windowDays === d
                  ? 'bg-zinc-900 text-white shadow-sm'
                  : 'text-zinc-500 hover:bg-zinc-100/80 hover:text-zinc-900'
              }`}
              onClick={() => setWindowDays(d as WindowDays)}
            >
              最近 {d} 天
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="rounded-2xl border border-zinc-200/60 bg-white p-5 shadow-sm">
          <div className="flex items-baseline justify-between gap-4">
            <div className="text-sm font-semibold text-zinc-900">体感趋势</div>
            <div className="text-xs font-medium text-zinc-500">
              {stats.avg === null
                ? `已记录 ${stats.recordedDays}/${rows.length} 天`
                : `均值 ${stats.avg.toFixed(2)} · 已记录 ${stats.recordedDays}/${rows.length} 天`}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-7 gap-2">
            {rows.map((r) => {
              const state = (r.entry?.state ?? 0) as 0 | 1 | 2 | 3 | 4 | 5;
              const meta = BODY_STATE_META[state];
              const hasRecord = state !== 0 || !!(r.entry?.note ?? '').trim();
              return (
                <Link
                  key={r.isoDate}
                  href={`/?date=${r.isoDate}`}
                  className={`flex flex-col items-center justify-center rounded-xl border px-2 py-2 text-center transition ${
                    hasRecord ? 'border-zinc-200 bg-white hover:bg-zinc-50' : 'border-zinc-200/60 bg-zinc-50/40 hover:bg-zinc-50'
                  }`}
                >
                  <div className="text-lg">{meta.emoji}</div>
                  <div className="mt-0.5 text-[11px] font-medium text-zinc-500 tabular-nums">
                    {r.isoDate.slice(5)}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200/60 bg-white p-5 shadow-sm">
          <div className="flex items-baseline justify-between gap-4">
            <div className="text-sm font-semibold text-zinc-900">备注列表</div>
            <div className="text-xs font-medium text-zinc-500">{notes.length} 条</div>
          </div>

          <div className="mt-4 space-y-2">
            {notes.length === 0 ? (
              <div className="rounded-xl border border-zinc-200/60 bg-zinc-50/40 px-4 py-4 text-sm text-zinc-500">
                最近 {windowDays} 天暂无备注。
              </div>
            ) : (
              notes.map((n) => (
                <div
                  key={n.isoDate}
                  className="rounded-xl border border-zinc-200/60 bg-white px-4 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-zinc-500 tabular-nums">
                        {n.isoDate} · {BODY_STATE_META[n.state as 0 | 1 | 2 | 3 | 4 | 5].label}
                      </div>
                      <div className="mt-1 whitespace-pre-wrap break-words text-sm text-zinc-900">
                        {n.note}
                      </div>
                    </div>
                    <Link
                      href={`/?date=${n.isoDate}`}
                      className="shrink-0 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-zinc-800"
                    >
                      跳转
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
