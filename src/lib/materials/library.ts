/**
 * The editable material library: the principal's list (catalog.ts) as the base, with the edits
 * made in the app on top. Every field of every material and rule can be changed, materials and
 * rules added or hidden, and each part's recommended materials and default set. The base is never
 * changed: removing an edit restores the list's own value.
 *
 * Stored as one JSON document (the database in the app, the browser in the preview). Client-safe
 * and pure.
 */
import type { Pair } from "../i18n";
import { DOCS, FAMILIES, MATERIALS, RULES, type FamilyId, type Material, type Rule } from "./catalog";
import { normalizeLimits, type Limits } from "../compliance/limits";

/** Changes to one material; `hidden` takes it out of every choice (picks fall back to defaults). */
export type MaterialEdit = Partial<Omit<Material, "id" | "custom">> & { hidden?: boolean };
export type RuleEdit = Partial<Omit<Rule, "id">> & { hidden?: boolean };

export type Library = {
  /** edits to materials, by number (list materials and added ones alike) */
  materials?: Record<string, MaterialEdit>;
  /** materials added in the app (numbered U001…) */
  added?: Material[];
  rules?: Record<string, RuleEdit>;
  /** rules added in the app (numbered X01…) */
  addedRules?: Rule[];
  /**
   * Recommended materials by part, the first being the default: "gift.wrap", "gift.insert.velvet",
   * "gift.process.film"…
   */
  recommend?: Record<string, string[]>;
  /** the over-packaging checks' numbers, where they differ from the standards' defaults */
  limits?: Partial<Limits>;
  updatedAt?: string;
};

export const EMPTY_LIBRARY: Library = {};

/** Numbers for materials and rules added in the app. */
export const CUSTOM_MATERIAL_ID = /^U\d{3}$/;
export const CUSTOM_RULE_ID = /^X\d{2}$/;
/** Any material number a pick may hold. */
export const ANY_MATERIAL_ID = /^[MU]\d{3}$/;

const FAMILY_IDS = new Set<string>(FAMILIES.map((f) => f.id));
const BASE_MATERIAL_IDS = new Set(MATERIALS.map((m) => m.id));
const BASE_RULE_IDS = new Set(RULES.map((r) => r.id));
const RULE_ID = /^([A-Z]\d{2})$/;

const text = (v: unknown, max: number): string | undefined => (typeof v === "string" ? v.replace(/[\u0000-\u0008\u000b-\u001f]/g, " ").trim().slice(0, max) : undefined);
function pair(v: unknown, max: number): Pair | undefined {
  if (!v || typeof v !== "object") return undefined;
  const o = v as Record<string, unknown>;
  const zh = text(o.zh, max) ?? "";
  const en = text(o.en, max) ?? "";
  // kept as typed: one side may be empty while it is being written
  return zh || en ? { zh, en } : undefined;
}
const ruleIds = (v: unknown): string[] | undefined => (Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === "string" && RULE_ID.test(x)))].slice(0, 24) : undefined);
const url = (v: unknown) => {
  const t = text(v, 400);
  return t && /^https?:\/\/[^\s]+$/.test(t) ? t : t === "" ? "" : undefined;
};
const hex = (v: unknown) => (typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v) ? v.toUpperCase() : v === "" ? "" : undefined);

const PAIR_FIELDS = [
  ["name", 80],
  ["parts", 120],
  ["use", 200],
  ["notes", 400],
  ["boundary", 400],
  ["docsText", 400],
] as const;

/** One material's edits, cleaned. */
function materialEdit(v: unknown): MaterialEdit | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  const o = v as Record<string, unknown>;
  const e: MaterialEdit = {};
  for (const [k, max] of PAIR_FIELDS) {
    const p = pair(o[k], max);
    if (p) e[k] = p;
  }
  const trade = text(o.trade, 200);
  if (trade !== undefined) e.trade = trade;
  if (typeof o.family === "string" && FAMILY_IDS.has(o.family)) e.family = o.family as FamilyId;
  const food = ruleIds(o.food);
  if (food) e.food = food;
  const always = ruleIds(o.always);
  if (always) e.always = always;
  const special = ruleIds(o.special);
  if (special) e.special = special;
  for (const k of ["courier", "bag", "g02", "noFood", "noCosmetics"] as const) if (typeof o[k] === "boolean") (e as Record<string, unknown>)[k] = o[k];
  if (typeof o.hidden === "boolean") e.hidden = o.hidden;
  // cost and footprint: a number, or "" to clear the field
  for (const [k, max] of [
    ["gsm", 20000],
    ["pricePerM2", 1e6],
    ["pricePerKg", 1e6],
    ["pricePerPiece", 1e6],
    ["co2PerKg", 1000],
  ] as const) {
    const n = o[k];
    if (typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= max) e[k] = n;
  }
  if (o.recyclable === "yes" || o.recyclable === "partly" || o.recyclable === "no") e.recyclable = o.recyclable;
  if (typeof o.docs === "number" && Number.isInteger(o.docs) && o.docs >= 0 && o.docs < DOCS.length) e.docs = o.docs;
  const u = url(o.url);
  if (u !== undefined) e.url = u;
  const look = hex(o.look);
  if (look !== undefined) e.look = look;
  return Object.keys(e).length ? e : null;
}

function ruleEdit(v: unknown): RuleEdit | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  const o = v as Record<string, unknown>;
  const e: RuleEdit = {};
  for (const [k, max] of [
    ["scope", 200],
    ["standard", 300],
    ["status", 300],
    ["needs", 600],
    ["docs", 400],
    ["checked", 300],
  ] as const) {
    const p = pair(o[k], max);
    if (p) e[k] = p;
  }
  if (Array.isArray(o.urls)) e.urls = o.urls.map((x) => url(x)).filter((x): x is string => !!x).slice(0, 6);
  if (typeof o.hidden === "boolean") e.hidden = o.hidden;
  return Object.keys(e).length ? e : null;
}

/** A material added in the app, complete (missing text is left empty). */
function addedMaterial(v: unknown): Material | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  if (typeof o.id !== "string" || !CUSTOM_MATERIAL_ID.test(o.id)) return null;
  const e = materialEdit(o) ?? {};
  // a name cleared while editing keeps the number as the name
  const name = e.name ?? { zh: o.id, en: o.id };
  const blank = { zh: "", en: "" };
  return {
    id: o.id,
    family: e.family ?? "other",
    name,
    trade: e.trade ?? "",
    parts: e.parts ?? blank,
    use: e.use ?? blank,
    notes: e.notes ?? blank,
    boundary: e.boundary ?? blank,
    path: 0,
    food: e.food ?? ["F01"],
    docs: e.docs ?? 0,
    source: 0,
    custom: true,
    ...(e.always?.length ? { always: e.always } : {}),
    ...(e.special?.length ? { special: e.special } : {}),
    ...(e.courier ? { courier: true as const } : {}),
    ...(e.bag ? { bag: true as const } : {}),
    ...(e.g02 ? { g02: true as const } : {}),
    ...(e.noFood ? { noFood: true as const } : {}),
    ...(e.noCosmetics ? { noCosmetics: true as const } : {}),
    ...(e.url ? { url: e.url } : {}),
    ...(e.look ? { look: e.look } : {}),
    ...(e.docsText ? { docsText: e.docsText } : {}),
  };
}

function addedRule(v: unknown): Rule | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  if (typeof o.id !== "string" || !CUSTOM_RULE_ID.test(o.id)) return null;
  const e = ruleEdit(o) ?? {};
  if (!e.scope) e.scope = { zh: o.id, en: o.id };
  const blank = { zh: "", en: "" };
  return { id: o.id, scope: e.scope, standard: e.standard ?? blank, status: e.status ?? blank, needs: e.needs ?? blank, docs: e.docs ?? blank, checked: e.checked ?? blank, urls: e.urls ?? [] };
}

/** Accepts anything (stored JSON, a request body, an imported file) and returns a valid library. */
export function normalizeLibrary(v: unknown): Library {
  let o: Record<string, unknown> = {};
  if (typeof v === "string") {
    try {
      const parsed = JSON.parse(v);
      if (parsed && typeof parsed === "object") o = parsed;
    } catch {
      return {};
    }
  } else if (v && typeof v === "object") o = v as Record<string, unknown>;
  const lib: Library = {};
  const added = Array.isArray(o.added) ? o.added.map(addedMaterial).filter((x): x is Material => !!x).slice(0, 300) : [];
  const ids = new Set([...BASE_MATERIAL_IDS, ...added.map((m) => m.id)]);
  if (added.length) lib.added = [...new Map(added.map((m) => [m.id, m])).values()];
  if (o.materials && typeof o.materials === "object") {
    const edits: Record<string, MaterialEdit> = {};
    for (const [id, e] of Object.entries(o.materials as Record<string, unknown>)) {
      if (!ids.has(id)) continue;
      const c = materialEdit(e);
      if (!c) continue;
      // added materials carry their own fields: only whether they are hidden is kept here
      if (!BASE_MATERIAL_IDS.has(id)) {
        if (c.hidden) edits[id] = { hidden: true };
        continue;
      }
      edits[id] = c;
    }
    if (Object.keys(edits).length) lib.materials = edits;
  }
  const addedRules = Array.isArray(o.addedRules) ? o.addedRules.map(addedRule).filter((x): x is Rule => !!x).slice(0, 60) : [];
  if (addedRules.length) lib.addedRules = [...new Map(addedRules.map((r) => [r.id, r])).values()];
  if (o.rules && typeof o.rules === "object") {
    const edits: Record<string, RuleEdit> = {};
    for (const [id, e] of Object.entries(o.rules as Record<string, unknown>)) {
      if (!BASE_RULE_IDS.has(id)) continue;
      const c = ruleEdit(e);
      if (c) edits[id] = c;
    }
    if (Object.keys(edits).length) lib.rules = edits;
  }
  if (o.recommend && typeof o.recommend === "object") {
    const rec: Record<string, string[]> = {};
    for (const [k, list] of Object.entries(o.recommend as Record<string, unknown>).slice(0, 400)) {
      if (!/^[a-zA-Z]+(\.[a-zA-Z]+){1,2}$/.test(k) || !Array.isArray(list)) continue;
      const clean = [...new Set(list.filter((x): x is string => typeof x === "string" && ids.has(x)))].slice(0, 40);
      if (clean.length) rec[k] = clean;
    }
    if (Object.keys(rec).length) lib.recommend = rec;
  }
  const limits = normalizeLimits(o.limits);
  if (limits) lib.limits = limits;
  const at = text(o.updatedAt, 40);
  if (at) lib.updatedAt = at;
  return lib;
}

/** The effective materials and rules: the list with the edits on top, added ones after. */
export function applyLibrary(lib: Library): { materials: Material[]; hidden: Set<string>; rules: Rule[]; hiddenRules: Set<string> } {
  const hidden = new Set<string>();
  const merge = (m: Material): Material => {
    const e = lib.materials?.[m.id];
    if (!e) return m;
    const { hidden: h, ...rest } = e;
    if (h) hidden.add(m.id);
    const out: Material = { ...m, ...rest };
    // a cleared optional field removes it
    for (const k of ["url", "look"] as const) if (out[k] === "") delete out[k];
    for (const k of ["courier", "bag", "g02", "noFood", "noCosmetics"] as const) if ((out as Record<string, unknown>)[k] === false) delete (out as Record<string, unknown>)[k];
    return out;
  };
  for (const m of lib.added ?? []) if (lib.materials?.[m.id]?.hidden) hidden.add(m.id);
  const materials = [...MATERIALS.map(merge), ...(lib.added ?? [])];
  const hiddenRules = new Set<string>();
  const rules = [
    ...RULES.map((r) => {
      const e = lib.rules?.[r.id];
      if (!e) return r;
      const { hidden: h, ...rest } = e;
      if (h) hiddenRules.add(r.id);
      return { ...r, ...rest };
    }),
    ...(lib.addedRules ?? []),
  ];
  return { materials, hidden, rules, hiddenRules };
}

/** The next free number for an added material or rule. */
export function nextMaterialId(lib: Library): string {
  const used = new Set((lib.added ?? []).map((m) => m.id));
  for (let i = 1; i < 1000; i++) {
    const id = `U${String(i).padStart(3, "0")}`;
    if (!used.has(id)) return id;
  }
  return "U999";
}
export function nextRuleId(lib: Library): string {
  const used = new Set((lib.addedRules ?? []).map((r) => r.id));
  for (let i = 1; i < 100; i++) {
    const id = `X${String(i).padStart(2, "0")}`;
    if (!used.has(id)) return id;
  }
  return "X99";
}

/** How many changes the library holds (for the editor's summary). */
export function libraryStats(lib: Library) {
  const edits = Object.values(lib.materials ?? {});
  return {
    edited: edits.filter((e) => Object.keys(e).some((k) => k !== "hidden")).length,
    hidden: edits.filter((e) => e.hidden).length,
    added: lib.added?.length ?? 0,
    rulesEdited: Object.keys(lib.rules ?? {}).length,
    rulesAdded: lib.addedRules?.length ?? 0,
    recommend: Object.keys(lib.recommend ?? {}).length,
    limits: Object.keys(lib.limits ?? {}).length,
  };
}

/** What changed between two libraries, by material, rule, part and limit. */
export type LibraryDiff = { materials: string[]; rules: string[]; recommend: string[]; limits: boolean; count: number };

export function diffLibraries(a: Library, b: Library): LibraryDiff {
  const same = (x: unknown, y: unknown) => JSON.stringify(x ?? null) === JSON.stringify(y ?? null);
  const keys = (x?: Record<string, unknown>, y?: Record<string, unknown>) => [...new Set([...Object.keys(x ?? {}), ...Object.keys(y ?? {})])];
  const addedA = new Map((a.added ?? []).map((m) => [m.id, m]));
  const addedB = new Map((b.added ?? []).map((m) => [m.id, m]));
  const materials = [...new Set([...keys(a.materials, b.materials).filter((id) => !same(a.materials?.[id], b.materials?.[id])), ...[...new Set([...addedA.keys(), ...addedB.keys()])].filter((id) => !same(addedA.get(id), addedB.get(id)))])].sort();
  const rulesA = new Map((a.addedRules ?? []).map((r) => [r.id, r]));
  const rulesB = new Map((b.addedRules ?? []).map((r) => [r.id, r]));
  const rules = [...new Set([...keys(a.rules, b.rules).filter((id) => !same(a.rules?.[id], b.rules?.[id])), ...[...new Set([...rulesA.keys(), ...rulesB.keys()])].filter((id) => !same(rulesA.get(id), rulesB.get(id)))])].sort();
  const recommend = keys(a.recommend, b.recommend).filter((k) => !same(a.recommend?.[k], b.recommend?.[k])).sort();
  const limits = !same(a.limits, b.limits);
  return { materials, rules, recommend, limits, count: materials.length + rules.length + recommend.length + (limits ? 1 : 0) };
}

/** A one-line account of a diff: "材料 M019、U001；规则 F05；推荐 gift.wrap；核算限值". */
export function diffText(d: LibraryDiff, lang: "zh" | "en"): string {
  const cut = (ids: string[]) => (ids.length > 6 ? `${ids.slice(0, 6).join(lang === "zh" ? "、" : ", ")}${lang === "zh" ? ` 等 ${ids.length} 项` : ` and ${ids.length - 6} more`}` : ids.join(lang === "zh" ? "、" : ", "));
  const parts: string[] = [];
  if (d.materials.length) parts.push(lang === "zh" ? `材料 ${cut(d.materials)}` : `materials ${cut(d.materials)}`);
  if (d.rules.length) parts.push(lang === "zh" ? `规则 ${cut(d.rules)}` : `rules ${cut(d.rules)}`);
  if (d.recommend.length) parts.push(lang === "zh" ? `部件推荐 ${cut(d.recommend)}` : `part recommendations ${cut(d.recommend)}`);
  if (d.limits) parts.push(lang === "zh" ? "核算限值" : "check limits");
  return parts.length ? parts.join(lang === "zh" ? "；" : "; ") : lang === "zh" ? "无变化" : "no change";
}

/** One saved version of the library, kept so changes can be traced and undone. */
export type HistoryEntry = { at: string; by: string; summary: { zh: string; en: string }; library: Library };

/** The version before the first recorded change (stamped just before it). */
export function baseline(before: Library, firstAt: string): HistoryEntry {
  const at = new Date(new Date(firstAt).getTime() - 1).toISOString();
  return { at, by: "", summary: { zh: "首次修改前的材料库", en: "The library before the first change" }, library: before };
}
