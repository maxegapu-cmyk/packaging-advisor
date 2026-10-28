/**
 * Supplier documents for a project: declarations of compliance, test reports, certificates and the
 * like, each tied to the parts and materials it covers and, optionally, the rules it answers, with
 * its report number and validity. Coverage says, for every part and rule that applies, which kinds
 * of document are still missing, expired or about to expire. Pure and client-safe.
 */
import type { Pair } from "../i18n";
import type { Applied, Use } from "../materials";

export const DOC_TYPES = ["declaration", "test", "certificate", "compatibility", "spec", "licence", "other"] as const;
export type DocType = (typeof DOC_TYPES)[number];
export const DOC_TYPE_LABELS: Record<DocType, Pair> = {
  declaration: { zh: "符合性声明", en: "Declaration of compliance" },
  test: { zh: "检测报告（成品 / 迁移 / 限量）", en: "Test report (finished product, migration, limits)" },
  certificate: { zh: "合格证明 / 执行标准", en: "Certificate of conformity / standard" },
  compatibility: { zh: "相容性 / 稳定性资料", en: "Compatibility / stability data" },
  spec: { zh: "材质规格 / 成分表", en: "Material spec / composition" },
  licence: { zh: "生产许可证", en: "Production licence" },
  other: { zh: "其他", en: "Other" },
};

export type DocMeta = {
  type: DocType;
  title: string;
  issuer?: string;
  number?: string;
  /** YYYY-MM-DD */
  issued?: string;
  expires?: string;
  /** what the report covers (sample, structure, conditions of use) */
  covers?: string;
  /** part keys ("wrap", "inner.body") and material numbers it covers */
  parts: string[];
  materials: string[];
  /** rules it answers; empty = any rule its type serves */
  rules: string[];
};
export type SupplierDoc = DocMeta & { id: string; file?: string; mime?: string; url?: string; addedAt?: string };

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const text = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/[\u0000-\u001f]/g, " ").trim().slice(0, max) : "");
const list = (v: unknown, re: RegExp, max: number) => (Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === "string" && re.test(x)))].slice(0, max) : []);

export function normalizeDocMeta(v: unknown): DocMeta | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const type = (DOC_TYPES as readonly string[]).includes(o.type as string) ? (o.type as DocType) : "other";
  const title = text(o.title, 120);
  if (!title) return null;
  const m: DocMeta = { type, title, parts: list(o.parts, /^(inner\.)?((process|off|extra)\.)?[a-zA-Z0-9]{1,24}$/, 40), materials: list(o.materials, /^[MU]\d{3}$/, 40), rules: list(o.rules, /^[A-Z]\d{2}$/, 30) };
  for (const k of ["issuer", "number", "covers"] as const) {
    const t = text(o[k], k === "covers" ? 300 : 80);
    if (t) m[k] = t;
  }
  for (const k of ["issued", "expires"] as const) if (typeof o[k] === "string" && DATE.test(o[k] as string)) m[k] = o[k] as string;
  return m;
}

/** What each kind of rule asks for, by document type (any one type of each inner list will do). */
export function needsFor(ruleId: string): DocType[][] {
  if (ruleId.startsWith("F")) return [["declaration"], ["test"]];
  if (ruleId === "C01") return [["compatibility"], ["certificate", "spec"]];
  if (ruleId === "G03") return [["test"]];
  if (ruleId === "P01") return [["spec"]];
  if (ruleId === "G01") return [["certificate", "spec"]];
  // G02/G04 are worked out by the app's own checks; D01/M01 are outside this tool
  return [];
}

export type DocStatus = "valid" | "expiring" | "expired";
export const today = () => new Date().toISOString().slice(0, 10);
export function statusOf(d: DocMeta, on = today()): DocStatus {
  if (!d.expires) return "valid";
  if (d.expires < on) return "expired";
  const soon = new Date(on);
  soon.setDate(soon.getDate() + 30);
  return d.expires <= soon.toISOString().slice(0, 10) ? "expiring" : "valid";
}

export type Requirement = {
  key: string;
  label: Pair;
  materialId: string;
  rule: string;
  /** whether the part touches the contents (its gaps matter most) */
  critical: boolean;
  /** each group still unmet, with the documents that would have met it but have expired */
  missing: DocType[][];
  docs: SupplierDoc[];
  expired: SupplierDoc[];
  expiring: SupplierDoc[];
};

const covers = (d: SupplierDoc, u: Use, rule: string) => (d.parts.includes(u.key) || d.materials.includes(u.id)) && (!d.rules.length || d.rules.includes(rule));

/** For every part and rule that applies, what the documents cover and what is still missing. */
export function coverage(uses: Use[], applied: Applied[], docs: SupplierDoc[], on = today()): Requirement[] {
  const out: Requirement[] = [];
  for (const a of applied) {
    const groups = needsFor(a.rule.id);
    if (!groups.length) continue;
    for (const key of a.by) {
      const u = uses.find((x) => x.key === key);
      if (!u || u.removed) continue;
      const mine = docs.filter((d) => covers(d, u, a.rule.id));
      const live = mine.filter((d) => statusOf(d, on) !== "expired");
      const missing = groups.filter((g) => !live.some((d) => g.includes(d.type)));
      out.push({ key, label: u.label, materialId: u.id, rule: a.rule.id, critical: !!u.touches, missing, docs: mine, expired: mine.filter((d) => statusOf(d, on) === "expired"), expiring: mine.filter((d) => statusOf(d, on) === "expiring") });
    }
  }
  return out;
}

/** A coverage summary: how many requirements are met, and the gaps by severity. */
export function coverageSummary(reqs: Requirement[]) {
  const met = reqs.filter((r) => !r.missing.length);
  return {
    total: reqs.length,
    met: met.length,
    criticalGaps: reqs.filter((r) => r.critical && r.missing.length),
    otherGaps: reqs.filter((r) => !r.critical && r.missing.length),
    expired: reqs.filter((r) => r.expired.length),
    expiring: reqs.filter((r) => r.expiring.length),
  };
}
