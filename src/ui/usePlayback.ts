import { useCallback, useEffect, useRef, useState } from "react";

/** カウント単位の再生の時計。total に着いたら止まる */
export function usePlayback(total: number, tempo: number) {
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const tRef = useRef(0);
  tRef.current = t;

  useEffect(() => {
    if (!playing) return;
    let last = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const next = tRef.current + ((now - last) / 1000) * (tempo / 60);
      last = now;
      if (next >= total) {
        setT(total);
        setPlaying(false);
        return;
      }
      setT(next);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, tempo, total]);

  const play = useCallback(() => {
    if (total <= 0) return;
    if (tRef.current >= total) setT(0);
    setPlaying(true);
  }, [total]);
  const pause = useCallback(() => setPlaying(false), []);
  const seek = useCallback((v: number) => setT(Math.max(0, Math.min(total, v))), [total]);

  return { t: Math.min(t, total), playing, play, pause, seek };
}
