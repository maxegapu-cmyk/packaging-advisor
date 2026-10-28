import type { CSSProperties } from "react";
import { hillRoleOf, rolesOf, sealRoleOf } from "@/lib/artwork";
import type { Direction } from "@/lib/board/schema";

/**
 * The six faces of a packaging box, drawn from a direction's layout and palette.
 * Shapes are abstract placeholders: they show where the eye lands and how color is
 * distributed, not artwork or a dieline.
 */

export function paletteVars(d: Direction): CSSProperties {
  const p = d.palette;
  const r = rolesOf(d);
  return {
    "--ground": p[0]?.hex,
    // the product's own ink and accent, named apart from the site's --ink and --accent
    "--p-ink": p[1]?.hex,
    "--key": p[2]?.hex,
    "--p-accent": p[3]?.hex ?? p[2]?.hex,
    // the Song layouts' seal ink and hill colour, chosen as the 3D art chooses them
    "--p-seal": r[sealRoleOf(r)],
    "--p-hill": r[hillRoleOf(r)],
  } as CSSProperties;
}

/** Up to four characters for a seal, as the 3D art takes them. */
const sealText = (brand: string, d: Direction) => Array.from((brand || d.mockup.headline).replace(/[\s·・,，.。:：'"“”-]/g, "")).slice(0, 4).join("");

/** A carved seal: the characters in columns read right to left, cut out of a block (白文) or standing in a frame (朱文). */
function Seal({ text, kind = "bai", className = "" }: { text: string; kind?: "bai" | "zhu"; className?: string }) {
  return (
    <span className={`fa-seal fa-seal-${kind} fa-seal-n${Array.from(text).length} ${className}`} aria-hidden="true">
      {text}
    </span>
  );
}

export function FrontFace({ d, brand }: { d: Direction; brand: string }) {
  const m = d.mockup;
  const showBrand = brand && brand !== m.headline;
  if (d.layout === "scroll")
    return (
      <div className="face-art face-scroll">
        <div className="fa-mount" aria-hidden="true" />
        <div className="fa-painting">
          <i className="fa-hills" aria-hidden="true" />
          <div className="fa-inscription">
            <strong>{m.headline}</strong>
            <small>{m.detail}</small>
          </div>
          <Seal text={sealText(brand, d)} className="fa-seal-small" />
        </div>
      </div>
    );
  if (d.layout === "seal")
    return (
      <div className="face-art face-seal">
        <Seal text={sealText(brand, d)} className="fa-seal-big" />
        <div className="fa-name">
          <strong>{m.headline}</strong>
          <small>{m.detail}</small>
        </div>
      </div>
    );
  if (d.layout === "symmetric")
    return (
      <div className="face-art face-symmetric">
        <i className="fa-frame" aria-hidden="true" />
        {showBrand ? <span className="fa-brand">{brand}</span> : null}
        <strong className="fa-slip">{m.headline}</strong>
        <small className="fa-detail">{m.detail}</small>
        <Seal text={sealText(brand, d)} kind="zhu" className="fa-seal-small" />
      </div>
    );
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
