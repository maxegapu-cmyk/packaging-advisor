"use client";

/**
 * The Materials tab of the 3D space. Everything about the package's materials can be changed
 * here, always within the principal's material list: any listed material for any part (the
 * recommended ones first), the process materials (ink, lamination, glue, coatings) changed or
 * dropped, each part's grade, colour (shown in 3D where the part is drawn), supplier and note,
 * whether a part touches the contents, parts of the seller's own, a listed material for a part
 * the list does not cover, and whether the pack is couriered or used as a shopping bag. What the
 * list says about each pick, the rules it brings and the documents to get follow the choices.
 */
import { useMemo, useState } from "react";
import type { Lang, Pair } from "@/lib/i18n";
import { FORM_LABELS, type MaterialPick, type PackSpec } from "@/lib/pack";
import {
  addExtra,
  colorDrawn,
  documentsFor,
  FAMILIES,
  insertKind,
  libraryStats,
  LIST,
  listMaterials,
  material,
  offListOf,
  partsOf,
  pathText,
  problemsOf,
  removeExtra,
  resetChoice,
  rulesFor,
  updateExtra,
  usageOf,
  usesOf,
  withChoice,
  withUsage,
  type Library,
  type Use,
} from "@/lib/materials";
import { priceOf, type BookStock } from "@/lib/spec/book";
import { stockFor } from "@/lib/spec/build";
import { BASIS_UNIT } from "@/lib/spec/stocks";

const T = {
  lead: { zh: "所有材料都可以改：每个部件可选清单里任一材料（推荐的排在前面），可填规格、颜色、供应商和备注，也可以新增部件。只能选委托方材料清单里的材料。", en: "Everything here can be changed: any listed material for any part (recommended ones first), with your own grade, colour, supplier and note, and parts of your own. Only materials on the principal's list can be chosen." },
  use: { zh: "用途", en: "Use" },
  ordered: { zh: "订购料号", en: "Ordered as" },
  toQuote: { zh: "在「报价」里换料号", en: "Change it under Quote" },
  courier: { zh: "作为快递包装寄递", en: "Shipped as a courier box" },
  bag: { zh: "作为购物袋使用", en: "Used as a shopping bag" },
  auto: { zh: "按盒型自动判断", en: "set by the structure" },
  manual: { zh: "已手动设置 · 恢复自动", en: "set by hand · back to automatic" },
  outer: { zh: "外包装", en: "Outer pack" },
  process: { zh: "工艺用料", en: "Process materials" },
  processNote: { zh: "随表面工艺和附加工艺而来，可换成清单里其他材料，或不使用。", en: "They come with the finish and effects; change them to other listed materials, or drop them." },
  touches: { food: { zh: "直接接触食品", en: "Touches the food" }, cosmetics: { zh: "直接接触化妆品", en: "Touches the cosmetic" } },
  contact: { zh: "直接接触内容物", en: "Touches the contents" },
  boundary: { zh: "使用边界", en: "Limits of use" },
  design: { zh: "设计与加工要点", en: "Design and processing" },
  path: { zh: "合规路径", en: "Compliance path" },
  trade: { zh: "采购常用名称", en: "Trade names" },
  source: { zh: "资料来源", en: "Source" },
  recommended: { zh: "推荐用于这个部件", en: "Recommended for this part" },
  usual: { zh: "默认", en: "Default" },
  none: { zh: "不使用", en: "Don't use" },
  removed: { zh: "已不使用：不计入规则、资料和印刷文件。", en: "Not used: left out of the rules, documents and print file." },
  notRecommended: { zh: "不在这个部件的推荐范围：请与印厂确认结构和工艺可行。", en: "Not among the recommended materials for this part: check with your printer that the structure and process work." },
  sketch: { zh: "3D 中按这个部件的常见外观示意，实际外观以打样为准。", en: "The 3D model shows this part's usual look; the proof decides the real one." },
  spec: { zh: "规格与采购", en: "Spec and purchasing" },
  grade: { zh: "规格 / 克重 / 厚度", en: "Grade, grammage or thickness" },
  color: { zh: "颜色", en: "Colour" },
  color3d: { zh: "3D 同步显示", en: "shown in 3D" },
  colorPrint: { zh: "写入印刷工单", en: "on the job sheet" },
  clearColor: { zh: "清除颜色", en: "Clear colour" },
  supplier: { zh: "供应商", en: "Supplier" },
  note: { zh: "备注", en: "Note" },
  reset: { zh: "恢复默认", en: "Reset" },
  remove: { zh: "删除这个部件", en: "Remove this part" },
  name: { zh: "部件名称", en: "Part name" },
  more: { zh: "清单中的更多信息", en: "More from the list" },
  offList: { zh: "清单外部件", en: "Parts off the list" },
  offListNote: { zh: "这些部件在清单里没有对应材料，未作替换。可以请委托方补列，或指定一种清单材料代替。", en: "The list has no material for these parts, and none has been substituted. Ask the principal to add one, or assign a listed material." },
  keepOff: { zh: "保持清单外（待委托方确认）", en: "Keep off the list (for the principal to confirm)" },
  assign: { zh: "指定清单材料", en: "Assign a listed material" },
  add: { zh: "新增部件", en: "Add a part" },
  addNote: { zh: "包装上还有别的东西（贴纸、丝带、干燥剂袋、说明卡……），在这里加上，选它用的清单材料。", en: "Anything else in the pack (a sticker, a ribbon, a desiccant sachet, an insert card…): add it here with the listed material it is made of." },
  addBtn: { zh: "加上", en: "Add" },
  onInner: { zh: "属于内装产品", en: "Part of the product inside" },
  rules: { zh: "适用规则", en: "Rules that apply" },
  rulesNote: { zh: "规则按品类、部件是否直接接触内容物和包装用途自动列出，会随上面的设置变化。不构成合规审查，以现行法规与成品检测为准。", en: "Listed from the category, whether parts touch the contents, and how the pack is used; they follow the settings above. Not a compliance review: current law and finished-product tests decide." },
  by: { zh: "涉及", en: "For" },
  pack: { zh: "整个包装", en: "the whole pack" },
  needs: { zh: "需满足", en: "Must meet" },
  get: { zh: "应取得", en: "Obtain" },
  status: { zh: "状态", en: "Status" },
  standard: { zh: "标准或法规", en: "Standard" },
  docs: { zh: "向供应商索取", en: "Ask suppliers for" },
  editLibrary: { zh: "编辑材料库：改任何材料和规则的内容，新增或隐藏材料", en: "Edit the material library: change any material or rule, add or hide materials" },
  editThis: { zh: "在材料库中编辑这种材料", en: "Edit this material in the library" },
  libSave: { saving: { zh: "材料库保存中…", en: "Saving the library…" }, saved: { zh: "材料库已保存", en: "Library saved" }, error: { zh: "材料库没有保存成功", en: "The library didn't save" } },
  setDefault: { zh: "设为这个部件的默认材料", en: "Make it this part's default" },
  addRec: { zh: "加入这个部件的推荐", en: "Add to this part's recommendations" },
  dropRec: { zh: "移出推荐", en: "Remove from the recommendations" },
  isDefault: { zh: "这个部件的默认材料", en: "This part's default" },
  resetRec: { zh: "推荐恢复为盒型自带", en: "Recommendations back to the structure's own" },
  checked: { zh: `清单核对日期 ${LIST.checked}。标准换版、法规调整或用途变化时须重新核验。`, en: `List checked ${LIST.checked}. Re-verify when standards or regulations change, or the use does.` },
} satisfies Record<string, Pair | Record<string, Pair>>;

const one = (p: Pair, lang: Lang) => (lang === "en" ? p.en : p.zh);

/** The whole list as option groups: the given ids first, then every family. */
function MaterialOptions({ first, firstLabel, lang, none }: { first: string[]; firstLabel: Pair; lang: Lang; none?: boolean }) {
  const all = listMaterials();
  const rest = FAMILIES.map((f) => ({ f, items: all.filter((m) => m.family === f.id && !first.includes(m.id)) })).filter((g) => g.items.length);
  const label = (id: string) => {
    const m = material(id);
    return m ? `${one(m.name, lang)}  ${id}` : id;
  };
  return (
    <>
      {none ? <option value="none">{one(T.none, lang)}</option> : null}
      {first.length ? (
        <optgroup label={one(firstLabel, lang)}>
          {first.map((id) => (
            <option key={id} value={id}>
              {label(id)}
            </option>
          ))}
        </optgroup>
      ) : null}
      {rest.map((g) => (
        <optgroup key={g.f.id} label={one(g.f.label, lang)}>
          {g.items.map((m) => (
            <option key={m.id} value={m.id}>
              {label(m.id)}
            </option>
          ))}
        </optgroup>
      ))}
    </>
  );
}

/** What the library-editing controls need: the library, how to change it, where the editor is. */
type LibCtl = { library: Library; onLibrary: (lib: Library) => void; recKey: (u: Use) => string; base: (u: Use) => string[] };

export function MaterialPanel({
  spec,
  category,
  lang,
  onChange,
  library,
  onLibrary,
  libraryHref,
  librarySave = "idle",
  frozen = false,
  onCompliance,
  onQuote,
}: {
  /** switches to the Quote tab, where the part's stock is ordered */
  onQuote?: () => void;
  /** the pack's materials are frozen at sign-off: shown, not changed */
  frozen?: boolean;
  onCompliance?: () => void;
  spec: PackSpec;
  category: string;
  lang: Lang;
  onChange: (s: PackSpec) => void;
  /** given (with onLibrary) to those who may change the library */
  library?: Library;
  onLibrary?: (lib: Library) => void;
  libraryHref?: string;
  librarySave?: "idle" | "saving" | "saved" | "error";
}) {
  // the key a part's recommendations live under in the library, and its current list
  const ctl: LibCtl | null =
    library && onLibrary
      ? {
          library,
          onLibrary,
          recKey: (u) => {
            const inner = u.key.startsWith("inner.");
            const k = inner ? u.key.slice(6) : u.key;
            const form = inner && spec.inner ? spec.inner.form : spec.form;
            if (k.startsWith("process.")) return `${form}.process.${k.slice(8)}`;
            if (k === "insert") return `${form}.insert.${insertKind(spec)}`;
            return `${form}.${k}`;
          },
          base: (u) => (u.process ? [u.defaultId] : (partsOf(spec).find((p) => p.key === u.key)?.slot.options ?? u.options)),
        }
      : null;
  const stats = library ? libraryStats(library) : null;
  const all = useMemo(() => usesOf(spec, category, true), [spec, category]);
  const uses = useMemo(() => all.filter((u) => !u.removed), [all]);
  const rules = useMemo(() => rulesFor(spec, category, uses), [spec, category, uses]);
  const problems = useMemo(() => problemsOf(uses, spec), [uses, spec]);
  const offAll = offListOf(spec, true);
  const docs = documentsFor(uses);
  const usage = usageOf(spec);
  const labelOf = (key: string) => all.find((u) => u.key === key)?.label;

  const parts = all.filter((u) => !u.process);
  const stocks = useMemo(() => new Map(partsOf(spec).map((p) => [p.key, stockFor(spec, p.key, p.slot, category)])), [spec, category]);
  const groups: { title: Pair; items: Use[]; process?: boolean }[] = [{ title: { zh: `${T.outer.zh} · ${FORM_LABELS[spec.form].zh}`, en: `${T.outer.en}: ${FORM_LABELS[spec.form].en}` }, items: parts.filter((u) => !u.inner) }];
  if (spec.inner) groups.push({ title: { zh: `内装 · ${FORM_LABELS[spec.inner.form].zh}`, en: `Inside: ${FORM_LABELS[spec.inner.form].en}` }, items: parts.filter((u) => u.inner) });
  groups.push({ title: T.process, items: all.filter((u) => u.process), process: true });

  const toggleUse = (k: "courier" | "shoppingBag", v: boolean) => {
    const auto = k === "courier" ? spec.form === "mailer" : spec.form === "bag";
    onChange(withUsage(spec, k, v === auto ? null : v));
  };

  return (
    <div className="st-tabpanel mat-panel" role="tabpanel">
      {frozen ? (
        <p className="mat-frozen" role="status">
          {lang === "en" ? "The materials are frozen at sign-off, so nothing here can change. " : "材料已在定稿时冻结，这里只能查看。"}
          {onCompliance ? (
            <button type="button" className="st-link" onClick={onCompliance}>
              {lang === "en" ? "Unfreeze under Compliance" : "到「合规」中解冻"}
            </button>
          ) : null}
        </p>
      ) : null}
      <fieldset className="mat-lock" disabled={frozen}>
      <section className="st-sec">
        <p className="st-note">{one(T.lead, lang)}</p>
        {libraryHref ? (
          <p className="mat-libline">
            <a className="st-link" href={libraryHref}>
              {one(T.editLibrary, lang)}
            </a>
            {stats ? <small>{fmtStats(stats, lang)}</small> : null}
            {librarySave !== "idle" ? <small className={librarySave === "error" ? "is-error" : undefined}>{one(T.libSave[librarySave], lang)}</small> : null}
          </p>
        ) : null}
        {problems.length ? (
          <ul className="mat-problems" role="alert">
            {problems.map((p) => (
              <li key={p.key + p.level} className={p.level === "warn" ? "is-warn" : undefined}>
                {one(p.text, lang)}
              </li>
            ))}
          </ul>
        ) : null}
        <div className="mat-usage" role="group" aria-label={one(T.use, lang)}>
          {(
            [
              ["courier", T.courier, usage.courier],
              ["shoppingBag", T.bag, usage.shoppingBag],
            ] as const
          ).map(([k, label, on]) => (
            <label key={k} className="mat-check">
              <input type="checkbox" checked={on} onChange={(e) => toggleUse(k, e.currentTarget.checked)} />
              <span>
                {one(label, lang)}
                {spec.usage?.[k] !== undefined ? (
                  <button type="button" className="st-link" onClick={() => onChange(withUsage(spec, k, null))}>
                    {one(T.manual, lang)}
                  </button>
                ) : (
                  <small>{one(T.auto, lang)}</small>
                )}
              </span>
            </label>
          ))}
        </div>
      </section>

      {groups.map((g) => (
        <section className="st-sec" key={g.title.en}>
          <span className="st-label">{one(g.title, lang)}</span>
          {g.process ? <span className="st-small">{one(T.processNote, lang)}</span> : null}
          <div className="mat-list">
            {g.items.map((u) => (
              <MaterialRow stock={stocks.get(u.key)} onQuote={onQuote} key={u.key} u={u} spec={spec} lang={lang} rules={rules.filter((r) => r.by.includes(u.key)).map((r) => r.rule.id)} onChange={onChange} ctl={u.kind === "part" || u.process ? ctl : null} libraryHref={libraryHref} />
            ))}
          </div>
        </section>
      ))}

      {offAll.length ? (
        <section className="st-sec">
          <span className="st-label">{one(T.offList, lang)}</span>
          <span className="st-small">{one(T.offListNote, lang)}</span>
          <ul className="mat-off">
            {offAll.map((x) => {
              const key = `off.${x.id}`;
              const assigned = spec.materials?.[key]?.id ?? "";
              return (
                <li key={x.id} className={assigned ? "is-assigned" : undefined}>
                  <strong>{one(x.label, lang)}</strong>
                  <span>{one(x.why, lang)}</span>
                  <label className="mat-field">
                    <span>{one(T.assign, lang)}</span>
                    <select className="mat-select" value={material(assigned) ? assigned : ""} onChange={(e) => onChange(e.currentTarget.value ? withChoice(spec, key, { id: e.currentTarget.value }) : resetChoice(spec, key))}>
                      <option value="">{one(T.keepOff, lang)}</option>
                      <MaterialOptions first={[]} firstLabel={T.recommended} lang={lang} />
                    </select>
                  </label>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <AddPart spec={spec} lang={lang} onChange={onChange} />

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
                  <dt>{one(T.standard, lang)}</dt>
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
      </fieldset>
    </div>
  );
}

function MaterialRow({ u, spec, lang, rules, onChange, ctl, libraryHref, stock, onQuote }: { u: Use; spec: PackSpec; lang: Lang; rules: string[]; onChange: (s: PackSpec) => void; ctl: LibCtl | null; libraryHref?: string; stock?: BookStock; onQuote?: () => void }) {
  const id = `mat-${u.key.replace(/\./g, "-")}`;
  const extraKey = u.kind === "extra" ? u.key.slice("extra.".length) : null;
  // a change to one of this part's own fields
  const set = (patch: Partial<MaterialPick> & { label?: string }) => {
    if (extraKey) onChange(updateExtra(spec, extraKey, patch));
    else onChange(withChoice(spec, u.key, patch));
  };
  const touch = u.touches ? T.touches[u.touches] : null;
  const custom = !extraKey && (u.choice.id !== undefined || u.choice.contact !== undefined || !!(u.choice.grade || u.choice.color || u.choice.supplier || u.choice.note));
  const hasFields = !!(u.choice.grade || u.choice.color || u.choice.supplier || u.choice.note);
  const recommended = u.kind === "part" ? u.options.includes(u.id) : true;
  const value = u.removed ? "none" : u.id;
  return (
    <div className={`mat-row${u.removed ? " is-removed" : ""}${u.m.noFood && u.touches === "food" && !u.removed ? " is-bad" : ""}`}>
      <div className="mat-head">
        {extraKey ? (
          <input className="mat-name" aria-label={one(T.name, lang)} value={u.label.zh} maxLength={24} onChange={(e) => set({ label: e.currentTarget.value })} />
        ) : (
          <label htmlFor={id} className="mat-part">
            {one(u.label, lang)}
            {u.grade && !u.choice.grade ? <small>{one(u.grade, lang)}</small> : null}
          </label>
        )}
        {touch && !u.removed ? <span className="mat-touch">{one(touch, lang)}</span> : null}
      </div>
      <select
        id={id}
        className="mat-select"
        value={value}
        aria-label={extraKey ? u.label.zh : undefined}
        onChange={(e) => {
          const v = e.currentTarget.value;
          if (extraKey) onChange(updateExtra(spec, extraKey, { id: v }));
          else onChange(withChoice(spec, u.key, { id: v }));
        }}
      >
        <MaterialOptions first={u.kind === "part" ? u.options : u.process ? [u.defaultId] : []} firstLabel={u.process ? T.usual : T.recommended} lang={lang} none={!!u.process} />
      </select>
      {u.removed ? <p className="mat-hint">{one(T.removed, lang)}</p> : null}
      {stock && stock.id !== "included" && u.kind === "part" ? (
        <p className="mat-meta mat-stock">
          <span>{one(T.ordered, lang)}</span>
          {one(stock.name, lang)}
          {u.choice.gsm ?? (stock.kind !== "flute" && stock.basis !== "piece" ? stock.gsm : undefined) ? ` ${u.choice.gsm ?? stock.gsm} g` : ""} · ¥{priceOf(stock).toLocaleString("en-US", { maximumFractionDigits: stock.basis === "ton" ? 0 : 2 })} {one(BASIS_UNIT[stock.basis], lang)}
          {onQuote ? (
            <button type="button" className="st-link" onClick={onQuote}>
              {one(T.toQuote, lang)}
            </button>
          ) : null}
        </p>
      ) : null}
      {u.note && !u.removed ? <p className="mat-meta">{lang === "en" ? `As ${u.note.en}` : `即${u.note.zh}`}</p> : null}
      {!recommended ? <p className="mat-hint">{one(T.notRecommended, lang)}</p> : null}
      {!u.drawn && !u.removed ? <p className="mat-hint">{one(T.sketch, lang)}</p> : null}
      {!u.removed ? (
        <>
          <p className="mat-meta">
            <span>{one(T.boundary, lang)}</span>
            {one(u.m.boundary, lang)}
          </p>
          <label className="mat-check mat-contact">
            <input type="checkbox" checked={u.contact === "direct"} onChange={(e) => set({ contact: e.currentTarget.checked ? "direct" : "outer" })} />
            <span>{one(T.contact, lang)}</span>
          </label>
          <details className="mat-more" open={hasFields || undefined}>
            <summary>{one(T.spec, lang)}</summary>
            <div className="mat-fields">
              <label className="mat-field">
                <span>{one(T.grade, lang)}</span>
                <input value={u.choice.grade ?? ""} placeholder={u.grade && !u.choice.grade ? one(u.grade, lang) : ""} maxLength={40} onChange={(e) => set({ grade: e.currentTarget.value || undefined })} />
              </label>
              <div className="mat-field">
                <span>
                  {one(T.color, lang)}
                  <small>{one(colorDrawn(spec, u.key) ? T.color3d : T.colorPrint, lang)}</small>
                </span>
                <span className="mat-color">
                  <input type="color" aria-label={one(T.color, lang)} value={u.choice.color ?? "#ffffff"} onChange={(e) => set({ color: e.currentTarget.value.toUpperCase() })} />
                  <code>{u.choice.color ?? "—"}</code>
                  {u.choice.color ? (
                    <button type="button" className="st-link" onClick={() => set({ color: undefined })}>
                      {one(T.clearColor, lang)}
                    </button>
                  ) : null}
                </span>
              </div>
              <label className="mat-field">
                <span>{one(T.supplier, lang)}</span>
                <input value={u.choice.supplier ?? ""} maxLength={60} onChange={(e) => set({ supplier: e.currentTarget.value || undefined })} />
              </label>
              <label className="mat-field">
                <span>{one(T.note, lang)}</span>
                <textarea rows={2} value={u.choice.note ?? ""} maxLength={160} onChange={(e) => set({ note: e.currentTarget.value || undefined })} />
              </label>
            </div>
          </details>
          <details className="mat-more">
            <summary>{one(T.more, lang)}</summary>
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
        </>
      ) : null}
      {ctl && !u.removed ? <LibraryActions u={u} ctl={ctl} lang={lang} /> : null}
      {libraryHref && !u.removed ? (
        <p className="mat-actions">
          <a className="st-link" href={`${libraryHref}#${u.id}`}>
            {one(T.editThis, lang)}
          </a>
        </p>
      ) : null}
      {custom || extraKey ? (
        <p className="mat-actions">
          {custom ? (
            <button type="button" className="st-link" onClick={() => onChange(resetChoice(spec, u.key))}>
              {one(T.reset, lang)}
            </button>
          ) : null}
          {extraKey ? (
            <button type="button" className="st-link" onClick={() => onChange(removeExtra(spec, extraKey))}>
              {one(T.remove, lang)}
            </button>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}

function AddPart({ spec, lang, onChange }: { spec: PackSpec; lang: Lang; onChange: (s: PackSpec) => void }) {
  const [name, setName] = useState("");
  const [mid, setMid] = useState("M021");
  const [inner, setInner] = useState(false);
  const full = (spec.extraParts?.length ?? 0) >= 12;
  return (
    <section className="st-sec">
      <span className="st-label">{one(T.add, lang)}</span>
      <span className="st-small">{one(T.addNote, lang)}</span>
      <form
        className="mat-add"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim() || full) return;
          onChange(addExtra(spec, name, mid, inner));
          setName("");
        }}
      >
        <label className="mat-field">
          <span>{one(T.name, lang)}</span>
          <input value={name} maxLength={24} placeholder={lang === "en" ? "e.g. Seal sticker" : "例如：封口贴"} onChange={(e) => setName(e.currentTarget.value)} />
        </label>
        <label className="mat-field">
          <span>{lang === "en" ? "Material" : "材料"}</span>
          <select className="mat-select" value={mid} onChange={(e) => setMid(e.currentTarget.value)}>
            <MaterialOptions first={[]} firstLabel={T.recommended} lang={lang} />
          </select>
        </label>
        {spec.inner ? (
          <label className="mat-check">
            <input type="checkbox" checked={inner} onChange={(e) => setInner(e.currentTarget.checked)} />
            <span>{one(T.onInner, lang)}</span>
          </label>
        ) : null}
        <button type="submit" className="btn btn-ghost btn-small mat-add-btn" disabled={!name.trim() || full}>
          {one(T.addBtn, lang)}
        </button>
      </form>
    </section>
  );
}

function fmtStats(s: ReturnType<typeof libraryStats>, lang: Lang): string {
  const total = s.edited + s.hidden + s.added + s.rulesEdited + s.rulesAdded + s.recommend;
  if (!total) return lang === "en" ? "the list as received" : "与清单原件一致";
  return lang === "en"
    ? `${s.edited} edited, ${s.added} added, ${s.hidden} hidden, ${s.rulesEdited + s.rulesAdded} rules changed, ${s.recommend} parts' recommendations set`
    : `已改 ${s.edited} 种、新增 ${s.added} 种、隐藏 ${s.hidden} 种、规则改动 ${s.rulesEdited + s.rulesAdded} 条、${s.recommend} 个部件设了推荐`;
}

/** Library controls on a part: make the pick the default, add it to or remove it from the recommendations. */
function LibraryActions({ u, ctl, lang }: { u: Use; ctl: LibCtl; lang: Lang }) {
  const key = ctl.recKey(u);
  const own = ctl.library.recommend?.[key];
  const list = own ?? ctl.base(u);
  const isDefault = list[0] === u.id;
  const save = (next: string[] | null) => {
    const rec = { ...(ctl.library.recommend ?? {}) };
    if (next && next.length) rec[key] = next;
    else delete rec[key];
    ctl.onLibrary({ ...ctl.library, recommend: rec });
  };
  return (
    <p className="mat-actions mat-libactions">
      {isDefault ? (
        <small>{one(T.isDefault, lang)}</small>
      ) : (
        <button type="button" className="st-link" onClick={() => save([u.id, ...list.filter((x) => x !== u.id)])}>
          {one(T.setDefault, lang)}
        </button>
      )}
      {!u.process ? (
        list.includes(u.id) ? (
          !isDefault ? (
            <button type="button" className="st-link" onClick={() => save(list.filter((x) => x !== u.id))}>
              {one(T.dropRec, lang)}
            </button>
          ) : null
        ) : (
          <button type="button" className="st-link" onClick={() => save([...list, u.id])}>
            {one(T.addRec, lang)}
          </button>
        )
      ) : null}
      {own ? (
        <button type="button" className="st-link" onClick={() => save(null)}>
          {one(T.resetRec, lang)}
        </button>
      ) : null}
    </p>
  );
}
