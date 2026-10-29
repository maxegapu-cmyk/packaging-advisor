/**
 * The price book as edited for a deployment: changes to the stocks' and rates' reference prices
 * (typically from your own suppliers' quotes), stocks you add, and the paper prices corrugated
 * boards are worked out from. Kept inside the material library (`Library.prices`), so it is saved,
 * versioned, exported, and frozen with a design at sign-off just as the library is.
 * Client-safe, no imports from the library (it is imported by it).
 */
import type { Pair } from "../i18n";
import { BASE_RATE_IDS } from "./rates";
import { BASE_STOCK_IDS, FLUTE_PAPERS, type Basis, type Stock, type StockKind } from "./stocks";

export type StockEdit = { price?: number; low?: number; high?: number; moq?: number; tooling?: number; setup?: number; supplier?: string; asOf?: string; note?: string; hidden?: boolean };
export type RateEdit = { value?: number; low?: number; high?: number; supplier?: string; asOf?: string; note?: string };

export type PriceBook = {
  stocks?: Record<string, StockEdit>;
  /** stocks you add (ids C001…) */
  added?: Stock[];
  rates?: Record<string, RateEdit>;
  /** tonne prices of the corrugated papers, net of VAT */
  papers?: Partial<Record<keyof typeof FLUTE_PAPERS, number>>;
};

export const CUSTOM_STOCK_ID = /^C\d{3}$/;
const KINDS: StockKind[] = ["board", "paper", "special", "greyboard", "tube", "flute", "laminate", "label", "fabric", "container", "insert", "trim"];
const BASES: Basis[] = ["ton", "m2", "piece", "litre"];

const num = (v: unknown, max = 1e7): number | undefined => (typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= max ? Math.round(v * 10000) / 10000 : undefined);
const txt = (v: unknown, n: number): string | undefined => (typeof v === "string" && v.trim() ? v.trim().slice(0, n) : undefined);
const pair = (v: unknown, n = 200): Pair | undefined => {
  if (!v || typeof v !== "object") return undefined;
  const o = v as Record<string, unknown>;
  const zh = txt(o.zh, n) ?? "";
  const en = txt(o.en, n) ?? "";
  return zh || en ? { zh: zh || en, en: en || zh } : undefined;
};
function clean<T extends Record<string, unknown>>(o: T): T | null {
  for (const k of Object.keys(o)) if (o[k] === undefined) delete o[k];
  return Object.keys(o).length ? o : null;
}

function stockEdit(v: unknown): StockEdit | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  return clean<StockEdit>({ price: num(o.price), low: num(o.low), high: num(o.high), moq: num(o.moq, 1e9), tooling: num(o.tooling), setup: num(o.setup), supplier: txt(o.supplier, 80), asOf: txt(o.asOf, 20), note: txt(o.note, 300), hidden: o.hidden === true ? true : undefined });
}
function rateEdit(v: unknown): RateEdit | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  return clean<RateEdit>({ value: num(o.value), low: num(o.low), high: num(o.high), supplier: txt(o.supplier, 80), asOf: txt(o.asOf, 20), note: txt(o.note, 300) });
}
function addedStock(v: unknown): Stock | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const id = typeof o.id === "string" && CUSTOM_STOCK_ID.test(o.id) ? o.id : null;
  const kind = KINDS.includes(o.kind as StockKind) ? (o.kind as StockKind) : null;
  const basis = BASES.includes(o.basis as Basis) ? (o.basis as Basis) : null;
  const name = pair(o.name, 80);
  if (!id || !kind || !basis || !name) return null;
  const gsms = Array.isArray(o.gsms) ? o.gsms.map((g) => num(g, 5000)).filter((g): g is number => !!g).slice(0, 12) : undefined;
  const ref = o.ref && typeof o.ref === "object" ? (o.ref as Record<string, unknown>) : null;
  const s: Stock = {
    id,
    kind,
    name,
    mid: typeof o.mid === "string" && /^[MU]\d{3}$/.test(o.mid) ? o.mid : "",
    basis,
    price: num(o.price) ?? 0,
    src: "supplier",
    conf: "supplier",
  };
  const extra: Partial<Stock> = {
    trade: txt(o.trade, 40),
    low: num(o.low),
    high: num(o.high),
    gsms: gsms?.length ? gsms : undefined,
    gsm: num(o.gsm, 5000),
    caliper: num(o.caliper, 50),
    moq: num(o.moq, 1e9),
    tooling: num(o.tooling),
    setup: num(o.setup),
    food: o.food === true ? true : undefined,
    note: pair(o.note, 300),
    ref: ref && num(ref.w, 3000) && num(ref.h, 3000) ? { w: num(ref.w, 3000)!, h: num(ref.h, 3000)!, d: num(ref.d, 3000) ?? num(ref.w, 3000)! } : undefined,
  };
  for (const [k, x] of Object.entries(extra)) if (x !== undefined) (s as Record<string, unknown>)[k] = x;
  return s;
}

export function normalizePriceBook(v: unknown): PriceBook | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const book: PriceBook = {};
  const added = Array.isArray(o.added) ? o.added.map(addedStock).filter((x): x is Stock => !!x).slice(0, 300) : [];
  if (added.length) book.added = [...new Map(added.map((s) => [s.id, s])).values()];
  const ids = new Set([...BASE_STOCK_IDS, ...added.map((s) => s.id)]);
  if (o.stocks && typeof o.stocks === "object") {
    const edits: Record<string, StockEdit> = {};
    for (const [id, e] of Object.entries(o.stocks as Record<string, unknown>)) {
      if (!ids.has(id)) continue;
      const c = stockEdit(e);
      if (!c) continue;
      // added stocks carry their own prices: only whether they are hidden is kept here
      if (BASE_STOCK_IDS.has(id)) edits[id] = c;
      else if (c.hidden) edits[id] = { hidden: true };
    }
    if (Object.keys(edits).length) book.stocks = edits;
  }
  if (o.rates && typeof o.rates === "object") {
    const edits: Record<string, RateEdit> = {};
    for (const [id, e] of Object.entries(o.rates as Record<string, unknown>)) {
      if (!BASE_RATE_IDS.has(id)) continue;
      const c = rateEdit(e);
      if (c) edits[id] = c;
    }
    if (Object.keys(edits).length) book.rates = edits;
  }
  if (o.papers && typeof o.papers === "object") {
    const papers: PriceBook["papers"] = {};
    for (const k of Object.keys(FLUTE_PAPERS) as (keyof typeof FLUTE_PAPERS)[]) {
      const n = num((o.papers as Record<string, unknown>)[k], 100000);
      if (n) papers[k] = n;
    }
    if (Object.keys(papers).length) book.papers = papers;
  }
  return Object.keys(book).length ? book : null;
}

export function nextStockId(book: PriceBook | undefined): string {
  const used = new Set((book?.added ?? []).map((s) => s.id));
  for (let i = 1; i < 1000; i++) {
    const id = `C${String(i).padStart(3, "0")}`;
    if (!used.has(id)) return id;
  }
  return "C999";
}

/** Ids of what differs between two price books, for the library history. */
export function diffPriceBooks(a: PriceBook | undefined, b: PriceBook | undefined): string[] {
  const same = (x: unknown, y: unknown) => JSON.stringify(x ?? null) === JSON.stringify(y ?? null);
  const keys = (x?: Record<string, unknown>, y?: Record<string, unknown>) => [...new Set([...Object.keys(x ?? {}), ...Object.keys(y ?? {})])];
  const addA = new Map((a?.added ?? []).map((s) => [s.id, s]));
  const addB = new Map((b?.added ?? []).map((s) => [s.id, s]));
  return [
    ...new Set([
      ...keys(a?.stocks, b?.stocks).filter((k) => !same(a?.stocks?.[k], b?.stocks?.[k])),
      ...[...new Set([...addA.keys(), ...addB.keys()])].filter((k) => !same(addA.get(k), addB.get(k))),
      ...keys(a?.rates, b?.rates).filter((k) => !same(a?.rates?.[k], b?.rates?.[k])),
      ...keys(a?.papers, b?.papers).filter((k) => !same(a?.papers?.[k as keyof typeof FLUTE_PAPERS], b?.papers?.[k as keyof typeof FLUTE_PAPERS])).map((k) => `paper.${k}`),
    ]),
  ].sort();
}
