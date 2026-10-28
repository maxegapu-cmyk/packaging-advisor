/**
 * Over-packaging checks, computed from the package as it is set out in the app: GB 23350-2021
 * for food and cosmetics sales packaging (void ratio, layers, cost, tea's mass rule) and
 * GB 45186-2024 for courier boxes (layers, box size against the item, tape). The numbers come
 * from the material library's limits (defaults in limits.ts).
 *
 *   Void ratio X = (Vn − Σ k·V0) / Vn, where Vn is the outer sales package's volume, V0 the
 *   contents' volume (1 g or 1 mL counts as 1 cm³) and k the kind's necessary-space coefficient.
 *   The limit follows the single unit's net content Q. Round packs are measured here by their
 *   circumscribed box, which errs on the strict side; an inspection body's measurement decides.
 *
 * Pure and client-safe.
 */
import type { Pair } from "../i18n";
import { comboLayout, isRound, outerSize, type ContentInfo, type PackSpec } from "../pack";
import { getLibrary, isCosmetic, isFood, usageOf } from "../materials";
import { mergeLimits, type Kind, type Limits } from "./limits";

export type Level = "error" | "warn" | "ok" | "info";
export type OverCheck = { id: string; level: Level; title: Pair; detail: Pair; rule: string };

const P = (zh: string, en: string): Pair => ({ zh, en });
const f1 = (n: number) => (Math.round(n * 10) / 10).toLocaleString("en-US");
const f0 = (n: number) => Math.round(n).toLocaleString("en-US");

export const limitsInForce = (): Limits => mergeLimits(getLibrary().limits);

/** The kind a product starts as, from its category (tea is tea; others are chosen). */
export function defaultKind(category: string): string | undefined {
  if (category === "tea") return "tea";
  return undefined;
}

export function kindOf(c: ContentInfo | undefined, category: string, limits = limitsInForce()): Kind | undefined {
  const id = c?.kind ?? defaultKind(category);
  return limits.kinds.find((k) => k.id === id);
}

/** The k in force: the seller's, else the kind's. */
export const kOf = (c: ContentInfo | undefined, kind: Kind | undefined): number | null => c?.k ?? kind?.k ?? null;

/** The void-ratio limit (%) for a single unit's net content. */
export function voidLimit(q: number, limits = limitsInForce()): number {
  const band = limits.voidBands.find((b) => b.upTo === null || q <= b.upTo);
  return band?.limit ?? limits.voidBands[limits.voidBands.length - 1].limit;
}

/** The units packed: a combination's count, otherwise one. */
const unitsOf = (spec: PackSpec) => spec.inner?.count ?? 1;

/** Outer volume in cm³, and whether it was measured as a circumscribed box. */
export function outerVolume(spec: PackSpec): { cm3: number; boxed: boolean } {
  const o = outerSize(spec);
  return { cm3: (o.w * o.h * (isRound(spec.form) ? o.w : o.d)) / 1000, boxed: isRound(spec.form) };
}

/** Sales-packaging layers: the model's (the product's own pack, then the outer one) plus the seller's. */
export function layersOf(spec: PackSpec): { shown: number; extra: number; total: number } {
  const shown = spec.inner ? 2 : 1;
  const extra = spec.content?.extraLayers ?? 0;
  return { shown, extra, total: shown + extra };
}

export function overpackChecks(spec: PackSpec, category: string): OverCheck[] {
  const L = limitsInForce();
  const out: OverCheck[] = [];
  const c = spec.content ?? {};
  const add = (x: OverCheck) => out.push(x);
  const sales = isFood(category) || isCosmetic(category);

  if (sales) {
    const kind = kindOf(c, category, L);
    const k = kOf(c, kind);
    const net = c.net;
    const unit = c.unit ?? "g";
    // void ratio
    if (!net) add({ id: "void", rule: "G02", level: "info", title: P("填写单件净含量后可核算空隙率", "Enter the net content of one unit to check the void ratio"), detail: P("按 GB 23350：空隙率 = (外包装体积 − Σk×内装物体积) ÷ 外包装体积。", "GB 23350: void ratio = (outer volume − Σ k × contents volume) ÷ outer volume.") });
    else if (k === null) add({ id: "void", rule: "G02", level: "info", title: P("选择产品类别或填写 k 值后可核算空隙率", "Pick the product kind or enter k to check the void ratio"), detail: P("必要空间系数 k 见 GB 23350 附录 A。", "The necessary-space coefficient k is in GB 23350 Appendix A.") });
    else {
      const n = unitsOf(spec);
      const v = outerVolume(spec);
      const need = k * net * n; // cm³
      const x = ((v.cm3 - need) / v.cm3) * 100;
      const lim = voidLimit(net, L);
      const maxV = need / (1 - lim / 100);
      const ok = x <= lim;
      const box = v.boxed ? P("圆形包装按外切长方体计算（偏严）。", "Round packs are measured by their circumscribed box (strict). ") : P("", "");
      add({
        id: "void",
        rule: "G02",
        level: ok ? "ok" : "error",
        title: ok ? P(`空隙率 ${f1(x)}%，限值 ${lim}%`, `Void ratio ${f1(x)}%, limit ${lim}%`) : P(`空隙率 ${f1(x)}%，超过限值 ${lim}%`, `Void ratio ${f1(x)}% is over the ${lim}% limit`),
        detail: P(
          `外包装 ${f0(v.cm3)} cm³；内装 ${n} × ${net} ${unit}，k = ${k}，必要空间 ${f0(need)} cm³。外包装体积不应超过 ${f0(maxV)} cm³${ok ? "" : `，需缩小约 ${f0(v.cm3 - maxV)} cm³`}。${box.zh}`,
          `Outer pack ${f0(v.cm3)} cm³; contents ${n} × ${net} ${unit}, k = ${k}, necessary space ${f0(need)} cm³. The outer pack may be at most ${f0(maxV)} cm³${ok ? "" : `, about ${f0(v.cm3 - maxV)} cm³ smaller`}. ${box.en}`,
        ),
      });
    }
    // layers
    const ly = layersOf(spec);
    const maxLayers = kind?.layers ?? L.layers;
    const lyOk = ly.total <= maxLayers;
    add({
      id: "layers",
      rule: "G02",
      level: lyOk ? "ok" : "error",
      title: lyOk ? P(`包装 ${ly.total} 层，不超过 ${maxLayers} 层`, `${ly.total} packaging layer${ly.total > 1 ? "s" : ""}, within ${maxLayers}`) : P(`包装 ${ly.total} 层，超过 ${maxLayers} 层`, `${ly.total} packaging layers, over the ${maxLayers} allowed`),
      detail: P(
        `3D 中的 ${ly.shown} 层${ly.extra ? ` + 另填 ${ly.extra} 层` : ""}。内托、衬垫、腰封、说明书不计层；完全包裹内容物的袋、盒都计一层。`,
        `${ly.shown} shown in 3D${ly.extra ? ` + ${ly.extra} entered` : ""}. Inserts, pads, belly bands and leaflets don't count; any bag or box that fully encloses the contents does.`,
      ),
    });
    // cost
    if (c.price && c.packCost !== undefined) {
      const y = (c.packCost / c.price) * 100;
      const lim = kind?.costHigh && c.price > kind.costHigh.above ? kind.costHigh.limit : L.cost;
      const ok = y <= lim;
      add({ id: "cost", rule: "G02", level: ok ? "ok" : "error", title: ok ? P(`包装成本占售价 ${f1(y)}%，限值 ${lim}%`, `Packaging cost ${f1(y)}% of price, limit ${lim}%`) : P(`包装成本占售价 ${f1(y)}%，超过 ${lim}%`, `Packaging cost ${f1(y)}% of price, over ${lim}%`), detail: P(`除直接接触内容物的一层外，其余包装成本 ${c.packCost} 元 ÷ 售价 ${c.price} 元。`, `Every layer but the one touching the contents, ${c.packCost} yuan ÷ price ${c.price} yuan.`) });
    } else add({ id: "cost", rule: "G02", level: "info", title: P("填写售价和包装成本后可核算成本占比", "Enter the price and packaging cost to check the cost share"), detail: P(`限值 ${L.cost}%${kind?.costHigh ? `；售价超过 ${kind.costHigh.above} 元为 ${kind.costHigh.limit}%` : ""}。`, `Limit ${L.cost}%${kind?.costHigh ? `; ${kind.costHigh.limit}% above ${kind.costHigh.above} yuan` : ""}.`) });
    // tea's mass rule
    if (kind?.massRatio) {
      if (c.totalMass && net && unit === "g") {
        const m2 = net * unitsOf(spec);
        const w = (c.totalMass - m2) / m2;
        const ok = w <= kind.massRatio;
        add({ id: "mass", rule: "G02", level: ok ? "ok" : "error", title: ok ? P(`包装质量为内装物的 ${f1(w)} 倍，不超过 ${kind.massRatio} 倍`, `Packaging is ${f1(w)}× the contents' mass, within ${kind.massRatio}×`) : P(`包装质量为内装物的 ${f1(w)} 倍，超过 ${kind.massRatio} 倍`, `Packaging is ${f1(w)}× the contents' mass, over ${kind.massRatio}×`), detail: P(`(总质量 ${c.totalMass} g − 净含量 ${m2} g) ÷ ${m2} g。`, `(total ${c.totalMass} g − net ${m2} g) ÷ ${m2} g.`) });
      } else add({ id: "mass", rule: "G02", level: "info", title: P("填写整件总质量后可核算包装质量倍数", "Enter the whole product's mass to check the packaging mass"), detail: P(`包装质量不应大于内装物质量的 ${kind.massRatio} 倍。`, `Packaging may weigh at most ${kind.massRatio}× the contents.`) });
    }
  }

  // courier packaging (GB 45186)
  if (usageOf(spec).courier) {
    const cls = c.courierClass ?? "normal";
    const maxL = L.courierLayers[cls];
    const layers = 1 + (c.courierExtra ?? 0);
    const clsName = { normal: P("非易损易碎", "non-fragile"), fragile: P("易损易碎", "fragile"), fresh: P("生鲜冷链", "fresh or chilled") }[cls];
    add({ id: "courierLayers", rule: "G04", level: layers <= maxL ? "ok" : "error", title: layers <= maxL ? P(`快递包装 ${layers} 层，${clsName.zh}物品不超过 ${maxL} 层`, `${layers} courier layer${layers > 1 ? "s" : ""}, within ${maxL} for ${clsName.en} items`) : P(`快递包装 ${layers} 层，超过${clsName.zh}物品的 ${maxL} 层`, `${layers} courier layers, over ${maxL} for ${clsName.en} items`), detail: P("快递箱算一层，另填完全包裹物品的袋、膜；未完全包裹的填充物、胶带、面单、冰袋不计。", "The courier box is one layer, plus any bag or film that fully wraps the item; loose fill, tape, labels and ice packs don't count.") });
    const o = outerSize(spec);
    const boxDiag = Math.hypot(o.w, o.h, o.d);
    const lay = comboLayout(spec);
    if (lay) {
      const iw = lay.n * lay.foot.w;
      const itemDiag = Math.hypot(iw, lay.foot.h, lay.foot.d);
      const band = L.diagonal.find((b) => itemDiag >= b.from && itemDiag < b.to);
      if (boxDiag <= L.diagonalExempt) add({ id: "box", rule: "G04", level: "ok", title: P(`箱体对角线 ${f0(boxDiag)} mm，不超过 ${L.diagonalExempt} mm，不受比例限制`, `Box diagonal ${f0(boxDiag)} mm, within ${L.diagonalExempt} mm: no ratio applies`), detail: P("", "") });
      else if (band) {
        const ok = boxDiag <= band.ratio * itemDiag;
        add({ id: "box", rule: "G04", level: ok ? "ok" : "error", title: ok ? P(`箱体对角线是内件的 ${f1(boxDiag / itemDiag)} 倍，不超过 ${band.ratio} 倍`, `Box diagonal ${f1(boxDiag / itemDiag)}× the item's, within ${band.ratio}×`) : P(`箱体对角线是内件的 ${f1(boxDiag / itemDiag)} 倍，超过 ${band.ratio} 倍`, `Box diagonal ${f1(boxDiag / itemDiag)}× the item's, over ${band.ratio}×`), detail: P(`箱体 ${f0(boxDiag)} mm，内件外切长方体 ${f0(itemDiag)} mm。`, `Box ${f0(boxDiag)} mm; the item's circumscribed box ${f0(itemDiag)} mm.`) });
      } else add({ id: "box", rule: "G04", level: "info", title: P(`内件对角线 ${f0(itemDiag)} mm，不在比例分档内`, `Item diagonal ${f0(itemDiag)} mm is outside the ratio bands`), detail: P("", "") });
    } else add({ id: "box", rule: "G04", level: "info", title: P("在「包装」里放入产品后可核对箱体与内件尺寸", "Pack a product under Pack to check the box against the item"), detail: P("", "") });
    const sum = o.w + o.h + o.d;
    const tb = L.tape.find((b) => sum <= b.upTo);
    if (tb) {
      const relax = cls === "fragile" ? L.tapeRelax : 1;
      const max = tb.multiple * sum * relax;
      if (c.tape) add({ id: "tape", rule: "G04", level: c.tape <= max ? "ok" : "error", title: c.tape <= max ? P(`封箱胶带 ${f0(c.tape)} mm，不超过 ${f0(max)} mm`, `Sealing tape ${f0(c.tape)} mm, within ${f0(max)} mm`) : P(`封箱胶带 ${f0(c.tape)} mm，超过 ${f0(max)} mm`, `Sealing tape ${f0(c.tape)} mm, over ${f0(max)} mm`), detail: P(`长宽高之和 ${f0(sum)} mm × ${tb.multiple}${relax > 1 ? ` × ${relax}（易碎）` : ""}。`, `Length + width + height ${f0(sum)} mm × ${tb.multiple}${relax > 1 ? ` × ${relax} (fragile)` : ""}.`) });
      else add({ id: "tape", rule: "G04", level: "info", title: P(`封箱胶带不超过 ${f0(max)} mm`, `Sealing tape at most ${f0(max)} mm`), detail: P(`长宽高之和 ${f0(sum)} mm × ${tb.multiple}${relax > 1 ? ` × ${relax}（易碎）` : ""}。`, `Length + width + height ${f0(sum)} mm × ${tb.multiple}${relax > 1 ? ` × ${relax} (fragile)` : ""}.`) });
    }
    if (c.tapeWidth && c.tapeWidth > L.tapeWidth) add({ id: "tapeWidth", rule: "G04", level: "error", title: P(`胶带宽 ${c.tapeWidth} mm，超过 ${L.tapeWidth} mm`, `Tape ${c.tapeWidth} mm wide, over ${L.tapeWidth} mm`), detail: P("", "") });
  }
  return out;
}
