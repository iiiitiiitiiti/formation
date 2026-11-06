import { useCallback, useEffect, useState } from "react";

export type ToastMsg = { id: number; text: string; action?: { label: string; run: () => void } };

let seq = 0;

export function useToast() {
  const [msg, setMsg] = useState<ToastMsg | null>(null);
  const show = useCallback((text: string, action?: ToastMsg["action"]) => setMsg({ id: ++seq, text, action }), []);
  const hide = useCallback(() => setMsg(null), []);
  return { msg, show, hide };
}

/** 操作の結果を画面の下に数秒出す。「元に戻す」などの操作を1つ添えられる */
export function Toast({ msg, onHide }: { msg: ToastMsg | null; onHide: () => void }) {
  useEffect(() => {
    if (!msg) return;
    const t = window.setTimeout(onHide, msg.action ? 8000 : 3500);
    return () => window.clearTimeout(t);
  }, [msg, onHide]);

  return (
    <div className="toast-zone" role="status" aria-live="polite">
      {msg && (
        <div className="toast" key={msg.id}>
          <span>{msg.text}</span>
          {msg.action && (
            <button
              type="button"
              onClick={() => {
                msg.action!.run();
                onHide();
              }}
            >
              {msg.action.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
