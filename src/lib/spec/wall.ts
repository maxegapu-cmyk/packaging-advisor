/**
 * Wall thickness of a package's board, from the stock it is ordered in, so the 3D model and the
 * dies are drawn at the thickness the factory will make: a 350 g carton about 0.45 mm, a 1200 g
 * greyboard box about 1.9 mm with its wrap, a litho-laminated B-flute mailer about 3.4 mm.
 * Parts whose stock gives no thickness keep the structure's usual one.
 * Client-safe.
 */
import type { PackSpec } from "../pack";
import { partsOf } from "../materials";
import { gsmFor, stockFor } from "./stockFor";
import { gsmOf } from "./book";

/** Thickness (mm) of the board a part is made of, or `fallback` when its stock doesn't say. */
export function wallMm(spec: PackSpec, key: string, fallback: number): number {
  try {
    const part = partsOf(spec).find((p) => p.key === key);
    if (!part) return fallback;
    const s = stockFor(spec, key, part.slot, "other");
    const c = spec.materials?.[key] ?? {};
    const gsm = gsmFor(s, c, part.slot) ?? gsmOf(s);
    let t: number | null = null;
    switch (s.kind) {
      case "flute": {
        // a printed facing mounted on the flute adds its own board
        const facing = c.route !== "direct" && (spec.form === "mailer" || spec.form === "carton") ? (spec.materials?.facing?.gsm ?? 250) * 0.00125 : 0;
        t = (s.caliper ?? 3) + facing;
        break;
      }
      case "greyboard":
        // greyboard runs about 0.65 g/cm³; the wrap paper adds about 0.15 mm
        t = gsm / 650 + (key === "core" ? 0.15 : 0);
        break;
      case "tube":
        // a wound tube is about four plies of its board
        t = gsm * 0.00125 * 4;
        break;
      case "board":
      case "paper":
      case "special":
        t = gsm * 0.00125;
        break;
    }
    return t && Number.isFinite(t) ? Math.round(t * 100) / 100 : fallback;
  } catch {
    return fallback;
  }
}
