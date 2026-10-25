/**
 * Single-dimension revision. The skill's rule is "only change the dimension the seller
 * objects to and keep every decision that already passed". We enforce it in code: the model
 * returns a whole direction, but only the fields owned by the chosen dimension are merged back.
 */
import { Collector, validateDirection, type Direction } from "./schema";

export const DIMENSIONS = ["color", "layout", "typography", "imagery", "anchor"] as const;
export type Dimension = (typeof DIMENSIONS)[number];

export const DIMENSION_LABELS: Record<Dimension, { zh: string; en: string }> = {
  color: { zh: "配色", en: "Color" },
  layout: { zh: "版式", en: "Layout" },
  typography: { zh: "字体气质", en: "Typography" },
  imagery: { zh: "图像与质感", en: "Imagery and finish" },
  anchor: { zh: "视觉锚点", en: "Visual anchor" },
};

export function isDimension(v: unknown): v is Dimension {
  return typeof v === "string" && (DIMENSIONS as readonly string[]).includes(v);
}

export function mergeDimension(current: Direction, proposed: Direction, dim: Dimension): Direction {
  const next: Direction = structuredClone(current);
  switch (dim) {
    case "color":
      next.palette = proposed.palette;
      break;
    case "layout":
      next.layout = proposed.layout;
      next.carriers = proposed.carriers;
      next.sketch = proposed.sketch;
      break;
    case "typography":
      next.styleDna = { ...next.styleDna, typography: proposed.styleDna.typography };
      break;
    case "imagery":
      next.styleDna = { ...next.styleDna, imagery: proposed.styleDna.imagery, graphics: proposed.styleDna.graphics, finish: proposed.styleDna.finish };
      break;
    case "anchor":
      next.anchor = proposed.anchor;
      break;
  }
  return next;
}

/** Validate a model-proposed direction, then merge only the chosen dimension. */
export function applyRevision(current: Direction, raw: unknown, dim: Dimension): { ok: true; value: Direction } | { ok: false; errors: string[] } {
  const c = new Collector();
  const proposed = validateDirection(raw, "direction", c);
  if (c.errors.length) return { ok: false, errors: c.errors };
  return { ok: true, value: mergeDimension(current, proposed, dim) };
}
