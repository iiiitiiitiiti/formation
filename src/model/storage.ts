import { COUNT_MAX, NAME_MAX, PALETTE, TITLE_MAX, type Member, type Positions, type Scene, type Work } from "./types";
import { cleanCount, cleanTempo, cleanText, clampPosition, newId, updateStage, wingPosition } from "./work";

export const KEY = "formation:works:v1";
/** 読めなかった保存データの退避先（次の保存で上書きして消さないため） */
export const BACKUP_KEY = "formation:unreadable-backup";
/** public/theme.js も同じキーを読む */
export const THEME_KEY = "formation:theme";
export const INSTALL_HINT_KEY = "formation:install-hint-closed";

/** 書き出したファイルの見分け */
const FILE_APP = "formation";

export type Theme = "light" | "dark";

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === "string";
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

function storage(): Storage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

/** 形を確かめて Work に直す。人と場面の組で欠けた立ち位置は袖で埋め、余分は落とす */
export function parseWork(v: unknown): Work | null {
  if (!isObj(v) || v.version !== 1 || !isStr(v.id) || !isStr(v.title) || !isObj(v.stage)) return null;
  if (!Array.isArray(v.members) || !Array.isArray(v.scenes) || v.scenes.length === 0 || !isObj(v.positions)) {
    return null;
  }
  const st = v.stage;
  if (!isNum(st.width) || !isNum(st.depth) || !isNum(st.sideDivisions) || !isNum(st.depthDivisions)) return null;

  const members: Member[] = [];
  for (const m of v.members) {
    if (!isObj(m) || !isStr(m.id) || !isStr(m.name) || !isStr(m.color)) return null;
    members.push({ id: m.id, name: cleanText(m.name, NAME_MAX) || "?", color: m.color || PALETTE[0] });
  }
  const scenes: Scene[] = [];
  for (const s of v.scenes) {
    if (!isObj(s) || !isStr(s.id) || !isNum(s.moveCounts) || !isNum(s.holdCounts)) return null;
    scenes.push({
      id: s.id,
      memo: isStr(s.memo) ? s.memo : "",
      moveCounts: scenes.length === 0 ? 0 : cleanCount(s.moveCounts),
      holdCounts: Math.min(COUNT_MAX, cleanCount(s.holdCounts)),
    });
  }

  // 大きさの丸めは updateStage に任せる
  const shell: Work = {
    version: 1,
    id: v.id,
    title: cleanText(v.title, TITLE_MAX) || "作品",
    stage: { width: 8, depth: 5, sideDivisions: 4, depthDivisions: 5 },
    countsPerPhrase: v.countsPerPhrase === 4 ? 4 : 8,
    tempo: cleanTempo(isNum(v.tempo) ? v.tempo : Number.NaN),
    members,
    scenes,
    positions: {},
    updatedAt: isNum(v.updatedAt) ? v.updatedAt : Date.now(),
    exportedAt: isNum(v.exportedAt) ? v.exportedAt : null,
  };
  const stage = updateStage(shell, {
    width: st.width,
    depth: st.depth,
    sideDivisions: st.sideDivisions,
    depthDivisions: st.depthDivisions,
  }).stage;

  const rawPositions = v.positions;
  const positions: Work["positions"] = {};
  for (const s of scenes) {
    const src = isObj(rawPositions[s.id]) ? (rawPositions[s.id] as Record<string, unknown>) : {};
    const ps: Positions = {};
    members.forEach((m, i) => {
      const p = src[m.id];
      ps[m.id] =
        isObj(p) && isNum(p.x) && isNum(p.y) ? clampPosition({ x: p.x, y: p.y }, stage) : wingPosition(stage, i);
    });
    positions[s.id] = ps;
  }
  return { ...shell, stage, positions };
}

export function loadWorks(): { works: Work[]; recovered: boolean } {
  const s = storage();
  let raw: string | null = null;
  try {
    raw = s?.getItem(KEY) ?? null;
  } catch {
    raw = null;
  }
  if (!s || raw == null) return { works: [], recovered: false };
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    data = null;
  }
  const list = isObj(data) && data.version === 1 && Array.isArray(data.works) ? data.works : null;
  const works = (list ?? []).map(parseWork).filter((w): w is Work => w !== null);
  const recovered = list === null || works.length !== list.length;
  if (recovered) {
    try {
      s.setItem(BACKUP_KEY, raw);
    } catch {
      // 退避できなくても、読めた作品は使う
    }
  }
  return { works, recovered };
}

/** 失敗（容量不足など）なら false */
export function saveWorks(works: Work[]): boolean {
  const s = storage();
  if (!s) return false;
  try {
    s.setItem(KEY, JSON.stringify({ version: 1, works }));
    return true;
  } catch {
    return false;
  }
}

const safeFileName = (title: string) => (title.replace(/[\\/:*?"<>|]/g, "_").trim() || "作品").slice(0, 40);

export function exportWorkFile(w: Work): { name: string; text: string } {
  return {
    name: `${safeFileName(w.title)}.formation.json`,
    text: JSON.stringify({ app: FILE_APP, version: 1, work: w }, null, 2),
  };
}

/** 読み込んだ作品は、同じ作品が端末にあっても上書きせず、別の作品として足す */
export function importWorkFile(text: string): Work | null {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isObj(data) || data.app !== FILE_APP) return null;
  const w = parseWork(data.work);
  if (!w) return null;
  const sceneIds = new Map(w.scenes.map((s) => [s.id, newId()]));
  const positions: Work["positions"] = {};
  for (const [id, ps] of Object.entries(w.positions)) positions[sceneIds.get(id)!] = ps;
  return {
    ...w,
    id: newId(),
    title: cleanText(`${w.title}（読み込み）`, TITLE_MAX),
    scenes: w.scenes.map((s) => ({ ...s, id: sceneIds.get(s.id)! })),
    positions,
    updatedAt: Date.now(),
    exportedAt: null,
  };
}

export function markExported(w: Work): Work {
  return { ...w, exportedAt: Date.now() };
}

export function loadTheme(): Theme {
  try {
    return storage()?.getItem(THEME_KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

export function saveTheme(t: Theme): void {
  try {
    storage()?.setItem(THEME_KEY, t);
  } catch {
    // 覚えられなくても切り替え自体はできる
  }
}

export function loadFlag(key: string): boolean {
  try {
    return storage()?.getItem(key) === "1";
  } catch {
    return false;
  }
}

export function saveFlag(key: string): void {
  try {
    storage()?.setItem(key, "1");
  } catch {
    // 覚えられなくても困らない
  }
}
