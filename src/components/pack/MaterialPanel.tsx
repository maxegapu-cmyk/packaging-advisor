"use client";

/**
 * The Materials tab of the 3D space: each part of the package with the listed materials it can
 * be made of, what the list says about the pick (its limits and design points), the rules it
 * brings and the documents to get from the supplier. Every option comes from the principal's
 * material list; parts the list does not cover are named as such.
 */
import { useMemo } from "react";
import type { Lang, Pair } from "@/lib/i18n";
import { FORM_LABELS, type PackSpec } from "@/lib/pack";
import { documentsFor, LIST, material, offListOf, pathText, problemsOf, rulesFor, usesOf, withMaterial, type Use } from "@/lib/materials";

const T = {
  lead: { zh: "材料只从委托方的材料清单里选。每个部件只列出能做成这个结构的清单材料，3D 和印刷文件随选择更新。", en: "Materials come only from the principal's material list. Each part lists only the listed materials it can be made of; the 3D model and print file follow your picks." },
  outer: { zh: "外包装", en: "Outer pack" },
  process: { zh: "随表面工艺", en: "With the finish and effects" },
  processNote: { zh: "由表面工艺和附加工艺决定，在「外观」里改。", en: "Set by the finish and effects; change them under Look." },
  touches: { food: { zh: "直接接触食品", en: "Touches the food" }, cosmetics: { zh: "直接接触化妆品", en: "Touches the cosmetic" } },
  boundary: { zh: "使用边界", en: "Limits of use" },
  design: { zh: "设计与加工要点", en: "Design and processing" },
  path: { zh: "合规路径", en: "Compliance path" },
  trade: { zh: "采购常用名称", en: "Trade names" },
  source: { zh: "资料来源", en: "Source" },
  only: { zh: "清单中只有这一种适合这个部件", en: "The only listed material for this part" },
  offList: { zh: "清单外部件", en: "Parts off the list" },
  offListNote: { zh: "这些部件在清单里没有对应材料，未作替换：请委托方确认或补列。", en: "The list has no material for these parts, and none has been substituted: ask the principal to confirm or add one." },
  rules: { zh: "适用规则", en: "Rules that apply" },
  rulesNote: { zh: "规则按品类、部件是否直接接触内容物、是否寄递或作购物袋自动判断。不构成合规审查，以现行法规与成品检测为准。", en: "Chosen from the category, whether a part touches the contents, and whether the pack is shipped by courier or used as a shopping bag. Not a compliance review: current law and finished-product tests decide." },
  by: { zh: "涉及", en: "For" },
  pack: { zh: "整个包装", en: "the whole pack" },
  needs: { zh: "需满足", en: "Must meet" },
  get: { zh: "应取得", en: "Obtain" },
  status: { zh: "状态", en: "Status" },
  docs: { zh: "向供应商索取", en: "Ask suppliers for" },
  checked: { zh: `清单核对日期 ${LIST.checked}。标准换版、法规调整或用途变化时须重新核验。`, en: `List checked ${LIST.checked}. Re-verify when standards or regulations change, or the use does.` },
} satisfies Record<string, Pair | Record<string, Pair>>;

const one = (p: Pair, lang: Lang) => (lang === "en" ? p.en : p.zh);

export function MaterialPanel({ spec, category, lang, onChange }: { spec: PackSpec; category: string; lang: Lang; onChange: (s: PackSpec) => void }) {
  const uses = useMemo(() => usesOf(spec, category), [spec, category]);
  const rules = useMemo(() => rulesFor(spec, category, uses), [spec, category, uses]);
  const problems = useMemo(() => problemsOf(uses), [uses]);
  const off = offListOf(spec);
  const docs = documentsFor(uses);
  const labelOf = (key: string) => uses.find((u) => u.key === key)?.label;

  const groups: { title: Pair; items: Use[]; process?: boolean }[] = [
    { title: { zh: `${T.outer.zh} · ${FORM_LABELS[spec.form].zh}`, en: `${T.outer.en}: ${FORM_LABELS[spec.form].en}` }, items: uses.filter((u) => !u.inner && !u.process) },
  ];
  if (spec.inner) groups.push({ title: { zh: `内装 · ${FORM_LABELS[spec.inner.form].zh}`, en: `Inside: ${FORM_LABELS[spec.inner.form].en}` }, items: uses.filter((u) => u.inner && !u.process) });
  groups.push({ title: T.process, items: uses.filter((u) => u.process), process: true });

  return (
    <div className="st-tabpanel mat-panel" role="tabpanel">
      <section className="st-sec">
        <p className="st-note">{one(T.lead, lang)}</p>
        {problems.length ? (
          <ul className="mat-problems" role="alert">
            {problems.map((p) => (
              <li key={p.key}>{one(p.text, lang)}</li>
            ))}
          </ul>
        ) : null}
      </section>

      {groups.map((g) => (
        <section className="st-sec" key={g.title.en}>
          <span className="st-label">{one(g.title, lang)}</span>
          {g.process ? <span className="st-small">{one(T.processNote, lang)}</span> : null}
          <div className="mat-list">
            {g.items.map((u) => (
              <MaterialRow key={u.key} u={u} lang={lang} rules={rules.filter((r) => r.by.includes(u.key)).map((r) => r.rule.id)} onPick={g.process ? undefined : (id) => onChange(withMaterial(spec, u.key, id))} />
            ))}
          </div>
        </section>
      ))}

      {off.length ? (
        <section className="st-sec">
          <span className="st-label">{one(T.offList, lang)}</span>
          <span className="st-small">{one(T.offListNote, lang)}</span>
          <ul className="mat-off">
            {off.map((x) => (
              <li key={x.id}>
                <strong>{one(x.label, lang)}</strong>
                <span>{one(x.why, lang)}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="st-sec">
        <span className="st-label">{one(T.rules, lang)}</span>
        <span className="st-small">{one(T.rulesNote, lang)}</span>
        <div className="mat-rules">
          {rules.map((a) => (
            <details key={a.rule.id} className="mat-rule">
              <summary>
                <b className="mat-rule-id">{a.rule.id}</b>
                <span>{one(a.rule.scope, lang)}</span>
              </summary>
              <dl>
                <div>
                  <dt>{one(T.by, lang)}</dt>
                  <dd>{a.by.length ? a.by.map((k) => one(labelOf(k) ?? { zh: k, en: k }, lang)).join(lang === "en" ? ", " : "、") : one(T.pack, lang)}</dd>
                </div>
                <div>
                  <dt>{lang === "en" ? "Standard" : "标准或法规"}</dt>
                  <dd>{one(a.rule.standard, lang)}</dd>
                </div>
                <div>
                  <dt>{one(T.status, lang)}</dt>
                  <dd>{one(a.rule.status, lang)}</dd>
                </div>
                <div>
                  <dt>{one(T.needs, lang)}</dt>
                  <dd>{one(a.rule.needs, lang)}</dd>
                </div>
                <div>
                  <dt>{one(T.get, lang)}</dt>
                  <dd>{one(a.rule.docs, lang)}</dd>
                </div>
              </dl>
              {a.rule.urls.length ? (
                <p className="mat-links">
                  {a.rule.urls.map((u, i) => (
                    <a key={u} href={u} target="_blank" rel="noreferrer noopener">
                      {lang === "en" ? `Source ${i + 1}` : `来源 ${i + 1}`}
                    </a>
                  ))}
                </p>
              ) : null}
            </details>
          ))}
        </div>
      </section>

      <section className="st-sec">
        <span className="st-label">{one(T.docs, lang)}</span>
        <ul className="mat-docs">
          {docs.map((d) => (
            <li key={d.docs.zh}>
              <span>{one(d.docs, lang)}</span>
              <small>{d.ids.join(" · ")}</small>
            </li>
          ))}
        </ul>
        <span className="st-small">{one(T.checked, lang)}</span>
      </section>
    </div>
  );
}

function MaterialRow({ u, lang, rules, onPick }: { u: Use; lang: Lang; rules: string[]; onPick?: (id: string) => void }) {
  const id = `mat-${u.key.replace(/\./g, "-")}`;
  const name = (m: { name: Pair }, mid: string) => `${one(m.name, lang)} ${mid}`;
  const touch = u.touches ? T.touches[u.touches] : null;
  return (
    <div className={`mat-row${u.m.noFood && u.touches === "food" ? " is-bad" : ""}`}>
      <div className="mat-head">
        <label htmlFor={id} className="mat-part">
          {one(u.label, lang)}
          {u.grade ? <small>{one(u.grade, lang)}</small> : null}
        </label>
        {touch ? <span className="mat-touch">{one(touch, lang)}</span> : null}
      </div>
      {onPick && u.options.length > 1 ? (
        <select id={id} className="mat-select" value={u.id} onChange={(e) => onPick(e.currentTarget.value)}>
          {u.options.map((o) => (
            <OptionOf key={o} id={o} lang={lang} />
          ))}
        </select>
      ) : (
        <p id={id} className="mat-fixed">
          <strong>
            {name(u.m, u.id)}
            {u.note ? <em>{lang === "en" ? ` (${u.note.en})` : `（${u.note.zh}）`}</em> : null}
          </strong>
          {onPick ? <small>{one(T.only, lang)}</small> : null}
        </p>
      )}
      {u.note && onPick && u.options.length > 1 ? <p className="mat-meta">{lang === "en" ? `As ${u.note.en}` : `即${u.note.zh}`}</p> : null}
      <p className="mat-meta">
        <span>{one(T.boundary, lang)}</span>
        {one(u.m.boundary, lang)}
      </p>
      <details className="mat-more">
        <summary>{lang === "en" ? "More from the list" : "清单中的更多信息"}</summary>
        <dl>
          <div>
            <dt>{one(T.design, lang)}</dt>
            <dd>{one(u.m.notes, lang)}</dd>
          </div>
          <div>
            <dt>{one(T.trade, lang)}</dt>
            <dd>{u.m.trade}</dd>
          </div>
          <div>
            <dt>{one(T.path, lang)}</dt>
            <dd>{one(pathText(u.m), lang)}</dd>
          </div>
          {u.m.url ? (
            <div>
              <dt>{one(T.source, lang)}</dt>
              <dd>
                <a href={u.m.url} target="_blank" rel="noreferrer noopener">
                  {new URL(u.m.url).hostname}
                </a>
              </dd>
            </div>
          ) : null}
        </dl>
      </details>
      {rules.length ? (
        <p className="mat-chips" aria-label={one(T.rules, lang)}>
          {rules.map((r) => (
            <span key={r} className={`mat-chip mat-chip-${r[0]}`}>
              {r}
            </span>
          ))}
        </p>
      ) : null}
    </div>
  );
}

function OptionOf({ id, lang }: { id: string; lang: Lang }) {
  const m = material(id);
  return <option value={id}>{m ? `${one(m.name, lang)}  ${id}` : id}</option>;
}
