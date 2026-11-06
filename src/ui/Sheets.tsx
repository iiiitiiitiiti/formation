import { useId, useState } from "react";
import { makeSceneImage, makeScenesPdf, sceneTitle } from "../export/pdf";
import { deliver, download } from "../export/share";
import { exportWorkFile } from "../model/storage";
import {
  COUNT_MAX,
  DIVISIONS_MAX,
  DIVISIONS_MIN,
  MEMO_MAX,
  STAGE_MAX,
  STAGE_MIN,
  TEMPO_MAX,
  TEMPO_MIN,
  TITLE_MAX,
  type Scene,
  type Stage,
  type Work,
} from "../model/types";
import { Icon } from "./Icon";
import { Stepper } from "./Parts";

export function SceneSettings(p: {
  scene: Scene;
  index: number;
  count: number;
  onChange: (patch: Partial<Omit<Scene, "id">>) => void;
  onMove: (dir: -1 | 1) => void;
  onDuplicate: () => void;
  onRemove: () => void;
}) {
  const memoId = useId();
  return (
    <div className="sheet-content">
      <div className="field">
        <label htmlFor={memoId}>メモ</label>
        <input
          id={memoId}
          value={p.scene.memo}
          maxLength={MEMO_MAX}
          placeholder={sceneTitle(p.index)}
          onChange={(e) => p.onChange({ memo: e.target.value })}
        />
      </div>
      <Stepper
        label={p.index === 0 ? "移動のカウント（最初の場面は移動なし）" : "移動のカウント"}
        value={p.index === 0 ? 0 : p.scene.moveCounts}
        min={0}
        max={COUNT_MAX}
        step={1}
        disabled={p.index === 0}
        onChange={(v) => p.onChange({ moveCounts: v })}
      />
      <Stepper
        label="止まるカウント"
        value={p.scene.holdCounts}
        min={0}
        max={COUNT_MAX}
        step={1}
        onChange={(v) => p.onChange({ holdCounts: v })}
      />
      <div className="btn-row">
        <button type="button" className="btn" onClick={() => p.onMove(-1)} disabled={p.index === 0}>
          <Icon name="left" /> 前へ
        </button>
        <button type="button" className="btn" onClick={() => p.onMove(1)} disabled={p.index === p.count - 1}>
          後ろへ <Icon name="right" />
        </button>
        <button type="button" className="btn" onClick={p.onDuplicate}>
          <Icon name="copy" /> 複製
        </button>
        <button type="button" className="btn danger" onClick={p.onRemove} disabled={p.count <= 1}>
          <Icon name="trash" /> 消す
        </button>
      </div>
    </div>
  );
}

export function StageSettings(p: {
  work: Work;
  onTitle: (t: string) => void;
  onStage: (patch: Partial<Stage>) => void;
  onPhrase: (n: 8 | 4) => void;
  onTempo: (bpm: number) => void;
}) {
  const titleId = useId();
  const { stage } = p.work;
  return (
    <div className="sheet-content">
      <div className="field">
        <label htmlFor={titleId}>題名</label>
        <input id={titleId} defaultValue={p.work.title} maxLength={TITLE_MAX} onChange={(e) => p.onTitle(e.target.value)} />
      </div>
      <div className="grid-2">
        <Stepper label="間口" unit="m" value={stage.width} min={STAGE_MIN} max={STAGE_MAX} step={0.5} onChange={(v) => p.onStage({ width: v })} />
        <Stepper label="奥行き" unit="m" value={stage.depth} min={STAGE_MIN} max={STAGE_MAX} step={0.5} onChange={(v) => p.onStage({ depth: v })} />
        <Stepper
          label="センターから片側の線"
          unit="本"
          value={stage.sideDivisions}
          min={DIVISIONS_MIN}
          max={DIVISIONS_MAX}
          step={1}
          onChange={(v) => p.onStage({ sideDivisions: v })}
        />
        <Stepper
          label="奥行きの区切り"
          unit="等分"
          value={stage.depthDivisions}
          min={DIVISIONS_MIN}
          max={DIVISIONS_MAX}
          step={1}
          onChange={(v) => p.onStage({ depthDivisions: v })}
        />
      </div>
      <fieldset className="segmented">
        <legend>カウントの区切り</legend>
        {([8, 4] as const).map((n) => (
          <label key={n}>
            <input type="radio" name="phrase" checked={p.work.countsPerPhrase === n} onChange={() => p.onPhrase(n)} />
            <span>{n}カウント</span>
          </label>
        ))}
      </fieldset>
      <Stepper label="テンポ（1分あたりのカウント）" value={p.work.tempo} min={TEMPO_MIN} max={TEMPO_MAX} step={1} onChange={p.onTempo} />
    </div>
  );
}

type PdfState = { kind: "idle" } | { kind: "making"; done: number; total: number } | { kind: "ready"; file: File } | { kind: "error" };

export function ExportPanel(p: { work: Work; sceneIndex: number; onExported: () => void; notify: (t: string) => void }) {
  const [pdf, setPdf] = useState<PdfState>({ kind: "idle" });
  const [image, setImage] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const base = p.work.title.replace(/[\\/:*?"<>|]/g, "_") || "フォーメーション";

  const report = (r: Awaited<ReturnType<typeof deliver>>) => {
    if (r === "downloaded") p.notify("保存しました");
    if (r === "shared") p.notify("送りました");
  };

  return (
    <div className="sheet-content">
      <section className="export-block">
        <h3>PDF で配る</h3>
        <p className="hint">場面ごとに1ページ。前の場面からの動きを矢印で載せます。</p>
        {pdf.kind === "ready" ? (
          <>
            <p className="done">できました（{p.work.scenes.length}ページ）</p>
            <button type="button" className="btn primary" onClick={async () => report(await deliver(pdf.file))}>
              <Icon name="share" /> 送る
            </button>
          </>
        ) : (
          <button
            type="button"
            className="btn primary"
            disabled={pdf.kind === "making"}
            onClick={async () => {
              setPdf({ kind: "making", done: 0, total: p.work.scenes.length });
              try {
                const blob = await makeScenesPdf(p.work, (done, total) => setPdf({ kind: "making", done, total }));
                setPdf({ kind: "ready", file: new File([blob], `${base}.pdf`, { type: "application/pdf" }) });
              } catch {
                setPdf({ kind: "error" });
              }
            }}
          >
            {pdf.kind === "making" ? `作っています ${pdf.done}/${pdf.total}` : "PDF を作る"}
          </button>
        )}
        {pdf.kind === "error" && <p className="error">PDF を作れませんでした。もう一度試してください。</p>}
      </section>

      <section className="export-block">
        <h3>この場面を画像で保存</h3>
        {image ? (
          <button type="button" className="btn" onClick={async () => report(await deliver(image))}>
            <Icon name="share" /> 送る
          </button>
        ) : (
          <button
            type="button"
            className="btn"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                const blob = await makeSceneImage(p.work, p.sceneIndex);
                setImage(new File([blob], `${base}_${sceneTitle(p.sceneIndex)}.png`, { type: "image/png" }));
              } catch {
                p.notify("画像を作れませんでした");
              } finally {
                setBusy(false);
              }
            }}
          >
            <Icon name="image" /> {busy ? "作っています" : `${sceneTitle(p.sceneIndex)}の画像を作る`}
          </button>
        )}
      </section>

      <section className="export-block">
        <h3>ファイルに書き出す</h3>
        <p className="hint">別の端末で続きを作るときや、控えを残すときに使います。</p>
        <button
          type="button"
          className="btn"
          onClick={() => {
            const f = exportWorkFile(p.work);
            download(new File([f.text], f.name, { type: "application/json" }));
            p.onExported();
            p.notify("書き出しました");
          }}
        >
          <Icon name="file" /> 書き出す
        </button>
      </section>
    </div>
  );
}
