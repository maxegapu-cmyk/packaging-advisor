"use client";

/**
 * Dieline downloads: what the files hold (each printed part's die with its rule lengths, and the
 * press-sheet layout at the order quantity), and the DXF, SVG and PDF buttons.
 */
import { useMemo, useState } from "react";
import type { Lang, Pair } from "@/lib/i18n";
import type { PackSpec } from "@/lib/pack";
import { libraryVersion } from "@/lib/materials";
import { mmText } from "@/lib/print/die";
import { dieSet, downloadDie, layoutQty, type DieFormat } from "./dieFiles";

const one = (p: Pair, lang: Lang) => (lang === "en" ? p.en : p.zh);
const T = {
  title: { zh: "刀模图", en: "Dielines" },
  note: { zh: "1:1 矢量刀模，切线、压痕、糊位分层，按压痕自动标注各面尺寸，附刀线长度和拼版图，可直接发给刀模厂和印厂。", en: "1:1 vector dielines with cut, crease and glue on their own layers, every panel dimensioned from the creases, rule lengths and the press-sheet layout: ready for the die-maker and the printer." },
  dxf: { zh: "CAD 与切割台（刀模厂常用）", en: "CAD and cutting tables (what die-makers use)" },
  svg: { zh: "Illustrator、Inkscape 可编辑", en: "Editable in Illustrator or Inkscape" },
  pdf: { zh: "专色 CutContour / Crease，校对签样", en: "CutContour and Crease spot colours, to check and sign" },
  rule: { zh: "刀线 {c} m · 压痕 {k} m", en: "cut {c} m · crease {k} m" },
  layout: { zh: "拼版按 {n} 只订量", en: "sheet layouts at {n} pcs" },
  working: { zh: "正在生成…", en: "Making…" },
  error: { zh: "没有生成成功，请再试一次。", en: "Couldn't make the file; try again." },
} satisfies Record<string, Pair>;

export function DieDownloads({ spec, category, product, lang, className }: { spec: PackSpec; category: string; product: string; lang: Lang; className?: string }) {
  const v = libraryVersion();
  const ds = useMemo(() => dieSet(spec, category, product), [spec, category, product, v]); // eslint-disable-line react-hooks/exhaustive-deps
  const [busy, setBusy] = useState<DieFormat | null>(null);
  const [error, setError] = useState(false);
  const go = async (f: DieFormat) => {
    setBusy(f);
    setError(false);
    try {
      await downloadDie(f, spec, category, product, lang);
    } catch {
      setError(true);
    } finally {
      setBusy(null);
    }
  };
  const parts = ds.filter((d) => !d.sheet);
  const layouts = ds.filter((d) => d.sheet);
  return (
    <section className={`die ${className ?? ""}`}>
      <span className="st-label">{one(T.title, lang)}</span>
      <p className="st-small">{one(T.note, lang)}</p>
      <ul className="die-list">
        {parts.map((d) => (
          <li key={d.id}>
            <strong>{one(d.title, lang)}</strong>
            <span>
              {one(T.rule, lang)
                .replace("{c}", mmText(d.rule.cut / 1000))
                .replace("{k}", mmText(d.rule.crease / 1000))}
            </span>
          </li>
        ))}
        {layouts.length ? (
          <li>
            <strong>{one(T.layout, lang).replace("{n}", layoutQty(spec).toLocaleString("en-US"))}</strong>
            <span>{layouts.map((d) => one(d.info[1], lang)).join("；")}</span>
          </li>
        ) : null}
      </ul>
      <div className="die-btns">
        {(["dxf", "svg", "pdf"] as const).map((f) => (
          <button key={f} type="button" className="final-dl die-dl" onClick={() => go(f)} disabled={!!busy}>
            <span className="final-dl-k">{f.toUpperCase()}</span>
            <span className="final-dl-t">
              <strong>{busy === f ? one(T.working, lang) : `${one(T.title, lang)} .${f}`}</strong>
              <small>{one(T[f], lang)}</small>
            </span>
          </button>
        ))}
      </div>
      {error ? (
        <p className="notice notice-error" role="alert">
          {one(T.error, lang)}
        </p>
      ) : null}
    </section>
  );
}
