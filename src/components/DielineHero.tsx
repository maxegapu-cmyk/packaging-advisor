"use client";

import { useEffect, useState } from "react";
import type { Direction } from "@/lib/board/schema";
import type { Lang } from "@/lib/i18n";
import { BackFace, FrontFace, paletteVars, SideFace, TopFace } from "./BoxFaces";

const FOLD_MS = 2800;
const CYCLE_MS = 3200;

/**
 * The landing page's one orchestrated moment: a flat dieline folds into a box,
 * then the box cycles through the three sample directions. With reduced motion the
 * box is shown folded and only changes when a direction is chosen.
 */
export function DielineHero({ directions, brand, lang }: { directions: Direction[]; brand: string; lang: Lang }) {
  const [i, setI] = useState(1);
  const [auto, setAuto] = useState(true);
  useEffect(() => {
    if (!auto) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    let timer: ReturnType<typeof setInterval> | undefined;
    const start = setTimeout(() => {
      timer = setInterval(() => setI((v) => (v + 1) % directions.length), CYCLE_MS);
    }, FOLD_MS + 600);
    return () => {
      clearTimeout(start);
      if (timer) clearInterval(timer);
    };
  }, [auto, directions.length]);

  const d = directions[i];
  return (
    <div className="hero-visual">
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
  );
}
