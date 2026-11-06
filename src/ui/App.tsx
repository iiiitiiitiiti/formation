import { useCallback, useEffect, useState } from "react";
import { loadTheme, saveTheme, type Theme } from "../model/storage";
import type { Work } from "../model/types";
import { Editor } from "./Editor";
import { Toast, useToast } from "./Toast";
import { useWorks } from "./useWorks";
import { WorkList } from "./WorkList";

export function App() {
  const store = useWorks();
  const toast = useToast();
  const [openId, setOpenId] = useState<string | null>(null);
  const [theme, setTheme] = useState<Theme>(loadTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    saveTheme(theme);
  }, [theme]);

  useEffect(() => {
    // 保存した作品をブラウザが勝手に消さないよう頼む（認められないこともある）
    void navigator.storage?.persist?.().catch(() => undefined);
  }, []);

  useEffect(() => {
    if (store.recovered) toast.show("読めない作品がありました。読めた作品だけを開いています");
  }, [store.recovered, toast.show]);

  useEffect(() => {
    if (store.saveFailed) toast.show("保存できませんでした。ファイルに書き出してください");
  }, [store.saveFailed, toast.show]);

  const toggleTheme = useCallback(() => setTheme((t) => (t === "dark" ? "light" : "dark")), []);

  /** 書き出した日時は、編集の写しより新しいほうを残す */
  const onChange = useCallback(
    (w: Work) => {
      const stored = store.works.find((x) => x.id === w.id);
      const exportedAt = Math.max(stored?.exportedAt ?? 0, w.exportedAt ?? 0) || null;
      store.upsert({ ...w, exportedAt });
    },
    [store],
  );

  const open = openId ? store.works.find((w) => w.id === openId) : undefined;

  return (
    <>
      {open ? (
        <Editor
          key={open.id}
          initial={open}
          dark={theme === "dark"}
          onChange={onChange}
          onBack={() => {
            setOpenId(null);
            toast.hide();
          }}
          onToggleTheme={toggleTheme}
          notify={toast.show}
        />
      ) : (
        <WorkList
          works={store.works}
          dark={theme === "dark"}
          onOpen={setOpenId}
          onCreate={store.upsert}
          onRemove={(w) => {
            const index = store.works.findIndex((x) => x.id === w.id);
            store.remove(w.id);
            toast.show(`「${w.title}」を消しました`, { label: "元に戻す", run: () => store.restore(w, index) });
          }}
          onToggleTheme={toggleTheme}
          notify={toast.show}
        />
      )}
      <Toast msg={toast.msg} onHide={toast.hide} />
    </>
  );
}
