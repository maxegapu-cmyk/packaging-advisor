"use client";

/**
 * The material library editor: the principal's list as the base, every field of every material
 * and rule editable, materials and rules added or hidden, each part's recommended materials and
 * default set, and the whole library exported to or imported from a JSON file. Changes save
 * a moment after each edit. The base list is never changed: "Restore" takes an edit away.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Lang, Pair } from "@/lib/i18n";
import { FORM_LABELS, FORMS, INSERT_LABELS, INSERTS, type Form } from "@/lib/pack";
import {
  DOCS,
  FAMILIES,
  libraryMaterials,
  libraryRules,
  libraryStats,
  LIST,
  MATERIALS,
  nextMaterialId,
  nextRuleId,
  normalizeLibrary,
  RULES,
  insertOptionsFor,
  setLibrary,
  slotsOf,
  isHidden,
  isRuleHidden,
  type Library,
  type Material,
  type MaterialEdit,
  type Rule,
  type RuleEdit,
} from "@/lib/materials";

const one = (p: Pair, lang: Lang) => (lang === "en" ? p.en : p.zh);
const P = (zh: string, en: string): Pair => ({ zh, en });

const T = {
  title: P("材料库", "Material library"),
  lead: P(
    `以委托方提供的《${LIST.title.zh}》（${LIST.count} 种，核对日期 ${LIST.checked}）为底，任何材料和规则的内容都可以改，可以新增或隐藏材料，设定每个部件的推荐与默认材料。原件不会被改动：“恢复”即回到清单原值。改动会用于 3D 空间、规则与资料、印前检查、印刷工单和 AI 生成。`,
    `Built on the principal's list (${LIST.count} materials, checked ${LIST.checked}). Change anything about any material or rule, add or hide materials, and set each part's recommended and default materials. The original is never altered: "Restore" goes back to the list's own value. Changes reach the 3D space, rules and documents, pre-press checks, the job sheet and AI generation.`,
  ),
  materials: P("材料", "Materials"),
  rules: P("规则", "Rules"),
  recommend: P("部件推荐", "Part recommendations"),
  search: P("搜索编号、名称、俗名、用途", "Search number, name, trade name, use"),
  allFamilies: P("全部大类", "All families"),
  show: { all: P("全部", "All"), edited: P("已修改", "Edited"), added: P("新增", "Added"), hidden: P("已隐藏", "Hidden") },
  addMaterial: P("新增材料", "Add a material"),
  addRule: P("新增规则", "Add a rule"),
  export: P("导出 JSON", "Export JSON"),
  import: P("导入 JSON", "Import JSON"),
  importBad: P("这个文件不是材料库 JSON。", "That file isn't a material library JSON."),
  imported: P("已导入", "Imported"),
  resetAll: P("全部恢复为清单原件", "Restore the whole list"),
  resetAllConfirm: P("再点一次确认：所有修改、新增和推荐设置都会清除", "Click again to confirm: every edit, addition and recommendation goes"),
  saving: P("保存中…", "Saving…"),
  saved: P("已保存", "Saved"),
  error: P("没有保存成功，请稍后再试", "Couldn't save; try again shortly"),
  edited: P("已修改", "Edited"),
  added: P("新增", "Added"),
  hidden: P("已隐藏", "Hidden"),
  pick: P("在左侧选一种材料来编辑。", "Pick a material on the left to edit it."),
  id: P("编号", "Number"),
  name: P("名称", "Name"),
  trade: P("采购常用名称", "Trade names"),
  family: P("材料大类", "Family"),
  parts: P("包装部位", "Packaging parts"),
  use: P("典型用途", "Typical use"),
  notes: P("设计与加工要点", "Design and processing"),
  boundary: P("使用边界", "Limits of use"),
  compliance: P("合规", "Compliance"),
  food: P("直接接触食品时的规则", "Rules when it touches food"),
  always: P("始终适用的规则", "Rules that always apply"),
  noFood: P("限非食品接触（用在接触食品的部件上会报错）", "Not for food contact (an error on parts that touch food)"),
  noCosmetics: P("不作化妆品接触层", "Not a cosmetics contact layer"),
  courier: P("寄递时加 G03", "Adds G03 when couriered"),
  bag: P("购物袋或寄递时加 P01", "Adds P01 for shopping bags or courier packs"),
  g02: P("合规路径含 G02", "Path includes G02"),
  docs: P("采购核对资料", "Documents to check when buying"),
  url: P("资料链接", "Source link"),
  look: P("3D 颜色（内托、盒板背面、木箱、扣、绳等部件按此颜色绘制）", "3D colour (inserts, board backs, crates, toggles, cords and the like are drawn in it)"),
  clear: P("清除", "Clear"),
  hide: P("隐藏这种材料（不能再选用，已选的回到默认）", "Hide this material (it can't be chosen; existing picks fall back to the default)"),
  restore: P("恢复清单原值", "Restore the list's values"),
  remove: P("删除这种新增材料", "Delete this added material"),
  baseValue: P("清单原值", "List value"),
  scope: P("适用范围", "Scope"),
  standard: P("标准或法规", "Standard or regulation"),
  status: P("状态/核验说明", "Status"),
  needs: P("需要满足的条件", "What must be met"),
  rdocs: P("应取得或确认的资料", "Documents to obtain"),
  checked: P("来源核验层级", "How the source was checked"),
  urls: P("来源链接（每行一个）", "Source links (one per line)"),
  hideRule: P("隐藏这条规则（不再列出）", "Hide this rule (no longer listed)"),
  removeRule: P("删除这条新增规则", "Delete this added rule"),
  recLead: P("每个盒型每个部件推荐哪些材料，第一个是默认。改了的会标出，可随时恢复为盒型自带的推荐。", "Which materials each part of each structure recommends; the first is the default. Changed ones are marked, and can go back to the structure's own."),
  recOwn: P("已改", "Changed"),
  recReset: P("恢复", "Restore"),
  recAdd: P("加入推荐…", "Add a recommendation…"),
  recFirst: P("设为默认", "Make default"),
  recDrop: P("移除", "Remove"),
  insert: P("内托", "Insert"),
  process: P("工艺", "Process"),
  newName: P("新材料", "New material"),
  newRule: P("新规则", "New rule"),
};

type Status = "idle" | "saving" | "saved" | "error";

export function LibraryEditor({ initial, lang, saveUrl, onSave }: { initial: Library; lang: Lang; saveUrl?: string; onSave?: (lib: Library) => void }) {
  const [lib, setLib] = useState<Library>(() => normalizeLibrary(initial));
  setLibrary(lib);
  const [status, setStatus] = useState<Status>("idle");
  const [tab, setTab] = useState<"materials" | "rules" | "recommend">("materials");
  const [note, setNote] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const first = useRef(true);

  // save a moment after each change
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    clearTimeout(timer.current);
    setStatus("saving");
    timer.current = setTimeout(async () => {
      try {
        if (onSave) {
          onSave(lib);
          setStatus("saved");
          return;
        }
        if (!saveUrl) return setStatus("saved");
        const res = await fetch(saveUrl, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(lib) });
        setStatus(res.ok ? "saved" : "error");
      } catch {
        setStatus("error");
      }
    }, 700);
  }, [lib, onSave, saveUrl]);

  const update = (f: (l: Library) => Library) => setLib((l) => normalizeLibrary(f(l)));
  const stats = libraryStats(lib);
  const [confirmReset, setConfirmReset] = useState(false);

  const exportJson = () => {
    const blob = new Blob([JSON.stringify({ ...lib, base: { title: LIST.title.zh, checked: LIST.checked } }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `material-library-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  const importJson = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text());
      const n = normalizeLibrary(parsed);
      if (!parsed || typeof parsed !== "object" || (!Object.keys(n).length && Object.keys(parsed).some((k) => !["base", "updatedAt"].includes(k)))) throw new Error();
      setLib(n);
      setNote(one(T.imported, lang));
    } catch {
      setNote(one(T.importBad, lang));
    }
  };

  return (
    <div className="lib">
      <header className="lib-head">
        <div>
          <h1>{one(T.title, lang)}</h1>
          <p className="lib-lead">{one(T.lead, lang)}</p>
          <p className="lib-stats">
            {lang === "en"
              ? `${stats.edited} edited · ${stats.added} added · ${stats.hidden} hidden · ${stats.rulesEdited} rules edited · ${stats.rulesAdded} rules added · ${stats.recommend} parts' recommendations set`
              : `已修改 ${stats.edited} 种 · 新增 ${stats.added} 种 · 隐藏 ${stats.hidden} 种 · 规则修改 ${stats.rulesEdited} 条 · 新增规则 ${stats.rulesAdded} 条 · ${stats.recommend} 个部件设了推荐`}
            {status !== "idle" ? <span className={`lib-status is-${status}`}>{one(T[status], lang)}</span> : null}
          </p>
        </div>
        <div className="toolbar">
          <button type="button" className="btn btn-small btn-quiet" onClick={exportJson}>
            {one(T.export, lang)}
          </button>
          <label className="btn btn-small btn-quiet lib-import">
            {one(T.import, lang)}
            <input type="file" accept="application/json,.json" onChange={(e) => e.currentTarget.files?.[0] && importJson(e.currentTarget.files[0])} />
          </label>
          <button
            type="button"
            className={confirmReset ? "btn btn-small btn-danger" : "btn btn-small btn-quiet"}
            onClick={() => {
              if (!confirmReset) return setConfirmReset(true);
              setConfirmReset(false);
              setLib({});
            }}
            onBlur={() => setConfirmReset(false)}
          >
            {one(confirmReset ? T.resetAllConfirm : T.resetAll, lang)}
          </button>
        </div>
      </header>
      {note ? (
        <p className="notice" role="status">
          {note}
        </p>
      ) : null}

      <div className="lib-tabs" role="tablist">
        {(["materials", "rules", "recommend"] as const).map((t) => (
          <button key={t} type="button" role="tab" aria-selected={tab === t} className={tab === t ? "lib-tab is-active" : "lib-tab"} onClick={() => setTab(t)}>
            {one(T[t], lang)}
          </button>
        ))}
      </div>

      {tab === "materials" ? <MaterialsTab lib={lib} update={update} lang={lang} /> : null}
      {tab === "rules" ? <RulesTab lib={lib} update={update} lang={lang} /> : null}
      {tab === "recommend" ? <RecommendTab lib={lib} update={update} lang={lang} /> : null}
    </div>
  );
}

type Update = (f: (l: Library) => Library) => void;

/* ---------------------------------------------------------------- materials */

const BASE = new Map(MATERIALS.map((m) => [m.id, m]));

function MaterialsTab({ lib, update, lang }: { lib: Library; update: Update; lang: Lang }) {
  const [q, setQ] = useState("");
  const [fam, setFam] = useState("");
  const [show, setShow] = useState<"all" | "edited" | "added" | "hidden">("all");
  const [sel, setSel] = useState<string | null>(() => (typeof location !== "undefined" && /^#[MU]\d{3}$/.test(location.hash) ? location.hash.slice(1) : null));
  const all = libraryMaterials();
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return all.filter((m) => {
      if (fam && m.family !== fam) return false;
      const edited = !!lib.materials?.[m.id] && Object.keys(lib.materials[m.id]).some((k) => k !== "hidden");
      if (show === "edited" && !edited) return false;
      if (show === "added" && !m.custom) return false;
      if (show === "hidden" && !isHidden(m.id)) return false;
      if (!s) return true;
      return [m.id, m.name.zh, m.name.en, m.trade, m.use.zh, m.use.en].some((x) => x.toLowerCase().includes(s));
    });
  }, [all, q, fam, show, lib]);
  const m = sel ? all.find((x) => x.id === sel) : null;

  useEffect(() => {
    if (sel) document.getElementById(`lib-item-${sel}`)?.scrollIntoView({ block: "nearest" });
  }, [sel]);

  const add = () => {
    const id = nextMaterialId(lib);
    update((l) => ({ ...l, added: [...(l.added ?? []), { id, family: "other", name: { zh: one(T.newName, "zh"), en: one(T.newName, "en") }, trade: "", parts: P("", ""), use: P("", ""), notes: P("", ""), boundary: P("", ""), path: 0, food: ["F01"], docs: 0, source: 0, custom: true }] }));
    setSel(id);
    setShow("all");
  };

  return (
    <div className="lib-split">
      <aside className="lib-side">
        <input className="lib-search" type="search" placeholder={one(T.search, lang)} value={q} onChange={(e) => setQ(e.currentTarget.value)} aria-label={one(T.search, lang)} />
        <div className="lib-filters">
          <select value={fam} onChange={(e) => setFam(e.currentTarget.value)} aria-label={one(T.family, lang)}>
            <option value="">{one(T.allFamilies, lang)}</option>
            {FAMILIES.map((f) => (
              <option key={f.id} value={f.id}>
                {one(f.label, lang)}
              </option>
            ))}
          </select>
          <select value={show} onChange={(e) => setShow(e.currentTarget.value as typeof show)} aria-label={one(T.show.all, lang)}>
            {(["all", "edited", "added", "hidden"] as const).map((k) => (
              <option key={k} value={k}>
                {one(T.show[k], lang)}
              </option>
            ))}
          </select>
        </div>
        <button type="button" className="btn btn-small lib-add" onClick={add}>
          {one(T.addMaterial, lang)}
        </button>
        <ul className="lib-list" role="listbox" aria-label={one(T.materials, lang)}>
          {list.map((x) => {
            const edited = !!lib.materials?.[x.id] && Object.keys(lib.materials[x.id]).some((k) => k !== "hidden");
            return (
              <li key={x.id} id={`lib-item-${x.id}`}>
                <button type="button" role="option" aria-selected={sel === x.id} className={`lib-item${sel === x.id ? " is-active" : ""}${isHidden(x.id) ? " is-hidden" : ""}`} onClick={() => setSel(x.id)}>
                  <code>{x.id}</code>
                  <span>{one(x.name, lang) || "—"}</span>
                  {x.custom ? <em>{one(T.added, lang)}</em> : edited ? <em>{one(T.edited, lang)}</em> : null}
                  {isHidden(x.id) ? <em className="is-hidden">{one(T.hidden, lang)}</em> : null}
                </button>
              </li>
            );
          })}
        </ul>
      </aside>
      <section className="lib-form" aria-live="polite">
        {m ? <MaterialForm key={m.id} m={m} lib={lib} update={update} lang={lang} onRemoved={() => setSel(null)} /> : <p className="muted">{one(T.pick, lang)}</p>}
      </section>
    </div>
  );
}

/** Applies one field's change to a material: an edit on the list's own, or the added material itself. */
function setField(l: Library, m: Material, k: keyof MaterialEdit, v: unknown): Library {
  if (m.custom) return { ...l, added: (l.added ?? []).map((x) => (x.id === m.id ? (v === undefined || v === "" || v === false ? withoutKey(x, k) : { ...x, [k]: v }) : x)) };
  const base = BASE.get(m.id)!;
  const e: MaterialEdit = { ...(l.materials?.[m.id] ?? {}) };
  const same = JSON.stringify((base as Record<string, unknown>)[k] ?? (typeof v === "boolean" ? false : undefined)) === JSON.stringify(v);
  if (same || v === undefined) delete (e as Record<string, unknown>)[k];
  else (e as Record<string, unknown>)[k] = v;
  const materials = { ...(l.materials ?? {}) };
  if (Object.keys(e).length) materials[m.id] = e;
  else delete materials[m.id];
  return { ...l, materials };
}
function withoutKey<T extends object>(o: T, k: PropertyKey): T {
  const c = { ...o } as Record<PropertyKey, unknown>;
  delete c[k];
  return c as T;
}

function Field({ label, children, base }: { label: string; children: ReactNode; base?: string }) {
  return (
    <div className="lib-field">
      <span className="lib-label">{label}</span>
      {children}
      {base ? <small className="lib-base">{base}</small> : null}
    </div>
  );
}

function PairInput({ value, onChange, rows = 1, base, label, lang }: { value: Pair; onChange: (p: Pair) => void; rows?: number; base?: Pair; label: Pair; lang: Lang }) {
  const changed = base && (base.zh !== value.zh || base.en !== value.en);
  const Tag = rows > 1 ? "textarea" : "input";
  return (
    <Field label={one(label, lang)} base={changed ? `${one(T.baseValue, lang)}：${base.zh}${base.en ? ` / ${base.en}` : ""}` : undefined}>
      <div className="lib-pair">
        <Tag aria-label={`${label.zh} 中文`} lang="zh" rows={rows > 1 ? rows : undefined} value={value.zh} onChange={(e: { currentTarget: { value: string } }) => onChange({ ...value, zh: e.currentTarget.value })} />
        <Tag aria-label={`${label.en} English`} lang="en" rows={rows > 1 ? rows : undefined} value={value.en} onChange={(e: { currentTarget: { value: string } }) => onChange({ ...value, en: e.currentTarget.value })} />
      </div>
    </Field>
  );
}

function RuleChecks({ value, onChange, lang, only }: { value: string[]; onChange: (v: string[]) => void; lang: Lang; only?: (r: Rule) => boolean }) {
  const rules = libraryRules().filter((r) => !only || only(r));
  return (
    <div className="lib-checks">
      {rules.map((r) => (
        <label key={r.id} className="lib-check" title={one(r.scope, lang)}>
          <input type="checkbox" checked={value.includes(r.id)} onChange={(e) => onChange(e.currentTarget.checked ? [...value, r.id] : value.filter((x) => x !== r.id))} />
          <b>{r.id}</b>
          <span>{one(r.scope, lang)}</span>
        </label>
      ))}
    </div>
  );
}

function MaterialForm({ m, lib, update, lang, onRemoved }: { m: Material; lib: Library; update: Update; lang: Lang; onRemoved: () => void }) {
  const base = m.custom ? undefined : BASE.get(m.id);
  const set = (k: keyof MaterialEdit, v: unknown) => update((l) => setField(l, m, k, v));
  const hidden = isHidden(m.id);
  const edited = !!lib.materials?.[m.id] && Object.keys(lib.materials[m.id]).some((k) => k !== "hidden");
  const docs = m.docsText ?? DOCS[m.docs];
  return (
    <div className={`lib-card${hidden ? " is-hidden" : ""}`}>
      <div className="lib-card-head">
        <h2>
          <code>{m.id}</code> {one(m.name, lang)}
        </h2>
        <div className="toolbar">
          {m.custom ? <em className="lib-badge">{one(T.added, lang)}</em> : edited ? <em className="lib-badge">{one(T.edited, lang)}</em> : null}
          {base && edited ? (
            <button type="button" className="btn btn-small btn-quiet" onClick={() => update((l) => ({ ...l, materials: Object.fromEntries(Object.entries(l.materials ?? {}).flatMap(([id, e]) => (id !== m.id ? [[id, e]] : e.hidden ? [[id, { hidden: true }]] : []))) }))}>
              {one(T.restore, lang)}
            </button>
          ) : null}
          {m.custom ? (
            <button
              type="button"
              className="btn btn-small btn-quiet"
              onClick={() => {
                update((l) => ({ ...l, added: (l.added ?? []).filter((x) => x.id !== m.id), materials: withoutKey(l.materials ?? {}, m.id) }));
                onRemoved();
              }}
            >
              {one(T.remove, lang)}
            </button>
          ) : null}
        </div>
      </div>
      <label className="lib-check lib-hide">
        <input type="checkbox" checked={hidden} onChange={(e) => {
          // read the box now: the event is gone by the time the update runs
          const on = e.currentTarget.checked;
          update((l) => {
          const cur = { ...(l.materials?.[m.id] ?? {}) };
          if (on) cur.hidden = true;
          else delete cur.hidden;
          const materials = { ...(l.materials ?? {}) };
          if (Object.keys(cur).length) materials[m.id] = cur;
          else delete materials[m.id];
          return { ...l, materials };
          });
        }} />
        <span>{one(T.hide, lang)}</span>
      </label>

      <PairInput label={T.name} value={m.name} base={base?.name} onChange={(v) => set("name", v)} lang={lang} />
      <Field label={one(T.trade, lang)} base={base && base.trade !== m.trade ? `${one(T.baseValue, lang)}：${base.trade}` : undefined}>
        <input value={m.trade} onChange={(e) => set("trade", e.currentTarget.value)} />
      </Field>
      <Field label={one(T.family, lang)}>
        <select value={m.family} onChange={(e) => set("family", e.currentTarget.value)}>
          {FAMILIES.map((f) => (
            <option key={f.id} value={f.id}>
              {one(f.label, lang)}
            </option>
          ))}
        </select>
      </Field>
      <PairInput label={T.parts} value={m.parts} base={base?.parts} onChange={(v) => set("parts", v)} lang={lang} />
      <PairInput label={T.use} value={m.use} base={base?.use} rows={2} onChange={(v) => set("use", v)} lang={lang} />
      <PairInput label={T.notes} value={m.notes} base={base?.notes} rows={2} onChange={(v) => set("notes", v)} lang={lang} />
      <PairInput label={T.boundary} value={m.boundary} base={base?.boundary} rows={2} onChange={(v) => set("boundary", v)} lang={lang} />

      <fieldset className="lib-fieldset">
        <legend>{one(T.compliance, lang)}</legend>
        {(
          [
            ["noFood", T.noFood],
            ["noCosmetics", T.noCosmetics],
            ["courier", T.courier],
            ["bag", T.bag],
            ["g02", T.g02],
          ] as const
        ).map(([k, label]) => (
          <label key={k} className="lib-check">
            <input type="checkbox" checked={!!m[k]} onChange={(e) => set(k, e.currentTarget.checked)} />
            <span>{one(label, lang)}</span>
          </label>
        ))}
        <Field label={one(T.food, lang)} base={base && base.food.join() !== m.food.join() ? `${one(T.baseValue, lang)}：${base.food.join("、")}` : undefined}>
          <RuleChecks value={m.food} onChange={(v) => set("food", v)} lang={lang} only={(r) => r.id.startsWith("F") || r.id.startsWith("X")} />
        </Field>
        <Field label={one(T.always, lang)}>
          <RuleChecks value={m.always ?? []} onChange={(v) => set("always", v.length ? v : undefined)} lang={lang} />
        </Field>
      </fieldset>

      <PairInput label={T.docs} value={docs} base={m.docsText ? DOCS[m.docs] : undefined} rows={2} onChange={(v) => set("docsText", v.zh === DOCS[m.docs].zh && v.en === DOCS[m.docs].en ? undefined : v)} lang={lang} />
      <Field label={one(T.url, lang)} base={base && (base.url ?? "") !== (m.url ?? "") ? `${one(T.baseValue, lang)}：${base.url ?? "—"}` : undefined}>
        <input type="url" value={m.url ?? ""} onChange={(e) => set("url", e.currentTarget.value)} />
      </Field>
      <Field label={one(T.look, lang)}>
        <span className="mat-color">
          <input type="color" aria-label={one(T.look, lang)} value={m.look ?? "#ffffff"} onChange={(e) => set("look", e.currentTarget.value.toUpperCase())} />
          <code>{m.look ?? "—"}</code>
          {m.look ? (
            <button type="button" className="st-link" onClick={() => set("look", m.custom ? undefined : "")}>
              {one(T.clear, lang)}
            </button>
          ) : null}
        </span>
      </Field>
    </div>
  );
}

/* ---------------------------------------------------------------- rules */

const BASE_RULES = new Map(RULES.map((r) => [r.id, r]));

function RulesTab({ lib, update, lang }: { lib: Library; update: Update; lang: Lang }) {
  const [sel, setSel] = useState<string>(RULES[0].id);
  const rules = libraryRules();
  const r = rules.find((x) => x.id === sel) ?? rules[0];
  const add = () => {
    const id = nextRuleId(lib);
    update((l) => ({ ...l, addedRules: [...(l.addedRules ?? []), { id, scope: { zh: one(T.newRule, "zh"), en: one(T.newRule, "en") }, standard: P("", ""), status: P("", ""), needs: P("", ""), docs: P("", ""), checked: P("", ""), urls: [] }] }));
    setSel(id);
  };
  const base = BASE_RULES.get(r.id);
  const set = (k: keyof RuleEdit, v: unknown) =>
    update((l) => {
      if (!base) return { ...l, addedRules: (l.addedRules ?? []).map((x) => (x.id === r.id ? { ...x, [k]: v } : x)) };
      const e: RuleEdit = { ...(l.rules?.[r.id] ?? {}) };
      if (JSON.stringify((base as Record<string, unknown>)[k] ?? false) === JSON.stringify(v)) delete (e as Record<string, unknown>)[k];
      else (e as Record<string, unknown>)[k] = v;
      const out = { ...(l.rules ?? {}) };
      if (Object.keys(e).length) out[r.id] = e;
      else delete out[r.id];
      return { ...l, rules: out };
    });
  return (
    <div className="lib-split">
      <aside className="lib-side">
        <button type="button" className="btn btn-small lib-add" onClick={add}>
          {one(T.addRule, lang)}
        </button>
        <ul className="lib-list" role="listbox" aria-label={one(T.rules, lang)}>
          {rules.map((x) => (
            <li key={x.id}>
              <button type="button" role="option" aria-selected={x.id === r.id} className={`lib-item${x.id === r.id ? " is-active" : ""}${isRuleHidden(x.id) ? " is-hidden" : ""}`} onClick={() => setSel(x.id)}>
                <code>{x.id}</code>
                <span>{one(x.scope, lang)}</span>
                {!BASE_RULES.has(x.id) ? <em>{one(T.added, lang)}</em> : lib.rules?.[x.id] && Object.keys(lib.rules[x.id]).some((k) => k !== "hidden") ? <em>{one(T.edited, lang)}</em> : null}
              </button>
            </li>
          ))}
        </ul>
      </aside>
      <section className="lib-form">
        <div className="lib-card">
          <div className="lib-card-head">
            <h2>
              <code>{r.id}</code> {one(r.scope, lang)}
            </h2>
            <div className="toolbar">
              {base && lib.rules?.[r.id] ? (
                <button type="button" className="btn btn-small btn-quiet" onClick={() => update((l) => ({ ...l, rules: withoutKey(l.rules ?? {}, r.id) }))}>
                  {one(T.restore, lang)}
                </button>
              ) : null}
              {!base ? (
                <button
                  type="button"
                  className="btn btn-small btn-quiet"
                  onClick={() => {
                    update((l) => ({ ...l, addedRules: (l.addedRules ?? []).filter((x) => x.id !== r.id) }));
                    setSel(RULES[0].id);
                  }}
                >
                  {one(T.removeRule, lang)}
                </button>
              ) : null}
            </div>
          </div>
          {base ? (
            <label className="lib-check lib-hide">
              <input type="checkbox" checked={isRuleHidden(r.id)} onChange={(e) => set("hidden", e.currentTarget.checked || undefined)} />
              <span>{one(T.hideRule, lang)}</span>
            </label>
          ) : null}
          <PairInput key={`${r.id}-scope`} label={T.scope} value={r.scope} base={base?.scope} onChange={(v) => set("scope", v)} lang={lang} />
          <PairInput key={`${r.id}-std`} label={T.standard} value={r.standard} base={base?.standard} rows={2} onChange={(v) => set("standard", v)} lang={lang} />
          <PairInput key={`${r.id}-status`} label={T.status} value={r.status} base={base?.status} rows={2} onChange={(v) => set("status", v)} lang={lang} />
          <PairInput key={`${r.id}-needs`} label={T.needs} value={r.needs} base={base?.needs} rows={3} onChange={(v) => set("needs", v)} lang={lang} />
          <PairInput key={`${r.id}-docs`} label={T.rdocs} value={r.docs} base={base?.docs} rows={2} onChange={(v) => set("docs", v)} lang={lang} />
          <PairInput key={`${r.id}-checked`} label={T.checked} value={r.checked} base={base?.checked} onChange={(v) => set("checked", v)} lang={lang} />
          <Field label={one(T.urls, lang)}>
            <textarea rows={3} value={r.urls.join("\n")} onChange={(e) => set("urls", e.currentTarget.value.split("\n").map((x) => x.trim()).filter(Boolean))} />
          </Field>
        </div>
      </section>
    </div>
  );
}

/* ---------------------------------------------------------------- recommendations */

/** Every part key a structure has: its parts, its insert (by kind) and its process materials. */
function partKeysOf(form: Form): { key: string; label: Pair; base: string[] }[] {
  const out = slotsOf(form).map((s) => ({ key: `${form}.${s.id}`, label: s.label, base: s.options }));
  if (["gift", "bookBox", "mailer", "drawer", "woodBox", "brocade"].includes(form))
    for (const k of INSERTS) out.push({ key: `${form}.insert.${k}`, label: { zh: `${T.insert.zh} · ${INSERT_LABELS[k].zh}`, en: `${T.insert.en}: ${INSERT_LABELS[k].en.toLowerCase()}` }, base: insertOptionsFor(form, k) });
  for (const [k, label, id] of [
    ["ink", P("印刷油墨", "Printing ink"), "M161"],
    ["film", P("覆膜", "Lamination film"), "M053"],
    ["glue", P("胶", "Adhesive"), form === "pouch" ? "M156" : "M157"],
  ] as const)
    out.push({ key: `${form}.process.${k}`, label: { zh: `${T.process.zh} · ${label.zh}`, en: `${T.process.en}: ${label.en.toLowerCase()}` }, base: [id] });
  return out;
}

function RecommendTab({ lib, update, lang }: { lib: Library; update: Update; lang: Lang }) {
  const set = (key: string, list: string[] | null) =>
    update((l) => {
      const rec = { ...(l.recommend ?? {}) };
      if (list && list.length) rec[key] = list;
      else delete rec[key];
      return { ...l, recommend: rec };
    });
  const options = libraryMaterials().filter((m) => !isHidden(m.id));
  return (
    <div className="lib-rec">
      <p className="muted">{one(T.recLead, lang)}</p>
      {FORMS.map((form) => {
        const keys = partKeysOf(form);
        const changed = keys.filter((k) => lib.recommend?.[k.key]).length;
        return (
          <details key={form} className="lib-recform" open={changed > 0 || undefined}>
            <summary>
              {one(FORM_LABELS[form], lang)}
              {changed ? <em className="lib-badge">{`${one(T.recOwn, lang)} ${changed}`}</em> : null}
            </summary>
            {keys.map((k) => {
              const own = lib.recommend?.[k.key];
              // inserts' own lists come from the insert kind; shown as stored or empty
              const list = own ?? k.base;
              return (
                <div key={k.key} className="lib-recrow">
                  <span className="lib-label">
                    {one(k.label, lang)}
                    {own ? <em className="lib-badge">{one(T.recOwn, lang)}</em> : null}
                  </span>
                  <ul className="lib-chips">
                    {list.map((id, i) => (
                      <li key={id} className={i === 0 ? "is-default" : undefined}>
                        <code>{id}</code> {(() => { const m = options.find((x) => x.id === id); return m ? one(m.name, lang) : ""; })()}
                        {i > 0 ? (
                          <button type="button" className="st-link" onClick={() => set(k.key, [id, ...list.filter((x) => x !== id)])}>
                            {one(T.recFirst, lang)}
                          </button>
                        ) : null}
                        {list.length > 1 ? (
                          <button type="button" className="st-link" aria-label={`${one(T.recDrop, lang)} ${id}`} onClick={() => set(k.key, list.filter((x) => x !== id))}>
                            {one(T.recDrop, lang)}
                          </button>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                  <div className="toolbar">
                    <select value="" aria-label={one(T.recAdd, lang)} onChange={(e) => e.currentTarget.value && set(k.key, [...list, e.currentTarget.value])}>
                      <option value="">{one(T.recAdd, lang)}</option>
                      {options
                        .filter((m) => !list.includes(m.id))
                        .map((m) => (
                          <option key={m.id} value={m.id}>
                            {`${m.id}  ${one(m.name, lang)}`}
                          </option>
                        ))}
                    </select>
                    {own ? (
                      <button type="button" className="btn btn-small btn-quiet" onClick={() => set(k.key, null)}>
                        {one(T.recReset, lang)}
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </details>
        );
      })}
    </div>
  );
}
