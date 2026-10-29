/**
 * The price book in force: the reference stocks and rates with the deployment's edits on top (read
 * from the material library in force, so a design frozen at sign-off keeps the prices it was
 * quoted with). Corrugated boards are priced from their papers unless a price is set for them.
 * Client-safe.
 */
import type { Pair } from "../i18n";
import { getLibrary, libraryVersion } from "../materials";
import type { PriceBook } from "./priceBook";
import { RATES, type Rate } from "./rates";
import { SOURCES, type Confidence } from "./sources";
import { FLUTE_PAPERS, STOCKS, TAKE_UP, type Stock, type StockKind } from "./stocks";

export type BookStock = Stock & { edited: boolean; hidden: boolean; supplier?: string; asOf: string };
export type BookRate = Rate & { edited: boolean; supplier?: string; asOf: string };

type Active = { v: number; book: PriceBook; stocks: Map<string, BookStock>; list: BookStock[]; rates: Map<string, BookRate>; papers: Record<keyof typeof FLUTE_PAPERS, number> };
let cache: Active | null = null;

const dateOf = (src: string) => SOURCES.find((s) => s.id === src)?.date ?? "";

function build(book: PriceBook, v: number): Active {
  const list: BookStock[] = [];
  for (const s of [...STOCKS, ...(book.added ?? [])]) {
    const e = book.stocks?.[s.id];
    const custom = !STOCKS.includes(s);
    const priced = e?.price !== undefined;
    const b: BookStock = {
      ...s,
      price: e?.price ?? s.price,
      low: e?.low ?? (priced ? undefined : s.low),
      high: e?.high ?? (priced ? undefined : s.high),
      moq: e?.moq ?? s.moq,
      tooling: e?.tooling ?? s.tooling,
      setup: e?.setup ?? s.setup,
      conf: priced || custom ? ("supplier" as Confidence) : s.conf,
      src: priced || custom ? "supplier" : s.src,
      edited: !!e && Object.keys(e).some((k) => k !== "hidden"),
      hidden: !!e?.hidden,
      supplier: e?.supplier,
      asOf: e?.asOf ?? (custom ? "" : dateOf(s.src)),
    };
    if (e?.note) b.note = { zh: e.note, en: e.note };
    list.push(b);
  }
  const rates = new Map<string, BookRate>();
  for (const x of RATES) {
    const e = book.rates?.[x.id];
    const priced = e?.value !== undefined;
    rates.set(x.id, {
      ...x,
      value: e?.value ?? x.value,
      low: e?.low ?? (priced ? undefined : x.low),
      high: e?.high ?? (priced ? undefined : x.high),
      conf: priced ? "supplier" : x.conf,
      src: priced ? "supplier" : x.src,
      edited: !!e,
      supplier: e?.supplier,
      asOf: e?.asOf ?? dateOf(x.src),
      note: e?.note ? { zh: e.note, en: e.note } : x.note,
    });
  }
  const papers = Object.fromEntries((Object.keys(FLUTE_PAPERS) as (keyof typeof FLUTE_PAPERS)[]).map((k) => [k, book.papers?.[k] ?? FLUTE_PAPERS[k].price])) as Active["papers"];
  return { v, book, stocks: new Map(list.map((s) => [s.id, s])), list, rates, papers };
}

function act(): Active {
  const v = libraryVersion();
  if (!cache || cache.v !== v) cache = build(getLibrary().prices ?? {}, v);
  return cache;
}

export const priceBook = (): PriceBook => act().book;
/** A stock by id, hidden ones included (an old pick can still be priced). */
export const stock = (id: string): BookStock | undefined => act().stocks.get(id);
/** The stocks to choose from, of the kinds given (all kinds when none). */
export const listStocks = (...kinds: StockKind[]): BookStock[] => act().list.filter((s) => !s.hidden && (!kinds.length || kinds.includes(s.kind)));
export const allStocks = (): BookStock[] => act().list;
export const rateInfo = (id: string): BookRate => {
  const r = act().rates.get(id);
  if (!r) throw new Error(`unknown rate ${id}`);
  return r;
};
export const rate = (id: string): number => rateInfo(id).value;
export const pct = (id: string): number => rate(id) / 100;
export const allRates = (): BookRate[] => [...act().rates.values()];
export const paperPrice = (k: keyof typeof FLUTE_PAPERS): number => act().papers[k];

/** A corrugated board's price per m² from its papers: weight of each ply (mediums by take-up) × tonne price, plus converting. */
export function fluteParts(s: Stock): { ply: Pair; kg: number; price: number; cost: number }[] {
  return (s.plies ?? []).map((p) => {
    const kg = (p.gsm * (p.flute ? TAKE_UP[p.flute] : 1)) / 1000;
    const price = paperPrice(p.paper);
    const label = FLUTE_PAPERS[p.paper].name;
    return { ply: p.flute ? { zh: `${label.zh} ${p.gsm} g（${p.flute} 楞）`, en: `${label.en} ${p.gsm} g (${p.flute} flute)` } : { zh: `${label.zh} ${p.gsm} g`, en: `${label.en} ${p.gsm} g` }, kg, price, cost: (kg * price) / 1000 };
  });
}
export function fluteConvertRate(s: Stock): string {
  const n = s.plies?.length ?? 3;
  return n <= 2 ? "flute.c2" : n <= 3 ? "flute.c3" : n <= 5 ? "flute.c5" : "flute.c7";
}

/** The price of a stock per its basis, net of VAT (corrugated worked out from its papers). */
export function priceOf(s: Stock): number {
  if (s.price !== null) return s.price;
  const papers = fluteParts(s).reduce((a, p) => a + p.cost, 0);
  return Math.round((papers + rate(fluteConvertRate(s))) * 1000) / 1000;
}

/** Grams per m² of a stock (corrugated from its plies). */
export function gsmOf(s: Stock, gsm?: number): number {
  if (gsm) return gsm;
  if (s.gsm) return s.gsm;
  if (s.plies) return Math.round(s.plies.reduce((a, p) => a + p.gsm * (p.flute ? TAKE_UP[p.flute] : 1), 0));
  return 0;
}

/** Tonne-priced stocks as a price per m² at a grammage (for comparing and for the cost-down advice). */
export const perM2 = (s: Stock, gsm?: number): number => (s.basis === "ton" ? (priceOf(s) * gsmOf(s, gsm)) / 1e6 : s.basis === "m2" ? priceOf(s) : 0);
