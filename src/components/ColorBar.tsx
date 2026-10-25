import type { Swatch } from "@/lib/board/schema";
import type { Lang } from "@/lib/i18n";
import { Bi } from "./Bi";

/** Palette as one bar split by visible-area share, with named chips beneath. */
export function ColorBar({ palette, lang, label }: { palette: Swatch[]; lang: Lang; label: string }) {
  const total = palette.reduce((s, p) => s + (p.share || 0), 0) || palette.length;
  return (
    <figure className="colorbar">
      <div className="colorbar-bar" role="img" aria-label={label}>
        {palette.map((s, i) => (
          <span key={i} style={{ background: s.hex, flexGrow: (s.share || 1) / total }} title={`${s.name.zh} ${s.hex} ${s.share}%`} />
        ))}
      </div>
      <figcaption className="colorbar-keys">
        {palette.map((s, i) => (
          <div className="ck" key={i}>
            <span className="ck-dot" style={{ background: s.hex }} />
            <Bi p={s.name} lang={lang} className="ck-name" />
            <span className="ck-meta">
              <code>{s.hex}</code>
              {s.share ? <span>{s.share}%</span> : null}
            </span>
          </div>
        ))}
      </figcaption>
    </figure>
  );
}
