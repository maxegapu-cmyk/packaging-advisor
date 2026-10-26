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

/* ---------------------------------------------------------------- Lab and ΔE (for proofs) */

export type Lab = { L: number; a: number; b: number };

/** sRGB hex to CIELAB (D65). */
export function hexToLab(hex: string): Lab {
  const { r, g, b } = hexToRgb(hex);
  const R = lin(r);
  const G = lin(g);
  const B = lin(b);
  const X = (0.4124564 * R + 0.3575761 * G + 0.1804375 * B) / 0.95047;
  const Y = 0.2126729 * R + 0.7151522 * G + 0.072175 * B;
  const Z = (0.0193339 * R + 0.119192 * G + 0.9503041 * B) / 1.08883;
  const f = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);
  const fx = f(X);
  const fy = f(Y);
  const fz = f(Z);
  return { L: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) };
}

/** CIEDE2000 color difference. Under 2 is hard to see; over 5 is an obvious mismatch. */
export function deltaE2000(x: Lab, y: Lab): number {
  const rad = Math.PI / 180;
  const C1 = Math.hypot(x.a, x.b);
  const C2 = Math.hypot(y.a, y.b);
  const Cm = (C1 + C2) / 2;
  const G = 0.5 * (1 - Math.sqrt(Cm ** 7 / (Cm ** 7 + 25 ** 7)));
  const a1 = (1 + G) * x.a;
  const a2 = (1 + G) * y.a;
  const C1p = Math.hypot(a1, x.b);
  const C2p = Math.hypot(a2, y.b);
  const h = (a: number, b: number) => {
    if (a === 0 && b === 0) return 0;
    const v = Math.atan2(b, a) / rad;
    return v < 0 ? v + 360 : v;
  };
  const h1 = h(a1, x.b);
  const h2 = h(a2, y.b);
  const dL = y.L - x.L;
  const dC = C2p - C1p;
  let dh = 0;
  if (C1p * C2p !== 0) {
    dh = h2 - h1;
    if (dh > 180) dh -= 360;
    else if (dh < -180) dh += 360;
  }
  const dH = 2 * Math.sqrt(C1p * C2p) * Math.sin((dh / 2) * rad);
  const Lm = (x.L + y.L) / 2;
  const Cmp = (C1p + C2p) / 2;
  let hm = h1 + h2;
  if (C1p * C2p !== 0) {
    if (Math.abs(h1 - h2) > 180) hm = h1 + h2 < 360 ? (h1 + h2 + 360) / 2 : (h1 + h2 - 360) / 2;
    else hm = (h1 + h2) / 2;
  }
  const T = 1 - 0.17 * Math.cos((hm - 30) * rad) + 0.24 * Math.cos(2 * hm * rad) + 0.32 * Math.cos((3 * hm + 6) * rad) - 0.2 * Math.cos((4 * hm - 63) * rad);
  const dTheta = 30 * Math.exp(-(((hm - 275) / 25) ** 2));
  const Rc = 2 * Math.sqrt(Cmp ** 7 / (Cmp ** 7 + 25 ** 7));
  const Sl = 1 + (0.015 * (Lm - 50) ** 2) / Math.sqrt(20 + (Lm - 50) ** 2);
  const Sc = 1 + 0.045 * Cmp;
  const Sh = 1 + 0.015 * Cmp * T;
  const Rt = -Math.sin(2 * dTheta * rad) * Rc;
  return Math.sqrt((dL / Sl) ** 2 + (dC / Sc) ** 2 + (dH / Sh) ** 2 + Rt * (dC / Sc) * (dH / Sh));
}

export const deltaE = (a: string, b: string) => deltaE2000(hexToLab(a), hexToLab(b));
