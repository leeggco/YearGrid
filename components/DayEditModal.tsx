'use client';

import { LegacyRef, useEffect, useMemo, useState } from 'react';
import { YearDay } from '@/hooks/useYearProgress';
import { BodyState, Entry } from '@/lib/types';
import { BODY_STATE_META, BODY_STATE_TEXT } from '@/lib/constants';

interface DayEditModalProps {
  selectedDay: YearDay;
  selectedEntry: Entry | null;
  modalRef: LegacyRef<HTMLDivElement>;
  onClose: () => void;
  activeStateButtonClass: (state: BodyState) => string;
  onDelete: () => void;
  justSaved?: boolean;
  onSave: (state: BodyState, note: string) => Promise<boolean>;
  saveDisabled: boolean;
}

export function DayEditModal({
  selectedDay,
  selectedEntry,
  modalRef,
  onClose,
  activeStateButtonClass,
  onDelete,
  justSaved,
  onSave,
  saveDisabled
}: DayEditModalProps) {
  const [draftState, setDraftState] = useState<BodyState>((selectedEntry?.state ?? 0) as BodyState);
  const [draftNote, setDraftNote] = useState(selectedEntry?.note ?? '');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setDraftState((selectedEntry?.state ?? 0) as BodyState);
    setDraftNote(selectedEntry?.note ?? '');
  }, [selectedDay.isoDate, selectedEntry?.note, selectedEntry?.state]);

  const isDraftDirty = useMemo(() => {
    const baseState = (selectedEntry?.state ?? 0) as BodyState;
    const baseNote = selectedEntry?.note ?? '';
    return draftState !== baseState || draftNote !== baseNote;
  }, [draftNote, draftState, selectedEntry?.note, selectedEntry?.state]);

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/20 p-4 md:items-center"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`day-dialog-title-${selectedDay.isoDate}`}
        className="w-full max-w-[520px] rounded-2xl border border-zinc-200/70 bg-white/90 p-4 shadow-[0_22px_70px_rgba(0,0,0,0.14)] backdrop-blur-xl outline-none"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div
              id={`day-dialog-title-${selectedDay.isoDate}`}
              className="text-sm text-zinc-950"
            >
              {selectedDay.label}
            </div>
            <div className="mt-1 text-xs text-zinc-600">
              {selectedDay.holiday ? `节日：${selectedDay.holiday}` : ' '}
            </div>
            <div className="mt-1 text-xs text-zinc-600">
              体感：{BODY_STATE_TEXT[draftState]}
            </div>
          </div>
          <div className="min-h-[18px] text-xs font-medium text-emerald-600">
            {justSaved ? '已保存' : null}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {(
            [
              { state: 0 as const, label: `${BODY_STATE_META[0].emoji} ${BODY_STATE_META[0].label}` },
              { state: 1 as const, label: `${BODY_STATE_META[1].emoji} ${BODY_STATE_META[1].label}` },
              { state: 2 as const, label: `${BODY_STATE_META[2].emoji} ${BODY_STATE_META[2].label}` },
              { state: 3 as const, label: `${BODY_STATE_META[3].emoji} ${BODY_STATE_META[3].label}` },
              { state: 4 as const, label: `${BODY_STATE_META[4].emoji} ${BODY_STATE_META[4].label}` },
              { state: 5 as const, label: `${BODY_STATE_META[5].emoji} ${BODY_STATE_META[5].label}` }
            ] as const
          ).map((item) => {
            const active = (selectedEntry?.state ?? 0) === item.state;
            return (
              <button
                key={item.state}
                type="button"
                className={`rounded-full border px-3 py-1 text-xs transition ${
                  active
                    ? activeStateButtonClass(item.state)
                    : 'border-zinc-200 bg-white/60 text-zinc-700 hover:bg-white'
                }`}
                onClick={() => setDraftState(item.state)}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        <div className="mt-4">
          <textarea
            placeholder="写点什么（可选）..."
            value={draftNote}
            onChange={(e) => setDraftNote(e.target.value)}
            rows={4}
            className="w-full resize-none rounded-xl border border-zinc-200/60 bg-white/50 px-3 py-2 text-xs text-zinc-900 placeholder-zinc-400 outline-none ring-zinc-900/5 transition focus:border-zinc-900/20 focus:bg-white focus:ring-4"
          />
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onDelete}
            className="text-xs text-rose-500 hover:text-rose-600 transition"
          >
            删除记录
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900"
            >
              取消
            </button>
            <button
              type="button"
              disabled={saveDisabled || isSaving || !isDraftDirty}
              onClick={async () => {
                if (isSaving || saveDisabled || !isDraftDirty) return;
                setIsSaving(true);
                try {
                  await onSave(draftState, draftNote);
                } finally {
                  setIsSaving(false);
                }
              }}
              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-emerald-700 disabled:bg-zinc-100 disabled:text-zinc-400"
            >
              {isSaving ? '保存中…' : '保存'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
