"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Lang } from "@/lib/i18n";
import type { Sample } from "@/lib/samples";
import { Package3D } from "./pack/Package3D";
import { Orbit, REST_ANGLE, reducedMotion } from "./pack/orbit";
import { Stage3D } from "./pack/Stage3D";
import { ColorStrip, RegMarks, sheetVars } from "./PressSheet";

const HERO_FIT = 300;
const CYCLE_MS = 5200;

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
 * The landing hero is a press sheet in the colors of the product on show. It goes through
 * different kinds of product (tea, skincare, snacks, electronics), each on its own packaging
 * in its recommended direction, and the whole sheet re-inks itself for each one.
 * With reduced motion it stays on the first until a product is chosen.
 */
export function HeroSection({ samples, lang, children }: { samples: Sample[]; lang: Lang; children: ReactNode }) {
  const [i, setI] = useState(0);
  const [auto, setAuto] = useState(true);
  const [orbit] = useState(() => new Orbit({ x: -8, y: -210 }, 0.62, { free: true }));
  const started = useRef(false);

  const enter = () => {
    if (started.current) return;
    started.current = true;
    if (reducedMotion()) orbit.set(REST_ANGLE, 1);
    else orbit.tween(REST_ANGLE, 1800, 1);
  };

  useEffect(() => {
    if (!auto || reducedMotion()) return;
    const t = setInterval(() => {
      setI((v) => (v + 1) % samples.length);
      orbit.set({ x: -10, y: -150 }, 0.92);
      orbit.tween(REST_ANGLE, 1400, 1);
    }, CYCLE_MS);
    return () => clearInterval(t);
  }, [auto, samples.length, orbit]);

  const s = samples[i];
  const d = s.board.directions.find((x) => x.id === s.board.recommendation.pick) ?? s.board.directions[0];

  return (
    <section className="hero-sheet" style={sheetVars(d)}>
      <RegMarks />
      <div className="hero">
        <div className="hero-copy">{children}</div>
        <div className="hero-visual">
          <DielineDrawing />
          <Stage3D orbit={orbit} label={lang === "en" ? `${s.board.meta.product.en}: ${d.name.en}. Drag to turn.` : `${s.board.meta.product.zh}：${d.name.zh}。拖动旋转。`} className="hero-stage" onInteract={() => setAuto(false)}>
            <Package3D d={d} brand={s.board.meta.brand} spec={s.pack} fit={HERO_FIT} orbit={orbit} category={s.board.meta.category} onReady={enter} />
          </Stage3D>
          <div className="hero-dirs" role="group" aria-label={lang === "en" ? "Sample products" : "示例产品"}>
            {samples.map((x, j) => {
              const xd = x.board.directions.find((y) => y.id === x.board.recommendation.pick) ?? x.board.directions[0];
              return (
                <button
                  key={x.id}
                  type="button"
                  className={j === i ? "hero-dir is-active" : "hero-dir"}
                  aria-pressed={j === i}
                  onClick={() => {
                    setAuto(false);
                    setI(j);
                    orbit.tween(REST_ANGLE, 700, 1);
                  }}
                >
                  <span className="hero-dir-swatch" style={{ background: xd.palette[2]?.hex }} />
                  <span>{lang === "en" ? x.label.en : x.label.zh}</span>
                </button>
              );
            })}
          </div>
          <p className="hero-caption">
            {lang === "en" ? s.board.meta.product.en : s.board.meta.product.zh}
            <span>
              {d.id} · {lang === "en" ? d.name.en : d.name.zh}
            </span>
          </p>
        </div>
      </div>
      <ColorStrip d={d} />
    </section>
  );
}
