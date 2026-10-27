/**
 * Everyday objects at their real size, shown next to the package so its size reads at a
 * glance. Generic shapes only (no brands). Sizes in millimetres. Client-safe and pure.
 */
type Pair = { zh: string; en: string };

export const REFERENCES = ["phone", "card", "coin", "bottle", "a4"] as const;
export type Reference = (typeof REFERENCES)[number];

export const REFERENCE_INFO: Record<Reference, { label: Pair; size: Pair; w: number; h: number; d: number }> = {
  phone: { label: { zh: "手机", en: "Phone" }, size: { zh: "约 147 × 72 mm（6.1 英寸屏）", en: "About 147 × 72 mm (6.1-inch screen)" }, w: 71.5, h: 147, d: 7.8 },
  card: { label: { zh: "银行卡", en: "Bank card" }, size: { zh: "85.6 × 54 mm（国际标准）", en: "85.6 × 54 mm (ISO size)" }, w: 85.6, h: 53.98, d: 0.76 },
  coin: { label: { zh: "一元硬币", en: "1-yuan coin" }, size: { zh: "直径 25 mm", en: "25 mm across" }, w: 25, h: 25, d: 1.85 },
  bottle: { label: { zh: "500 ml 矿泉水", en: "500 ml water bottle" }, size: { zh: "约 65 × 205 mm", en: "About 65 × 205 mm" }, w: 65, h: 205, d: 65 },
  a4: { label: { zh: "A4 纸", en: "A4 sheet" }, size: { zh: "210 × 297 mm", en: "210 × 297 mm" }, w: 210, h: 0.1, d: 297 },
};

export const isReference = (v: unknown): v is Reference => typeof v === "string" && (REFERENCES as readonly string[]).includes(v);
