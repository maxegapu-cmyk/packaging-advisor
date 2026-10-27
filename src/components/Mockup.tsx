import type { CSSProperties } from "react";
import type { Direction } from "@/lib/board/schema";

/**
 * Abstract mini mockup of outer box, inner pack and manual in the direction's palette.
 * Ported from the skill's preview.py. Shapes are placeholders, not a dieline.
 */
export function Mockup({ d, brand }: { d: Direction; brand: string }) {
  const [ground, ink, key, accent] = [d.palette[0]?.hex, d.palette[1]?.hex, d.palette[2]?.hex, d.palette[3]?.hex ?? d.palette[2]?.hex];
  const style = { "--ground": ground, "--p-ink": ink, "--key": key, "--p-accent": accent } as CSSProperties;
  const m = d.mockup;
  return (
    <div className={`mk mk-${d.layout}`} style={style} role="img" aria-label={`${d.name.zh} ${d.name.en}: outer box, inner pack and manual mockup`}>
      <div className="mk-box">
        {brand && brand !== m.headline ? (
          <div className="mk-top">
            <span>{brand}</span>
          </div>
        ) : null}
        <div className="mk-decor" aria-hidden="true">
          <i />
          <b />
        </div>
        <div className="mk-msg">
          <strong>{m.headline}</strong>
          <small>{m.detail}</small>
        </div>
      </div>
      <div className="mk-inner">
        <span className="mk-inner-brand">{brand || m.headline}</span>
        <div className="mk-inner-graphic" aria-hidden="true" />
        <strong>{m.innerLabel}</strong>
      </div>
      <div className="mk-manual">
        <div className="mk-manual-graphic" aria-hidden="true">
          1<span>2</span>
          <span>3</span>
        </div>
        <strong>{m.manualTitle}</strong>
        <span className="mk-manual-step">{m.manualStep}</span>
      </div>
    </div>
  );
}
