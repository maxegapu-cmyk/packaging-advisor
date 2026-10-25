"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Direction } from "@/lib/board/schema";
import { BackFace, FrontFace, paletteVars, SideFace, TopFace } from "./BoxFaces";

export type Angle = { x: number; y: number };
export const REST_ANGLE: Angle = { x: -16, y: -34 };

type Sync = { angle: Angle; setAngle: (a: Angle) => void; synced: boolean };
const SyncCtx = createContext<Sync | null>(null);

const clampX = (x: number) => Math.max(-70, Math.min(70, x));

/** Lets several boxes rotate together, for side-by-side comparison. */
export function BoxSync({ children, label, hint }: { children: ReactNode; label: string; hint: string }) {
  const [angle, setAngle] = useState<Angle>(REST_ANGLE);
  const [synced, setSynced] = useState(true);
  return (
    <SyncCtx.Provider value={{ angle, setAngle, synced }}>
      <div className="sync-bar">
        <label className="switch">
          <input type="checkbox" checked={synced} onChange={(e) => setSynced(e.currentTarget.checked)} />
          <span className="switch-track" aria-hidden="true" />
          <span>{label}</span>
        </label>
        <span className="sync-hint">{hint}</span>
      </div>
      {children}
    </SyncCtx.Provider>
  );
}

/** A packaging box in CSS 3D. Drag (or use arrow keys) to rotate; double-click to reset. */
export function Box3D({ d, brand, label }: { d: Direction; brand: string; label: string }) {
  const sync = useContext(SyncCtx);
  const [local, setLocal] = useState<Angle>(REST_ANGLE);
  const shared = sync?.synced ?? false;
  const angle = shared && sync ? sync.angle : local;
  // When "rotate together" is switched off, each box stays where the shared view left it.
  const sharedAngle = sync?.angle;
  useEffect(() => {
    if (!shared && sharedAngle) setLocal(sharedAngle);
  }, [shared]); // eslint-disable-line react-hooks/exhaustive-deps
  const setAngle = useCallback(
    (a: Angle) => {
      if (shared && sync) sync.setAngle(a);
      else setLocal(a);
    },
    [shared, sync],
  );
  const drag = useRef<{ px: number; py: number; a: Angle } | null>(null);
  const [dragging, setDragging] = useState(false);

  return (
    <div
      className={`box3d-stage${dragging ? " is-dragging" : ""}`}
      role="img"
      aria-label={label}
      tabIndex={0}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        drag.current = { px: e.clientX, py: e.clientY, a: angle };
        setDragging(true);
      }}
      onPointerMove={(e) => {
        const s = drag.current;
        if (!s) return;
        setAngle({ x: clampX(s.a.x - (e.clientY - s.py) * 0.35), y: s.a.y + (e.clientX - s.px) * 0.45 });
      }}
      onPointerUp={() => {
        drag.current = null;
        setDragging(false);
      }}
      onPointerCancel={() => {
        drag.current = null;
        setDragging(false);
      }}
      onDoubleClick={() => setAngle(REST_ANGLE)}
      onKeyDown={(e) => {
        const step = 12;
        const moves: Record<string, Angle> = {
          ArrowLeft: { x: angle.x, y: angle.y - step },
          ArrowRight: { x: angle.x, y: angle.y + step },
          ArrowUp: { x: clampX(angle.x + step), y: angle.y },
          ArrowDown: { x: clampX(angle.x - step), y: angle.y },
        };
        if (moves[e.key]) {
          e.preventDefault();
          setAngle(moves[e.key]);
        } else if (e.key === "Home" || e.key === "0") setAngle(REST_ANGLE);
      }}
    >
      <div className="box3d" style={{ ...paletteVars(d), transform: `rotateX(${angle.x}deg) rotateY(${angle.y}deg)` }}>
        <div className="bf bf-front">
          <FrontFace d={d} brand={brand} />
        </div>
        <div className="bf bf-back">
          <BackFace />
        </div>
        <div className="bf bf-right">
          <SideFace d={d} brand={brand} variant="right" />
        </div>
        <div className="bf bf-left">
          <SideFace d={d} brand={brand} variant="left" />
        </div>
        <div className="bf bf-top">
          <TopFace d={d} brand={brand} />
        </div>
        <div className="bf bf-bottom" />
      </div>
      <div className="box3d-shadow" aria-hidden="true" />
    </div>
  );
}
