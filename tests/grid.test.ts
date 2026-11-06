import { describe, expect, it } from "vitest";
import { gridLines, snap, snapSteps } from "../src/model/grid";
import type { Stage } from "../src/model/types";

const stage: Stage = { width: 8, depth: 5, sideDivisions: 4, depthDivisions: 5 };

describe("gridLines", () => {
  it("間口8・片側4 で縦線9本・番号 4..0..4・中央だけ center", () => {
    const g = gridLines(stage);
    expect(g.verticals.map((v) => v.x)).toEqual([-4, -3, -2, -1, 0, 1, 2, 3, 4]);
    expect(g.verticals.map((v) => v.label)).toEqual([4, 3, 2, 1, 0, 1, 2, 3, 4]);
    expect(g.verticals.filter((v) => v.center).map((v) => v.x)).toEqual([0]);
  });

  it("奥行き5等分で内側の横線4本", () => {
    expect(gridLines(stage).horizontals).toEqual([1, 2, 3, 4]);
  });
});

describe("snap", () => {
  it("刻みは線の間隔の半分", () => {
    expect(snapSteps(stage)).toEqual({ x: 0.5, y: 0.5 });
  });

  it("0.24→0、0.26→0.5、オフなら動かさない", () => {
    expect(snap({ x: 0.24, y: 1.26 }, stage, true)).toEqual({ x: 0, y: 1.5 });
    expect(snap({ x: 0.26, y: 0 }, stage, true).x).toBe(0.5);
    expect(snap({ x: 0.24, y: 1.26 }, stage, false)).toEqual({ x: 0.24, y: 1.26 });
  });

  it("負の側も対称に吸い付く", () => {
    expect(snap({ x: -1.3, y: 0 }, stage, true).x).toBe(-1.5);
  });
});
