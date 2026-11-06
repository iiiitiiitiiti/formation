import { registerSW } from "virtual:pwa-register";

/*
 * 新しい版が届いても、編集の最中には入れ替えない。
 * 画面が裏に回ったときにだけ入れ替える（保存は編集のたびに済んでいる）。
 */
export function setupPwa(): void {
  let waiting = false;
  const updateSW = registerSW({
    onNeedRefresh() {
      waiting = true;
      tryApply();
    },
  });
  function tryApply() {
    if (waiting && document.visibilityState === "hidden") {
      waiting = false;
      void updateSW(true);
    }
  }
  document.addEventListener("visibilitychange", tryApply);
}
