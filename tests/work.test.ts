import { describe, expect, it } from "vitest";
import {
  addMember,
  addSceneAfter,
  createWork,
  duplicateScene,
  moveScene,
  removeMember,
  removeScene,
  setCountsPerPhrase,
  setPosition,
  setTempo,
  updateMember,
  updateScene,
  updateStage,
} from "../src/model/work";
import { MAX_MEMBERS, WING } from "../src/model/types";

const base = () => {
  let w = createWork("テスト");
  w = addMember(w, "あお");
  w = addMember(w, "みく");
  return w;
};

describe("createWork", () => {
  it("8m×5m・片側4・奥行き5・8カウント・テンポ96・場面1つ・人0", () => {
    const w = createWork("発表会");
    expect(w.stage).toEqual({ width: 8, depth: 5, sideDivisions: 4, depthDivisions: 5 });
    expect(w.countsPerPhrase).toBe(8);
    expect(w.tempo).toBe(96);
    expect(w.scenes).toHaveLength(1);
    expect(w.members).toHaveLength(0);
    expect(w.positions[w.scenes[0].id]).toEqual({});
  });
});

describe("人", () => {
  it("足すと全場面に下手（客席から見て左・x が負）の袖の位置ができる", () => {
    let w = createWork("t");
    w = addSceneAfter(w, w.scenes[0].id).work;
    w = addMember(w, "あお");
    const id = w.members[0].id;
    for (const s of w.scenes) {
      const p = w.positions[s.id][id];
      expect(p).toBeDefined();
      expect(p.x).toBeLessThan(-w.stage.width / 2);
      expect(p.x).toBeGreaterThanOrEqual(-w.stage.width / 2 - WING);
    }
  });

  it("消すと全場面から消える", () => {
    let w = base();
    w = addSceneAfter(w, w.scenes[0].id).work;
    const id = w.members[0].id;
    w = removeMember(w, id);
    expect(w.members.map((m) => m.name)).toEqual(["みく"]);
    for (const s of w.scenes) expect(w.positions[s.id][id]).toBeUndefined();
  });

  it("名前は6文字で切られ、空なら仮の名前になる", () => {
    let w = addMember(createWork("t"), "あいうえおかきく");
    expect(w.members[0].name).toBe("あいうえおか");
    w = updateMember(w, w.members[0].id, { name: "  " });
    expect(w.members[0].name).not.toBe("");
  });

  it("同じ名前でも別の人として足せる", () => {
    let w = addMember(createWork("t"), "あお");
    w = addMember(w, "あお");
    expect(w.members).toHaveLength(2);
    expect(w.members[0].id).not.toBe(w.members[1].id);
  });

  it(`${MAX_MEMBERS + 1}人目は足されない`, () => {
    let w = createWork("t");
    for (let i = 0; i < MAX_MEMBERS + 1; i++) w = addMember(w);
    expect(w.members).toHaveLength(MAX_MEMBERS);
  });

  it("色は見本の順に割り当てられる", () => {
    const w = base();
    expect(w.members[0].color).not.toBe(w.members[1].color);
  });
});

describe("場面", () => {
  it("足すと今の場面の立ち位置が写され、すぐ後ろに入る", () => {
    let w = base();
    const s1 = w.scenes[0].id;
    w = setPosition(w, s1, w.members[0].id, { x: 1, y: 2 });
    const r = addSceneAfter(w, s1);
    expect(r.work.scenes[1].id).toBe(r.sceneId);
    expect(r.work.positions[r.sceneId][w.members[0].id]).toEqual({ x: 1, y: 2 });
  });

  it("写した位置を動かしても元の場面は変わらない", () => {
    let w = base();
    const s1 = w.scenes[0].id;
    const r = addSceneAfter(w, s1);
    w = setPosition(r.work, r.sceneId, w.members[0].id, { x: -1, y: 1 });
    expect(w.positions[s1][w.members[0].id]).not.toEqual({ x: -1, y: 1 });
  });

  it("消すとその場面の立ち位置も消える。最後の1つは消えない", () => {
    let w = base();
    const r = addSceneAfter(w, w.scenes[0].id);
    w = removeScene(r.work, r.sceneId);
    expect(w.scenes).toHaveLength(1);
    expect(w.positions[r.sceneId]).toBeUndefined();
    const only = removeScene(w, w.scenes[0].id);
    expect(only.scenes).toHaveLength(1);
  });

  it("並べ替えと複製", () => {
    let w = base();
    const a = w.scenes[0].id;
    const r = addSceneAfter(w, a);
    w = moveScene(r.work, r.sceneId, -1);
    expect(w.scenes.map((s) => s.id)).toEqual([r.sceneId, a]);
    w = moveScene(w, r.sceneId, -1);
    expect(w.scenes.map((s) => s.id)).toEqual([r.sceneId, a]);
    const d = duplicateScene(w, a);
    expect(d.work.scenes.map((s) => s.id)).toEqual([r.sceneId, a, d.sceneId]);
  });

  it("カウントは 0〜64 の整数に丸まる", () => {
    const first = createWork("t");
    const r = addSceneAfter(first, first.scenes[0].id);
    let w = updateScene(r.work, r.sceneId, { moveCounts: 3.6, holdCounts: 999 });
    expect(w.scenes[1].moveCounts).toBe(4);
    expect(w.scenes[1].holdCounts).toBe(64);
    w = updateScene(w, r.sceneId, { holdCounts: -2 });
    expect(w.scenes[1].holdCounts).toBe(0);
    // 最初の場面の移動は常に0
    w = updateScene(w, w.scenes[0].id, { moveCounts: 8 });
    expect(w.scenes[0].moveCounts).toBe(0);
  });
});

describe("設定", () => {
  it("テンポは 40〜240 に収まる", () => {
    expect(setTempo(createWork("t"), 10).tempo).toBe(40);
    expect(setTempo(createWork("t"), 500).tempo).toBe(240);
    expect(setTempo(createWork("t"), Number.NaN).tempo).toBe(96);
  });

  it("カウントの区切りは 8 か 4", () => {
    expect(setCountsPerPhrase(createWork("t"), 4).countsPerPhrase).toBe(4);
  });

  it("ステージを縮めると袖の外の人が袖の内側へ寄る", () => {
    let w = base();
    const s = w.scenes[0].id;
    const id = w.members[0].id;
    w = setPosition(w, s, id, { x: 5, y: 4.5 });
    w = updateStage(w, { width: 4, depth: 3 });
    expect(w.positions[s][id].x).toBe(2 + WING);
    expect(w.positions[s][id].y).toBeLessThanOrEqual(3);
  });

  it("区切りの本数は 1〜10、間口は 1〜30m に収まる", () => {
    const w = updateStage(createWork("t"), { sideDivisions: 0, depthDivisions: 99, width: 100 });
    expect(w.stage.sideDivisions).toBe(1);
    expect(w.stage.depthDivisions).toBe(10);
    expect(w.stage.width).toBe(30);
  });

  it("元の作品は書き換えない", () => {
    const w = base();
    const before = JSON.stringify(w);
    addMember(w, "x");
    updateStage(w, { width: 3 });
    expect(JSON.stringify(w)).toBe(before);
  });
});
