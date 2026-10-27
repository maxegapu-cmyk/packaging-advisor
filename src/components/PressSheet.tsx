import type { CSSProperties } from "react";
import type { Direction } from "@/lib/board/schema";

/**
 * The press-sheet motif shared by the landing hero, the board header and the 3D space:
 * a sheet printed in a direction's own colors, with registration marks at its corners and a
 * color-control strip along its edge.
 */

/** Printer's registration mark, drawn at the corners of a press sheet. */
export function RegMark({ className }: { className: string }) {
  return (
    <svg className={`regmark ${className}`} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="6.5" fill="none" stroke="currentColor" strokeWidth="1" />
      <path d="M12 0v24M0 12h24" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

export function RegMarks() {
  return (
    <>
      <RegMark className="rm-tl" />
      <RegMark className="rm-tr" />
      <RegMark className="rm-bl" />
      <RegMark className="rm-br" />
    </>
  );
}

/** Press color-control strip: the direction's palette next to process C, M, Y, K. */
/**
 * A hairline band of the direction's colors, each as wide as its share of the surface: the
 * color card drawn as an edge. Quiet enough to sit under a header.
 */
export function ColorStrip({ d, className = "" }: { d: Direction; cells?: number; className?: string }) {
  return (
    <div className={`press-strip ${className}`} aria-hidden="true">
      {d.palette.map((p, i) => (
        <span key={i} style={{ background: p.hex, flexGrow: Math.max(3, p.share) }} />
      ))}
    </div>
  );
}

/** CSS variables that ink a press sheet in a direction's colors. */
export function sheetVars(d: Direction | undefined): CSSProperties {
  const p = d?.palette ?? [];
  const by = (r: string) => p.find((s) => s.role === r)?.hex;
  return {
    "--h-ground": by("background") ?? p[0]?.hex ?? "#e8ece6",
    "--h-ink": by("text") ?? p[1]?.hex ?? "#1f2a24",
    "--h-key": by("brand") ?? p[2]?.hex ?? "#3f7a4f",
    "--h-accent": by("accent") ?? p[3]?.hex ?? p[2]?.hex ?? "#c9a14a",
  } as CSSProperties;
}
