/**
 * Materials from the principal's list (catalog.ts), put to work on a package: which parts each
 * structure has, which listed materials suit each part (recommended, and the default), what the
 * seller has chosen (PackSpec.materials: any listed material for any part, their own grade,
 * colour, supplier and note, whether the part touches the contents; process materials changed or
 * dropped; parts of their own added), and the compliance rules and supplier documents that
 * follow from those choices, the product category and how the pack is used.
 *
 * Every material named anywhere in the app comes from the list. A part the list does not cover
 * (a book box's magnets, hot-stamping foil) is shown as off the list until the seller assigns a
 * listed material to it, never swapped for a guess.
 *
 * Client-safe and pure.
 */
import type { Pair } from "../i18n";
import { FORM_LABELS, isOuter, type Effect, type ExtraPart, type Finish, type Form, type Insert, type MaterialPick, type PackSpec, type PackUsage } from "../pack";
import { DOCS, FAMILIES, LIST, MATERIALS, NOTES, PATHS, RULES, SOURCES, type Material, type Rule } from "./catalog";
import { applyLibrary, type Library } from "./library";
import { setKnownMaterials } from "./registry";

export { DOCS, FAMILIES, LIST, MATERIALS, NOTES, PATHS, RULES, SOURCES, type Material, type Rule };
export * from "./library";

/* ---------------------------------------------------------------- the active library */

/**
 * The library in force: the principal's list with the app's edits on top (see library.ts). Pages
 * set it from what the server stores (setLibrary) before anything is drawn or checked; with no
 * edits it is the list itself.
 */
type Active = { lib: Library; key: string; version: number; list: Material[]; byId: Map<string, Material>; hidden: Set<string>; rules: Rule[]; ruleById: Map<string, Rule>; hiddenRules: Set<string> };
let active: Active = build({}, 0);

function build(lib: Library, version: number): Active {
  const a = applyLibrary(lib);
  return { lib, key: JSON.stringify(lib), version, list: a.materials, byId: new Map(a.materials.map((m) => [m.id, m])), hidden: a.hidden, rules: a.rules, ruleById: new Map(a.rules.map((r) => [r.id, r])), hiddenRules: a.hiddenRules };
}

/** Puts a library in force (the same library again changes nothing). */
export function setLibrary(lib: Library | null | undefined): void {
  const l = lib ?? {};
  if (JSON.stringify(l) === active.key) return;
  active = build(l, active.version + 1);
  setKnownMaterials(active.list.filter((m) => !active.hidden.has(m.id)).map((m) => m.id));
}
export const getLibrary = (): Library => active.lib;
/** Goes up each time the library changes (for caches and the 3D model's rebuild key). */
export const libraryVersion = () => active.version;

/** A material by number, hidden ones included (so an old pick can still be named). */
export const material = (id: string): Material | undefined => active.byId.get(id);
export const rule = (id: string): Rule | undefined => (active.hiddenRules.has(id) ? undefined : active.ruleById.get(id));
/** Whether a material can be chosen: in the library and not hidden. */
export const isListed = (id: string) => active.byId.has(id) && !active.hidden.has(id);
export const isHidden = (id: string) => active.hidden.has(id);
/** The materials that can be chosen, in list order, added ones last. */
export const listMaterials = (): Material[] => active.list.filter((m) => !active.hidden.has(m.id));
/** Every material in the library, hidden ones too (for the editor). */
export const libraryMaterials = (): Material[] => active.list;
export const listRules = (): Rule[] => active.rules.filter((r) => !active.hiddenRules.has(r.id));
export const libraryRules = (): Rule[] => active.rules;
export const isRuleHidden = (id: string) => active.hiddenRules.has(id);

/** The recommended materials for a part key ("gift.wrap"): the library's, else the structure's. */
function recommended(key: string, base: string[]): string[] {
  const own = active.lib.recommend?.[key]?.filter(isListed);
  if (own?.length) return own;
  const b = base.filter(isListed);
  return b.length ? b : base;
}
/** The recommended materials for a structure's insert of one kind. */
export const insertOptionsFor = (form: Form, kind: Insert): string[] => recommended(`${form}.insert.${kind}`, form === "brocade" && kind === "velvet" ? ["M128", "M129", "M036"] : INSERT_OPTIONS[kind]);

/** The key a part's recommendations are stored under. */
export const recommendKey = (form: Form, slotId: string, kind?: string) => (kind ? `${form}.${slotId}.${kind}` : `${form}.${slotId}`);

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
  /** listed materials recommended for this part as it is drawn; the first is the default */
  options: string[];
  contact: Contact;
  print?: PrintRole;
  /** grade and thickness as the structure is drawn (grammage, wall), for the job sheet */
  grade?: Pair;
  /** the grammage (g/m²) that grade means, for the weight and cost estimates */
  gsm?: number;
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

const CORE: Slot = { id: "core", label: P("灰板骨架", "Board core"), options: ["M016"], contact: "outer", grade: P("1200–1500 g", "1200–1500 gsm"), gsm: 1200 };
const WRAP_PAPERS = ["M019", "M020", "M005", "M021", "M037", "M031", "M028", "M029", "M030", "M032", "M038"];
const wrap = (grade = P("128–157 g", "128–157 gsm")): Slot => ({ id: "wrap", label: P("裱纸", "Wrap"), options: WRAP_PAPERS, contact: "outer", print: "stock", grade, gsm: 157 });
const LABEL_PAPERS = ["M079", "M053", "M019", "M021", "M037", "M038"];
const label = (first: string, contact: Contact = "outer"): Slot => ({ id: "label", label: P("标签", "Label"), options: [first, ...LABEL_PAPERS.filter((x) => x !== first)], contact, print: "stock", gsm: 80 });

/** The parts of each structure, with the library's recommendations. */
export function slotsOf(form: Form): Slot[] {
  return baseSlotsOf(form).map((s) => ({ ...s, options: recommended(recommendKey(form, s.id), s.options) }));
}

/** The parts of each structure, as built in 3D and laid out in the print file. */
function baseSlotsOf(form: Form): Slot[] {
  switch (form) {
    case "carton":
      return [{ id: "body", label: P("盒身", "Carton board"), options: ["M001", "M003", "M002", "M005", "M079"], contact: "outer", print: "board", grade: P("300–400 g/m²，厚约 0.45 mm", "300–400 gsm, about 0.45 mm"), gsm: 350 }];
    case "gift":
    case "bookBox":
      return [CORE, wrap()];
    case "drawer":
      return [CORE, wrap(), { id: "ribbon", label: P("拉带", "Ribbon pull"), options: ["M128", "M126", "M122"], contact: "outer" }];
    case "mailer":
      return [{ id: "body", label: P("瓦楞纸板", "Corrugated board"), options: ["M012"], contact: "outer", print: "board", grade: P("3 mm E/B 楞", "3 mm E/B flute"), gsm: 500 }];
    case "paperTube":
      return [
        { id: "body", label: P("筒身纸管", "Tube"), options: ["M027"], contact: "outer", grade: P("卷制纸管，壁厚约 2 mm", "wound tube, about 2 mm wall") },
        wrap(P("128–157 g", "128–157 gsm")),
        { id: "liner", label: P("内衬", "Liner"), options: ["M033", "M094", "M102"], contact: "direct" },
      ];
    case "bag":
      return [
        { id: "body", label: P("袋身", "Bag paper"), options: ["M001", "M019", "M020", "M005", "M004"], contact: "outer", print: "board", grade: P("157–250 g", "157–250 gsm"), gsm: 250 },
        { id: "handle", label: P("提手绳", "Rope handles"), options: ["M122", "M004", "M126"], contact: "outer" },
        { id: "base", label: P("底板", "Base card"), options: ["M016", "M001", "M002"], contact: "outer", gsm: 1200 },
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
        { id: "card", label: P("背卡", "Backing card"), options: ["M001", "M003", "M002"], contact: "outer", print: "board", grade: P("350 g，背面涂热封胶", "350 gsm, heat-seal coated"), gsm: 350 },
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
        { id: "body", label: P("罐身与罐盖", "Body and lid"), options: ["M099", "M100", "M101"], contact: "direct", print: "board", grade: P("0.21–0.25 mm，印铁", "0.21–0.25 mm, printed flat"), gsm: 1806 },
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
        { id: "slip", label: P("题签", "Title slip"), options: ["M021", "M037", "M038", "M019"], contact: "outer", print: "stock", grade: P("120 g", "120 gsm"), gsm: 120 },
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
  return { id: "insert", label, options: recommended(recommendKey(spec.form, "insert", kind), options), contact: "outer" };
}

/** Parts the list does not cover, by structure and effect: shown, never substituted. */
export type OffList = { id: string; label: Pair; why: Pair };
/**
 * The parts the list does not cover. Those the seller has assigned a listed material to
 * ("off.magnets" → a pick) are left out unless `all` is asked for.
 */
export function offListOf(spec: { form: Form; effects?: Effect[]; inner?: { form: Form } | null; materials?: Record<string, MaterialPick> }, all = false): OffList[] {
  const out: OffList[] = [];
  const fx = spec.effects ?? [];
  if (spec.form === "bookBox") out.push({ id: "magnets", label: P("磁铁", "Magnets"), why: P("书型盒翻边内嵌磁铁；清单中没有磁性材料。", "The book box's flap holds magnets; the list has no magnetic material.") });
  if (spec.form === "bag") out.push({ id: "eyelets", label: P("金属扣眼", "Metal eyelets"), why: P("绳孔的加固扣眼；清单中没有对应的五金件。", "The eyelets that reinforce the rope holes; the list has no such hardware.") });
  if (fx.some((e) => e === "goldFoil" || e === "silverFoil")) out.push({ id: "foil", label: P("烫印电化铝", "Hot-stamping foil"), why: P("烫金、烫银用的电化铝箔不在清单中（M102 铝箔是包装箔，不是烫印箔）。", "The hot-stamping foil for gold and silver is not on the list (M102 is packaging foil, not stamping foil).") });
  if (fx.includes("holo")) out.push({ id: "holo", label: P("镭射烫印膜", "Holographic stamping foil"), why: P("镭射烫印膜不在清单中（M034 全息纸是纸，不是烫印膜）。", "Holographic stamping foil is not on the list (M034 is a paper, not a stamping foil).") });
  return all ? out : out.filter((o) => !isListed(spec.materials?.[`off.${o.id}`]?.id ?? ""));
}

/** The product packed in a combination, as a package of its own (sharing the finish and effects). */
export function innerSpecOf(spec: PackSpec): PackSpec | null {
  const i = spec.inner;
  if (!i || !isOuter(spec.form)) return null;
  return { form: i.form, w: i.w, h: i.h, d: i.d, finish: spec.finish, effects: spec.effects };
}

/** Corrugated boards on the list (single, double and triple wall, micro flute). */
const FLUTED = new Set(["M012", "M013", "M014", "M015"]);
/**
 * A corrugated pack printed the usual way: four-colour on a board facing, mounted on the flute
 * (litho-lam). Then the facing is a part of its own; a pack printed direct on the flute has none.
 */
export function lithoLam(spec: PackSpec): boolean {
  if (spec.form !== "mailer" && spec.form !== "carton") return false;
  const body = spec.materials?.body;
  if (body?.route === "direct") return false;
  return spec.form === "mailer" || FLUTED.has(body?.id ?? "");
}
const FACING: Slot = { id: "facing", label: P("彩印面纸（裱坑）", "Printed facing (litho-lam)"), options: ["M002", "M001", "M003", "M020"], contact: "outer", print: "board", grade: P("250 g，四色印刷后裱瓦楞", "250 gsm, printed four-colour and mounted on flute"), gsm: 250 };

/** A structure's own parts (and its insert). */
function ownParts(spec: PackSpec): Slot[] {
  const out = slotsOf(spec.form);
  if (lithoLam(spec)) out.splice(1, 0, FACING);
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
  // a laminated finish drops the uncoated papers, an uncoated one the coated; others stay
  const keep = slot.options.filter((id) => (laminated(finish) ? !SPECIALTY.has(id) : !COATED.has(id)));
  return keep.length ? keep : slot.options;
}

/** What the seller has chosen for a part (nothing chosen is an empty choice). */
export const choiceOf = (spec: PackSpec, key: string): MaterialPick => spec.materials?.[key] ?? {};

/** The material a part is made of: any listed material the seller picked, else the default. */
export function pick(spec: PackSpec, key: string, slot: Slot): string {
  const chosen = choiceOf(spec, key).id;
  return chosen && isListed(chosen) ? chosen : optionsFor(slot, spec.finish)[0];
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
  return out.map((x) => {
    // the library may set another default for a process material
    const id = recommended(recommendKey(f, "process", x.key), [x.id])[0];
    return { ...x, id, note: id === x.id ? x.note : undefined, key: prefix + "process." + x.key, label: own_ ? { zh: `${own_.zh} · ${x.label.zh}`, en: `${own_.en}: ${x.label.en.toLowerCase()}` } : x.label };
  });
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

export type UseKind = "part" | "process" | "off" | "extra";

export type Use = {
  key: string;
  kind: UseKind;
  label: Pair;
  id: string;
  m: Material;
  contact: Contact;
  /** the contact the structure implies, before the seller's say */
  defaultContact: Contact;
  inner: boolean;
  /** what this part touches: "food", "cosmetics" or nothing regulated */
  touches: "food" | "cosmetics" | null;
  /** grade and thickness: the seller's, else the structure's */
  grade?: Pair;
  note?: Pair;
  /** the seller's own fields */
  choice: MaterialPick;
  /** grammage in force: the seller's, the library's for the material, else the structure's grade */
  gsm?: number;
  /** recommended materials for the part (the first is the default) */
  options: string[];
  defaultId: string;
  /** the 3D model shows this pick's own look (or the part is not drawn differently by material) */
  drawn: boolean;
  /** a process material the seller dropped */
  removed?: true;
  process?: true;
};

/** A part's own 3D look by material, where the model draws it (see lookOf). */
function drawnAs(spec: PackSpec, key: string, id: string, defaultId: string): boolean {
  if (id === defaultId) return true;
  // a colour from the library is drawn where the part shows its colour
  if (material(id)?.look && colorDrawn(spec, key)) return true;
  if ((spec.form === "carton" || spec.form === "bag") && key === "body") return id in BOARD;
  if (key === "insert") return id in INSERT_TINT || ["M036", "M129", "M128"].includes(id);
  if (spec.form === "brocade" && key === "toggle") return id in TOGGLE;
  if (spec.form === "woodBox" && key === "body") return id in WOOD;
  if (key === "liner" || key === "inner.liner") return ["M033", "M094", "M102"].includes(id);
  return false;
}

const touchesOf = (contact: Contact, category: string) => (contact !== "direct" ? null : isFood(category) ? "food" : isCosmetic(category) ? "cosmetics" : null);
const gradeOf = (c: MaterialPick, fallback?: Pair): Pair | undefined => (c.grade ? { zh: c.grade, en: c.grade } : fallback);

/**
 * Every material in the package: the structure's parts, parts off the list the seller assigned a
 * material to, the seller's own parts, then the process materials. Dropped process materials are
 * left out unless `all` is asked for (the Materials tab lists them to bring back).
 */
export function usesOf(spec: PackSpec, category: string, all = false): Use[] {
  const out: Use[] = [];
  for (const { key, slot, inner } of partsOf(spec)) {
    const c = choiceOf(spec, key);
    const id = pick(spec, key, slot);
    const options = optionsFor(slot, spec.finish);
    const contact = c.contact ?? slot.contact;
    out.push({ key, kind: "part", label: slot.label, id, m: material(id)!, contact, defaultContact: slot.contact, inner, touches: touchesOf(contact, category), grade: gradeOf(c, slot.grade), note: stockNote(spec, id) ?? undefined, choice: c, gsm: c.gsm ?? material(id)?.gsm ?? (id === options[0] || !material(id)?.gsm ? slot.gsm : undefined), options, defaultId: options[0], drawn: drawnAs(spec, key, id, options[0]) });
  }
  for (const o of offListOf(spec, true)) {
    const key = `off.${o.id}`;
    const c = choiceOf(spec, key);
    if (!c.id || !isListed(c.id)) continue;
    const contact = c.contact ?? "outer";
    out.push({ key, kind: "off", label: o.label, id: c.id, m: material(c.id)!, contact, defaultContact: "outer", inner: false, touches: touchesOf(contact, category), grade: gradeOf(c), choice: c, gsm: c.gsm ?? material(c.id)?.gsm, options: [], defaultId: "", drawn: false });
  }
  for (const x of spec.extraParts ?? []) {
    if (!isListed(x.id) || (x.inner && !spec.inner)) continue;
    const contact = x.contact ?? "outer";
    const { key: _k, label, id, inner, ...c } = x; // eslint-disable-line @typescript-eslint/no-unused-vars
    out.push({ key: `extra.${x.key}`, kind: "extra", label: { zh: label, en: label }, id, m: material(id)!, contact, defaultContact: "outer", inner: !!inner, touches: touchesOf(contact, category), grade: gradeOf(c), choice: { ...c, id }, gsm: c.gsm ?? material(id)?.gsm, options: [], defaultId: "", drawn: false });
  }
  for (const p of processesOf(spec)) {
    const c = choiceOf(spec, p.key);
    if (c.id === "none" && !all) continue;
    const id = c.id && isListed(c.id) ? c.id : p.id;
    const inner = p.key.startsWith("inner.");
    out.push({ key: p.key, kind: "process", label: p.label, id, m: material(id)!, contact: c.contact ?? "outer", defaultContact: "outer", inner, touches: touchesOf(c.contact ?? "outer", category), grade: gradeOf(c), note: id === p.id ? p.note : undefined, choice: c, options: [p.id], defaultId: p.id, drawn: true, process: true, ...(c.id === "none" ? { removed: true as const } : {}) });
  }
  return out;
}

/** Whether the pack is shipped as a courier box and whether it is a shopping bag: the seller's say, else the structure's. */
export function usageOf(spec: PackSpec): Required<PackUsage> {
  return { courier: spec.usage?.courier ?? spec.form === "mailer", shoppingBag: spec.usage?.shoppingBag ?? spec.form === "bag" };
}

/** Tidies the seller's choices: drops those for parts the package no longer has, and defaults. */
export function pruneMaterials(spec: PackSpec): PackSpec {
  const keep: Record<string, MaterialPick> = {};
  const defaults = new Map<string, { id: string; contact: Contact; none?: boolean }>();
  for (const { key, slot } of partsOf(spec)) defaults.set(key, { id: optionsFor(slot, spec.finish)[0], contact: slot.contact });
  for (const p of processesOf(spec)) defaults.set(p.key, { id: p.id, contact: "outer", none: true });
  for (const o of offListOf(spec, true)) defaults.set(`off.${o.id}`, { id: "", contact: "outer" });
  for (const [key, c] of Object.entries(spec.materials ?? {})) {
    const d = defaults.get(key);
    if (!d) continue;
    const next: MaterialPick = { ...c };
    if (!next.id || next.id === d.id || !(isListed(next.id) || (d.none && next.id === "none"))) delete next.id;
    if (next.contact === d.contact) delete next.contact;
    for (const f of ["grade", "color", "supplier", "note"] as const) if (!next[f]) delete next[f];
    for (const f of ["gsm", "unitCost", "mass"] as const) if (next[f] === undefined) delete next[f];
    if (Object.keys(next).length) keep[key] = next;
  }
  const extras = (spec.extraParts ?? []).filter((x) => !x.inner || spec.inner);
  const { materials: _m, extraParts: _x, ...rest } = spec; // eslint-disable-line @typescript-eslint/no-unused-vars
  return { ...rest, ...(Object.keys(keep).length ? { materials: keep } : {}), ...(extras.length ? { extraParts: extras } : {}) };
}

/** Changes a part's choices (an empty field clears it; the default material clears the pick). */
export function withChoice(spec: PackSpec, key: string, patch: Partial<MaterialPick>): PackSpec {
  return pruneMaterials({ ...spec, materials: { ...(spec.materials ?? {}), [key]: { ...choiceOf(spec, key), ...patch } } });
}

/** Sets one part's material. */
export const withMaterial = (spec: PackSpec, key: string, id: string): PackSpec => withChoice(spec, key, { id });

/** Back to the structure's own material and contact, with the seller's fields cleared. */
export function resetChoice(spec: PackSpec, key: string): PackSpec {
  const { [key]: _drop, ...rest } = spec.materials ?? {}; // eslint-disable-line @typescript-eslint/no-unused-vars
  return pruneMaterials({ ...spec, materials: rest });
}

/** Adds a part of the seller's own, made of a listed material. */
export function addExtra(spec: PackSpec, label: string, id: string, inner = false): PackSpec {
  const used = new Set((spec.extraParts ?? []).map((x) => x.key));
  let n = 1;
  while (used.has(`x${n}`)) n++;
  const part: ExtraPart = { key: `x${n}`, label: label.trim().slice(0, 24) || "部件", id, ...(inner && spec.inner ? { inner: true } : {}) };
  return { ...spec, extraParts: [...(spec.extraParts ?? []), part].slice(0, 12) };
}

export function updateExtra(spec: PackSpec, key: string, patch: Partial<ExtraPart>): PackSpec {
  const list = (spec.extraParts ?? []).map((x) => {
    if (x.key !== key) return x;
    const next: ExtraPart = { ...x, ...patch, key: x.key };
    for (const f of ["grade", "color", "supplier", "note", "contact"] as const) if (!next[f]) delete next[f];
    for (const f of ["gsm", "unitCost", "mass"] as const) if (next[f] === undefined) delete next[f];
    if (!next.label?.trim()) next.label = x.label;
    return next;
  });
  return { ...spec, extraParts: list };
}

export function removeExtra(spec: PackSpec, key: string): PackSpec {
  const list = (spec.extraParts ?? []).filter((x) => x.key !== key);
  const { extraParts: _x, ...rest } = spec; // eslint-disable-line @typescript-eslint/no-unused-vars
  return list.length ? { ...rest, extraParts: list } : rest;
}

/** Sets or clears (null) how the pack is used. */
export function withUsage(spec: PackSpec, k: keyof PackUsage, v: boolean | null): PackSpec {
  const usage: PackUsage = { ...(spec.usage ?? {}) };
  if (v === null) delete usage[k];
  else usage[k] = v;
  const { usage: _u, ...rest } = spec; // eslint-disable-line @typescript-eslint/no-unused-vars
  return Object.keys(usage).length ? { ...rest, usage } : rest;
}

/* ---------------------------------------------------------------- compliance */

export type Problem = { key: string; level: "error" | "warn"; text: Pair };

/**
 * Choices that break the list's own limits (a non-food material on a part that touches food: an
 * error) or that disagree with the finish (xuan stock that is not the handmade paper: a warning).
 */
export function problemsOf(uses: Use[], spec?: PackSpec): Problem[] {
  const out: Problem[] = [];
  for (const u of uses) {
    if (u.removed) continue;
    if (spec && u.kind === "part" && u.options.length === 1 && u.options[0] === HANDMADE && u.id !== HANDMADE && handmadeFinish(spec.finish))
      out.push({ key: u.key, level: "warn", text: P(`表面工艺是${spec.finish === "xuan" ? "宣纸" : "洒金笺"}，但${u.label.zh}选了 ${u.m.name.zh}（${u.id}）：两者须一致。`, `The finish is ${spec.finish === "xuan" ? "xuan paper" : "gold-flecked paper"}, but the ${u.label.en.toLowerCase()} is ${u.m.name.en} (${u.id}): make them agree.`) });
    if (u.touches === "food" && u.m.noFood) out.push({ key: u.key, level: "error", text: P(`${u.label.zh}直接接触食品，但清单把 ${u.m.name.zh}（${u.id}）限于非食品接触用途。`, `The ${u.label.en.toLowerCase()} touches food, but the list limits ${u.m.name.en} (${u.id}) to non-food-contact uses.`) });
    if (u.touches === "cosmetics" && u.m.noCosmetics) out.push({ key: u.key, level: "error", text: P(`${u.label.zh}直接接触化妆品，但清单写明 ${u.m.name.zh}（${u.id}）不作化妆品接触层。`, `The ${u.label.en.toLowerCase()} touches the cosmetic, but the list rules out ${u.m.name.en} (${u.id}) as a cosmetics contact layer.`) });
  }
  return out;
}

/** Why a rule applies: the parts that bring it, or the package as a whole. */
export type Applied = { rule: Rule; by: string[]; why: Pair };


/**
 * The rules that apply to this package, each with the parts that bring it. G01 always; G02 for
 * food and cosmetics sales packaging; G03/G04 when the package is the courier box; P01 for a
 * shopping bag or courier pack whose materials' paths name it; the F rules for parts that touch
 * food (F01 and each material's own); C01 for parts that touch cosmetics.
 */
export function rulesFor(spec: PackSpec, category: string, uses0 = usesOf(spec, category)): Applied[] {
  const uses = uses0.filter((u) => !u.removed);
  const use = usageOf(spec);
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
    for (const id of u.m.always ?? []) add(id, u.key, P("材料库为这种材料设定的规则", "Set for this material in the library"));
    // inks, adhesives and coatings on a pack that holds the food itself: the list's own rules for
    // them (F13, F10, F08), since outer layers can migrate, permeate or set off
    if (u.process && isFood(category) && primary.has(u.inner))
      for (const f of u.m.food) add(f, u.key, P("直接装食品的包装上的油墨、胶和涂层（间接接触也须评估）", "Inks, adhesives and coatings on the pack that holds the food (indirect contact is assessed too)"));
    if (u.m.courier && use.courier && !u.inner) add("G03", u.key, P("作为快递包装寄递", "Shipped as courier packaging"));
    if (u.m.bag && (use.shoppingBag || use.courier) && !u.inner) add("P01", u.key, P(use.shoppingBag ? "作为购物袋使用" : "作为快递包装寄递", use.shoppingBag ? "Used as a shopping bag" : "Shipped as courier packaging"));
  }
  if (isFood(category) || isCosmetic(category)) add("G02", null, P("食品和化妆品的销售包装：层数、空隙率、成本", "Food and cosmetics sales packaging: layers, void ratio, cost"));
  if (use.courier) {
    add("G03", null, P("作为快递包装寄递", "Shipped as courier packaging"));
    add("G04", null, P("快递包装：箱体与内件尺寸、层数、胶带用量", "Courier packaging: box-to-contents fit, layers, tape"));
  }
  const order = listRules().map((r) => r.id);
  return [...got.values()].sort((a, b) => order.indexOf(a.rule.id) - order.indexOf(b.rule.id));
}

/** The supplier documents to collect: each material's own list, once per kind, with its parts. */
export function documentsFor(uses: Use[]): { docs: Pair; ids: string[] }[] {
  const by = new Map<string, { docs: Pair; ids: string[] }>();
  for (const u of uses) {
    if (u.removed) continue;
    const docs = u.m.docsText ?? DOCS[u.m.docs];
    const g = by.get(docs.zh) ?? { docs, ids: [] };
    if (!g.ids.includes(u.id)) g.ids.push(u.id);
    by.set(docs.zh, g);
  }
  return [...by.values()];
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
  /** the seller's colour for a velvet, flock or satin tray or pad */
  velvetColor?: string;
  /** the seller's colour for ribbon, rope handles or a loop */
  rope?: string;
};

/** Mixes a hex colour toward white (t = share of white). */
function lighten(hex: string, t: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => Math.round(v + (255 - v) * t).toString(16).padStart(2, "0");
  return `#${ch((n >> 16) & 255)}${ch((n >> 8) & 255)}${ch(n & 255)}`.toUpperCase();
}

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
  // the seller's colour for a part, else the colour the library gives its material
  const color = (key: string) => {
    const own = choiceOf(spec, key).color;
    if (own) return own;
    const id = get(key);
    return id && colorDrawn(spec, key) ? material(id)?.look : undefined;
  };
  const board = spec.form === "carton" || spec.form === "bag" ? get("body") : null;
  if (board && BOARD[board]) look.board = BOARD[board];
  // the seller's colour for the board: its back, and the cut edge a little lighter
  if (board && color("body")) look.board = { inside: color("body")!, edge: lighten(color("body")!, 0.25) };
  const ins = get("insert");
  if (ins) {
    const kind = insertKind(spec);
    // satin is smoother and glossier than flock or velvet pile
    if (kind === "velvet") {
      if (ins === "M128") look.velvet = { sheen: 0.55, rough: 0.42 };
      if (color("insert")) look.velvetColor = color("insert");
    } else if (color("insert") ?? INSERT_TINT[ins]) look.insertTint = color("insert") ?? INSERT_TINT[ins];
  }
  if (spec.form === "brocade") {
    const t = TOGGLE[get("toggle") ?? "M069"] ?? TOGGLE.M069!;
    look.toggle = color("toggle") ? { ...t, color: color("toggle")! } : t;
  }
  if (spec.form === "woodBox") look.wood = color("body") ?? WOOD[get("body") ?? "M110"];
  const rope = spec.form === "drawer" ? color("ribbon") : spec.form === "bag" ? color("handle") : spec.form === "brocade" ? color("loop") : undefined;
  if (rope) look.rope = rope;
  const liner = spec.form === "paperTube" ? get("liner") : spec.inner?.form === "paperTube" ? get("inner.liner") : null;
  if (liner) look.liner = liner === "M094" ? "paper" : "foil";
  return look;
}

/** What the 3D model depends on among the choices: the materials and the colours, not the notes. */
export function lookKey(spec: PackSpec): string {
  return JSON.stringify([active.version, partsOf(spec).map((p) => pick(spec, p.key, p.slot)), lookOf(spec)]);
}

/** The parts whose colour the 3D model shows (others are recorded for the print file only). */
export function colorDrawn(spec: PackSpec, key: string): boolean {
  if (key === "insert") return true;
  if ((spec.form === "carton" || spec.form === "bag") && key === "body") return true;
  if (spec.form === "woodBox" && key === "body") return true;
  return (spec.form === "brocade" && (key === "toggle" || key === "loop")) || (spec.form === "drawer" && key === "ribbon") || (spec.form === "bag" && key === "handle");
}

/**
 * The material names an anatomy pin's text refers to: "{core}" and "{wrap}" in a pin become the
 * picked materials' names. `prefix` is "inner." for a combination's product.
 */
export function materialWords(spec: PackSpec, category: string, prefix = ""): Record<string, Pair> {
  const out: Record<string, Pair> = {};
  for (const u of usesOf(spec, category)) {
    if (u.kind !== "part") continue;
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

/** The seller's own fields for a part, for the print file: "白色，供应商 X，备注 Y". */
export function choiceText(u: Use, lang: "zh" | "en"): string {
  const c = u.choice;
  const bits: string[] = [];
  if (c.color) bits.push(lang === "zh" ? `颜色 ${c.color}` : `colour ${c.color}`);
  if (c.supplier) bits.push(lang === "zh" ? `供应商 ${c.supplier}` : `supplier ${c.supplier}`);
  if (c.gsm) bits.push(`${c.gsm} g/m²`);
  if (c.note) bits.push(lang === "zh" ? `备注 ${c.note}` : `note: ${c.note}`);
  return bits.join(lang === "zh" ? "，" : ", ");
}

/** One line for the print file: "裱纸：单面铜版纸 M019，128–157 g；灰板骨架：灰纸板 M016，1200–1500 g". */
export function materialLine(spec: PackSpec, category: string, inner: boolean): Pair {
  const parts = usesOf(spec, category).filter((u) => !u.process && u.inner === inner);
  const one = (lang: "zh" | "en") =>
    parts
      .map((u) => {
        const name = lang === "zh" ? u.m.name.zh : u.m.name.en;
        const note = u.note ? (lang === "zh" ? `（${u.note.zh}）` : ` (${u.note.en})`) : "";
        const grade = u.grade ? (lang === "zh" ? `，${u.grade.zh}` : `, ${u.grade.en}`) : "";
        const own = choiceText(u, lang);
        return `${lang === "zh" ? u.label.zh : u.label.en}${lang === "zh" ? "：" : ": "}${name}${note} ${u.id}${grade}${own ? (lang === "zh" ? `，${own}` : `, ${own}`) : ""}`;
      })
      .join(lang === "zh" ? "；" : "; ");
  return { zh: one("zh"), en: one("en") };
}

export const familyLabel = (id: string) => FAMILIES.find((f) => f.id === id)?.label;
export const pathText = (m: Material) => PATHS[m.path];
export const sourceText = (m: Material) => SOURCES[m.source];

/**
 * The library's changes for the model's prompt: added materials it may now use, edited names and
 * limits, and hidden materials it must not. Empty when the library is the list itself.
 */
export function libraryPrompt(): string {
  const lib = active.lib;
  const row = (m: Material) => `| ${m.id} | ${m.name.zh} | ${FAMILIES.find((f) => f.id === m.family)?.label.zh ?? ""} | ${m.use.zh} | ${m.boundary.zh}${m.noFood ? "（非食品接触）" : ""} |`;
  const added = (lib.added ?? []).filter((m) => !active.hidden.has(m.id)).map((m) => active.byId.get(m.id)!);
  const edited = Object.keys(lib.materials ?? {}).filter((id) => !active.hidden.has(id) && id.startsWith("M")).map((id) => active.byId.get(id)!);
  const hidden = [...active.hidden];
  if (!added.length && !edited.length && !hidden.length) return "";
  const out = ["# 材料库更新（本应用对委托方材料清单的修改，与上表冲突时以此为准）"];
  if (added.length || edited.length) out.push("", "| 编号 | 材料 | 大类 | 典型用途 | 使用边界 |", "|---|---|---|---|---|", ...[...added, ...edited].map(row));
  if (hidden.length) out.push("", `以下编号已停用，不得选用：${hidden.join("、")}。`);
  return out.join("\n");
}

/* ---------------------------------------------------------------- frozen snapshots */

/**
 * Freezes a project's materials with the library as it is now, so later library changes don't
 * alter a design that has been signed off. The pack then uses the frozen library everywhere.
 */
export function freezeMaterials(spec: PackSpec, live: Library, note?: string): PackSpec {
  return { ...spec, frozen: { at: new Date().toISOString(), library: live, ...(note?.trim() ? { note: note.trim().slice(0, 160) } : {}) } };
}
export function unfreezeMaterials(spec: PackSpec): PackSpec {
  const { frozen: _f, ...rest } = spec; // eslint-disable-line @typescript-eslint/no-unused-vars
  return rest;
}
/** The library a pack uses: its frozen one, else the live one. */
export const libraryFor = (spec: PackSpec | undefined, live: Library | undefined): Library | undefined => spec?.frozen?.library ?? live;
