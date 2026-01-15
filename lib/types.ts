export type ThemeColor = 'emerald' | 'blue' | 'rose' | 'amber' | 'violet' | 'cyan';

export type BodyState = 0 | 1 | 2 | 3 | 4 | 5;

export type Entry = {
  state: BodyState;
  note: string;
};

export type SavedRange = {
  id: string;
  name: string;
  startISO: string;
  endISO: string;
  color?: ThemeColor;
  entries?: Record<string, Entry>;
};

export type CustomRange = SavedRange;

export interface BodyStateMeta {
  label: string;
  emoji: string;
  dotClass: string;
}
