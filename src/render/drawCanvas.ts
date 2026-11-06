import type { Shape, StageView } from "./stageShapes";

export const FONT_FAMILY = `"Noto Sans JP Variable", "Noto Sans JP", sans-serif`;

/** 図形の一覧を Canvas に描く。pxPerM は 1m あたりの px、ox・oy は描き始める位置 */
export function drawShapes(ctx: CanvasRenderingContext2D, shapes: Shape[], view: StageView, pxPerM: number, ox = 0, oy = 0) {
  const X = (x: number) => ox + (x - view.minX) * pxPerM;
  const Y = (y: number) => oy + (y - view.minY) * pxPerM;
  const L = (v: number) => v * pxPerM;
  for (const s of shapes) {
    ctx.save();
    switch (s.kind) {
      case "rect":
        ctx.fillStyle = s.fill;
        ctx.beginPath();
        if (s.r) ctx.roundRect(X(s.x), Y(s.y), L(s.w), L(s.h), L(s.r));
        else ctx.rect(X(s.x), Y(s.y), L(s.w), L(s.h));
        ctx.fill();
        break;
      case "line":
        ctx.strokeStyle = s.stroke;
        ctx.lineWidth = L(s.width);
        ctx.setLineDash((s.dash ?? []).map(L));
        ctx.beginPath();
        ctx.moveTo(X(s.x1), Y(s.y1));
        ctx.lineTo(X(s.x2), Y(s.y2));
        ctx.stroke();
        break;
      case "text":
        ctx.fillStyle = s.fill;
        ctx.font = `${s.weight} ${L(s.size)}px ${FONT_FAMILY}`;
        ctx.textAlign = s.anchor === "middle" ? "center" : s.anchor === "end" ? "right" : "left";
        ctx.textBaseline = "alphabetic";
        ctx.fillText(s.text, X(s.x), Y(s.y));
        break;
      case "circle":
        ctx.beginPath();
        ctx.arc(X(s.x), Y(s.y), L(s.r), 0, Math.PI * 2);
        if (s.fill !== "none") {
          ctx.fillStyle = s.fill;
          ctx.fill();
        }
        if (s.stroke) {
          ctx.strokeStyle = s.stroke;
          ctx.lineWidth = L(s.strokeWidth ?? 0.03);
          ctx.setLineDash((s.dash ?? []).map(L));
          ctx.stroke();
        }
        break;
      case "arrow": {
        const [hx, hy, lx, ly, rx, ry] = arrowHead(s);
        ctx.strokeStyle = s.stroke;
        ctx.lineWidth = L(s.width);
        ctx.setLineDash([L(0.12), L(0.08)]);
        ctx.beginPath();
        ctx.moveTo(X(s.x1), Y(s.y1));
        ctx.lineTo(X((lx + rx) / 2), Y((ly + ry) / 2));
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = s.stroke;
        ctx.beginPath();
        ctx.moveTo(X(hx), Y(hy));
        ctx.lineTo(X(lx), Y(ly));
        ctx.lineTo(X(rx), Y(ry));
        ctx.closePath();
        ctx.fill();
        break;
      }
    }
    ctx.restore();
  }
}

/** 矢じりの3点（先端・左・右） */
export function arrowHead(s: { x1: number; y1: number; x2: number; y2: number; head: number }): number[] {
  const len = Math.hypot(s.x2 - s.x1, s.y2 - s.y1) || 1;
  const ux = (s.x2 - s.x1) / len;
  const uy = (s.y2 - s.y1) / len;
  const bx = s.x2 - ux * s.head;
  const by = s.y2 - uy * s.head;
  const half = s.head * 0.55;
  return [s.x2, s.y2, bx - uy * half, by + ux * half, bx + uy * half, by - ux * half];
}

/** 描く文字すべてを渡してフォントを読み込む（文字を渡さないと日本語の分割ファイルが読まれない） */
export async function loadFontsFor(texts: string[]): Promise<void> {
  if (typeof document === "undefined" || !document.fonts) return;
  const chars = Array.from(new Set(Array.from(texts.join("")))).join("");
  try {
    await Promise.all([
      document.fonts.load(`500 16px "Noto Sans JP Variable"`, chars),
      document.fonts.load(`700 16px "Noto Sans JP Variable"`, chars),
      document.fonts.load(`900 16px "Noto Sans JP Variable"`, chars),
    ]);
  } catch {
    // 読めなくても端末の文字で描く
  }
}
