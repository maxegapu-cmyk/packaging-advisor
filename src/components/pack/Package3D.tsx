"use client";

import { useEffect, useRef, useState } from "react";
import type { Direction } from "@/lib/board/schema";
import type { PackSpec } from "@/lib/pack";
import type { PackScene } from "../three/engine";
import type { Orbit } from "./orbit";
import { PackageCSS } from "./PackageCSS";

export { netSize } from "./PackageCSS";

/**
 * A package rendered with three.js (physically based materials, studio lighting, contact
 * shadow). The engine loads on the client only; without WebGL the CSS version is shown.
 * Camera comes from `orbit`, so several views can turn together.
 */
export function Package3D({
  d,
  brand,
  spec,
  fit,
  open = false,
  orbit,
  quality = "normal",
  onEngine,
  afterRender,
  loader = false,
  onReady,
}: {
  d: Direction;
  brand: string;
  spec: PackSpec;
  fit: number;
  open?: boolean;
  orbit: Orbit;
  quality?: "high" | "normal";
  onEngine?: (e: PackScene | null) => void;
  afterRender?: (canvas: HTMLCanvasElement) => void;
  /** Show a loading ring until the first frame (the studio). */
  loader?: boolean;
  /** Called once the first frame is on screen (or the fallback is shown). */
  onReady?: () => void;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const engine = useRef<PackScene | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "fallback">("loading");
  const latest = useRef({ d, brand, spec, open, fit });
  latest.current = { d, brand, spec, open, fit };
  const after = useRef(afterRender);
  after.current = afterRender;
  const ready = useRef(onReady);
  ready.current = onReady;

  useEffect(() => {
    let alive = true;
    let unsub: (() => void) | undefined;
    let ro: ResizeObserver | undefined;
    let io: IntersectionObserver | undefined;
    let canvas: HTMLCanvasElement | undefined;
    import("../three/engine")
      .then(({ PackScene, webglAvailable }) => {
        const host = wrap.current;
        if (!alive || !host) return;
        if (!webglAvailable()) {
          setState("fallback");
          ready.current?.();
          return;
        }
        canvas = document.createElement("canvas");
        canvas.className = "gl-canvas";
        host.appendChild(canvas);
        const e = new PackScene(canvas, { quality });
        engine.current = e;
        e.onFirstFrame = () => {
          if (!alive) return;
          setState("ready");
          ready.current?.();
        };
        e.afterRender = (c) => after.current?.(c);
        const r = host.getBoundingClientRect();
        e.resize(r.width, r.height);
        e.update(latest.current);
        unsub = orbit.subscribe((o) => e.setView(o.angle, o.zoom));
        ro = new ResizeObserver(([entry]) => e.resize(entry.contentRect.width, entry.contentRect.height));
        ro.observe(host);
        io = new IntersectionObserver(([entry]) => e.setVisible(entry.isIntersecting));
        io.observe(host);
        onEngine?.(e);
      })
      .catch(() => {
        if (!alive) return;
        setState("fallback");
        ready.current?.();
      });
    return () => {
      alive = false;
      unsub?.();
      ro?.disconnect();
      io?.disconnect();
      engine.current?.dispose();
      engine.current = null;
      onEngine?.(null);
      canvas?.remove();
    };
  }, [orbit, quality]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    engine.current?.update({ d, brand, spec, open, fit });
  }, [d, brand, spec, open, fit]);

  if (state === "fallback") return <PackageCSS d={d} brand={brand} spec={spec} fit={fit} open={open} orbit={orbit} />;
  return (
    <div ref={wrap} className={`gl-wrap${state === "ready" ? " is-ready" : ""}`} aria-hidden="true">
      {loader && state === "loading" ? <span className="gl-loader" /> : null}
    </div>
  );
}
