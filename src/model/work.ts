import {
  COUNT_MAX,
  DIVISIONS_MAX,
  DIVISIONS_MIN,
  MAX_MEMBERS,
  MEMO_MAX,
  NAME_MAX,
  PALETTE,
  STAGE_MAX,
  STAGE_MIN,
  TEMPO_DEFAULT,
  TEMPO_MAX,
  TEMPO_MIN,
  TITLE_MAX,
  WING,
  type Member,
  type Position,
  type Positions,
  type Scene,
  type Stage,
  type Work,
} from "./types";

export function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const num = (v: number, fallback: number) => (Number.isFinite(v) ? v : fallback);

export function cleanText(input: string, max: number): string {
  return Array.from(input.replace(/\s+/g, " ").trim()).slice(0, max).join("");
}

export const cleanCount = (v: number) => clamp(Math.round(num(v, 0)), 0, COUNT_MAX);
export const cleanTempo = (v: number) => clamp(Math.round(num(v, TEMPO_DEFAULT)), TEMPO_MIN, TEMPO_MAX);

/** 長さは 0.5m 刻みで 1〜30m */
const cleanLength = (v: number, fallback: number) => clamp(Math.round(num(v, fallback) * 2) / 2, STAGE_MIN, STAGE_MAX);
const cleanDivisions = (v: number, fallback: number) =>
  clamp(Math.round(num(v, fallback)), DIVISIONS_MIN, DIVISIONS_MAX);

/** 人を置ける範囲（袖を含む） */
export function placeableBounds(stage: Stage) {
  return { minX: -stage.width / 2 - WING, maxX: stage.width / 2 + WING, minY: 0, maxY: stage.depth };
}

export function clampPosition(p: Position, stage: Stage): Position {
  const b = placeableBounds(stage);
  return { x: clamp(num(p.x, 0), b.minX, b.maxX), y: clamp(num(p.y, 0), b.minY, b.maxY) };
}

/** 新しく足した人を置く下手（客席から見て左）の袖の位置。人ごとに少しずつずらす */
export function wingPosition(stage: Stage, index: number): Position {
  const x = -stage.width / 2 - WING / 2;
  const rows = Math.max(1, Math.floor(stage.depth / 0.8));
  const y = stage.depth - 0.5 - (index % rows) * 0.8;
  return clampPosition({ x, y }, stage);
}

const touch = (w: Work): Work => ({ ...w, updatedAt: Date.now() });

export function createWork(title: string): Work {
  const scene: Scene = { id: newId(), memo: "", moveCounts: 0, holdCounts: 8 };
  return {
    version: 1,
    id: newId(),
    title: cleanText(title, TITLE_MAX) || "新しい作品",
    stage: { width: 8, depth: 5, sideDivisions: 4, depthDivisions: 5 },
    countsPerPhrase: 8,
    tempo: TEMPO_DEFAULT,
    members: [],
    scenes: [scene],
    positions: { [scene.id]: {} },
    updatedAt: Date.now(),
    exportedAt: null,
  };
}

export function setTitle(w: Work, title: string): Work {
  return touch({ ...w, title: cleanText(title, TITLE_MAX) || w.title });
}

function nextColor(w: Work): string {
  const used = new Set(w.members.map((m) => m.color));
  return PALETTE.find((c) => !used.has(c)) ?? PALETTE[w.members.length % PALETTE.length];
}

export function addMember(w: Work, name?: string): Work {
  if (w.members.length >= MAX_MEMBERS) return w;
  const member: Member = {
    id: newId(),
    name: cleanText(name ?? "", NAME_MAX) || String(w.members.length + 1),
    color: nextColor(w),
  };
  const pos = wingPosition(w.stage, w.members.length);
  const positions: Work["positions"] = {};
  for (const s of w.scenes) positions[s.id] = { ...w.positions[s.id], [member.id]: { ...pos } };
  return touch({ ...w, members: [...w.members, member], positions });
}

export function updateMember(w: Work, id: string, patch: Partial<Omit<Member, "id">>): Work {
  return touch({
    ...w,
    members: w.members.map((m) => {
      if (m.id !== id) return m;
      const name = patch.name === undefined ? m.name : cleanText(patch.name, NAME_MAX) || m.name || "?";
      return { ...m, ...patch, name };
    }),
  });
}

export function removeMember(w: Work, id: string): Work {
  const positions: Work["positions"] = {};
  for (const s of w.scenes) {
    const { [id]: _removed, ...rest } = w.positions[s.id] ?? {};
    positions[s.id] = rest;
  }
  return touch({ ...w, members: w.members.filter((m) => m.id !== id), positions });
}

const copyPositions = (p: Positions | undefined): Positions =>
  Object.fromEntries(Object.entries(p ?? {}).map(([k, v]) => [k, { ...v }]));

/** 最初の場面の移動カウントは常に0にそろえる */
const normalizeScenes = (scenes: Scene[]): Scene[] =>
  scenes.map((s, i) => (i === 0 && s.moveCounts !== 0 ? { ...s, moveCounts: 0 } : s));

function insertSceneAfter(w: Work, sceneId: string, scene: Scene): { work: Work; sceneId: string } {
  const i = w.scenes.findIndex((s) => s.id === sceneId);
  const at = i < 0 ? w.scenes.length : i + 1;
  const scenes = [...w.scenes.slice(0, at), scene, ...w.scenes.slice(at)];
  const positions = { ...w.positions, [scene.id]: copyPositions(w.positions[sceneId]) };
  return { work: touch({ ...w, scenes: normalizeScenes(scenes), positions }), sceneId: scene.id };
}

export function addSceneAfter(w: Work, sceneId: string): { work: Work; sceneId: string } {
  return insertSceneAfter(w, sceneId, { id: newId(), memo: "", moveCounts: 4, holdCounts: 4 });
}

export function duplicateScene(w: Work, sceneId: string): { work: Work; sceneId: string } {
  const src = w.scenes.find((s) => s.id === sceneId);
  if (!src) return { work: w, sceneId };
  // 写した場面は同じ位置なので、移動は0にして止まりだけ引き継ぐ
  return insertSceneAfter(w, sceneId, { ...src, id: newId(), moveCounts: 0 });
}

export function updateScene(w: Work, id: string, patch: Partial<Omit<Scene, "id">>): Work {
  const scenes = w.scenes.map((s) => {
    if (s.id !== id) return s;
    const next = { ...s, ...patch };
    return {
      ...next,
      memo: patch.memo === undefined ? s.memo : cleanText(patch.memo, MEMO_MAX),
      moveCounts: cleanCount(next.moveCounts),
      holdCounts: cleanCount(next.holdCounts),
    };
  });
  return touch({ ...w, scenes: normalizeScenes(scenes) });
}

export function removeScene(w: Work, id: string): Work {
  if (w.scenes.length <= 1) return w;
  const { [id]: _removed, ...positions } = w.positions;
  return touch({ ...w, scenes: normalizeScenes(w.scenes.filter((s) => s.id !== id)), positions });
}

export function moveScene(w: Work, id: string, dir: -1 | 1): Work {
  const i = w.scenes.findIndex((s) => s.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= w.scenes.length) return w;
  const scenes = [...w.scenes];
  [scenes[i], scenes[j]] = [scenes[j], scenes[i]];
  // 先頭に来た場面の移動は0にする。先頭から外れた場面には移動の初期値を与える
  const fixed = scenes.map((s, k) => (k !== 0 && s.moveCounts === 0 && s === w.scenes[0] ? { ...s, moveCounts: 4 } : s));
  return touch({ ...w, scenes: normalizeScenes(fixed) });
}

export function setPosition(w: Work, sceneId: string, memberId: string, p: Position): Work {
  if (!w.positions[sceneId]) return w;
  return touch({
    ...w,
    positions: { ...w.positions, [sceneId]: { ...w.positions[sceneId], [memberId]: clampPosition(p, w.stage) } },
  });
}

export function updateStage(w: Work, patch: Partial<Stage>): Work {
  const s = { ...w.stage, ...patch };
  const stage: Stage = {
    width: cleanLength(s.width, w.stage.width),
    depth: cleanLength(s.depth, w.stage.depth),
    sideDivisions: cleanDivisions(s.sideDivisions, w.stage.sideDivisions),
    depthDivisions: cleanDivisions(s.depthDivisions, w.stage.depthDivisions),
  };
  const positions: Work["positions"] = {};
  for (const [sceneId, ps] of Object.entries(w.positions)) {
    positions[sceneId] = Object.fromEntries(Object.entries(ps).map(([id, p]) => [id, clampPosition(p, stage)]));
  }
  return touch({ ...w, stage, positions });
}

export function setTempo(w: Work, bpm: number): Work {
  return touch({ ...w, tempo: cleanTempo(bpm) });
}

export function setCountsPerPhrase(w: Work, n: number): Work {
  return touch({ ...w, countsPerPhrase: n === 4 ? 4 : 8 });
}

export function duplicateWork(w: Work): Work {
  const map = new Map<string, string>();
  const scenes = w.scenes.map((s) => {
    const id = newId();
    map.set(s.id, id);
    return { ...s, id };
  });
  const positions: Work["positions"] = {};
  for (const s of w.scenes) positions[map.get(s.id)!] = copyPositions(w.positions[s.id]);
  return {
    ...w,
    id: newId(),
    title: cleanText(`${w.title}のコピー`, TITLE_MAX),
    scenes,
    positions,
    members: w.members.map((m) => ({ ...m })),
    updatedAt: Date.now(),
    exportedAt: null,
  };
}
