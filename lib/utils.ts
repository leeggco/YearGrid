import { BodyState } from './types';
import { ThemeColor, SavedRange } from '@/components/RangeSelector';

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function makeUniqueRangeName(desired: string, ranges: SavedRange[]) {
  const base = desired.trim() || '区间';
  const taken = new Set(ranges.map((r) => r.name.trim()));
  if (!taken.has(base)) return base;
  let i = 2;
  while (taken.has(`${base}-${i}`)) i += 1;
  return `${base}-${i}`;
}

export function safeParseJSON(raw: string | null): unknown | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

export function isBodyState(value: unknown): value is BodyState {
  return value === 0 || value === 1 || value === 2 || value === 3 || value === 4 || value === 5;
}

export function isThemeColor(value: unknown): value is ThemeColor {
  return (
    value === 'emerald' ||
    value === 'blue' ||
    value === 'rose' ||
    value === 'amber' ||
    value === 'violet' ||
    value === 'zinc'
  );
}

export function activeStateButtonClass(state: BodyState) {
  switch (state) {
    case 0:
      return 'border-zinc-300 bg-zinc-50 text-zinc-900 shadow-sm';
    case 1:
      return 'border-rose-300 bg-rose-50 text-rose-900 shadow-sm';
    case 2:
      return 'border-amber-300 bg-amber-50 text-amber-900 shadow-sm';
    case 3:
      return 'border-zinc-300 bg-zinc-100 text-zinc-900 shadow-sm';
    case 4:
      return 'border-cyan-300 bg-cyan-50 text-cyan-900 shadow-sm';
    case 5:
      return 'border-emerald-300 bg-emerald-50 text-emerald-900 shadow-sm';
  }
}
