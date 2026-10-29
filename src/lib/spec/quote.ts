/**
 * The quote engine: prices a package at an order quantity, component by component and line by
 * line, the way a packaging factory builds its quote. Every line carries its working (quantities,
 * rates, minimums) so a buyer can check it against a supplier's quote line for line. Printed
 * sheets are run on whichever sheet family, cut and press comes out cheapest. One-off costs
 * (plates, dies, cylinders, moulds, proofs) are kept apart from running costs, so the price per
 * piece can be shown falling with quantity.
 * Client-safe.
 */
import type { Pair } from "../i18n";
import type { PackSpec } from "../pack";
import { gsmOf, pct, priceOf, rate, type BookStock } from "./book";
import { componentsOf, type Comp } from "./build";
import { fullM2, impositions, impositionText, sheetM2, type Imposition } from "./impose";

export type Line = { item: Pair; calc: Pair; setup: number; run: number };
/** `bought`: bought in at the supplier's price (containers, inserts, your own buying prices): no overhead or margin on top. */
export type CompQuote = { comp: Comp; lines: Line[]; setup: number; run: number; total: number; bought: boolean; imposition?: Imposition; alt?: Imposition[]; warn?: Pair[]; massG?: number };
export type Quote = {
  qty: number;
  comps: CompQuote[];
  setup: number;
  run: number;
  /** made by the factory (overhead and margin apply) and bought in at cost */
  made: number;
  bought: number;
  direct: number;
  overhead: number;
  margin: number;
  net: number;
  vat: number;
  gross: number;
  /** per piece, net and with VAT (when quoted with VAT) */
  unitNet: number;
  unit: number;
  withVat: boolean;
  /** grams of packaging per pack, where every component's mass is known */
  massG: number;
  massKnown: boolean;
  warnings: Pair[];
};

const P = (zh: string, en: string): Pair => ({ zh, en });
export const yuan = (n: number, digits = 2) => n.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const n0 = (n: number) => Math.round(n).toLocaleString("en-US");
const r2 = (n: number) => Math.round(n * 100) / 100;

function line(item: Pair, calc: Pair, setup: number, run: number): Line {
  return { item, calc, setup: r2(setup), run: r2(run) };
}

/** Area-scaled price of a bought-in container at the pack's size (by surface, to the book's exponent). */
export function scaledPrice(s: BookStock, size?: { w: number; h: number; d: number }): number {
  const base = priceOf(s);
  if (!s.ref || !size) return base;
  const surf = (x: { w: number; h: number; d: number }) => 2 * (x.w * x.h + x.w * x.d + x.h * x.d);
  const ratio = surf(size) / surf(s.ref);
  if (Math.abs(ratio - 1) < 0.03) return base;
  return r2(base * Math.pow(Math.max(0.2, Math.min(6, ratio)), pct("buyin.scale")));
}

/* ------------------------------------------------------------------ printed sheets */

type SheetCtx = { qty: number; designs: number };

function sheetLines(c: Comp, imp: Imposition, ctx: SheetCtx): { lines: Line[]; warn: Pair[] } {
  const lines: Line[] = [];
  const s = c.stock!;
  const sets = Math.ceil((ctx.qty * c.perPack) / ctx.designs);
  const colours = (c.cf ?? 0) + (c.cb ?? 0);
  const steps = (c.lam ? 1 : 0) + (c.foil ? 1 : 0) + (c.emboss ? 1 : 0) + (c.uv ? 1 : 0) + (c.mount ? 1 : 0) + (c.die ? 1 : 0);
  const good = Math.ceil(sets / imp.ups);
  const overs = Math.ceil(good * pct("overs.pct")) + colours * rate("overs.colour") + steps * rate("overs.step");
  const press = good + overs;
  const full = Math.ceil(press / imp.cut);
  const m2 = sheetM2(imp);
  const D = ctx.designs;
  const des = (z: string, e: string) => (D > 1 ? { zh: `${z} × ${D} 款`, en: `${e} × ${D} designs` } : { zh: z, en: e });
  const text = impositionText(imp, "zh");
  const textEn = impositionText(imp, "en");

  // paper
  const gsm = c.gsm ?? gsmOf(s);
  if (s.basis === "ton") {
    const kg = (full * fullM2(imp.family) * gsm) / 1000;
    const cost = (kg / 1000) * priceOf(s) * D;
    lines.push(line(P(`${s.name.zh} ${gsm} g`, `${s.name.en} ${gsm} gsm`), des(`${text}；印张 ${n0(good)} + 放数 ${n0(overs)} = ${n0(press)} 张，折全张 ${n0(full)} 张 × ${fullM2(imp.family).toFixed(3)} ㎡ × ${gsm} g = ${n0(kg)} kg × ${n0(priceOf(s))} 元/吨`, `${textEn}; ${n0(good)} sheets + ${n0(overs)} overs = ${n0(press)}, ${n0(full)} full sheets × ${fullM2(imp.family).toFixed(3)} m² × ${gsm} g = ${n0(kg)} kg × ${n0(priceOf(s))} yuan/t`), 0, cost));
  } else if (s.basis === "m2") {
    const area = full * fullM2(imp.family);
    lines.push(line(s.name, des(`${text}；全张 ${n0(full)} 张 × ${fullM2(imp.family).toFixed(3)} ㎡ × ${priceOf(s)} 元/㎡`, `${textEn}; ${n0(full)} full sheets × ${fullM2(imp.family).toFixed(3)} m² × ${priceOf(s)} yuan/m²`), 0, area * priceOf(s) * D));
  }

  // printing
  if (colours) {
    const pl = rate(`plate.${imp.press}`);
    const mr = rate(`mr.${imp.press}`);
    const run = rate(`run.${imp.press}`);
    const extra = Math.max(0, press - 1000);
    const spotsCost = (c.spots ?? 0) * rate("spot");
    const sides = c.cb ? `${c.cf}+${c.cb}` : `${c.cf}+0`;
    lines.push(line(P(`印版 CTP（${sides} 色）`, `CTP plates (${sides})`), des(`${colours} 块 × ${pl} 元`, `${colours} plates × ${pl} yuan`), colours * pl * D, 0));
    lines.push(
      line(
        P("印刷（开机费 + 印工）", "Printing (make-ready and running)"),
        des(`${colours} 色 × ${mr} 元开机（含首 1000 张）+ ${n0(extra)} 张 × ${colours} 色 × ${run} 元/千${c.spots ? ` + 专色调墨 ${c.spots} × ${rate("spot")} 元` : ""}`, `${colours} colours × ${mr} make-ready (first 1,000 sheets) + ${n0(extra)} sheets × ${colours} × ${run} yuan/1,000${c.spots ? ` + spot ink ${c.spots} × ${rate("spot")}` : ""}`),
        colours * mr * D + spotsCost * D,
        ((extra * colours * run) / 1000) * D,
      ),
    );
  }

  // surface
  if (c.lam) {
    const id = c.lam === "varnish" ? "varnish" : `lam.${c.lam}`;
    const v = rate(id);
    const raw = press * m2 * v;
    const cost = Math.max(rate("lam.min"), raw);
    const name = c.lam === "matte" ? P("覆哑膜", "Matte lamination") : c.lam === "gloss" ? P("覆光膜", "Gloss lamination") : c.lam === "soft" ? P("覆触感膜", "Soft-touch lamination") : P("过油", "Varnish");
    lines.push(line(name, des(`${n0(press)} 张 × ${m2.toFixed(3)} ㎡ × ${v} 元/㎡${cost > raw ? `，按起步价 ${rate("lam.min")} 元` : ""}`, `${n0(press)} sheets × ${m2.toFixed(3)} m² × ${v} yuan/m²${cost > raw ? `; minimum ${rate("lam.min")} yuan` : ""}`), 0, cost * D));
  }
  if (c.uv) {
    const per = rate("uv.sheet") * (m2 / 0.53);
    const raw = press * per;
    const cost = Math.max(rate("uv.min"), raw);
    lines.push(line(P("局部 UV", "Spot UV"), des(`网版 ${rate("uv.plate")} 元 + ${n0(press)} 张 × ${per.toFixed(3)} 元${cost > raw ? `，按起步价 ${rate("uv.min")} 元` : ""}`, `screen ${rate("uv.plate")} + ${n0(press)} sheets × ${per.toFixed(3)}${cost > raw ? `; minimum ${rate("uv.min")}` : ""}`), rate("uv.plate") * D, cost * D));
  }
  if (c.foil) {
    const plateArea = c.foil.cm2 * imp.ups;
    const plate = Math.max(rate("foil.plateMin"), plateArea * rate("foil.plate"));
    const k = c.foil.holo ? pct("foil.holo") : 1;
    const raw = (press * rate("foil.hit") + sets * c.foil.cm2 * rate("foil.cm2")) * k;
    const cost = Math.max(rate("foil.min"), raw);
    lines.push(
      line(
        c.foil.holo ? P("烫镭射", "Holographic foil") : P("烫金 / 烫银", "Hot foil"),
        des(`烫金版 ${n0(plateArea)} cm²（${c.foil.cm2} cm² × ${imp.ups} 模）× ${rate("foil.plate")} 元；${n0(press)} 次 × ${rate("foil.hit")} 元 + 电化铝${c.foil.holo ? ` × 镭射 ${k}` : ""}${cost > raw ? `，按起步价 ${rate("foil.min")} 元` : ""}`, `die ${n0(plateArea)} cm² (${c.foil.cm2} cm² × ${imp.ups}-up) × ${rate("foil.plate")}; ${n0(press)} hits × ${rate("foil.hit")} + foil${c.foil.holo ? ` × ${k} holographic` : ""}${cost > raw ? `; minimum ${rate("foil.min")}` : ""}`),
        plate * D,
        cost * D,
      ),
    );
  }
  if (c.emboss) {
    const plateArea = c.emboss * imp.ups;
    const plate = Math.max(rate("emb.plateMin"), plateArea * rate("emb.plate"));
    const raw = press * rate("emb.hit");
    const cost = Math.max(rate("emb.min"), raw);
    lines.push(line(P("击凸 / 压凹", "Embossing"), des(`凹凸版 ${n0(plateArea)} cm² × ${rate("emb.plate")} 元；${n0(press)} 次 × ${rate("emb.hit")} 元${cost > raw ? `，按起步价 ${rate("emb.min")} 元` : ""}`, `die ${n0(plateArea)} cm² × ${rate("emb.plate")}; ${n0(press)} hits × ${rate("emb.hit")}${cost > raw ? `; minimum ${rate("emb.min")}` : ""}`), plate * D, cost * D));
  }
  if (c.mount) {
    const area = press * m2;
    const fl = priceOf(c.mount);
    const labour = Math.max(rate("mount.min"), area * rate("mount.m2"));
    lines.push(line(P(`裱坑：${c.mount.name.zh}`, `Mounting on ${c.mount.name.en}`), des(`${n0(press)} 张 × ${m2.toFixed(3)} ㎡ = ${n0(area)} ㎡ × (瓦楞 ${fl} + 裱工 ${rate("mount.m2")}) 元/㎡`, `${n0(press)} sheets × ${m2.toFixed(3)} m² = ${n0(area)} m² × (flute ${fl} + mounting ${rate("mount.m2")}) yuan/m²`), 0, (area * fl + labour) * D));
  }
  if (c.die) {
    const rule = (c.rule ?? 0) * imp.ups;
    const die = Math.max(rate("die.min"), rule * rate("die.rule"));
    const cutRate = rate(`cut.${imp.press}`);
    const raw = (press / 1000) * cutRate;
    const cost = Math.max(rate("cut.min"), raw);
    lines.push(line(P("刀版 + 模切", "Cutting die and die-cutting"), des(`刀线约 ${rule.toFixed(1)} m × ${rate("die.rule")} 元；${n0(press)} 张 × ${cutRate} 元/千${cost > raw ? `，按起步价 ${rate("cut.min")} 元` : ""}`, `about ${rule.toFixed(1)} m of rule × ${rate("die.rule")}; ${n0(press)} sheets × ${cutRate} yuan/1,000${cost > raw ? `; minimum ${rate("cut.min")}` : ""}`), die * D, cost * D));
  }
  if (c.window) lines.push(line(P("开窗贴膜", "Window patch"), P(`${n0(sets * D)} 只 × ${rate("window")} 元`, `${n0(sets * D)} × ${rate("window")} yuan`), 0, sets * D * rate("window")));
  if (c.glue) {
    const id = `glue.${c.glue}`;
    const raw = sets * D * rate(id);
    const cost = Math.max(rate("glue.min"), raw);
    const name = c.glue === "crash" ? P("糊盒（扣底）", "Gluing (crash-lock)") : c.glue === "hand" ? P("手工糊盒", "Hand gluing") : P("糊盒（直线）", "Gluing (straight-line)");
    lines.push(line(name, P(`${n0(sets * D)} 只 × ${rate(id)} 元${cost > raw ? `，按起步价 ${rate("glue.min")} 元` : ""}`, `${n0(sets * D)} × ${rate(id)} yuan${cost > raw ? `; minimum ${rate("glue.min")}` : ""}`), 0, cost));
  }
  if (c.rateId === "bag.hand") lines.push(line(P("手提袋成型穿绳", "Bag forming and roping"), P(`${n0(sets * D)} 只 × ${rate("bag.hand")} 元`, `${n0(sets * D)} × ${rate("bag.hand")} yuan`), 0, sets * D * rate("bag.hand")));
  return { lines, warn: [] };
}

function quoteSheet(c: Comp, ctx: SheetCtx): CompQuote {
  const blanks = c.blanks ?? [];
  // a set of several pieces (a lid wrap and a base wrap) is run side by side or one above the other, or each on its own
  const candidates: { blank: { w: number; h: number }; label: Pair }[] = [];
  if (blanks.length === 1) candidates.push({ blank: blanks[0], label: P("", "") });
  else if (blanks.length > 1) {
    candidates.push({ blank: { w: blanks.reduce((a, b) => a + b.w + 5, -5), h: Math.max(...blanks.map((b) => b.h)) }, label: P("成套并排", "set side by side") });
    candidates.push({ blank: { w: Math.max(...blanks.map((b) => b.w)), h: blanks.reduce((a, b) => a + b.h + 5, -5) }, label: P("成套上下排", "set one above the other") });
  }
  let best: { q: CompQuote; total: number } | null = null;
  const alts: Imposition[] = [];
  for (const cand of candidates) {
    for (const imp of impositions(cand.blank)) {
      const { lines, warn } = sheetLines(c, imp, ctx);
      const setup = lines.reduce((a, l) => a + l.setup, 0);
      const run = lines.reduce((a, l) => a + l.run, 0);
      alts.push(imp);
      if (!best || setup + run < best.total) best = { q: { comp: c, lines, setup, run, total: setup + run, bought: false, imposition: imp, warn }, total: setup + run };
    }
  }
  if (!best) return { comp: c, lines: [], setup: 0, run: 0, total: 0, bought: false, warn: [P("展开尺寸超过全张纸，无法上机，请减小尺寸或分拼。", "The blank is larger than a full sheet: make it smaller or split it.")] };
  best.q.alt = alts.sort((a, b) => b.ups / sheetM2(b) - a.ups / sheetM2(a)).slice(0, 6);
  const area = blanks.reduce((a, b) => a + b.area, 0);
  best.q.massG = area * (c.gsm ?? gsmOf(c.stock!)) * c.perPack + (c.mount ? area * gsmOf(c.mount) * c.perPack : 0);
  return best.q;
}

/* ------------------------------------------------------------------ other components */

function quoteComp(c: Comp, qty: number, designs: number): CompQuote {
  if (c.kind === "sheet") return quoteSheet(c, { qty, designs });
  const s = c.stock;
  const n = Math.ceil(qty * c.perPack);
  const lines: Line[] = [];
  const warn: Pair[] = [];
  let massG: number | undefined;
  switch (c.kind) {
    case "rigid": {
      const area = c.area ?? 0;
      const gsm = c.gsm ?? gsmOf(s!);
      const kg = (n * area * gsm) / 1000 / 0.85;
      lines.push(line(P(`${s!.name.zh} ${gsm} g（约 ${(gsm / 650).toFixed(1)} mm）`, `${s!.name.en} ${gsm} gsm (about ${(gsm / 650).toFixed(1)} mm)`), P(`每套板面 ${area.toFixed(3)} ㎡ × ${n0(n)} 套 ÷ 开料利用率 85% × ${gsm} g = ${n0(kg)} kg × ${n0(priceOf(s!))} 元/吨`, `${area.toFixed(3)} m² a set × ${n0(n)} ÷ 85% cutting yield × ${gsm} g = ${n0(kg)} kg × ${n0(priceOf(s!))} yuan/t`), 0, (kg / 1000) * priceOf(s!)));
      massG = area * gsm * c.perPack;
      if (c.rateId) {
        lines.push(line(P("灰板开料 / V 槽", "Board cutting and V-grooving"), P(`${n0(n)} 套 × ${rate("rigid.cut")} 元`, `${n0(n)} × ${rate("rigid.cut")} yuan`), 0, n * rate("rigid.cut")));
        const raw = n * rate(c.rateId);
        const cost = Math.max(rate("rigid.min"), raw);
        lines.push(line(P("成型裱糊（手工）", "Forming and wrapping (handwork)"), P(`${n0(n)} 套 × ${rate(c.rateId)} 元${cost > raw ? `，按起步价 ${rate("rigid.min")} 元` : ""}`, `${n0(n)} × ${rate(c.rateId)} yuan${cost > raw ? `; minimum ${rate("rigid.min")}` : ""}`), 0, cost));
      }
      break;
    }
    case "tube": {
      const area = c.area ?? 0;
      const gsm = c.gsm ?? gsmOf(s!);
      const kg = (n * area * gsm) / 1000 / 0.92;
      lines.push(line(P(`${s!.name.zh} ${gsm} g`, `${s!.name.en} ${gsm} gsm`), P(`每只卷制面积 ${area.toFixed(3)} ㎡（约 5 层）× ${n0(n)} 只 ÷ 92% × ${gsm} g = ${n0(kg)} kg × ${n0(priceOf(s!))} 元/吨`, `${area.toFixed(3)} m² wound per tube (about 5 plies) × ${n0(n)} ÷ 92% × ${gsm} g = ${n0(kg)} kg × ${n0(priceOf(s!))} yuan/t`), 0, (kg / 1000) * priceOf(s!)));
      massG = area * gsm * c.perPack;
      const raw = n * rate("rigid.tube");
      lines.push(line(P("卷管、裁切、裱纸、封底", "Winding, cutting, wrapping and ends"), P(`${n0(n)} 只 × ${rate("rigid.tube")} 元`, `${n0(n)} × ${rate("rigid.tube")} yuan`), 0, Math.max(rate("rigid.min"), raw)));
      break;
    }
    case "flute": {
      const area = c.area ?? 0;
      const price = priceOf(s!);
      const board = n * area * 1.05;
      lines.push(line(s!.name, P(`每只展开 ${area.toFixed(3)} ㎡ × ${n0(n)} 只 × 1.05（修边）× ${price} 元/㎡`, `${area.toFixed(3)} m² a blank × ${n0(n)} × 1.05 trim × ${price} yuan/m²`), 0, board * price));
      massG = area * gsmOf(s!) * c.perPack;
      const colours = c.cf ?? 0;
      if (colours) {
        const face = c.blanks?.[0] ? Math.min(c.blanks[0].w * c.blanks[0].h * 0.3, 2400) / 100 : Math.min((c.size?.w ?? 300) * (c.size?.h ?? 300), 30000) / 100 / 2;
        const plate = colours * Math.max(100, face * rate("flexo.plate"));
        const raw = n * colours * rate("flexo.run");
        lines.push(line(P(`水印印刷（${colours} 色）`, `Flexo printing (${colours} colour${colours > 1 ? "s" : ""})`), P(`树脂版 ${colours} 块约 ${n0(face)} cm² × ${rate("flexo.plate")} 元；${n0(n)} 只 × ${colours} 色 × ${rate("flexo.run")} 元`, `${colours} plates of about ${n0(face)} cm² × ${rate("flexo.plate")}; ${n0(n)} × ${colours} × ${rate("flexo.run")} yuan`), plate, Math.max(rate("flexo.min"), raw)));
      }
      if (c.die) {
        const rule = c.rule ?? 0;
        const die = Math.max(rate("die.min"), rule * rate("die.rule"));
        lines.push(line(P("刀版 + 模切（瓦楞）", "Cutting die and die-cutting (corrugated)"), P(`刀线约 ${rule.toFixed(1)} m × ${rate("die.rule")} 元；${n0(n)} 张 × ${rate("cut.f")} 元/千`, `about ${rule.toFixed(1)} m × ${rate("die.rule")}; ${n0(n)} × ${rate("cut.f")} yuan/1,000`), die, Math.max(rate("cut.min"), (n / 1000) * rate("cut.f"))));
      } else lines.push(line(P("开槽成型、钉 / 粘箱", "Slotting and joining"), P(`${n0(n)} 只 × ${rate("box.make")} 元`, `${n0(n)} × ${rate("box.make")} yuan`), 0, n * rate("box.make")));
      break;
    }
    case "flex": {
      const area = c.area ?? 0;
      const colours = c.cf ?? 5;
      const moq = rate("pouch.moq");
      const waste = pct("pouch.overs");
      const making = rate(c.rateId ?? "pouch.stand");
      const per = Math.ceil(n / designs);
      const gravure = () => {
        const run = Math.max(per, moq);
        return {
          lines: [
            line(P(`凹印版辊（${colours} 色）`, `Gravure cylinders (${colours} colours)`), P(`${colours} 支 × ${rate("cyl")} 元${designs > 1 ? ` × ${designs} 款` : ""}`, `${colours} × ${rate("cyl")} yuan${designs > 1 ? ` × ${designs} designs` : ""}`), colours * rate("cyl") * designs, 0),
            line(s!.name, P(`每只 ${area.toFixed(4)} ㎡ × ${n0(run)} 只${run > per ? `（不足起订量按 ${n0(moq)} 只计）` : ""} × (1 + 损耗 ${Math.round(waste * 100)}%) × ${priceOf(s!)} 元/㎡（含印刷复合）${designs > 1 ? ` × ${designs} 款` : ""}`, `${area.toFixed(4)} m² a pouch × ${n0(run)}${run > per ? ` (below the minimum, charged at ${n0(moq)})` : ""} × (1 + ${Math.round(waste * 100)}% waste) × ${priceOf(s!)} yuan/m² printed and laminated${designs > 1 ? ` × ${designs} designs` : ""}`), 0, run * area * (1 + waste) * priceOf(s!) * designs),
            line(P("制袋", "Pouch making"), P(`${n0(run * designs)} 只 × ${making} 元`, `${n0(run * designs)} × ${making} yuan`), 0, run * designs * making),
          ],
          warn: per < moq ? [P(`凹印起订量约 ${n0(moq)} 只，当前每款 ${n0(per)} 只按起订量计价；数码印刷可能更省。`, `Gravure's minimum is about ${n0(moq)}; ${n0(per)} a design is charged at the minimum. Digital print may cost less.`)] : [],
        };
      };
      const digital = () => ({
        lines: [
          line(P(`${s!.name.zh}（数码印刷）`, `${s!.name.en} (digital print)`), P(`每只 ${area.toFixed(4)} ㎡ × ${n0(n)} 只 × 1.05 × ${rate("pouch.digital")} 元/㎡（免版）`, `${area.toFixed(4)} m² × ${n0(n)} × 1.05 × ${rate("pouch.digital")} yuan/m² (no cylinders)`), 0, n * area * 1.05 * rate("pouch.digital")),
          line(P("制袋", "Pouch making"), P(`${n0(n)} 只 × ${making} 元`, `${n0(n)} × ${making} yuan`), 0, n * making),
        ],
        warn: [] as Pair[],
      });
      const g = gravure();
      const d = digital();
      const sum = (x: { lines: Line[] }) => x.lines.reduce((a, l) => a + l.setup + l.run, 0);
      const useDigital = c.route === "digital" || (c.route !== "gravure" && sum(d) < sum(g));
      const pickd = useDigital ? d : g;
      lines.push(...pickd.lines);
      warn.push(...pickd.warn);
      massG = area * gsmOf(s!) * c.perPack;
      break;
    }
    case "label": {
      const area = (c.area ?? 0) * 1.15;
      const colours = c.cf ?? 4;
      const raw = n * area * (priceOf(s!) + rate("label.print"));
      lines.push(line(P(`${s!.name.zh}标签（${colours} 色）`, `${s!.name.en} labels (${colours} colours)`), P(`版 ${colours} × ${rate("label.plate")} 元 + 刀模 ${rate("label.die")} 元；${n0(n)} 套 × ${(c.area ?? 0).toFixed(4)} ㎡ × 1.15（排废）× (材料 ${priceOf(s!)} + 印刷 ${rate("label.print")}) 元/㎡`, `plates ${colours} × ${rate("label.plate")} + die ${rate("label.die")}; ${n0(n)} sets × ${(c.area ?? 0).toFixed(4)} m² × 1.15 matrix × (stock ${priceOf(s!)} + print ${rate("label.print")}) yuan/m²`), (colours * rate("label.plate") + rate("label.die")) * designs, Math.max(rate("label.min"), raw)));
      lines.push(line(P("贴标", "Labelling"), P(`${n0(n)} × ${rate("label.apply")} 元`, `${n0(n)} × ${rate("label.apply")} yuan`), 0, n * rate("label.apply")));
      massG = (c.area ?? 0) * gsmOf(s!) * c.perPack;
      break;
    }
    case "fabric": {
      const area = c.area ?? 0;
      lines.push(line(s!.name, P(`每只 ${area.toFixed(3)} ㎡ × ${n0(n)} × ${priceOf(s!)} 元/㎡`, `${area.toFixed(3)} m² × ${n0(n)} × ${priceOf(s!)} yuan/m²`), 0, n * area * priceOf(s!)));
      break;
    }
    case "insert": {
      const st = s!;
      let unit: number;
      let calc: Pair;
      if (st.basis === "litre") {
        unit = (c.volume ?? 0) * priceOf(st);
        calc = P(`外形体积 ${(c.volume ?? 0).toFixed(2)} L × ${priceOf(st)} 元/L`, `${(c.volume ?? 0).toFixed(2)} L block × ${priceOf(st)} yuan/L`);
      } else {
        unit = (c.area ?? 0) * priceOf(st);
        calc = P(`投影面积 ${(c.area ?? 0).toFixed(3)} ㎡ × ${priceOf(st)} 元/㎡`, `${(c.area ?? 0).toFixed(3)} m² footprint × ${priceOf(st)} yuan/m²`);
      }
      lines.push(line(st.name, { zh: `${calc.zh} = ${unit.toFixed(2)} 元 × ${n0(n)}${st.tooling ? `；模具 ${n0(st.tooling)} 元` : ""}`, en: `${calc.en} = ${unit.toFixed(2)} × ${n0(n)}${st.tooling ? `; mould ${n0(st.tooling)} yuan` : ""}` }, st.tooling ?? 0, unit * n));
      if (st.moq && n < st.moq) warn.push(P(`${st.name.zh}起订量约 ${n0(st.moq)} 只。`, `${st.name.en}: minimum order about ${n0(st.moq)}.`));
      break;
    }
    case "buy": {
      const st = s!;
      const unit = scaledPrice(st, c.size);
      const scaled = unit !== priceOf(st);
      lines.push(line(st.name, P(`${n0(n)} × ${unit} 元${scaled && st.ref ? `（参考价 ${priceOf(st)} 元按尺寸 ${st.ref.w}×${st.ref.h} → ${Math.round(c.size!.w)}×${Math.round(c.size!.h)} 换算）` : ""}`, `${n0(n)} × ${unit} yuan${scaled && st.ref ? ` (reference ${priceOf(st)} scaled from ${st.ref.w}×${st.ref.h} to ${Math.round(c.size!.w)}×${Math.round(c.size!.h)})` : ""}`), 0, n * unit));
      if (st.setup) lines.push(line(P("印刷版费 / 设计开版", "Print plates and set-up"), P(`${st.setup} 元${designs > 1 ? ` × ${designs} 款` : ""}`, `${st.setup} yuan${designs > 1 ? ` × ${designs} designs` : ""}`), st.setup * designs, 0));
      if (c.mould && st.tooling) lines.push(line(P("开模费（非公模尺寸）", "New mould (non-stock size)"), P(`${n0(st.tooling)} 元`, `${n0(st.tooling)} yuan`), st.tooling, 0));
      if (st.moq && n < st.moq) warn.push(P(`${st.name.zh}起订量约 ${n0(st.moq)}，当前 ${n0(n)}。`, `${st.name.en}: minimum order about ${n0(st.moq)}; this order needs ${n0(n)}.`));
      break;
    }
    case "labour": {
      lines.push(line(c.label, P(`${n0(n)} × ${rate(c.rateId!)} 元`, `${n0(n)} × ${rate(c.rateId!)} yuan`), 0, n * rate(c.rateId!)));
      massG = 0;
      break;
    }
  }
  const setup = lines.reduce((a, l) => a + l.setup, 0);
  const run = lines.reduce((a, l) => a + l.run, 0);
  return { comp: c, lines, setup, run, total: setup + run, bought: c.kind === "buy" || c.kind === "insert", warn, massG };
}

/** The seller's own figure for a component replaces the worked-out price. */
function own(q: CompQuote, qty: number): CompQuote {
  const u = q.comp.unitCost;
  if (u === undefined) return q;
  const total = u * qty;
  return { ...q, lines: [line(P("你的采购价", "Your buying price"), P(`${n0(qty)} × ${u} 元（覆盖测算）`, `${n0(qty)} × ${u} yuan (replaces the estimate)`), 0, total)], setup: 0, run: total, total, bought: true };
}

export function quoteAt(spec: PackSpec, category: string, qty: number, comps = componentsOf(spec, category)): Quote {
  const designs = spec.order?.designs ?? 1;
  const out: CompQuote[] = comps.map((c) => own(quoteComp(c, qty, designs), qty));
  const extra: Line[] = [];
  extra.push(line(P("打样（数码样 + 白样）", "Proofs (digital and white sample)"), P(`${designs} 款 × ${rate("proof")} 元`, `${designs} × ${rate("proof")} yuan`), designs * rate("proof"), 0));
  extra.push(line(P("包装入箱", "Packing"), P(`${n0(qty)} × ${rate("pack")} 元`, `${n0(qty)} × ${rate("pack")} yuan`), 0, qty * rate("pack")));
  const massKnown = out.every((q) => q.massG !== undefined || q.comp.kind === "buy" || q.comp.kind === "insert" || q.comp.kind === "fabric");
  const massG = out.reduce((a, q) => a + (q.massG ?? 0), 0);
  if (spec.order?.freight) {
    const kg = (massG * qty) / 1000;
    extra.push(line(P("运费（估）", "Freight (estimate)"), P(`约 ${n0(kg)} kg（已知部件）× ${rate("freight")} 元/kg`, `about ${n0(kg)} kg (known parts) × ${rate("freight")} yuan/kg`), 0, kg * rate("freight")));
  }
  out.push({ comp: { key: "job", label: P("打样、包装与运输", "Proofs, packing and freight"), kind: "labour", perPack: 1 }, bought: false, lines: extra, setup: extra.reduce((a, l) => a + l.setup, 0), run: extra.reduce((a, l) => a + l.run, 0), total: extra.reduce((a, l) => a + l.setup + l.run, 0) });
  const setup = out.reduce((a, q) => a + q.setup, 0);
  const run = out.reduce((a, q) => a + q.run, 0);
  const direct = setup + run;
  const made = out.filter((q) => !q.bought).reduce((a, q) => a + q.total, 0);
  const bought = direct - made;
  // overhead and margin on what the factory makes; bought-in parts pass at the supplier's price
  const overhead = made * ((spec.order?.overhead ?? rate("overhead")) / 100);
  const margin = (made + overhead) * ((spec.order?.margin ?? rate("margin")) / 100);
  const netTotal = direct + overhead + margin;
  const withVat = spec.order?.vat !== false;
  const vat = withVat ? netTotal * pct("vat") : 0;
  const gross = netTotal + vat;
  const warnings = out.flatMap((q) => q.warn ?? []);
  return { qty, comps: out, setup, run, made, bought, direct, overhead, margin, net: netTotal, vat, gross, unitNet: netTotal / qty, unit: gross / qty, withVat, massG, massKnown, warnings };
}

export const DEFAULT_QTY = [1000, 3000, 5000, 10000];

/** Quotes at each quantity of the order (or the defaults). */
export function quoteTiers(spec: PackSpec, category: string): Quote[] {
  const comps = componentsOf(spec, category);
  return (spec.order?.qty?.length ? spec.order.qty : DEFAULT_QTY).map((q) => quoteAt(spec, category, q, comps));
}
