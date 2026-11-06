import { describe, expect, it } from "vitest";
import { countLabel, holdStartAt, positionsAt, sceneIndexAt, sceneSpans, totalCounts } from "../src/model/timeline";
import { addMember, addSceneAfter, createWork, setPosition, updateScene } from "../src/model/work";
import type { Work } from "../src/model/types";

/** 場面1（止まり8）→ 場面2（移動4・止まり4） */
function twoScenes(): Work {
  let w = addMember(createWork("t"), "あお");
  const m = w.members[0].id;
  const s1 = w.scenes[0].id;
  w = setPosition(w, s1, m, { x: 0, y: 1 });
  const r = addSceneAfter(w, s1);
  w = setPosition(r.work, r.sceneId, m, { x: 2, y: 3 });
  return updateScene(w, r.sceneId, { moveCounts: 4, holdCounts: 4 });
}

describe("sceneSpans", () => {
  it("移動のあとに止まりが続く", () => {
    const w = twoScenes();
    expect(sceneSpans(w).map(({ start, holdStart, end }) => [start, holdStart, end])).toEqual([
      [0, 0, 8],
      [8, 12, 16],
    ]);
    expect(totalCounts(w)).toBe(16);
  });
});

describe("positionsAt", () => {
  it("移動の途中は直線の中間にいる", () => {
    const w = twoScenes();
    const m = w.members[0].id;
    expect(positionsAt(w, 10)[m]).toEqual({ x: 1, y: 2 });
    expect(positionsAt(w, 4)[m]).toEqual({ x: 0, y: 1 });
    expect(positionsAt(w, 14)[m]).toEqual({ x: 2, y: 3 });
  });

  it("末尾より後ろと負の時刻でも落ちない", () => {
    const w = twoScenes();
    const m = w.members[0].id;
    expect(positionsAt(w, 99)[m]).toEqual({ x: 2, y: 3 });
    expect(positionsAt(w, -1)[m]).toEqual({ x: 0, y: 1 });
  });

  it("移動0の場面は即座に切り替わる", () => {
    let w = twoScenes();
    w = updateScene(w, w.scenes[1].id, { moveCounts: 0 });
    const m = w.members[0].id;
    expect(positionsAt(w, 8)[m]).toEqual({ x: 2, y: 3 });
    expect(positionsAt(w, 7.99)[m]).toEqual({ x: 0, y: 1 });
  });

  it("人が0人・場面1つ・長さ0でも空を返す", () => {
    let w = createWork("t");
    w = updateScene(w, w.scenes[0].id, { holdCounts: 0 });
    expect(totalCounts(w)).toBe(0);
    expect(positionsAt(w, 0)).toEqual({});
    expect(sceneIndexAt(w, 0)).toBe(0);
  });
});

describe("sceneIndexAt と holdStartAt", () => {
  it("移動中はその移動の行き先の場面に属する", () => {
    const w = twoScenes();
    expect(sceneIndexAt(w, 7.5)).toBe(0);
    expect(sceneIndexAt(w, 9)).toBe(1);
    expect(sceneIndexAt(w, 16)).toBe(1);
    expect(holdStartAt(w, 9)).toBe(12);
  });
});

describe("countLabel", () => {
  it("t=0 は1つ目の1、t=8 は2つ目の1、t=5.7 は1つ目の6", () => {
    expect(countLabel(0, 8)).toEqual({ phrase: 1, beat: 1 });
    expect(countLabel(8, 8)).toEqual({ phrase: 2, beat: 1 });
    expect(countLabel(5.7, 8)).toEqual({ phrase: 1, beat: 6 });
    expect(countLabel(5, 4)).toEqual({ phrase: 2, beat: 2 });
  });
});
