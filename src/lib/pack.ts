/**
 * Package structure: the physical form the directions are shown on, its outside size in
 * millimetres, the surface finish, and optionally products packed inside it (a combination
 * such as a bottle in a carton or two tins in a gift box).
 * Client-safe: no server imports.
 */
import type { Pair } from "./i18n";
import { isCategory, type Category } from "./categories";

export const FORMS = ["carton", "gift", "bookBox", "mailer", "drawer", "paperTube", "bag", "aseptic", "pouch", "bottle", "tube", "blister", "jar", "glassBottle", "tin", "can", "ceramic", "woodBox", "brocade"] as const;
export type Form = (typeof FORMS)[number];

/**
 * The base surface: one per package (lamination or the bare stock). xuan (宣纸) and goldFleck
 * (洒金笺) are papers in their own right, chosen for their fibres and flecks.
 */
export const FINISHES = ["matte", "gloss", "softTouch", "paper", "xuan", "goldFleck"] as const;
export type Finish = (typeof FINISHES)[number];

/**
 * Extra print effects on top of the base, applied to the brand name and key graphics (letterpress
 * to all the type). Any combination, except that a package takes one foil (gold, silver or
 * holographic) and one pressing (emboss raises, deboss presses in, letterpress presses the inked
 * type in as the old relief presses did).
 */
export const EFFECTS = ["goldFoil", "silverFoil", "holo", "spotUV", "emboss", "deboss", "letterpress"] as const;
export type Effect = (typeof EFFECTS)[number];
export const FOILS: readonly Effect[] = ["goldFoil", "silverFoil", "holo"];
export const PRESSES: readonly Effect[] = ["emboss", "deboss", "letterpress"];

/** Forms that can hold products (combinations). */
export const OUTER_FORMS = ["carton", "gift", "bookBox", "mailer", "drawer", "woodBox", "bag", "brocade"] as const;
export type OuterForm = (typeof OUTER_FORMS)[number];
/** Forms that go inside another (the product's own container). */
export const INNER_FORMS = ["bottle", "tube", "jar", "glassBottle", "tin", "can", "ceramic", "paperTube", "aseptic", "pouch"] as const;
export type InnerForm = (typeof INNER_FORMS)[number];

/** Round forms: `w` is the diameter and `d` equals it. */
export const ROUND_FORMS: readonly Form[] = ["tin", "can", "paperTube", "bottle", "tube", "jar", "glassBottle", "ceramic"];
/** Forms with an open motion (unfold, lid off, tray out, stopper out). */
export const CAN_OPEN: readonly Form[] = ["carton", "gift", "bookBox", "mailer", "drawer", "woodBox", "paperTube", "aseptic", "tin", "can", "jar", "glassBottle", "ceramic", "brocade"];

/** What the products sit in, inside a combination (the cushioning families in use today). */
export const INSERTS = ["velvet", "pulp", "foam", "card"] as const;
export type Insert = (typeof INSERTS)[number];
export const INSERT_LABELS: Record<Insert, Pair> = {
  velvet: { zh: "植绒内托", en: "Flocked tray" },
  pulp: { zh: "纸浆模塑", en: "Moulded pulp" },
  foam: { zh: "EPE 珍珠棉", en: "EPE foam" },
  card: { zh: "卡纸内卡", en: "Card insert" },
};

export type InnerSpec = { form: InnerForm; count: 1 | 2; w: number; h: number; d: number; insert?: Insert };
/**
 * `materials` holds the seller's picks from the principal's material list, by part ("wrap",
 * "insert", "inner.body"…) → material number ("M019"); parts not named use their default (see
 * src/lib/materials).
 */
export type PackSpec = { form: Form; w: number; h: number; d: number; finish: Finish; effects?: Effect[]; inner?: InnerSpec | null; materials?: Record<string, string> };

/** Turns an effect on or off, keeping a single foil and a single pressing. */
export function withEffect(spec: PackSpec, e: Effect, on: boolean): PackSpec {
  let list = (spec.effects ?? []).filter((x) => x !== e);
  if (on) {
    if (FOILS.includes(e)) list = list.filter((x) => !FOILS.includes(x));
    if (PRESSES.includes(e)) list = list.filter((x) => !PRESSES.includes(x));
    list.push(e);
  }
  return { ...spec, effects: EFFECTS.filter((x) => list.includes(x)) };
}

/** Forms with no printed surface: the pine crate is laser-engraved, so it takes no foil, spot UV or embossing. */
export const ENGRAVED_FORMS: readonly Form[] = ["woodBox"];
/** Whether any printed part of the package can carry the extra effects (a crate's packed products can). */
export const takesEffects = (spec: { form: Form; inner?: unknown }): boolean => !ENGRAVED_FORMS.includes(spec.form) || !!spec.inner;

export const foilOf = (spec: { effects?: Effect[] }): Effect | null => spec.effects?.find((e) => FOILS.includes(e)) ?? null;

export const MATERIAL_GROUPS: { id: string; label: Pair; forms: readonly Form[] }[] = [
  { id: "paper", label: { zh: "纸与卡纸", en: "Paper and board" }, forms: ["carton", "gift", "bookBox", "mailer", "drawer", "paperTube", "bag"] },
  { id: "composite", label: { zh: "复合材料", en: "Composite" }, forms: ["aseptic"] },
  { id: "plastic", label: { zh: "塑料", en: "Plastic" }, forms: ["pouch", "bottle", "tube", "blister"] },
  { id: "glass", label: { zh: "玻璃", en: "Glass" }, forms: ["jar", "glassBottle"] },
  { id: "metal", label: { zh: "金属", en: "Metal" }, forms: ["tin", "can"] },
  { id: "ceramic", label: { zh: "陶瓷", en: "Ceramic" }, forms: ["ceramic"] },
  { id: "wood", label: { zh: "木材", en: "Wood" }, forms: ["woodBox"] },
  { id: "fabric", label: { zh: "织物", en: "Fabric" }, forms: ["brocade"] },
];

export const FORM_LABELS: Record<Form, Pair> = {
  carton: { zh: "直立盒", en: "Tuck carton" },
  gift: { zh: "天地盖礼盒", en: "Lid-and-base gift box" },
  bookBox: { zh: "书型磁吸礼盒", en: "Book-style magnetic box" },
  mailer: { zh: "飞机盒", en: "Corrugated mailer" },
  drawer: { zh: "抽屉盒", en: "Drawer box" },
  paperTube: { zh: "纸罐", en: "Paper tube" },
  bag: { zh: "手提纸袋", en: "Paper bag" },
  aseptic: { zh: "利乐砖", en: "Aseptic carton" },
  blister: { zh: "泡罩卡", en: "Blister card" },
  can: { zh: "易拉罐", en: "Drink can" },
  woodBox: { zh: "抽盖木箱", en: "Wooden crate" },
  pouch: { zh: "自立拉链袋", en: "Stand-up pouch" },
  bottle: { zh: "按压瓶", en: "Pump bottle" },
  tube: { zh: "软管", en: "Squeeze tube" },
  jar: { zh: "玻璃罐", en: "Glass jar" },
  glassBottle: { zh: "玻璃瓶", en: "Glass bottle" },
  tin: { zh: "马口铁罐", en: "Round tin" },
  ceramic: { zh: "瓷茶叶罐", en: "Porcelain caddy" },
  brocade: { zh: "宋锦盒", en: "Song brocade box" },
};

export const FORM_NOTES: Record<Form, Pair> = {
  carton: { zh: "最常见的折叠纸盒，可展开看刀模结构。", en: "The everyday folding carton; unfold it to see the net." },
  gift: { zh: "上盖下底的硬纸板礼盒，适合礼品和特产，可打开看内部。", en: "Rigid lid-and-base box for gifts and specialties; open it to see inside." },
  bookBox: { zh: "像精装书一样翻开的硬礼盒，磁吸扣合，茶叶和化妆品套装常用。", en: "A rigid box that opens like a hardback book and closes on magnets; common for tea and cosmetic sets." },
  mailer: { zh: "电商发货最常用的瓦楞纸盒，翻盖带插舌，开箱即展示。", en: "The e-commerce shipping box in corrugated board, with a tuck-in lid; the unboxing is the display." },
  drawer: { zh: "外套加抽屉，拉出即见内容物，化妆品和礼品常用。", en: "A sleeve and a sliding tray; pull it out to reveal the contents. Common for cosmetics and gifts." },
  paperTube: { zh: "纸质圆筒，盖子套在内颈上，茶叶和化妆品常用，环保。", en: "A paperboard cylinder with a lid over an inner neck; used for tea and cosmetics, and recyclable." },
  bag: { zh: "门店和礼品用的手提纸袋，带绳提手和侧面风琴折。", en: "A retail and gift bag with rope handles and gusseted sides." },
  aseptic: { zh: "纸 / 塑 / 铝复合的无菌砖，牛奶、果汁、植物饮品常用，顶部折耳，带旋盖。", en: "A board / PE / foil aseptic brick for milk, juice and plant drinks, with folded ears and a screw cap." },
  blister: { zh: "印刷卡纸加透明塑料泡罩，挂钩陈列，小件化妆品和五金常用。", en: "A printed card with a clear plastic blister, made to hang on a peg; common for small cosmetics and hardware." },
  can: { zh: "两片式铝罐，罐身直接印刷，带拉环，饮料和特产饮品常用。", en: "A two-piece aluminium can printed directly on the body, with a pull tab, for drinks and specialty beverages." },
  woodBox: { zh: "实木箱（默认松木），盖子沿槽抽出，盖面激光烙印品牌，茶叶、酒、土特产礼盒常用。", en: "A solid-wood crate (pine by default) whose lid slides out along grooves, with the brand laser-engraved on the lid; used for tea, spirits and specialty gifts." },
  pouch: { zh: "复合膜自立袋，带自封拉链，零食、茶叶、特产最常用。", en: "A laminated stand-up pouch with a zip, the most common pack for snacks, tea and specialties." },
  bottle: { zh: "塑料按压泵瓶，洗护和护肤品常用。", en: "A plastic pump bottle for body care and skincare." },
  tube: { zh: "可挤压软管，倒立放置，洁面和护手霜常用。", en: "A squeeze tube that stands on its cap, for cleansers and hand creams." },
  jar: { zh: "玻璃罐配旋盖，蜂蜜、酱料、茶叶常用，内容物看得见。", en: "A glass jar with a screw cap for honey, sauces or tea; the contents show through." },
  glassBottle: { zh: "玻璃瓶配瓶塞，酒、油、饮品常用。", en: "A glass bottle with a stopper, for spirits, oils and drinks." },
  tin: { zh: "茶叶、糖果常用的金属圆罐，标签环绕一周。", en: "Metal tin for tea and sweets, with a wrap-around print." },
  ceramic: { zh: "上釉的瓷罐配瓷盖，茶叶和土特产常用，可重复使用。", en: "A glazed porcelain jar with a porcelain lid, for tea and specialties; reusable." },
  brocade: { zh: "灰板外裱宋锦纹织物的翻盖锦盒，盖上贴一张印刷题签，扣与绳圈扣合，茶器、名茶、文房与珍品常用。", en: "A hinged box of greyboard covered in a fabric woven in the Song brocade pattern, with a printed title slip on the lid and a toggle with a loop; for tea ware, fine tea, scholar's objects and treasures." },
};

export const FINISH_LABELS: Record<Finish, Pair> = {
  matte: { zh: "哑膜", en: "Matte" },
  gloss: { zh: "亮膜", en: "Gloss" },
  softTouch: { zh: "触感膜", en: "Soft-touch" },
  paper: { zh: "不覆膜纸感", en: "Uncoated paper" },
  xuan: { zh: "宣纸", en: "Xuan paper" },
  goldFleck: { zh: "洒金笺", en: "Gold-flecked paper" },
};

export const FINISH_HINTS: Record<Finish, Pair> = {
  matte: { zh: "低反光，颜色沉稳", en: "Low glare, settled color" },
  gloss: { zh: "高光亮，颜色更艳", en: "Bright highlights, vivid color" },
  softTouch: { zh: "丝绒手感，略带柔光", en: "Velvety feel, a soft sheen" },
  paper: { zh: "纸纹可见，自然质朴", en: "Visible paper texture, natural" },
  xuan: { zh: "长纤维柔软微透，墨色温润", en: "Long soft fibres, faintly translucent; ink sits warm" },
  goldFleck: { zh: "纸中散落金箔碎片，随光闪烁", en: "Flakes of gold leaf in the sheet, catching the light" },
};

export const EFFECT_LABELS: Record<Effect, Pair> = {
  goldFoil: { zh: "烫金", en: "Gold foil" },
  silverFoil: { zh: "烫银", en: "Silver foil" },
  holo: { zh: "镭射", en: "Holographic foil" },
  spotUV: { zh: "局部 UV", en: "Spot UV" },
  emboss: { zh: "击凸", en: "Emboss" },
  deboss: { zh: "压凹", en: "Deboss" },
  letterpress: { zh: "凸版压印", en: "Letterpress" },
};

/** Short wording of a finish with its effects, e.g. "哑膜 + 烫金 + 击凸". */
export function finishText(spec: { finish: Finish; effects?: Effect[] }, lang: "zh" | "en"): string {
  const one = (p: Pair) => (lang === "en" ? p.en : p.zh);
  return [one(FINISH_LABELS[spec.finish]), ...(spec.effects ?? []).map((e) => one(EFFECT_LABELS[e]))].join(" + ");
}

/** Size labels. For round forms, "w" is the diameter and "d" is not used. */
export const DIM_LABELS: Record<"w" | "h" | "d", Pair> = {
  w: { zh: "宽", en: "Width" },
  h: { zh: "高", en: "Height" },
  d: { zh: "深", en: "Depth" },
};
export const DIAMETER_LABEL: Pair = { zh: "直径", en: "Diameter" };
export const GUSSET_LABEL: Pair = { zh: "底部展开", en: "Gusset" };

export const DIM_RANGE = { min: 20, max: 500 } as const;

/**
 * Starting pack per category, after the usual pairings sellers use: tea in tins inside a gift
 * box, a specialty in a glass jar in a gift box, a pump bottle in its carton, snacks in a
 * stand-up pouch, an appliance in a corrugated case, and so on.
 */
export const CATEGORY_PACK: Record<Category, PackSpec> = {
  tea: { form: "gift", w: 236, h: 146, d: 142, finish: "matte", inner: { form: "tin", count: 2, w: 86, h: 120, d: 86, insert: "velvet" } },
  specialty: { form: "gift", w: 124, h: 121, d: 136, finish: "paper", inner: { form: "jar", count: 1, w: 80, h: 95, d: 80, insert: "pulp" } },
  cosmetics: { form: "carton", w: 56, h: 176, d: 56, finish: "gloss", inner: { form: "bottle", count: 1, w: 52, h: 170, d: 52 } },
  appliance: { form: "carton", w: 340, h: 260, d: 220, finish: "matte" },
  snacks: { form: "pouch", w: 160, h: 230, d: 80, finish: "matte" },
  beverage: { form: "gift", w: 274, h: 98, d: 128, finish: "paper", inner: { form: "glassBottle", count: 1, w: 72, h: 230, d: 72, insert: "velvet" } },
  health: { form: "carton", w: 70, h: 120, d: 70, finish: "gloss" },
  personalCare: { form: "bottle", w: 70, h: 220, d: 70, finish: "gloss" },
  baby: { form: "tin", w: 100, h: 130, d: 100, finish: "gloss" },
  pet: { form: "pouch", w: 200, h: 300, d: 90, finish: "matte" },
  homeGoods: { form: "mailer", w: 260, h: 80, d: 200, finish: "matte" },
  electronics: { form: "drawer", w: 140, h: 50, d: 100, finish: "gloss" },
  apparel: { form: "mailer", w: 300, h: 80, d: 240, finish: "paper" },
  toys: { form: "blister", w: 150, h: 220, d: 40, finish: "gloss" },
  other: { form: "carton", w: 120, h: 170, d: 60, finish: "matte" },
};

/** The shape the landing page and demo start from. */
export const DEFAULT_PACK: PackSpec = { form: "carton", w: 110, h: 150, d: 46, finish: "matte" };

/** Typical sizes when a seller switches form, so a tin doesn't inherit an appliance box's size. */
export const FORM_PRESET: Record<Form, { form: Form; w: number; h: number; d: number }> = {
  carton: { form: "carton", w: 110, h: 150, d: 46 },
  gift: { form: "gift", w: 300, h: 96, d: 220 },
  bookBox: { form: "bookBox", w: 240, h: 70, d: 180 },
  mailer: { form: "mailer", w: 260, h: 80, d: 200 },
  drawer: { form: "drawer", w: 200, h: 70, d: 140 },
  paperTube: { form: "paperTube", w: 80, h: 140, d: 80 },
  bag: { form: "bag", w: 260, h: 320, d: 110 },
  aseptic: { form: "aseptic", w: 95, h: 166, d: 63 },
  blister: { form: "blister", w: 120, h: 180, d: 28 },
  can: { form: "can", w: 66, h: 115, d: 66 },
  woodBox: { form: "woodBox", w: 300, h: 140, d: 220 },
  pouch: { form: "pouch", w: 140, h: 210, d: 70 },
  bottle: { form: "bottle", w: 52, h: 170, d: 52 },
  tube: { form: "tube", w: 38, h: 160, d: 38 },
  jar: { form: "jar", w: 80, h: 95, d: 80 },
  glassBottle: { form: "glassBottle", w: 72, h: 230, d: 72 },
  tin: { form: "tin", w: 86, h: 120, d: 86 },
  ceramic: { form: "ceramic", w: 90, h: 120, d: 90 },
  brocade: { form: "brocade", w: 240, h: 96, d: 180 },
};

export const isRound = (f: Form) => ROUND_FORMS.includes(f);
export const isOuter = (f: Form): f is OuterForm => (OUTER_FORMS as readonly string[]).includes(f);
export const isInner = (f: string): f is InnerForm => (INNER_FORMS as readonly string[]).includes(f);

export function defaultPack(category: string): PackSpec {
  const p = CATEGORY_PACK[isCategory(category) ? category : "other"];
  return { ...p, ...(p.inner ? { inner: { ...p.inner } } : {}) };
}

const clampDim = (v: unknown, fallback: number) => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
  if (!Number.isFinite(n)) return fallback;
  return Math.round(Math.max(DIM_RANGE.min, Math.min(DIM_RANGE.max, n)));
};

/** Accepts anything (stored JSON, request body) and returns a valid spec. */
export function normalizePack(v: unknown, fallback: PackSpec = DEFAULT_PACK): PackSpec {
  let o: Record<string, unknown> = {};
  if (typeof v === "string" && v.trim()) {
    try {
      const parsed = JSON.parse(v);
      if (parsed && typeof parsed === "object") o = parsed as Record<string, unknown>;
    } catch {
      return { ...fallback };
    }
  } else if (v && typeof v === "object") o = v as Record<string, unknown>;
  else return { ...fallback };

  const form = (FORMS as readonly string[]).includes(o.form as string) ? (o.form as Form) : fallback.form;
  // "foil" was a finish before effects existed: matte with gold foil
  const legacyFoil = o.finish === "foil";
  const finish = legacyFoil ? "matte" : (FINISHES as readonly string[]).includes(o.finish as string) ? (o.finish as Finish) : fallback.finish;
  const rawFx = Array.isArray(o.effects) ? o.effects : o.effects === undefined ? (legacyFoil ? ["goldFoil"] : (fallback.effects ?? [])) : [];
  // one foil and one pressing (a die can't raise and press in the same place): the first asked for
  const firstFoil = (rawFx as unknown[]).find((e) => FOILS.includes(e as Effect)) as Effect | undefined;
  const firstPress = (rawFx as unknown[]).find((e) => PRESSES.includes(e as Effect)) as Effect | undefined;
  const effects: Effect[] = EFFECTS.filter((e) => rawFx.includes(e) && (!FOILS.includes(e) || e === firstFoil) && (!PRESSES.includes(e) || e === firstPress));
  const w = clampDim(o.w, fallback.w);
  const h = clampDim(o.h, fallback.h);
  const d = isRound(form) ? w : clampDim(o.d, fallback.d);
  let inner: InnerSpec | null = null;
  const io = o.inner as Record<string, unknown> | null | undefined;
  if (isOuter(form) && io && typeof io === "object" && isInner(io.form as string)) {
    const f = io.form as InnerForm;
    const p = FORM_PRESET[f];
    const iw = clampDim(io.w, p.w);
    inner = { form: f, count: io.count === 2 ? 2 : 1, w: iw, h: clampDim(io.h, p.h), d: isRound(f) ? iw : clampDim(io.d, p.d) };
    if ((INSERTS as readonly string[]).includes(io.insert as string)) inner.insert = io.insert as Insert;
  }
  const base: PackSpec = { form, w, h, d, finish };
  if (effects.length && takesEffects({ form, inner })) base.effects = effects;
  if (inner) base.inner = inner;
  // material picks: well-formed part keys and material numbers only; whether a pick is a real
  // option for the part is the materials module's call (an unknown one falls back to the default)
  const mo = o.materials;
  if (mo && typeof mo === "object" && !Array.isArray(mo)) {
    const picks: Record<string, string> = {};
    for (const [k, v] of Object.entries(mo as Record<string, unknown>).slice(0, 24))
      if (/^(inner\.)?[a-z][A-Za-z]{0,15}$/.test(k) && typeof v === "string" && /^M\d{3}$/.test(v) && (inner || !k.startsWith("inner."))) picks[k] = v;
    if (Object.keys(picks).length) base.materials = picks;
  }
  return base;
}

/**
 * Combination layout: how the products sit and the outer size that fits them, as a packaging
 * engineer would size a box to its contents (with insert clearance and headroom).
 */
export function comboLayout(spec: PackSpec) {
  const inner = spec.inner;
  if (!inner) return null;
  const n = inner.count;
  const lyingOk = spec.form === "gift" || spec.form === "bookBox" || spec.form === "mailer" || spec.form === "drawer" || spec.form === "woodBox" || spec.form === "brocade";
  const lying = lyingOk && inner.h > inner.w * 1.4;
  const foot = lying ? { w: inner.h, d: inner.w, h: inner.d } : { w: inner.w, d: inner.d, h: inner.h };
  const c = (x: number) => Math.round(Math.max(DIM_RANGE.min, Math.min(DIM_RANGE.max, x)));
  let outer: { w: number; h: number; d: number };
  let gap: number;
  switch (spec.form) {
    case "carton":
      gap = 4;
      outer = { w: c(n * foot.w + (n - 1) * gap + 4), h: c(foot.h + 6), d: c(foot.d + 4) };
      break;
    case "gift":
    case "bookBox":
      gap = 22;
      outer = { w: c(n * foot.w + (n + 1) * gap), h: c(foot.h + 26), d: c(foot.d + 56) };
      break;
    case "brocade":
      // 2 mm brocade-covered walls and a hinged lid about a third of the height
      gap = 22;
      outer = { w: c(n * foot.w + (n + 1) * gap), h: c(foot.h + 34), d: c(foot.d + 56) };
      break;
    case "woodBox":
      // 10 mm pine walls each side, a 6 mm floor and a sliding lid
      gap = 22;
      outer = { w: c(n * foot.w + (n + 1) * gap + 20), h: c(foot.h + 30), d: c(foot.d + 64) };
      break;
    case "mailer":
      gap = 18;
      outer = { w: c(n * foot.w + (n + 1) * gap), h: c(foot.h + 16), d: c(foot.d + 44) };
      break;
    case "drawer":
      gap = 18;
      outer = { w: c(n * foot.w + (n + 1) * gap), h: c(foot.h + 18), d: c(foot.d + 40) };
      break;
    default:
      gap = 30;
      outer = { w: c(Math.max(n * foot.w + 70, 200)), h: c(Math.max(foot.h * 1.15 + 50, 260)), d: c(Math.max(foot.d + 30, 90)) };
  }
  return { n, lying, foot, gap, outer };
}

/** The outer pack's real size: the spec's own, or fitted to its contents. */
export function outerSize(spec: PackSpec): { w: number; h: number; d: number } {
  return comboLayout(spec)?.outer ?? { w: spec.w, h: spec.h, d: spec.d };
}

export type PxDims = { w: number; h: number; d: number };

/**
 * Converts millimetres to on-screen pixels so the package fits a stage of the given size.
 * The largest projected extent is kept near `fit` pixels whatever the real size.
 */
export function toPx(spec: PackSpec, fit: number): PxDims {
  const o = outerSize(spec);
  const d = isRound(spec.form) ? o.w : o.d;
  const extentX = Math.hypot(o.w, d) * 0.92;
  const extentY = o.h + d * 0.35;
  const s = fit / Math.max(extentX, extentY);
  return { w: Math.round(o.w * s), h: Math.round(o.h * s), d: Math.round(d * s) };
}

const sizeOf = (form: Form, w: number, h: number, d: number) => (isRound(form) ? `Ø${w} × ${h} mm` : `${w} × ${h} × ${d} mm`);

export function formatSize(spec: PackSpec): string {
  const o = outerSize(spec);
  return sizeOf(spec.form, o.w, o.h, o.d);
}

export function formatInner(spec: PackSpec): string | null {
  const i = spec.inner;
  return i ? `${i.count} × ${sizeOf(i.form, i.w, i.h, i.d)}` : null;
}
