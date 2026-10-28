/**
 * The calligraphic face for inscriptions and title slips (题签), on the page and on the package.
 *
 *   瘦金体 Slender Gold — Emperor Huizong's hand, the Song inscription script. No 瘦金体 font is
 *     free for commercial use, so it is used only when a licensed web font is configured:
 *     NEXT_PUBLIC_SHOUJIN_FONT_URL (for example /fonts/shoujin/FZShouJinShu.woff2, bought from
 *     FounderType or Hanyi with a web-embedding licence that also covers print).
 *   朱雀仿宋 Zhuque Fangsong — an open (SIL OFL 1.1) face cut after a Republican-era revival of
 *     Song book type; bundled in public/fonts/zhuque and sliced by Unicode range (src/app/fonts.css).
 *   楷 — the system's Kaiti, last.
 *
 * Canvas text does not wait for web fonts, so whatever draws package art asks for the characters
 * it is about to set (needInscription / loadInscription) and redraws when they arrive
 * (onInscriptionFont, inscriptionEpoch). Client-safe: does nothing without a document.
 */

export const SHOUJIN = "PA Shoujin";
export const ZHUQUE = "Zhuque Fangsong";
/** The stack, for canvas fonts and CSS alike. */
export const INSCRIPTION_STACK = `"${SHOUJIN}", "${ZHUQUE}", "Kaiti SC", "STKaiti", "KaiTi", "BiauKai", "AR PL UKai CN", "Songti SC", "Noto Serif CJK SC", serif`;

const shoujinUrl = (() => {
  try {
    return process.env.NEXT_PUBLIC_SHOUJIN_FONT_URL || "";
  } catch {
    return "";
  }
})();

/** Whether a licensed 瘦金体 is configured for this deployment. */
export const hasShoujin = () => !!shoujinUrl;

let registered = false;
/** Adds the configured 瘦金体 face to the page (it loads when first used). */
export function registerShoujin(): void {
  if (registered || !shoujinUrl || typeof document === "undefined" || !document.fonts || typeof FontFace === "undefined") return;
  registered = true;
  try {
    document.fonts.add(new FontFace(SHOUJIN, `url("${shoujinUrl}")`, { display: "swap" }));
  } catch {
    // a bad URL leaves the stack to the next face
  }
}

let epoch = 0;
const subs = new Set<() => void>();
/** Each text's load, shared by every caller (a face that fails to load is not retried). */
const pending = new Map<string, Promise<boolean>>();

/** Goes up each time inscription glyphs arrive that were not there before. */
export const inscriptionEpoch = () => epoch;

/** Called whenever new inscription glyphs have loaded. Returns the unsubscribe. */
export function onInscriptionFont(cb: () => void): () => void {
  subs.add(cb);
  return () => subs.delete(cb);
}

/**
 * Loads the inscription faces for `text` (only the slices that hold its characters). Resolves
 * once they are ready: true when something new arrived (and subscribers have been told), false
 * when it was all there already. Each text is loaded once; later calls share the same promise,
 * so a caller that must draw with the font (the print file) can always await it.
 */
export function loadInscription(text: string): Promise<boolean> {
  if (typeof document === "undefined" || !document.fonts || !text) return Promise.resolve(false);
  let p = pending.get(text);
  if (!p) {
    p = load(text);
    pending.set(text, p);
  }
  return p;
}

async function load(text: string): Promise<boolean> {
  registerShoujin();
  const fams = shoujinUrl ? [SHOUJIN, ZHUQUE] : [ZHUQUE];
  try {
    // already there (or nothing to load): canvas text drawn so far was right
    if (fams.every((f) => document.fonts.check(`400 40px "${f}"`, text))) return false;
    const lists = await Promise.all(fams.map((f) => document.fonts.load(`400 40px "${f}"`, text).catch(() => [] as FontFace[])));
    const fresh = lists.some((faces) => faces.some((f) => f.status === "loaded"));
    if (fresh) {
      epoch++;
      for (const cb of [...subs]) cb();
    }
    return fresh;
  } catch {
    return false;
  }
}

/** Fire-and-forget form of loadInscription. */
export function needInscription(text: string): void {
  void loadInscription(text);
}
