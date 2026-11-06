import { gridLines } from "../model/grid";
import { WING, type Positions, type Work } from "../model/types";

/*
 * ステージの図を「図形の一覧」として計算する。画面（SVG）と書き出し（Canvas）は、この一覧を描くだけ。
 * 座標はメートル。画面の向きは x が右、y が下（客席が下）。
 */

export type ShapeRole = "number" | "label" | "name" | "selected" | "person" | "from" | "other";

export type Shape =
  | { kind: "rect"; x: number; y: number; w: number; h: number; fill: string; r?: number }
  | { kind: "line"; x1: number; y1: number; x2: number; y2: number; stroke: string; width: number; dash?: number[] }
  | {
      kind: "text";
      x: number;
      y: number;
      text: string;
      size: number;
      weight: number;
      fill: string;
      anchor: "start" | "middle" | "end";
      role: ShapeRole;
    }
  | {
      kind: "circle";
      x: number;
      y: number;
      r: number;
      fill: string;
      stroke?: string;
      strokeWidth?: number;
      dash?: number[];
      role: ShapeRole;
      id?: string;
    }
  | { kind: "arrow"; x1: number; y1: number; x2: number; y2: number; stroke: string; width: number; head: number };

export type StageView = { minX: number; minY: number; width: number; height: number };

export type StagePalette = {
  wing: string;
  floor: string;
  line: string;
  center: string;
  tag: string;
  tagText: string;
  tagCenter: string;
  tagCenterText: string;
  label: string;
  arrow: string;
  ring: string;
  selected: string;
  text: string;
};

export const LIGHT_STAGE: StagePalette = {
  wing: "#E9EEF5",
  floor: "#F5F8FC",
  line: "#D5DEEA",
  center: "#1F2329",
  tag: "#E3EAF4",
  tagText: "#1F2329",
  tagCenter: "#1F2329",
  tagCenterText: "#FFFFFF",
  label: "#1F2329",
  arrow: "rgba(31,35,41,0.4)",
  ring: "#1F2329",
  selected: "#1F2329",
  text: "#1F2329",
};

export const DARK_STAGE: StagePalette = {
  wing: "#232831",
  floor: "#2B313B",
  line: "#3F4754",
  center: "#E8EDF4",
  tag: "#3A4250",
  tagText: "#E8EDF4",
  tagCenter: "#E8EDF4",
  tagCenterText: "#1F2329",
  label: "#E8EDF4",
  arrow: "rgba(232,237,244,0.5)",
  ring: "#1F2329",
  selected: "#E8EDF4",
  // 丸は明るい色なので、名前はダークでも黒にする
  text: "#1F2329",
};

export type PersonHit = { id: string; cx: number; cy: number; r: number };

export type StageShapes = {
  view: StageView;
  shapes: Shape[];
  people: PersonHit[];
  /** 画面の座標（m）→ 作品の座標 */
  toModel: (vx: number, vy: number) => { x: number; y: number };
  /** 作品の座標 → 画面の座標（m） */
  toView: (x: number, y: number) => { x: number; y: number };
};

export type StageShapesArgs = {
  positions: Positions;
  /** 前の場面の位置。あれば動線を引く */
  previous?: Positions;
  selectedId?: string;
  showPaths: boolean;
  palette: StagePalette;
  /** 番号・上手下手・客席の文字を出すか（縮図では出さない） */
  labels: boolean;
};

/** 丸の半径。表示の幅に比例させ、大きなステージでも丸が見えるようにする */
export function personRadius(viewWidth: number): number {
  return Math.min(1.2, Math.max(0.25, viewWidth * 0.033));
}

export function nameSize(name: string, r: number): number {
  const n = Array.from(name).length;
  if (n <= 2) return r * 0.72;
  if (n === 3) return r * 0.52;
  return r * 0.46;
}

export function buildStageShapes(w: Work, a: StageShapesArgs): StageShapes {
  const { stage } = w;
  const p = a.palette;
  const fullWidth = stage.width + WING * 2;
  /** 文字や線の太さの単位。既定のステージ（8m＋袖）で 1 */
  const u = fullWidth / 11;
  const padTop = a.labels ? 0.7 * u : 0.15 * u;
  const padBottom = a.labels ? 0.95 * u : 0.15 * u;
  const minX = -fullWidth / 2;
  const view: StageView = { minX, minY: 0, width: fullWidth, height: stage.depth + padTop + padBottom };
  const Y = (y: number) => padTop + (stage.depth - y);
  const top = padTop;
  const bottom = padTop + stage.depth;
  const shapes: Shape[] = [];

  shapes.push({ kind: "rect", x: minX, y: top, w: fullWidth, h: stage.depth, fill: p.wing });
  shapes.push({ kind: "rect", x: -stage.width / 2, y: top, w: stage.width, h: stage.depth, fill: p.floor });

  const grid = gridLines(stage);
  for (const h of grid.horizontals) {
    shapes.push({ kind: "line", x1: -stage.width / 2, y1: Y(h), x2: stage.width / 2, y2: Y(h), stroke: p.line, width: 0.02 * u });
  }
  for (const v of grid.verticals) {
    shapes.push({
      kind: "line",
      x1: v.x,
      y1: top,
      x2: v.x,
      y2: bottom,
      stroke: v.center ? p.center : p.line,
      width: (v.center ? 0.06 : 0.02) * u,
    });
  }

  if (a.labels) {
    const tw = 0.44 * u;
    const th = 0.36 * u;
    for (const v of grid.verticals) {
      shapes.push({
        kind: "rect",
        x: v.x - tw / 2,
        y: bottom + 0.12 * u,
        w: tw,
        h: th,
        r: 0.08 * u,
        fill: v.center ? p.tagCenter : p.tag,
      });
      shapes.push({
        kind: "text",
        x: v.x,
        y: bottom + 0.12 * u + th * 0.74,
        text: String(v.label),
        size: 0.26 * u,
        weight: 900,
        fill: v.center ? p.tagCenterText : p.tagText,
        anchor: "middle",
        role: "number",
      });
    }
    const labelSize = 0.26 * u;
    // 客席から見て左が下手、右が上手
    shapes.push({ kind: "text", x: minX + 0.1 * u, y: top - 0.22 * u, text: "下手", size: labelSize, weight: 500, fill: p.label, anchor: "start", role: "label" });
    shapes.push({ kind: "text", x: minX + fullWidth - 0.1 * u, y: top - 0.22 * u, text: "上手", size: labelSize, weight: 500, fill: p.label, anchor: "end", role: "label" });
    shapes.push({ kind: "text", x: 0, y: bottom + 0.82 * u, text: "客席", size: 0.24 * u, weight: 500, fill: p.label, anchor: "middle", role: "label" });
  }

  const r = personRadius(fullWidth);
  if (a.showPaths && a.previous) {
    for (const m of w.members) {
      const from = a.previous[m.id];
      const to = a.positions[m.id];
      if (!from || !to) continue;
      const x1 = from.x;
      const y1 = Y(from.y);
      const x2 = to.x;
      const y2 = Y(to.y);
      const len = Math.hypot(x2 - x1, y2 - y1);
      if (len < 0.3) continue;
      const ux = (x2 - x1) / len;
      const uy = (y2 - y1) / len;
      shapes.push({ kind: "circle", x: x1, y: y1, r: r * 0.45, fill: "none", stroke: p.arrow, strokeWidth: 0.03 * u, dash: [0.06 * u, 0.05 * u], role: "from" });
      shapes.push({
        kind: "arrow",
        x1,
        y1,
        x2: x2 - ux * (r + 0.04 * u),
        y2: y2 - uy * (r + 0.04 * u),
        stroke: p.arrow,
        width: 0.04 * u,
        head: 0.2 * u,
      });
    }
  }

  const people: PersonHit[] = [];
  for (const m of w.members) {
    const pos = a.positions[m.id];
    if (!pos) continue;
    const cx = pos.x;
    const cy = Y(pos.y);
    people.push({ id: m.id, cx, cy, r });
    if (a.selectedId === m.id) {
      shapes.push({ kind: "circle", x: cx, y: cy, r: r + 0.12 * u, fill: "none", stroke: p.selected, strokeWidth: 0.05 * u, role: "selected" });
    }
    shapes.push({ kind: "circle", x: cx, y: cy, r, fill: m.color, stroke: p.ring, strokeWidth: 0.035 * u, role: "person", id: m.id });
    if (a.labels) {
      const size = nameSize(m.name, r);
      shapes.push({ kind: "text", x: cx, y: cy + size * 0.36, text: m.name, size, weight: 700, fill: p.text, anchor: "middle", role: "name" });
    }
  }
  return { view, shapes, people, toModel: (vx, vy) => ({ x: vx, y: padTop + stage.depth - vy }), toView: (x, y) => ({ x, y: Y(y) }) };
}
