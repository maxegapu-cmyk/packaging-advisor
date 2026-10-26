"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { REST_ANGLE, type Orbit } from "./orbit";

type Pt = { x: number; y: number };
type TwoFinger = { dist: number; angle: number; cx: number; cy: number; zoom: number; turn: number; scrolled: number };

const RAD = 180 / Math.PI;

/**
 * Pointer, touch, wheel and keyboard controls around a 3D package.
 *  - one finger or the mouse turns it freely, in any direction; a released drag keeps turning
 *    and slows down
 *  - two fingers: pinch to zoom, twist to turn it round
 *  - ctrl/⌘ + wheel zooms (plain wheel too when `wheelZoom`)
 *  - double-click or double-tap returns to the resting view
 *  - arrow keys turn, +/- zoom, 0 resets
 * The stage takes every touch, so turning up and down works on phones. Inside a long page
 * (`inPage`), sliding two fingers up or down scrolls the page instead.
 */
export function Stage3D({
  orbit,
  label,
  children,
  className = "",
  inPage = true,
  wheelZoom = false,
  restZoom = 1,
  onInteract,
}: {
  orbit: Orbit;
  label: string;
  children: ReactNode;
  className?: string;
  inPage?: boolean;
  wheelZoom?: boolean;
  restZoom?: number;
  onInteract?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, Pt>());
  const drag = useRef<{ x: number; y: number; t: number; vx: number; vy: number } | null>(null);
  const two = useRef<TwoFinger | null>(null);
  const lastTap = useRef<{ t: number; x: number; y: number } | null>(null);
  const downAt = useRef<{ t: number; x: number; y: number } | null>(null);
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
    // Safari's own pinch gesture would zoom the page instead of the package.
    const noGesture = (e: Event) => e.preventDefault();
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("gesturestart", noGesture);
    el.addEventListener("gesturechange", noGesture);
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("gesturestart", noGesture);
      el.removeEventListener("gesturechange", noGesture);
    };
  }, [orbit, wheelZoom, onInteract]);

  const pair = (): [Pt, Pt] | null => {
    const [a, b] = [...pointers.current.values()];
    return a && b ? [a, b] : null;
  };
  const startTwo = () => {
    const p = pair();
    if (!p) return;
    const [a, b] = p;
    two.current = {
      dist: Math.hypot(a.x - b.x, a.y - b.y),
      angle: Math.atan2(b.y - a.y, b.x - a.x),
      cx: (a.x + b.x) / 2,
      cy: (a.y + b.y) / 2,
      zoom: orbit.zoom,
      turn: orbit.angle.y,
      scrolled: 0,
    };
  };

  const end = (e: { pointerId: number; pointerType: string; clientX: number; clientY: number }) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size === 1) {
      // one finger left after a pinch: carry on turning from where it is, without a jump
      two.current = null;
      const [p] = [...pointers.current.values()];
      drag.current = { x: p.x, y: p.y, t: performance.now(), vx: 0, vy: 0 };
      return;
    }
    if (pointers.current.size === 0) {
      two.current = null;
      const s = drag.current;
      drag.current = null;
      setDragging(false);
      if (s && performance.now() - s.t < 90) orbit.fling(s.vx, s.vy);
      // double-tap (touch) resets; mouse uses dblclick below
      const d = downAt.current;
      if (e.pointerType !== "mouse" && d && performance.now() - d.t < 260 && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 12) {
        const l = lastTap.current;
        if (l && performance.now() - l.t < 320 && Math.hypot(e.clientX - l.x, e.clientY - l.y) < 40) {
          orbit.tween(REST_ANGLE, 650, restZoom);
          lastTap.current = null;
        } else lastTap.current = { t: performance.now(), x: e.clientX, y: e.clientY };
      }
    }
  };

  return (
    <div
      ref={ref}
      className={`stage3d${dragging ? " is-dragging" : ""} ${className}`}
      style={{ touchAction: "none" }}
      role="img"
      aria-label={label}
      tabIndex={0}
      onPointerDown={(e) => {
        if (e.pointerType === "mouse" && e.button !== 0) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        orbit.stop();
        onInteract?.();
        if (pointers.current.size === 2) {
          drag.current = null;
          startTwo();
        } else if (pointers.current.size === 1) {
          downAt.current = { t: performance.now(), x: e.clientX, y: e.clientY };
          drag.current = { x: e.clientX, y: e.clientY, t: performance.now(), vx: 0, vy: 0 };
          setDragging(true);
        }
      }}
      onPointerMove={(e) => {
        if (!pointers.current.has(e.pointerId)) return;
        pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        const g = two.current;
        if (g) {
          const p = pair();
          if (!p) return;
          const [a, b] = p;
          const dist = Math.hypot(a.x - b.x, a.y - b.y);
          const angle = Math.atan2(b.y - a.y, b.x - a.x);
          const cy = (a.y + b.y) / 2;
          let twist = (angle - g.angle) * RAD;
          if (twist > 180) twist -= 360;
          if (twist < -180) twist += 360;
          const zoom = g.dist > 0 ? g.zoom * (dist / g.dist) : g.zoom;
          orbit.set({ x: orbit.angle.x, y: g.turn + twist }, zoom);
          // in a page, two fingers sliding together scroll it
          if (inPage) {
            const dy = cy - g.cy - g.scrolled;
            if (Math.abs(dist / g.dist - 1) < 0.12 && Math.abs(dy) > 0.5) {
              window.scrollBy({ top: -dy, behavior: "instant" as ScrollBehavior });
              g.scrolled += dy;
            }
          }
          return;
        }
        const s = drag.current;
        if (!s) return;
        const now = performance.now();
        const dt = Math.max(1, now - s.t);
        const dx = e.clientX - s.x;
        const dy = e.clientY - s.y;
        // Upside down (past 90° tilt), horizontal drags turn the other way.
        const flip = Math.cos((orbit.angle.x * Math.PI) / 180) < 0 ? -1 : 1;
        const touch = e.pointerType === "touch" ? 1.15 : 1;
        const ay = dx * 0.45 * flip * touch;
        const ax = -dy * 0.35 * touch;
        orbit.set({ x: orbit.angle.x + ax, y: orbit.angle.y + ay });
        drag.current = { x: e.clientX, y: e.clientY, t: now, vx: ax / dt, vy: ay / dt };
      }}
      onPointerUp={end}
      onPointerCancel={end}
      onDoubleClick={() => orbit.tween(REST_ANGLE, 650, restZoom)}
      onContextMenu={(e) => e.pointerType !== "mouse" && e.preventDefault()}
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
