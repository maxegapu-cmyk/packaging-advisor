"use client";

/**
 * The Compliance tab of the 3D space: freeze the materials when the design is signed off, check
 * the pack against the over-packaging standards (GB 23350 for food and cosmetics, GB 45186 for
 * courier boxes), and keep the supplier documents each part and rule needs, with their expiry.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Lang, Pair } from "@/lib/i18n";
import type { ContentInfo, PackSpec } from "@/lib/pack";
import { diffLibraries, diffText, freezeMaterials, rulesFor, unfreezeMaterials, usageOf, usesOf, type Library } from "@/lib/materials";
import { kindOf, limitsInForce, overpackChecks } from "@/lib/compliance/overpack";
import { LIMIT_SOURCES } from "@/lib/compliance/limits";
import { coverage, coverageSummary, DOC_TYPE_LABELS, DOC_TYPES, statusOf, type DocMeta, type DocType, type SupplierDoc } from "@/lib/compliance/documents";
import type { DocStore } from "./docStore";

const one = (p: Pair, lang: Lang) => (lang === "en" ? p.en : p.zh);
const P = (zh: string, en: string): Pair => ({ zh, en });

const T = {
  freeze: P("定稿快照", "Sign-off snapshot"),
  freezeLead: P("定稿后冻结材料：把当前材料库连同本产品的选材一起存档。之后材料库再怎么改，这个产品的 3D、规则、印前检查和印刷文件都不变。", "Freeze the materials at sign-off: the library as it is now is kept with this product's picks. However the library changes later, this product's 3D, rules, pre-press checks and print file stay as they were."),
  freezeNote: P("备注（例如：打样确认，印厂 A）", "Note (for example: proof approved, printer A)"),
  freezeBtn: P("冻结材料", "Freeze the materials"),
  frozenAt: P("材料已冻结", "Materials frozen"),
  drift: P("材料库在冻结后有变化", "The library has changed since"),
  noDrift: P("冻结后材料库没有变化", "The library hasn't changed since"),
  refreeze: P("按当前材料库更新快照", "Update the snapshot to the current library"),
  unfreeze: P("解冻（材料可再修改，并跟随材料库）", "Unfreeze (materials editable again and follow the library)"),
  over: P("过度包装核算", "Over-packaging check"),
  overLead: P("按 GB 23350（食品、化妆品销售包装）和 GB 45186（快递包装）自动核算，数值随包装尺寸和下面的信息更新。", "Worked out under GB 23350 (food and cosmetics sales packs) and GB 45186 (courier packs); the figures follow the pack's size and the details below."),
  notSales: P("这个品类不属于食品或化妆品，GB 23350 不适用。", "This category is neither food nor cosmetics, so GB 23350 doesn't apply."),
  net: P("单件净含量", "Net content of one unit"),
  kind: P("产品类别（决定必要空间系数 k）", "Product kind (sets the necessary-space coefficient k)"),
  kNone: P("未选", "Not chosen"),
  k: P("k 值（不填则用类别的值）", "k (blank uses the kind's)"),
  price: P("售价（元）", "Selling price (yuan)"),
  packCost: P("包装成本（元，不含直接接触内容物的一层）", "Packaging cost (yuan, without the layer touching the contents)"),
  mass: P("整件总质量（克，含包装）", "Whole product's mass (g, with packaging)"),
  extra: P("3D 中没有的包装层（内袋、外套袋等）", "Layers not shown in 3D (an inner bag, an outer sleeve…)"),
  courierClass: P("快递物品类别", "Courier item class"),
  classes: { normal: P("非易损易碎", "Non-fragile"), fragile: P("易损易碎", "Fragile"), fresh: P("生鲜冷链", "Fresh or chilled") },
  courierExtra: P("快递箱外另加的完全包裹层", "Fully wrapping layers besides the courier box"),
  tape: P("计划封箱胶带长度（mm）", "Planned sealing tape (mm)"),
  tapeWidth: P("胶带宽度（mm）", "Tape width (mm)"),
  sources: P("数值来源", "Where the numbers come from"),
  docs: P("供应商证明文件", "Supplier documents"),
  docsLead: P("按适用规则逐个部件列出应有的文件。上传的文件写明覆盖哪些部件或材料、报告编号和有效期，过期和 30 天内到期的会标出。", "What each part needs under the rules that apply. Say which parts or materials each document covers, its number and validity; expired ones and those expiring within 30 days are marked."),
  local: P("示例和预览中，文件只在本页打开期间可查看；文件信息保存在本浏览器。", "In samples and the preview, files can be opened only while this page is open; their details stay in this browser."),
  met: P("已齐", "Covered"),
  gapsCritical: P("直接接触内容物的部件缺文件", "Parts touching the contents lack documents"),
  gapsOther: P("其他缺少的文件", "Other missing documents"),
  expired: P("已过期", "Expired"),
  expiring: P("30 天内到期", "Expiring within 30 days"),
  needs: P("缺", "Missing"),
  upload: P("上传文件", "Upload a document"),
  file: P("文件（PDF 或图片，15 MB 以内）", "File (PDF or image, up to 15 MB)"),
  type: P("类型", "Type"),
  title: P("名称", "Title"),
  issuer: P("出具机构", "Issued by"),
  number: P("报告 / 证书编号", "Report or certificate number"),
  issued: P("出具日期", "Issued"),
  expires: P("有效期至", "Valid until"),
  covers: P("覆盖范围（样品、结构、使用条件）", "What it covers (sample, structure, conditions of use)"),
  partsCovered: P("覆盖的部件", "Parts it covers"),
  rulesCovered: P("对应规则（不选＝按类型适用）", "Rules it answers (none = by its type)"),
  add: P("上传", "Upload"),
  adding: P("上传中…", "Uploading…"),
  remove: P("删除", "Delete"),
  open: P("打开", "Open"),
  noDocs: P("还没有上传文件。", "No documents yet."),
  noReqs: P("当前没有需要文件的规则。", "No rule here needs documents."),
};

const NUM = (v: string): number | undefined => {
  const n = Number(v);
  return v.trim() === "" || !Number.isFinite(n) || n < 0 ? undefined : n;
};

export function CompliancePanel({ spec, category, lang, onChange, live, store }: { spec: PackSpec; category: string; lang: Lang; onChange: (s: PackSpec) => void; live: Library; store: DocStore | null }) {
  const c = spec.content ?? {};
  const setC = (patch: Partial<ContentInfo>) => {
    const next: ContentInfo = { ...c, ...patch };
    for (const k of Object.keys(next) as (keyof ContentInfo)[]) if (next[k] === undefined || (next[k] as unknown) === "") delete next[k];
    const { content: _c, ...rest } = spec; // eslint-disable-line @typescript-eslint/no-unused-vars
    onChange(Object.keys(next).length ? { ...rest, content: next } : rest);
  };
  const L = limitsInForce();
  const kind = kindOf(c, category, L);
  const checks = overpackChecks(spec, category);
  const sales = checks.some((x) => x.rule === "G02");
  const courier = usageOf(spec).courier;
  const [note, setNote] = useState("");
  const drift = spec.frozen ? diffLibraries(spec.frozen.library, live) : null;

  return (
    <div className="st-tabpanel cmp-panel" role="tabpanel">
      <section className="st-sec">
        <span className="st-label">{one(T.freeze, lang)}</span>
        {spec.frozen ? (
          <div className="cmp-frozen">
            <p>
              <strong>{one(T.frozenAt, lang)}</strong> {spec.frozen.at.slice(0, 16).replace("T", " ")}
              {spec.frozen.note ? ` · ${spec.frozen.note}` : ""}
            </p>
            <p className={drift?.count ? "cmp-drift" : "st-small"}>{drift?.count ? `${one(T.drift, lang)}：${diffText(drift, lang)}` : one(T.noDrift, lang)}</p>
            <p className="mat-actions">
              {drift?.count ? (
                <button type="button" className="st-link" onClick={() => onChange(freezeMaterials(spec, live, spec.frozen?.note))}>
                  {one(T.refreeze, lang)}
                </button>
              ) : null}
              <button type="button" className="st-link" onClick={() => onChange(unfreezeMaterials(spec))}>
                {one(T.unfreeze, lang)}
              </button>
            </p>
          </div>
        ) : (
          <>
            <span className="st-small">{one(T.freezeLead, lang)}</span>
            <div className="cmp-row">
              <input className="cmp-input" value={note} maxLength={160} placeholder={one(T.freezeNote, lang)} onChange={(e) => setNote(e.currentTarget.value)} aria-label={one(T.freezeNote, lang)} />
              <button type="button" className="btn btn-small cmp-freeze" onClick={() => onChange(freezeMaterials(spec, live, note))}>
                {one(T.freezeBtn, lang)}
              </button>
            </div>
          </>
        )}
      </section>

      <section className="st-sec">
        <span className="st-label">{one(T.over, lang)}</span>
        <span className="st-small">{one(T.overLead, lang)}</span>
        {sales ? (
          <div className="cmp-fields">
            <label className="mat-field">
              <span>{one(T.net, lang)}</span>
              <span className="cmp-row">
                <input className="cmp-input" inputMode="decimal" value={c.net ?? ""} onChange={(e) => setC({ net: NUM(e.currentTarget.value) })} />
                <select className="cmp-unit" value={c.unit ?? "g"} onChange={(e) => setC({ unit: e.currentTarget.value as "g" | "mL" })} aria-label={one(T.net, lang)}>
                  <option value="g">g</option>
                  <option value="mL">mL</option>
                </select>
              </span>
            </label>
            <label className="mat-field">
              <span>{one(T.kind, lang)}</span>
              <select className="mat-select" value={kind?.id ?? ""} onChange={(e) => setC({ kind: e.currentTarget.value || undefined })}>
                <option value="">{one(T.kNone, lang)}</option>
                {L.kinds.map((k) => (
                  <option key={k.id} value={k.id}>
                    {one(k.label, lang)}
                    {k.k !== null ? `（k ${k.k}）` : ""}
                  </option>
                ))}
              </select>
              {kind ? <small className="cmp-source">{one(kind.source, lang)}</small> : null}
            </label>
            <label className="mat-field">
              <span>{one(T.k, lang)}</span>
              <input className="cmp-input" inputMode="decimal" value={c.k ?? ""} placeholder={kind?.k != null ? String(kind.k) : ""} onChange={(e) => setC({ k: NUM(e.currentTarget.value) })} />
            </label>
            <label className="mat-field">
              <span>{one(T.extra, lang)}</span>
              <input className="cmp-input" inputMode="numeric" value={c.extraLayers ?? ""} placeholder="0" onChange={(e) => setC({ extraLayers: NUM(e.currentTarget.value) })} />
            </label>
            <div className="cmp-pair">
              <label className="mat-field">
                <span>{one(T.price, lang)}</span>
                <input className="cmp-input" inputMode="decimal" value={c.price ?? ""} onChange={(e) => setC({ price: NUM(e.currentTarget.value) })} />
              </label>
              <label className="mat-field">
                <span>{one(T.packCost, lang)}</span>
                <input className="cmp-input" inputMode="decimal" value={c.packCost ?? ""} onChange={(e) => setC({ packCost: NUM(e.currentTarget.value) })} />
              </label>
            </div>
            {kind?.massRatio ? (
              <label className="mat-field">
                <span>{one(T.mass, lang)}</span>
                <input className="cmp-input" inputMode="decimal" value={c.totalMass ?? ""} onChange={(e) => setC({ totalMass: NUM(e.currentTarget.value) })} />
              </label>
            ) : null}
          </div>
        ) : (
          <p className="st-small">{one(T.notSales, lang)}</p>
        )}
        {courier ? (
          <div className="cmp-fields">
            <label className="mat-field">
              <span>{one(T.courierClass, lang)}</span>
              <select className="mat-select" value={c.courierClass ?? "normal"} onChange={(e) => setC({ courierClass: e.currentTarget.value as ContentInfo["courierClass"] })}>
                {(["normal", "fragile", "fresh"] as const).map((k) => (
                  <option key={k} value={k}>
                    {one(T.classes[k], lang)}
                  </option>
                ))}
              </select>
            </label>
            <label className="mat-field">
              <span>{one(T.courierExtra, lang)}</span>
              <input className="cmp-input" inputMode="numeric" value={c.courierExtra ?? ""} placeholder="0" onChange={(e) => setC({ courierExtra: NUM(e.currentTarget.value) })} />
            </label>
            <div className="cmp-pair">
              <label className="mat-field">
                <span>{one(T.tape, lang)}</span>
                <input className="cmp-input" inputMode="numeric" value={c.tape ?? ""} onChange={(e) => setC({ tape: NUM(e.currentTarget.value) })} />
              </label>
              <label className="mat-field">
                <span>{one(T.tapeWidth, lang)}</span>
                <input className="cmp-input" inputMode="numeric" value={c.tapeWidth ?? ""} placeholder={String(L.tapeWidth)} onChange={(e) => setC({ tapeWidth: NUM(e.currentTarget.value) })} />
              </label>
            </div>
          </div>
        ) : null}
        <ul className="cmp-checks">
          {checks.map((x) => (
            <li key={x.id} className={`ck is-${x.level}`}>
              <b>{x.rule}</b>
              <span>
                <strong>{one(x.title, lang)}</strong>
                {one(x.detail, lang) ? <small>{one(x.detail, lang)}</small> : null}
              </span>
            </li>
          ))}
        </ul>
        <details className="mat-more">
          <summary>{one(T.sources, lang)}</summary>
          <p className="st-small">{one(LIMIT_SOURCES, lang)}</p>
        </details>
      </section>

      <DocumentsSection spec={spec} category={category} lang={lang} store={store} />
    </div>
  );
}

function DocumentsSection({ spec, category, lang, store }: { spec: PackSpec; category: string; lang: Lang; store: DocStore | null }) {
  const [docs, setDocs] = useState<SupplierDoc[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const reload = useCallback(async () => {
    if (!store) return;
    try {
      setDocs(await store.list());
    } catch (e) {
      setErr(String((e as Error).message));
    }
  }, [store]);
  useEffect(() => {
    void reload();
  }, [reload]);
  const uses = useMemo(() => usesOf(spec, category), [spec, category]);
  const applied = useMemo(() => rulesFor(spec, category, uses), [spec, category, uses]);
  const reqs = useMemo(() => coverage(uses, applied, docs), [uses, applied, docs]);
  const sum = coverageSummary(reqs);
  const typeList = (groups: DocType[][]) => groups.map((g) => g.map((t) => one(DOC_TYPE_LABELS[t], lang)).join(lang === "en" ? " or " : "或")).join(lang === "en" ? "; " : "；");

  return (
    <section className="st-sec">
      <span className="st-label">{one(T.docs, lang)}</span>
      <span className="st-small">{one(T.docsLead, lang)}</span>
      {store?.local ? <span className="st-small">{one(T.local, lang)}</span> : null}
      {err ? <p className="mat-problems">{err}</p> : null}
      {reqs.length ? (
        <>
          <p className="cmp-summary">
            {one(T.met, lang)} {sum.met}/{sum.total}
            {sum.expired.length ? <em className="is-error">{` · ${one(T.expired, lang)} ${sum.expired.length}`}</em> : null}
            {sum.expiring.length ? <em className="is-warn">{` · ${one(T.expiring, lang)} ${sum.expiring.length}`}</em> : null}
          </p>
          <ul className="cmp-reqs">
            {reqs.map((r) => (
              <li key={`${r.key}-${r.rule}`} className={r.missing.length ? (r.critical ? "is-error" : "is-warn") : "is-ok"}>
                <b>{r.rule}</b>
                <span>
                  <strong>
                    {one(r.label, lang)} · {r.materialId}
                  </strong>
                  {r.missing.length ? <small>{`${one(T.needs, lang)}：${typeList(r.missing)}`}</small> : null}
                  {r.docs.map((d) => (
                    <small key={d.id} className={`cmp-doc is-${statusOf(d)}`}>
                      {d.title}
                      {d.number ? ` · ${d.number}` : ""}
                      {d.expires ? ` · ${one(T.expires, lang)} ${d.expires}` : ""}
                    </small>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="st-small">{one(T.noReqs, lang)}</p>
      )}
      {store ? <UploadForm uses={uses.filter((u) => !u.removed)} rules={applied.map((a) => a.rule.id)} lang={lang} store={store} onDone={reload} /> : null}
      {store ? (
        docs.length ? (
          <ul className="cmp-doclist">
            {docs.map((d) => (
              <li key={d.id} className={`is-${statusOf(d)}`}>
                <span>
                  <strong>{d.title}</strong>
                  <small>
                    {one(DOC_TYPE_LABELS[d.type], lang)}
                    {d.issuer ? ` · ${d.issuer}` : ""}
                    {d.number ? ` · ${d.number}` : ""}
                    {d.expires ? ` · ${one(T.expires, lang)} ${d.expires}` : ""}
                    {statusOf(d) !== "valid" ? ` · ${one(statusOf(d) === "expired" ? T.expired : T.expiring, lang)}` : ""}
                  </small>
                  <small>{[...d.parts, ...d.materials, ...d.rules].join(" · ")}</small>
                </span>
                <span className="mat-actions">
                  {d.url ? (
                    <a className="st-link" href={d.url} target="_blank" rel="noreferrer noopener">
                      {one(T.open, lang)}
                    </a>
                  ) : null}
                  <button
                    type="button"
                    className="st-link"
                    onClick={async () => {
                      await store.remove(d.id).catch((e) => setErr(String((e as Error).message)));
                      void reload();
                    }}
                  >
                    {one(T.remove, lang)}
                  </button>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="st-small">{one(T.noDocs, lang)}</p>
        )
      ) : null}
    </section>
  );
}

function UploadForm({ uses, rules, lang, store, onDone }: { uses: ReturnType<typeof usesOf>; rules: string[]; lang: Lang; store: DocStore; onDone: () => void }) {
  const blank: DocMeta = { type: "test", title: "", parts: [], materials: [], rules: [] };
  const [m, setM] = useState<DocMeta>(blank);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const set = (patch: Partial<DocMeta>) => setM((x) => ({ ...x, ...patch }));
  const toggle = (k: "parts" | "rules", v: string, on: boolean) => setM((x) => ({ ...x, [k]: on ? [...x[k], v] : x[k].filter((y) => y !== v) }));
  return (
    <details className="cmp-upload">
      <summary>{one(T.upload, lang)}</summary>
      <form
        className="cmp-fields"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!file || !m.title.trim()) return;
          setBusy(true);
          setErr(null);
          try {
            // a part's material is covered along with the part
            const materials = [...new Set(m.parts.map((k) => uses.find((u) => u.key === k)?.id).filter((x): x is string => !!x))];
            await store.add(file, { ...m, title: m.title.trim(), materials });
            setM(blank);
            setFile(null);
            onDone();
          } catch (x) {
            setErr(String((x as Error).message));
          } finally {
            setBusy(false);
          }
        }}
      >
        <label className="mat-field">
          <span>{one(T.file, lang)}</span>
          <input type="file" accept="application/pdf,image/*" onChange={(e) => setFile(e.currentTarget.files?.[0] ?? null)} />
        </label>
        <label className="mat-field">
          <span>{one(T.type, lang)}</span>
          <select className="mat-select" value={m.type} onChange={(e) => set({ type: e.currentTarget.value as DocType })}>
            {DOC_TYPES.map((t) => (
              <option key={t} value={t}>
                {one(DOC_TYPE_LABELS[t], lang)}
              </option>
            ))}
          </select>
        </label>
        <label className="mat-field">
          <span>{one(T.title, lang)}</span>
          <input className="cmp-input" value={m.title} maxLength={120} onChange={(e) => set({ title: e.currentTarget.value })} />
        </label>
        <div className="cmp-pair">
          <label className="mat-field">
            <span>{one(T.issuer, lang)}</span>
            <input className="cmp-input" value={m.issuer ?? ""} maxLength={80} onChange={(e) => set({ issuer: e.currentTarget.value || undefined })} />
          </label>
          <label className="mat-field">
            <span>{one(T.number, lang)}</span>
            <input className="cmp-input" value={m.number ?? ""} maxLength={80} onChange={(e) => set({ number: e.currentTarget.value || undefined })} />
          </label>
        </div>
        <div className="cmp-pair">
          <label className="mat-field">
            <span>{one(T.issued, lang)}</span>
            <input className="cmp-input" type="date" value={m.issued ?? ""} onChange={(e) => set({ issued: e.currentTarget.value || undefined })} />
          </label>
          <label className="mat-field">
            <span>{one(T.expires, lang)}</span>
            <input className="cmp-input" type="date" value={m.expires ?? ""} onChange={(e) => set({ expires: e.currentTarget.value || undefined })} />
          </label>
        </div>
        <label className="mat-field">
          <span>{one(T.covers, lang)}</span>
          <textarea className="cmp-input" rows={2} maxLength={300} value={m.covers ?? ""} onChange={(e) => set({ covers: e.currentTarget.value || undefined })} />
        </label>
        <fieldset className="cmp-checklist">
          <legend>{one(T.partsCovered, lang)}</legend>
          {uses.map((u) => (
            <label key={u.key} className="mat-check">
              <input type="checkbox" checked={m.parts.includes(u.key)} onChange={(e) => toggle("parts", u.key, e.currentTarget.checked)} />
              <span>
                {one(u.label, lang)} <small>{u.id}</small>
              </span>
            </label>
          ))}
        </fieldset>
        {rules.length ? (
          <fieldset className="cmp-checklist cmp-rules">
            <legend>{one(T.rulesCovered, lang)}</legend>
            {rules.map((r) => (
              <label key={r} className="mat-check">
                <input type="checkbox" checked={m.rules.includes(r)} onChange={(e) => toggle("rules", r, e.currentTarget.checked)} />
                <span>{r}</span>
              </label>
            ))}
          </fieldset>
        ) : null}
        {err ? <p className="mat-problems">{err}</p> : null}
        <button type="submit" className="btn btn-small" disabled={busy || !file || !m.title.trim() || !m.parts.length}>
          {one(busy ? T.adding : T.add, lang)}
        </button>
      </form>
    </details>
  );
}
