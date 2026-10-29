"use client";

/**
 * Start from what the trade ships: the category's standard packaging solutions, each a complete
 * specification with its price per pack at its usual first order, applied in one click (the 3D
 * model, materials and quote all follow). Other categories' solutions can be browsed too.
 */
import { useMemo, useState } from "react";
import type { Lang, Pair } from "@/lib/i18n";
import { CATEGORIES, CATEGORY_KEYS, isCategory } from "@/lib/categories";
import { normalizePack, type PackSpec } from "@/lib/pack";
import { libraryVersion } from "@/lib/materials";
import { componentsOf } from "@/lib/spec/build";
import { quoteAt, yuan } from "@/lib/spec/quote";
import { applySolution, CHANNEL_LABELS, SOLUTIONS, type Solution } from "@/lib/spec/solutions";
import { FormGlyph } from "../pack/FormGlyph";

const one = (p: Pair, lang: Lang) => (lang === "en" ? p.en : p.zh);
const T = {
  title: { zh: "按用途选方案", en: "Start from a proven solution" },
  note: { zh: "行业里这个品类实际在用的包装，含完整规格和参考单价。应用后结构、材料和报价一起更新，尺寸可再按产品调整。", en: "The packaging this category actually ships in, each a full specification with a reference price. Applying one updates the structure, materials and quote together; adjust the size to your product after." },
  other: { zh: "看其他品类", en: "Other categories" },
  apply: { zh: "应用这个方案", en: "Use this solution" },
  current: { zh: "当前方案", en: "In use" },
  at: { zh: "只", en: "pcs" },
  applied: { zh: "已应用方案", en: "Solution applied" },
  undo: { zh: "撤销", en: "Undo" },
} satisfies Record<string, Pair>;

export function SolutionPicker({ spec, category, lang, onChange, disabled }: { spec: PackSpec; category: string; lang: Lang; onChange: (s: PackSpec) => void; disabled?: boolean }) {
  const [cat, setCat] = useState(isCategory(category) ? category : "other");
  const [prev, setPrev] = useState<PackSpec | null>(null);
  const v = libraryVersion();
  const list = useMemo(() => SOLUTIONS.filter((s) => s.cat === cat), [cat]);
  const priced = useMemo(() => list.map((s) => ({ s, q: quoteAt(normalizePack(s.spec), s.cat, s.qty ?? 5000) })), [list, v]); // eslint-disable-line react-hooks/exhaustive-deps
  // in use: the same structure and contents, with every part the solution names in the same stock
  const isCurrent = (s: Solution) => {
    if (s.spec.form !== spec.form || (s.spec.inner?.form ?? null) !== (spec.inner?.form ?? null)) return false;
    const mine = new Map(componentsOf(spec, category).map((c) => [c.key, c.stock?.id]));
    const theirs = componentsOf(normalizePack(s.spec), s.cat);
    return theirs.every((c) => !c.stock || mine.get(c.key) === c.stock.id);
  };

  return (
    <section className="st-sec sol">
      <div className="st-sec-row">
        <span className="st-label">{one(T.title, lang)}</span>
        <select className="sol-cat" aria-label={one(T.other, lang)} value={cat} onChange={(e) => setCat(e.currentTarget.value as typeof cat)}>
          {CATEGORY_KEYS.map((k) => (
            <option key={k} value={k}>
              {one(CATEGORIES[k], lang)}
            </option>
          ))}
        </select>
      </div>
      <p className="st-small">{one(T.note, lang)}</p>
      {prev ? (
        <p className="sp-undo">
          {one(T.applied, lang)}
          <button
            type="button"
            className="st-link"
            onClick={() => {
              onChange(prev);
              setPrev(null);
            }}
          >
            {one(T.undo, lang)}
          </button>
        </p>
      ) : null}
      <ul className="sol-list">
        {priced.map(({ s, q }) => {
          const cur = isCurrent(s);
          return (
            <li key={s.id} className={cur ? "sol-item is-current" : "sol-item"}>
              <span className="sol-glyph" aria-hidden="true">
                <FormGlyph form={s.spec.form} />
              </span>
              <div className="sol-body">
                <div className="sol-head">
                  <strong>{one(s.name, lang)}</strong>
                  <span className="sol-price">
                    ¥{yuan(q.unit)}
                    <small>
                      @{(s.qty ?? 5000).toLocaleString("en-US")} {one(T.at, lang)}
                    </small>
                  </span>
                </div>
                <p className="sol-chips">
                  {s.channels.map((c) => (
                    <span key={c}>{one(CHANNEL_LABELS[c], lang)}</span>
                  ))}
                </p>
                <p className="sol-use">{one(s.use, lang)}</p>
                {cur ? (
                  <span className="sol-current">{one(T.current, lang)}</span>
                ) : (
                  <button
                    type="button"
                    className="btn btn-quiet btn-small"
                    disabled={disabled}
                    onClick={() => {
                      setPrev(spec);
                      onChange(applySolution(spec, s));
                    }}
                  >
                    {one(T.apply, lang)}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
