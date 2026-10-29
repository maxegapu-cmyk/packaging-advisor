"use client";

/**
 * The Quote tab of the 3D space: the package as a factory would quote it. The price per piece at
 * each order quantity, then every component with the stock it is ordered in (in the trade's own
 * names), its grammage, print and finishing, how it sits on the press sheet and what each line
 * costs, with its working. Changing a stock here changes the part's material (the 3D model, the
 * compliance checks and the print file follow). Then the cost-down ideas, each already priced,
 * the order's terms, and where every price comes from.
 */
import { useDeferredValue, useMemo, useState } from "react";
import type { Lang, Pair } from "@/lib/i18n";
import { FINISH_LABELS, FORM_LABELS, type PackSpec } from "@/lib/pack";
import { libraryVersion } from "@/lib/materials";
import { listStocks, priceOf, type BookStock } from "@/lib/spec/book";
import { costDown, nextTier } from "@/lib/spec/costdown";
import { withOrder, withPart, withStock } from "@/lib/spec/edit";
import { impositionText } from "@/lib/spec/impose";
import { DEFAULT_QTY, quoteTiers, yuan, type CompQuote, type Quote } from "@/lib/spec/quote";
import { CONFIDENCE_LABELS, sourceById, type Confidence } from "@/lib/spec/sources";
import { BASIS_UNIT, KIND_LABELS, type StockKind } from "@/lib/spec/stocks";

const one = (p: Pair, lang: Lang) => (lang === "en" ? p.en : p.zh);

const T = {
  lead: { zh: "按包装厂的报价方法逐项测算：材料按吨价或平方价、印刷按版费开机费和印工、后道按面积或次数并计起步价。每一项都能展开看算式。", en: "Worked out line by line the way packaging factories quote: stock by the tonne or m², printing by plates, make-ready and running, finishing by area or hit with minimum charges. Open any line to see its working." },
  perPiece: { zh: "每套单价", en: "Per pack" },
  withVat: { zh: "含 13% 增值税", en: "incl. 13% VAT" },
  noVat: { zh: "不含税", en: "net of VAT" },
  total: { zh: "合计", en: "Total" },
  oneOff: { zh: "一次性费用", en: "One-off costs" },
  oneOffHint: { zh: "印版、刀版、模具、打样等，与订量无关", en: "Plates, dies, moulds and proofs, whatever the quantity" },
  running: { zh: "每套变动成本", en: "Running cost per pack" },
  qty: { zh: "订量", en: "Quantity" },
  addQty: { zh: "添加订量", en: "Add a quantity" },
  removeQty: { zh: "移除这个订量", en: "Remove this quantity" },
  openSheet: { zh: "完整报价单与询价单", en: "Full quote and RFQ" },
  parts: { zh: "规格明细", en: "Specification" },
  partsNote: { zh: "换料号会同步改部件材料（3D、合规和印刷文件随之更新）。", en: "Changing a stock changes the part's material: the 3D model, compliance and print file follow." },
  stock: { zh: "料号", en: "Stock" },
  gsm: { zh: "克重", en: "Grammage" },
  flute: { zh: "瓦楞", en: "Flute" },
  front: { zh: "正面色数", en: "Outside colours" },
  back: { zh: "反面色数", en: "Inside colours" },
  spots: { zh: "其中专色", en: "of which spots" },
  colours: { zh: "印刷色数", en: "Colours" },
  surface: { zh: "表面", en: "Surface" },
  surfaceNote: { zh: "随外观里的表面工艺", en: "follows the finish in Look" },
  foil: { zh: "烫印面积", en: "Foil area" },
  emboss: { zh: "击凸面积", en: "Emboss area" },
  glue: { zh: "糊盒", en: "Gluing" },
  window: { zh: "开窗贴膜", en: "Window patch" },
  route: { zh: "工艺路线", en: "Route" },
  litho: { zh: "彩印裱坑", en: "Printed facing on flute" },
  direct: { zh: "瓦楞直接印刷", en: "Printed direct on flute" },
  auto: { zh: "自动选最省", en: "Cheapest automatically" },
  gravure: { zh: "凹版印刷", en: "Gravure" },
  digital: { zh: "数码印刷", en: "Digital" },
  mould: { zh: "非公模尺寸（需开模）", en: "Own size (needs a new mould)" },
  myCost: { zh: "我的采购价（元/套）", en: "My buying price (yuan a pack)" },
  myCostNote: { zh: "填了就用你的价格代替测算。", en: "When set, your price replaces the estimate." },
  imposition: { zh: "拼版", en: "Imposition" },
  working: { zh: "算式", en: "Working" },
  setupCol: { zh: "一次性", en: "One-off" },
  runCol: { zh: "变动", en: "Running" },
  share: { zh: "占比", en: "share" },
  ideas: { zh: "降本建议", en: "Ways to cost less" },
  ideasNote: { zh: "每条都按改动后的完整规格重新报价得出。", en: "Each is priced by quoting the whole changed package again." },
  apply: { zh: "应用", en: "Apply" },
  applied: { zh: "已应用", en: "Applied" },
  undo: { zh: "撤销", en: "Undo" },
  noIdeas: { zh: "当前规格已经比较精简，没有找到能省 0.5% 以上的改动。", en: "The spec is already lean: nothing found that saves 0.5% or more." },
  more: { zh: "订到", en: "At" },
  moreUnit: { zh: "单价降到", en: "the unit price falls to" },
  terms: { zh: "订单与条款", en: "Order and terms" },
  designs: { zh: "同版型款数（SKU）", en: "Designs sharing the run (SKUs)" },
  designsNote: { zh: "每款各出一套版和刀版外的印版，订量平分。", en: "Each design needs its own plates; the quantity is split between them." },
  shipper: { zh: "物流外箱", en: "Shipping carton" },
  noShipper: { zh: "不配外箱", en: "No shipping carton" },
  perCarton: { zh: "每箱只数", en: "Packs per carton" },
  vat: { zh: "开增值税专票（13%）", en: "With a VAT special invoice (13%)" },
  freight: { zh: "含运费（江浙沪）", en: "Include freight (Yangtze Delta)" },
  overhead: { zh: "管理费 %", en: "Overhead %" },
  margin: { zh: "利润 %", en: "Margin %" },
  sources: { zh: "价格依据", en: "Where the prices come from" },
  sourcesNote: { zh: "这是参考测算，不是工厂报价：市场行情注明了日期；“行业经验值”请用你的供应商报价替换（在价格库里改，这里立刻按你的价格算）。", en: "This is a reference estimate, not a factory's quote. Market prices carry their date; replace the trade ranges with your suppliers' quotes in the price book and this page recalculates at once." },
  priceBook: { zh: "打开价格库", en: "Open the price book" },
  lines: { zh: "项", en: "lines" },
  frozen: { zh: "设计已定稿：按定稿时的价格库报价。", en: "Signed off: quoted with the price book as it was then." },
  piece: { zh: "只", en: "pcs" },
  none: { zh: "不印", en: "None" },
  crash: { zh: "扣底（自动锁底）", en: "Crash-lock" },
  straight: { zh: "直线（插舌）", en: "Straight-line (tuck)" },
  hand: { zh: "手工", en: "By hand" },
  noGlue: { zh: "不糊", en: "None" },
} satisfies Record<string, Pair>;

const LAM_LABEL: Record<string, Pair> = {
  matte: { zh: "覆哑膜", en: "Matte film" },
  gloss: { zh: "覆光膜", en: "Gloss film" },
  soft: { zh: "覆触感膜", en: "Soft-touch film" },
  varnish: { zh: "过油", en: "Varnish" },
};

const money = (n: number, d = 2) => `¥${yuan(n, d)}`;
/** 5000 → "5,000"; 10000 → "1 万" / "10k". */
export const qtyText = (n: number, lang: Lang) => (lang === "zh" ? (n >= 10000 && n % 1000 === 0 ? `${n / 10000} 万` : n.toLocaleString("en-US")) : n >= 1000 && n % 100 === 0 ? `${n / 1000}k` : n.toLocaleString("en-US"));

export function SpecPanel({ spec, category, lang, onChange, onOpenSheet, priceBookHref, tier, onTier }: { spec: PackSpec; category: string; lang: Lang; onChange: (s: PackSpec) => void; onOpenSheet?: () => void; priceBookHref?: string; tier: number; onTier: (i: number) => void }) {
  const v = libraryVersion();
  const quotes = useMemo(() => quoteTiers(spec, category), [spec, category, v]); // eslint-disable-line react-hooks/exhaustive-deps
  const idx = Math.min(tier, quotes.length - 1);
  const q = quotes[idx];
  const deferred = useDeferredValue(spec);
  const ideas = useMemo(() => costDown(deferred, category, q.qty), [deferred, category, q.qty, v]); // eslint-disable-line react-hooks/exhaustive-deps
  const more = useMemo(() => nextTier(deferred, category, q.qty, q.unit), [deferred, category, q.qty, q.unit, v]); // eslint-disable-line react-hooks/exhaustive-deps
  const [undo, setUndo] = useState<{ spec: PackSpec; id: string } | null>(null);
  const [adding, setAdding] = useState("");
  const frozen = !!spec.frozen;
  const qtys = spec.order?.qty?.length ? spec.order.qty : DEFAULT_QTY;

  const setQtys = (list: number[]) => onChange(withOrder(spec, { qty: [...new Set(list)].filter((n) => n > 0).sort((a, b) => a - b).slice(0, 6) }));

  return (
    <div className="st-tabpanel sp" role="tabpanel">
      <p className="st-small sp-lead">{one(T.lead, lang)}</p>
      {frozen ? <p className="sp-frozen">{one(T.frozen, lang)}</p> : null}

      <section className="st-sec sp-sum" aria-live="polite">
        <div className="sp-price">
          <span className="sp-price-k">{one(T.perPiece, lang)}</span>
          <strong className="sp-price-v">{money(q.unit)}</strong>
          <span className="sp-price-u">
            {q.qty.toLocaleString("en-US")} {one(T.piece, lang)} · {one(q.withVat ? T.withVat : T.noVat, lang)}
          </span>
        </div>
        <div className="sp-tiers" role="radiogroup" aria-label={one(T.qty, lang)}>
          {quotes.map((x, i) => (
            <span key={x.qty} className={i === idx ? "sp-tier is-active" : "sp-tier"}>
              <button type="button" role="radio" aria-checked={i === idx} onClick={() => onTier(i)}>
                <b>{qtyText(x.qty, lang)}</b>
                <i>{money(x.unit)}</i>
              </button>
              {qtys.length > 1 ? (
                <button type="button" className="sp-tier-x" aria-label={`${one(T.removeQty, lang)} ${x.qty}`} onClick={() => setQtys(qtys.filter((n) => n !== x.qty))}>
                  ×
                </button>
              ) : null}
            </span>
          ))}
          {qtys.length < 6 ? (
            <form
              className="sp-tier-add"
              onSubmit={(e) => {
                e.preventDefault();
                const n = Math.round(Number(adding));
                if (n > 0 && n <= 1e8) setQtys([...qtys, n]);
                setAdding("");
              }}
            >
              <input type="number" inputMode="numeric" min={100} step={100} placeholder="+" aria-label={one(T.addQty, lang)} value={adding} onChange={(e) => setAdding(e.currentTarget.value)} />
            </form>
          ) : null}
        </div>
        <Curve quotes={quotes} idx={idx} />
        <dl className="sp-facts">
          <div>
            <dt>{one(T.total, lang)}</dt>
            <dd>{money(q.gross, 0)}</dd>
          </div>
          <div>
            <dt title={one(T.oneOffHint, lang)}>{one(T.oneOff, lang)}</dt>
            <dd>{money(q.setup, 0)}</dd>
          </div>
          <div>
            <dt>{one(T.running, lang)}</dt>
            <dd>{money(q.run / q.qty)}</dd>
          </div>
        </dl>
        {more ? (
          <p className="st-small">
            {one(T.more, lang)} {more.qty.toLocaleString("en-US")} {one(T.piece, lang)}，{one(T.moreUnit, lang)} {money(more.unit)}
            {lang === "en" ? "." : "。"}
          </p>
        ) : null}
        {q.warnings.length ? (
          <ul className="sp-warn">
            {q.warnings.map((w, i) => (
              <li key={i}>{one(w, lang)}</li>
            ))}
          </ul>
        ) : null}
        {onOpenSheet ? (
          <button type="button" className="btn btn-primary sp-open" onClick={onOpenSheet}>
            {one(T.openSheet, lang)}
          </button>
        ) : null}
      </section>

      <section className="st-sec">
        <div className="st-sec-row">
          <span className="st-label">{one(T.parts, lang)}</span>
        </div>
        <p className="st-small">{one(T.partsNote, lang)}</p>
        <fieldset className="sp-parts" disabled={frozen}>
          {q.comps
            .filter((c) => c.comp.key !== "job")
            .map((c) => (
              <PartRow key={c.comp.key} c={c} q={q} spec={spec} lang={lang} onChange={onChange} />
            ))}
          <JobRow c={q.comps.find((c) => c.comp.key === "job")} q={q} lang={lang} />
        </fieldset>
      </section>

      <section className="st-sec">
        <span className="st-label">{one(T.ideas, lang)}</span>
        <p className="st-small">{one(T.ideasNote, lang)}</p>
        {undo ? (
          <p className="sp-undo">
            {one(T.applied, lang)}
            <button
              type="button"
              className="st-link"
              onClick={() => {
                onChange(undo.spec);
                setUndo(null);
              }}
            >
              {one(T.undo, lang)}
            </button>
          </p>
        ) : null}
        {ideas.length ? (
          <ol className="sp-ideas">
            {ideas.slice(0, 7).map((x) => (
              <li key={x.id}>
                <div className="sp-idea-head">
                  <strong>{one(x.title, lang)}</strong>
                  <span className="sp-save">
                    −{money(x.saving)} <small>({(x.share * 100).toFixed(1)}%)</small>
                  </span>
                </div>
                <p>{one(x.tradeoff, lang)}</p>
                <div className="sp-idea-foot">
                  <span>
                    {q.qty.toLocaleString("en-US")} {one(T.piece, lang)}: −{money(x.total, 0)}
                  </span>
                  <button
                    type="button"
                    className="btn btn-quiet"
                    disabled={frozen}
                    onClick={() => {
                      setUndo({ spec, id: x.id });
                      onChange(x.spec);
                    }}
                  >
                    {one(T.apply, lang)}
                  </button>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="st-small">{one(T.noIdeas, lang)}</p>
        )}
      </section>

      <Terms spec={spec} lang={lang} onChange={onChange} frozen={frozen} />

      <Sources q={q} lang={lang} priceBookHref={priceBookHref} />
    </div>
  );
}

/** Price per pack against quantity: one bar per quoted quantity. */
function Curve({ quotes, idx }: { quotes: Quote[]; idx: number }) {
  const max = Math.max(...quotes.map((q) => q.unit));
  return (
    <div className="sp-curve" aria-hidden="true">
      {quotes.map((q, i) => (
        <span key={q.qty} className={i === idx ? "is-active" : ""} style={{ height: `${Math.max(8, (q.unit / max) * 100)}%` }} />
      ))}
    </div>
  );
}

function Badge({ conf, date, lang }: { conf: Confidence; date?: string; lang: Lang }) {
  return (
    <span className={`sp-badge sp-badge-${conf}`} title={one(CONFIDENCE_LABELS[conf], lang)}>
      {one(CONFIDENCE_LABELS[conf], lang).split("，")[0].split(",")[0]}
      {date ? ` · ${date}` : ""}
    </span>
  );
}

function stockOptions(kinds: StockKind[], current?: BookStock) {
  const list = listStocks(...kinds);
  if (current && !list.some((s) => s.id === current.id)) list.unshift(current);
  const groups = kinds.map((k) => ({ k, items: list.filter((s) => s.kind === k) })).filter((g) => g.items.length);
  return groups;
}

function StockSelect({ id, value, kinds, lang, onPick }: { id: string; value: BookStock; kinds: StockKind[]; lang: Lang; onPick: (id: string) => void }) {
  const groups = stockOptions(kinds, value);
  return (
    <select id={id} className="mat-select" value={value.id} onChange={(e) => onPick(e.currentTarget.value)}>
      {groups.map((g) => (
        <optgroup key={g.k} label={one(KIND_LABELS[g.k], lang)}>
          {g.items.map((s) => (
            <option key={s.id} value={s.id}>
              {one(s.name, lang)} · {s.price === null ? "≈" : ""}
              {yuan(priceOf(s), s.basis === "ton" ? 0 : 2)} {one(BASIS_UNIT[s.basis], lang)}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}

function Num({ id, value, min = 0, max, step = 1, onSet, placeholder }: { id?: string; value?: number; min?: number; max?: number; step?: number; onSet: (n: number | undefined) => void; placeholder?: string }) {
  return (
    <input
      id={id}
      className="sp-num"
      type="number"
      inputMode="decimal"
      min={min}
      max={max}
      step={step}
      placeholder={placeholder}
      value={value ?? ""}
      onChange={(e) => {
        const t = e.currentTarget.value;
        if (t === "") return onSet(undefined);
        const n = Number(t);
        if (Number.isFinite(n) && n >= min && (max === undefined || n <= max)) onSet(n);
      }}
    />
  );
}

function ColourSelect({ id, value, max, lang, onSet }: { id: string; value: number; max: number; lang: Lang; onSet: (n: number) => void }) {
  return (
    <select id={id} className="mat-select sp-mini" value={value} onChange={(e) => onSet(Number(e.currentTarget.value))}>
      {Array.from({ length: max + 1 }, (_, n) => (
        <option key={n} value={n}>
          {n === 0 ? one(T.none, lang) : `${n}${lang === "zh" ? " 色" : n === 1 ? " colour" : " colours"}`}
        </option>
      ))}
    </select>
  );
}

function PartRow({ c, q, spec, lang, onChange }: { c: CompQuote; q: Quote; spec: PackSpec; lang: Lang; onChange: (s: PackSpec) => void }) {
  const comp = c.comp;
  const key = comp.key;
  const s = comp.stock;
  const pick = spec.materials?.[key] ?? {};
  const per = c.total / q.qty;
  const share = q.direct ? c.total / q.direct : 0;
  const isShipper = key === "shipper";
  const editable = !!s && !!comp.options?.length;
  const inner = key.startsWith("inner.") && spec.inner ? FORM_LABELS[spec.inner.form] : null;
  const pid = `sp-${key.replace(/\./g, "-")}`;
  const setStock = (id: string, gsm?: number) => {
    if (isShipper) return onChange(withOrder(spec, { shipper: { ...(spec.order?.shipper ?? { per: 1 }), stock: id } }));
    onChange(withStock(spec, key, id, gsm));
  };

  return (
    <details className="sp-part">
      <summary>
        <span className="sp-part-name">
          {one(comp.label, lang)}
          {inner ? <small> · {one(inner, lang)}</small> : null}
          {comp.perPack !== 1 && !isShipper ? <small> × {comp.perPack}</small> : null}
        </span>
        <span className="sp-part-cost">
          {money(per)}
          <i style={{ width: `${Math.round(share * 100)}%` }} aria-hidden="true" />
        </span>
        <span className="sp-part-stock">
          {s ? one(s.name, lang) : ""}
          {comp.gsm ? ` ${comp.gsm} g` : ""}
          {comp.mount ? ` + ${one(comp.mount.name, lang)}` : ""}
          {c.bought ? (lang === "zh" ? " · 外购" : " · bought in") : ""}
        </span>
      </summary>
      <div className="sp-part-body">
        {editable ? (
          <div className="sp-field">
            <label htmlFor={`${pid}-stock`}>{one(T.stock, lang)}</label>
            <StockSelect id={`${pid}-stock`} value={s!} kinds={comp.options!} lang={lang} onPick={(id) => setStock(id)} />
            <Badge conf={s!.conf} date={s!.asOf} lang={lang} />
          </div>
        ) : null}
        {s?.gsms && comp.gsm && !isShipper ? (
          <div className="sp-field">
            <label htmlFor={`${pid}-gsm`}>{one(T.gsm, lang)}</label>
            <select id={`${pid}-gsm`} className="mat-select sp-mini" value={comp.gsm} onChange={(e) => setStock(s.id, Number(e.currentTarget.value))}>
              {[...new Set([...s.gsms, comp.gsm])]
                .sort((a, b) => a - b)
                .map((g) => (
                  <option key={g} value={g}>
                    {g} g{s.kind === "greyboard" ? `（≈${(g / 650).toFixed(1)} mm）` : ""}
                  </option>
                ))}
            </select>
          </div>
        ) : null}
        {comp.mount ? (
          <div className="sp-field">
            <label htmlFor={`${pid}-flute`}>{one(T.flute, lang)}</label>
            <StockSelect id={`${pid}-flute`} value={comp.mount} kinds={["flute"]} lang={lang} onPick={(id) => onChange(withStock(spec, "body", id))} />
          </div>
        ) : null}
        {(comp.kind === "sheet" && comp.mount) || (comp.kind === "flute" && !isShipper) ? (
          <div className="sp-field">
            <label htmlFor={`${pid}-route`}>{one(T.route, lang)}</label>
            <select id={`${pid}-route`} className="mat-select" value={comp.mount ? "litho" : "direct"} onChange={(e) => onChange(withPart(spec, "body", { route: e.currentTarget.value as "litho" | "direct", cf: e.currentTarget.value === "direct" ? 1 : undefined }))}>
              <option value="litho">{one(T.litho, lang)}</option>
              <option value="direct">{one(T.direct, lang)}</option>
            </select>
          </div>
        ) : null}
        {comp.kind === "flex" ? (
          <div className="sp-field">
            <label htmlFor={`${pid}-route`}>{one(T.route, lang)}</label>
            <select id={`${pid}-route`} className="mat-select" value={pick.route ?? ""} onChange={(e) => onChange(withPart(spec, key, { route: (e.currentTarget.value || undefined) as "gravure" | "digital" | undefined }))}>
              <option value="">{one(T.auto, lang)}</option>
              <option value="gravure">{one(T.gravure, lang)}</option>
              <option value="digital">{one(T.digital, lang)}</option>
            </select>
          </div>
        ) : null}
        {comp.kind === "sheet" ? (
          <div className="sp-grid">
            <div className="sp-field">
              <label htmlFor={`${pid}-cf`}>{one(T.front, lang)}</label>
              <ColourSelect id={`${pid}-cf`} value={comp.cf ?? 0} max={8} lang={lang} onSet={(n) => onChange(withPart(spec, key, { cf: n }))} />
            </div>
            <div className="sp-field">
              <label htmlFor={`${pid}-cb`}>{one(T.back, lang)}</label>
              <ColourSelect id={`${pid}-cb`} value={comp.cb ?? 0} max={6} lang={lang} onSet={(n) => onChange(withPart(spec, key, { cb: n }))} />
            </div>
            <div className="sp-field">
              <label htmlFor={`${pid}-spots`}>{one(T.spots, lang)}</label>
              <ColourSelect id={`${pid}-spots`} value={comp.spots ?? 0} max={4} lang={lang} onSet={(n) => onChange(withPart(spec, key, { spots: n }))} />
            </div>
          </div>
        ) : null}
        {comp.kind === "flex" || comp.kind === "label" || (comp.kind === "flute" && !comp.mount) ? (
          <div className="sp-field">
            <label htmlFor={`${pid}-cf`}>{one(T.colours, lang)}</label>
            <ColourSelect
              id={`${pid}-cf`}
              value={comp.cf ?? 0}
              max={comp.kind === "flute" ? 4 : 10}
              lang={lang}
              onSet={(n) => (isShipper ? onChange(withOrder(spec, { shipper: { ...(spec.order?.shipper ?? { per: 1 }), colours: Math.min(4, n) } })) : onChange(withPart(spec, key, { cf: n })))}
            />
          </div>
        ) : null}
        {comp.kind === "sheet" ? (
          <p className="sp-surface">
            <span>{one(T.surface, lang)}</span>
            {comp.lam ? one(LAM_LABEL[comp.lam], lang) : one(FINISH_LABELS[spec.finish], lang)}
            {comp.uv ? (lang === "zh" ? " + 局部 UV" : " + spot UV") : ""}
            <small>（{one(T.surfaceNote, lang)}）</small>
          </p>
        ) : null}
        {comp.foil ? (
          <div className="sp-field">
            <label htmlFor={`${pid}-foil`}>{one(T.foil, lang)} (cm²)</label>
            <Num id={`${pid}-foil`} value={pick.foil ?? comp.foil.cm2} max={20000} step={1} onSet={(n) => onChange(withPart(spec, key, { foil: n }))} />
          </div>
        ) : null}
        {comp.emboss ? (
          <div className="sp-field">
            <label htmlFor={`${pid}-emb`}>{one(T.emboss, lang)} (cm²)</label>
            <Num id={`${pid}-emb`} value={pick.emboss ?? comp.emboss} max={20000} step={1} onSet={(n) => onChange(withPart(spec, key, { emboss: n }))} />
          </div>
        ) : null}
        {key === "body" && spec.form === "carton" && comp.kind === "sheet" ? (
          <>
            <div className="sp-field">
              <label htmlFor={`${pid}-glue`}>{one(T.glue, lang)}</label>
              <select id={`${pid}-glue`} className="mat-select" value={comp.glue ?? "none"} onChange={(e) => onChange(withPart(spec, key, { glue: e.currentTarget.value as "straight" | "crash" | "hand" | "none" }))}>
                <option value="straight">{one(T.straight, lang)}</option>
                <option value="crash">{one(T.crash, lang)}</option>
                <option value="hand">{one(T.hand, lang)}</option>
                <option value="none">{one(T.noGlue, lang)}</option>
              </select>
            </div>
            <label className="sp-check">
              <input type="checkbox" checked={!!pick.window} onChange={(e) => onChange(withPart(spec, key, { window: e.currentTarget.checked || undefined }))} />
              {one(T.window, lang)}
            </label>
          </>
        ) : null}
        {comp.kind === "buy" && s?.tooling ? (
          <label className="sp-check">
            <input type="checkbox" checked={!!pick.mould} onChange={(e) => onChange(withPart(spec, key, { mould: e.currentTarget.checked || undefined }))} />
            {one(T.mould, lang)} · {money(s.tooling, 0)}
          </label>
        ) : null}
        {!isShipper ? (
          <div className="sp-field">
            <label htmlFor={`${pid}-own`}>{one(T.myCost, lang)}</label>
            <Num id={`${pid}-own`} value={pick.unitCost} step={0.01} max={1e6} placeholder={one(T.myCostNote, lang)} onSet={(n) => onChange(withPart(spec, key, { unitCost: n }))} />
          </div>
        ) : null}
        {comp.note ? <p className="st-small">{one(comp.note, lang)}</p> : null}
        {s?.note && editable ? <p className="st-small">{one(s.note, lang)}</p> : null}
        {c.imposition ? (
          <p className="sp-imp">
            <span>{one(T.imposition, lang)}</span>
            {impositionText(c.imposition, lang)}
          </p>
        ) : null}
        <Lines c={c} lang={lang} />
      </div>
    </details>
  );
}

function Lines({ c, lang }: { c: CompQuote; lang: Lang }) {
  return (
    <table className="sp-lines">
      <thead>
        <tr>
          <th scope="col">{one(T.working, lang)}</th>
          <th scope="col">{one(T.setupCol, lang)}</th>
          <th scope="col">{one(T.runCol, lang)}</th>
        </tr>
      </thead>
      <tbody>
        {c.lines.map((l, i) => (
          <tr key={i}>
            <td>
              <strong>{one(l.item, lang)}</strong>
              <small>{one(l.calc, lang)}</small>
            </td>
            <td>{l.setup ? yuan(l.setup, 0) : "—"}</td>
            <td>{l.run ? yuan(l.run, 0) : "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function JobRow({ c, q, lang }: { c?: CompQuote; q: Quote; lang: Lang }) {
  return (
    <details className="sp-part">
      <summary>
        <span className="sp-part-name">{lang === "zh" ? "打样、包装与费率" : "Proofs, packing and terms"}</span>
        <span className="sp-part-cost">{money((q.overhead + q.margin + q.vat + (c?.total ?? 0)) / q.qty)}</span>
        <span className="sp-part-stock">{lang === "zh" ? `管理费 ${money(q.overhead, 0)} · 利润 ${money(q.margin, 0)} · 增值税 ${money(q.vat, 0)}` : `overhead ${money(q.overhead, 0)} · margin ${money(q.margin, 0)} · VAT ${money(q.vat, 0)}`}</span>
      </summary>
      <div className="sp-part-body">
        {c ? <Lines c={c} lang={lang} /> : null}
        <p className="st-small">
          {lang === "zh"
            ? `管理费与利润只加在工厂加工的部分（${money(q.made, 0)}）；外购件（${money(q.bought, 0)}）按供应商价计入。`
            : `Overhead and margin apply to what the factory makes (${money(q.made, 0)}); bought-in parts (${money(q.bought, 0)}) pass at the supplier's price.`}
        </p>
      </div>
    </details>
  );
}

function Terms({ spec, lang, onChange, frozen }: { spec: PackSpec; lang: Lang; onChange: (s: PackSpec) => void; frozen: boolean }) {
  const o = spec.order ?? {};
  const sh = o.shipper;
  return (
    <section className="st-sec">
      <span className="st-label">{one(T.terms, lang)}</span>
      <fieldset className="sp-terms" disabled={frozen}>
        <div className="sp-field">
          <label htmlFor="sp-designs">{one(T.designs, lang)}</label>
          <Num id="sp-designs" value={o.designs ?? 1} min={1} max={50} onSet={(n) => onChange(withOrder(spec, { designs: n && n > 1 ? Math.round(n) : undefined }))} />
          <small>{one(T.designsNote, lang)}</small>
        </div>
        <div className="sp-field">
          <label htmlFor="sp-ship">{one(T.shipper, lang)}</label>
          <select id="sp-ship" className="mat-select" value={sh ? String(sh.per) : ""} onChange={(e) => onChange(withOrder(spec, { shipper: e.currentTarget.value ? { ...(sh ?? {}), per: Number(e.currentTarget.value) } : null }))}>
            <option value="">{one(T.noShipper, lang)}</option>
            {[...new Set([2, 4, 6, 8, 10, 12, 20, 24, 30, 40, 50, 60, 100, 200, ...(sh ? [sh.per] : [])])]
              .sort((a, b) => a - b)
              .map((n) => (
                <option key={n} value={n}>
                  {lang === "zh" ? `每箱 ${n} 只` : `${n} per carton`}
                </option>
              ))}
          </select>
        </div>
        <label className="sp-check">
          <input type="checkbox" checked={o.vat !== false} onChange={(e) => onChange(withOrder(spec, { vat: e.currentTarget.checked ? undefined : false }))} />
          {one(T.vat, lang)}
        </label>
        <label className="sp-check">
          <input type="checkbox" checked={!!o.freight} onChange={(e) => onChange(withOrder(spec, { freight: e.currentTarget.checked || undefined }))} />
          {one(T.freight, lang)}
        </label>
        <div className="sp-grid">
          <div className="sp-field">
            <label htmlFor="sp-oh">{one(T.overhead, lang)}</label>
            <Num id="sp-oh" value={o.overhead} max={200} step={0.5} placeholder="8" onSet={(n) => onChange(withOrder(spec, { overhead: n }))} />
          </div>
          <div className="sp-field">
            <label htmlFor="sp-mg">{one(T.margin, lang)}</label>
            <Num id="sp-mg" value={o.margin} max={200} step={0.5} placeholder="15" onSet={(n) => onChange(withOrder(spec, { margin: n }))} />
          </div>
        </div>
      </fieldset>
    </section>
  );
}

function Sources({ q, lang, priceBookHref }: { q: Quote; lang: Lang; priceBookHref?: string }) {
  const used = new Map<string, { conf: Confidence; date: string; title: string; url?: string }>();
  for (const c of q.comps) {
    for (const s of [c.comp.stock, c.comp.mount]) {
      if (!s) continue;
      const src = sourceById(s.src);
      used.set(`s:${s.id}`, { conf: s.conf, date: s.asOf, title: `${one(s.name, lang)} — ${src ? one(src.title, lang) : one(CONFIDENCE_LABELS[s.conf], lang)}`, url: src?.url });
    }
  }
  const counts: Partial<Record<Confidence, number>> = {};
  for (const x of used.values()) counts[x.conf] = (counts[x.conf] ?? 0) + 1;
  return (
    <section className="st-sec">
      <span className="st-label">{one(T.sources, lang)}</span>
      <p className="st-small">{one(T.sourcesNote, lang)}</p>
      <p className="sp-conf">
        {(Object.keys(counts) as Confidence[]).map((k) => (
          <Badge key={k} conf={k} lang={lang} />
        ))}
      </p>
      <ul className="sp-src">
        {[...used.values()].map((x) => (
          <li key={x.title}>
            <Badge conf={x.conf} date={x.date} lang={lang} /> {x.url ? <a href={x.url} target="_blank" rel="noreferrer">{x.title}</a> : x.title}
          </li>
        ))}
      </ul>
      {priceBookHref ? (
        <a className="st-link" href={priceBookHref}>
          {one(T.priceBook, lang)}
        </a>
      ) : null}
    </section>
  );
}
