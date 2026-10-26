/**
 * Typesetting of the information panel (back or bottom): brand, a short paragraph, the label
 * table and the barcode. Pure geometry in millimetres so it can be checked without a browser;
 * the canvas drawing uses these lines and sizes as they are.
 *
 * Text widths use a fixed metric (CJK and full-width 1 em, Latin and digits 0.56 em). Real
 * glyphs are a little narrower, and the drawing compresses a line rather than let it overflow.
 */
import { EAN_NOMINAL } from "./ean13";

export type Line = { text: string; x: number; y: number; size: number; bold?: boolean; maxW: number };
export type BackLayout = {
  lines: Line[];
  /** Row separators (y in mm). */
  rules: { x0: number; x1: number; y: number }[];
  barcode: { x: number; y: number; w: number; h: number; mag: number } | null;
  /** Body text size used (em, mm). */
  textMm: number;
  /** True when the table had to stop before the last row. */
  overflow: boolean;
  pad: number;
};

const WIDE = /[⺀-鿿豈-﫿＀-￯　-〿]/;

export function textWidth(s: string, size: number): number {
  let w = 0;
  for (const ch of s) w += WIDE.test(ch) ? 1 : ch === " " ? 0.3 : 0.56;
  return w * size;
}

/** Breaks text into lines no wider than maxW (CJK breaks anywhere, Latin at spaces). */
export function breakLines(text: string, size: number, maxW: number): string[] {
  const out: string[] = [];
  for (const para of text.split(/\n+/)) {
    let cur = "";
    const tokens = para.match(/[⺀-鿿豈-﫿＀-￯　-〿]|[^\s⺀-鿿豈-﫿＀-￯　-〿]+|\s+/g) ?? [];
    for (const t of tokens) {
      const next = cur + t;
      if (textWidth(next.trimEnd(), size) > maxW && cur.trim()) {
        out.push(cur.trimEnd());
        cur = t.trimStart();
        // a single token wider than the line: hard-split it
        while (textWidth(cur, size) > maxW && cur.length > 1) {
          let k = cur.length - 1;
          while (k > 1 && textWidth(cur.slice(0, k), size) > maxW) k--;
          out.push(cur.slice(0, k));
          cur = cur.slice(k);
        }
      } else cur = next;
    }
    if (cur.trim()) out.push(cur.trimEnd());
  }
  return out;
}

export type BackInput = { brand: string; intro: string; rows: { label: string; value: string }[]; barcode: boolean };

/** Smallest body size we try (mm, em). GB rules ask for ≥ 1.8 mm character height. */
export const MIN_TEXT_MM = 2.0;

function attempt(W: number, H: number, inp: BackInput, size: number, pad: number) {
  const lines: Line[] = [];
  const rules: BackLayout["rules"] = [];
  const innerW = W - pad * 2;
  let y = pad;
  if (inp.brand) {
    const bs = Math.min(size * 1.5, innerW / Math.max(1, textWidth(inp.brand, 1)));
    y += bs;
    lines.push({ text: inp.brand, x: pad, y, size: bs, bold: true, maxW: innerW });
    y += bs * 0.7;
  }
  // barcode reserves the bottom-left corner
  let barcode: BackLayout["barcode"] = null;
  let bottom = H - pad;
  if (inp.barcode) {
    const mag = Math.max(EAN_NOMINAL.minMag, Math.min(1, innerW / EAN_NOMINAL.w, ((H - pad * 2) * 0.32) / EAN_NOMINAL.h));
    const bw = EAN_NOMINAL.w * mag;
    const bh = EAN_NOMINAL.h * mag;
    barcode = { x: pad, y: H - pad - bh, w: bw, h: bh, mag };
    bottom = barcode.y - size * 0.8;
  }
  const lead = 1.32;
  for (const l of breakLines(inp.intro, size, innerW)) {
    y += size * lead;
    lines.push({ text: l, x: pad, y, size, maxW: innerW });
  }
  if (inp.intro) y += size * 0.6;
  const rows = inp.rows.filter((r) => r.value.trim());
  const labelW = Math.min(innerW * 0.36, Math.max(0, ...rows.map((r) => textWidth(r.label, size))) + size * 0.8);
  const valueW = innerW - labelW;
  let overflow = false;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const vl = breakLines(r.value, size, valueW);
    const need = vl.length * size * lead + size * 0.5;
    if (y + need > bottom + 0.01) {
      overflow = true;
      break;
    }
    rules.push({ x0: pad, x1: W - pad, y: y + size * 0.25 });
    lines.push({ text: r.label, x: pad, y: y + size * lead, size, bold: true, maxW: labelW - size * 0.4 });
    vl.forEach((t, j) => lines.push({ text: t, x: pad + labelW, y: y + size * lead * (j + 1), size, maxW: valueW }));
    y += need;
  }
  if (rows.length && !overflow) rules.push({ x0: pad, x1: W - pad, y: y + size * 0.25 });
  return { lines, rules, barcode, overflow, fits: !overflow && y <= bottom + 0.01 };
}

/** Lays out an information panel of W × H mm, shrinking the text until everything fits. */
export function layoutBack(W: number, H: number, inp: BackInput): BackLayout {
  const pad = Math.max(3, Math.min(10, Math.min(W, H) * 0.07));
  let size = Math.max(MIN_TEXT_MM, Math.min(3.2, Math.min(W, H) * 0.032));
  let r = attempt(W, H, inp, size, pad);
  while (!r.fits && size > 1.2) {
    size = Math.round((size - 0.1) * 100) / 100;
    r = attempt(W, H, inp, size, pad);
  }
  return { lines: r.lines, rules: r.rules, barcode: r.barcode, textMm: size, overflow: r.overflow, pad };
}
