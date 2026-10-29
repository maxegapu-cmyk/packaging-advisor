/**
 * The bill of components: a package broken into what a factory makes or buys, each with the stock
 * it is made of and how it is printed and finished. Read from the pack itself (structure, size,
 * finish and effects, the parts' material picks), so the quote describes the same package the 3D
 * model shows and the print file prints:
 *  - the finish decides the lamination, the effects decide foil, spot UV and embossing;
 *  - a part's stock is the one the seller ordered, else the stock made of the material picked for
 *    the part, else the usual stock for that part.
 * Client-safe.
 */
import type { Pair } from "../i18n";
import { comboLayout, FORM_LABELS, isRound, outerSize, type Form, type MaterialPick, type PackSpec } from "../pack";
import { printLayout, type Piece } from "../print/layout";
import { choiceOf, insertKind, partsOf } from "../materials";
import { stock as bookStock, type BookStock } from "./book";
import type { StockKind } from "./stocks";
import { gsmFor, kindsFor, stockFor } from "./stockFor";

export { gsmFor, kindsFor, stockFor };

export type Lam = "gloss" | "matte" | "soft" | "varnish";
export type Blank = { w: number; h: number; name: Pair; area: number };

export type CompKind = "sheet" | "rigid" | "tube" | "flute" | "flex" | "label" | "buy" | "insert" | "fabric" | "labour";

export type Comp = {
  key: string;
  label: Pair;
  kind: CompKind;
  stock?: BookStock;
  gsm?: number;
  /** how many of this one package needs (a combination's two tins: 2) */
  perPack: number;
  /** printed sheets: the blanks of one set, as printed */
  blanks?: Blank[];
  cf?: number;
  cb?: number;
  spots?: number;
  lam?: Lam | null;
  foil?: { cm2: number; holo: boolean } | null;
  emboss?: number;
  uv?: boolean;
  die?: boolean;
  glue?: "straight" | "crash" | "hand" | null;
  window?: boolean;
  /** litho-lam: the flute the printed sheet is mounted on */
  mount?: BookStock;
  /** area per piece (m²) for stocks priced by area, and the board area of a rigid box */
  area?: number;
  /** volume per piece (L) for foam inserts */
  volume?: number;
  size?: { w: number; h: number; d: number };
  route?: MaterialPick["route"];
  mould?: boolean;
  /** handwork or labour rate id */
  rateId?: string;
  /** rule length of the cutting die per blank, m */
  rule?: number;
  /** the stocks this component can be made of, for the spec sheet's choices */
  options?: StockKind[];
  /** the seller's own figure for the component per package (overrides the quote) */
  unitCost?: number;
  note?: Pair;
};

const P = (zh: string, en: string): Pair => ({ zh, en });

const blankOf = (p: Piece): Blank => ({ w: Math.round(p.w), h: Math.round(p.h), name: p.name, area: (p.w * p.h) / 1e6 });
/** Rule length of a die per blank (cuts plus creases), m: about 1.6× the perimeter. */
const ruleOf = (b: Blank[]) => b.reduce((a, x) => a + (2 * (x.w + x.h) * 1.6) / 1000, 0);

const LAM: Record<string, Lam | null> = { matte: "matte", gloss: "gloss", softTouch: "soft", paper: null, xuan: null, goldFleck: null };

/** The finishing a printed part takes from the pack's finish and effects (foil area: the seller's, else a logo-sized default). */
function finishing(spec: PackSpec, c: MaterialPick, front: Blank | undefined, primary: boolean) {
  const fx = spec.effects ?? [];
  const faceCm2 = front ? (front.w * front.h) / 100 : 0;
  const foilOn = primary && fx.some((e) => e === "goldFoil" || e === "silverFoil" || e === "holo");
  const embOn = primary && fx.some((e) => e === "emboss" || e === "deboss" || e === "letterpress");
  // a logo and a line of type: about 4% of the main face, at least 6 cm², at most 60
  const dflt = Math.round(Math.max(6, Math.min(60, faceCm2 * 0.04)));
  return {
    lam: LAM[spec.finish] ?? null,
    foil: foilOn ? { cm2: c.foil ?? dflt, holo: fx.includes("holo") } : null,
    emboss: embOn ? (c.emboss ?? dflt) : 0,
    uv: primary && fx.includes("spotUV"),
  };
}

/** The pieces of one printed sheet of the layout (outer, or the inner product's with "inner-"). */
function piecesOf(spec: PackSpec, sheetId: string, inner: boolean): Piece[] {
  const lay = printLayout(spec);
  const s = lay.sheets.find((x) => x.id === (inner ? `inner-${sheetId}` : sheetId));
  return s ? s.pieces : [];
}

/** Every component of the package, with the shipping carton and labour last. */
export function componentsOf(spec: PackSpec, category: string): Comp[] {
  const out: Comp[] = [];
  const o = outerSize(spec);
  const ins = insertKind(spec);
  for (const { key, slot, inner } of partsOf(spec)) {
    const form = inner ? spec.inner!.form : spec.form;
    const slotId = key.replace(/^inner\./, "");
    // a litho-lam facing is priced with the flute it is mounted on
    if (slotId === "facing") continue;
    const c = choiceOf(spec, key);
    const s = stockFor(spec, key, slot, category);
    const gsm = gsmFor(s, c, slot);
    const per = inner ? (spec.inner?.count ?? 1) : 1;
    const dims = inner ? { w: spec.inner!.w, h: spec.inner!.h, d: isRound(form) ? spec.inner!.w : spec.inner!.d } : o;
    const base: Comp = { key, label: slot.label, kind: "buy", stock: s, gsm, perPack: per, options: kindsFor(form, slotId, ins), unitCost: c.unitCost };
    const printed = (sheet: string, pieceIds?: string[]) => {
      const pcs = piecesOf(spec, sheet, inner).filter((p) => !pieceIds || pieceIds.includes(p.id));
      return pcs.map(blankOf);
    };
    const sheetComp = (blanks: Blank[], extra: Partial<Comp> = {}): Comp => {
      // the finish and effects go on every printed part, as the print file notes them
      const f = finishing(spec, c, blanks[0], true);
      const colours = s.kind === "board" && s.id === "blackCard" ? 0 : 4;
      return {
        ...base,
        kind: "sheet",
        blanks,
        rule: ruleOf(blanks),
        cf: c.cf ?? colours,
        cb: c.cb ?? 0,
        spots: c.spots ?? 0,
        lam: f.lam,
        foil: f.foil,
        emboss: f.emboss,
        uv: f.uv,
        die: true,
        window: c.window,
        ...extra,
      };
    };

    const corrugated = (blanks: Blank[], glue: Comp["glue"]) => {
      const route = c.route ?? "litho";
      if (route === "litho" && s.kind === "flute") {
        // the printed facing is its own pick ("facing"), mounted on the flute
        const fc = choiceOf(spec, "facing");
        const fslot = partsOf(spec).find((p) => p.key === "facing")?.slot;
        const facing = fslot ? stockFor(spec, "facing", fslot, category) : bookStock("duplex")!;
        const f = finishing(spec, fc, blanks[0], true);
        out.push({
          ...base,
          key: "facing",
          label: P("彩印面纸（裱坑）", "Printed facing (litho-lam)"),
          kind: "sheet",
          stock: facing,
          gsm: gsmFor(facing, fc, fslot) ?? 250,
          blanks,
          rule: ruleOf(blanks),
          cf: fc.cf ?? 4,
          cb: fc.cb ?? 0,
          spots: fc.spots ?? 0,
          lam: f.lam,
          foil: f.foil,
          emboss: f.emboss,
          uv: f.uv,
          die: true,
          glue,
          mount: s,
          options: ["board", "paper"],
          route,
          unitCost: fc.unitCost,
        });
      } else {
        out.push({ ...base, kind: "flute", blanks, area: blanks.reduce((a, b) => a + b.area, 0), rule: ruleOf(blanks), cf: c.cf ?? 1, route: "direct", die: true, glue });
      }
    };

    switch (`${form}.${slotId}`) {
      case "carton.body": {
        const glue = c.glue ?? (o.w * o.d > 120 * 80 || o.h > 250 ? "crash" : "straight");
        // a large carton is made of corrugated board (a printed facing mounted on flute)
        if (s.kind === "flute") corrugated(printed("net"), glue === "none" ? null : glue);
        else out.push(sheetComp(printed("net"), { glue: glue === "none" ? null : glue }));
        continue;
      }
      case "bag.body":
        out.push(sheetComp(printed("net"), { glue: null, rateId: "bag.hand" }));
        continue;
      case "blister.card":
        out.push(sheetComp(printed("card"), { glue: null }));
        continue;
      case "mailer.body":
        corrugated(printed("net"), null);
        continue;
      case "gift.core":
      case "bookBox.core":
      case "drawer.core":
      case "brocade.core": {
        const t = ((gsm ?? 1200) / 650) * 1;
        const { w, h, d } = dims;
        let area: number;
        let rateId: string;
        if (form === "gift") {
          const lidH = Math.max(12, h * 0.34);
          area = ((w + 2 * t) * (d + 2 * t) + 2 * (w + d + 4 * t) * lidH + w * d + 2 * (w + d) * h) / 1e6;
          rateId = "rigid.lidBase";
        } else if (form === "drawer") {
          area = (2 * w * d + 2 * h * d + w * d + 2 * (w + d) * h) / 1e6;
          rateId = "rigid.drawer";
        } else {
          // case boards and spine, and the tray
          area = (2 * (w + 6) * (d + 6) + (w + 6) * (h + 4) + w * d + 2 * (w + d) * h) / 1e6;
          rateId = form === "brocade" ? "rigid.brocade" : "rigid.book";
        }
        out.push({ ...base, kind: "rigid", area, rateId, size: dims });
        continue;
      }
      case "gift.wrap":
      case "bookBox.wrap":
      case "drawer.wrap":
      case "paperTube.wrap": {
        const sheet = form === "drawer" ? "parts" : "wraps";
        out.push(sheetComp(printed(sheet), { glue: null }));
        continue;
      }
      case "brocade.slip":
        out.push(sheetComp(printed("slip"), { glue: null, lam: null }));
        continue;
      case "brocade.cover": {
        const { w, h, d } = dims;
        const area = ((2 * (w + 30) * (d + 30) + (w + 30) * (h + 30)) * 1.15) / 1e6;
        out.push({ ...base, kind: "fabric", area });
        continue;
      }
      case "paperTube.body": {
        const { w, h } = dims;
        const lidH = Math.max(20, h * 0.3);
        // a body and a lid, each wound from about five plies, and two end discs
        const area = (Math.PI * w * (h + lidH) * 5 + 2 * Math.PI * (w / 2) ** 2) / 1e6;
        out.push({ ...base, kind: "tube", area, rateId: "rigid.tube", size: dims });
        continue;
      }
      case "paperTube.liner": {
        const { w, h } = dims;
        out.push({ ...base, kind: "fabric", area: (Math.PI * w * h * 1.05) / 1e6, label: slot.label });
        continue;
      }
      case "pouch.film": {
        const blanks = printed("film");
        const area = blanks.reduce((a, b) => a + b.area, 0) * 1.12; // seals and trim
        out.push({ ...base, kind: "flex", blanks, area, cf: c.cf ?? 5, route: c.route, rateId: dims.d > 20 ? "pouch.stand" : "pouch.flat" });
        continue;
      }
      case "pouch.zip":
        continue; // in the pouch making rate
    }

    if (slotId === "label") {
      const blanks = printed(form === "jar" || form === "glassBottle" ? "labels" : "label");
      const area = blanks.reduce((a, b) => a + b.area, 0);
      if (form === "tin" || form === "can" || form === "ceramic") continue; // printed on the container itself
      out.push({ ...base, kind: "label", blanks, area, cf: c.cf ?? 4 });
      continue;
    }
    if (slotId === "insert") {
      const lay = comboLayout(spec);
      const foot = { w: Math.max(20, o.w - 4), d: Math.max(20, o.d - 4) };
      const depth = Math.max(15, Math.min(60, (lay?.foot.h ?? o.h) * 0.45));
      if (s.kind === "board") {
        const w = foot.w + 2 * depth;
        const h = foot.d + 2 * depth;
        const blanks = [{ w: Math.round(w), h: Math.round(h), name: P("卡纸内托", "Card insert"), area: (w * h) / 1e6 }];
        out.push({ ...base, kind: "sheet", blanks, rule: ruleOf(blanks) * 1.6, cf: c.cf ?? 0, cb: 0, spots: 0, lam: null, foil: null, emboss: 0, uv: false, die: true, glue: null });
      } else if (s.kind === "fabric") out.push({ ...base, kind: "fabric", area: ((foot.w + 20) * (foot.d + 20) * 1.2) / 1e6 });
      else out.push({ ...base, kind: "insert", area: (foot.w * foot.d) / 1e6, volume: (foot.w * foot.d * depth) / 1e6, size: { w: foot.w, h: depth, d: foot.d } });
      continue;
    }
    if (`${form}.${slotId}` === "bag.base") {
      out.push({ ...base, kind: "rigid", area: (o.w * o.d) / 1e6 });
      continue;
    }
    // parts that come with a container (its lid, lacquer, seal) are in its price
    if (s.id === "included" || s.price === 0) continue;
    // bought-in containers and fittings
    out.push({ ...base, kind: "buy", size: dims, mould: c.mould });
  }

  // fittings the structure needs that are not material parts
  if (spec.form === "bookBox") out.push({ key: "magnets", label: P("磁铁", "Magnets"), kind: "buy", stock: bookStock("magnets"), perPack: 1, options: ["trim"], unitCost: choiceOf(spec, "magnets").unitCost });
  // a combination: fitting the products into the insert
  if (spec.inner && ["gift", "bookBox", "mailer", "drawer", "woodBox", "brocade"].includes(spec.form)) out.push({ key: "fit", label: P("装内托与组装", "Fitting and assembly"), kind: "labour", rateId: "insert.fit", perPack: 1 });
  // the shipping carton
  const sh = spec.order?.shipper;
  if (sh) {
    const s = (sh.stock && bookStock(sh.stock)) || bookStock("bc5")!;
    const box = shipperSize(o, sh.per);
    const area = ((2 * (box.l + box.w) + 40 + 60) * (box.w + box.h + 60)) / 1e6;
    out.push({ key: "shipper", label: P(`外箱（每箱 ${sh.per} 只）`, `Shipping carton (${sh.per} per carton)`), kind: "flute", stock: s, perPack: 1 / sh.per, area, cf: sh.colours ?? 1, route: "direct", die: false, size: { w: box.l, h: box.h, d: box.w }, options: ["flute"], note: P(`外箱内尺寸约 ${box.l}×${box.w}×${box.h} mm`, `Carton inside about ${box.l}×${box.w}×${box.h} mm`) });
  }
  return out;
}

/** A shipping carton for `per` packs, packed in the most compact grid (inside size, mm). */
export function shipperSize(o: { w: number; h: number; d: number }, per: number): { l: number; w: number; h: number } {
  let best = { l: 0, w: 0, h: 0, score: Infinity };
  for (let a = 1; a <= per; a++)
    for (let b = 1; a * b <= per; b++) {
      const c = Math.ceil(per / (a * b));
      const l = a * o.w + 6;
      const w = b * o.d + 6;
      const h = c * o.h + 6;
      // closest to a cube with the least empty space
      const score = l * w + w * h + h * l + (a * b * c - per) * o.w * o.d * 4;
      if (score < best.score) best = { l, w, h, score };
    }
  return { l: Math.round(Math.max(best.l, best.w)), w: Math.round(Math.min(best.l, best.w)), h: Math.round(best.h) };
}

export const formLabel = (f: Form) => FORM_LABELS[f];
