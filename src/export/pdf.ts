import { countLabel, sceneSpans } from "../model/timeline";
import type { Work } from "../model/types";
import { drawShapes, FONT_FAMILY, loadFontsFor } from "../render/drawCanvas";
import { buildStageShapes, LIGHT_STAGE } from "../render/stageShapes";

/** A4 横の比率 */
const PAGE_RATIO = 210 / 297;
export const PAGE_PX = 1800;
const INK = "#1F2329";
const MUTED = "#5B6470";

export function sceneTitle(i: number): string {
  return `場面${i + 1}`;
}

/** 「2つ目の8・1 〜 3つ目の8・8」の形 */
export function countRangeText(w: Work, i: number): string {
  const span = sceneSpans(w)[i];
  if (!span) return "";
  const fmt = (t: number) => {
    const c = countLabel(t, w.countsPerPhrase);
    return `${c.phrase}つ目の${w.countsPerPhrase}・${c.beat}`;
  };
  if (span.end <= span.start) return fmt(span.start);
  return `${fmt(span.start)} 〜 ${fmt(span.end - 1)}`;
}

export function sceneCountsText(w: Work, i: number): string {
  const s = w.scenes[i];
  if (!s) return "";
  return i === 0 ? `止まり${s.holdCounts}` : `移動${s.moveCounts}・止まり${s.holdCounts}`;
}

/** 書き出しで描く文字すべて（フォントを先に読み込むため） */
export function pageTexts(w: Work): string[] {
  return [
    w.title,
    ...w.members.map((m) => m.name),
    ...w.scenes.map((s) => s.memo),
    "上手下手客席場面移動止まりつ目の・〜0123456789/人",
  ];
}

function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  const chars = Array.from(text);
  while (chars.length && ctx.measureText(`${chars.join("")}…`).width > maxWidth) chars.pop();
  return `${chars.join("")}…`;
}

/** 1場面を1ページの画像に描く。ダーク表示でも白地で描く */
export function renderScenePage(w: Work, i: number, pxWidth = PAGE_PX): HTMLCanvasElement {
  const W = pxWidth;
  const H = Math.round(W * PAGE_RATIO);
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, W, H);

  const m = W * 0.045;
  const scene = w.scenes[i];
  // 見出し
  ctx.fillStyle = INK;
  ctx.textBaseline = "alphabetic";
  ctx.font = `900 ${W * 0.026}px ${FONT_FAMILY}`;
  ctx.textAlign = "left";
  const head = `${sceneTitle(i)}`;
  ctx.fillText(head, m, m + W * 0.024);
  const headW = ctx.measureText(head).width;
  ctx.font = `700 ${W * 0.017}px ${FONT_FAMILY}`;
  ctx.fillText(fitText(ctx, w.title, W * 0.5), m + headW + W * 0.02, m + W * 0.024);
  ctx.textAlign = "right";
  ctx.fillStyle = MUTED;
  ctx.font = `500 ${W * 0.014}px ${FONT_FAMILY}`;
  ctx.fillText(`${i + 1} / ${w.scenes.length}`, W - m, m + W * 0.022);
  ctx.textAlign = "left";
  ctx.fillStyle = INK;
  ctx.font = `500 ${W * 0.014}px ${FONT_FAMILY}`;
  const sub = `${countRangeText(w, i)}（${sceneCountsText(w, i)}）${scene?.memo ? `　${scene.memo}` : ""}`;
  ctx.fillText(fitText(ctx, sub, W - m * 2), m, m + W * 0.056);

  // ステージ
  const top = m + W * 0.08;
  const legendW = w.members.length ? W * 0.18 : 0;
  const areaW = W - m * 2 - (legendW ? legendW + W * 0.02 : 0);
  const areaH = H - top - m;
  const prev = i > 0 ? w.positions[w.scenes[i - 1].id] : undefined;
  const built = buildStageShapes(w, {
    positions: w.positions[scene.id] ?? {},
    previous: prev,
    showPaths: true,
    palette: LIGHT_STAGE,
    labels: true,
  });
  const k = Math.min(areaW / built.view.width, areaH / built.view.height);
  const ox = m + (areaW - built.view.width * k) / 2;
  drawShapes(ctx, built.shapes, built.view, k, ox, top);

  // 人の一覧
  if (legendW) {
    const lx = W - m - legendW;
    const row = Math.min(W * 0.03, areaH / Math.ceil(w.members.length / (w.members.length > 20 ? 2 : 1)));
    const cols = w.members.length > 20 ? 2 : 1;
    const colW = legendW / cols;
    const r = row * 0.32;
    w.members.forEach((mem, n) => {
      const col = Math.floor(n / Math.ceil(w.members.length / cols));
      const rowI = n % Math.ceil(w.members.length / cols);
      const cx = lx + col * colW + r;
      const cy = top + rowI * row + row / 2;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = mem.color;
      ctx.fill();
      ctx.lineWidth = Math.max(1, r * 0.1);
      ctx.strokeStyle = INK;
      ctx.stroke();
      ctx.fillStyle = INK;
      ctx.font = `700 ${row * 0.42}px ${FONT_FAMILY}`;
      ctx.textAlign = "left";
      ctx.fillText(fitText(ctx, mem.name, colW - r * 3), cx + r * 1.6, cy + row * 0.15);
    });
  }
  return c;
}

/** 場面ごとに1ページの PDF */
export async function makeScenesPdf(w: Work, onProgress?: (done: number, total: number) => void): Promise<Blob> {
  await loadFontsFor(pageTexts(w));
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4", compress: true });
  for (let i = 0; i < w.scenes.length; i++) {
    if (i > 0) pdf.addPage("a4", "landscape");
    const canvas = renderScenePage(w, i);
    pdf.addImage(canvas.toDataURL("image/jpeg", 0.9), "JPEG", 0, 0, 297, 210, undefined, "FAST");
    onProgress?.(i + 1, w.scenes.length);
    // 画面が固まらないよう1ページごとに手を離す
    await new Promise((r) => setTimeout(r, 0));
  }
  return pdf.output("blob");
}

export async function makeSceneImage(w: Work, i: number): Promise<Blob> {
  await loadFontsFor(pageTexts(w));
  const canvas = renderScenePage(w, i);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("画像を作れませんでした"))), "image/png"),
  );
}
