"use client";

/**
 * The full quote, as a document: the specification a factory quotes against (every component
 * with its stock, grammage, print, finishing, quantity per pack and imposition), the price at each
 * quantity, the selected quantity's lines with their working, the documents to ask for, and where
 * the prices come from. In RFQ mode the price columns are left blank for suppliers to fill in.
 * Printed from its own window (so it prints as a clean A4 document), and downloadable as CSV.
 */
import { useMemo, useState } from "react";
import type { Lang, Pair } from "@/lib/i18n";
import { finishText, FORM_LABELS, outerSize, type PackSpec } from "@/lib/pack";
import { documentsFor, libraryVersion, usesOf } from "@/lib/materials";
import { impositionText } from "@/lib/spec/impose";
import { quoteTiers, yuan, type CompQuote, type Quote } from "@/lib/spec/quote";
import { CONFIDENCE_LABELS, sourceById } from "@/lib/spec/sources";
import { perPackText, postText, printText, stockText } from "@/lib/spec/describe";

const one = (p: Pair, lang: Lang) => (lang === "en" ? p.en : p.zh);

const T = {
  title: { zh: "包装报价单", en: "Packaging quote" },
  rfq: { zh: "包装询价单", en: "Request for quotation" },
  modeQuote: { zh: "测算报价", en: "Estimate" },
  modeRfq: { zh: "询价单（价格留空）", en: "RFQ (prices blank)" },
  print: { zh: "打印 / 存为 PDF", en: "Print or save as PDF" },
  csv: { zh: "下载 CSV（Excel 可打开）", en: "Download CSV (opens in Excel)" },
  close: { zh: "关闭", en: "Close" },
  product: { zh: "产品", en: "Product" },
  structure: { zh: "结构", en: "Structure" },
  size: { zh: "外尺寸", en: "Outside size" },
  finish: { zh: "表面与工艺", en: "Finish and effects" },
  date: { zh: "日期", en: "Date" },
  spec: { zh: "一、规格", en: "1. Specification" },
  part: { zh: "部件", en: "Part" },
  stock: { zh: "材料规格", en: "Stock" },
  print_: { zh: "印刷", en: "Print" },
  post: { zh: "表面与后道", en: "Finishing" },
  perPack: { zh: "每套用量", en: "Per pack" },
  impose: { zh: "拼版", en: "Imposition" },
  prices: { zh: "二、单价（元/套）", en: "2. Price per pack (yuan)" },
  oneOff: { zh: "一次性费用（元）", en: "One-off costs (yuan)" },
  overhead: { zh: "管理费与利润", en: "Overhead and margin" },
  vat: { zh: "增值税 13%", en: "VAT 13%" },
  unit: { zh: "单价", en: "Unit price" },
  total: { zh: "总价", en: "Total" },
  detail: { zh: "三、明细与算式", en: "3. Lines and working" },
  at: { zh: "订量", en: "at" },
  docs: { zh: "四、需随货提供的资料", en: "4. Documents to supply" },
  notes: { zh: "说明", en: "Notes" },
  note1: { zh: "本单为按公开行情与行业常见报价方法的参考测算，不是工厂报价；请以供应商正式报价为准。", en: "A reference estimate from public market prices and the trade's usual quoting method, not a factory's quote; suppliers' formal quotes govern." },
  note2: { zh: "外购件（容器、内托等）按供应商价计入，不加管理费和利润。", en: "Bought-in parts (containers, inserts) are at the supplier's price, with no overhead or margin added." },
  rfqNote: { zh: "请按上述规格分别报出各订量的含税单价、一次性费用（版费、刀模、模具）、交期与起订量。", en: "Please quote the VAT-inclusive unit price at each quantity, the one-off costs (plates, dies, moulds), lead time and minimum order for the specification above." },
  lead: { zh: "交期（天）", en: "Lead time (days)" },
  moq: { zh: "起订量", en: "Minimum order" },
  supplier: { zh: "报价单位", en: "Quoted by" },
  sources: { zh: "价格依据", en: "Price sources" },
  bought: { zh: "外购", en: "bought in" },
} satisfies Record<string, Pair>;

export function QuoteSheet({ spec, category, product, lang, onClose, tier }: { spec: PackSpec; category: string; product: string; lang: Lang; onClose: () => void; tier: number }) {
  const v = libraryVersion();
  const quotes = useMemo(() => quoteTiers(spec, category), [spec, category, v]); // eslint-disable-line react-hooks/exhaustive-deps
  const [rfq, setRfq] = useState(false);
  const sel = quotes[Math.min(tier, quotes.length - 1)];
  const docs = useMemo(() => documentsFor(usesOf(spec, category)), [spec, category, v]); // eslint-disable-line react-hooks/exhaustive-deps
  const o = outerSize(spec);
  const today = new Date().toISOString().slice(0, 10);
  const comps = sel.comps.filter((c) => c.comp.key !== "job");

  const doPrint = () => {
    const el = document.getElementById("qs-doc");
    if (!el) return;
    const w = window.open("", "_blank", "width=900,height=1200");
    if (!w) return;
    w.document.write(`<!doctype html><html lang="${lang === "zh" ? "zh-CN" : "en"}"><head><meta charset="utf-8"><title>${one(rfq ? T.rfq : T.title, lang)} · ${product}</title><style>${PRINT_CSS}</style></head><body>${el.outerHTML}</body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 300);
  };

  const downloadCsv = () => {
    const rows: (string | number)[][] = [];
    rows.push([one(rfq ? T.rfq : T.title, lang), product, today]);
    rows.push([one(T.structure, lang), one(FORM_LABELS[spec.form], lang), `${o.w}×${o.h}×${o.d} mm`, finishText(spec, lang)]);
    rows.push([]);
    rows.push([one(T.part, lang), one(T.stock, lang), one(T.print_, lang), one(T.post, lang), one(T.perPack, lang), ...quotes.map((q) => `${q.qty}`)]);
    for (const c of comps) {
      rows.push([one(c.comp.label, lang), stockText(c, lang), printText(c, lang), postText(c, lang), perPackText(c, lang), ...quotes.map((q) => (rfq ? "" : (((q.comps.find((x) => x.comp.key === c.comp.key)?.total ?? 0) / q.qty).toFixed(3))))]);
    }
    rows.push([one(T.oneOff, lang), "", "", "", "", ...quotes.map((q) => (rfq ? "" : q.setup.toFixed(0)))]);
    rows.push([one(T.unit, lang), "", "", "", "", ...quotes.map((q) => (rfq ? "" : q.unit.toFixed(3)))]);
    rows.push([one(T.total, lang), "", "", "", "", ...quotes.map((q) => (rfq ? "" : q.gross.toFixed(0)))]);
    if (rfq) {
      rows.push([one(T.lead, lang)]);
      rows.push([one(T.moq, lang)]);
      rows.push([one(T.supplier, lang)]);
    }
    const csv = "﻿" + rows.map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = `${product}-${rfq ? "RFQ" : "quote"}-${today}.csv`.replace(/[\\/:*?"<>|\s]+/g, "_");
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };

  return (
    <div className="qs" role="dialog" aria-modal="true" aria-label={one(rfq ? T.rfq : T.title, lang)}>
      <div className="qs-bar">
        <div className="qs-modes seg" role="radiogroup">
          <button type="button" role="radio" aria-checked={!rfq} className={!rfq ? "is-active" : ""} onClick={() => setRfq(false)}>
            {one(T.modeQuote, lang)}
          </button>
          <button type="button" role="radio" aria-checked={rfq} className={rfq ? "is-active" : ""} onClick={() => setRfq(true)}>
            {one(T.modeRfq, lang)}
          </button>
        </div>
        <span className="qs-actions">
          <button type="button" className="btn btn-quiet btn-small" onClick={downloadCsv}>
            {one(T.csv, lang)}
          </button>
          <button type="button" className="btn btn-primary btn-small" onClick={doPrint}>
            {one(T.print, lang)}
          </button>
          <button type="button" className="btn btn-ghost btn-small" onClick={onClose}>
            {one(T.close, lang)}
          </button>
        </span>
      </div>
      <div className="qs-scroll">
        <article id="qs-doc" className="qs-doc">
          <header className="qs-head">
            <h1>{one(rfq ? T.rfq : T.title, lang)}</h1>
            <dl>
              <div>
                <dt>{one(T.product, lang)}</dt>
                <dd>{product}</dd>
              </div>
              <div>
                <dt>{one(T.structure, lang)}</dt>
                <dd>
                  {one(FORM_LABELS[spec.form], lang)}
                  {spec.inner ? ` + ${spec.inner.count} × ${one(FORM_LABELS[spec.inner.form], lang)}` : ""}
                </dd>
              </div>
              <div>
                <dt>{one(T.size, lang)}</dt>
                <dd>
                  {o.w} × {o.h} × {o.d} mm
                </dd>
              </div>
              <div>
                <dt>{one(T.finish, lang)}</dt>
                <dd>{finishText(spec, lang)}</dd>
              </div>
              <div>
                <dt>{one(T.date, lang)}</dt>
                <dd>{today}</dd>
              </div>
            </dl>
          </header>

          <h2>{one(T.spec, lang)}</h2>
          <table className="qs-table">
            <thead>
              <tr>
                <th>#</th>
                <th>{one(T.part, lang)}</th>
                <th>{one(T.stock, lang)}</th>
                <th>{one(T.print_, lang)}</th>
                <th>{one(T.post, lang)}</th>
                <th>{one(T.perPack, lang)}</th>
                <th>{one(T.impose, lang)}</th>
              </tr>
            </thead>
            <tbody>
              {comps.map((c, i) => (
                <tr key={c.comp.key}>
                  <td>{i + 1}</td>
                  <td>{one(c.comp.label, lang)}</td>
                  <td>{stockText(c, lang)}</td>
                  <td>{printText(c, lang)}</td>
                  <td>{postText(c, lang)}</td>
                  <td>{perPackText(c, lang)}</td>
                  <td>{c.imposition ? impositionText(c.imposition, lang) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h2>{one(T.prices, lang)}</h2>
          <table className="qs-table qs-num">
            <thead>
              <tr>
                <th>{one(T.part, lang)}</th>
                {quotes.map((q) => (
                  <th key={q.qty}>
                    {q.qty.toLocaleString("en-US")}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {comps.map((c) => (
                <tr key={c.comp.key}>
                  <td>{one(c.comp.label, lang)}</td>
                  {quotes.map((q) => (
                    <td key={q.qty}>{rfq ? "" : yuan((q.comps.find((x) => x.comp.key === c.comp.key)?.total ?? 0) / q.qty, 3)}</td>
                  ))}
                </tr>
              ))}
              <Row label={one({ zh: "打样与包装", en: "Proofs and packing" }, lang)} quotes={quotes} rfq={rfq} f={(q) => (q.comps.find((x) => x.comp.key === "job")?.total ?? 0) / q.qty} />
              <Row label={one(T.overhead, lang)} quotes={quotes} rfq={rfq} f={(q) => (q.overhead + q.margin) / q.qty} />
              {quotes[0].withVat ? <Row label={one(T.vat, lang)} quotes={quotes} rfq={rfq} f={(q) => q.vat / q.qty} /> : null}
              <Row label={one(T.unit, lang)} quotes={quotes} rfq={rfq} f={(q) => q.unit} strong />
              <Row label={one(T.oneOff, lang)} quotes={quotes} rfq={rfq} f={(q) => q.setup} digits={0} />
              <Row label={one(T.total, lang)} quotes={quotes} rfq={rfq} f={(q) => q.gross} digits={0} strong />
              {rfq ? (
                <>
                  <Row label={one(T.lead, lang)} quotes={quotes} rfq f={() => 0} />
                  <Row label={one(T.moq, lang)} quotes={quotes} rfq f={() => 0} />
                </>
              ) : null}
            </tbody>
          </table>

          {!rfq ? (
            <>
              <h2>
                {one(T.detail, lang)}（{one(T.at, lang)} {sel.qty.toLocaleString("en-US")}）
              </h2>
              <table className="qs-table qs-lines">
                <tbody>
                  {sel.comps.map((c) =>
                    c.lines.map((l, i) => (
                      <tr key={`${c.comp.key}-${i}`}>
                        <td>{i === 0 ? one(c.comp.label, lang) : ""}</td>
                        <td>
                          <b>{one(l.item, lang)}</b>
                          <br />
                          <small>{one(l.calc, lang)}</small>
                        </td>
                        <td>{l.setup ? yuan(l.setup, 0) : ""}</td>
                        <td>{l.run ? yuan(l.run, 0) : ""}</td>
                      </tr>
                    )),
                  )}
                </tbody>
              </table>
            </>
          ) : null}

          {docs.length ? (
            <>
              <h2>{one(T.docs, lang)}</h2>
              <ul className="qs-docs">
                {docs.map((d, i) => (
                  <li key={i}>
                    {one(d.docs, lang)} <small>({d.ids.join(", ")})</small>
                  </li>
                ))}
              </ul>
            </>
          ) : null}

          <h2>{one(T.notes, lang)}</h2>
          <ul className="qs-notes">
            {rfq ? <li>{one(T.rfqNote, lang)}</li> : null}
            <li>{one(T.note1, lang)}</li>
            <li>{one(T.note2, lang)}</li>
            {!rfq ? (
              <li>
                {one(T.sources, lang)}：
                {[...new Set(sel.comps.map((c) => c.comp.stock).filter(Boolean).map((s) => `${one(s!.name, lang)}（${one(CONFIDENCE_LABELS[s!.conf], lang)}${s!.asOf ? ` ${s!.asOf}` : ""}${sourceById(s!.src)?.url ? `，${sourceById(s!.src)!.url}` : ""}）`))].join("；")}
              </li>
            ) : null}
          </ul>
          {rfq ? (
            <p className="qs-sign">
              {one(T.supplier, lang)}：______________________　{one(T.date, lang)}：____________
            </p>
          ) : null}
        </article>
      </div>
    </div>
  );
}

function Row({ label, quotes, rfq, f, digits = 3, strong }: { label: string; quotes: Quote[]; rfq: boolean; f: (q: Quote) => number; digits?: number; strong?: boolean }) {
  return (
    <tr className={strong ? "qs-strong" : undefined}>
      <td>{label}</td>
      {quotes.map((q) => (
        <td key={q.qty}>{rfq ? "" : yuan(f(q), digits)}</td>
      ))}
    </tr>
  );
}

const PRINT_CSS = `
@page { size: A4; margin: 14mm 12mm; }
* { box-sizing: border-box; }
body { margin: 0; font: 10pt/1.5 "PingFang SC","Hiragino Sans GB","Microsoft YaHei","Noto Sans CJK SC","Helvetica Neue",Arial,sans-serif; color: #111; }
h1 { font-size: 18pt; margin: 0 0 6pt; letter-spacing: 0.02em; }
h2 { font-size: 11pt; margin: 14pt 0 5pt; padding-bottom: 3pt; border-bottom: 1.2pt solid #111; }
.qs-head dl { display: grid; grid-template-columns: repeat(3, 1fr); gap: 3pt 14pt; margin: 0; }
.qs-head dt { font-size: 8pt; color: #555; } .qs-head dd { margin: 0; font-weight: 600; }
table { width: 100%; border-collapse: collapse; font-size: 8.6pt; page-break-inside: auto; }
th, td { border: 0.6pt solid #999; padding: 3pt 4pt; vertical-align: top; text-align: left; }
th { background: #eee; font-weight: 600; }
.qs-num td + td, .qs-num th + th { text-align: right; font-variant-numeric: tabular-nums; min-width: 22mm; }
.qs-strong td { font-weight: 700; background: #f4f4f4; }
.qs-lines td:nth-child(3), .qs-lines td:nth-child(4) { text-align: right; white-space: nowrap; }
small { color: #444; }
ul { margin: 4pt 0; padding-left: 14pt; } li { margin: 2pt 0; }
.qs-sign { margin-top: 22pt; }
tr { page-break-inside: avoid; }
`;
