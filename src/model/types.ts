/** ステージの大きさと区切り。長さはメートル、区切りは本数 */
export type Stage = {
  width: number;
  depth: number;
  /** センターから片側に引く縦線の本数 */
  sideDivisions: number;
  /** 奥行きを何等分するか */
  depthDivisions: number;
};

export type Member = { id: string; name: string; color: string };

export type Scene = {
  id: string;
  memo: string;
  /** 前の場面の位置からこの場面の位置へ移るのにかけるカウント。最初の場面は常に0 */
  moveCounts: number;
  /** この場面の位置で止まっているカウント */
  holdCounts: number;
};

/** メートル。x はセンターが0で客席から見て右（上手）が正、y は客席側の端が0で奥が正 */
export type Position = { x: number; y: number };

export type Positions = Record<string, Position>;

export type Work = {
  version: 1;
  id: string;
  title: string;
  stage: Stage;
  countsPerPhrase: 8 | 4;
  tempo: number;
  members: Member[];
  scenes: Scene[];
  /** sceneId → memberId → 立ち位置。場面と人の組ごとに必ず1つある */
  positions: Record<string, Positions>;
  updatedAt: number;
  exportedAt: number | null;
};

export const FORMAT_VERSION = 1;
export const MAX_MEMBERS = 40;
export const NAME_MAX = 6;
export const TITLE_MAX = 40;
export const MEMO_MAX = 100;
export const TEMPO_MIN = 40;
export const TEMPO_MAX = 240;
export const TEMPO_DEFAULT = 96;
export const COUNT_MAX = 64;
/** 左右の袖として表示し、人を置ける幅（m） */
export const WING = 1.5;
export const STAGE_MIN = 1;
export const STAGE_MAX = 30;
export const DIVISIONS_MIN = 1;
export const DIVISIONS_MAX = 10;

/** 人の色。黒い文字が読める明るい色 */
export const PALETTE = [
  "#FFB8B8",
  "#FFD59E",
  "#FFF09E",
  "#C8F0A8",
  "#A8E6E0",
  "#B4D4FF",
  "#D8C4FF",
  "#FFC4E6",
  "#E8D5B5",
  "#D9DDE3",
] as const;
