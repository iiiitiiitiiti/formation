import { useId } from "react";
import { countLabel, type SceneSpan } from "../model/timeline";
import { NAME_MAX, PALETTE, type Member, type Work } from "../model/types";
import { Icon } from "./Icon";

/** − と ＋ で数を変える入力。直接打ち込むこともできる */
export function Stepper(p: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  disabled?: boolean;
  onChange: (v: number) => void;
}) {
  const id = useId();
  const clamp = (v: number) => Math.min(p.max, Math.max(p.min, v));
  return (
    <div className="stepper">
      <label htmlFor={id}>{p.label}</label>
      <div className="stepper-row">
        <button
          type="button"
          className="icon-btn"
          disabled={p.disabled || p.value <= p.min}
          onClick={() => p.onChange(clamp(+(p.value - p.step).toFixed(2)))}
          aria-label={`${p.label}を減らす`}
        >
          −
        </button>
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min={p.min}
          max={p.max}
          step={p.step}
          value={p.value}
          disabled={p.disabled}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (e.target.value !== "" && Number.isFinite(v)) p.onChange(clamp(v));
          }}
        />
        {p.unit && <span className="unit">{p.unit}</span>}
        <button
          type="button"
          className="icon-btn"
          disabled={p.disabled || p.value >= p.max}
          onClick={() => p.onChange(clamp(+(p.value + p.step).toFixed(2)))}
          aria-label={`${p.label}を増やす`}
        >
          ＋
        </button>
      </div>
    </div>
  );
}

export function PlayBar(p: {
  t: number;
  total: number;
  playing: boolean;
  countsPerPhrase: number;
  tempo: number;
  onPlay: () => void;
  onPause: () => void;
  onToSceneStart: () => void;
  onSeek: (t: number) => void;
}) {
  const c = countLabel(p.t, p.countsPerPhrase);
  return (
    <div className="playbar">
      <button
        type="button"
        className="play-btn"
        onClick={p.playing ? p.onPause : p.onPlay}
        aria-label={p.playing ? "止める" : "再生"}
        disabled={p.total <= 0}
      >
        <Icon name={p.playing ? "pause" : "play"} size={24} />
      </button>
      <button type="button" className="icon-btn" onClick={p.onToSceneStart} aria-label="場面の頭へ">
        <Icon name="toStart" />
      </button>
      <div className="count" aria-live="off">
        <span>
          {c.phrase}つ目の{p.countsPerPhrase}
        </span>
        <strong>{c.beat}</strong>
      </div>
      <input
        className="seek"
        type="range"
        min={0}
        max={Math.max(p.total, 0.01)}
        step={0.01}
        value={p.t}
        onChange={(e) => p.onSeek(Number(e.target.value))}
        aria-label="再生の位置"
        aria-valuetext={`${c.phrase}つ目の${p.countsPerPhrase}の${c.beat}`}
      />
      <span className="tempo">♩={p.tempo}</span>
    </div>
  );
}

const BAND_COUNT = 6;

export function SceneBands(p: {
  work: Work;
  spans: SceneSpan[];
  current: number;
  onPick: (i: number) => void;
  onAdd: () => void;
}) {
  const max = Math.max(8, ...p.work.scenes.map((s, i) => (i === 0 ? 0 : s.moveCounts) + s.holdCounts));
  return (
    <ol className="bands" aria-label="場面">
      {p.work.scenes.map((s, i) => {
        const move = i === 0 ? 0 : s.moveCounts;
        const sum = move + s.holdCounts;
        const c = countLabel(p.spans[i]?.start ?? 0, p.work.countsPerPhrase);
        return (
          <li key={s.id}>
            <button
              type="button"
              className={`band band-${i % BAND_COUNT}${i === p.current ? " is-current" : ""}`}
              aria-current={i === p.current ? "step" : undefined}
              onClick={() => p.onPick(i)}
            >
              <b className="band-no">{i + 1}</b>
              <span className="band-main">
                <span className="band-title">{s.memo || `場面${i + 1}`}</span>
                <span className="band-sub">
                  {c.phrase}つ目の{p.work.countsPerPhrase}・{c.beat}から
                </span>
              </span>
              <span className="band-meter" aria-hidden="true">
                <i className="m" style={{ width: `${(move / max) * 100}%` }} />
                <i style={{ width: `${(s.holdCounts / max) * 100}%` }} />
              </span>
              <span className="band-counts">{i === 0 ? `止まり${s.holdCounts}` : `移${move}・止${s.holdCounts}`}</span>
              <span className="visually-hidden">{sum}カウント</span>
            </button>
          </li>
        );
      })}
      <li>
        <button type="button" className="band band-add" onClick={p.onAdd}>
          <Icon name="plus" /> 場面を足す
        </button>
      </li>
    </ol>
  );
}

export function MemberPanel(p: {
  member: Member;
  onRename: (name: string) => void;
  onColor: (c: string) => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const id = useId();
  return (
    <section className="member-panel" aria-label={`${p.member.name}の設定`}>
      <div className="member-row">
        <span className="swatch big" style={{ background: p.member.color }} aria-hidden="true" />
        <label htmlFor={id} className="visually-hidden">
          名前
        </label>
        <input
          id={id}
          className="name-input"
          value={p.member.name}
          maxLength={NAME_MAX}
          onChange={(e) => p.onRename(e.target.value)}
        />
        <button type="button" className="icon-btn" onClick={p.onRemove} aria-label={`${p.member.name}を消す`}>
          <Icon name="trash" />
        </button>
        <button type="button" className="icon-btn" onClick={p.onClose} aria-label="選ぶのをやめる">
          <Icon name="close" />
        </button>
      </div>
      <div className="swatches" role="radiogroup" aria-label="色">
        {PALETTE.map((c) => (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={c === p.member.color}
            className="swatch"
            style={{ background: c }}
            onClick={() => p.onColor(c)}
            aria-label={`色 ${PALETTE.indexOf(c) + 1}`}
          />
        ))}
      </div>
    </section>
  );
}
