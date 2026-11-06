import type { Positions, Work } from "./types";

export type SceneSpan = { sceneId: string; start: number; holdStart: number; end: number };

/** 場面ごとの区間（カウント単位）。場面 n は start〜holdStart で前の位置から移り、holdStart〜end で止まる */
export function sceneSpans(w: Work): SceneSpan[] {
  let t = 0;
  return w.scenes.map((s, i) => {
    const start = t;
    const holdStart = start + (i === 0 ? 0 : s.moveCounts);
    const end = holdStart + s.holdCounts;
    t = end;
    return { sceneId: s.id, start, holdStart, end };
  });
}

export function totalCounts(w: Work): number {
  const spans = sceneSpans(w);
  return spans.length ? spans[spans.length - 1].end : 0;
}

/** 時刻 t が属する場面。移動中は行き先の場面に属する */
export function sceneIndexAt(w: Work, t: number): number {
  const spans = sceneSpans(w);
  for (let i = 0; i < spans.length; i++) {
    if (t < spans[i].end) return i;
  }
  return Math.max(0, spans.length - 1);
}

/** 時刻 t が属する場面の、止まりの始まり */
export function holdStartAt(w: Work, t: number): number {
  const spans = sceneSpans(w);
  return spans[sceneIndexAt(w, t)]?.holdStart ?? 0;
}

export function positionsAt(w: Work, t: number): Positions {
  const spans = sceneSpans(w);
  if (!spans.length) return {};
  const i = sceneIndexAt(w, Math.max(0, t));
  const span = spans[i];
  const here = w.positions[span.sceneId] ?? {};
  const move = span.holdStart - span.start;
  if (i === 0 || move <= 0 || t >= span.holdStart) return here;
  const prev = w.positions[spans[i - 1].sceneId] ?? {};
  const k = Math.min(1, Math.max(0, (t - span.start) / move));
  const out: Positions = {};
  for (const [id, to] of Object.entries(here)) {
    const from = prev[id] ?? to;
    out[id] = { x: from.x + (to.x - from.x) * k, y: from.y + (to.y - from.y) * k };
  }
  return out;
}

/** 「3つ目の8 の 5」のような表示用。t=0 は1つ目の1 */
export function countLabel(t: number, countsPerPhrase: number): { phrase: number; beat: number } {
  const c = Math.max(0, Math.floor(t + 1e-9));
  return { phrase: Math.floor(c / countsPerPhrase) + 1, beat: (c % countsPerPhrase) + 1 };
}
