/**
 * The calligraphic face for inscriptions and title slips (题签), on the page and on the package.
 *
 *   瘦金体 Slender Gold — Emperor Huizong's hand, the Song inscription script. No 瘦金体 font is
 *     free for commercial use, so it is used only when a licensed one is configured:
 *     NEXT_PUBLIC_SHOUJIN_FONT_URL, the stylesheet scripts/fonts/add_shoujin.py writes (set
 *     automatically when public/fonts/shoujin/shoujin.css exists at build time) or a single font
 *     file. The licence must cover web embedding and print.
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

let registered: Promise<void> | null = null;
/**
 * Adds the configured 瘦金体 to the page: a stylesheet of sliced faces (loaded when first used) or
 * one font file. Resolves when the faces are known to the page (or could not be added).
 */
export function registerShoujin(): Promise<void> {
  if (registered) return registered;
  if (!shoujinUrl || typeof document === "undefined" || !document.fonts || typeof FontFace === "undefined") return Promise.resolve();
  registered = new Promise<void>((done) => {
    try {
      if (/\.css(\?|$)/.test(shoujinUrl)) {
        // the layout puts the stylesheet in the page's head; add it only where it is missing
        const had = [...document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')].find((l) => l.href === new URL(shoujinUrl, location.href).href);
        if (had) {
          if (had.sheet) done();
          else {
            had.addEventListener("load", () => done());
            had.addEventListener("error", () => done());
          }
          return;
        }
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = shoujinUrl;
        link.dataset.font = SHOUJIN;
        link.onload = () => done();
        link.onerror = () => done();
        document.head.appendChild(link);
      } else {
        document.fonts.add(new FontFace(SHOUJIN, `url("${shoujinUrl}")`, { display: "swap" }));
        done();
      }
    } catch {
      // a bad address leaves the stack to the next face
      done();
    }
  });
  return registered;
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

/** Whether `cp` falls in a CSS unicode-range ("U+4E00-9FFF, U+3001"). */
function inRange(range: string, cp: number): boolean {
  for (const part of range.split(",")) {
    const m = /U\+([0-9A-F?]+)(?:-([0-9A-F]+))?/i.exec(part.trim());
    if (!m) continue;
    const a = parseInt(m[1].replace(/\?/g, "0"), 16);
    const b = m[2] ? parseInt(m[2], 16) : m[1].includes("?") ? parseInt(m[1].replace(/\?/g, "F"), 16) : a;
    if (cp >= a && cp <= b) return true;
  }
  return false;
}

async function load(text: string): Promise<boolean> {
  await registerShoujin();
  // 瘦金体 for everything it covers; 朱雀仿宋 only for the characters it does not, so a page with
  // the licensed face downloads no 朱雀 slices it will not use
  const jobs: [string, string][] = [];
  let rest = text;
  if (shoujinUrl) {
    jobs.push([SHOUJIN, text]);
    const faces = Array.from(document.fonts).filter((f) => f.family.replace(/["']/g, "") === SHOUJIN);
    if (faces.length) rest = Array.from(text).filter((ch) => !faces.some((f) => inRange(f.unicodeRange, ch.codePointAt(0)!))).join("");
  }
  if (rest.trim()) jobs.push([ZHUQUE, rest]);
  try {
    // already there (or nothing to load): canvas text drawn so far was right
    if (jobs.every(([f, t]) => document.fonts.check(`400 40px "${f}"`, t))) return false;
    const lists = await Promise.all(jobs.map(([f, t]) => document.fonts.load(`400 40px "${f}"`, t).catch(() => [] as FontFace[])));
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
