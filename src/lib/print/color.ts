/**
 * Color helpers for print checks. Screen colors are sRGB; the CMYK figures here are a plain
 * device-independent conversion, a starting point for the printer, not a profile conversion.
 * Client-safe and pure.
 */

export type Rgb = { r: number; g: number; b: number };

export function hexToRgb(hex: string): Rgb {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

const lin = (c: number) => {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};

/** WCAG relative luminance, 0 (black) to 1 (white). */
export function luminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** WCAG contrast ratio, 1 to 21. Small print text wants 4.5 or more; large type 3. */
export function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Approximate CMYK percentages (no ICC profile). */
export function toCmyk(hex: string): { c: number; m: number; y: number; k: number } {
  const { r, g, b } = hexToRgb(hex);
  const rr = r / 255;
  const gg = g / 255;
  const bb = b / 255;
  const k = 1 - Math.max(rr, gg, bb);
  if (k >= 0.999) return { c: 0, m: 0, y: 0, k: 100 };
  const f = (x: number) => Math.round(((1 - x - k) / (1 - k)) * 100);
  return { c: f(rr), m: f(gg), y: f(bb), k: Math.round(k * 100) };
}

export const cmykText = (hex: string) => {
  const { c, m, y, k } = toCmyk(hex);
  return `C${c} M${m} Y${y} K${k}`;
};

/**
 * Barcode scanners read with red light, so what matters is the red-channel reflectance:
 * red or orange bars vanish, and a red background is fine. Print contrast signal
 * PCS = (Rlight − Rdark) / Rlight; 0.75 or more scans reliably.
 */
export function barcodePcs(bars: string, background: string): number {
  const rl = lin(hexToRgb(background).r);
  const rd = lin(hexToRgb(bars).r);
  if (rl <= 0) return 0;
  return (rl - rd) / rl;
}

/** Mixes two hex colors (t = 0 gives a, 1 gives b). */
export function mix(a: string, b: string, t: number): string {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  const c = (x: number, y: number) => Math.round(x + (y - x) * t).toString(16).padStart(2, "0");
  return `#${c(A.r, B.r)}${c(A.g, B.g)}${c(A.b, B.b)}`.toUpperCase();
}
