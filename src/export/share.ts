export type DeliverResult = "shared" | "downloaded" | "cancelled";

/**
 * スマホでは共有メニューへ渡し、使えなければダウンロードする。
 * iPhone はタップの直後でないと共有メニューを開けないので、ボタンの click から直接呼ぶ。
 */
export async function deliver(file: File): Promise<DeliverResult> {
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  const coarse = typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches;
  if (coarse && nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: file.name });
      return "shared";
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return "cancelled";
      // 共有に失敗したらダウンロードへ回す
    }
  }
  download(file);
  return "downloaded";
}

export function download(file: File): void {
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
