import { BodyState, BodyStateMeta } from './types';

export const BODY_STATE_META: Record<BodyState, BodyStateMeta> = {
  0: { label: '未记录', emoji: '◻︎', dotClass: 'hidden' },
  1: { label: '很差', emoji: '😣', dotClass: 'bg-rose-400' },
  2: { label: '偏差', emoji: '😕', dotClass: 'bg-amber-400' },
  3: { label: '一般', emoji: '😐', dotClass: 'bg-zinc-400' },
  4: { label: '不错', emoji: '🙂', dotClass: 'bg-cyan-400' },
  5: { label: '很好', emoji: '😄', dotClass: 'bg-emerald-600' }
};

export const BODY_STATE_TEXT: Record<BodyState, string> = {
  0: `${BODY_STATE_META[0].emoji} ${BODY_STATE_META[0].label}`,
  1: `${BODY_STATE_META[1].emoji} ${BODY_STATE_META[1].label}`,
  2: `${BODY_STATE_META[2].emoji} ${BODY_STATE_META[2].label}`,
  3: `${BODY_STATE_META[3].emoji} ${BODY_STATE_META[3].label}`,
  4: `${BODY_STATE_META[4].emoji} ${BODY_STATE_META[4].label}`,
  5: `${BODY_STATE_META[5].emoji} ${BODY_STATE_META[5].label}`
};
