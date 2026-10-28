/**
 * Materials from the principal's list (catalog.ts), put to work on a package: which parts each
 * structure has, which listed materials each part can be made of, what the seller has picked
 * (PackSpec.materials, part id → material number), and the compliance rules and supplier
 * documents that follow from those picks, the product category and how the pack is used.
 *
 * Every material named anywhere in the app comes from the list. A part the list does not cover
 * (a book box's magnets, hot-stamping foil) is shown as off the list, for the principal to
 * confirm, never swapped for a guess. The options for a part are only listed materials that the
 * part, as it is drawn in 3D and set out in the print file, can really be made of.
 *
 * Client-safe and pure.
 */
import type { Pair } from "../i18n";
import { FORM_LABELS, isOuter, type Effect, type Finish, type Form, type Insert, type PackSpec } from "../pack";
import { DOCS, FAMILIES, LIST, MATERIALS, NOTES, PATHS, RULES, SOURCES, type Material, type Rule } from "./catalog";

export { DOCS, FAMILIES, LIST, MATERIALS, NOTES, PATHS, RULES, SOURCES, type Material, type Rule };

const BY_ID = new Map(MATERIALS.map((m) => [m.id, m]));
const RULE_BY_ID = new Map(RULES.map((r) => [r.id, r]));
export const material = (id: string): Material | undefined => BY_ID.get(id);
export const rule = (id: string): Rule | undefined => RULE_BY_ID.get(id);
export const isListed = (id: string) => BY_ID.has(id);

const P = (zh: string, en: string): Pair => ({ zh, en });

/* ---------------------------------------------------------------- categories */

/** Categories whose products are food: their direct-contact parts follow the F rules. */
export const FOOD_CATEGORIES = ["tea", "snacks", "beverage", "specialty", "health", "baby"] as const;
/** Categories whose products are cosmetics: their direct-contact parts follow C01. */
export const COSMETIC_CATEGORIES = ["cosmetics", "personalCare"] as const;
export const isFood = (c: string) => (FOOD_CATEGORIES as readonly string[]).includes(c);
export const isCosmetic = (c: string) => (COSMETIC_CATEGORIES as readonly string[]).includes(c);

/* ---------------------------------------------------------------- parts */

/**
 * How a part meets the product: "direct" touches what is packed (the food, the cream), "outer"
 * holds or covers something that is itself packed.
 */
export type Contact = "direct" | "outer";
/**
 * Printed parts: "stock" is the printed sheet itself (a wrap, a label, a slip), so the finish
 * decides which papers it can be; "board" is printed board (a carton), faced with the specialty
 * paper when the finish is one.
 */
export type PrintRole = "stock" | "board";

export type Slot = {
  id: string;
  label: Pair;
  /** listed materials this part can be made of; the first is the default */
  options: string[];
  contact: Contact;
  print?: PrintRole;
  /** grade and thickness as the structure is drawn (grammage, wall), for the job sheet */
  grade?: Pair;
};

/** What a combination's products sit in, by insert kind. */
const INSERT_OPTIONS: Record<Insert, string[]> = {
  velvet: ["M036", "M129", "M128"],
  pulp: ["M145", "M146", "M147", "M148"],
  foam: ["M138", "M141", "M143", "M144", "M139", "M140"],
  card: ["M001", "M017", "M018", "M016"],
};

/** The insert kind a package shows: the product's own, else what the structure is drawn with. */
export function insertKind(spec: PackSpec): Insert {
  if (spec.inner) return spec.inner.insert ?? (spec.form === "mailer" ? "pulp" : "velvet");
  return spec.form === "mailer" ? "card" : "velvet";
}

/** Structures with an insert or tray (with products packed, or empty). */
const HAS_INSERT: readonly Form[] = ["gift", "bookBox", "mailer", "drawer", "woodBox", "brocade"];

const CORE: Slot = { id: "core", label: P("灰板骨架", "Board core"), options: ["M016"], contact: "outer", grade: P("1200–1500 g", "1200–1500 gsm") };
const WRAP_PAPERS = ["M019", "M020", "M005", "M021", "M037", "M031", "M028", "M029", "M030", "M032", "M038"];
const wrap = (grade = P("128–157 g", "128–157 gsm")): Slot => ({ id: "wrap", label: P("裱纸", "Wrap"), options: WRAP_PAPERS, contact: "outer", print: "stock", grade });
const LABEL_PAPERS = ["M079", "M053", "M019", "M021", "M037", "M038"];
const label = (first: string, contact: Contact = "outer"): Slot => ({ id: "label", label: P("标签", "Label"), options: [first, ...LABEL_PAPERS.filter((x) => x !== first)], contact, print: "stock" });

/** The parts of each structure, as built in 3D and laid out in the print file. */
export function slotsOf(form: Form): Slot[] {
  switch (form) {
    case "carton":
      return [{ id: "body", label: P("盒身", "Carton board"), options: ["M001", "M003", "M002", "M005", "M079"], contact: "outer", print: "board", grade: P("300–400 g/m²，厚约 0.45 mm", "300–400 gsm, about 0.45 mm") }];
    case "gift":
    case "bookBox":
      return [CORE, wrap()];
    case "drawer":
      return [CORE, wrap(), { id: "ribbon", label: P("拉带", "Ribbon pull"), options: ["M128", "M126", "M122"], contact: "outer" }];
    case "mailer":
      return [{ id: "body", label: P("瓦楞纸板", "Corrugated board"), options: ["M012"], contact: "outer", print: "board", grade: P("3 mm E/B 楞", "3 mm E/B flute") }];
    case "paperTube":
      return [
        { id: "body", label: P("筒身纸管", "Tube"), options: ["M027"], contact: "outer", grade: P("卷制纸管，壁厚约 2 mm", "wound tube, about 2 mm wall") },
        wrap(P("128–157 g", "128–157 gsm")),
        { id: "liner", label: P("内衬", "Liner"), options: ["M033", "M094", "M102"], contact: "direct" },
      ];
    case "bag":
      return [
        { id: "body", label: P("袋身", "Bag paper"), options: ["M001", "M019", "M020", "M005", "M004"], contact: "outer", print: "board", grade: P("157–250 g", "157–250 gsm") },
        { id: "handle", label: P("提手绳", "Rope handles"), options: ["M122", "M004", "M126"], contact: "outer" },
        { id: "base", label: P("底板", "Base card"), options: ["M016", "M001", "M002"], contact: "outer" },
      ];
    case "aseptic":
      return [
        { id: "body", label: P("复合包材", "Laminated board"), options: ["M096"], contact: "direct", print: "board", grade: P("PE / 纸板 / PE / 铝箔 / PE / PE", "PE / board / PE / foil / PE / PE") },
        { id: "cap", label: P("旋盖", "Screw cap"), options: ["M052", "M047"], contact: "direct" },
      ];
    case "pouch":
      return [
        { id: "film", label: P("袋膜", "Film"), options: ["M084", "M083", "M081", "M082", "M092"], contact: "direct", print: "board" },
        { id: "zip", label: P("拉链", "Zip"), options: ["M045", "M052"], contact: "direct" },
      ];
    case "bottle":
      return [
        { id: "body", label: P("瓶身", "Bottle"), options: ["M047", "M052", "M048"], contact: "direct", grade: P("吹塑", "blow-moulded") },
        { id: "pump", label: P("泵头与吸管", "Pump and dip tube"), options: ["M052"], contact: "direct" },
        label("M079"),
      ];
    case "tube":
      return [
        { id: "body", label: P("管身", "Tube body"), options: ["M045", "M047", "M083"], contact: "direct", print: "board" },
        { id: "cap", label: P("翻盖", "Flip cap"), options: ["M052"], contact: "direct" },
      ];
    case "blister":
      return [
        { id: "card", label: P("背卡", "Backing card"), options: ["M001", "M003", "M002"], contact: "outer", print: "board", grade: P("350 g，背面涂热封胶", "350 gsm, heat-seal coated") },
        { id: "blister", label: P("泡罩", "Blister"), options: ["M058", "M061", "M063", "M066"], contact: "direct", grade: P("透明吸塑", "clear thermoformed") },
      ];
    case "jar":
      return [
        { id: "glass", label: P("罐身", "Glass"), options: ["M106", "M107"], contact: "direct" },
        { id: "lid", label: P("旋盖", "Lug cap"), options: ["M099", "M101"], contact: "outer" },
        { id: "liner", label: P("盖内密封垫", "Cap liner"), options: ["M162", "M163", "M154"], contact: "direct" },
        label("M021"),
      ];
    case "glassBottle":
      return [
        { id: "glass", label: P("瓶身", "Glass"), options: ["M106", "M107"], contact: "direct" },
        { id: "stopper", label: P("塞身", "Stopper shank"), options: ["M120", "M121", "M154"], contact: "direct" },
        { id: "head", label: P("塞头", "Stopper head"), options: ["M052", "M111", "M071"], contact: "outer" },
        label("M021"),
      ];
    case "tin":
      return [
        { id: "body", label: P("罐身与罐盖", "Body and lid"), options: ["M099", "M100", "M101"], contact: "direct", print: "board", grade: P("0.21–0.25 mm，印铁", "0.21–0.25 mm, printed flat") },
        { id: "lacquer", label: P("内涂层", "Inner lacquer"), options: ["M160"], contact: "direct" },
        { id: "seal", label: P("内封", "Inner seal"), options: ["M102", "M163"], contact: "direct" },
      ];
    case "can":
      return [
        { id: "body", label: P("罐身、罐盖与拉环", "Body, end and tab"), options: ["M101"], contact: "direct", print: "board", grade: P("两片罐", "two-piece can") },
        { id: "lacquer", label: P("内涂层", "Inner lacquer"), options: ["M160"], contact: "direct" },
      ];
    case "ceramic":
      return [{ id: "body", label: P("罐身与瓷盖", "Body and lid"), options: ["M108"], contact: "direct", grade: P("高温烧制，上釉，釉上贴花", "high-fired, glazed, decal fired on") }];
    case "woodBox":
      return [{ id: "body", label: P("箱体", "Crate"), options: ["M110", "M118", "M112", "M111"], contact: "outer", grade: P("壁厚 10 mm，盖面激光雕刻", "10 mm walls, laser-engraved lid") }];
    case "brocade":
      return [
        CORE,
        { id: "cover", label: P("锦面", "Brocade cover"), options: ["M126", "M128", "M127", "M123", "M125"], contact: "outer", grade: P("提花织造宋锦纹", "jacquard-woven Song brocade pattern") },
        { id: "slip", label: P("题签", "Title slip"), options: ["M021", "M037", "M038", "M019"], contact: "outer", print: "stock", grade: P("120 g", "120 gsm") },
        { id: "toggle", label: P("扣", "Toggle"), options: ["M069", "M111", "M071"], contact: "outer" },
        { id: "loop", label: P("绳圈", "Loop"), options: ["M126", "M127", "M122"], contact: "outer" },
      ];
  }
}

/** The insert slot of a structure that has one: its options follow the insert kind. */
function insertSlot(spec: PackSpec): Slot | null {
  if (!HAS_INSERT.includes(spec.form)) return null;
  const kind = insertKind(spec);
  const label = spec.inner ? P("内托", "Insert") : spec.form === "brocade" ? P("内衬软垫", "Lining pad") : P("内托垫", "Tray pad");
  // a Song box's pad is satin-covered, as such boxes are lined
  const options = spec.form === "brocade" && kind === "velvet" ? ["M128", "M129", "M036"] : INSERT_OPTIONS[kind];
  return { id: "insert", label, options, contact: "outer" };
}

/** Parts the list does not cover, by structure and effect: shown, never substituted. */
export type OffList = { id: string; label: Pair; why: Pair };
export function offListOf(spec: { form: Form; effects?: Effect[]; inner?: { form: Form } | null }): OffList[] {
  const out: OffList[] = [];
  const fx = spec.effects ?? [];
  if (spec.form === "bookBox") out.push({ id: "magnets", label: P("磁铁", "Magnets"), why: P("书型盒翻边内嵌磁铁；清单中没有磁性材料。", "The book box's flap holds magnets; the list has no magnetic material.") });
  if (spec.form === "bag") out.push({ id: "eyelets", label: P("金属扣眼", "Metal eyelets"), why: P("绳孔的加固扣眼；清单中没有对应的五金件。", "The eyelets that reinforce the rope holes; the list has no such hardware.") });
  if (fx.some((e) => e === "goldFoil" || e === "silverFoil")) out.push({ id: "foil", label: P("烫印电化铝", "Hot-stamping foil"), why: P("烫金、烫银用的电化铝箔不在清单中（M102 铝箔是包装箔，不是烫印箔）。", "The hot-stamping foil for gold and silver is not on the list (M102 is packaging foil, not stamping foil).") });
  if (fx.includes("holo")) out.push({ id: "holo", label: P("镭射烫印膜", "Holographic stamping foil"), why: P("镭射烫印膜不在清单中（M034 全息纸是纸，不是烫印膜）。", "Holographic stamping foil is not on the list (M034 is a paper, not a stamping foil).") });
  return out;
}

/** The product packed in a combination, as a package of its own (sharing the finish and effects). */
export function innerSpecOf(spec: PackSpec): PackSpec | null {
  const i = spec.inner;
  if (!i || !isOuter(spec.form)) return null;
  return { form: i.form, w: i.w, h: i.h, d: i.d, finish: spec.finish, effects: spec.effects };
}

/** A structure's own parts (and its insert). */
function ownParts(spec: PackSpec): Slot[] {
  const out = slotsOf(spec.form);
  const ins = insertSlot(spec);
  return ins ? [...out, ins] : out;
}

/** Every material part of a package, the inner product's parts prefixed "inner.". */
export function partsOf(spec: PackSpec): { key: string; slot: Slot; inner: boolean }[] {
  const out = ownParts(spec).map((slot) => ({ key: slot.id, slot, inner: false }));
  const inner = innerSpecOf(spec);
  if (inner) for (const slot of ownParts(inner)) out.push({ key: `inner.${slot.id}`, slot, inner: true });
  return out;
}

/* ---------------------------------------------------------------- finish and print */

const COATED = new Set(["M001", "M002", "M003", "M019", "M020", "M079", "M053"]);
const SPECIALTY = new Set(["M005", "M004", "M021", "M028", "M029", "M030", "M031", "M032", "M037", "M038"]);
/** 宣纸 and 洒金笺 are handmade papers: on the list as 手工装饰纸 (M038, trade name 手工纸). */
export const HANDMADE = "M038";
const handmadeFinish = (f: Finish) => f === "xuan" || f === "goldFleck";
const laminated = (f: Finish) => f === "matte" || f === "gloss" || f === "softTouch";

/**
 * The options a part really has under the finish: a laminated finish wants a coated sheet, an
 * uncoated finish a specialty paper, and xuan or gold-fleck stock is the handmade paper itself.
 * Parts the finish doesn't decide keep all their options.
 */
export function optionsFor(slot: Slot, finish: Finish): string[] {
  if (slot.print !== "stock") return slot.options;
  if (handmadeFinish(finish)) return [HANDMADE];
  const keep = slot.options.filter((id) => (laminated(finish) ? COATED.has(id) : SPECIALTY.has(id)));
  return keep.length ? keep : slot.options;
}

/** The material a part is made of: the seller's pick when it is a real option, else the default. */
export function pick(spec: PackSpec, key: string, slot: Slot): string {
  const opts = optionsFor(slot, spec.finish);
  const chosen = spec.materials?.[key];
  return chosen && opts.includes(chosen) ? chosen : opts[0];
}

/** Materials that are not parts of the structure but come with the finish and effects. */
export type Process = { key: string; label: Pair; id: string; note?: Pair };
/** The process materials of one pack (`prefix` "inner." for a combination's product). */
function processesOfPack(spec: PackSpec, own: PackSpec, prefix: string): Process[] {
  const out: Process[] = [];
  const parts = ownParts(own);
  const printed = parts.filter((p) => p.print);
  const paperPrinted = printed.some((p) => {
    const fam = material(pick(spec, prefix + p.id, p))?.family;
    return fam === "paper" || fam === "paperSpecial";
  });
  const f = own.form;
  // (a porcelain caddy's decal is fired into the glaze: part of the ceramic, checked with it under F06)
  if (printed.length) out.push({ key: "ink", label: P("印刷油墨", "Printing ink"), id: "M161" });
  if (paperPrinted && laminated(spec.finish))
    out.push({ key: "film", label: P("覆膜", "Lamination film"), id: "M053", note: spec.finish === "softTouch" ? P("触感膜，BOPP 基", "soft-touch film on BOPP") : spec.finish === "gloss" ? P("亮膜", "gloss film") : P("哑膜", "matte film") });
  if (handmadeFinish(spec.finish) && printed.some((p) => p.print === "board" && (material(pick(spec, prefix + p.id, p))?.family === "paper")))
    out.push({ key: "facing", label: P("承印面纸", "Printed facing"), id: HANDMADE, note: spec.finish === "xuan" ? P("宣纸，裱于板面", "xuan paper, mounted on the board") : P("洒金笺，裱于板面", "gold-flecked paper, mounted on the board") });
  if ((spec.effects ?? []).includes("spotUV") && printed.length) out.push({ key: "uv", label: P("局部 UV 光油", "Spot UV varnish"), id: "M161", note: P("UV 固化", "UV-cured") });
  if (["gift", "bookBox", "drawer", "brocade", "paperTube", "carton", "mailer", "bag"].includes(f)) out.push({ key: "glue", label: P("裱糊与糊盒胶", "Mounting and gluing adhesive"), id: "M157" });
  if (printed.some((p) => p.id === "label")) out.push({ key: "labelGlue", label: P("标签背胶", "Label adhesive"), id: "M157" });
  if (f === "pouch") out.push({ key: "glue", label: P("复合胶", "Laminating adhesive"), id: "M156" });
  if (f === "blister") out.push({ key: "seal", label: P("热封涂层", "Heat-seal coating"), id: "M160" });
  // a combination's product has its own print and glue: named as the product's
  const own_ = prefix ? FORM_LABELS[own.form] : null;
  return out.map((x) => ({ ...x, key: prefix + "process." + x.key, label: own_ ? { zh: `${own_.zh} · ${x.label.zh}`, en: `${own_.en}: ${x.label.en.toLowerCase()}` } : x.label }));
}

export function processesOf(spec: PackSpec): Process[] {
  const inner = innerSpecOf(spec);
  return [...processesOfPack(spec, spec, ""), ...(inner ? processesOfPack(spec, inner, "inner.") : [])];
}

/** The name of a handmade stock as the seller knows it, when the finish is one. */
export function stockNote(spec: PackSpec, id: string): Pair | null {
  if (id !== HANDMADE || !handmadeFinish(spec.finish)) return null;
  return spec.finish === "xuan" ? P("宣纸", "xuan paper") : P("洒金笺", "gold-flecked paper");
}

/* ---------------------------------------------------------------- resolved picks */

export type Use = {
  key: string;
  label: Pair;
  id: string;
  m: Material;
  contact: Contact;
  inner: boolean;
  /** what this part touches: "food", "cosmetics" or nothing regulated */
  touches: "food" | "cosmetics" | null;
  grade?: Pair;
  note?: Pair;
  options: string[];
  process?: true;
};

/** Every material in the package, the parts first and then the process materials. */
export function usesOf(spec: PackSpec, category: string): Use[] {
  const touches = (contact: Contact) => (contact !== "direct" ? null : isFood(category) ? "food" : isCosmetic(category) ? "cosmetics" : null);
  const out: Use[] = [];
  for (const { key, slot, inner } of partsOf(spec)) {
    const id = pick(spec, key, slot);
    const m = material(id)!;
    out.push({ key, label: slot.label, id, m, contact: slot.contact, inner, touches: touches(slot.contact), grade: slot.grade, note: stockNote(spec, id) ?? undefined, options: optionsFor(slot, spec.finish) });
  }
  for (const p of processesOf(spec)) out.push({ key: p.key, label: p.label, id: p.id, m: material(p.id)!, contact: "outer", inner: p.key.startsWith("inner."), touches: null, note: p.note, options: [p.id], process: true });
  return out;
}

/** Drops picks that no longer name a part of the package or a real option for it. */
export function pruneMaterials(spec: PackSpec): PackSpec {
  if (!spec.materials) return spec;
  const keep: Record<string, string> = {};
  for (const { key, slot } of partsOf(spec)) {
    const v = spec.materials[key];
    if (v && optionsFor(slot, spec.finish).includes(v) && v !== optionsFor(slot, spec.finish)[0]) keep[key] = v;
  }
  const { materials: _drop, ...rest } = spec; // eslint-disable-line @typescript-eslint/no-unused-vars
  return Object.keys(keep).length ? { ...rest, materials: keep } : rest;
}

/** Sets one part's material (the default clears the pick). */
export function withMaterial(spec: PackSpec, key: string, id: string): PackSpec {
  return pruneMaterials({ ...spec, materials: { ...(spec.materials ?? {}), [key]: id } });
}

/* ---------------------------------------------------------------- compliance */

export type Problem = { key: string; level: "error" | "warn"; text: Pair };

/** Picks that break the list's own limits: a non-food material on a part that touches food. */
export function problemsOf(uses: Use[]): Problem[] {
  const out: Problem[] = [];
  for (const u of uses) {
    if (u.touches === "food" && u.m.noFood) out.push({ key: u.key, level: "error", text: P(`${u.label.zh}直接接触食品，但清单把 ${u.m.name.zh}（${u.id}）限于非食品接触用途。`, `The ${u.label.en.toLowerCase()} touches food, but the list limits ${u.m.name.en} (${u.id}) to non-food-contact uses.`) });
    if (u.touches === "cosmetics" && u.m.noCosmetics) out.push({ key: u.key, level: "error", text: P(`${u.label.zh}直接接触化妆品，但清单写明 ${u.m.name.zh}（${u.id}）不作化妆品接触层。`, `The ${u.label.en.toLowerCase()} touches the cosmetic, but the list rules out ${u.m.name.en} (${u.id}) as a cosmetics contact layer.`) });
  }
  return out;
}

/** Why a rule applies: the parts that bring it, or the package as a whole. */
export type Applied = { rule: Rule; by: string[]; why: Pair };

const COURIER_FORMS: readonly Form[] = ["mailer"];
const BAG_FORMS: readonly Form[] = ["bag", "mailer"];

/**
 * The rules that apply to this package, each with the parts that bring it. G01 always; G02 for
 * food and cosmetics sales packaging; G03/G04 when the package is the courier box; P01 for a
 * shopping bag or courier pack whose materials' paths name it; the F rules for parts that touch
 * food (F01 and each material's own); C01 for parts that touch cosmetics.
 */
export function rulesFor(spec: PackSpec, category: string, uses = usesOf(spec, category)): Applied[] {
  const got = new Map<string, Applied>();
  const add = (id: string, by: string | null, why: Pair) => {
    const r = rule(id);
    if (!r) return;
    const a = got.get(id) ?? { rule: r, by: [], why };
    if (by && !a.by.includes(by)) a.by.push(by);
    got.set(id, a);
  };
  // the packs (outer: false, product: true) with a part that touches the food
  const primary = new Set(uses.filter((u) => u.touches === "food").map((u) => u.inner));
  for (const u of uses) {
    add("G01", u.key, P("所有包装材料的一般质量要求", "General quality requirements for every packaging material"));
    if (u.touches === "food") for (const f of ["F01", ...u.m.food]) add(f, u.key, P("直接接触食品的部件", "Parts in direct contact with food"));
    if (u.touches === "cosmetics") add("C01", u.key, P("直接接触化妆品的部件", "Parts in direct contact with the cosmetic"));
    // inks, adhesives and coatings on a pack that holds the food itself: the list's own rules for
    // them (F13, F10, F08), since outer layers can migrate, permeate or set off
    if (u.process && isFood(category) && primary.has(u.inner))
      for (const f of u.m.food) add(f, u.key, P("直接装食品的包装上的油墨、胶和涂层（间接接触也须评估）", "Inks, adhesives and coatings on the pack that holds the food (indirect contact is assessed too)"));
    if (u.m.courier && COURIER_FORMS.includes(spec.form) && !u.inner) add("G03", u.key, P("作为快递包装寄递", "Shipped as courier packaging"));
    if (u.m.bag && BAG_FORMS.includes(spec.form) && !u.inner) add("P01", u.key, P(spec.form === "bag" ? "作为购物袋使用" : "作为快递包装寄递", spec.form === "bag" ? "Used as a shopping bag" : "Shipped as courier packaging"));
  }
  if (isFood(category) || isCosmetic(category)) add("G02", null, P("食品和化妆品的销售包装：层数、空隙率、成本", "Food and cosmetics sales packaging: layers, void ratio, cost"));
  if (COURIER_FORMS.includes(spec.form)) {
    add("G03", null, P("作为快递包装寄递", "Shipped as courier packaging"));
    add("G04", null, P("快递包装：箱体与内件尺寸、层数、胶带用量", "Courier packaging: box-to-contents fit, layers, tape"));
  }
  const order = RULES.map((r) => r.id);
  return [...got.values()].sort((a, b) => order.indexOf(a.rule.id) - order.indexOf(b.rule.id));
}

/** The supplier documents to collect: each material's own list, once per kind, with its parts. */
export function documentsFor(uses: Use[]): { docs: Pair; ids: string[] }[] {
  const by = new Map<number, string[]>();
  for (const u of uses) {
    const ids = by.get(u.m.docs) ?? [];
    if (!ids.includes(u.id)) ids.push(u.id);
    by.set(u.m.docs, ids);
  }
  return [...by.entries()].map(([i, ids]) => ({ docs: DOCS[i], ids }));
}

/* ---------------------------------------------------------------- 3D */

/**
 * How the picks change what the 3D model shows: the back and cut edge of the board, the tray
 * and lining, a toggle, the timber, a tube's liner. Parts not named here look the same whichever
 * option is picked (they are printed over, or the options look alike).
 */
export type Look = {
  board?: { inside: string; edge: string };
  insertTint?: string;
  velvet?: { sheen: number; rough: number };
  toggle?: { color: string; rough: number; clearcoat: number; transmission?: number };
  wood?: string;
  liner?: "foil" | "paper";
};

// the back and cut edge of the board (M001 is the colour the model has always drawn)
const BOARD: Record<string, { inside: string; edge: string }> = {
  M001: { inside: "#D9D4C8", edge: "#ECE7DC" },
  M003: { inside: "#DDD9CF", edge: "#E7E3D9" },
  M002: { inside: "#9C988F", edge: "#B0ABA1" },
  M005: { inside: "#D8CFBE", edge: "#E2D9C8" },
  M004: { inside: "#B7905E", edge: "#A88454" },
  M019: { inside: "#D9D4C8", edge: "#E9E5DC" },
  M020: { inside: "#E4E0D6", edge: "#ECE8DF" },
  M079: { inside: "#E8E8E5", edge: "#EFEFEC" },
};
// the defaults (M145, M138, M001) are the colours the 3D model has always drawn
const INSERT_TINT: Record<string, string> = {
  M145: "#CBC1AC", M146: "#EEEAE0", M147: "#E2D5B8", M148: "#E9DFC8",
  M138: "#F3F3EF", M141: "#3A3A38", M143: "#ECECE8", M144: "#E4E4E0", M139: "#FAFAF7", M140: "#4A4A48",
  M001: "#ECE8DF", M017: "#2A2927", M016: "#A8A39A",
};
const TOGGLE: Record<string, Look["toggle"]> = {
  M069: { color: "#EDE3CF", rough: 0.32, clearcoat: 0.4 },
  M111: { color: "#5C3B26", rough: 0.42, clearcoat: 0.55 },
  M071: { color: "#CFE0D2", rough: 0.08, clearcoat: 1, transmission: 0.45 },
};
const WOOD: Record<string, string> = { M110: "#FFFFFF", M118: "#F4EBC4", M112: "#F1E2C6", M111: "#8C6448" };

export function lookOf(spec: PackSpec): Look {
  const look: Look = {};
  const get = (key: string) => {
    const p = partsOf(spec).find((x) => x.key === key);
    return p ? pick(spec, key, p.slot) : null;
  };
  const board = spec.form === "carton" || spec.form === "bag" ? get("body") : null;
  if (board && BOARD[board]) look.board = BOARD[board];
  const ins = get("insert");
  if (ins) {
    const kind = insertKind(spec);
    // satin is smoother and glossier than flock or velvet pile
    if (kind === "velvet") {
      if (ins === "M128") look.velvet = { sheen: 0.55, rough: 0.42 };
    } else if (INSERT_TINT[ins]) look.insertTint = INSERT_TINT[ins];
  }
  if (spec.form === "brocade") look.toggle = TOGGLE[get("toggle") ?? "M069"];
  if (spec.form === "woodBox") look.wood = WOOD[get("body") ?? "M110"];
  const liner = spec.form === "paperTube" ? get("liner") : spec.inner?.form === "paperTube" ? get("inner.liner") : null;
  if (liner) look.liner = liner === "M094" ? "paper" : "foil";
  return look;
}

/**
 * The material names an anatomy pin's text refers to: "{core}" and "{wrap}" in a pin become the
 * picked materials' names. `prefix` is "inner." for a combination's product.
 */
export function materialWords(spec: PackSpec, category: string, prefix = ""): Record<string, Pair> {
  const out: Record<string, Pair> = {};
  for (const u of usesOf(spec, category)) {
    if (u.process) continue;
    if (prefix ? !u.key.startsWith(prefix) : u.inner) continue;
    const key = prefix ? u.key.slice(prefix.length) : u.key;
    out[key] = inlineName(u);
  }
  return out;
}

/** A material's name for running text: "单面铜版纸", "one-side coated paper (C1S)". */
export function inlineName(u: { m: Material; note?: Pair }): Pair {
  const zh = u.note?.zh ?? u.m.name.zh;
  const en0 = u.note?.en ?? u.m.name.en;
  const en = /^[A-Z][a-z]/.test(en0) ? en0[0].toLowerCase() + en0.slice(1) : en0;
  return { zh, en };
}

/** Puts the picked materials' names into pin text ("{wrap}" → "单面铜版纸"). */
export function fillWords(text: string, words: Record<string, string>): string {
  return text.replace(/\{([a-z]+)\}/g, (all, k: string) => words[k] ?? all);
}

/** One line for the print file: "单面铜版纸 M019 128–157 g；灰纸板 M016 1200–1500 g". */
export function materialLine(spec: PackSpec, category: string, inner: boolean): Pair {
  const parts = usesOf(spec, category).filter((u) => !u.process && u.inner === inner);
  const one = (lang: "zh" | "en") =>
    parts
      .map((u) => {
        const name = lang === "zh" ? u.m.name.zh : u.m.name.en;
        const note = u.note ? (lang === "zh" ? `（${u.note.zh}）` : ` (${u.note.en})`) : "";
        const grade = u.grade ? (lang === "zh" ? `，${u.grade.zh}` : `, ${u.grade.en}`) : "";
        return `${lang === "zh" ? u.label.zh : u.label.en}${lang === "zh" ? "：" : ": "}${name}${note} ${u.id}${grade}`;
      })
      .join(lang === "zh" ? "；" : "; ");
  return { zh: one("zh"), en: one("en") };
}

export const familyLabel = (id: string) => FAMILIES.find((f) => f.id === id)?.label;
export const pathText = (m: Material) => PATHS[m.path];
export const sourceText = (m: Material) => SOURCES[m.source];
