import { useCallback, useEffect, useMemo, useState } from "react";
import { markExported } from "../model/storage";
import { positionsAt, sceneIndexAt, sceneSpans, totalCounts } from "../model/timeline";
import { MAX_MEMBERS, type Position, type Work } from "../model/types";
import {
  addMember,
  addSceneAfter,
  duplicateScene,
  moveScene,
  removeMember,
  removeScene,
  setCountsPerPhrase,
  setPosition,
  setTempo,
  setTitle,
  updateMember,
  updateScene,
  updateStage,
} from "../model/work";
import { Icon } from "./Icon";
import { MemberPanel, PlayBar, SceneBands } from "./Parts";
import { Sheet } from "./Sheet";
import { ExportPanel, SceneSettings, StageSettings } from "./Sheets";
import { StageEditor } from "./StageEditor";
import { useHistory } from "./useHistory";
import { usePlayback } from "./usePlayback";

type SheetKind = "scene" | "stage" | "export" | null;

export function Editor(p: {
  initial: Work;
  dark: boolean;
  onChange: (w: Work) => void;
  onBack: () => void;
  onToggleTheme: () => void;
  notify: (text: string, action?: { label: string; run: () => void }) => void;
}) {
  const h = useHistory(p.initial, p.onChange);
  const w = h.work;
  const spans = useMemo(() => sceneSpans(w), [w]);
  const total = useMemo(() => totalCounts(w), [w]);
  const play = usePlayback(total, w.tempo);
  const [sceneIdx, setSceneIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [showPaths, setShowPaths] = useState(true);
  const [snapOn, setSnapOn] = useState(true);
  const [sheet, setSheet] = useState<SheetKind>(null);

  const current = Math.min(sceneIdx, w.scenes.length - 1);
  const scene = w.scenes[current];

  // 再生中は、今の時刻が属する場面を選んだ場面にする
  useEffect(() => {
    if (play.playing) setSceneIdx(sceneIndexAt(w, play.t));
  }, [play.playing, play.t, w]);

  // 選んでいた人が消えたら選ぶのをやめる
  useEffect(() => {
    if (selected && !w.members.some((m) => m.id === selected)) setSelected(null);
  }, [w.members, selected]);

  const atHold = !play.playing && Math.abs(play.t - (spans[current]?.holdStart ?? 0)) < 1e-6;
  const shownPositions = atHold ? (w.positions[scene.id] ?? {}) : positionsAt(w, play.t);
  const previous = current > 0 ? w.positions[w.scenes[current - 1].id] : undefined;

  const pickScene = useCallback(
    (i: number) => {
      play.pause();
      setSceneIdx(i);
      play.seek(sceneSpans(w)[i]?.holdStart ?? 0);
    },
    [play, w],
  );

  /** 場面の途中で止めていたら、その場面の止まりの位置へ合わせてから編集する */
  const beginEdit = useCallback(() => {
    if (play.playing || !atHold) pickScene(sceneIndexAt(w, play.t));
  }, [play, atHold, w, pickScene]);

  const editSceneId = () => {
    const i = play.playing || !atHold ? sceneIndexAt(w, play.t) : current;
    return w.scenes[i].id;
  };

  const commitPosition = (memberId: string, pos: Position) => h.set(setPosition(w, editSceneId(), memberId, pos));

  const addPerson = () => {
    if (w.members.length >= MAX_MEMBERS) {
      p.notify(`人は${MAX_MEMBERS}人までです`);
      return;
    }
    const next = addMember(w);
    h.set(next);
    setSelected(next.members[next.members.length - 1].id);
  };

  const addScene = () => {
    const r = addSceneAfter(w, scene.id);
    h.set(r.work);
    play.pause();
    const i = r.work.scenes.findIndex((s) => s.id === r.sceneId);
    setSceneIdx(i);
    play.seek(sceneSpans(r.work)[i].holdStart);
  };

  // 場面の数や長さが変わったら、選んだ場面の止まりの位置へ合わせ直す
  useEffect(() => {
    if (!play.playing) play.seek(spans[current]?.holdStart ?? 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spans]);

  // キーボード: Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y、Space で再生
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.closest("input, textarea, dialog[open]")) return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) h.redo();
        else h.undo();
      } else if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        h.redo();
      } else if (e.key === " " && !el.closest("button, [role=button]")) {
        e.preventDefault();
        if (play.playing) play.pause();
        else play.play();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [h, play]);

  const member = w.members.find((m) => m.id === selected);

  return (
    <div className="editor">
      <header className="topbar">
        <button type="button" className="icon-btn" onClick={p.onBack} aria-label="作品の一覧へ戻る">
          <Icon name="back" />
        </button>
        <h1 className="title">{w.title}</h1>
        <button type="button" className="icon-btn" onClick={h.undo} disabled={!h.canUndo} aria-label="取り消す">
          <Icon name="undo" />
        </button>
        <button type="button" className="icon-btn" onClick={h.redo} disabled={!h.canRedo} aria-label="やり直す">
          <Icon name="redo" />
        </button>
        <button
          type="button"
          className="icon-btn"
          onClick={p.onToggleTheme}
          aria-label={p.dark ? "明るい表示にする" : "暗い表示にする"}
        >
          <Icon name={p.dark ? "sun" : "moon"} />
        </button>
      </header>

      <div className="editor-main">
        <div className="editor-stage">
          <StageEditor
            work={w}
            positions={shownPositions}
            previous={previous}
            selectedId={selected}
            showPaths={showPaths && !play.playing}
            snapOn={snapOn}
            dark={p.dark}
            onSelect={setSelected}
            onBeginEdit={beginEdit}
            onCommit={commitPosition}
          />
          {w.members.length === 0 && <p className="empty-hint">下の「人を足す」から踊る人を足してください</p>}
        </div>

        <div className="editor-side">
          <PlayBar
            t={play.t}
            total={total}
            playing={play.playing}
            countsPerPhrase={w.countsPerPhrase}
            tempo={w.tempo}
            onPlay={() => {
              // 場面で止めているときは、その場面へ移る動きから見せる
              if (atHold && current > 0) play.seek(spans[current].start);
              play.play();
            }}
            onPause={play.pause}
            onToSceneStart={() => {
              play.pause();
              const i = sceneIndexAt(w, play.t);
              const start = spans[i]?.start ?? 0;
              // 場面の頭にいるときは、前の場面の頭へ
              const target = play.t - start < 0.05 && i > 0 ? spans[i - 1].start : start;
              play.seek(target);
              setSceneIdx(sceneIndexAt(w, target));
            }}
            onSeek={(t) => {
              play.pause();
              play.seek(t);
              setSceneIdx(sceneIndexAt(w, t));
            }}
          />

          {member && (
            <MemberPanel
              member={member}
              onRename={(name) => h.set(updateMember(w, member.id, { name }), `name:${member.id}`)}
              onColor={(color) => h.set(updateMember(w, member.id, { color }))}
              onRemove={() => {
                h.set(removeMember(w, member.id));
                setSelected(null);
                p.notify(`${member.name}を消しました`, { label: "元に戻す", run: h.undo });
              }}
              onClose={() => setSelected(null)}
            />
          )}

          <SceneBands
            work={w}
            spans={spans}
            current={current}
            onPick={(i) => {
              if (i === current && atHold) setSheet("scene");
              else pickScene(i);
            }}
            onAdd={addScene}
          />
        </div>
      </div>

      <nav className="toolbar" aria-label="道具">
        <button type="button" onClick={addPerson}>
          <Icon name="person" />
          人を足す
        </button>
        <button type="button" aria-pressed={snapOn} onClick={() => setSnapOn((v) => !v)}>
          <Icon name="magnet" />
          マス合わせ
        </button>
        <button type="button" aria-pressed={showPaths} onClick={() => setShowPaths((v) => !v)}>
          <Icon name="path" />
          動きの矢印
        </button>
        <button type="button" onClick={() => setSheet("stage")}>
          <Icon name="stage" />
          ステージ
        </button>
        <button type="button" onClick={() => setSheet("export")}>
          <Icon name="share" />
          配る
        </button>
      </nav>

      <Sheet open={sheet === "scene"} title={`場面${current + 1}`} onClose={() => setSheet(null)}>
        <SceneSettings
          scene={scene}
          index={current}
          count={w.scenes.length}
          onChange={(patch) => h.set(updateScene(w, scene.id, patch), patch.memo !== undefined ? `memo:${scene.id}` : undefined)}
          onMove={(dir) => {
            h.set(moveScene(w, scene.id, dir));
            setSceneIdx(Math.max(0, Math.min(w.scenes.length - 1, current + dir)));
          }}
          onDuplicate={() => {
            const r = duplicateScene(w, scene.id);
            h.set(r.work);
            setSceneIdx(current + 1);
          }}
          onRemove={() => {
            h.set(removeScene(w, scene.id));
            setSceneIdx(Math.max(0, current - 1));
            setSheet(null);
            p.notify(`場面${current + 1}を消しました`, { label: "元に戻す", run: h.undo });
          }}
        />
      </Sheet>

      <Sheet open={sheet === "stage"} title="ステージ" onClose={() => setSheet(null)}>
        <StageSettings
          work={w}
          onTitle={(t) => h.set(setTitle(w, t), "title")}
          onStage={(patch) => h.set(updateStage(w, patch))}
          onPhrase={(n) => h.set(setCountsPerPhrase(w, n))}
          onTempo={(bpm) => h.set(setTempo(w, bpm), "tempo")}
        />
      </Sheet>

      <Sheet open={sheet === "export"} title="配る・書き出す" onClose={() => setSheet(null)}>
        <ExportPanel
          work={w}
          sceneIndex={current}
          onExported={() => p.onChange(markExported(w))}
          notify={(t) => p.notify(t)}
        />
      </Sheet>
    </div>
  );
}
