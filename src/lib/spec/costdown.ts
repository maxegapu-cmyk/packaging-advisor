/**
 * Cost-down advice: the changes a packaging engineer would try first, each priced by running the
 * whole quote again on the changed package, with what it costs in look or protection. Every idea
 * is a complete package (applying one changes the 3D model and the print file with it), and
 * only those that save at least half a percent are kept.
 * Client-safe.
 */
import type { Pair } from "../i18n";
import { isRound, type PackSpec } from "../pack";
import { isFood, partsOf } from "../materials";
import { stock as bookStock } from "./book";
import { componentsOf, stockFor } from "./build";
import { quoteAt, type Quote } from "./quote";

export type Idea = { id: string; title: Pair; tradeoff: Pair; spec: PackSpec; unit: number; saving: number; share: number; total: number };

const P = (zh: string, en: string): Pair => ({ zh, en });
const clone = (s: PackSpec): PackSpec => JSON.parse(JSON.stringify(s));
const withPick = (s: PackSpec, key: string, patch: Record<string, unknown>): PackSpec => {
  const n = clone(s);
  n.materials = { ...(n.materials ?? {}), [key]: { ...(n.materials?.[key] ?? {}), ...patch } };
  return n;
};
const setStock = (s: PackSpec, key: string, id: string, gsm?: number): PackSpec => {
  const st = bookStock(id);
  return withPick(s, key, { stock: id, ...(st?.mid ? { id: st.mid } : {}), ...(gsm ? { gsm } : {}) });
};

/** The ideas for a package at one quantity, best saving first. */
export function costDown(spec: PackSpec, category: string, qty: number, base: Quote = quoteAt(spec, category, qty)): Idea[] {
  const tries: { id: string; title: Pair; tradeoff: Pair; spec: PackSpec }[] = [];
  const comps = componentsOf(spec, category);
  const food = isFood(category);

  /* 1. a size that fits more on the sheet: the main printed part, each dimension nudged down by up to 8 mm */
  if (!spec.inner && !isRound(spec.form)) {
    const main = comps.find((c) => c.kind === "sheet" && (c.key === "body" || c.key === "facing" || c.key === "wrap"));
    if (main) {
      const now = base.comps.find((q) => q.comp.key === main.key)?.imposition?.ups ?? 0;
      for (const k of ["w", "h", "d"] as const) {
        for (let cut = 1; cut <= 8; cut++) {
          const n = clone(spec);
          n[k] = spec[k] - cut;
          if (n[k] < 20) break;
          const q = quoteAt(n, category, qty);
          const ups = q.comps.find((x) => x.comp.key === main.key)?.imposition?.ups ?? 0;
          if (ups > now) {
            const dim = k === "w" ? P("宽", "width") : k === "h" ? P("高", "height") : P("深", "depth");
            tries.push({ id: `size-${k}`, title: P(`${dim.zh}减 ${cut} mm（${spec[k]}→${n[k]}），拼版 ${now}→${ups} 模`, `Take ${cut} mm off the ${dim.en} (${spec[k]}→${n[k]}): ${now}-up becomes ${ups}-up`), tradeoff: P("确认产品仍放得下；外观比例几乎不变。", "Check the product still fits; the proportions barely change."), spec: n });
            break;
          }
        }
      }
    }
  }

  /* 2. stocks: the cheaper grade the trade would offer */
  for (const { key, slot } of partsOf(spec)) {
    const s = stockFor(spec, key, slot, category);
    const c = comps.find((x) => x.key === key);
    const gsm = c?.gsm ?? s.gsm;
    if (s.id === "fbb" && !(food && slot.contact === "direct")) tries.push({ id: `${key}-duplex`, title: P(`${slot.label.zh}：白卡换灰底白板`, `${slot.label.en}: FBB to grey-back duplex`), tradeoff: P("内面变灰，印刷白度略低；不可接触食品。", "The inside turns grey and prints a little less white; not for food contact."), spec: setStock(spec, key, "duplex", gsm) });
    if ((s.kind === "board" || s.kind === "paper") && gsm && s.gsms) {
      const i = s.gsms.indexOf(gsm);
      if (i > 0 && s.gsms[i - 1] >= (s.kind === "board" ? 250 : 105)) {
        const down = s.gsms[i - 1];
        tries.push({ id: `${key}-gsm`, title: P(`${slot.label.zh}：${gsm} g 降到 ${down} g`, `${slot.label.en}: ${gsm} gsm down to ${down}`), tradeoff: s.kind === "board" ? P("挺度下降，大尺寸或重物需打样确认抗压。", "Less stiff: sample it for large or heavy products.") : P("裱纸更薄，灰板接缝更容易透出。", "A thinner wrap shows board joins more easily."), spec: setStock(spec, key, s.id, down) });
      }
    }
    if (s.kind === "special") tries.push({ id: `${key}-art`, title: P(`${slot.label.zh}：特种纸换 157 g 铜版纸覆膜`, `${slot.label.en}: speciality paper to 157 gsm art paper, laminated`), tradeoff: P("失去纸张本身的纹理与手感，靠覆膜和印刷表现。", "Loses the paper's own texture; the look comes from print and film instead."), spec: setStock(spec, key, "art", 157) });
    if (s.kind === "greyboard" && gsm && gsm > 1000) tries.push({ id: `${key}-thinner`, title: P(`${slot.label.zh}：灰板 ${gsm} g 降到 1000 g（约 1.5 mm）`, `${slot.label.en}: greyboard ${gsm} down to 1000 gsm (about 1.5 mm)`), tradeoff: P("盒子手感变轻，边角略软。", "The box feels lighter, edges a little softer."), spec: setStock(spec, key, s.id, 1000) });
    if (s.id === "greyboardHD") tries.push({ id: `${key}-std`, title: P(`${slot.label.zh}：高密度灰板换普通双灰板`, `${slot.label.en}: high-density to standard greyboard`), tradeoff: P("大尺寸翻盖更易翘曲。", "Large flaps warp more easily."), spec: setStock(spec, key, "greyboard", gsm) });
    if (s.id === "flockTray") tries.push({ id: `${key}-card`, title: P("植绒内托换卡纸内托", "Flocked tray to a card insert"), tradeoff: P("免模具、可回收，但质感与卡位精度不如植绒。", "No mould and recyclable, but less plush and less precise."), spec: setStock(spec, key, "fbb", 350) });
    if (s.id === "eva") tries.push({ id: `${key}-epe`, title: P("EVA 内托换 EPE 珍珠棉", "EVA tray to EPE foam"), tradeoff: P("更便宜，但表面粗糙、易掉屑。", "Cheaper, but a rougher surface that sheds."), spec: setStock(spec, key, "epe") });
    if (s.id === "petAlPe") tries.push({ id: `${key}-vmpet`, title: P("铝箔结构换镀铝结构", "Foil to metallised structure"), tradeoff: P("阻隔与避光略低，多数干货够用；保质期长的产品需测试。", "A little less barrier and light protection; enough for most dry goods, test for long shelf lives."), spec: setStock(spec, key, "petVmpetPe") });
    if (s.id === "labelPP") tries.push({ id: `${key}-art`, title: P("PP 合成纸标签换铜版不干胶", "PP synthetic label to coated paper"), tradeoff: P("遇水会起皱，浴室、冷藏产品不建议。", "Wrinkles when wet: not for bathroom or chilled products."), spec: setStock(spec, key, "labelArt") });
    if (s.id === "bSingle" && comps.some((x) => x.mount?.id === s.id)) tries.push({ id: `${key}-eflute`, title: P("裱 B 瓦改裱 E 瓦", "Mount on E-flute instead of B"), tradeoff: P("更薄、印刷面更平整，但缓冲变弱；3D 与刀模随之按 E 瓦厚度重画。", "Thinner with a flatter print face, but less cushioning; the 3D and the die are redrawn at E-flute thickness."), spec: setStock(spec, key, "eSingle") });
  }

  /* 3. finish and effects */
  if (spec.finish === "softTouch") tries.push({ id: "finish-matte", title: P("触感膜换哑膜", "Soft-touch to matte film"), tradeoff: P("失去肤感，视觉几乎一样。", "Loses the velvet feel; looks nearly the same."), spec: { ...clone(spec), finish: "matte" } });
  if (spec.finish === "matte") tries.push({ id: "finish-gloss", title: P("哑膜换光膜", "Matte to gloss film"), tradeoff: P("观感更亮、更显指纹，偏大众。", "Shinier and shows fingerprints: a more mass-market look."), spec: { ...clone(spec), finish: "gloss" } });
  const fx = spec.effects ?? [];
  if (fx.includes("holo")) tries.push({ id: "fx-holo", title: P("镭射烫改普通烫金", "Holographic foil to standard gold"), tradeoff: P("失去镭射闪光效果。", "Loses the rainbow effect."), spec: { ...clone(spec), effects: fx.map((e) => (e === "holo" ? "goldFoil" : e)) } });
  for (const e of ["emboss", "deboss", "letterpress", "spotUV"] as const)
    if (fx.includes(e)) {
      const name = e === "spotUV" ? P("局部 UV", "spot UV") : e === "emboss" ? P("击凸", "embossing") : e === "deboss" ? P("压凹", "debossing") : P("凸版压印", "letterpress");
      tries.push({ id: `fx-${e}`, title: P(`去掉${name.zh}`, `Drop the ${name.en}`), tradeoff: P("少一道工序和一块版，细节层次减少。", "One process and one die fewer; less depth in the detail."), spec: { ...clone(spec), effects: fx.filter((x) => x !== e) } });
    }

  /* 4. a shipper that carries more */
  const sh = spec.order?.shipper;
  if (sh && sh.per < 100) tries.push({ id: "shipper-more", title: P(`外箱每箱 ${sh.per} 只改 ${sh.per * 2} 只`, `${sh.per} a shipper to ${sh.per * 2}`), tradeoff: P("箱子更重，需确认单箱不超过 25 kg 与快递限制。", "Heavier cartons: keep each under 25 kg and within courier limits."), spec: { ...clone(spec), order: { ...spec.order, shipper: { ...sh, per: sh.per * 2 } } } });

  const out: Idea[] = [];
  for (const t of tries) {
    const q = quoteAt(t.spec, category, qty);
    const saving = base.unit - q.unit;
    if (saving / base.unit < 0.005) continue;
    out.push({ ...t, unit: q.unit, saving, share: saving / base.unit, total: saving * qty });
  }
  // one idea per id, best first
  return [...new Map(out.sort((a, b) => b.saving - a.saving).map((x) => [x.id, x])).values()];
}

/** The unit price at a larger order, for the "order more" line. */
export function nextTier(spec: PackSpec, category: string, qty: number, unit: number): { qty: number; unit: number } | null {
  const steps = [1000, 2000, 3000, 5000, 10000, 20000, 30000, 50000, 100000];
  const next = steps.find((s) => s > qty);
  if (!next) return null;
  const q = quoteAt(spec, category, next);
  return q.unit < unit ? { qty: next, unit: q.unit } : null;
}
