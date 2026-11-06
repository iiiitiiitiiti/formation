import { useRef } from "react";
import { importWorkFile, INSTALL_HINT_KEY, loadFlag, saveFlag } from "../model/storage";
import type { Work } from "../model/types";
import { createWork, duplicateWork } from "../model/work";
import { Icon } from "./Icon";
import { useState } from "react";

const DAY = 24 * 60 * 60 * 1000;

const fmtDate = (t: number) => {
  const d = new Date(t);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
};

/** iPhone・iPad の Safari で、ホーム画面から開いていないとき */
function needsInstallHint(): boolean {
  if (typeof navigator === "undefined") return false;
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const standalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return ios && !standalone;
}

export function WorkList(p: {
  works: Work[];
  dark: boolean;
  onOpen: (id: string) => void;
  onCreate: (w: Work) => void;
  onRemove: (w: Work) => void;
  onToggleTheme: () => void;
  notify: (t: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [hint, setHint] = useState(() => needsInstallHint() && !loadFlag(INSTALL_HINT_KEY));
  const sorted = [...p.works].sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <div className="list-page">
      <header className="topbar">
        <h1 className="title brand">フォーメーション帳</h1>
        <button type="button" className="icon-btn" onClick={p.onToggleTheme} aria-label={p.dark ? "明るい表示にする" : "暗い表示にする"}>
          <Icon name={p.dark ? "sun" : "moon"} />
        </button>
      </header>

      <main className="list-main">
        {hint && (
          <aside className="install-hint">
            <p>
              <b>ホーム画面に追加しておくと安心です。</b>
              iPhone では、ホーム画面に追加していないと、しばらく開かないうちに作品が消えることがあります。共有ボタンから「ホーム画面に追加」を選んでください。
            </p>
            <button
              type="button"
              className="icon-btn"
              aria-label="この案内を閉じる"
              onClick={() => {
                saveFlag(INSTALL_HINT_KEY);
                setHint(false);
              }}
            >
              <Icon name="close" />
            </button>
          </aside>
        )}

        <div className="list-actions">
          <button
            type="button"
            className="btn primary"
            onClick={() => {
              const w = createWork(`作品${p.works.length + 1}`);
              p.onCreate(w);
              p.onOpen(w.id);
            }}
          >
            <Icon name="plus" /> 新しく作る
          </button>
          <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
            <Icon name="open" /> ファイルを読み込む
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            hidden
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f) return;
              const w = importWorkFile(await f.text());
              if (!w) {
                p.notify("このファイルは読み込めませんでした");
                return;
              }
              p.onCreate(w);
              p.notify(`「${w.title}」を足しました`);
            }}
          />
        </div>

        {sorted.length === 0 ? (
          <p className="empty">まだ作品がありません。「新しく作る」から始めてください。</p>
        ) : (
          <ul className="cards">
            {sorted.map((w) => {
              const stale = w.exportedAt === null || w.exportedAt < w.updatedAt;
              const old = Date.now() - (w.exportedAt ?? w.updatedAt) > 7 * DAY;
              return (
                <li key={w.id} className="card">
                  <button type="button" className="card-open" onClick={() => p.onOpen(w.id)}>
                    <span className="card-title">{w.title}</span>
                    <span className="card-meta">
                      {w.members.length}人・{w.scenes.length}場面・{fmtDate(w.updatedAt)} 更新
                    </span>
                    <span className="card-meta">
                      {w.exportedAt ? `最後に書き出した日 ${fmtDate(w.exportedAt)}` : "まだファイルに書き出していません"}
                    </span>
                    {stale && old && <span className="card-warn">ファイルに書き出しておくと安心です</span>}
                  </button>
                  <div className="card-tools">
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label={`${w.title}を複製`}
                      onClick={() => {
                        p.onCreate(duplicateWork(w));
                        p.notify("複製しました");
                      }}
                    >
                      <Icon name="copy" />
                    </button>
                    <button type="button" className="icon-btn" aria-label={`${w.title}を消す`} onClick={() => p.onRemove(w)}>
                      <Icon name="trash" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
