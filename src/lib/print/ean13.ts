/**
 * EAN-13 barcodes (商品条码). China's GS1 prefixes are 690–699; the number itself comes from the
 * seller's GS1 China registration, never from us: an invented number would scan as someone
 * else's product. Client-safe and pure.
 */

const L = ["0001101", "0011001", "0010011", "0111101", "0100011", "0110001", "0101111", "0111011", "0110111", "0001011"];
const G = ["0100111", "0110011", "0011011", "0100001", "0011101", "0111001", "0000101", "0010001", "0001001", "0010111"];
const R = ["1110010", "1100110", "1101100", "1000010", "1011100", "1001110", "1010000", "1000100", "1001000", "1110100"];
/** Which of L / G encodes digits 2–7, chosen by the first digit. */
const PARITY = ["LLLLLL", "LLGLGG", "LLGGLG", "LLGGGL", "LGLLGG", "LGGLLG", "LGGGLL", "LGLGLG", "LGLGGL", "LGGLGL"];

export const cleanDigits = (s: string) => s.replace(/[\s-]/g, "");

/** Check digit for the first 12 digits. */
export function checkDigit(first12: string): number {
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(first12[i]) * (i % 2 === 0 ? 1 : 3);
  return (10 - (sum % 10)) % 10;
}

export type EanCheck = { ok: true; digits: string } | { ok: false; reason: "empty" | "format" | "check"; expected?: number };

/** Validates a 13-digit EAN; a 12-digit entry is reported with the check digit it needs. */
export function checkEan13(input: string): EanCheck {
  const s = cleanDigits(input);
  if (!s) return { ok: false, reason: "empty" };
  if (/^\d{12}$/.test(s)) return { ok: false, reason: "check", expected: checkDigit(s) };
  if (!/^\d{13}$/.test(s)) return { ok: false, reason: "format" };
  const c = checkDigit(s.slice(0, 12));
  return c === Number(s[12]) ? { ok: true, digits: s } : { ok: false, reason: "check", expected: c };
}

/** The 95 modules (1 = bar) of a valid EAN-13: start, 6 left digits, centre, 6 right digits, end. */
export function ean13Modules(digits: string): string {
  const s = cleanDigits(digits);
  if (!/^\d{13}$/.test(s)) throw new Error("EAN-13 needs 13 digits");
  const parity = PARITY[Number(s[0])];
  let out = "101";
  for (let i = 1; i <= 6; i++) out += (parity[i - 1] === "L" ? L : G)[Number(s[i])];
  out += "01010";
  for (let i = 7; i <= 12; i++) out += R[Number(s[i])];
  return out + "101";
}

/** Whether module `i` belongs to a guard pattern (guards are drawn longer). */
export const isGuard = (i: number) => i < 3 || (i >= 45 && i < 50) || i >= 92;

/**
 * Nominal size: 37.29 × 25.93 mm at magnification 1.0 (module 0.33 mm), including quiet zones.
 * GS1 allows 0.8–2.0; below 0.8 scanners struggle.
 */
export const EAN_NOMINAL = { w: 37.29, h: 25.93, module: 0.33, minMag: 0.8 } as const;
