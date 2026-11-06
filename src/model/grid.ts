import type { Position, Stage } from "./types";
import { clampPosition } from "./work";

export type GridLines = {
  /** 縦線。label はセンターからの番号（センター0、左右へ1・2・3…） */
  verticals: { x: number; label: number; center: boolean }[];
  /** 奥行きの内側の横線（客席側の端からの距離） */
  horizontals: number[];
};

const round = (v: number) => Math.round(v * 1000) / 1000;

export function gridLines(stage: Stage): GridLines {
  const step = stage.width / 2 / stage.sideDivisions;
  const verticals = [];
  for (let i = -stage.sideDivisions; i <= stage.sideDivisions; i++) {
    verticals.push({ x: round(i * step), label: Math.abs(i), center: i === 0 });
  }
  const rowStep = stage.depth / stage.depthDivisions;
  const horizontals = [];
  for (let r = 1; r < stage.depthDivisions; r++) horizontals.push(round(r * rowStep));
  return { verticals, horizontals };
}

/** 吸い付きの刻み。線の間隔の半分 */
export function snapSteps(stage: Stage): { x: number; y: number } {
  return { x: stage.width / 2 / stage.sideDivisions / 2, y: stage.depth / stage.depthDivisions / 2 };
}

export function snap(p: Position, stage: Stage, on: boolean): Position {
  if (!on) return p;
  const s = snapSteps(stage);
  // センター（x=0）と客席側の端（y=0）を基準にそろえる。-0 は 0 にする
  const to = (v: number, step: number) => round(Math.round(v / step) * step) + 0;
  return clampPosition({ x: to(p.x, s.x), y: to(p.y, s.y) }, stage);
}
