/**
 * The numbers the over-packaging checks use, from GB 23350-2021 (food and cosmetics, with its
 * amendments 1 and 2) and GB 45186-2024 (courier packaging). They are defaults: the material
 * library can change any of them (Library.limits), because the standards are amended and a few
 * values here come from official summaries rather than the standards' full text (each says which).
 * Pure; no imports beyond types.
 */
import type { Pair } from "../i18n";

/** A band of single-unit net content Q (g or mL) and its maximum void ratio (%). `upTo` null = above. */
export type VoidBand = { upTo: number | null; limit: number };
/**
 * A product kind with its necessary-space coefficient k (GB 23350 Appendix A) and any rules of its
 * own: a lower layer limit, a lower cost limit above a price, a package-to-contents mass limit.
 * k null means "enter the value from Appendix A".
 */
export type Kind = { id: string; label: Pair; k: number | null; layers?: number; costHigh?: { above: number; limit: number }; massRatio?: number; source: Pair };
export type DiagonalBand = { from: number; to: number; ratio: number };
export type TapeBand = { upTo: number; multiple: number };

export type Limits = {
  voidBands: VoidBand[];
  kinds: Kind[];
  /** layers allowed for food and cosmetics without a kind of their own */
  layers: number;
  /** packaging cost (all but the layer touching the contents) as % of the selling price */
  cost: number;
  courierLayers: { normal: number; fragile: number; fresh: number };
  /** courier box space diagonal ≤ ratio × the item's, by the item's diagonal (mm) */
  diagonal: DiagonalBand[];
  /** boxes with a space diagonal up to this (mm) are not held to the ratio */
  diagonalExempt: number;
  /** sealing tape length ≤ multiple × (L + W + H), by L + W + H (mm) */
  tape: TapeBand[];
  tapeWidth: number;
  /** fragile or high-value contents may use this many times the tape */
  tapeRelax: number;
};

const P = (zh: string, en: string): Pair => ({ zh, en });
const STD = P("GB 23350-2021 附录 A（经官方解读核对）", "GB 23350-2021 Appendix A (checked against official summaries)");
const AMD2 = P("GB 23350-2021 第 2 号修改单（茶叶）", "GB 23350-2021 Amendment No. 2 (tea)");
const AMD1 = P("GB 23350-2021 第 1 号修改单（月饼、粽子）", "GB 23350-2021 Amendment No. 1 (mooncakes, zongzi)");
const EXAMPLE = P("解读文章中的计算示例，请按附录 A 核对", "From a worked example in a published explainer; check against Appendix A");

export const DEFAULT_LIMITS: Limits = {
  voidBands: [
    { upTo: 1, limit: 85 },
    { upTo: 5, limit: 70 },
    { upTo: 15, limit: 60 },
    { upTo: 30, limit: 50 },
    { upTo: 50, limit: 40 },
    { upTo: null, limit: 30 },
  ],
  kinds: [
    { id: "tea", label: P("茶叶及相关制品", "Tea and tea products"), k: 13, layers: 3, costHigh: { above: 200, limit: 15 }, massRatio: 8, source: AMD2 },
    { id: "teaPressed", label: P("紧压茶", "Compressed tea"), k: 9, layers: 3, costHigh: { above: 200, limit: 15 }, massRatio: 8, source: AMD2 },
    { id: "teaFine", label: P("名优茶（太平猴魁、六安瓜片、安吉白茶、武夷岩茶、云南大叶种茶、单丛茶、毛峰、白毫银针、白牡丹、寿(贡)眉、陈皮）", "Named fine teas (Taiping Houkui, Lu'an Guapian, Anji white, Wuyi rock, Yunnan large-leaf, Dancong, Maofeng, Baihao Yinzhen, Bai Mudan, Shou/Gong Mei, aged tangerine peel)"), k: 20, layers: 3, costHigh: { above: 200, limit: 15 }, massRatio: 8, source: AMD2 },
    { id: "herbalTea", label: P("叶类和花类代用茶", "Leaf and flower herbal teas"), k: 60, layers: 3, costHigh: { above: 200, limit: 15 }, massRatio: 8, source: AMD2 },
    { id: "mooncake", label: P("月饼", "Mooncakes"), k: 7, layers: 3, costHigh: { above: 100, limit: 15 }, source: AMD1 },
    { id: "zongzi", label: P("粽子", "Zongzi"), k: 5, layers: 3, costHigh: { above: 100, limit: 15 }, source: AMD1 },
    { id: "grain", label: P("粮食及其加工品", "Grain and grain products"), k: null, layers: 3, source: STD },
    { id: "beverage", label: P("饮料", "Beverages"), k: 5, source: STD },
    { id: "solidBeverage", label: P("固体饮料", "Solid beverages"), k: 15, source: STD },
    { id: "baijiu", label: P("白酒", "Baijiu"), k: 13, source: EXAMPLE },
    { id: "toner", label: P("化妆品：护肤水", "Cosmetics: toner"), k: 9, source: EXAMPLE },
    { id: "lotion", label: P("化妆品：乳液", "Cosmetics: lotion"), k: 9, source: EXAMPLE },
    { id: "aerosol", label: P("化妆品：气雾剂（不含工具）", "Cosmetics: aerosol (no applicator)"), k: 5, source: EXAMPLE },
    { id: "other", label: P("其他（按附录 A 填写 k 值）", "Other (enter k from Appendix A)"), k: null, source: STD },
  ],
  layers: 4,
  cost: 20,
  courierLayers: { normal: 2, fragile: 3, fresh: 4 },
  diagonal: [
    { from: 80, to: 150, ratio: 2.5 },
    { from: 150, to: 500, ratio: 2 },
    { from: 500, to: 1500, ratio: 1.5 },
  ],
  diagonalExempt: 270,
  tape: [
    { upTo: 700, multiple: 3 },
    { upTo: 1000, multiple: 4 },
    { upTo: 3000, multiple: 5 },
  ],
  tapeWidth: 45,
  tapeRelax: 2,
};

/** Where the default numbers come from, for the editor and the checks' notes. */
export const LIMIT_SOURCES: Pair = P(
  "空隙率分档、层数、成本：GB 23350-2021 及第 1、2 号修改单（官方解读核对）；快递层数、箱体对角线、胶带：GB 45186-2024 的官方与媒体解读，各方对易碎品层数表述不一（3 层或 4 层），请以标准原文为准。",
  "Void-ratio bands, layers and cost: GB 23350-2021 with Amendments 1 and 2 (checked against official summaries). Courier layers, box diagonals and tape: official and press summaries of GB 45186-2024, which differ on fragile items (3 or 4 layers); the standard's text decides.",
);

const num = (v: unknown, min: number, max: number): number | undefined => (typeof v === "number" && Number.isFinite(v) && v >= min && v <= max ? v : undefined);
const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** Cleans limits from the library (anything missing or malformed keeps the default). */
export function normalizeLimits(v: unknown): Partial<Limits> | undefined {
  if (!v || typeof v !== "object" || Array.isArray(v)) return undefined;
  const o = v as Record<string, unknown>;
  const out: Partial<Limits> = {};
  if (Array.isArray(o.voidBands)) {
    const bands = o.voidBands
      .map((b) => (b && typeof b === "object" ? (b as Record<string, unknown>) : null))
      .filter((b): b is Record<string, unknown> => !!b)
      .map((b) => ({ upTo: b.upTo === null ? null : (num(b.upTo, 0, 1e6) ?? NaN), limit: num(b.limit, 0, 100) ?? NaN }))
      .filter((b) => (b.upTo === null || Number.isFinite(b.upTo)) && Number.isFinite(b.limit))
      .slice(0, 20);
    if (bands.length) out.voidBands = bands.sort((a, b) => (a.upTo ?? Infinity) - (b.upTo ?? Infinity));
  }
  if (Array.isArray(o.kinds)) {
    const kinds: Kind[] = [];
    for (const x of o.kinds.slice(0, 80)) {
      if (!x || typeof x !== "object") continue;
      const k = x as Record<string, unknown>;
      const id = typeof k.id === "string" && /^[a-zA-Z][a-zA-Z0-9]{0,23}$/.test(k.id) ? k.id : null;
      const l = k.label as Record<string, unknown> | undefined;
      const label = { zh: text(l?.zh, 120), en: text(l?.en, 160) };
      if (!id || !(label.zh || label.en) || kinds.some((y) => y.id === id)) continue;
      const s = k.source as Record<string, unknown> | undefined;
      const ch = k.costHigh as Record<string, unknown> | undefined;
      const kind: Kind = { id, label: { zh: label.zh || label.en, en: label.en || label.zh }, k: k.k === null ? null : (num(k.k, 0.1, 1000) ?? null), source: { zh: text(s?.zh, 200), en: text(s?.en, 200) } };
      const layers = num(k.layers, 1, 10);
      if (layers) kind.layers = Math.round(layers);
      const above = num(ch?.above, 0, 1e7);
      const limit = num(ch?.limit, 0, 100);
      if (above !== undefined && limit !== undefined) kind.costHigh = { above, limit };
      const mass = num(k.massRatio, 0.1, 1000);
      if (mass) kind.massRatio = mass;
      kinds.push(kind);
    }
    if (kinds.length) out.kinds = kinds;
  }
  for (const k of ["layers", "cost", "diagonalExempt", "tapeWidth", "tapeRelax"] as const) {
    const n = num(o[k], 0, 1e5);
    if (n !== undefined) out[k] = n;
  }
  if (o.courierLayers && typeof o.courierLayers === "object") {
    const c = o.courierLayers as Record<string, unknown>;
    const d = DEFAULT_LIMITS.courierLayers;
    out.courierLayers = { normal: num(c.normal, 1, 10) ?? d.normal, fragile: num(c.fragile, 1, 10) ?? d.fragile, fresh: num(c.fresh, 1, 10) ?? d.fresh };
  }
  if (Array.isArray(o.diagonal)) {
    const bands = o.diagonal
      .map((b) => b as Record<string, unknown>)
      .map((b) => ({ from: num(b?.from, 0, 1e5) ?? NaN, to: num(b?.to, 0, 1e5) ?? NaN, ratio: num(b?.ratio, 0.1, 100) ?? NaN }))
      .filter((b) => [b.from, b.to, b.ratio].every(Number.isFinite) && b.to > b.from)
      .slice(0, 12);
    if (bands.length) out.diagonal = bands;
  }
  if (Array.isArray(o.tape)) {
    const bands = o.tape
      .map((b) => b as Record<string, unknown>)
      .map((b) => ({ upTo: num(b?.upTo, 0, 1e6) ?? NaN, multiple: num(b?.multiple, 0.1, 100) ?? NaN }))
      .filter((b) => Number.isFinite(b.upTo) && Number.isFinite(b.multiple))
      .slice(0, 12);
    if (bands.length) out.tape = bands.sort((a, b) => a.upTo - b.upTo);
  }
  return Object.keys(out).length ? out : undefined;
}

/** The limits in force: the defaults with the library's changes. */
export const mergeLimits = (own?: Partial<Limits>): Limits => ({ ...DEFAULT_LIMITS, ...(own ?? {}) });
