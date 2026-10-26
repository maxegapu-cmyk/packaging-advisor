/**
 * The finished artwork: what is actually printed. It starts from the chosen direction on a
 * board (palette, layout, the short mockup strings) and adds what a print file needs and a
 * board doesn't have: the seller's final wording, the label information the law asks for,
 * the barcode and the logo. Edited by the seller, stored per product.
 * Client-safe and pure.
 */
import type { Board, Direction } from "./board/schema";
import { familyOf, isCategory, type Category } from "./categories";
import { cleanDigits } from "./print/ean13";

type Pair = { zh: string; en: string };

export type Roles = { ground: string; ink: string; key: string; accent: string };
export type InfoRow = { key: string; label: string; value: string };

export type Artwork = {
  v: 1;
  /** Direction id on the board this artwork was made from. */
  dir: string;
  brand: string;
  /** The name line on the front. */
  headline: string;
  /** Second line on the front (variety, spec). */
  detail: string;
  /** Net content, printed on the front as the rules ask. */
  net: string;
  palette: Roles;
  /** The paragraph on the back. */
  intro: string;
  /** Label information, printed as a table on the back. */
  rows: InfoRow[];
  /** EAN-13 digits, or empty. */
  barcode: string;
  /** Upload id of the logo (PNG with transparency), or null for a type-only mark. */
  logoId: string | null;
  /** The check against a real printed sample (打样). */
  proof: Proof;
};

/**
 * What the seller measured and saw on the printed sample. The render is only trusted as a
 * true picture of the product once a real sample has been compared with it.
 */
export type Proof = {
  /** Measured outside size in mm (null = not measured yet). */
  w: number | null;
  h: number | null;
  d: number | null;
  /** Photo of the sample (upload id), front on. */
  photoId: string | null;
  /** Colors picked from the photo, per palette role. */
  colors: Partial<Record<keyof Roles, string>>;
  /** Render the 3D and listing images in the colors measured on the sample (the print file keeps the design colors). */
  useSample: boolean;
  /** The seller confirmed the sample matches the render. */
  confirmed: boolean;
  /** When it was confirmed (ISO date). */
  at: string | null;
};

export const EMPTY_PROOF: Proof = { w: null, h: null, d: null, photoId: null, colors: {}, useSample: false, confirmed: false, at: null };

/** Palette roles of a direction (background, text, brand, accent), with index fallbacks. */
export function rolesOf(d: Direction): Roles {
  const p = d.palette;
  const by = (r: string) => p.find((s) => s.role === r)?.hex;
  const ground = by("background") ?? p[0]?.hex ?? "#EEEEEA";
  const ink = by("text") ?? p[1]?.hex ?? "#1A1A1A";
  const key = by("brand") ?? p[2]?.hex ?? ink;
  const accent = by("accent") ?? p[3]?.hex ?? key;
  return { ground, ink, key, accent };
}

/** The direction as the seller finalised it: their palette and front wording. */
export function applyArtwork(d: Direction, a: Artwork): Direction {
  const base = rolesOf(d);
  const swap = (hex: string) => {
    if (hex === base.ground) return a.palette.ground;
    if (hex === base.ink) return a.palette.ink;
    if (hex === base.key) return a.palette.key;
    if (hex === base.accent) return a.palette.accent;
    return hex;
  };
  const palette = d.palette.map((s) => ({ ...s, hex: swap(s.hex) }));
  // make sure every role exists even when the board's palette was short of one
  const has = (r: string) => palette.some((s) => s.role === r);
  const add = (role: "background" | "text" | "brand" | "accent", hex: string) => {
    if (!has(role)) palette.push({ name: { zh: role, en: role }, role, hex, share: 0 });
  };
  add("background", a.palette.ground);
  add("text", a.palette.ink);
  add("brand", a.palette.key);
  add("accent", a.palette.accent);
  return { ...d, palette, mockup: { ...d.mockup, headline: a.headline || d.mockup.headline, detail: a.detail } };
}

/** The palette to show the product in: the sample's measured colors when the seller chose them. */
export function renderPalette(a: Artwork): Roles {
  return a.proof.useSample ? { ...a.palette, ...a.proof.colors } : a.palette;
}

/* ---------------------------------------------------------------- label fields */

export type LabelField = { key: string; label: Pair; required: boolean; hint: Pair; long?: boolean };

const f = (key: string, zh: string, en: string, required: boolean, hzh: string, hen: string, long = false): LabelField => ({ key, label: { zh, en }, required, hint: { zh: hzh, en: hen }, long });

const FOOD: LabelField[] = [
  f("name", "产品名称", "Product name", true, "反映食品真实属性的名称", "A name that states what the food really is"),
  f("ingredients", "配料", "Ingredients", true, "按加入量从多到少排列；过敏原可加粗", "In descending order of weight; allergens may be in bold", true),
  f("date", "生产日期", "Production date", true, "可写「见包装底部」，按年、月、日顺序打印", "May read “see bottom”; printed year, month, day"),
  f("shelf", "保质期", "Shelf life", true, "例如：18个月", "e.g. 18 months"),
  f("storage", "贮存条件", "Storage", true, "例如：阴凉干燥处，避免阳光直射", "e.g. Cool, dry place away from sunlight"),
  f("maker", "生产者", "Producer", true, "名称、地址、联系方式", "Name, address, contact", true),
  f("license", "食品生产许可证编号", "Food production licence", true, "SC 开头的 14 位编号", "14 digits starting with SC"),
  f("standard", "产品标准代号", "Product standard", true, "例如：GB/T 18650", "e.g. GB/T 18650"),
  f("origin", "产地", "Place of origin", false, "例如：浙江杭州", "e.g. Hangzhou, Zhejiang"),
  f("allergen", "致敏物质提示", "Allergen notice", false, "例如：本产品含有坚果", "e.g. Contains tree nuts"),
];

const COSMETIC: LabelField[] = [
  f("name", "产品中文名称", "Chinese product name", true, "商标名 + 通用名 + 属性名", "Brand + generic name + attribute"),
  f("ingredients", "全成分", "Full ingredients", true, "按加入量降序，0.1% 以下以「其他微量成分」引导", "Descending; under 0.1% after “other trace ingredients”", true),
  f("expiry", "使用期限", "Use-by period", true, "生产日期和保质期，或生产批号和限期使用日期", "Production date and shelf life, or batch and use-by date"),
  f("usage", "使用方法", "How to use", true, "", "", true),
  f("warning", "安全警示用语", "Safety warning", true, "例如：如有不适请停止使用", "e.g. Stop using if irritation occurs", true),
  f("filer", "注册人 / 备案人", "Registrant / filer", true, "名称、地址", "Name and address", true),
  f("maker", "生产企业", "Manufacturer", true, "名称、地址（委托生产时写受托企业）", "Name and address (the contract maker, if any)", true),
  f("license", "生产许可证编号", "Production licence", true, "例如：粤妆 20160001", "e.g. 粤妆 20160001"),
  f("standard", "执行标准", "Product standard", true, "", ""),
  f("filing", "备案 / 注册证编号", "Filing or registration no.", false, "特殊化妆品必须标注注册证编号", "Special-use cosmetics must show the registration number"),
];

const GOODS: LabelField[] = [
  f("name", "产品名称", "Product name", true, "", ""),
  f("model", "规格型号", "Model / size", true, "", ""),
  f("material", "材质 / 成分", "Material", false, "", ""),
  f("maker", "生产者", "Producer", true, "名称、地址", "Name and address", true),
  f("standard", "执行标准", "Product standard", true, "", ""),
  f("origin", "产地", "Place of origin", false, "", ""),
  f("date", "生产日期 / 批号", "Date / batch", false, "", ""),
];

const EXTRA: Partial<Record<Category, LabelField[]>> = {
  health: [f("approval", "保健食品注册 / 备案号", "Health food approval no.", true, "国食健注 G… 或食健备 G…，并印「蓝帽」标志", "国食健注 G… or 食健备 G…, with the blue-hat mark"), f("function", "保健功能", "Function claim", true, "只写批准的功能", "Only the approved function"), f("unsuitable", "不适宜人群", "Not suitable for", true, "", "")],
  beverage: [f("abv", "酒精度", "Alcohol by volume", false, "含酒精饮品必须标注，例如：12%vol", "Required for alcoholic drinks, e.g. 12%vol")],
  appliance: [f("rating", "额定电压 / 功率", "Rated voltage / power", true, "例如：220V~ 50Hz 1800W", "e.g. 220V~ 50Hz 1800W"), f("ccc", "3C 认证", "CCC certification", false, "属于强制认证目录时必须印 CCC 标志", "Required if the product is on the CCC list")],
  electronics: [f("rating", "额定输入", "Rated input", false, "例如：5V⎓1A", "e.g. 5V⎓1A"), f("ccc", "3C 认证", "CCC certification", false, "属于强制认证目录时必须印 CCC 标志", "Required if the product is on the CCC list")],
  toys: [f("age", "适用年龄", "Age range", true, "例如：3岁以上", "e.g. 3 years and up"), f("warning", "警示语", "Warning", true, "例如：含小零件，不适合3岁以下儿童", "e.g. Small parts, not for children under 3", true)],
  apparel: [f("size", "号型", "Size", true, "", ""), f("fibre", "纤维成分", "Fibre content", true, "例如：100%桑蚕丝", "e.g. 100% mulberry silk"), f("care", "洗涤说明", "Care", true, "", ""), f("safety", "安全技术类别", "Safety category", true, "A 类 / B 类 / C 类", "Class A, B or C")],
  baby: [f("age", "适用年龄", "Age range", true, "", ""), f("warning", "警示语", "Warning", false, "", "", true)],
  pet: [f("analysis", "产品成分分析保证值", "Guaranteed analysis", true, "粗蛋白质、粗脂肪等", "Crude protein, crude fat, etc.", true), f("usage", "使用说明", "Feeding guide", true, "", "", true)],
};

/** The label information a category normally needs. Rules change: these are a checklist, not a review. */
export function labelFields(category: string): LabelField[] {
  const c: Category = isCategory(category) ? category : "other";
  const fam = familyOf(c);
  const base =
    fam === "food"
      ? FOOD
      : c === "cosmetics" || c === "personalCare"
        ? COSMETIC
        : c === "pet"
          ? FOOD.filter((x) => x.key !== "allergen").map((x) => (x.key === "license" ? f("license", "饲料生产许可证编号", "Feed production licence", true, "", "") : x))
          : GOODS;
  const extra = EXTRA[c] ?? [];
  const keys = new Set(base.map((x) => x.key));
  return [...base, ...extra.filter((x) => !keys.has(x.key))];
}

/* ---------------------------------------------------------------- defaults and validation */

const NET = /(\d+(?:\.\d+)?\s*(?:g|克|kg|千克|公斤|ml|mL|毫升|l|L|升|粒|片|袋|支|颗|盒))/;

/** A first artwork from the board: the recommended (or picked) direction, the board's words. */
export function defaultArtwork(board: Board, dirId?: string | null): Artwork {
  const d = board.directions.find((x) => x.id === dirId) ?? board.directions.find((x) => x.id === board.recommendation.pick) ?? board.directions[0];
  const fields = labelFields(board.meta.category);
  const net = (d.mockup.detail.match(NET) ?? board.meta.product.zh.match(NET))?.[1] ?? "";
  const rows: InfoRow[] = fields.map((x) => ({ key: x.key, label: x.label.zh, value: x.key === "name" ? board.meta.product.zh : "" }));
  return {
    v: 1,
    dir: d.id,
    brand: board.meta.brand,
    headline: d.mockup.headline,
    detail: d.mockup.detail,
    net: net ? `净含量 ${net.replace(/\s+/g, "")}` : "",
    palette: rolesOf(d),
    intro: board.copy.frontPromise.zh,
    rows,
    barcode: "",
    logoId: null,
    proof: { ...EMPTY_PROOF, colors: {} },
  };
}

const HEX = /^#[0-9A-F]{6}$/;
const clip = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/[\u0000-\u0008\u000B-\u001F]/g, "").trim().slice(0, max) : "");
const hex = (v: unknown, fb: string) => {
  const s = typeof v === "string" ? v.trim().toUpperCase() : "";
  const full = /^#?[0-9A-F]{3}$/.test(s) ? `#${s.replace("#", "").split("").map((c) => c + c).join("")}` : s.startsWith("#") ? s : `#${s}`;
  return HEX.test(full) ? full : fb;
};

/** Cleans an artwork sent by the browser, falling back to `base` for anything missing or wrong. */
export function normalizeArtwork(raw: unknown, base: Artwork): Artwork {
  const o = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  const p = (typeof o.palette === "object" && o.palette !== null ? o.palette : {}) as Record<string, unknown>;
  const rowsIn = Array.isArray(o.rows) ? o.rows.slice(0, 24) : base.rows;
  const rows = rowsIn
    .map((r) => {
      const x = (typeof r === "object" && r !== null ? r : {}) as Record<string, unknown>;
      return { key: clip(x.key, 24) || "custom", label: clip(x.label, 24), value: clip(x.value, 400) };
    })
    .filter((r) => r.label);
  const logo = typeof o.logoId === "string" && /^[A-Za-z0-9_-]{6,40}$/.test(o.logoId) ? o.logoId : null;
  const pr = (typeof o.proof === "object" && o.proof !== null ? o.proof : base.proof) as Record<string, unknown>;
  const mm = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v > 0 && v < 3000 ? Math.round(v * 10) / 10 : null);
  const pc = (typeof pr.colors === "object" && pr.colors !== null ? pr.colors : {}) as Record<string, unknown>;
  const colors: Proof["colors"] = {};
  for (const k of ["ground", "ink", "key", "accent"] as const) {
    const h = hex(pc[k], "");
    if (h) colors[k] = h;
  }
  const confirmed = pr.confirmed === true;
  return {
    v: 1,
    dir: clip(o.dir, 4) || base.dir,
    brand: typeof o.brand === "string" ? clip(o.brand, 30) : base.brand,
    headline: clip(o.headline, 30) || base.headline,
    detail: typeof o.detail === "string" ? clip(o.detail, 40) : base.detail,
    net: typeof o.net === "string" ? clip(o.net, 30) : base.net,
    palette: { ground: hex(p.ground, base.palette.ground), ink: hex(p.ink, base.palette.ink), key: hex(p.key, base.palette.key), accent: hex(p.accent, base.palette.accent) },
    intro: typeof o.intro === "string" ? clip(o.intro, 300) : base.intro,
    rows,
    barcode: cleanDigits(clip(o.barcode, 20)).replace(/\D/g, "").slice(0, 13),
    logoId: logo,
    proof: {
      w: mm(pr.w),
      h: mm(pr.h),
      d: mm(pr.d),
      photoId: typeof pr.photoId === "string" && /^[A-Za-z0-9_-]{6,40}$/.test(pr.photoId) ? pr.photoId : null,
      colors,
      useSample: pr.useSample === true,
      confirmed,
      at: confirmed && typeof pr.at === "string" && /^\d{4}-\d{2}-\d{2}/.test(pr.at) ? pr.at.slice(0, 10) : null,
    },
  };
}
