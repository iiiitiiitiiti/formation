import { beforeEach, describe, expect, it } from "vitest";
import {
  BACKUP_KEY,
  KEY,
  exportWorkFile,
  importWorkFile,
  loadTheme,
  loadWorks,
  markExported,
  parseWork,
  saveTheme,
  saveWorks,
} from "../src/model/storage";
import { addMember, addSceneAfter, createWork } from "../src/model/work";

const sample = () => {
  let w = addMember(createWork("発表会"), "あお");
  w = addSceneAfter(w, w.scenes[0].id).work;
  return w;
};

beforeEach(() => localStorage.clear());

describe("保存と読み込み", () => {
  it("保存して読むと同じ", () => {
    const w = sample();
    expect(saveWorks([w])).toBe(true);
    expect(loadWorks()).toEqual({ works: [w], recovered: false });
  });

  it("何も無ければ空", () => {
    expect(loadWorks()).toEqual({ works: [], recovered: false });
  });

  it("壊れた保存は退避して空で返す", () => {
    localStorage.setItem(KEY, "{壊れ");
    expect(loadWorks()).toEqual({ works: [], recovered: true });
    expect(localStorage.getItem(BACKUP_KEY)).toBe("{壊れ");
  });

  it("一部の作品だけ壊れていたら、読める作品は残し、全体を退避する", () => {
    const w = sample();
    localStorage.setItem(KEY, JSON.stringify({ version: 1, works: [w, { id: 1 }] }));
    const r = loadWorks();
    expect(r.works).toHaveLength(1);
    expect(r.recovered).toBe(true);
    expect(localStorage.getItem(BACKUP_KEY)).not.toBeNull();
  });
});

describe("parseWork", () => {
  it("位置の欠けた場面は袖の位置で埋まり、余分な人の位置は落ちる", () => {
    const w = sample();
    const m = w.members[0].id;
    const raw = JSON.parse(JSON.stringify(w));
    delete raw.positions[w.scenes[1].id][m];
    raw.positions[w.scenes[0].id]["幽霊"] = { x: 0, y: 0 };
    const p = parseWork(raw)!;
    expect(p.positions[w.scenes[1].id][m]).toBeDefined();
    expect(p.positions[w.scenes[0].id]["幽霊"]).toBeUndefined();
  });

  it("形の違うものは null", () => {
    expect(parseWork({ hello: 1 })).toBeNull();
    expect(parseWork(null)).toBeNull();
    expect(parseWork({ ...sample(), scenes: [] })).toBeNull();
  });
});

describe("ファイル", () => {
  it("書き出して読み込むと、新しい id と「（読み込み）」付きの題名で足される", () => {
    const w = sample();
    const file = exportWorkFile(w);
    expect(file.name).toBe("発表会.formation.json");
    const imported = importWorkFile(file.text)!;
    expect(imported.id).not.toBe(w.id);
    expect(imported.title).toBe("発表会（読み込み）");
    expect(imported.members).toEqual(w.members);
    expect(Object.values(imported.positions)).toEqual(Object.values(w.positions));
    expect(imported.exportedAt).toBeNull();
  });

  it("別のファイルは null", () => {
    expect(importWorkFile("こんにちは")).toBeNull();
    expect(importWorkFile(JSON.stringify({ app: "other" }))).toBeNull();
  });

  it("ファイル名に使えない文字は置き換える", () => {
    const w = { ...sample(), title: "a/b:c" };
    expect(exportWorkFile(w).name).toBe("a_b_c.formation.json");
  });

  it("markExported は書き出した日時を入れる", () => {
    expect(markExported(sample()).exportedAt).toBeTypeOf("number");
  });
});

describe("テーマ", () => {
  it("既定は light、保存した値を読む", () => {
    expect(loadTheme()).toBe("light");
    saveTheme("dark");
    expect(loadTheme()).toBe("dark");
  });
});
