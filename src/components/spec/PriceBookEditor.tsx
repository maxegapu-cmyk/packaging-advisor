"use client";

/**
 * The price book tab of the material library: every stock and every process rate the quotes use,
 * with the reference price, where it comes from and how sure it is, and a field for your own
 * supplier's price (with the supplier and the quote date). Stocks of your own can be added, and a
 * whole supplier price list brought in at once: download the book as CSV, fill in the price
 * column, and import it back. Corrugated boards are priced from the four papers they are made of.
 */
import { useMemo, useState } from "react";
import type { Lang, Pair } from "@/lib/i18n";
import { listMaterials, type Library } from "@/lib/materials";
import { allRates, allStocks, fluteParts, priceOf, type BookRate, type BookStock } from "@/lib/spec/book";
import { nextStockId, type PriceBook, type RateEdit, type StockEdit } from "@/lib/spec/priceBook";
import { baseRate, RATE_GROUPS, RATE_UNIT_LABELS } from "@/lib/spec/rates";
import { CONFIDENCE_LABELS, sourceById } from "@/lib/spec/sources";
import { BASIS_UNIT, baseStock, FLUTE_PAPERS, KIND_LABELS, type Basis, type Stock, type StockKind } from "@/lib/spec/stocks";

const one = (p: Pair, lang: Lang) => (lang === "en" ? p.en : p.zh);
const today = () => new Date().toISOString().slice(0, 10);
/** Tonne prices as whole yuan, the rest to the fen. */
const fmt = (n: number | null | undefined, ton: boolean) => (n === null || n === undefined ? "" : n.toLocaleString("en-US", { minimumFractionDigits: ton ? 0 : 2, maximumFractionDigits: ton ? 0 : 4 }));

const T = {
  lead: { zh: "报价用到的每个料号和工序单价都在这里。参考价注明了来源与日期；填入你的供应商价格后，所有项目的报价立即按你的价格计算（定稿的设计保留定稿时的价格）。价格均为不含税。", en: "Every stock and process rate the quotes use. Reference prices show their source and date; enter your suppliers' prices and every project's quote uses them at once (signed-off designs keep the prices they were signed off with). All prices are net of VAT." },
  stocks: { zh: "料号", en: "Stocks" },
  rates: { zh: "工序单价", en: "Process rates" },
  papers: { zh: "瓦楞原纸", en: "Corrugated papers" },
  papersNote: { zh: "瓦楞纸板按各层原纸吨价 × 克重（芯纸乘收缩率）+ 加工费计算；改这里的吨价，所有瓦楞料号随之更新。", en: "Corrugated boards are priced from each ply's tonne price × grammage (mediums by take-up) plus converting; change these and every corrugated stock follows." },
  search: { zh: "搜索名称或编号", en: "Search names or ids" },
  name: { zh: "名称", en: "Name" },
  basis: { zh: "计价", en: "Basis" },
  ref: { zh: "参考价", en: "Reference" },
  mine: { zh: "我的价格", en: "My price" },
  range: { zh: "区间", en: "Range" },
  source: { zh: "依据", en: "Source" },
  supplier: { zh: "供应商", en: "Supplier" },
  asOf: { zh: "报价日期", en: "Quote date" },
  hide: { zh: "隐藏", en: "Hide" },
  moq: { zh: "起订量", en: "MOQ" },
  tooling: { zh: "模具费", en: "Tooling" },
  setup: { zh: "版费", en: "Set-up" },
  derived: { zh: "由原纸推算", en: "from its papers" },
  add: { zh: "新增料号", en: "Add a stock" },
  kind: { zh: "类别", en: "Kind" },
  nameZh: { zh: "中文名", en: "Chinese name" },
  nameEn: { zh: "英文名", en: "English name" },
  price: { zh: "价格（不含税）", en: "Price (net of VAT)" },
  gsms: { zh: "克重（逗号分隔）", en: "Grammages (comma-separated)" },
  material: { zh: "对应材料总表编号", en: "Material on the principal's list" },
  create: { zh: "添加", en: "Add" },
  remove: { zh: "删除", en: "Delete" },
  exportCsv: { zh: "下载价格表 CSV", en: "Download the price list as CSV" },
  importCsv: { zh: "导入供应商价格 CSV", en: "Import supplier prices from CSV" },
  csvNote: { zh: "下载后在“我的价格”列填入供应商报价（可加供应商、日期列），保存为 CSV 再导入；按编号匹配。", en: "Download, fill in the “my price” column with your supplier's quote (supplier and date columns too), save as CSV and import; rows match by id." },
  imported: { zh: "已导入 {n} 个价格。", en: "Imported {n} prices." },
  importNone: { zh: "没有找到可导入的价格：请保留编号列和“我的价格”列。", en: "No prices found to import: keep the id and “my price” columns." },
  edited: { zh: "已改", en: "edited" },
  clear: { zh: "恢复参考价", en: "Back to reference" },
  units: { zh: "单位", en: "Unit" },
  none: { zh: "（无）", en: "(none)" },
} satisfies Record<string, Pair>;

type Update = (f: (l: Library) => Library) => void;

const setBook = (update: Update, f: (b: PriceBook) => PriceBook) => update((l) => ({ ...l, prices: f(l.prices ?? {}) }));

function numOrUndef(v: string): number | undefined {
  if (v.trim() === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

export function PriceBookEditor({ lib, update, lang }: { lib: Library; update: Update; lang: Lang }) {
  const [view, setView] = useState<"stocks" | "rates" | "papers">("stocks");
  const [q, setQ] = useState("");
  const [note, setNote] = useState<string | null>(null);
  // the book in force (allStocks, allRates) is the library the editor has put in force
  const book = lib.prices ?? {};

  const editStock = (id: string, patch: Partial<StockEdit>) =>
    setBook(update, (b) => {
      const cur = { ...(b.stocks?.[id] ?? {}), ...patch };
      if (patch.price !== undefined && !cur.asOf) cur.asOf = today();
      for (const k of Object.keys(cur) as (keyof StockEdit)[]) if (cur[k] === undefined || cur[k] === "") delete cur[k];
      const stocks = { ...(b.stocks ?? {}) };
      if (Object.keys(cur).length) stocks[id] = cur;
      else delete stocks[id];
      return { ...b, stocks };
    });
  const editRate = (id: string, patch: Partial<RateEdit>) =>
    setBook(update, (b) => {
      const cur = { ...(b.rates?.[id] ?? {}), ...patch };
      if (patch.value !== undefined && !cur.asOf) cur.asOf = today();
      for (const k of Object.keys(cur) as (keyof RateEdit)[]) if (cur[k] === undefined || cur[k] === "") delete cur[k];
      const rates = { ...(b.rates ?? {}) };
      if (Object.keys(cur).length) rates[id] = cur;
      else delete rates[id];
      return { ...b, rates };
    });

  const exportCsv = () => {
    const rows: string[][] = [["type", "id", "name", "basis/unit", "reference", "my price", "supplier", "date"]];
    for (const s of allStocks()) rows.push(["stock", s.id, one(s.name, lang), one(BASIS_UNIT[s.basis], lang), String(baseStock(s.id)?.price ?? ""), book.stocks?.[s.id]?.price !== undefined ? String(book.stocks[s.id].price) : "", book.stocks?.[s.id]?.supplier ?? "", book.stocks?.[s.id]?.asOf ?? ""]);
    for (const r of allRates()) rows.push(["rate", r.id, one(r.name, lang), one(RATE_UNIT_LABELS[r.unit], lang), String(baseRate(r.id)?.value ?? ""), book.rates?.[r.id]?.value !== undefined ? String(book.rates[r.id].value) : "", book.rates?.[r.id]?.supplier ?? "", book.rates?.[r.id]?.asOf ?? ""]);
    for (const k of Object.keys(FLUTE_PAPERS) as (keyof typeof FLUTE_PAPERS)[]) rows.push(["paper", k, one(FLUTE_PAPERS[k].name, lang), lang === "zh" ? "元/吨" : "yuan/t", String(FLUTE_PAPERS[k].price), book.papers?.[k] !== undefined ? String(book.papers[k]) : "", "", ""]);
    const csv = "﻿" + rows.map((r) => r.map((x) => `"${x.replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = `price-book-${today()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };

  const importCsv = async (file: File) => {
    const text = (await file.text()).replace(/^﻿/, "");
    const rows = parseCsv(text);
    let n = 0;
    setBook(update, (b) => {
      const next: PriceBook = { ...b, stocks: { ...(b.stocks ?? {}) }, rates: { ...(b.rates ?? {}) }, papers: { ...(b.papers ?? {}) } };
      for (const r of rows.slice(1)) {
        const [type, id, , , , mine, supplier, date] = r;
        const price = numOrUndef(mine ?? "");
        if (price === undefined) continue;
        const meta = { ...(supplier?.trim() ? { supplier: supplier.trim().slice(0, 80) } : {}), asOf: (date?.trim() || today()).slice(0, 20) };
        if (type === "stock" && allStocks().some((s) => s.id === id)) {
          next.stocks![id] = { ...(next.stocks![id] ?? {}), price, ...meta };
          n++;
        } else if (type === "rate" && allRates().some((x) => x.id === id)) {
          next.rates![id] = { ...(next.rates![id] ?? {}), value: price, ...meta };
          n++;
        } else if (type === "paper" && id in FLUTE_PAPERS) {
          next.papers![id as keyof typeof FLUTE_PAPERS] = price;
          n++;
        }
      }
      return next;
    });
    setNote(n ? one(T.imported, lang).replace("{n}", String(n)) : one(T.importNone, lang));
  };

  return (
    <div className="pb">
      <p className="lib-lead">{one(T.lead, lang)}</p>
      <div className="toolbar pb-tools">
        <div className="pb-views seg" role="tablist">
          {(["stocks", "rates", "papers"] as const).map((x) => (
            <button key={x} type="button" role="tab" aria-selected={view === x} className={view === x ? "is-active" : ""} onClick={() => setView(x)}>
              {one(T[x], lang)}
            </button>
          ))}
        </div>
        <input className="lib-search pb-search" type="search" placeholder={one(T.search, lang)} value={q} onChange={(e) => setQ(e.currentTarget.value)} />
        <button type="button" className="btn btn-small btn-quiet" onClick={exportCsv}>
          {one(T.exportCsv, lang)}
        </button>
        <label className="btn btn-small btn-quiet lib-import">
          {one(T.importCsv, lang)}
          <input type="file" accept=".csv,text/csv" onChange={(e) => e.currentTarget.files?.[0] && importCsv(e.currentTarget.files[0])} />
        </label>
      </div>
      <p className="lib-base">{one(T.csvNote, lang)}</p>
      {note ? (
        <p className="notice" role="status">
          {note}
        </p>
      ) : null}
      {view === "stocks" ? <StocksView q={q} book={book} lang={lang} editStock={editStock} update={update} /> : null}
      {view === "rates" ? <RatesView q={q} book={book} lang={lang} editRate={editRate} /> : null}
      {view === "papers" ? <PapersView book={book} lang={lang} update={update} /> : null}
    </div>
  );
}

function Src({ s, lang }: { s: { conf: BookStock["conf"]; src: string; asOf: string }; lang: Lang }) {
  const src = sourceById(s.src);
  const label = one(CONFIDENCE_LABELS[s.conf], lang);
  return (
    <span className={`sp-badge sp-badge-${s.conf}`} title={src ? one(src.title, lang) : label}>
      {src?.url ? (
        <a href={src.url} target="_blank" rel="noreferrer">
          {label.split("，")[0].split(",")[0]}
        </a>
      ) : (
        label.split("，")[0].split(",")[0]
      )}
      {s.asOf ? ` · ${s.asOf}` : ""}
    </span>
  );
}

function StocksView({ q, book, lang, editStock, update }: { q: string; book: PriceBook; lang: Lang; editStock: (id: string, p: Partial<StockEdit>) => void; update: Update }) {
  const all = allStocks();
  const match = (s: BookStock) => !q.trim() || `${s.id} ${s.name.zh} ${s.name.en} ${s.trade ?? ""}`.toLowerCase().includes(q.trim().toLowerCase());
  const kinds = [...new Set(all.map((s) => s.kind))];
  return (
    <div className="pb-groups">
      {kinds.map((k) => {
        const list = all.filter((s) => s.kind === k && match(s));
        if (!list.length) return null;
        return (
          <section key={k} className="pb-group">
            <h3>{one(KIND_LABELS[k], lang)}</h3>
            <div className="pb-scroll">
              <table className="pb-table">
                <thead>
                  <tr>
                    <th>{one(T.name, lang)}</th>
                    <th>{one(T.ref, lang)}</th>
                    <th>{one(T.mine, lang)}</th>
                    <th>{one(T.source, lang)}</th>
                    <th>{one(T.supplier, lang)}</th>
                    {k === "container" || k === "insert" ? (
                      <>
                        <th>{one(T.moq, lang)}</th>
                        <th>{one(T.tooling, lang)}</th>
                        <th>{one(T.setup, lang)}</th>
                      </>
                    ) : null}
                    <th>{one(T.hide, lang)}</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((s) => {
                    const e = book.stocks?.[s.id] ?? {};
                    const base = baseStock(s.id);
                    const custom = !base;
                    return (
                      <tr key={s.id} className={s.hidden ? "is-hidden" : s.edited ? "is-edited" : undefined}>
                        <td>
                          <code>{s.id}</code> {one(s.name, lang)}
                          <small>
                            {s.mid ? ` ${s.mid}` : ""}
                            {s.gsms ? ` · ${s.gsms.join("/")} g` : ""}
                          </small>
                        </td>
                        <td className="num">
                          {base ? (base.price === null ? `≈ ${priceOf(base).toFixed(2)}` : fmt(base.price, s.basis === "ton")) : "—"}
                          <small> {one(BASIS_UNIT[s.basis], lang)}</small>
                          {base?.low !== undefined ? <small className="pb-range">{`${fmt(base.low, s.basis === "ton")}–${fmt(base.high, s.basis === "ton")}`}</small> : null}
                        </td>
                        <td>
                          {custom ? (
                            <input type="number" min={0} step="any" defaultValue={s.price ?? ""} onBlur={(ev) => setBook(update, (b) => ({ ...b, added: (b.added ?? []).map((x) => (x.id === s.id ? { ...x, price: numOrUndef(ev.currentTarget.value) ?? 0 } : x)) }))} />
                          ) : (
                            <input type="number" min={0} step="any" placeholder={s.price === null ? one(T.derived, lang) : String(base?.price === null || base?.price === undefined ? "" : s.basis === "ton" ? Math.round(base.price) : base.price)} value={e.price ?? ""} onChange={(ev) => editStock(s.id, { price: numOrUndef(ev.currentTarget.value) })} />
                          )}
                        </td>
                        <td>
                          <Src s={s} lang={lang} />
                        </td>
                        <td>
                          <input type="text" maxLength={80} value={e.supplier ?? ""} onChange={(ev) => editStock(s.id, { supplier: ev.currentTarget.value || undefined })} />
                        </td>
                        {k === "container" || k === "insert" ? (
                          <>
                            <td>
                              <input type="number" min={0} step={100} placeholder={String(base?.moq ?? "")} value={e.moq ?? ""} onChange={(ev) => editStock(s.id, { moq: numOrUndef(ev.currentTarget.value) })} />
                            </td>
                            <td>
                              <input type="number" min={0} step={100} placeholder={String(base?.tooling ?? "")} value={e.tooling ?? ""} onChange={(ev) => editStock(s.id, { tooling: numOrUndef(ev.currentTarget.value) })} />
                            </td>
                            <td>
                              <input type="number" min={0} step={100} placeholder={String(base?.setup ?? "")} value={e.setup ?? ""} onChange={(ev) => editStock(s.id, { setup: numOrUndef(ev.currentTarget.value) })} />
                            </td>
                          </>
                        ) : null}
                        <td>
                          {custom ? (
                            <button type="button" className="st-link" onClick={() => setBook(update, (b) => ({ ...b, added: (b.added ?? []).filter((x) => x.id !== s.id) }))}>
                              {one(T.remove, lang)}
                            </button>
                          ) : (
                            <input type="checkbox" aria-label={one(T.hide, lang)} checked={!!e.hidden} onChange={(ev) => editStock(s.id, { hidden: ev.currentTarget.checked || undefined })} />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
      <AddStock book={book} lang={lang} update={update} />
    </div>
  );
}

function AddStock({ book, lang, update }: { book: PriceBook; lang: Lang; update: Update }) {
  const [kind, setKind] = useState<StockKind>("board");
  const [zh, setZh] = useState("");
  const [en, setEn] = useState("");
  const [basis, setBasis] = useState<Basis>("ton");
  const [price, setPrice] = useState("");
  const [gsms, setGsms] = useState("");
  const [mid, setMid] = useState("");
  const [supplier, setSupplier] = useState("");
  const mats = useMemo(() => listMaterials(), []);
  const add = () => {
    const name = { zh: zh.trim() || en.trim(), en: en.trim() || zh.trim() };
    const p = numOrUndef(price);
    if (!name.zh || p === undefined) return;
    const g = gsms
      .split(/[,，\s]+/)
      .map(Number)
      .filter((x) => Number.isFinite(x) && x > 0);
    const s = { id: nextStockId(book), kind, name, mid, basis, price: p, src: "supplier", conf: "supplier", ...(g.length ? { gsms: g, gsm: g[0] } : {}), ...(supplier.trim() ? { trade: supplier.trim() } : {}) } as Stock;
    setBook(update, (b) => ({ ...b, added: [...(b.added ?? []), s] }));
    setZh("");
    setEn("");
    setPrice("");
    setGsms("");
  };
  return (
    <details className="lib-recform pb-add">
      <summary>{one(T.add, lang)}</summary>
      <div className="pb-add-grid">
        <label className="lib-field">
          <span className="lib-label">{one(T.kind, lang)}</span>
          <select value={kind} onChange={(e) => setKind(e.currentTarget.value as StockKind)}>
            {(Object.keys(KIND_LABELS) as StockKind[]).map((k) => (
              <option key={k} value={k}>
                {one(KIND_LABELS[k], lang)}
              </option>
            ))}
          </select>
        </label>
        <label className="lib-field">
          <span className="lib-label">{one(T.nameZh, lang)}</span>
          <input value={zh} onChange={(e) => setZh(e.currentTarget.value)} />
        </label>
        <label className="lib-field">
          <span className="lib-label">{one(T.nameEn, lang)}</span>
          <input value={en} onChange={(e) => setEn(e.currentTarget.value)} />
        </label>
        <label className="lib-field">
          <span className="lib-label">{one(T.basis, lang)}</span>
          <select value={basis} onChange={(e) => setBasis(e.currentTarget.value as Basis)}>
            {(Object.keys(BASIS_UNIT) as Basis[]).map((b) => (
              <option key={b} value={b}>
                {one(BASIS_UNIT[b], lang)}
              </option>
            ))}
          </select>
        </label>
        <label className="lib-field">
          <span className="lib-label">{one(T.price, lang)}</span>
          <input type="number" min={0} step="any" value={price} onChange={(e) => setPrice(e.currentTarget.value)} />
        </label>
        <label className="lib-field">
          <span className="lib-label">{one(T.gsms, lang)}</span>
          <input value={gsms} placeholder="250, 300, 350" onChange={(e) => setGsms(e.currentTarget.value)} />
        </label>
        <label className="lib-field">
          <span className="lib-label">{one(T.material, lang)}</span>
          <select value={mid} onChange={(e) => setMid(e.currentTarget.value)}>
            <option value="">{one(T.none, lang)}</option>
            {mats.map((m) => (
              <option key={m.id} value={m.id}>
                {m.id} {one(m.name, lang)}
              </option>
            ))}
          </select>
        </label>
        <label className="lib-field">
          <span className="lib-label">{one(T.supplier, lang)}</span>
          <input value={supplier} onChange={(e) => setSupplier(e.currentTarget.value)} />
        </label>
      </div>
      <button type="button" className="btn btn-small btn-primary" onClick={add}>
        {one(T.create, lang)}
      </button>
    </details>
  );
}

function RatesView({ q, book, lang, editRate }: { q: string; book: PriceBook; lang: Lang; editRate: (id: string, p: Partial<RateEdit>) => void }) {
  const all = allRates();
  const match = (r: BookRate) => !q.trim() || `${r.id} ${r.name.zh} ${r.name.en}`.toLowerCase().includes(q.trim().toLowerCase());
  return (
    <div className="pb-groups">
      {RATE_GROUPS.map((g) => {
        const list = all.filter((r) => r.group === g.id && match(r));
        if (!list.length) return null;
        return (
          <section key={g.id} className="pb-group">
            <h3>{one(g.label, lang)}</h3>
            <div className="pb-scroll">
              <table className="pb-table">
                <thead>
                  <tr>
                    <th>{one(T.name, lang)}</th>
                    <th>{one(T.ref, lang)}</th>
                    <th>{one(T.mine, lang)}</th>
                    <th>{one(T.source, lang)}</th>
                    <th>{one(T.supplier, lang)}</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((r) => {
                    const e = book.rates?.[r.id] ?? {};
                    const base = baseRate(r.id)!;
                    return (
                      <tr key={r.id} className={r.edited ? "is-edited" : undefined}>
                        <td>
                          <code>{r.id}</code> {one(r.name, lang)}
                          {r.note ? <small>{one(r.note, lang)}</small> : null}
                        </td>
                        <td className="num">
                          {base.value}
                          <small> {one(RATE_UNIT_LABELS[r.unit], lang)}</small>
                          {base.low !== undefined && base.low !== base.high ? <small className="pb-range">{`${base.low}–${base.high}`}</small> : null}
                        </td>
                        <td>
                          <input type="number" min={0} step="any" placeholder={String(base.value)} value={e.value ?? ""} onChange={(ev) => editRate(r.id, { value: numOrUndef(ev.currentTarget.value) })} />
                        </td>
                        <td>
                          <Src s={r} lang={lang} />
                        </td>
                        <td>
                          <input type="text" maxLength={80} value={e.supplier ?? ""} onChange={(ev) => editRate(r.id, { supplier: ev.currentTarget.value || undefined })} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </div>
  );
}

function PapersView({ book, lang, update }: { book: PriceBook; lang: Lang; update: Update }) {
  const flutes = allStocks().filter((s) => s.kind === "flute");
  return (
    <div className="pb-groups">
      <p className="lib-base">{one(T.papersNote, lang)}</p>
      <table className="pb-table">
        <thead>
          <tr>
            <th>{one(T.name, lang)}</th>
            <th>{one(T.ref, lang)}</th>
            <th>{one(T.mine, lang)}</th>
            <th>{one(T.source, lang)}</th>
          </tr>
        </thead>
        <tbody>
          {(Object.keys(FLUTE_PAPERS) as (keyof typeof FLUTE_PAPERS)[]).map((k) => {
            const p = FLUTE_PAPERS[k];
            return (
              <tr key={k} className={book.papers?.[k] !== undefined ? "is-edited" : undefined}>
                <td>{one(p.name, lang)}</td>
                <td className="num">
                  {fmt(p.price, true)} <small>{lang === "zh" ? "元/吨" : "yuan/t"}</small>
                </td>
                <td>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    placeholder={String(Math.round(p.price))}
                    value={book.papers?.[k] ?? ""}
                    onChange={(ev) =>
                      setBook(update, (b) => {
                        const papers = { ...(b.papers ?? {}) };
                        const n = numOrUndef(ev.currentTarget.value);
                        if (n === undefined) delete papers[k];
                        else papers[k] = n;
                        return { ...b, papers };
                      })
                    }
                  />
                </td>
                <td>
                  <Src s={{ conf: p.conf, src: p.src, asOf: sourceById(p.src)?.date ?? "" }} lang={lang} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <h3>{one(KIND_LABELS.flute, lang)}</h3>
      <table className="pb-table">
        <tbody>
          {flutes.map((s) => (
            <tr key={s.id}>
              <td>
                {one(s.name, lang)}
                <small>{fluteParts(s).map((x) => one(x.ply, lang)).join(" / ")}</small>
              </td>
              <td className="num">
                {priceOf(s).toFixed(2)} <small>{one(BASIS_UNIT.m2, lang)}</small>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** A small CSV reader: quoted fields, doubled quotes, commas and newlines inside quotes. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim()));
}
