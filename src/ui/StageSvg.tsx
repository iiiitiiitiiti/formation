import { memo } from "react";
import { arrowHead } from "../render/drawCanvas";
import type { Shape, StageView } from "../render/stageShapes";

/** 図形の一覧を SVG 要素に置き換えるだけの部品。人の丸の操作は StageEditor が受け持つ */
export const ShapeList = memo(function ShapeList({ shapes }: { shapes: Shape[] }) {
  return (
    <>
      {shapes.map((s, i) => {
        switch (s.kind) {
          case "rect":
            return <rect key={i} x={s.x} y={s.y} width={s.w} height={s.h} rx={s.r} fill={s.fill} />;
          case "line":
            return (
              <line
                key={i}
                x1={s.x1}
                y1={s.y1}
                x2={s.x2}
                y2={s.y2}
                stroke={s.stroke}
                strokeWidth={s.width}
                strokeDasharray={s.dash?.join(" ")}
              />
            );
          case "text":
            return (
              <text
                key={i}
                x={s.x}
                y={s.y}
                fontSize={s.size}
                fontWeight={s.weight}
                fill={s.fill}
                textAnchor={s.anchor}
                className="svg-text"
              >
                {s.text}
              </text>
            );
          case "circle":
            return (
              <circle
                key={i}
                cx={s.x}
                cy={s.y}
                r={s.r}
                fill={s.fill}
                stroke={s.stroke}
                strokeWidth={s.strokeWidth}
                strokeDasharray={s.dash?.join(" ")}
              />
            );
          case "arrow": {
            const [hx, hy, lx, ly, rx, ry] = arrowHead(s);
            return (
              <g key={i}>
                <line
                  x1={s.x1}
                  y1={s.y1}
                  x2={(lx + rx) / 2}
                  y2={(ly + ry) / 2}
                  stroke={s.stroke}
                  strokeWidth={s.width}
                  strokeDasharray="0.12 0.08"
                />
                <path d={`M${hx} ${hy}L${lx} ${ly}L${rx} ${ry}Z`} fill={s.stroke} />
              </g>
            );
          }
        }
      })}
    </>
  );
});

/** 操作しない小さな図（場面の縮図など） */
export function StageThumb({ view, shapes, label }: { view: StageView; shapes: Shape[]; label: string }) {
  return (
    <svg viewBox={`${view.minX} ${view.minY} ${view.width} ${view.height}`} className="stage-thumb" role="img" aria-label={label}>
      <ShapeList shapes={shapes} />
    </svg>
  );
}
