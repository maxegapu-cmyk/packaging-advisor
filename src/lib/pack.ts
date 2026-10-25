/**
 * Package structure: the physical form the directions are shown on (tuck carton, lid-and-base
 * gift box or round tin), its outside size in millimetres and the surface finish.
 * Client-safe: no server imports.
 */
import type { Pair } from "./i18n";

export const FORMS = ["carton", "gift", "tin"] as const;
export type Form = (typeof FORMS)[number];

export const FINISHES = ["matte", "gloss", "paper", "foil"] as const;
export type Finish = (typeof FINISHES)[number];

export type PackSpec = { form: Form; w: number; h: number; d: number; finish: Finish };

export const FORM_LABELS: Record<Form, Pair> = {
  carton: { zh: "直立盒", en: "Tuck carton" },
  gift: { zh: "天地盖礼盒", en: "Lid-and-base gift box" },
  tin: { zh: "圆罐", en: "Round tin" },
};

export const FORM_NOTES: Record<Form, Pair> = {
  carton: { zh: "最常见的折叠纸盒，可展开看刀模结构。", en: "The everyday folding carton; unfold it to see the net." },
  gift: { zh: "上盖下底，适合礼品和特产，可打开看内部。", en: "Separate lid and base, for gifts and specialties; open it to see inside." },
  tin: { zh: "茶叶、糖果常用的金属圆罐，标签环绕一周。", en: "Metal tin for tea and sweets, with a wrap-around label." },
};

export const FINISH_LABELS: Record<Finish, Pair> = {
  matte: { zh: "哑光", en: "Matte" },
  gloss: { zh: "亮面", en: "Gloss" },
  paper: { zh: "纸感", en: "Textured paper" },
  foil: { zh: "烫金点缀", en: "Foil accent" },
};

/** Size labels. For a tin, "w" is the diameter and "d" is not used. */
export const DIM_LABELS: Record<"w" | "h" | "d", Pair> = {
  w: { zh: "宽", en: "Width" },
  h: { zh: "高", en: "Height" },
  d: { zh: "深", en: "Depth" },
};
export const DIAMETER_LABEL: Pair = { zh: "直径", en: "Diameter" };

export const DIM_RANGE = { min: 30, max: 500 } as const;

export const CATEGORY_PACK: Record<string, PackSpec> = {
  tea: { form: "tin", w: 86, h: 120, d: 86, finish: "matte" },
  specialty: { form: "gift", w: 300, h: 96, d: 220, finish: "paper" },
  cosmetics: { form: "carton", w: 52, h: 140, d: 52, finish: "gloss" },
  appliance: { form: "carton", w: 340, h: 260, d: 220, finish: "matte" },
  other: { form: "carton", w: 120, h: 170, d: 60, finish: "matte" },
};

/** The shape the landing page and demo start from. */
export const DEFAULT_PACK: PackSpec = { form: "carton", w: 110, h: 150, d: 46, finish: "matte" };

/** Typical sizes when a seller switches form, so a tin doesn't inherit an appliance box's size. */
export const FORM_PRESET: Record<Form, Omit<PackSpec, "finish">> = {
  carton: { form: "carton", w: 110, h: 150, d: 46 },
  gift: { form: "gift", w: 300, h: 96, d: 220 },
  tin: { form: "tin", w: 86, h: 120, d: 86 },
};

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
  const d = form === "tin" ? w : clampDim(o.d, fallback.d);
  return { form, w, h, d, finish };
}

export type PxDims = { w: number; h: number; d: number };

/**
 * Converts millimetres to on-screen pixels so the package fits a stage of the given size.
 * The largest projected extent is kept near `fit` pixels whatever the real size.
 */
export function toPx(spec: PackSpec, fit: number): PxDims {
  const d = spec.form === "tin" ? spec.w : spec.d;
  const extentX = Math.hypot(spec.w, d) * 0.92;
  const extentY = spec.h + d * 0.35;
  const s = fit / Math.max(extentX, extentY);
  return { w: Math.round(spec.w * s), h: Math.round(spec.h * s), d: Math.round(d * s) };
}

export function formatSize(spec: PackSpec): string {
  return spec.form === "tin" ? `Ø${spec.w} × ${spec.h} mm` : `${spec.w} × ${spec.h} × ${spec.d} mm`;
}
