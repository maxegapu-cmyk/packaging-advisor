"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { Direction } from "@/lib/board/schema";
import type { Lang } from "@/lib/i18n";
import { DEFAULT_PACK, toPx } from "@/lib/pack";
import { netSize, Package3D } from "./pack/Package3D";
import { Orbit, REST_ANGLE, reducedMotion } from "./pack/orbit";
import { Stage3D } from "./pack/Stage3D";

const FOLD_MS = 2800;
const HERO_FIT = 300;
const HERO_PACK = { ...DEFAULT_PACK, w: 120, h: 156, d: 48 };
const CYCLE_MS = 4200;

/** Printer's registration mark, drawn at the corners of the press sheet. */
function RegMark({ className }: { className: string }) {
  return (
    <svg className={`regmark ${className}`} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="6.5" fill="none" stroke="currentColor" strokeWidth="1" />
      <path d="M12 0v24M0 12h24" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

/** A box net (dieline) drawn large behind the box. */
function DielineDrawing() {
  return (
    <svg className="hero-dieline" viewBox="0 0 640 520" aria-hidden="true">
      <g fill="none" strokeWidth="1.4">
        <path className="cut" d="M90 110h120v-70h220v70h120v300h-120v70h-220v-70h-120z" />
        <path className="fold" d="M210 110v300M430 110v300M210 110h220M210 410h220" />
        <path className="cut" d="M550 140l40 12v236l-40 12" />
        <path className="cut" d="M232 40l18-28h140l18 28M232 480l18 28h140l18-28" />
      </g>
    </svg>
  );
}

/** Press color-control strip: the direction's palette next to process C, M, Y, K. */
function ColorStrip({ d }: { d: Direction }) {
  const cells = [...d.palette.map((p) => p.hex), "#00A0E9", "#E4007F", "#FFF100", "#1A1A1A"];
  const run = Array.from({ length: 48 }, (_, i) => cells[i % cells.length]);
  return (
    <div className="press-strip" aria-hidden="true">
      {run.map((c, i) => (
        <span key={i} style={{ background: c, opacity: i % cells.length >= d.palette.length ? 0.85 : 1 }} />
      ))}
    </div>
  );
}

/**
 * The landing hero is a press sheet in the colors of the packaging on show: a flat dieline
 * folds into a box, then the whole sheet re-inks itself for each sample direction.
 * With reduced motion the box is shown folded and only changes when a direction is chosen.
 */
export function HeroSection({ directions, brand, lang, children }: { directions: Direction[]; brand: string; lang: Lang; children: ReactNode }) {
  const [i, setI] = useState(1);
  const [auto, setAuto] = useState(true);
  const px = toPx(HERO_PACK, HERO_FIT);
  const net = netSize(px);
  const netZoom = Math.min(0.9, 500 / net.w, 480 / net.h);
  const [orbit] = useState(() => new Orbit({ x: 0, y: 0 }, netZoom));
  const [flat, setFlat] = useState(true);
  const started = useRef(false);

  // The flat dieline folds itself into a box while the camera swings round.
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (reducedMotion()) {
      setFlat(false);
      orbit.set(REST_ANGLE, 1);
      return;
    }
    const t = setTimeout(() => {
      setFlat(false);
      orbit.tween(REST_ANGLE, FOLD_MS, 1);
    }, 500);
    return () => clearTimeout(t);
  }, [orbit]);

  useEffect(() => {
    if (!auto) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    let timer: ReturnType<typeof setInterval> | undefined;
    const start = setTimeout(() => {
      timer = setInterval(() => setI((v) => (v + 1) % directions.length), CYCLE_MS);
    }, FOLD_MS + 1400);
    return () => {
      clearTimeout(start);
      if (timer) clearInterval(timer);
    };
  }, [auto, directions.length]);

  const d = directions[i];
  const p = d.palette;
  const sheetVars = {
    "--h-ground": p[0]?.hex,
    "--h-ink": p[1]?.hex,
    "--h-key": p[2]?.hex,
    "--h-accent": (p[3] ?? p[2])?.hex,
  } as CSSProperties;

  return (
    <section className="hero-sheet" style={sheetVars}>
      <RegMark className="rm-tl" />
      <RegMark className="rm-tr" />
      <RegMark className="rm-bl" />
      <RegMark className="rm-br" />
      <div className="hero">
        <div className="hero-copy">{children}</div>
        <div className="hero-visual">
          <DielineDrawing />
          <Stage3D orbit={orbit} label={lang === "en" ? `Sample box, ${d.name.en}. Drag to turn.` : `示例包装盒：${d.name.zh}。拖动旋转。`} className="hero-stage" onInteract={() => setAuto(false)}>
            <Package3D d={d} brand={brand} spec={HERO_PACK} fit={HERO_FIT} open={flat} orbit={orbit} />
          </Stage3D>
          <div className="hero-dirs" role="group" aria-label="示例方向 Sample directions">
            {directions.map((x, j) => (
              <button
                key={x.id}
                type="button"
                className={j === i ? "hero-dir is-active" : "hero-dir"}
                aria-pressed={j === i}
                onClick={() => {
                  setAuto(false);
                  setI(j);
                }}
              >
                <span className="hero-dir-swatch" style={{ background: x.palette[2]?.hex }} />
                <span className="dir-id">{x.id}</span>
                <span>{lang === "en" ? x.name.en : x.name.zh}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
      <ColorStrip d={d} />
    </section>
  );
}
