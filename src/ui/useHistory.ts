import { useCallback, useRef, useState } from "react";
import type { Work } from "../model/types";

const LIMIT = 100;

type State = { past: Work[]; present: Work; future: Work[]; mergeKey?: string };

/** 作品全体の写しを積む取り消し・やり直し。onChange は変わるたびに呼ばれる（保存用） */
export function useHistory(initial: Work, onChange: (w: Work) => void) {
  const ref = useRef<State>({ past: [], present: initial, future: [] });
  const [, render] = useState(0);

  const apply = useCallback(
    (next: State, touched = false) => {
      ref.current = next;
      render((n) => n + 1);
      // 取り消し・やり直しも作品を変えたことになるので、更新日時は今にする（一覧の並びと書き出しの目安のため）
      onChange(touched ? { ...next.present, updatedAt: Date.now() } : next.present);
    },
    [onChange],
  );

  /** mergeKey が直前と同じなら、履歴を積まずに今の写しを差し替える（文字入力を1回分にまとめる） */
  const set = useCallback(
    (next: Work, mergeKey?: string) => {
      const cur = ref.current;
      if (next === cur.present) return;
      if (mergeKey && cur.mergeKey === mergeKey) {
        apply({ ...cur, present: next, future: [] });
        return;
      }
      apply({ past: [...cur.past, cur.present].slice(-LIMIT), present: next, future: [], mergeKey });
    },
    [apply],
  );

  const undo = useCallback(() => {
    const cur = ref.current;
    if (!cur.past.length) return;
    apply({ past: cur.past.slice(0, -1), present: cur.past[cur.past.length - 1], future: [cur.present, ...cur.future] }, true);
  }, [apply]);

  const redo = useCallback(() => {
    const cur = ref.current;
    if (!cur.future.length) return;
    apply({ past: [...cur.past, cur.present], present: cur.future[0], future: cur.future.slice(1) }, true);
  }, [apply]);

  /** 今の作品（トーストの「元に戻す」が、押した時点の作品を確かめるため） */
  const current = useCallback(() => ref.current.present, []);

  const s = ref.current;
  return {
    current, work: s.present, set, undo, redo, canUndo: s.past.length > 0, canRedo: s.future.length > 0 };
}
