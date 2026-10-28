/**
 * Display galleries for showing packaging: the ground it sits on in the 3D space and in the
 * listing images. Three, after the grounds of Song display:
 *   素白 paper   — an off-white sheet; suits most packaging.
 *   天青 celadon — a pale green-grey, the glaze of Ru ware; for delicate things: fragrance,
 *                  skincare, tea and tea sets.
 *   墨 ink       — a deep ink grey; for spirits, premium gift sets, black packaging and anything
 *                  meant to read at night.
 * Client-safe and pure.
 */
import type { Pair } from "./i18n";
import type { Roles } from "./artwork";
import type { Form } from "./pack";

export const GALLERIES = ["paper", "celadon", "ink"] as const;
export type Gallery = (typeof GALLERIES)[number];

export const GALLERY_LABELS: Record<Gallery, Pair> = {
  paper: { zh: "素白", en: "Off-white" },
  celadon: { zh: "天青", en: "Celadon" },
  ink: { zh: "墨色", en: "Ink" },
};
export const GALLERY_HINTS: Record<Gallery, Pair> = {
  paper: { zh: "米白底，适合大多数包装", en: "An off-white ground for most packaging" },
  celadon: { zh: "淡青灰底，适合香氛、护肤、茶与茶器等细腻的产品", en: "Pale green-grey, for delicate things: fragrance, skincare, tea and tea sets" },
  ink: { zh: "深墨灰底，适合酒、高端礼盒、黑色包装与夜色氛围", en: "Deep ink grey, for spirits, premium gift sets, black packaging and night moods" },
};

/** Each gallery's ground: the sweep colour in 3D and the gradient behind exported images. */
export const GALLERY_TONES: Record<Gallery, { sweep: string; hi: string; mid: string; lo: string; dark: boolean }> = {
  paper: { sweep: "#EAE6DC", hi: "#FBF9F4", mid: "#ECE8DF", lo: "#D6D0C2", dark: false },
  celadon: { sweep: "#C8D5CC", hi: "#E7EEE9", mid: "#CCD8D0", lo: "#A7B8AE", dark: false },
  ink: { sweep: "#2A2C2B", hi: "#3C3F3D", mid: "#242625", lo: "#121313", dark: true },
};

const lum = (hex: string) => {
  const n = hex.replace("#", "");
  const f = n.length === 3 ? n.split("").map((c) => c + c).join("") : n.padEnd(6, "0").slice(0, 6);
  const ch = (i: number) => {
    const v = (parseInt(f.slice(i, i + 2), 16) || 0) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * ch(0) + 0.7152 * ch(2) + 0.0722 * ch(4);
};

/** Gift structures a premium set comes in. */
const PREMIUM: readonly Form[] = ["gift", "bookBox", "woodBox", "drawer", "brocade"];

/**
 * The gallery a package shows best on: ink for black or very dark packaging, for spirits, and
 * for a specialty in a premium gift structure; celadon for fragrance and skincare, tea, and
 * tableware; otherwise paper.
 */
export function galleryFor(category: string, roles: Roles, form?: Form): Gallery {
  if (lum(roles.ground) < 0.12) return "ink";
  if (category === "beverage") return "ink";
  if (category === "specialty" && form && PREMIUM.includes(form)) return "ink";
  if (category === "cosmetics" || category === "personalCare" || category === "tea" || category === "homeGoods") return "celadon";
  return "paper";
}
