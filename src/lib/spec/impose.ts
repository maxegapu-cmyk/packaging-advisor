/**
 * Imposition (拼版): how many blanks fit on a press sheet cut from a 正度 or 大度 full sheet, and on
 * which press it runs. Blanks are placed as rectangles in a grid, either way round, with a mixed
 * layout (a strip turned the other way) when that fits more. Interlocking nets (tuck flaps nested
 * into each other) can fit a few more in practice; the count here is the conservative one.
 * Client-safe.
 */
import type { Pair } from "../i18n";
import { CUTS, FULL_SHEETS, PRESSES, type Press, type SheetFamily } from "./rates";

/** Gripper and edge margins (mm) and the gap between blanks for bleed and the cut. */
export const GRIPPER = 12;
export const EDGE = 6;
export const GAP = 5;

export type Imposition = {
  family: SheetFamily;
  /** how many press sheets one full sheet is cut into */
  cut: number;
  cutLabel: Pair;
  sheet: [number, number];
  press: Press;
  ups: number;
  /** layout description, e.g. "2 × 3" or "2 × 2 + 1" */
  layout: string;
  /** share of the press sheet the blanks cover */
  use: number;
};

/** Where a blank sits in the usable area: its corner (mm) and whether it is turned a quarter. */
export type Up = { x: number; y: number; rot: 0 | 90 };

function gridAt(W: number, H: number, a: number, b: number, ox: number, oy: number, rot: 0 | 90): Up[] {
  const across = Math.floor((W + GAP) / (a + GAP));
  const down = Math.floor((H + GAP) / (b + GAP));
  const out: Up[] = [];
  if (across <= 0 || down <= 0) return out;
  for (let j = 0; j < down; j++) for (let i = 0; i < across; i++) out.push({ x: ox + i * (a + GAP), y: oy + j * (b + GAP), rot });
  return out;
}

/**
 * Best placement of w × h blanks on a usable W × H area: a grid either way round, or rows (or
 * columns) one way with the leftover strip turned the other way.
 */
export function placeUps(W: number, H: number, w: number, h: number): { n: number; layout: string; ups: Up[] } {
  let best = { n: 0, layout: "", ups: [] as Up[] };
  const tryIt = (ups: Up[], layout: string) => {
    if (ups.length > best.n) best = { n: ups.length, layout, ups };
  };
  for (const [a, b, rot] of [
    [w, h, 0],
    [h, w, 90],
  ] as [number, number, 0 | 90][]) {
    const other: 0 | 90 = rot ? 0 : 90;
    const across = Math.floor((W + GAP) / (a + GAP));
    const down = Math.floor((H + GAP) / (b + GAP));
    if (across > 0 && down > 0) tryIt(gridAt(W, H, a, b, 0, 0, rot), `${across} × ${down}`);
    // rows of one orientation, then the leftover strip with the other
    for (let rows = 1; rows <= down; rows++) {
      const used = rows * (b + GAP);
      const rest = gridAt(W, H - used, b, a, 0, used, other);
      if (rest.length) tryIt([...gridAt(W, used - GAP, a, b, 0, 0, rot), ...rest], `${across} × ${rows} + ${rest.length}`);
    }
    for (let cols = 1; cols <= across; cols++) {
      const used = cols * (a + GAP);
      const rest = gridAt(W - used, H, b, a, used, 0, other);
      if (rest.length) tryIt([...gridAt(used - GAP, H, a, b, 0, 0, rot), ...rest], `${cols} × ${down} + ${rest.length}`);
    }
  }
  return best;
}

/** Best count of w × h blanks on a usable W × H area, either way round or mixed. */
export function fit(W: number, H: number, w: number, h: number): { n: number; layout: string } {
  const b = placeUps(W, H, w, h);
  return { n: b.n, layout: b.layout };
}

/** The usable area of a press sheet: the gripper along the top long edge, margins elsewhere. */
export const usable = (sheet: [number, number]) => ({ x: EDGE, y: GRIPPER, w: sheet[0] - 2 * EDGE, h: sheet[1] - GRIPPER - EDGE });

const fitsPress = (w: number, h: number, p: (typeof PRESSES)[number]) => (w <= p.max[0] && h <= p.max[1]) || (h <= p.max[0] && w <= p.max[1]);

/** Every way the blank can be run: by sheet family and cut, on the smallest press that takes the sheet. */
export function impositions(blank: { w: number; h: number }, families: SheetFamily[] = ["da", "zheng"]): Imposition[] {
  const out: Imposition[] = [];
  for (const family of families) {
    const full = FULL_SHEETS[family];
    for (const c of CUTS) {
      const [sw, sh] = c.size(full.w, full.h);
      const press = PRESSES.find((p) => fitsPress(sw, sh, p));
      if (!press) continue;
      // the gripper edge is one long side
      const u = usable([Math.max(sw, sh), Math.min(sw, sh)]);
      const W = u.w;
      const H = u.h;
      const f = fit(W, H, blank.w, blank.h);
      if (!f.n) continue;
      out.push({ family, cut: c.n, cutLabel: c.label, sheet: [Math.max(sw, sh), Math.min(sw, sh)], press: press.id, ups: f.n, layout: f.layout, use: (f.n * blank.w * blank.h) / (sw * sh) });
    }
  }
  return out;
}

/** A sheet's area (m²). */
export const sheetM2 = (i: Imposition) => (i.sheet[0] * i.sheet[1]) / 1e6;
export const fullM2 = (f: SheetFamily) => (FULL_SHEETS[f].w * FULL_SHEETS[f].h) / 1e6;

export function impositionText(i: Imposition, lang: "zh" | "en"): string {
  const fam = FULL_SHEETS[i.family].label[lang];
  const press = PRESSES.find((p) => p.id === i.press)!.label[lang];
  return lang === "zh" ? `${fam}${i.cutLabel.zh}（${i.sheet[0]}×${i.sheet[1]}）${i.ups} 模，${press}，用纸率 ${Math.round(i.use * 100)}%` : `${fam} ${i.cutLabel.en} sheet (${i.sheet[0]}×${i.sheet[1]}), ${i.ups}-up, ${press.toLowerCase()}, ${Math.round(i.use * 100)}% of the sheet used`;
}
