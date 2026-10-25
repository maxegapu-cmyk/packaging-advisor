"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { REST_ANGLE, type Orbit } from "./orbit";

/**
 * Pointer, touch, wheel and keyboard controls around a 3D package.
 *  - drag to turn (released drags keep turning and slow down)
 *  - pinch or ctrl/⌘ + wheel to zoom (plain wheel too when `wheelZoom`)
 *  - double-click / double-tap to return to the resting view
 *  - arrow keys turn, +/- zoom, 0 resets
 * `touch="pan-y"` leaves vertical swipes to the page so boxes inside a long page don't trap
 * scrolling; the studio uses "none".
 */
export function Stage3D({
  orbit,
  label,
  children,
  className = "",
  touch = "pan-y",
  wheelZoom = false,
  restZoom = 1,
  onInteract,
}: {
  orbit: Orbit;
  label: string;
  children: ReactNode;
  className?: string;
  touch?: "pan-y" | "none";
  wheelZoom?: boolean;
  restZoom?: number;
  onInteract?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const drag = useRef<{ x: number; y: number; t: number; vx: number; vy: number } | null>(null);
  const pinch = useRef<{ dist: number; zoom: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!wheelZoom && !e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      onInteract?.();
      orbit.stop();
      orbit.zoomBy(Math.exp(-e.deltaY * 0.0022));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [orbit, wheelZoom, onInteract]);

  const distance = () => {
    const [a, b] = [...pointers.current.values()];
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
  };

  const end = (id: number) => {
    pointers.current.delete(id);
    if (pointers.current.size < 2) pinch.current = null;
    if (pointers.current.size === 0) {
      const s = drag.current;
      drag.current = null;
      setDragging(false);
      if (s && performance.now() - s.t < 90) orbit.fling(s.vx, s.vy);
    }
  };

  return (
    <div
      ref={ref}
      className={`stage3d${dragging ? " is-dragging" : ""} ${className}`}
      style={{ touchAction: touch }}
      role="img"
      aria-label={label}
      tabIndex={0}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        orbit.stop();
        onInteract?.();
        if (pointers.current.size === 2) {
          pinch.current = { dist: distance(), zoom: orbit.zoom };
          drag.current = null;
        } else {
          drag.current = { x: e.clientX, y: e.clientY, t: performance.now(), vx: 0, vy: 0 };
          setDragging(true);
        }
      }}
      onPointerMove={(e) => {
        if (!pointers.current.has(e.pointerId)) return;
        pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pinch.current) {
          const d = distance();
          if (d > 0 && pinch.current.dist > 0) orbit.set({}, pinch.current.zoom * (d / pinch.current.dist));
          return;
        }
        const s = drag.current;
        if (!s) return;
        const now = performance.now();
        const dt = Math.max(1, now - s.t);
        const dx = e.clientX - s.x;
        const dy = e.clientY - s.y;
        // Upside down (studio, past 90° tilt), horizontal drags turn the other way.
        const flip = Math.cos((orbit.angle.x * Math.PI) / 180) < 0 ? -1 : 1;
        const ay = dx * 0.45 * flip;
        const ax = -dy * 0.35;
        orbit.set({ x: orbit.angle.x + ax, y: orbit.angle.y + ay });
        drag.current = { x: e.clientX, y: e.clientY, t: now, vx: ax / dt, vy: ay / dt };
      }}
      onPointerUp={(e) => end(e.pointerId)}
      onPointerCancel={(e) => end(e.pointerId)}
      onDoubleClick={() => orbit.tween(REST_ANGLE, 650, restZoom)}
      onKeyDown={(e) => {
        const a = orbit.angle;
        const step = 12;
        const moves: Record<string, () => void> = {
          ArrowLeft: () => orbit.tween({ x: a.x, y: a.y - step }, 160),
          ArrowRight: () => orbit.tween({ x: a.x, y: a.y + step }, 160),
          ArrowUp: () => orbit.tween({ x: a.x + step, y: a.y }, 160),
          ArrowDown: () => orbit.tween({ x: a.x - step, y: a.y }, 160),
          "+": () => orbit.zoomBy(1.12),
          "=": () => orbit.zoomBy(1.12),
          "-": () => orbit.zoomBy(1 / 1.12),
          "0": () => orbit.tween(REST_ANGLE, 500, restZoom),
          Home: () => orbit.tween(REST_ANGLE, 500, restZoom),
        };
        const fn = moves[e.key];
        if (fn) {
          e.preventDefault();
          onInteract?.();
          fn();
        }
      }}
    >
      <div className="stage3d-floor" aria-hidden="true" />
      {children}
    </div>
  );
}
