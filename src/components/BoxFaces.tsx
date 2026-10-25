import type { CSSProperties } from "react";
import type { Direction } from "@/lib/board/schema";

/**
 * The six faces of a packaging box, drawn from a direction's layout and palette.
 * Shapes are abstract placeholders: they show where the eye lands and how color is
 * distributed, not artwork or a dieline.
 */

export function paletteVars(d: Direction): CSSProperties {
  const p = d.palette;
  return {
    "--ground": p[0]?.hex,
    "--ink": p[1]?.hex,
    "--key": p[2]?.hex,
    "--accent": p[3]?.hex ?? p[2]?.hex,
  } as CSSProperties;
}

export function FrontFace({ d, brand }: { d: Direction; brand: string }) {
  const m = d.mockup;
  const showBrand = brand && brand !== m.headline;
  return (
    <div className={`face-art face-${d.layout}`}>
      {d.layout === "stripe" ? <div className="fa-stripe" aria-hidden="true" /> : null}
      {d.layout === "split" ? <div className="fa-split" aria-hidden="true" /> : null}
      {d.layout === "offset" ? (
        <div className="fa-orb" aria-hidden="true">
          <i />
          <b />
        </div>
      ) : null}
      {showBrand ? <span className="fa-brand">{brand}</span> : null}
      <div className="fa-name">
        <strong>{m.headline}</strong>
        <small>{m.detail}</small>
      </div>
    </div>
  );
}

export function SideFace({ d, brand, variant }: { d: Direction; brand: string; variant: "left" | "right" }) {
  return (
    <div className={`face-art side-${variant} side-${d.layout}`}>
      <span className="side-text">{variant === "left" ? brand || d.mockup.headline : d.mockup.detail}</span>
    </div>
  );
}

export function TopFace({ d, brand }: { d: Direction; brand: string }) {
  return (
    <div className="face-art top-face" aria-hidden="true" data-brand={brand || d.mockup.headline} />
  );
}

export function BackFace() {
  return (
    <div className="face-art back-face" aria-hidden="true">
      <i />
      <i />
      <i className="short" />
      <div className="back-info" />
      <div className="back-code" />
    </div>
  );
}

/** Flat inner pack and manual cover, shown beside the box. */
export function InnerAndManual({ d, brand }: { d: Direction; brand: string }) {
  return (
    <div className="carriers-flat" style={paletteVars(d)} aria-hidden="true">
      <div className={`inner-card inner-${d.layout}`}>
        <span>{brand || d.mockup.headline}</span>
        <strong>{d.mockup.innerLabel}</strong>
      </div>
      <div className={`manual-card manual-${d.layout}`}>
        <b className="manual-num">1</b>
        <strong>{d.mockup.manualTitle}</strong>
        <span>{d.mockup.manualStep}</span>
      </div>
    </div>
  );
}
