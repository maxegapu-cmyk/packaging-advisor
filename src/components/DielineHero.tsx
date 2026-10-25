"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import type { Direction } from "@/lib/board/schema";
import type { Lang } from "@/lib/i18n";
import { BackFace, FrontFace, paletteVars, SideFace, TopFace } from "./BoxFaces";

const FOLD_MS = 2800;
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
          <div className="dl-scene" aria-hidden="true">
            <div className="dl-rig">
              <div className="dl-face dl-front" style={paletteVars(d)}>
                <FrontFace d={d} brand={brand} />
                <div className="dl-face dl-left">
                  <SideFace d={d} brand={brand} variant="left" />
                </div>
                <div className="dl-face dl-right">
                  <SideFace d={d} brand={brand} variant="right" />
                  <div className="dl-face dl-back">
                    <BackFace />
                  </div>
                </div>
                <div className="dl-face dl-top">
                  <TopFace d={d} brand={brand} />
                </div>
                <div className="dl-face dl-bottom" />
              </div>
            </div>
            <div className="dl-shadow" />
          </div>
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
