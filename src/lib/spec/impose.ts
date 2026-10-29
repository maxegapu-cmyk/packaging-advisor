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

function grid(W: number, H: number, w: number, h: number): number {
  const across = Math.floor((W + GAP) / (w + GAP));
  const down = Math.floor((H + GAP) / (h + GAP));
  return Math.max(0, across) * Math.max(0, down);
}

/** Best count of w × h blanks on a usable W × H area, either way round or mixed. */
export function fit(W: number, H: number, w: number, h: number): { n: number; layout: string } {
  let best = { n: 0, layout: "" };
  const tryIt = (n: number, layout: string) => {
    if (n > best.n) best = { n, layout };
  };
  for (const [a, b] of [
    [w, h],
    [h, w],
  ]) {
    const across = Math.floor((W + GAP) / (a + GAP));
    const down = Math.floor((H + GAP) / (b + GAP));
    if (across > 0 && down > 0) tryIt(across * down, `${across} × ${down}`);
    // rows of one orientation, then the leftover strip with the other
    for (let rows = 1; rows <= down; rows++) {
      const used = rows * (b + GAP);
      const rest = grid(W, H - used, b, a);
      if (rest) tryIt(across * rows + rest, `${across} × ${rows} + ${rest}`);
    }
    for (let cols = 1; cols <= across; cols++) {
      const used = cols * (a + GAP);
      const rest = grid(W - used, H, b, a);
      if (rest) tryIt(cols * down + rest, `${cols} × ${down} + ${rest}`);
    }
  }
  return best;
}

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
      const W = Math.max(sw, sh) - 2 * EDGE;
      const H = Math.min(sw, sh) - GRIPPER - EDGE;
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
