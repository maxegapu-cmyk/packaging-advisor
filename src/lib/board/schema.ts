/**
 * Board data model. The structure follows the `packaging-visual-direction` skill's output
 * contract (three directions, color card, four carriers, anchor, style DNA, sketch, fit/risk,
 * designer instruction), extended with bilingual text and the copy / claim-check outputs.
 *
 * Every human-readable field is bilingual: { zh, en }, Chinese first.
 * The validator is tolerant of small model slips (a plain string where a bilingual pair is
 * expected, "65%" instead of 65) but rejects anything structurally wrong.
 */

export type Bi = { zh: string; en: string };

export const LAYOUTS = ["offset", "stripe", "split"] as const;
export type Layout = (typeof LAYOUTS)[number];

export const ROLES = ["background", "text", "brand", "accent", "support"] as const;
export type Role = (typeof ROLES)[number];

export const ROUTES = ["safe", "distinctive", "bold"] as const;
export type Route = (typeof ROUTES)[number];

export type Swatch = { name: Bi; role: Role; hex: string; share: number };

export type Direction = {
  id: string; // "A" | "B" | "C"
  route: Route;
  name: Bi;
  tagline: Bi;
  layout: Layout;
  palette: Swatch[];
  /** Short strings drawn on the mini mockups. Keep them as the seller would print them. */
  mockup: { headline: string; detail: string; innerLabel: string; manualTitle: string; manualStep: string };
  carriers: { outerFront: Bi; outerBack: Bi; inner: Bi; manual: Bi };
  anchor: Bi;
  styleDna: { typography: Bi; imagery: Bi; graphics: Bi; finish: Bi };
  sketch: string;
  suitable: Bi;
  risk: Bi;
};

export type ClaimFinding = { text: string; level: "high" | "medium" | "low"; issue: Bi; safer: Bi };

export type Board = {
  meta: { product: Bi; brand: string; category: string };
  reading: { product: Bi; references: { label: string; borrow: Bi; avoid: Bi }[]; assumptions: Bi[] };
  directions: Direction[];
  recommendation: { pick: string; reason: Bi; designerInstruction: Bi };
  copy: { nameLine: Bi; frontPromise: Bi; manualSteps: Bi[]; placeholders: string[] };
  claimCheck: ClaimFinding[];
  complianceNotes: Bi[];
};

export type ValidationResult = { ok: true; value: Board } | { ok: false; errors: string[] };

const HEX = /^#?([0-9a-f]{6}|[0-9a-f]{3})$/i;
const MAX_TEXT = 600;

class Collector {
  errors: string[] = [];
  add(path: string, msg: string) {
    if (this.errors.length < 40) this.errors.push(`${path}: ${msg}`);
  }
}

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function str(v: unknown, path: string, c: Collector, opts: { optional?: boolean; max?: number } = {}): string {
  if (typeof v === "number") v = String(v);
  if (typeof v !== "string" || !v.trim()) {
    if (!opts.optional) c.add(path, "需要非空文本 required non-empty text");
    return "";
  }
  const max = opts.max ?? MAX_TEXT;
  const t = v.trim();
  return t.length > max ? t.slice(0, max) : t;
}

export function bi(v: unknown, path: string, c: Collector, optional = false): Bi {
  if (typeof v === "string") {
    const s = str(v, path, c, { optional });
    return { zh: s, en: s };
  }
  if (!isObj(v)) {
    if (!optional) c.add(path, "需要 {zh, en} expected {zh, en}");
    return { zh: "", en: "" };
  }
  const zh = str(v.zh, `${path}.zh`, c, { optional });
  const en = str(v.en, `${path}.en`, c, { optional: true }) || zh;
  return { zh, en };
}

function arr(v: unknown, path: string, c: Collector, min: number, max: number): unknown[] {
  if (!Array.isArray(v)) {
    if (min > 0) c.add(path, "需要数组 expected an array");
    return [];
  }
  if (v.length < min) c.add(path, `至少 ${min} 项 needs at least ${min}`);
  return v.slice(0, max);
}

export function normalizeHex(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const m = v.trim().match(HEX);
  if (!m) return null;
  let h = m[1].toUpperCase();
  if (h.length === 3) h = h.split("").map((ch) => ch + ch).join("");
  return `#${h}`;
}

function share(v: unknown): number {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? "").replace("%", ""));
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function pick<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  return typeof v === "string" && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
}

export function validateDirection(raw: unknown, path: string, c: Collector, index = 0): Direction {
  const d = isObj(raw) ? raw : {};
  if (!isObj(raw)) c.add(path, "需要对象 expected an object");
  const palette = arr(d.palette, `${path}.palette`, c, 3, 5).map((s, j) => {
    const sp = `${path}.palette[${j}]`;
    const o = isObj(s) ? s : {};
    const hex = normalizeHex(o.hex);
    if (!hex) c.add(`${sp}.hex`, "需要六位 HEX expected a 6-digit HEX");
    const defaultRole = ROLES[Math.min(j, 3)];
    return { name: bi(o.name, `${sp}.name`, c), role: pick(o.role, ROLES, defaultRole), hex: hex ?? "#888888", share: share(o.share) };
  });
  const m = isObj(d.mockup) ? d.mockup : {};
  const car = isObj(d.carriers) ? d.carriers : {};
  const dna = isObj(d.styleDna) ? d.styleDna : {};
  return {
    id: str(d.id, `${path}.id`, c, { optional: true, max: 4 }) || "ABC"[index] || String(index + 1),
    route: pick(d.route, ROUTES, ROUTES[Math.min(index, 2)]),
    name: bi(d.name, `${path}.name`, c),
    tagline: bi(d.tagline, `${path}.tagline`, c),
    layout: pick(d.layout, LAYOUTS, "offset"),
    palette,
    mockup: {
      headline: str(m.headline, `${path}.mockup.headline`, c, { max: 40 }),
      detail: str(m.detail, `${path}.mockup.detail`, c, { max: 40 }),
      innerLabel: str(m.innerLabel, `${path}.mockup.innerLabel`, c, { max: 40 }),
      manualTitle: str(m.manualTitle, `${path}.mockup.manualTitle`, c, { max: 40 }),
      manualStep: str(m.manualStep, `${path}.mockup.manualStep`, c, { max: 40 }),
    },
    carriers: {
      outerFront: bi(car.outerFront, `${path}.carriers.outerFront`, c),
      outerBack: bi(car.outerBack, `${path}.carriers.outerBack`, c),
      inner: bi(car.inner, `${path}.carriers.inner`, c),
      manual: bi(car.manual, `${path}.carriers.manual`, c),
    },
    anchor: bi(d.anchor, `${path}.anchor`, c),
    styleDna: {
      typography: bi(dna.typography, `${path}.styleDna.typography`, c),
      imagery: bi(dna.imagery, `${path}.styleDna.imagery`, c),
      graphics: bi(dna.graphics, `${path}.styleDna.graphics`, c),
      finish: bi(dna.finish, `${path}.styleDna.finish`, c),
    },
    sketch: str(d.sketch, `${path}.sketch`, c, { optional: true, max: 700 }),
    suitable: bi(d.suitable, `${path}.suitable`, c),
    risk: bi(d.risk, `${path}.risk`, c),
  };
}

export function validateBoard(raw: unknown): ValidationResult {
  const c = new Collector();
  if (!isObj(raw)) return { ok: false, errors: ["root: 需要 JSON 对象 expected a JSON object"] };
  const meta = isObj(raw.meta) ? raw.meta : {};
  const reading = isObj(raw.reading) ? raw.reading : {};
  const rec = isObj(raw.recommendation) ? raw.recommendation : {};
  const copy = isObj(raw.copy) ? raw.copy : {};

  const directions = arr(raw.directions, "directions", c, 1, 3).map((d, i) => validateDirection(d, `directions[${i}]`, c, i));
  const ids = new Set<string>();
  for (const d of directions) {
    if (ids.has(d.id)) c.add("directions", `重复的方向编号 duplicate direction id ${d.id}`);
    ids.add(d.id);
  }

  const board: Board = {
    meta: {
      product: bi(meta.product, "meta.product", c),
      brand: str(meta.brand, "meta.brand", c, { optional: true, max: 60 }),
      category: str(meta.category, "meta.category", c, { optional: true, max: 40 }),
    },
    reading: {
      product: bi(reading.product, "reading.product", c),
      references: arr(reading.references, "reading.references", c, 0, 6).map((r, i) => {
        const o = isObj(r) ? r : {};
        return {
          label: str(o.label, `reading.references[${i}].label`, c, { max: 60 }),
          borrow: bi(o.borrow, `reading.references[${i}].borrow`, c),
          avoid: bi(o.avoid, `reading.references[${i}].avoid`, c),
        };
      }),
      assumptions: arr(reading.assumptions, "reading.assumptions", c, 0, 8).map((a, i) => bi(a, `reading.assumptions[${i}]`, c)),
    },
    directions,
    recommendation: {
      pick: str(rec.pick, "recommendation.pick", c, { max: 4 }),
      reason: bi(rec.reason, "recommendation.reason", c),
      designerInstruction: bi(rec.designerInstruction, "recommendation.designerInstruction", c),
    },
    copy: {
      nameLine: bi(copy.nameLine, "copy.nameLine", c),
      frontPromise: bi(copy.frontPromise, "copy.frontPromise", c),
      manualSteps: arr(copy.manualSteps, "copy.manualSteps", c, 0, 8).map((s, i) => bi(s, `copy.manualSteps[${i}]`, c)),
      placeholders: arr(copy.placeholders, "copy.placeholders", c, 0, 12).map((s, i) => str(s, `copy.placeholders[${i}]`, c, { max: 60 })),
    },
    claimCheck: arr(raw.claimCheck, "claimCheck", c, 0, 10).map((f, i) => {
      const o = isObj(f) ? f : {};
      return {
        text: str(o.text, `claimCheck[${i}].text`, c, { max: 200 }),
        level: pick(o.level, ["high", "medium", "low"] as const, "medium"),
        issue: bi(o.issue, `claimCheck[${i}].issue`, c),
        safer: bi(o.safer, `claimCheck[${i}].safer`, c),
      };
    }),
    complianceNotes: arr(raw.complianceNotes, "complianceNotes", c, 0, 8).map((n, i) => bi(n, `complianceNotes[${i}]`, c)),
  };

  if (board.directions.length && !ids.has(board.recommendation.pick)) {
    // A pick that names no direction falls back to the "distinctive" route, as the skill recommends.
    board.recommendation.pick = (board.directions.find((d) => d.route === "distinctive") ?? board.directions[0]).id;
  }

  return c.errors.length ? { ok: false, errors: c.errors } : { ok: true, value: board };
}

export { Collector };
