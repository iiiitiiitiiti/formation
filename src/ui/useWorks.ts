import { useCallback, useEffect, useRef, useState } from "react";
import { loadWorks, saveWorks } from "../model/storage";
import type { Work } from "../model/types";

/** 作品一覧の状態。変更は 300ms まとめて保存し、画面を離れるときはすぐ保存する */
export function useWorks() {
  const [initial] = useState(loadWorks);
  const [works, setWorks] = useState<Work[]>(initial.works);
  const [saveFailed, setSaveFailed] = useState(false);
  const pending = useRef<Work[] | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const flush = useCallback(() => {
    window.clearTimeout(timer.current);
    if (!pending.current) return;
    const ok = saveWorks(pending.current);
    pending.current = null;
    setSaveFailed(!ok);
  }, []);

  const commit = useCallback(
    (next: Work[]) => {
      pending.current = next;
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(flush, 300);
    },
    [flush],
  );

  useEffect(() => {
    const onHide = () => flush();
    window.addEventListener("pagehide", onHide);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.removeEventListener("pagehide", onHide);
      document.removeEventListener("visibilitychange", onHide);
      flush();
    };
  }, [flush]);

  const update = useCallback(
    (fn: (cur: Work[]) => Work[]) => {
      setWorks((cur) => {
        const next = fn(cur);
        commit(next);
        return next;
      });
    },
    [commit],
  );

  const upsert = useCallback(
    (w: Work) => update((cur) => (cur.some((x) => x.id === w.id) ? cur.map((x) => (x.id === w.id ? w : x)) : [w, ...cur])),
    [update],
  );
  const remove = useCallback((id: string) => update((cur) => cur.filter((x) => x.id !== id)), [update]);
  /** 消した作品を元の場所へ戻す */
  const restore = useCallback(
    (w: Work, index: number) =>
      update((cur) => (cur.some((x) => x.id === w.id) ? cur : [...cur.slice(0, index), w, ...cur.slice(index)])),
    [update],
  );

  return { works, recovered: initial.recovered, saveFailed, upsert, remove, restore };
}
