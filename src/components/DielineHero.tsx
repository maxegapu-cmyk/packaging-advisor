"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { Direction } from "@/lib/board/schema";
import type { Lang } from "@/lib/i18n";
import { DEFAULT_PACK } from "@/lib/pack";
import { Package3D } from "./pack/Package3D";
import { Orbit, REST_ANGLE, reducedMotion } from "./pack/orbit";
import { Stage3D } from "./pack/Stage3D";
import { ColorStrip, RegMarks } from "./PressSheet";

const FOLD_MS = 2800;
const HERO_FIT = 300;
const HERO_PACK = { ...DEFAULT_PACK, w: 120, h: 156, d: 48 };
const CYCLE_MS = 4200;

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

/**
 * The landing hero is a press sheet in the colors of the packaging on show: a flat dieline
 * folds into a box, then the whole sheet re-inks itself for each sample direction.
 * With reduced motion the box is shown folded and only changes when a direction is chosen.
 */
export function HeroSection({ directions, brand, lang, children }: { directions: Direction[]; brand: string; lang: Lang; children: ReactNode }) {
  const [i, setI] = useState(1);
  const [auto, setAuto] = useState(true);
  const [orbit] = useState(() => new Orbit({ x: 0, y: 0 }, 1, { free: true }));
  const [flat, setFlat] = useState(true);
  const started = useRef(false);

  // The flat dieline folds itself into a box while the camera swings round,
  // starting once the renderer has drawn its first frame.
  const fold = () => {
    if (started.current) return;
    started.current = true;
    if (reducedMotion()) {
      setFlat(false);
      orbit.set(REST_ANGLE, 1);
      return;
    }
    setTimeout(() => {
      setFlat(false);
      orbit.tween(REST_ANGLE, FOLD_MS, 1);
    }, 350);
  };

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
      <RegMarks />
      <div className="hero">
        <div className="hero-copy">{children}</div>
        <div className="hero-visual">
          <DielineDrawing />
          <Stage3D orbit={orbit} label={lang === "en" ? `Sample box, ${d.name.en}. Drag to turn.` : `示例包装盒：${d.name.zh}。拖动旋转。`} className="hero-stage" onInteract={() => setAuto(false)}>
            <Package3D d={d} brand={brand} spec={HERO_PACK} fit={HERO_FIT} open={flat} orbit={orbit} onReady={fold} />
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
