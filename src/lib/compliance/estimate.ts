/**
 * Cost, weight and footprint estimates for a package, from what the app knows: each part's area
 * (from the print layout or the structure's geometry), its grammage, and the prices, recyclability
 * and carbon factors set in the material library. The seller's own figures for a part (cost or
 * mass per package) always win. Parts with nothing to go on are counted as unknown, never guessed.
 *
 * Pure and client-safe.
 */
import type { Pair } from "../i18n";
import { comboLayout, isRound, outerSize, type PackSpec } from "../pack";
import { printLayout, pieceArea } from "../print/layout";
import { innerSpecOf, usesOf, type Use } from "../materials";
import { DEFAULT_QTY, quoteAt } from "../spec/quote";
import type { FamilyId, Material } from "../materials/catalog";

export type Recyclable = "yes" | "partly" | "no";

/** Recyclability by family where the library sets none: a general judgement, editable per material. */
const FAMILY_RECYCLE: Record<FamilyId, Recyclable | null> = {
  paper: "yes",
  paperSpecial: "partly",
  plastic: "partly",
  laminate: "no",
  metal: "yes",
  glassCeramic: "yes",
  wood: "partly",
  textile: "no",
  cushion: "partly",
  consumable: null,
  other: "no",
};
const NOT_RECYCLED = new Set(["M108", "M109"]); // ceramics don't go with glass

export function recyclableOf(m: Material): Recyclable | null {
  if (m.recyclable) return m.recyclable;
  if (NOT_RECYCLED.has(m.id)) return "no";
  return FAMILY_RECYCLE[m.family];
}
export const RECYCLE_LABELS: Record<Recyclable, Pair> = {
  yes: { zh: "可回收", en: "Recyclable" },
  partly: { zh: "视当地回收条件", en: "Depends on local collection" },
  no: { zh: "难回收", en: "Hard to recycle" },
};

/** Area per package (m²) of each printed sheet of one pack, by its id prefix. */
function sheetArea(spec: PackSpec, inner: boolean): number {
  const lay = printLayout(spec);
  let a = 0;
  for (const s of lay.sheets) {
    if (s.id.startsWith("inner-") !== inner) continue;
    for (const p of s.pieces) a += pieceArea(p) / 1e6;
  }
  // a combination's products: the layout counts one, the pack holds `count`
  return inner ? a * (spec.inner?.count ?? 1) : a;
}

/** The area (m²) one part of the package takes, where the structure tells it; null if it doesn't. */
export function partArea(spec: PackSpec, key: string): number | null {
  const inner = key.startsWith("inner.");
  const k = inner ? key.slice(6) : key;
  const own = inner ? innerSpecOf(spec) : spec;
  if (!own) return null;
  const n = inner ? (spec.inner?.count ?? 1) : 1;
  const o = inner ? { w: own.w, h: own.h, d: isRound(own.form) ? own.w : own.d } : outerSize(spec);
  const surface = (2 * (o.w * o.h + o.w * o.d + o.h * o.d)) / 1e6;
  const cyl = isRound(own.form) ? ((Math.PI * o.w * o.h + (Math.PI * o.w * o.w) / 2) / 1e6) : 0;
  const sheet = sheetArea(spec, inner);
  switch (own.form) {
    case "carton":
    case "mailer":
    case "bag":
      if (k === "body") return sheet;
      if (k === "base") return (o.w * o.d) / 1e6;
      break;
    case "gift":
    case "bookBox":
    case "drawer":
      if (k === "wrap") return sheet;
      if (k === "core") return surface * 1.3; // lid and base walls overlap, plus the tray
      break;
    case "brocade":
      if (k === "cover") return surface * 1.15;
      if (k === "core") return surface;
      if (k === "slip") return sheet;
      break;
    case "paperTube":
      if (k === "wrap") return sheet;
      if (k === "body" || k === "liner") return cyl;
      break;
    case "pouch":
      if (k === "film") return sheet;
      break;
    case "tin":
    case "can":
      if (k === "body") return cyl * n;
      break;
    case "bottle":
    case "jar":
    case "glassBottle":
      if (k === "label") return sheet;
      break;
    case "blister":
      if (k === "card") return sheet;
      if (k === "blister") return (o.w * o.h) / 2e6;
      break;
    case "tube":
      if (k === "body") return cyl * n;
      break;
  }
  if (k === "insert") {
    const lay = comboLayout(spec);
    return lay ? (lay.outer.w * lay.outer.d) / 1e6 : (o.w * o.d) / 1e6;
  }
  return null;
}

export type EstimateRow = {
  key: string;
  label: Pair;
  id: string;
  m: Material;
  /** m² per package, when the structure tells it */
  area: number | null;
  gsm?: number;
  /** g per package; null = unknown */
  mass: number | null;
  massFrom: "seller" | "estimate" | null;
  /** yuan per package; null = unknown */
  cost: number | null;
  costFrom: "seller" | "piece" | "area" | "weight" | null;
  recyclable: Recyclable | null;
  co2: number | null;
  /** the layer touching the contents (left out of GB 23350's cost share) */
  direct: boolean;
};

export type Estimate = {
  rows: EstimateRow[];
  /** sums over the rows whose figure is known */
  mass: number;
  massUnknown: number;
  cost: number;
  costUnknown: number;
  /** cost of every layer except the one touching the contents (GB 23350's cost share) */
  outerCost: number;
  outerCostComplete: boolean;
  co2: number;
  co2Known: number;
  /** share of the known mass by recyclability, and the largest single family's share */
  recyclableShare: number;
  partlyShare: number;
  monoShare: number;
  monoFamily: FamilyId | null;
};

export function estimate(spec: PackSpec, category: string): Estimate {
  const rows: EstimateRow[] = [];
  const uses = usesOf(spec, category);
  // a pack on its own that touches the contents is itself the first layer, its print and glue too
  const packTouches = !spec.inner && uses.some((x) => x.kind === "part" && x.contact === "direct");
  const firstLayer = (u: Use) => u.contact === "direct" || (spec.inner ? u.inner : packTouches && (u.kind === "part" || !!u.process));
  for (const u of uses) {
    if (u.removed) continue;
    const area = u.process ? null : partArea(spec, u.key);
    const gsm = u.gsm;
    const massEst = area !== null && gsm ? area * gsm : null;
    const mass = u.choice.mass ?? massEst;
    const m = u.m;
    let cost: number | null = null;
    let costFrom: EstimateRow["costFrom"] = null;
    if (u.choice.unitCost !== undefined) [cost, costFrom] = [u.choice.unitCost, "seller"];
    else if (m.pricePerPiece !== undefined) [cost, costFrom] = [m.pricePerPiece * (u.key.startsWith("inner.") ? (spec.inner?.count ?? 1) : 1), "piece"];
    else if (m.pricePerM2 !== undefined && area !== null) [cost, costFrom] = [m.pricePerM2 * area, "area"];
    else if (m.pricePerKg !== undefined && mass !== null) [cost, costFrom] = [(m.pricePerKg * mass) / 1000, "weight"];
    rows.push({
      key: u.key,
      label: u.label,
      id: u.id,
      m,
      area,
      gsm,
      mass,
      massFrom: u.choice.mass !== undefined ? "seller" : massEst !== null ? "estimate" : null,
      cost,
      costFrom,
      recyclable: recyclableOf(m),
      co2: mass !== null && m.co2PerKg !== undefined ? (mass / 1000) * m.co2PerKg : null,
      direct: firstLayer(u),
    });
  }
  const known = rows.filter((r) => r.mass !== null);
  const mass = known.reduce((s, r) => s + (r.mass ?? 0), 0);
  const share = (f: (r: EstimateRow) => boolean) => (mass ? known.filter(f).reduce((s, r) => s + (r.mass ?? 0), 0) / mass : 0);
  const byFamily = new Map<FamilyId, number>();
  for (const r of known) byFamily.set(r.m.family, (byFamily.get(r.m.family) ?? 0) + (r.mass ?? 0));
  const top = [...byFamily.entries()].sort((a, b) => b[1] - a[1])[0];
  const outer = rows.filter((r) => !r.direct);
  return {
    rows,
    mass,
    massUnknown: rows.length - known.length,
    cost: rows.reduce((s, r) => s + (r.cost ?? 0), 0),
    costUnknown: rows.filter((r) => r.cost === null).length,
    outerCost: outer.reduce((s, r) => s + (r.cost ?? 0), 0),
    outerCostComplete: outer.every((r) => r.cost !== null),
    co2: rows.reduce((s, r) => s + (r.co2 ?? 0), 0),
    co2Known: rows.filter((r) => r.co2 !== null).length,
    recyclableShare: share((r) => r.recyclable === "yes"),
    partlyShare: share((r) => r.recyclable === "partly"),
    monoShare: top && mass ? top[1] / mass : 0,
    monoFamily: top?.[0] ?? null,
  };
}

/**
 * The packaging cost GB 23350 counts (every layer but the one touching the contents), per pack,
 * from the quote at the order's first quantity of 3,000 or more (else its largest): the share of
 * the quoted price the outer layers make up, with VAT as the seller pays it.
 */
export function outerCost(spec: PackSpec, category: string): { cost: number; qty: number } | null {
  const qtys = spec.order?.qty?.length ? spec.order.qty : DEFAULT_QTY;
  const qty = qtys.find((q) => q >= 3000) ?? qtys[qtys.length - 1];
  const q = quoteAt(spec, category, qty);
  const uses = usesOf(spec, category);
  const packTouches = !spec.inner && uses.some((x) => x.kind === "part" && x.contact === "direct");
  // a pack on its own that touches the contents is itself the first layer: only a shipper is outer
  const isFirst = (key: string) => (spec.inner ? key.startsWith("inner.") : packTouches ? key !== "shipper" && key !== "job" : false);
  const all = q.comps.reduce((a, c) => a + c.total, 0);
  if (!all) return null;
  const outer = q.comps.filter((c) => !isFirst(c.comp.key)).reduce((a, c) => a + c.total, 0);
  return { cost: Math.round(((outer / all) * q.unit) * 100) / 100, qty };
}
