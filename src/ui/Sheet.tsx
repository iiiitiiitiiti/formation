import { useEffect, useRef, type ReactNode } from "react";
import { Icon } from "./Icon";

/**
 * 下から出るシート。開いている間は背面を操作できず、Tab はシートの中だけを回る。
 * Esc・背景のタップ・閉じるボタンで閉じ、開く前にフォーカスがあった場所へ戻す。
 */
export function Sheet({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      opener.current = document.activeElement as HTMLElement | null;
      d.showModal();
    } else if (!open && d.open) {
      d.close();
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="sheet"
      aria-label={title}
      onClose={() => {
        onClose();
        const back = opener.current;
        if (back && document.contains(back)) back.focus();
      }}
      onClick={(e) => {
        if (e.target === ref.current) ref.current?.close();
      }}
    >
      <div className="sheet-body">
        <header className="sheet-head">
          <h2>{title}</h2>
          <button type="button" className="icon-btn" onClick={() => ref.current?.close()} aria-label="閉じる">
            <Icon name="close" />
          </button>
        </header>
        {open && children}
      </div>
    </dialog>
  );
}
