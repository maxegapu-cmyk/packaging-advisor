"use client";

import { useState } from "react";
import type { Lang } from "@/lib/i18n";
import { CATEGORIES } from "@/lib/categories";
import { printLayout } from "@/lib/print/layout";
import type { Sample } from "@/lib/samples";
import { FormGlyph } from "./pack/FormGlyph";
import { Orbit } from "./pack/orbit";
import { PackageCSS } from "./pack/PackageCSS";

/**
 * Small pictures of what each step actually produces, drawn from the real data: the upload
 * card, the three directions' colors, the package in 3D, and the die line of the print file.
 */
export function HowVignette({ n, sample, lang }: { n: number; sample: Sample; lang: Lang }) {
  const b = sample.board;
  const rec = b.directions.find((d) => d.id === b.recommendation.pick) ?? b.directions[0];
  const [orbit] = useState(() => new Orbit({ x: -18, y: -32 }, 1));
  const one = (p: { zh: string; en: string }) => (lang === "en" ? p.en : p.zh);

  if (n === 0)
    return (
      <div className="hv hv-upload" aria-hidden="true">
        <div className="hv-drop">
          {[0, 1].map((i) => (
            <span key={i} className="hv-photo" style={{ background: i ? rec.palette[0]?.hex : rec.palette[2]?.hex }}>
              <FormGlyph form={sample.pack.inner?.form ?? sample.pack.form} />
            </span>
          ))}
          <span className="hv-plus">+</span>
        </div>
        <div className="hv-chips">
          {(["tea", "cosmetics", "snacks"] as const).map((c) => (
            <span key={c} className={c === sample.id ? "is-on" : undefined}>
              {one(CATEGORIES[c])}
            </span>
          ))}
        </div>
      </div>
    );
  if (n === 1)
    return (
      <div className="hv hv-dirs" aria-hidden="true">
        {b.directions.map((d) => (
          <span key={d.id} className={d.id === b.recommendation.pick ? "hv-dir is-pick" : "hv-dir"}>
            <span className="hv-bar">
              {d.palette.map((p, i) => (
                <i key={i} style={{ background: p.hex, flex: Math.max(4, p.share) }} />
              ))}
            </span>
            <b>{d.id}</b>
            <small>{one(d.name)}</small>
          </span>
        ))}
      </div>
    );
  if (n === 2)
    return (
      <div className="hv hv-3d" aria-hidden="true">
        <div className="hv-cube">
          <PackageCSS d={rec} brand={b.meta.brand} spec={{ form: "carton", w: 110, h: 150, d: 46, finish: "matte" }} fit={104} open={false} orbit={orbit} />
        </div>
        <span className="hv-size">110 × 150 × 46 mm</span>
      </div>
    );
  // the print file: the carton die line with its panels in the direction's colors
  const lay = printLayout({ form: "carton", w: 110, h: 150, d: 46, finish: "matte" });
  const sh = lay.sheets[0];
  const piece = sh.pieces[0];
  const roles = { g: rec.palette.find((p) => p.role === "background")?.hex ?? "#eee", k: rec.palette.find((p) => p.role === "brand")?.hex ?? "#666" };
  return (
    <div className="hv hv-file" aria-hidden="true">
      <svg viewBox={`${piece.x - 6} ${piece.y - 6} ${piece.w + 12} ${piece.h + 12}`}>
        <path d={piece.cut} fill={roles.g} />
        {piece.panels.map((p, i) => (
          <rect key={i} x={p.x} y={p.y} width={p.w} height={p.h} fill={p.kind === "front" || p.kind === "back" ? roles.g : roles.k} opacity={p.kind === "front" ? 1 : 0.9} />
        ))}
        {piece.panels
          .filter((p) => p.kind === "front")
          .map((p, i) => (
            <rect key={`k${i}`} x={p.x} y={p.y} width={p.w * 0.24} height={p.h} fill={roles.k} />
          ))}
        <path d={piece.cut} fill="none" stroke="#E4007F" strokeWidth="1.4" />
        {piece.folds.map(([x1, y1, x2, y2], i) => (
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#00A0E9" strokeWidth="1.1" strokeDasharray="5 4" />
        ))}
      </svg>
      <span className="hv-badges">
        <b>PDF</b>
        <b>ZIP</b>
      </span>
    </div>
  );
}
