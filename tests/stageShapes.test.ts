import { describe, expect, it } from "vitest";
import { buildStageShapes, LIGHT_STAGE } from "../src/render/stageShapes";
import { gridLines } from "../src/model/grid";
import { addMember, createWork, setPosition, updateMember } from "../src/model/work";
import type { Work } from "../src/model/types";

function work(): Work {
  let w = addMember(createWork("t"), "あお");
  w = addMember(w, "みく");
  const s = w.scenes[0].id;
  w = setPosition(w, s, w.members[0].id, { x: 2, y: 1 });
  w = setPosition(w, s, w.members[1].id, { x: -2, y: 4 });
  return w;
}

const build = (w: Work, extra: Partial<Parameters<typeof buildStageShapes>[1]> = {}) =>
  buildStageShapes(w, { positions: w.positions[w.scenes[0].id], showPaths: true, palette: LIGHT_STAGE, labels: true, ...extra });

describe("buildStageShapes", () => {
  it("番号の数が gridLines の縦線と合う", () => {
    const w = work();
    const r = build(w);
    const nums = r.shapes.filter((s) => s.kind === "text" && s.role === "number");
    expect(nums).toHaveLength(gridLines(w.stage).verticals.length);
  });

  it("上手は右、下手は左、客席は下", () => {
    const r = build(work());
    const text = (t: string) => r.shapes.find((s) => s.kind === "text" && s.text === t)!;
    const kami = text("上手");
    const shimo = text("下手");
    const kyaku = text("客席");
    if (kami.kind !== "text" || shimo.kind !== "text" || kyaku.kind !== "text") throw new Error();
    expect(kami.x).toBeGreaterThan(0);
    expect(shimo.x).toBeLessThan(0);
    expect(kyaku.y).toBeGreaterThan(r.view.minY + r.view.height / 2);
  });

  it("人の座標は客席を下にした向き（y が大きいほど上）", () => {
    const w = work();
    const r = build(w);
    const front = r.people.find((p) => p.id === w.members[0].id)!;
    const back = r.people.find((p) => p.id === w.members[1].id)!;
    expect(front.cx).toBe(2);
    expect(back.cx).toBe(-2);
    expect(front.cy).toBeGreaterThan(back.cy);
  });

  it("前の位置があると、0.3m 以上動いた人だけ矢印が出る", () => {
    const w = work();
    const now = w.positions[w.scenes[0].id];
    const previous = { [w.members[0].id]: { x: 2.1, y: 1 }, [w.members[1].id]: { x: 0, y: 0 } };
    expect(build(w, { previous }).shapes.filter((s) => s.kind === "arrow")).toHaveLength(1);
    expect(build(w, { previous, showPaths: false }).shapes.filter((s) => s.kind === "arrow")).toHaveLength(0);
    expect(build(w, { previous: now }).shapes.filter((s) => s.kind === "arrow")).toHaveLength(0);
  });

  it("名前が4文字以上なら文字が小さくなる", () => {
    let w = work();
    const short = build(w).shapes.find((s) => s.kind === "text" && s.text === "あお");
    w = updateMember(w, w.members[0].id, { name: "あおいろさん" });
    const long = build(w).shapes.find((s) => s.kind === "text" && s.text === "あおいろさん");
    if (short?.kind !== "text" || long?.kind !== "text") throw new Error();
    expect(long.size).toBeLessThan(short.size);
  });

  it("選んだ人には輪が付く", () => {
    const w = work();
    const sel = build(w, { selectedId: w.members[0].id }).shapes.filter((s) => s.kind === "circle" && s.role === "selected");
    expect(sel).toHaveLength(1);
  });

  it("人が0人でも描ける", () => {
    const w = createWork("t");
    const r = build(w);
    expect(r.people).toHaveLength(0);
    expect(r.shapes.length).toBeGreaterThan(0);
  });
});
