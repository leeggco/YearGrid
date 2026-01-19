import { format, parseISO, startOfDay, isAfter, endOfDay, differenceInSeconds, isBefore, differenceInCalendarDays } from 'date-fns';
import { Entry, RangeMilestone, SavedRange } from './types';
import { isBodyState, isThemeColor } from './utils';
import { ViewMode } from '@/hooks/useYearProgress';

export function isISODateKey(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  try {
    return format(parseISO(value), 'yyyy-MM-dd') === value;
  } catch {
    return false;
  }
}

export function normalizeEntries(value: unknown) {
  if (!value || typeof value !== 'object') return null;
  const next: Record<string, Entry> = {};
  for (const [isoDate, entry] of Object.entries(value as Record<string, unknown>)) {
    if (!isISODateKey(isoDate)) continue;
    if (!entry || typeof entry !== 'object') continue;
    const state = (entry as { state?: unknown }).state;
    const note = (entry as { note?: unknown }).note;
    if (!isBodyState(state)) continue;
    const safeNote = typeof note === 'string' ? note : '';
    if (state === 0 && safeNote.trim() === '') continue;
    next[isoDate] = { state, note: safeNote };
  }
  return next;
}

export function normalizeRanges(value: unknown) {
  if (!Array.isArray(value)) return null;
  const cleaned: SavedRange[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const id = (item as { id?: unknown }).id;
    const name = (item as { name?: unknown }).name;
    const startISO = (item as { startISO?: unknown }).startISO;
    const endISO = (item as { endISO?: unknown }).endISO;
    const color = (item as { color?: unknown }).color;
    const entries = (item as { entries?: unknown }).entries;
    const goal = (item as { goal?: unknown }).goal;
    const milestones = (item as { milestones?: unknown }).milestones;
    const isCompleted = (item as { isCompleted?: unknown }).isCompleted;
    const completedAtISO = (item as { completedAtISO?: unknown }).completedAtISO;
    if (typeof id !== 'string' || typeof startISO !== 'string' || typeof endISO !== 'string') continue;
    const safeName = typeof name === 'string' ? name.trim() : '';
    try {
      const start = startOfDay(parseISO(startISO));
      const end = startOfDay(parseISO(endISO));
      if (isAfter(start, end)) continue;
    } catch {
      continue;
    }
    const safeColor = isThemeColor(color) ? color : undefined;
    const normalizedEntries = normalizeEntries(entries) ?? undefined;
    const safeGoal = typeof goal === 'string' ? goal.trim() : '';
    const safeMilestones: RangeMilestone[] = Array.isArray(milestones)
      ? milestones
          .map((m, i) => {
            if (!m || typeof m !== 'object') return null;
            const mid = (m as { id?: unknown }).id;
            const text = (m as { text?: unknown }).text;
            const done = (m as { done?: unknown }).done;
            if (typeof text !== 'string') return null;
            const safeText = text.trim();
            if (!safeText) return null;
            const safeId = typeof mid === 'string' && mid.trim() ? mid.trim() : `m_${i + 1}`;
            return { id: safeId, text: safeText, ...(typeof done === 'boolean' ? { done } : {}) };
          })
          .filter((m): m is RangeMilestone => m !== null)
          .slice(0, 20)
      : [];
    const safeIsCompleted = typeof isCompleted === 'boolean' ? isCompleted : undefined;
    const safeCompletedAtISO = typeof completedAtISO === 'string' ? completedAtISO : undefined;
    cleaned.push({
      id,
      name: safeName || '区间',
      startISO,
      endISO,
      ...(safeColor ? { color: safeColor } : {}),
      ...(normalizedEntries ? { entries: normalizedEntries } : {}),
      ...(safeGoal ? { goal: safeGoal } : {}),
      ...(safeMilestones.length ? { milestones: safeMilestones } : {}),
      ...(safeIsCompleted !== undefined ? { isCompleted: safeIsCompleted } : {}),
      ...(safeCompletedAtISO ? { completedAtISO: safeCompletedAtISO } : {})
    });
  }
  if (cleaned.length === 0) return [];
  const usedIds = new Set<string>();
  const usedNames = new Set<string>();
  const result: SavedRange[] = [];
  for (const r of cleaned) {
    const baseId = r.id.trim() || `range_${Date.now()}`;
    let nextId = baseId;
    while (usedIds.has(nextId)) nextId = `${baseId}_${Math.floor(Math.random() * 100000)}`;
    usedIds.add(nextId);
    const baseName = r.name.trim() || '区间';
    let nextName = baseName;
    if (usedNames.has(nextName)) {
      let i = 2;
      while (usedNames.has(`${baseName}-${i}`)) i += 1;
      nextName = `${baseName}-${i}`;
    }
    usedNames.add(nextName);
    result.push({ ...r, id: nextId, name: nextName });
  }
  return result;
}

export function normalizeViewPref(value: unknown) {
  if (!value || typeof value !== 'object') return null;
  const mode = (value as { mode?: unknown }).mode;
  const anchorISO = (value as { anchorISO?: unknown }).anchorISO;
  const customStartISO = (value as { customStartISO?: unknown }).customStartISO;
  const customEndISO = (value as { customEndISO?: unknown }).customEndISO;
  const activeRangeId = (value as { activeRangeId?: unknown }).activeRangeId;
  const cellClickPreference = (value as { cellClickPreference?: unknown }).cellClickPreference;
  const safeMode: ViewMode | null =
    mode === 'year' || mode === 'month' || mode === 'week' || mode === 'range' ? mode : null;
  const safeCellClickPreference: 'open' | 'quick_record' | null =
    cellClickPreference === 'open' || cellClickPreference === 'quick_record' ? cellClickPreference : null;
  const normalized = {
    mode: safeMode,
    anchorISO: typeof anchorISO === 'string' ? anchorISO : null,
    customStartISO: typeof customStartISO === 'string' ? customStartISO : null,
    customEndISO: typeof customEndISO === 'string' ? customEndISO : null,
    activeRangeId: typeof activeRangeId === 'string' ? activeRangeId : null,
    cellClickPreference: safeCellClickPreference
  };
  if (
    !normalized.mode &&
    !normalized.anchorISO &&
    !normalized.customStartISO &&
    !normalized.customEndISO &&
    !normalized.activeRangeId &&
    !normalized.cellClickPreference
  ) {
    return null;
  }
  return normalized;
}

export function mergeRanges(base: SavedRange[], incoming: SavedRange[]) {
  const usedIds = new Set(base.map((r) => r.id));
  const usedNames = new Set(base.map((r) => r.name.trim()));
  const out = [...base];
  for (const r of incoming) {
    let id = r.id;
    if (!id || usedIds.has(id)) id = `range_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
    usedIds.add(id);
    let name = r.name.trim() || '区间';
    if (usedNames.has(name)) {
      let i = 2;
      while (usedNames.has(`${name}-${i}`)) i += 1;
      name = `${name}-${i}`;
    }
    usedNames.add(name);
    out.push({ ...r, id, name });
  }
  return out;
}

export function computeRangePreview({
  now,
  todayStart,
  dragStartISO,
  dragCurrentISO,
  isDragging,
  rangeDraftStartISO,
  rangeDraftEndISO
}: {
  now: Date;
  todayStart: Date;
  dragStartISO: string | null;
  dragCurrentISO: string | null;
  isDragging: boolean;
  rangeDraftStartISO: string;
  rangeDraftEndISO: string;
}) {
  const bounds = (() => {
    if (isDragging && dragStartISO && dragCurrentISO && dragStartISO !== dragCurrentISO) {
      const s = dragStartISO < dragCurrentISO ? dragStartISO : dragCurrentISO;
      const e = dragStartISO > dragCurrentISO ? dragStartISO : dragCurrentISO;
      return { startISO: s, endISO: e };
    }
    if (rangeDraftStartISO && rangeDraftEndISO) {
      return { startISO: rangeDraftStartISO, endISO: rangeDraftEndISO };
    }
    return null;
  })();

  if (!bounds) return null;

  try {
    const start = startOfDay(parseISO(bounds.startISO));
    const end = startOfDay(parseISO(bounds.endISO));
    if (isAfter(start, end)) return null;

    const endAt = endOfDay(end);
    const totalSeconds = differenceInSeconds(endAt, start);
    const cursor = isBefore(now, start) ? start : isAfter(now, endAt) ? endAt : now;
    const elapsedSeconds = differenceInSeconds(cursor, start);
    const percent =
      totalSeconds <= 0 ? 100 : Math.min(100, Math.max(0, (elapsedSeconds / totalSeconds) * 100));

    const remainingSeconds = Math.max(0, differenceInSeconds(endAt, now));
    const remDays = Math.floor(remainingSeconds / 86400);
    const remHours = Math.floor((remainingSeconds % 86400) / 3600);
    const remMinutes = Math.floor((remainingSeconds % 3600) / 60);
    const remSeconds = remainingSeconds % 60;
    const remainingText = `${remDays}天 ${remHours.toString().padStart(2, '0')}:${remMinutes
      .toString()
      .padStart(2, '0')}:${remSeconds.toString().padStart(2, '0')}`;

    const totalDays = differenceInCalendarDays(end, start) + 1;
    const elapsedDays = isBefore(now, start)
      ? 0
      : isAfter(now, endAt)
        ? totalDays
        : differenceInCalendarDays(todayStart, start) + 1;

    return {
      startISO: bounds.startISO,
      endISO: bounds.endISO,
      percent,
      remainingText,
      elapsedDays,
      totalDays
    };
  } catch {
    return null;
  }
}
