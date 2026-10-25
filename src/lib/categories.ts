/** Product categories. Kept free of Node imports so client components can use it. */
export const CATEGORIES = {
  tea: { zh: "茶叶", en: "Tea" },
  specialty: { zh: "地方特产", en: "Local specialty" },
  cosmetics: { zh: "化妆品", en: "Cosmetics" },
  appliance: { zh: "家用电器", en: "Home appliance" },
  other: { zh: "其他", en: "Other" },
} as const;
export type Category = keyof typeof CATEGORIES;
export const isCategory = (v: unknown): v is Category => typeof v === "string" && v in CATEGORIES;
