import { useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { snap, snapSteps } from "../model/grid";
import type { Position, Positions, Work } from "../model/types";
import { buildStageShapes, DARK_STAGE, LIGHT_STAGE } from "../render/stageShapes";
import { ShapeList } from "./StageSvg";

type Props = {
  work: Work;
  positions: Positions;
  previous?: Positions;
  selectedId: string | null;
  showPaths: boolean;
  snapOn: boolean;
  dark: boolean;
  onSelect: (id: string | null) => void;
  /** 動かし始める前に呼ぶ（再生を止め、場面の止まりの位置へ合わせる） */
  onBeginEdit: () => void;
  onCommit: (memberId: string, p: Position) => void;
};

type Drag = { id: string; pointerId: number; grab: Position; pos: Position; moved: boolean; client: { x: number; y: number } };
type Zoom = { scale: number; cx: number; cy: number };
type Pinch = { dist: number; scale: number; mid: { x: number; y: number }; zoom: Zoom };

const LOUPE_R = 48;
const LOUPE_LIFT = 70;
const ZOOM_MAX = 3;

export function StageEditor(p: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<Pinch | null>(null);
  const tapEmpty = useRef(false);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [zoom, setZoom] = useState<Zoom | null>(null);

  const shown = useMemo(
    () => (drag ? { ...p.positions, [drag.id]: drag.pos } : p.positions),
    [p.positions, drag],
  );
  const built = useMemo(
    () =>
      buildStageShapes(p.work, {
        positions: shown,
        previous: p.previous,
        selectedId: p.selectedId ?? undefined,
        showPaths: p.showPaths,
        palette: p.dark ? DARK_STAGE : LIGHT_STAGE,
        labels: true,
      }),
    [p.work, shown, p.previous, p.selectedId, p.showPaths, p.dark],
  );
  const { view } = built;

  const z = zoom ?? { scale: 1, cx: view.minX + view.width / 2, cy: view.minY + view.height / 2 };
  const vw = view.width / z.scale;
  const vh = view.height / z.scale;
  const vb = { x: z.cx - vw / 2, y: z.cy - vh / 2, w: vw, h: vh };

  /** 拡大中の中心が図からはみ出さないようにする */
  const clampZoom = (next: Zoom): Zoom | null => {
    const scale = Math.min(ZOOM_MAX, Math.max(1, next.scale));
    if (scale <= 1.001) return null;
    const hw = view.width / scale / 2;
    const hh = view.height / scale / 2;
    return {
      scale,
      cx: Math.min(view.minX + view.width - hw, Math.max(view.minX + hw, next.cx)),
      cy: Math.min(view.minY + view.height - hh, Math.max(view.minY + hh, next.cy)),
    };
  };

  const toView = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    const ctm = svg?.getScreenCTM();
    if (!svg || !ctm) return { x: 0, y: 0 };
    const pt = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse());
    return { x: pt.x, y: pt.y };
  };
  const toModel = (clientX: number, clientY: number) => {
    const v = toView(clientX, clientY);
    return built.toModel(v.x, v.y);
  };

  const startPinch = () => {
    const [a, b] = [...pointers.current.values()];
    pinch.current = {
      dist: Math.hypot(a.x - b.x, a.y - b.y) || 1,
      scale: z.scale,
      mid: toView((a.x + b.x) / 2, (a.y + b.y) / 2),
      zoom: z,
    };
  };

  const onPointerDown = (e: PointerEvent<SVGSVGElement>) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      // 2本目の指が触れたら、ドラッグは元の位置へ戻して拡大へ移る
      setDrag(null);
      tapEmpty.current = false;
      startPinch();
      return;
    }
    if (pointers.current.size > 2) return;
    const id = (e.target as Element).closest("[data-id]")?.getAttribute("data-id") ?? null;
    if (id && id === p.selectedId) {
      p.onBeginEdit();
      e.currentTarget.setPointerCapture(e.pointerId);
      const start = p.positions[id];
      const at = toModel(e.clientX, e.clientY);
      setDrag({
        id,
        pointerId: e.pointerId,
        grab: { x: start.x - at.x, y: start.y - at.y },
        pos: start,
        moved: false,
        client: { x: e.clientX, y: e.clientY },
      });
    } else if (id) {
      p.onSelect(id);
    } else {
      tapEmpty.current = true;
    }
  };

  const onPointerMove = (e: PointerEvent<SVGSVGElement>) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch.current && pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      const pc = pinch.current;
      const scale = pc.scale * (Math.hypot(a.x - b.x, a.y - b.y) / pc.dist);
      // 指の中点の下にある点が、拡大しても指の下に残るようにする
      const svg = svgRef.current!;
      const rect = svg.getBoundingClientRect();
      const midClient = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const s = Math.min(ZOOM_MAX, Math.max(1, scale));
      const w = view.width / s;
      const h = view.height / s;
      const fx = (midClient.x - rect.left) / rect.width;
      const fy = (midClient.y - rect.top) / rect.height;
      setZoom(clampZoom({ scale: s, cx: pc.mid.x - (fx - 0.5) * w, cy: pc.mid.y - (fy - 0.5) * h }));
      return;
    }
    if (drag && drag.pointerId === e.pointerId) {
      const at = toModel(e.clientX, e.clientY);
      const pos = snap({ x: at.x + drag.grab.x, y: at.y + drag.grab.y }, p.work.stage, p.snapOn);
      const moved = drag.moved || Math.hypot(e.clientX - drag.client.x, e.clientY - drag.client.y) > 3;
      setDrag({ ...drag, pos: moved ? pos : drag.pos, moved, client: moved ? { x: e.clientX, y: e.clientY } : drag.client });
    }
    if (tapEmpty.current) tapEmpty.current = false;
  };

  const onPointerEnd = (e: PointerEvent<SVGSVGElement>) => {
    pointers.current.delete(e.pointerId);
    if (pinch.current) {
      if (pointers.current.size < 2) pinch.current = null;
      return;
    }
    if (drag && drag.pointerId === e.pointerId) {
      if (drag.moved && e.type === "pointerup") p.onCommit(drag.id, drag.pos);
      setDrag(null);
      return;
    }
    if (tapEmpty.current && e.type === "pointerup") p.onSelect(null);
    tapEmpty.current = false;
  };

  const onKeyDown = (e: KeyboardEvent<SVGGElement>, id: string) => {
    const dir: Record<string, [number, number]> = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, 1],
      ArrowDown: [0, -1],
    };
    const d = dir[e.key];
    if (d) {
      e.preventDefault();
      p.onBeginEdit();
      const steps = p.snapOn ? snapSteps(p.work.stage) : { x: 0.25, y: 0.25 };
      const k = e.shiftKey ? 4 : 1;
      const cur = p.positions[id];
      p.onCommit(id, snap({ x: cur.x + d[0] * steps.x * k, y: cur.y + d[1] * steps.y * k }, p.work.stage, p.snapOn));
    } else if (e.key === "Escape") {
      p.onSelect(null);
    }
  };

  // ドラッグ中の拡大表示
  let loupe = null;
  if (drag?.moved && svgRef.current && boxRef.current) {
    const rect = svgRef.current.getBoundingClientRect();
    const box = boxRef.current.getBoundingClientRect();
    const pxPerM = rect.width / vb.w;
    const sizeM = (LOUPE_R * 2) / (pxPerM * 2);
    const c = built.toView(drag.pos.x, drag.pos.y);
    const left = drag.client.x - box.left - LOUPE_R;
    const top = Math.max(-LOUPE_R, drag.client.y - box.top - LOUPE_LIFT - LOUPE_R * 2);
    loupe = (
      <div className="loupe" style={{ left, top, width: LOUPE_R * 2, height: LOUPE_R * 2 }} aria-hidden="true">
        <svg viewBox={`${c.x - sizeM / 2} ${c.y - sizeM / 2} ${sizeM} ${sizeM}`}>
          <ShapeList shapes={built.shapes} />
        </svg>
      </div>
    );
  }

  const names = new Map(p.work.members.map((m) => [m.id, m.name]));

  return (
    <div className="stage-box" ref={boxRef}>
      <svg
        ref={svgRef}
        className="stage-svg"
        viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
        style={{ aspectRatio: `${view.width} / ${view.height}` }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        role="group"
        aria-label="ステージ"
      >
        <ShapeList shapes={built.shapes} />
        {built.people.map((h) => (
          <g
            key={h.id}
            data-id={h.id}
            className={`hit${h.id === p.selectedId ? " is-selected" : ""}`}
            tabIndex={0}
            role="button"
            aria-pressed={h.id === p.selectedId}
            aria-label={`${names.get(h.id) ?? ""}。矢印キーで動かす`}
            onFocus={() => h.id !== p.selectedId && p.onSelect(h.id)}
            onKeyDown={(e) => onKeyDown(e, h.id)}
          >
            <circle cx={h.cx} cy={h.cy} r={h.r * 1.25} className="hit-area" fill="transparent" />
            <circle cx={h.cx} cy={h.cy} r={h.r + 0.06} className="hit-focus" fill="none" />
          </g>
        ))}
      </svg>
      {loupe}
      {zoom && (
        <button type="button" className="zoom-reset" onClick={() => setZoom(null)}>
          拡大を戻す
        </button>
      )}
    </div>
  );
}
