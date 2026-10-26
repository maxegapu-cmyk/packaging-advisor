/**
 * Package structure: the physical form the directions are shown on, its outside size in
 * millimetres, the surface finish, and optionally products packed inside it (a combination
 * such as a bottle in a carton or two tins in a gift box).
 * Client-safe: no server imports.
 */
import type { Pair } from "./i18n";

export const FORMS = ["carton", "gift", "bookBox", "mailer", "drawer", "paperTube", "bag", "pouch", "bottle", "tube", "jar", "glassBottle", "tin", "ceramic"] as const;
export type Form = (typeof FORMS)[number];

export const FINISHES = ["matte", "gloss", "paper", "foil"] as const;
export type Finish = (typeof FINISHES)[number];

/** Forms that can hold products (combinations). */
export const OUTER_FORMS = ["carton", "gift", "bookBox", "mailer", "drawer", "bag"] as const;
export type OuterForm = (typeof OUTER_FORMS)[number];
/** Forms that go inside another (the product's own container). */
export const INNER_FORMS = ["bottle", "tube", "jar", "glassBottle", "tin", "ceramic", "paperTube", "pouch"] as const;
export type InnerForm = (typeof INNER_FORMS)[number];

/** Round forms: `w` is the diameter and `d` equals it. */
export const ROUND_FORMS: readonly Form[] = ["tin", "paperTube", "bottle", "tube", "jar", "glassBottle", "ceramic"];
/** Forms with an open motion (unfold, lid off, tray out, stopper out). */
export const CAN_OPEN: readonly Form[] = ["carton", "gift", "bookBox", "mailer", "drawer", "paperTube", "tin", "jar", "glassBottle", "ceramic"];

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
export type PackSpec = { form: Form; w: number; h: number; d: number; finish: Finish; inner?: InnerSpec | null };

export const MATERIAL_GROUPS: { id: string; label: Pair; forms: readonly Form[] }[] = [
  { id: "paper", label: { zh: "纸与卡纸", en: "Paper and board" }, forms: ["carton", "gift", "bookBox", "mailer", "drawer", "paperTube", "bag"] },
  { id: "plastic", label: { zh: "塑料", en: "Plastic" }, forms: ["pouch", "bottle", "tube"] },
  { id: "glass", label: { zh: "玻璃", en: "Glass" }, forms: ["jar", "glassBottle"] },
  { id: "metal", label: { zh: "金属", en: "Metal" }, forms: ["tin"] },
  { id: "ceramic", label: { zh: "陶瓷", en: "Ceramic" }, forms: ["ceramic"] },
];

export const FORM_LABELS: Record<Form, Pair> = {
  carton: { zh: "直立盒", en: "Tuck carton" },
  gift: { zh: "天地盖礼盒", en: "Lid-and-base gift box" },
  bookBox: { zh: "书型磁吸礼盒", en: "Book-style magnetic box" },
  mailer: { zh: "飞机盒", en: "Corrugated mailer" },
  drawer: { zh: "抽屉盒", en: "Drawer box" },
  paperTube: { zh: "纸罐", en: "Paper tube" },
  bag: { zh: "手提纸袋", en: "Paper bag" },
  pouch: { zh: "自立拉链袋", en: "Stand-up pouch" },
  bottle: { zh: "按压瓶", en: "Pump bottle" },
  tube: { zh: "软管", en: "Squeeze tube" },
  jar: { zh: "玻璃罐", en: "Glass jar" },
  glassBottle: { zh: "玻璃瓶", en: "Glass bottle" },
  tin: { zh: "马口铁罐", en: "Round tin" },
  ceramic: { zh: "瓷茶叶罐", en: "Porcelain caddy" },
};

export const FORM_NOTES: Record<Form, Pair> = {
  carton: { zh: "最常见的折叠纸盒，可展开看刀模结构。", en: "The everyday folding carton; unfold it to see the net." },
  gift: { zh: "上盖下底的硬纸板礼盒，适合礼品和特产，可打开看内部。", en: "Rigid lid-and-base box for gifts and specialties; open it to see inside." },
  bookBox: { zh: "像精装书一样翻开的硬礼盒，磁吸扣合，茶叶和化妆品套装常用。", en: "A rigid box that opens like a hardback book and closes on magnets; common for tea and cosmetic sets." },
  mailer: { zh: "电商发货最常用的瓦楞纸盒，翻盖带插舌，开箱即展示。", en: "The e-commerce shipping box in corrugated board, with a tuck-in lid; the unboxing is the display." },
  drawer: { zh: "外套加抽屉，拉出即见内容物，化妆品和礼品常用。", en: "A sleeve and a sliding tray; pull it out to reveal the contents. Common for cosmetics and gifts." },
  paperTube: { zh: "纸质圆筒，盖子套在内颈上，茶叶和化妆品常用，环保。", en: "A paperboard cylinder with a lid over an inner neck; used for tea and cosmetics, and recyclable." },
  bag: { zh: "门店和礼品用的手提纸袋，带绳提手和侧面风琴折。", en: "A retail and gift bag with rope handles and gusseted sides." },
  pouch: { zh: "复合膜自立袋，带自封拉链，零食、茶叶、特产最常用。", en: "A laminated stand-up pouch with a zip, the most common pack for snacks, tea and specialties." },
  bottle: { zh: "塑料按压泵瓶，洗护和护肤品常用。", en: "A plastic pump bottle for body care and skincare." },
  tube: { zh: "可挤压软管，倒立放置，洁面和护手霜常用。", en: "A squeeze tube that stands on its cap, for cleansers and hand creams." },
  jar: { zh: "玻璃罐配旋盖，蜂蜜、酱料、茶叶常用，内容物看得见。", en: "A glass jar with a screw cap for honey, sauces or tea; the contents show through." },
  glassBottle: { zh: "玻璃瓶配瓶塞，酒、油、饮品常用。", en: "A glass bottle with a stopper, for spirits, oils and drinks." },
  tin: { zh: "茶叶、糖果常用的金属圆罐，标签环绕一周。", en: "Metal tin for tea and sweets, with a wrap-around print." },
  ceramic: { zh: "上釉的瓷罐配瓷盖，茶叶和土特产常用，可重复使用。", en: "A glazed porcelain jar with a porcelain lid, for tea and specialties; reusable." },
};

export const FINISH_LABELS: Record<Finish, Pair> = {
  matte: { zh: "哑光", en: "Matte" },
  gloss: { zh: "亮面", en: "Gloss" },
  paper: { zh: "纸感", en: "Textured paper" },
  foil: { zh: "烫金点缀", en: "Foil accent" },
};

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
 * box, a specialty in a glass jar in a gift box, a pump bottle in its carton, an appliance in a
 * corrugated case.
 */
export const CATEGORY_PACK: Record<string, PackSpec> = {
  tea: { form: "gift", w: 236, h: 146, d: 142, finish: "matte", inner: { form: "tin", count: 2, w: 86, h: 120, d: 86, insert: "velvet" } },
  specialty: { form: "gift", w: 124, h: 121, d: 136, finish: "paper", inner: { form: "jar", count: 1, w: 80, h: 95, d: 80, insert: "pulp" } },
  cosmetics: { form: "carton", w: 56, h: 176, d: 56, finish: "gloss", inner: { form: "bottle", count: 1, w: 52, h: 170, d: 52 } },
  appliance: { form: "carton", w: 340, h: 260, d: 220, finish: "matte" },
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
  pouch: { form: "pouch", w: 140, h: 210, d: 70 },
  bottle: { form: "bottle", w: 52, h: 170, d: 52 },
  tube: { form: "tube", w: 38, h: 160, d: 38 },
  jar: { form: "jar", w: 80, h: 95, d: 80 },
  glassBottle: { form: "glassBottle", w: 72, h: 230, d: 72 },
  tin: { form: "tin", w: 86, h: 120, d: 86 },
  ceramic: { form: "ceramic", w: 90, h: 120, d: 90 },
};

export const isRound = (f: Form) => ROUND_FORMS.includes(f);
export const isOuter = (f: Form): f is OuterForm => (OUTER_FORMS as readonly string[]).includes(f);
export const isInner = (f: string): f is InnerForm => (INNER_FORMS as readonly string[]).includes(f);

export function defaultPack(category: string): PackSpec {
  return { ...(CATEGORY_PACK[category] ?? CATEGORY_PACK.other) };
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
  const finish = (FINISHES as readonly string[]).includes(o.finish as string) ? (o.finish as Finish) : fallback.finish;
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
  return inner ? { form, w, h, d, finish, inner } : { form, w, h, d, finish };
}

/**
 * Combination layout: how the products sit and the outer size that fits them, as a packaging
 * engineer would size a box to its contents (with insert clearance and headroom).
 */
export function comboLayout(spec: PackSpec) {
  const inner = spec.inner;
  if (!inner) return null;
  const n = inner.count;
  const lyingOk = spec.form === "gift" || spec.form === "bookBox" || spec.form === "mailer" || spec.form === "drawer";
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
