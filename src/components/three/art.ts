/**
 * Print artwork for the 3D packages, drawn onto canvases at print-like resolution.
 * The same drawing runs twice: once for color, once for a foil mask (white where foil is
 * stamped), so the foil finish can become real metal in the material.
 * Layouts follow the direction's `layout` (offset / stripe / split) and palette roles.
 */
import { hillRoleOf, rolesOf as libRolesOf, sealRoleOf, type Roles } from "@/lib/artwork";
import type { Direction } from "@/lib/board/schema";
import type { Effect, Finish } from "@/lib/pack";
import { layoutBack } from "@/lib/print/backpanel";
import { ean13Modules, isGuard } from "@/lib/print/ean13";
import { WRAP_FRONT, type FaceKind } from "@/lib/print/layout";

export type { Roles, FaceKind };
export type Role = keyof Roles;

export const GOLD = "#D6B460";
const SERIF = '"Songti SC", "STSong", "Noto Serif CJK SC", "Source Han Serif SC", "Noto Serif CJK TC", serif';
const SANS = '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", "Source Han Sans SC", "Helvetica Neue", Arial, sans-serif';
/** 楷: inscriptions on the scroll layout, as a calligrapher would write them. */
const KAI = '"Kaiti SC", "STKaiti", "KaiTi", "BiauKai", "AR PL UKai CN", "Songti SC", "STSong", "Noto Serif CJK SC", serif';
/** The three layouts drawn from Song painting and books: a mounted scroll, a carved seal, a symmetric cover. */
export const SONG_LAYOUTS = ["scroll", "seal", "symmetric"] as const;
const isSong = (l: string) => (SONG_LAYOUTS as readonly string[]).includes(l);

export const rolesOf = (d: Direction): Roles => libRolesOf(d);

/** Paints a role. In mask mode everything is black except foil-stamped elements. Carries the palette. */
type Paint = ((role: Role, foil?: boolean) => string) & { roles: Roles };

type Ctx = CanvasRenderingContext2D;
/**
 * What a finished artwork adds to a direction: the real label text, barcode, net content and
 * logo. Without it the faces show the direction as a concept (placeholder text lines).
 */
export type ArtInfo = {
  intro: string;
  rows: { label: string; value: string }[];
  /** Valid EAN-13 digits, or "" for none. */
  barcode: string;
  net: string;
  logo: CanvasImageSource | null;
  /** Which face carries the label information on this package. */
  on: FaceKind | null;
  /** Changes whenever any of the above does (for caches). */
  key: string;
};
export type ArtInput = { d: Direction; brand: string; finish: Finish; effects?: Effect[]; info?: ArtInfo | null };

export const SILVER = "#C9CDD2";
export const HOLO = "#D6DAE0";
/** The foil color, or null when there is no foil. */
function foilColor(a: ArtInput): string | null {
  const f = a.effects?.find((e) => e === "goldFoil" || e === "silverFoil" || e === "holo");
  return f === "goldFoil" ? GOLD : f === "silverFoil" ? SILVER : f === "holo" ? HOLO : null;
}
/** Whether the accent elements are stamped (foil) rather than printed. */
const foiled = (a: ArtInput) => foilColor(a) !== null;

function canvas(w: number, h: number): [HTMLCanvasElement, Ctx] {
  const c = document.createElement("canvas");
  c.width = Math.max(4, Math.round(w));
  c.height = Math.max(4, Math.round(h));
  return [c, c.getContext("2d")!];
}

/**
 * Paints a role. Accent elements (`foil` = true) carry the effects: they turn foil-colored when
 * foiled, and in mask mode they are white (everything else black), for every effect.
 */
function painter(roles: Roles, a: ArtInput, mask: boolean, none = false): Paint {
  const fc = foilColor(a);
  const paint = (role: Role, foil = false) => {
    if (none) return "#000000";
    if (mask) return foil ? "#ffffff" : "#000000";
    return fc && foil ? fc : roles[role];
  };
  return Object.assign(paint, { roles });
}

/* ---------------------------------------------------------------- Legibility */

const channel = (v: number) => {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};
function luminance(hex: string): number {
  const h = hex.replace("#", "");
  const n = h.length === 3 ? h.split("").map((x) => x + x).join("") : h.padEnd(6, "0").slice(0, 6);
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16) || 0);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}
/** WCAG contrast ratio between two hex colours. */
export function contrastOf(a: string, b: string): number {
  const x = luminance(a);
  const y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
/**
 * The role to set text in over `bg`: `prefer` when it reads (3:1, the large-text bar), else
 * whichever of `prefer` and `alt` contrasts more. A pale key with a pale ground keeps its words.
 */
function textOn(P: Paint, bg: Role, prefer: Role, alt: Role): Role {
  const r = P.roles;
  const cp = contrastOf(r[prefer], r[bg]);
  return cp >= 3 || cp >= contrastOf(r[alt], r[bg]) ? prefer : alt;
}

function setFont(ctx: Ctx, weight: number, size: number, family: string) {
  ctx.font = `${weight} ${Math.max(1, size).toFixed(1)}px ${family}`;
}

function spacing(ctx: Ctx, em: number, size: number) {
  // letterSpacing is widely supported in current browsers; harmless where it isn't.
  (ctx as Ctx & { letterSpacing?: string }).letterSpacing = `${(em * size).toFixed(1)}px`;
}

/**
 * Shrinks the font until `text` fits `maxW` (with `track` em of letter spacing, which stays set
 * on return). Returns the size used.
 */
function fit(ctx: Ctx, text: string, weight: number, size: number, family: string, maxW: number, track = 0): number {
  let s = size;
  setFont(ctx, weight, s, family);
  spacing(ctx, track, s);
  while (s > 6 && ctx.measureText(text).width > maxW) {
    s *= 0.94;
    setFont(ctx, weight, s, family);
    spacing(ctx, track, s);
  }
  return s;
}

/** How far the inked part of `text` reaches below its baseline (descenders), at the current font. */
const descentOf = (ctx: Ctx, text: string) => Math.max(0, ctx.measureText(text).actualBoundingBoxDescent);

/* ---------------------------------------------------------------- Song toolkit */

/** A colour between two hex colours (a printed tint: CMYK mixes it like any other colour). */
function mixHex(a: string, b: string, t: number): string {
  const h = (x: string) => {
    const n = x.replace("#", "");
    const f = n.length === 3 ? n.split("").map((c) => c + c).join("") : n.padEnd(6, "0").slice(0, 6);
    return [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16) || 0);
  };
  const [x, y] = [h(a), h(b)];
  return "#" + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, "0")).join("");
}

/** A repeatable random sequence from a string: the same seal, hills and wear every time. */
function seeded(key: string): () => number {
  let h = 2166136261;
  for (const ch of key) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  let x = (h >>> 0) || 1;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return ((x >>> 0) % 100000) / 100000;
  };
}

/** Seal ink and hill colour: the same rules the CSS faces use (lib/artwork). */
const sealRole = (P: Paint): Role => sealRoleOf(P.roles);
const hillRole = (P: Paint): Role => hillRoleOf(P.roles);

/** The characters a seal can carry: up to four, no spaces or separators. */
const sealChars = (t: string) => Array.from(t.replace(/[\s·・,，.。:：'"“”-]/g, "")).slice(0, 4);

/**
 * A carved seal centred at (cx, cy), `size` high. Its characters (up to four) are set the old
 * way: top to bottom, right column first; three characters give the first a whole column; two
 * make a tall seal. 白文 ("bai"): the characters are cut out of a solid block and print as paper.
 * 朱文 ("zhu"): the characters and a border stand proud and print in ink. Each character is
 * stretched to fill its cell, as a seal carver lays it out. The stone keeps its wear — a chipped
 * edge here and there, a few specks the paste missed, a slight tilt — seeded from the text, so a
 * seal prints the same every time. Returns the seal's width.
 */
function drawSealMark(ctx: Ctx, text: string, cx: number, cy: number, size: number, color: string, style: "bai" | "zhu" = "bai", tilt?: number): number {
  const chars = sealChars(text);
  if (!chars.length || size < 4) return 0;
  const rnd = seeded(text + style);
  const n = chars.length;
  const h = size;
  const w = n === 2 ? size * 0.56 : size;
  const pad = 2 + Math.ceil(size * 0.04);
  const [c, x] = canvas(w + pad * 2, h + pad * 2);
  // the stone's outline, its edges not quite straight
  const outline = () => {
    x.beginPath();
    const steps = 18;
    const j = () => (rnd() - 0.5) * size * 0.012;
    for (let i = 0; i < steps; i++) x.lineTo(pad + (w * i) / steps, pad + j());
    for (let i = 0; i < steps; i++) x.lineTo(pad + w + j(), pad + (h * i) / steps);
    for (let i = 0; i < steps; i++) x.lineTo(pad + w - (w * i) / steps, pad + h + j());
    for (let i = 0; i < steps; i++) x.lineTo(pad + j(), pad + h - (h * i) / steps);
    x.closePath();
  };
  x.fillStyle = "#000";
  x.strokeStyle = "#000";
  const border = size * (style === "bai" ? 0.07 : 0.065);
  if (style === "bai") {
    outline();
    x.fill();
  } else {
    x.lineWidth = border;
    x.save();
    x.translate(border / 2, border / 2);
    x.scale((w - border) / w, (h - border) / h);
    outline();
    x.restore();
    x.stroke();
  }
  // cells: right column first, top to bottom
  const inset = border + size * (style === "bai" ? 0.035 : 0.045);
  const iw = w - inset * 2;
  const ih = h - inset * 2;
  const gap = size * 0.04;
  type Cell = { ch: string; x: number; y: number; w: number; h: number };
  const cells: Cell[] = [];
  const colW = (iw - gap) / 2;
  const rowH = (ih - gap) / 2;
  if (n === 1) cells.push({ ch: chars[0], x: inset, y: inset, w: iw, h: ih });
  else if (n === 2) {
    cells.push({ ch: chars[0], x: inset, y: inset, w: iw, h: rowH });
    cells.push({ ch: chars[1], x: inset, y: inset + rowH + gap, w: iw, h: rowH });
  } else if (n === 3) {
    cells.push({ ch: chars[0], x: inset + colW + gap, y: inset, w: colW, h: ih });
    cells.push({ ch: chars[1], x: inset, y: inset, w: colW, h: rowH });
    cells.push({ ch: chars[2], x: inset, y: inset + rowH + gap, w: colW, h: rowH });
  } else {
    cells.push({ ch: chars[0], x: inset + colW + gap, y: inset, w: colW, h: rowH });
    cells.push({ ch: chars[1], x: inset + colW + gap, y: inset + rowH + gap, w: colW, h: rowH });
    cells.push({ ch: chars[2], x: inset, y: inset, w: colW, h: rowH });
    cells.push({ ch: chars[3], x: inset, y: inset + rowH + gap, w: colW, h: rowH });
  }
  x.globalCompositeOperation = style === "bai" ? "destination-out" : "source-over";
  x.textBaseline = "alphabetic";
  x.textAlign = "left";
  for (const cl of cells) {
    setFont(x, 900, 100, SERIF);
    const m = x.measureText(cl.ch);
    const gw = Math.max(1, m.actualBoundingBoxLeft + m.actualBoundingBoxRight);
    const gh = Math.max(1, m.actualBoundingBoxAscent + m.actualBoundingBoxDescent);
    x.save();
    x.translate(pad + cl.x, pad + cl.y);
    x.scale(cl.w / gw, cl.h / gh);
    x.fillText(cl.ch, m.actualBoundingBoxLeft, m.actualBoundingBoxAscent);
    x.restore();
  }
  // wear: chips off the edge, specks the paste missed
  x.globalCompositeOperation = "destination-out";
  for (let i = 0; i < 7; i++) {
    const side = Math.floor(rnd() * 4);
    const t = rnd();
    const px = side === 0 ? pad + t * w : side === 1 ? pad + w : side === 2 ? pad + t * w : pad;
    const py = side === 0 ? pad : side === 1 ? pad + t * h : side === 2 ? pad + h : pad + t * h;
    x.beginPath();
    x.arc(px, py, size * (0.01 + rnd() * 0.022), 0, Math.PI * 2);
    x.fill();
  }
  for (let i = 0; i < 46; i++) {
    x.globalAlpha = 0.35 + rnd() * 0.65;
    x.beginPath();
    x.arc(pad + rnd() * w, pad + rnd() * h, size * (0.003 + rnd() * 0.008), 0, Math.PI * 2);
    x.fill();
  }
  x.globalAlpha = 1;
  // colour it
  x.globalCompositeOperation = "source-in";
  x.fillStyle = color;
  x.fillRect(0, 0, c.width, c.height);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(tilt ?? (rnd() - 0.5) * 0.05);
  ctx.drawImage(c, -c.width / 2, -c.height / 2);
  ctx.restore();
  return w;
}

/**
 * Distant hills in ink wash (远山), drawn into the box x, y, w, h: three ridges from far and pale
 * to near and darker, each fading into mist below its ridge line.
 */
function drawHills(ctx: Ctx, x: number, y: number, w: number, h: number, color: string, seed: string) {
  const rnd = seeded(seed);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  const layers = [
    { top: 0.0, peak: 0.42, alpha: 0.16 },
    { top: 0.22, peak: 0.36, alpha: 0.26 },
    { top: 0.48, peak: 0.3, alpha: 0.4 },
  ];
  for (const L of layers) {
    const ph = [rnd() * 6, rnd() * 6, rnd() * 6];
    const f = [1.3 + rnd() * 1.2, 3.1 + rnd() * 2, 7 + rnd() * 4];
    const ridge = (u: number) => {
      const v = 0.55 * Math.sin(u * f[0] + ph[0]) + 0.3 * Math.sin(u * f[1] + ph[1]) + 0.15 * Math.sin(u * f[2] + ph[2]);
      return y + h * (L.top + L.peak * (1 - (v + 1) / 2));
    };
    const g = ctx.createLinearGradient(0, y + h * L.top, 0, y + h);
    g.addColorStop(0, color);
    g.addColorStop(0.55, color);
    g.addColorStop(1, color.length === 7 ? color + "00" : "rgba(0,0,0,0)");
    ctx.globalAlpha = L.alpha;
    ctx.fillStyle = color.startsWith("#") ? g : color;
    ctx.beginPath();
    ctx.moveTo(x, y + h);
    const steps = 64;
    for (let i = 0; i <= steps; i++) ctx.lineTo(x + (w * i) / steps, ridge((i / steps) * Math.PI * 2));
    ctx.lineTo(x + w, y + h);
    ctx.closePath();
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

/** 文武边栏: a thick line outside a thin one, as round the text block of a Song-printed page. */
function doubleFrame(ctx: Ctx, x: number, y: number, w: number, h: number, thick: number, thin: number, gap: number, color: string) {
  ctx.strokeStyle = color;
  ctx.lineWidth = thick;
  ctx.strokeRect(x + thick / 2, y + thick / 2, w - thick, h - thick);
  ctx.lineWidth = thin;
  const o = thick + gap + thin / 2;
  ctx.strokeRect(x + o, y + o, w - 2 * o, h - 2 * o);
}

/** A key-fret (回纹) corner: a square spiral turned into the corner at (x, y), opening toward (dx, dy). */
function fretCorner(ctx: Ctx, x: number, y: number, s: number, dx: number, dy: number, color: string, lw: number) {
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.lineCap = "square";
  const u = s / 4;
  const pts = [
    [0, 4], [0, 0], [4, 0], [4, 3], [1, 3], [1, 1], [3, 1], [3, 2], [2, 2],
  ];
  ctx.beginPath();
  pts.forEach(([a, b], i) => {
    const px = x + dx * a * u;
    const py = y + dy * b * u;
    if (i) ctx.lineTo(px, py);
    else ctx.moveTo(px, py);
  });
  ctx.stroke();
  ctx.lineCap = "butt";
}

/** Net content at a chosen point (for layouts that set their own corners). */
function drawNetAt(ctx: Ctx, a: ArtInput, size: number, x: number, y: number, align: CanvasTextAlign, color: string, maxW?: number) {
  const net = a.info?.net.trim();
  if (!net) return;
  setFont(ctx, 600, size, SANS);
  if (maxW) fit(ctx, net, 600, size, SANS, maxW);
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.fillText(net, x, y);
  ctx.textAlign = "left";
}
/** The type size the labelling rules want for net content on a panel this size. */
const netSize = (m: number, ppm: number) => Math.max(4.4 * ppm, Math.min(m * 0.055, 8 * ppm));

/** Wraps CJK or Latin text into at most `lines` lines within `maxW`. */
function wrap(ctx: Ctx, text: string, maxW: number, lines: number): string[] {
  const out: string[] = [];
  let cur = "";
  const tokens = /[\u3000-\u9fff]/.test(text) ? Array.from(text) : text.split(/(\s+)/);
  for (const t of tokens) {
    const next = cur + t;
    if (ctx.measureText(next).width > maxW && cur.trim()) {
      out.push(cur.trim());
      cur = t.trimStart();
      if (out.length === lines - 1) break;
    } else cur = next;
  }
  const rest = tokens.join("").slice(out.join("").length).trim();
  if (out.length < lines && (cur.trim() || rest)) out.push(out.length === lines - 1 ? rest || cur.trim() : cur.trim());
  return out.filter(Boolean).slice(0, lines);
}

const CJK = /[⺀-鿿豈-﫿＀-￯　-〿]/;
type VToken = { t: string; kind: "cjk" | "latin" | "space" };
/** Splits text for vertical setting: each CJK character alone, Latin words and numbers kept whole. */
function vTokens(text: string): VToken[] {
  const out: VToken[] = [];
  for (const ch of Array.from(text)) {
    if (!ch.trim()) {
      if (out.length && out[out.length - 1].kind !== "space") out.push({ t: " ", kind: "space" });
      continue;
    }
    const latin = !CJK.test(ch);
    const last = out[out.length - 1];
    if (latin && last?.kind === "latin") last.t += ch;
    else out.push({ t: ch, kind: latin ? "latin" : "cjk" });
  }
  while (out.length && out[out.length - 1].kind === "space") out.pop();
  return out;
}
/** Length of vertical text along the column, at the current font. */
function verticalLength(ctx: Ctx, text: string, size: number, gap = 0.28): number {
  return vTokens(text).reduce((n, k) => n + (k.kind === "cjk" ? size * (1 + gap) : k.kind === "space" ? size * 0.45 : upright(k.t) ? size * (1 + gap) : ctx.measureText(k.t).width + size * gap), 0);
}
/** One or two digits sit upright side by side in a single cell (纵中横); longer runs turn. */
const upright = (t: string) => /^[0-9]{1,2}$/.test(t);
/**
 * Vertical text, top to bottom, centred on x and on yMid, the way Chinese is set in columns:
 * each CJK character upright in its own cell; a number of one or two digits upright in one cell;
 * longer Latin words and numbers ("500ml") turned 90° clockwise and kept whole, never stacked
 * a letter at a time.
 */
function vertical(ctx: Ctx, text: string, x: number, yMid: number, size: number, gap = 0.28) {
  const toks = vTokens(text);
  const step = size * (1 + gap);
  let y = yMid - verticalLength(ctx, text, size, gap) / 2;
  const align = ctx.textAlign;
  const base = ctx.textBaseline;
  for (const k of toks) {
    if (k.kind === "space") {
      y += size * 0.45;
    } else if (k.kind === "cjk" || upright(k.t)) {
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      ctx.fillText(k.t, x, y + size * 0.88, size * 1.02);
      y += step;
    } else {
      const w = ctx.measureText(k.t).width;
      ctx.save();
      ctx.translate(x, y + size * gap * 0.5);
      ctx.rotate(Math.PI / 2);
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(k.t, 0, 0);
      ctx.restore();
      y += w + size * gap;
    }
  }
  ctx.textAlign = align;
  ctx.textBaseline = base;
}

/* ---------------------------------------------------------------- Front panels */

/** Draws the logo into a box, keeping its proportions; returns the height used. */
function drawLogo(ctx: Ctx, logo: CanvasImageSource, x: number, y: number, maxW: number, maxH: number, align: "left" | "center" = "left"): number {
  const lw = (logo as HTMLImageElement).naturalWidth || (logo as HTMLCanvasElement).width || 1;
  const lh = (logo as HTMLImageElement).naturalHeight || (logo as HTMLCanvasElement).height || 1;
  const s = Math.min(maxW / lw, maxH / lh);
  const w = lw * s;
  const h = lh * s;
  ctx.drawImage(logo, align === "center" ? x - w / 2 : x, y, w, h);
  return h;
}

/** Net content on the front, big enough for the character-height rules. */
function drawNet(ctx: Ctx, W: number, H: number, a: ArtInput, P: Paint, ppm: number, corner: "bl" | "tr" | "br", onKey = false) {
  const net = a.info?.net.trim();
  if (!net) return;
  const m = Math.min(W, H);
  const size = Math.max(4.4 * ppm, Math.min(m * 0.055, 8 * ppm));
  setFont(ctx, 600, size, SANS);
  ctx.fillStyle = onKey ? P("ground") : P("ink");
  const pad = Math.max(m * 0.06, 4 * ppm);
  const tw = ctx.measureText(net).width;
  const x = corner === "bl" ? pad : W - pad - tw;
  const y = corner === "tr" ? pad + size : H - pad;
  ctx.fillText(net, x, y);
}

/**
 * The main face. Works for portrait and landscape panels. `safe` is the share of the width that
 * faces the viewer: a label wrapped far round a jar keeps its words in the middle `safe` part
 * (colour fields still run to the label's edges), so nothing important turns away round the curve.
 */
function drawFront(ctx: Ctx, W: number, H: number, a: ArtInput, P: Paint, ppm = 0, safe = 1) {
  if (safe < 0.999) {
    const cw = W * safe;
    const x0 = (W - cw) / 2;
    ctx.fillStyle = P("ground");
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.translate(x0, 0);
    drawFront(ctx, cw, H, a, P, ppm, 1);
    ctx.restore();
    // the layout's colour fields carry on to the edges of the label
    ctx.fillStyle = P("key");
    if (a.d.layout === "stripe") ctx.fillRect(0, 0, x0 + 0.5, H);
    if (a.d.layout === "split") ctx.fillRect(x0 + cw - 0.5, 0, W - x0 - cw + 0.5, H);
    return;
  }
  const { d, brand } = a;
  const m = Math.min(W, H);
  const head = d.mockup.headline;
  const detail = d.mockup.detail;
  const logo = a.info?.logo ?? null;
  const showBrand = (!!brand && brand !== head) || !!logo;
  const pxmm = ppm || m / 100;
  ctx.fillStyle = P("ground");
  ctx.fillRect(0, 0, W, H);

  if (d.layout === "stripe") {
    const bw = W * 0.24;
    ctx.fillStyle = P("key");
    ctx.fillRect(0, 0, bw, H);
    // fine contour lines inside the band
    ctx.strokeStyle = P("ground", true);
    ctx.globalAlpha = foiled(a) ? 0.95 : 0.32;
    ctx.lineWidth = Math.max(1, m * 0.0045);
    const step = m * 0.054;
    for (let y = m * 0.083; y < H - m * 0.083; y += step) {
      ctx.beginPath();
      ctx.moveTo(m * 0.054, y);
      ctx.bezierCurveTo(bw * 0.4, y - step * 0.25, bw * 0.6, y + step * 0.25, bw - m * 0.054, y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    const x = bw + m * 0.075;
    const room = W - x - m * 0.07;
    if (showBrand) {
      if (logo) drawLogo(ctx, logo, x, m * 0.07, room, m * 0.11);
      else {
        ctx.fillStyle = P("ink", true);
        // the net content sits top right: keep the brand clear of it
        const net = a.info?.net.trim() ? m * 0.3 : 0;
        fit(ctx, brand, 700, m * 0.058, SANS, room - net, 0.12);
        ctx.fillText(brand, x, m * 0.13);
        spacing(ctx, 0, 0);
      }
    }
    drawNet(ctx, W, H, a, P, pxmm, "tr");
    const s = fit(ctx, head, 800, m * 0.205, SANS, room);
    const hy = H - m * 0.2;
    const hd = descentOf(ctx, head);
    ctx.fillStyle = P("ink", true);
    ctx.fillText(head, x, hy);
    ctx.fillStyle = P("ink");
    const ds = fit(ctx, detail, 600, m * 0.064, SANS, room, 0.06);
    ctx.fillText(detail, x, Math.min(H - m * 0.04, hy + Math.max(hd, s * 0.2) + ds * 1.3));
    spacing(ctx, 0, 0);
    return;
  }

  if (d.layout === "split") {
    const kx = W * 0.58;
    ctx.fillStyle = P("key");
    ctx.fillRect(kx, 0, W - kx, H);
    // a leaf cut from the ground color
    ctx.save();
    ctx.translate(kx + (W - kx) * 0.56, H * 0.5);
    ctx.rotate(-0.49);
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = P("ground");
    const lw = m * 0.21;
    const lh = m * 0.37;
    ctx.beginPath();
    ctx.moveTo(0, -lh);
    ctx.bezierCurveTo(lw * 1.25, -lh * 0.55, lw * 1.1, lh * 0.55, 0, lh);
    ctx.bezierCurveTo(-lw * 1.1, lh * 0.55, -lw * 1.25, -lh * 0.55, 0, -lh);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = P("key");
    ctx.lineWidth = Math.max(1, m * 0.006);
    ctx.beginPath();
    ctx.moveTo(0, -lh * 0.85);
    ctx.lineTo(0, lh * 0.85);
    ctx.stroke();
    ctx.restore();
    const room = kx - m * 0.12;
    if (showBrand) {
      if (logo) drawLogo(ctx, logo, m * 0.07, m * 0.06, kx - m * 0.14, m * 0.1);
      else {
        ctx.fillStyle = P("ink", true);
        fit(ctx, brand, 700, m * 0.055, SANS, room, 0.14);
        ctx.fillText(brand, m * 0.07, m * 0.12);
        spacing(ctx, 0, 0);
      }
    }
    drawNet(ctx, kx, H, a, P, pxmm, "bl");
    const s = fit(ctx, head, 700, m * 0.33, SERIF, room);
    const hy = H * 0.5 + s * 0.3;
    const hd = descentOf(ctx, head);
    ctx.fillStyle = P("ink", true);
    ctx.fillText(head, m * 0.07, hy);
    ctx.fillStyle = P("ink");
    const ds = fit(ctx, detail, 600, m * 0.06, SANS, room);
    // below the headline's descenders (a Latin "p" or "g"), not into them
    ctx.fillText(detail, m * 0.07, hy + Math.max(hd + ds * 1.15, ds * 1.9));
    return;
  }

  if (d.layout === "scroll") return drawScrollFront(ctx, W, H, a, P, pxmm);
  if (d.layout === "seal") return drawSealFront(ctx, W, H, a, P, pxmm);
  if (d.layout === "symmetric") return drawSymmetricFront(ctx, W, H, a, P, pxmm);

  // offset: a quiet name top-left, a leaf form bleeding off the bottom-right, an accent ring
  ctx.save();
  ctx.translate(W - m * 0.2, H - m * 0.12);
  ctx.rotate(-0.38);
  ctx.fillStyle = P("key");
  const r = m * 0.4;
  ctx.beginPath();
  ctx.moveTo(-r, 0);
  ctx.bezierCurveTo(-r, -r * 0.62, -r * 0.5, -r * 1.04, r * 0.1, -r);
  ctx.bezierCurveTo(r * 0.7, -r * 0.96, r * 1.02, -r * 0.4, r, r * 0.1);
  ctx.bezierCurveTo(r * 0.96, r * 0.7, r * 0.4, r * 1.02, -r * 0.1, r);
  ctx.bezierCurveTo(-r * 0.62, r * 0.98, -r, r * 0.6, -r, 0);
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = P("accent", true);
  ctx.lineWidth = Math.max(1.5, m * 0.012);
  ctx.globalAlpha = foiled(a) ? 1 : 0.85;
  ctx.beginPath();
  ctx.arc(W - m * 0.255, H - m * 0.425, m * 0.17, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;
  const x = m * 0.085;
  let y = m * 0.13;
  if (showBrand) {
    if (logo) y = m * 0.07 + drawLogo(ctx, logo, x, m * 0.07, W * 0.5, m * 0.1) + m * 0.03;
    else {
      ctx.fillStyle = P("ink", true);
      fit(ctx, brand, 700, m * 0.056, SANS, W - x * 2, 0.16);
      ctx.fillText(brand, x, y);
      spacing(ctx, 0, 0);
      y += m * 0.06;
    }
  }
  drawNet(ctx, W, H, a, P, pxmm, "bl");
  setFont(ctx, 700, m * 0.215, SERIF);
  const lines = wrap(ctx, head, W - x * 2, 2);
  const s = fit(ctx, lines.reduce((a1, b) => (a1.length > b.length ? a1 : b), ""), 700, m * 0.215, SERIF, W - x * 2);
  ctx.fillStyle = P("ink", true);
  let hd = 0;
  for (const l of lines) {
    y += s * 1.02;
    ctx.fillText(l, x, y);
    hd = descentOf(ctx, l);
  }
  ctx.fillStyle = P("ink");
  const ds = fit(ctx, detail, 600, m * 0.064, SANS, W - x * 2, 0.06);
  ctx.fillText(detail, x, y + Math.max(m * 0.1, hd + ds * 1.2));
  spacing(ctx, 0, 0);
}

/**
 * 题签: the printed title slip pasted on a brocade box's lid, as on the cover of a Song book.
 * Paper with a thin double rule, the name written down it, a small seal at the foot.
 */
function drawSlip(ctx: Ctx, W: number, H: number, a: ArtInput, P: Paint) {
  const m = Math.min(W, H);
  ctx.fillStyle = P("ground");
  ctx.fillRect(0, 0, W, H);
  const o = m * 0.08;
  doubleFrame(ctx, o, o, W - 2 * o, H - 2 * o, Math.max(1.2, m * 0.035), Math.max(1, m * 0.012), m * 0.04, P("key", true));
  const head = a.d.mockup.headline;
  const inner = o + m * 0.2;
  const ss = m * 0.38;
  const room = H - 2 * inner - ss * 1.4;
  let s = Math.min(W * 0.44, (room * 0.9) / Math.max(1, vTokens(head).length * 1.3));
  setFont(ctx, 400, s, KAI);
  let len = verticalLength(ctx, head, s);
  if (len > room * 0.9) {
    s *= (room * 0.9) / len;
    setFont(ctx, 400, s, KAI);
    len = verticalLength(ctx, head, s);
  }
  ctx.fillStyle = P("ink", true);
  vertical(ctx, head, W / 2, inner + len / 2, s);
  drawSealMark(ctx, sealText(a), W / 2, H - inner - ss / 2, ss, P(sealRole(P)), "bai", 0);
}

/** What the seal carries: the brand, or the headline when there is no separate brand. */
const sealText = (a: ArtInput) => (a.brand && sealChars(a.brand).length ? a.brand : a.d.mockup.headline);

/**
 * 立轴 / 手卷: the face mounted like a Song painting. Portrait panels are a hanging scroll —
 * 天头 and 地头 bands in the key colour, two 惊燕 strips hanging from the top, 隔水 rules, and a
 * painting (画心) of distant hills in ink wash with the name inscribed down its right side in 楷,
 * sealed below. Landscape panels are a handscroll read right to left: the title section (引首)
 * on the right with the inscription, the hills to its left, the rolled ends in the key colour.
 */
function drawScrollFront(ctx: Ctx, W: number, H: number, a: ArtInput, P: Paint, ppm: number) {
  const { d } = a;
  const m = Math.min(W, H);
  const head = d.mockup.headline;
  const detail = d.mockup.detail;
  const ground = P("ground");
  // the mount is printed; the foil, when there is one, goes on the inscription and the 隔水 rules
  const key = P("key");
  const mount = mixHex(P("ground"), P("key"), 0.16);
  const ns = netSize(m, ppm);
  const hasNet = !!a.info?.net.trim();
  const rule = Math.max(1, m * 0.006);
  ctx.fillStyle = mount;
  ctx.fillRect(0, 0, W, H);
  const inscribe = (x: number, top: number, maxH: number, maxW: number) => {
    // the name down a column, the detail in a smaller column to its left, the seal beneath
    const n = Math.max(1, vTokens(head).length);
    let s = Math.min(maxW * 0.5, (maxH * 0.62) / (n * 1.28));
    setFont(ctx, 400, s, KAI);
    const len = verticalLength(ctx, head, s);
    ctx.fillStyle = P("ink", true);
    vertical(ctx, head, x, top + len / 2, s);
    const ds = Math.max(s * 0.34, ppm * 1.8);
    setFont(ctx, 400, ds, KAI);
    const dlen = Math.min(verticalLength(ctx, detail, ds), maxH * 0.62);
    if (dlen < verticalLength(ctx, detail, ds)) setFont(ctx, 400, (ds * dlen) / verticalLength(ctx, detail, ds), KAI);
    ctx.fillStyle = P("ink");
    vertical(ctx, detail, x - s * 0.95, top + s * 0.4 + dlen / 2, ds);
    const ss = Math.min(s * 1.05, maxH - len - s * 0.5);
    if (ss > ppm * 4) drawSealMark(ctx, sealText(a), x, top + len + s * 0.25 + ss / 2, ss, P(sealRole(P)), "bai");
    s = 0;
  };
  if (W <= H * 1.15) {
    const top = H * 0.17;
    const foot = Math.max(H * 0.1, hasNet ? ns * 2 : 0);
    ctx.fillStyle = key;
    ctx.fillRect(0, 0, W, top);
    ctx.fillRect(0, H - foot, W, foot);
    // 惊燕: two pale strips hanging from the top
    ctx.fillStyle = ground;
    ctx.globalAlpha = 0.72;
    const sw = Math.max(2, W * 0.028);
    ctx.fillRect(W * 0.38 - sw / 2, 0, sw, top);
    ctx.fillRect(W * 0.62 - sw / 2, 0, sw, top);
    ctx.globalAlpha = 1;
    // 隔水 rules
    ctx.fillStyle = P("accent", true);
    ctx.fillRect(0, top, W, rule);
    ctx.fillRect(0, H - foot - rule, W, rule);
    // the painting
    const px = W * 0.1;
    const py = top + H * 0.05;
    const pw = W * 0.8;
    const ph = H - foot - H * 0.04 - py;
    ctx.fillStyle = ground;
    ctx.fillRect(px, py, pw, ph);
    drawHills(ctx, px, py + ph * 0.42, pw, ph * 0.58, P(hillRole(P)), "hills" + head);
    ctx.strokeStyle = P("ink");
    ctx.globalAlpha = 0.35;
    ctx.lineWidth = Math.max(1, m * 0.003);
    ctx.strokeRect(px, py, pw, ph);
    ctx.globalAlpha = 1;
    inscribe(px + pw - pw * 0.13, py + ph * 0.07, ph * 0.86, pw * 0.42);
    if (a.info?.logo) drawLogo(ctx, a.info.logo, W / 2, top * 0.2, W * 0.5, top * 0.6, "center");
    if (hasNet) drawNetAt(ctx, a, ns, px, H - foot / 2 + ns * 0.36, "left", P(textOn(P, "key", "ground", "ink")), W - 2 * px);
    return;
  }
  // handscroll: rolled ends, the title section on the right, the hills to its left
  const end = Math.max(W * 0.035, m * 0.06);
  ctx.fillStyle = key;
  ctx.fillRect(0, 0, end, H);
  ctx.fillRect(W - end, 0, end, H);
  const band = H * 0.1;
  const tx = W * 0.64;
  const px = end + W * 0.03;
  const py = band;
  const ph = H - 2 * band;
  ctx.fillStyle = ground;
  ctx.fillRect(px, py, tx - px - W * 0.02, ph);
  ctx.fillStyle = mixHex(P("ground"), P("key"), 0.07);
  ctx.fillRect(tx, py, W - end - W * 0.02 - tx, ph);
  ctx.fillStyle = P("accent", true);
  ctx.fillRect(tx - W * 0.01 - rule, py, rule, ph);
  ctx.fillRect(0, py - rule, W, rule);
  ctx.fillRect(0, py + ph, W, rule);
  drawHills(ctx, px, py + ph * 0.35, tx - px - W * 0.02, ph * 0.65, P(hillRole(P)), "hills" + head);
  const tw = W - end - W * 0.02 - tx;
  inscribe(tx + tw * 0.62, py + ph * 0.1, ph * 0.84, tw);
  if (a.info?.logo) drawLogo(ctx, a.info.logo, px + W * 0.02, py + ph * 0.06, (tx - px) * 0.4, ph * 0.16);
  if (hasNet) drawNetAt(ctx, a, ns, px + W * 0.02, py + ns * 1.4, "left", P("ink"), (tx - px) * 0.6);
}

/**
 * 印: one large carved seal of the brand, as if just pressed on, with the name set heavy in Song
 * type opposite it. Portrait: seal high on the right, name low on the left. Landscape: seal on
 * the left, name to its right.
 */
function drawSealFront(ctx: Ctx, W: number, H: number, a: ArtInput, P: Paint, ppm: number) {
  const { d } = a;
  const m = Math.min(W, H);
  const head = d.mockup.headline;
  const detail = d.mockup.detail;
  const seal = P(sealRole(P), true);
  const ns = netSize(m, ppm);
  const portrait = W <= H * 1.15;
  const S = portrait ? Math.min(W * 0.5, H * 0.42) : Math.min(H * 0.62, W * 0.36);
  const sx = portrait ? W - m * 0.09 - S / 2 : m * 0.1 + S / 2;
  const sy = portrait ? m * 0.09 + S / 2 : H / 2;
  // the paste's halo: a faint second impression offset a hair, as a hand-pressed seal leaves
  ctx.globalAlpha = 0.12;
  drawSealMark(ctx, sealText(a), sx + S * 0.012, sy + S * 0.01, S, seal, "bai", 0.02);
  ctx.globalAlpha = 1;
  drawSealMark(ctx, sealText(a), sx, sy, S, seal, "bai");
  const x = portrait ? m * 0.085 : m * 0.1 + S + m * 0.1;
  const room = portrait ? W - x * 2 : W - x - m * 0.08;
  setFont(ctx, 900, m * 0.2, SERIF);
  const lines = wrap(ctx, head, room, 2);
  const s = fit(ctx, lines.reduce((p, q) => (p.length > q.length ? p : q), ""), 900, portrait ? m * 0.2 : m * 0.26, SERIF, room);
  const ds = fit(ctx, detail, 600, m * 0.058, SANS, room, 0.1);
  spacing(ctx, 0, 0);
  const block = lines.length * s * 1.08 + ds * 2.2;
  let y = portrait ? Math.max(sy + S / 2 + m * 0.12, H - m * 0.12 - ns * 1.6 - block) : H / 2 - block / 2;
  setFont(ctx, 900, s, SERIF);
  ctx.fillStyle = P("ink", true);
  let hd = 0;
  for (const l of lines) {
    y += s * 1.02;
    ctx.fillText(l, x, y);
    hd = descentOf(ctx, l);
  }
  ctx.fillStyle = P("ink");
  fit(ctx, detail, 600, ds, SANS, room, 0.1);
  ctx.fillText(detail, x, y + Math.max(hd + ds * 1.2, ds * 1.9));
  spacing(ctx, 0, 0);
  // a hairline from the name toward the seal: the inscription and its seal belong together
  ctx.fillStyle = P("key");
  ctx.globalAlpha = 0.5;
  if (portrait) ctx.fillRect(x, y + Math.max(hd + ds * 1.2, ds * 1.9) + ds * 0.9, Math.min(room * 0.3, m * 0.18), Math.max(1, m * 0.004));
  ctx.globalAlpha = 1;
  if (a.info?.net.trim()) drawNetAt(ctx, a, ns, W - m * 0.085, H - m * 0.07, "right", P("ink"), W * 0.5);
  if (a.info?.logo) drawLogo(ctx, a.info.logo, x, m * 0.07, portrait ? W - S - x - m * 0.2 : room * 0.5, m * 0.1);
}

/**
 * 对称: a cover built on its centre line, like a Song-printed book: a thick-and-thin frame with
 * key-fret corners, the brand small at the head, the name on a title slip (题签) down the axis,
 * the detail beneath it, and a small seal on the axis. Landscape panels set the name across the
 * axis between two rules.
 */
function drawSymmetricFront(ctx: Ctx, W: number, H: number, a: ArtInput, P: Paint, ppm: number) {
  const { d, brand } = a;
  const m = Math.min(W, H);
  const head = d.mockup.headline;
  const detail = d.mockup.detail;
  const key = P("key", true);
  const cx = W / 2;
  const o = m * 0.045;
  const thick = Math.max(1.5, m * 0.012);
  const thin = Math.max(1, m * 0.004);
  const gap = m * 0.014;
  doubleFrame(ctx, o, o, W - 2 * o, H - 2 * o, thick, thin, gap, key);
  const io = o + thick + gap + thin;
  const fs = m * 0.075;
  const fl = Math.max(1, m * 0.006);
  const fi = io + m * 0.025;
  fretCorner(ctx, fi, fi, fs, 1, 1, key, fl);
  fretCorner(ctx, W - fi, fi, fs, -1, 1, key, fl);
  fretCorner(ctx, fi, H - fi, fs, 1, -1, key, fl);
  fretCorner(ctx, W - fi, H - fi, fs, -1, -1, key, fl);
  const room = W - 2 * (fi + fs + m * 0.02);
  const ns = netSize(m, ppm);
  const hasNet = !!a.info?.net.trim();
  const bottom = H - io - m * 0.05 - (hasNet ? ns * 1.4 : 0);
  ctx.textAlign = "center";
  let top = io + m * 0.06;
  if (a.info?.logo) top += drawLogo(ctx, a.info.logo, cx, top, room * 0.6, m * 0.09, "center") + m * 0.04;
  else if (brand && brand !== head) {
    ctx.fillStyle = P("ink", true);
    const bs = fit(ctx, brand, 600, m * 0.05, SANS, room, 0.35);
    ctx.fillText(brand, cx, top + bs);
    spacing(ctx, 0, 0);
    top += bs * 1.9;
  }
  const portrait = H >= W * 1.05;
  const ds0 = m * 0.05;
  const ss = m * 0.11;
  if (portrait) {
    // the title slip
    const n = Math.max(1, vTokens(head).length);
    const availH = bottom - top - ds0 * 2.6 - ss * 1.3;
    let s = Math.min(m * 0.13, (availH * 0.84) / (n * 1.3));
    setFont(ctx, 700, s, SERIF);
    let len = verticalLength(ctx, head, s);
    if (len > availH * 0.84) {
      s *= (availH * 0.84) / len;
      setFont(ctx, 700, s, SERIF);
      len = verticalLength(ctx, head, s);
    }
    const sw = s * 1.9;
    const sh = len + s * 1.1;
    const sy = top + (availH - sh) * 0.3;
    ctx.fillStyle = P("key");
    ctx.fillRect(cx - sw / 2, sy, sw, sh);
    ctx.strokeStyle = P(textOn(P, "key", "ground", "ink"));
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = Math.max(1, m * 0.003);
    ctx.strokeRect(cx - sw / 2 + s * 0.16, sy + s * 0.16, sw - s * 0.32, sh - s * 0.32);
    ctx.globalAlpha = 1;
    ctx.fillStyle = P(textOn(P, "key", "ground", "ink"), true);
    vertical(ctx, head, cx, sy + sh / 2, s);
    let y = sy + sh + ds0 * 1.6;
    ctx.textAlign = "center";
    ctx.fillStyle = P("ink");
    fit(ctx, detail, 600, ds0, SANS, room, 0.18);
    ctx.fillText(detail, cx, y);
    spacing(ctx, 0, 0);
    y += ds0 * 0.8 + ss * 0.62;
    if (y + ss / 2 < bottom) drawSealMark(ctx, sealText(a), cx, y, ss, P(sealRole(P)), "zhu", 0);
  } else {
    const s = fit(ctx, head, 700, Math.min(m * 0.26, (bottom - top) * 0.36), SERIF, room * 0.66, 0.08);
    const hy = top + (bottom - top) * 0.42 + s * 0.35;
    ctx.fillStyle = P("ink", true);
    ctx.fillText(head, cx, hy);
    const hw = ctx.measureText(head).width;
    spacing(ctx, 0, 0);
    // rules either side of the name, each ending in a small lozenge
    const ry = hy - s * 0.36;
    const r0 = fi + fs + m * 0.02;
    const r1 = cx - hw / 2 - s * 0.35;
    ctx.fillStyle = key;
    if (r1 - r0 > m * 0.08) {
      for (const side of [-1, 1]) {
        const a0 = side < 0 ? r0 : W - r1;
        const a1 = side < 0 ? r1 : W - r0;
        ctx.fillRect(a0, ry - thin / 2, a1 - a0, thin);
        const lx = side < 0 ? r1 : W - r1;
        const z = m * 0.016;
        ctx.beginPath();
        ctx.moveTo(lx, ry - z);
        ctx.lineTo(lx + z, ry);
        ctx.lineTo(lx, ry + z);
        ctx.lineTo(lx - z, ry);
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.textAlign = "center";
    ctx.fillStyle = P("ink");
    const ds = fit(ctx, detail, 600, ds0, SANS, room, 0.18);
    ctx.fillText(detail, cx, hy + Math.max(descentOf(ctx, head), s * 0.12) + ds * 1.7);
    spacing(ctx, 0, 0);
    const sy2 = hy + s * 0.12 + ds * 2.6 + ss * 0.6;
    if (sy2 + ss / 2 < bottom) drawSealMark(ctx, sealText(a), cx, sy2, ss, P(sealRole(P)), "zhu", 0);
  }
  ctx.textAlign = "left";
  if (hasNet) drawNetAt(ctx, a, ns, cx, H - io - m * 0.045, "center", P("ink"), room);
}

/* ---------------------------------------------------------------- Other panels */

/** An EAN-13 in a white box with its digits, at x, y (top-left of the bars) in pixels. */
export function drawBarcode(ctx: Ctx, digits: string, x: number, y: number, w: number, h: number) {
  const mods = ean13Modules(digits);
  // nominal 37.29 mm box = 11 + 95 + 7 modules wide; bars 22.85 of 25.93 mm high
  const mw = w / 113;
  const barsH = h * 0.86;
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = "#000000";
  const x0 = x + 11 * mw;
  for (let i = 0; i < 95; i++) if (mods[i] === "1") ctx.fillRect(x0 + i * mw, y + h * 0.03, mw + 0.15, isGuard(i) ? barsH + h * 0.05 : barsH - h * 0.03);
  const ds = h * 0.11;
  ctx.font = `500 ${ds.toFixed(1)}px "OCR-B", "Helvetica Neue", Arial, sans-serif`;
  ctx.textAlign = "center";
  const ty = y + h * 0.03 + barsH + ds * 0.95;
  ctx.fillText(digits[0], x + 6 * mw, ty);
  for (let i = 0; i < 6; i++) ctx.fillText(digits[1 + i], x0 + (3 + 7 * i + 3.5) * mw, ty);
  for (let i = 0; i < 6; i++) ctx.fillText(digits[7 + i], x0 + (50 + 7 * i + 3.5) * mw, ty);
  ctx.textAlign = "left";
}

/** The information panel from a finished artwork: brand, paragraph, label table, barcode. */
function drawInfo(ctx: Ctx, W: number, H: number, a: ArtInput, P: Paint, ppm: number) {
  const info = a.info!;
  const wMm = W / ppm;
  const hMm = H / ppm;
  const lay = layoutBack(wMm, hMm, { brand: a.brand, intro: info.intro, rows: info.rows, barcode: !!info.barcode });
  ctx.fillStyle = P("ground");
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = P("ink");
  ctx.lineWidth = Math.max(1, 0.15 * ppm);
  ctx.globalAlpha = 0.45;
  for (const r of lay.rules) {
    ctx.beginPath();
    ctx.moveTo(r.x0 * ppm, r.y * ppm);
    ctx.lineTo(r.x1 * ppm, r.y * ppm);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = P("ink");
  for (const l of lay.lines) {
    setFont(ctx, l.bold ? 700 : 400, l.size * ppm, SANS);
    ctx.fillText(l.text, l.x * ppm, l.y * ppm, l.maxW * ppm);
  }
  if (lay.barcode && info.barcode) drawBarcode(ctx, info.barcode, lay.barcode.x * ppm, lay.barcode.y * ppm, lay.barcode.w * ppm, lay.barcode.h * ppm);
  // key accent rule, bottom right
  const m = Math.min(W, H);
  ctx.fillStyle = P("key");
  ctx.fillRect(W - lay.pad * ppm - m * 0.18, H - lay.pad * ppm - m * 0.012, m * 0.18, Math.max(2, m * 0.012));
}

/** Back panel: copy blocks, an info table, a barcode. Placeholder copy, laid out like print. */
function drawBack(ctx: Ctx, W: number, H: number, a: ArtInput, P: Paint, ppm = 0) {
  if (a.info && ppm > 0) return drawInfo(ctx, W, H, a, P, ppm);
  const m = Math.min(W, H);
  const pad = m * 0.1;
  ctx.fillStyle = P("ground");
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = P("ink");
  fit(ctx, a.brand || a.d.mockup.headline, 700, m * 0.06, SANS, W - pad * 2, 0.12);
  ctx.fillText(a.brand || a.d.mockup.headline, pad, pad + m * 0.05);
  spacing(ctx, 0, 0);
  // text lines
  ctx.globalAlpha = 0.5;
  const lh = m * 0.034;
  let y = pad + m * 0.12;
  for (let i = 0; i < 7; i++) {
    const len = i === 6 ? 0.55 : 0.82 + ((i * 37) % 13) / 100;
    ctx.fillRect(pad, y, (W - pad * 2) * Math.min(1, len), Math.max(1, lh * 0.28));
    y += lh;
  }
  ctx.globalAlpha = 1;
  // info table
  y += lh * 0.8;
  const th = Math.min(H * 0.26, m * 0.42);
  ctx.strokeStyle = P("ink");
  ctx.lineWidth = Math.max(1, m * 0.004);
  ctx.strokeRect(pad, y, W - pad * 2, th);
  const rows = 5;
  for (let i = 1; i < rows; i++) {
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.moveTo(pad, y + (th / rows) * i);
    ctx.lineTo(W - pad, y + (th / rows) * i);
    ctx.stroke();
    ctx.globalAlpha = 0.45;
    ctx.fillRect(pad + m * 0.03, y + (th / rows) * (i - 0.5) - lh * 0.12, (W - pad * 2) * 0.28, Math.max(1, lh * 0.26));
    ctx.fillRect(pad + (W - pad * 2) * 0.52, y + (th / rows) * (i - 0.5) - lh * 0.12, (W - pad * 2) * 0.34, Math.max(1, lh * 0.26));
  }
  ctx.globalAlpha = 1;
  // barcode
  const bwid = Math.min(W * 0.42, m * 0.5);
  const bh = bwid * 0.5;
  const bx = pad;
  const by = H - pad - bh;
  ctx.fillStyle = "#ffffff";
  if (P("ground") !== "#000000") ctx.fillRect(bx - m * 0.015, by - m * 0.015, bwid + m * 0.03, bh + m * 0.06);
  ctx.fillStyle = P("ink");
  let x = bx;
  let seed = 7;
  while (x < bx + bwid) {
    seed = (seed * 9301 + 49297) % 233280;
    const wv = (1 + (seed % 3)) * bwid * 0.009;
    if ((seed >> 3) % 2 === 0) ctx.fillRect(x, by, wv, bh * 0.82);
    x += wv + bwid * 0.009;
  }
  setFont(ctx, 500, bh * 0.15, SANS);
  ctx.fillText("6 901234 567892", bx, by + bh * 1.02);
  // key accent rule
  ctx.fillStyle = P("key");
  ctx.fillRect(W - pad - m * 0.18, H - pad - m * 0.012, m * 0.18, Math.max(2, m * 0.012));
}

function drawSide(ctx: Ctx, W: number, H: number, a: ArtInput, P: Paint, variant: "left" | "right") {
  const { d, brand } = a;
  if (isSong(d.layout)) return drawSongSide(ctx, W, H, a, P, variant);
  const keyed = variant === "left" && d.layout !== "offset";
  ctx.fillStyle = P(keyed ? "key" : "ground");
  ctx.fillRect(0, 0, W, H);
  if (variant === "right" && d.layout !== "offset") {
    ctx.fillStyle = P("key");
    ctx.fillRect(0, 0, W, H * 0.16);
  }
  const text = variant === "left" ? brand || d.mockup.headline : d.mockup.detail;
  // a column no wider than a fifth of the panel and no longer than 62% of its height
  let size = Math.min(W * 0.2, (H * 0.6) / Math.max(2, Array.from(text).length * 1.3));
  setFont(ctx, 700, size, SANS);
  const len = verticalLength(ctx, text, size);
  if (len > H * 0.62) {
    size *= (H * 0.62) / len;
    setFont(ctx, 700, size, SANS);
  }
  ctx.fillStyle = keyed ? P(textOn(P, "key", "ground", "ink"), true) : P("ink", true);
  vertical(ctx, text, W / 2, H * 0.52, size);
}

/**
 * A side panel in a Song layout: the scroll keeps its mount bands (天头, 地头), the symmetric
 * cover its thin double frame; the brand or detail runs down the middle, and the brand side
 * carries a small seal beneath it.
 */
function drawSongSide(ctx: Ctx, W: number, H: number, a: ArtInput, P: Paint, variant: "left" | "right") {
  const { d, brand } = a;
  const m = Math.min(W, H);
  ctx.fillStyle = d.layout === "scroll" ? mixHex(P("ground"), P("key"), 0.16) : P("ground");
  ctx.fillRect(0, 0, W, H);
  let top = 0;
  let foot = 0;
  if (d.layout === "scroll") {
    top = H * 0.17;
    foot = H * 0.1;
    ctx.fillStyle = P("key");
    ctx.fillRect(0, 0, W, top);
    ctx.fillRect(0, H - foot, W, foot);
    ctx.fillStyle = P("accent", true);
    const rule = Math.max(1, m * 0.012);
    ctx.fillRect(0, top, W, rule);
    ctx.fillRect(0, H - foot - rule, W, rule);
  } else if (d.layout === "symmetric") {
    const o = m * 0.1;
    doubleFrame(ctx, o, o, W - 2 * o, H - 2 * o, Math.max(1.2, m * 0.025), Math.max(1, m * 0.008), m * 0.03, P("key", true));
  }
  const text = variant === "left" ? brand || d.mockup.headline : d.mockup.detail;
  const seal = variant === "left" && W > 4;
  const room = H - top - foot;
  let size = Math.min(W * 0.22, (room * 0.58) / Math.max(2, Array.from(text).length * 1.3));
  setFont(ctx, d.layout === "scroll" ? 400 : 700, size, d.layout === "scroll" ? KAI : d.layout === "symmetric" ? SERIF : SANS);
  const len = verticalLength(ctx, text, size);
  const maxLen = room * (seal ? 0.56 : 0.66);
  if (len > maxLen) {
    size *= maxLen / len;
    setFont(ctx, d.layout === "scroll" ? 400 : 700, size, d.layout === "scroll" ? KAI : d.layout === "symmetric" ? SERIF : SANS);
  }
  const L = verticalLength(ctx, text, size);
  const ss = Math.min(W * 0.34, size * 1.5);
  const block = L + (seal ? ss * 1.25 : 0);
  const y0 = top + (room - block) / 2;
  ctx.fillStyle = P("ink", true);
  vertical(ctx, text, W / 2, y0 + L / 2, size);
  if (seal) drawSealMark(ctx, sealText(a), W / 2, y0 + L + ss * 0.25 + ss / 2, ss, P(sealRole(P)), d.layout === "symmetric" ? "zhu" : "bai", 0);
}

function drawTop(ctx: Ctx, W: number, H: number, a: ArtInput, P: Paint) {
  const m = Math.min(W, H);
  ctx.fillStyle = P("ground");
  ctx.fillRect(0, 0, W, H);
  if (a.d.layout === "seal") {
    // the top of the box is the seal's impression
    drawSealMark(ctx, sealText(a), W / 2, H / 2, Math.min(m * 0.62, W * 0.5), P(sealRole(P), true), "bai");
    return;
  }
  if (a.d.layout === "symmetric" || a.d.layout === "scroll") {
    const o = m * 0.06;
    if (a.d.layout === "symmetric") doubleFrame(ctx, o, o, W - 2 * o, H - 2 * o, Math.max(1.2, m * 0.016), Math.max(1, m * 0.005), m * 0.02, P("key", true));
    else {
      // the rolled scroll seen from above: the key colour at both ends
      ctx.fillStyle = P("key");
      ctx.fillRect(0, 0, m * 0.1, H);
      ctx.fillRect(W - m * 0.1, 0, m * 0.1, H);
    }
    const t = a.brand || a.d.mockup.headline;
    ctx.fillStyle = P("ink", true);
    const s = fit(ctx, t, a.d.layout === "scroll" ? 400 : 700, m * 0.24, a.d.layout === "scroll" ? KAI : SERIF, W * 0.5, 0.3);
    ctx.textAlign = "center";
    ctx.fillText(t, W / 2 - s * 0.45, H / 2 + s * 0.35);
    const tw = ctx.measureText(t).width;
    ctx.textAlign = "left";
    spacing(ctx, 0, 0);
    drawSealMark(ctx, sealText(a), W / 2 - s * 0.45 + tw / 2 + s * 0.85, H / 2, s * 0.8, P(sealRole(P)), a.d.layout === "symmetric" ? "zhu" : "bai", 0);
    return;
  }
  ctx.fillStyle = P("key");
  ctx.fillRect(0, H - m * 0.06, W, m * 0.06);
  ctx.fillStyle = P("ink", true);
  const t = a.brand || a.d.mockup.headline;
  const s = fit(ctx, t, 700, m * 0.3, SANS, W * 0.6, 0.2);
  ctx.textAlign = "center";
  ctx.fillText(t, W / 2, H / 2 + s * 0.35);
  ctx.textAlign = "left";
  spacing(ctx, 0, 0);
}

function drawPlain(ctx: Ctx, W: number, H: number, role: Role, P: Paint) {
  ctx.fillStyle = P(role);
  ctx.fillRect(0, 0, W, H);
}

/**
 * A printed band in the key colour: a gift box's lid wall, a book box's flap, a drawer's front, a
 * paper tube's lid. On a thin band the brand sits left and the detail right, on one line, when
 * both fit; otherwise, and on a tall panel, they stack centred. `arc` (degrees) is how far the
 * band wraps: a band all the way round a lid keeps its words on the part facing the viewer.
 */
function drawBand(ctx: Ctx, W: number, H: number, a: ArtInput, P: Paint, withText: boolean, arc = 0) {
  ctx.fillStyle = P("key");
  ctx.fillRect(0, 0, W, H);
  if (!withText) return;
  const brand = a.brand || a.d.mockup.headline;
  const detail = a.d.mockup.detail.trim() === brand.trim() ? "" : a.d.mockup.detail;
  const span = arc > 100 ? W * Math.min(1, 100 / arc) : W;
  const x0 = (W - span) / 2;
  const cx = W / 2;
  const pad = Math.min(H * 0.45, span * 0.06);
  const room = span - 2 * pad;
  ctx.fillStyle = P(textOn(P, "key", "ground", "ink"), true);
  const tall = H > span * 0.28;
  if (!tall) {
    const s = Math.min(H * 0.3, span * 0.05);
    const by = H / 2 + s * 0.36;
    setFont(ctx, 700, s, SANS);
    spacing(ctx, 0.22, s);
    const bw = ctx.measureText(brand).width;
    const dw = detail ? ctx.measureText(detail).width : 0;
    const gap = s * 2;
    if (bw + (detail ? gap + dw : 0) <= room) {
      if (arc > 100) {
        // centred as one line on the front of a round lid
        const x = cx - (bw + (detail ? gap + dw : 0)) / 2;
        ctx.fillText(brand, x, by);
        if (detail) ctx.fillText(detail, x + bw + gap, by);
      } else {
        ctx.fillText(brand, x0 + pad, by);
        if (detail) {
          ctx.textAlign = "right";
          ctx.fillText(detail, x0 + span - pad, by);
          ctx.textAlign = "left";
        }
      }
      spacing(ctx, 0, 0);
      return;
    }
    if (H < s * 3.4) {
      // no room for two lines: the brand alone, centred
      ctx.textAlign = "center";
      fit(ctx, brand, 700, s, SANS, room, 0.22);
      ctx.fillText(brand, cx, by);
      ctx.textAlign = "left";
      spacing(ctx, 0, 0);
      return;
    }
  }
  // stacked and centred: brand, then the detail smaller beneath
  ctx.textAlign = "center";
  const bs = fit(ctx, brand, 700, Math.min(H * (tall ? 0.16 : 0.3), span * (tall ? 0.1 : 0.05)), SANS, room, 0.22);
  const bd = descentOf(ctx, brand);
  let ds = 0;
  const total = () => bs + (detail ? Math.max(bd, bs * 0.1) + ds * 1.6 : 0);
  if (detail) {
    fit(ctx, detail, 600, bs * 0.46, SANS, room, 0.12);
    ds = parseFloat(ctx.font.match(/([\d.]+)px/)?.[1] ?? "0");
  }
  const by = H / 2 - total() / 2 + bs * 0.86;
  fit(ctx, brand, 700, bs, SANS, room, 0.22);
  ctx.fillText(brand, cx, by);
  if (detail) {
    fit(ctx, detail, 600, ds, SANS, room, 0.12);
    ctx.fillText(detail, cx, by + Math.max(bd, bs * 0.1) + ds * 1.25);
  }
  ctx.textAlign = "left";
  spacing(ctx, 0, 0);
}

/** A round tin's printed body, wrapping all the way round; front centred. */
function drawTinWrap(ctx: Ctx, W: number, H: number, a: ArtInput, P: Paint, ppm = 0) {
  ctx.fillStyle = P("ground");
  ctx.fillRect(0, 0, W, H);
  const fw = W * WRAP_FRONT;
  const sideW = W / 2 - fw;
  const section = (x0: number, w: number, draw: (c: Ctx, w: number, h: number) => void) => {
    ctx.save();
    ctx.translate(x0, 0);
    ctx.beginPath();
    ctx.rect(0, 0, w, H);
    ctx.clip();
    draw(ctx, w, H);
    ctx.restore();
  };
  section(W / 2 - fw / 2, fw, (c, w, h) => drawFront(c, w, h, a, P, ppm));
  section(W / 2 + fw / 2, sideW, (c, w, h) => drawSide(c, w, h, a, P, "right"));
  section(W / 2 - fw / 2 - sideW, sideW, (c, w, h) => drawSide(c, w, h, a, P, "left"));
  section(0, fw / 2, (c, w, h) => {
    c.translate(-fw / 2, 0);
    drawBack(c, fw, h, a, P, ppm);
  });
  section(W - fw / 2, fw / 2, (c, w, h) => drawBack(c, fw, h, a, P, ppm));
}

/** Printed top of a tin lid (square texture mapped onto a disc). */
function drawTinCap(ctx: Ctx, S: number, a: ArtInput, P: Paint) {
  const c = S / 2;
  if (isSong(a.d.layout)) {
    // the lid as a seal: ground, a fine ring in the key colour, the seal in the middle
    ctx.fillStyle = P("ground");
    ctx.fillRect(0, 0, S, S);
    ctx.strokeStyle = P("key", true);
    ctx.lineWidth = S * 0.008;
    ctx.beginPath();
    ctx.arc(c, c, S * 0.42, 0, Math.PI * 2);
    ctx.stroke();
    drawSealMark(ctx, sealText(a), c, c, S * 0.42, P(sealRole(P), a.d.layout === "seal"), a.d.layout === "symmetric" ? "zhu" : "bai", 0);
    return;
  }
  ctx.fillStyle = P("key");
  ctx.fillRect(0, 0, S, S);
  ctx.strokeStyle = P("ground", true);
  ctx.lineWidth = S * 0.006;
  for (const r of [0.44, 0.405]) {
    ctx.globalAlpha = foiled(a) ? 1 : 0.55;
    ctx.beginPath();
    ctx.arc(c, c, S * r, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = P(textOn(P, "key", "ground", "ink"), true);
  const t = a.brand || a.d.mockup.headline;
  const s = fit(ctx, t, 700, S * 0.17, SERIF, S * 0.6);
  ctx.textAlign = "center";
  ctx.fillText(t, c, c + s * 0.3);
  // inside the inner ring at that height
  fit(ctx, a.d.mockup.detail, 600, S * 0.042, SANS, S * 0.62, 0.3);
  ctx.fillText(a.d.mockup.detail, c, c + s * 0.3 + S * 0.09);
  spacing(ctx, 0, 0);
  ctx.textAlign = "left";
}

/** Foil seal under a tin lid: brand embossed. Neutral grey, used as color and bump. */
export function drawSeal(S: number, a: ArtInput): HTMLCanvasElement {
  const [c, ctx] = canvas(S, S);
  ctx.fillStyle = "#c9cbc8";
  ctx.fillRect(0, 0, S, S);
  ctx.fillStyle = "#a9aba8";
  const t = a.brand || a.d.mockup.headline;
  const s = fit(ctx, t, 700, S * 0.12, SERIF, S * 0.5);
  ctx.textAlign = "center";
  ctx.fillText(t, S / 2, S / 2 + s * 0.3);
  return c;
}

function drawInnerCard(ctx: Ctx, W: number, H: number, a: ArtInput, P: Paint) {
  const m = Math.min(W, H);
  ctx.fillStyle = P("ground");
  ctx.fillRect(0, 0, W, H);
  if (a.d.layout === "stripe") {
    ctx.fillStyle = P("key");
    ctx.fillRect(0, 0, W * 0.14, H);
  } else {
    ctx.fillStyle = P("key");
    ctx.beginPath();
    ctx.moveTo(W * 0.62, 0);
    ctx.lineTo(W, 0);
    ctx.lineTo(W, H);
    ctx.lineTo(W * 0.5, H);
    ctx.fill();
  }
  const stripe = a.d.layout === "stripe";
  const x = stripe ? W * 0.2 : m * 0.12;
  ctx.fillStyle = P("ink", true);
  // clear of the key corner: it starts at 62% of the width at the top, 50% at the bottom
  fit(ctx, a.brand || a.d.mockup.headline, 700, m * 0.13, SANS, (stripe ? W - m * 0.08 : W * 0.6 - m * 0.04) - x);
  ctx.fillText(a.brand || a.d.mockup.headline, x, m * 0.26);
  fit(ctx, a.d.mockup.innerLabel, 700, m * 0.16, SANS, Math.min(W * 0.45, (stripe ? W - m * 0.08 : W * 0.5 - m * 0.04) - x));
  ctx.fillText(a.d.mockup.innerLabel, x, H - m * 0.16);
}

function drawManual(ctx: Ctx, W: number, H: number, a: ArtInput, P: Paint) {
  const m = Math.min(W, H);
  ctx.fillStyle = P("ground");
  ctx.fillRect(0, 0, W, H);
  if (a.d.layout === "stripe") {
    ctx.fillStyle = P("key");
    ctx.fillRect(0, 0, W * 0.09, H);
  }
  const x = m * 0.16;
  ctx.fillStyle = P(textOn(P, "ground", "key", "ink"), true);
  setFont(ctx, 700, m * 0.36, SERIF);
  ctx.fillText("1", x, H * 0.62);
  ctx.fillStyle = P("ink");
  fit(ctx, a.d.mockup.manualTitle, 700, m * 0.13, SANS, W - x * 1.6);
  ctx.fillText(a.d.mockup.manualTitle, x, H * 0.62 + m * 0.2);
  ctx.globalAlpha = 0.7;
  fit(ctx, a.d.mockup.manualStep, 500, m * 0.085, SANS, W - x * 1.6);
  ctx.fillText(a.d.mockup.manualStep, x, H * 0.62 + m * 0.34);
  ctx.globalAlpha = 1;
}

/* ---------------------------------------------------------------- Public */


/**
 * A drawn face: the colour print; the mask of the accent elements (white where foil, spot UV,
 * emboss or deboss go); and, for letterpress, the mask of all the type, which is what the
 * relief plate presses in.
 */
export type Art = { color: HTMLCanvasElement; foil: HTMLCanvasElement | null; press: HTMLCanvasElement | null };

/** How a face sits on the package. `arc`: degrees a label or band wraps round a curved body. */
export type FaceOpts = { arc?: number };

/** The share of a wrapped front label that faces the viewer: about 100° of the curve. */
const safeOf = (arc?: number) => (arc && arc > 100 ? Math.min(1, 100 / arc) : 1);

/** Draws one face at `wMm` × `hMm`, `ppm` pixels per millimetre. */
export function drawFace(kind: FaceKind, wMm: number, hMm: number, ppm: number, a: ArtInput, opts: FaceOpts = {}): Art {
  const W = Math.max(8, Math.round(wMm * ppm));
  const H = Math.max(8, Math.round(hMm * ppm));
  const roles = rolesOf(a.d);
  const run = (mode: "color" | "mask" | "type") => {
    const [c, ctx] = canvas(W, H);
    ctx.textBaseline = "alphabetic";
    const P = painter(roles, a, mode !== "color", mode === "type");
    if (mode === "type") {
      // every word white, everything else black: what a letterpress plate inks and presses
      const fill = ctx.fillText.bind(ctx);
      ctx.fillText = (t: string, x: number, y: number, mw?: number) => {
        const f = ctx.fillStyle;
        ctx.fillStyle = "#ffffff";
        fill(t, x, y, mw);
        ctx.fillStyle = f;
      };
    }
    switch (kind) {
      case "front":
        drawFront(ctx, W, H, a, P, ppm, safeOf(opts.arc));
        break;
      case "back":
        drawBack(ctx, W, H, a, P, ppm);
        break;
      case "left":
      case "right":
        drawSide(ctx, W, H, a, P, kind);
        break;
      case "top":
        drawTop(ctx, W, H, a, P);
        break;
      case "bottom":
        if (a.info?.on === "bottom") drawBack(ctx, W, H, a, P, ppm);
        else drawPlain(ctx, W, H, "ground", P);
        break;
      case "flap":
      case "baseSide":
        drawPlain(ctx, W, H, "ground", P);
        break;
      case "band":
        drawBand(ctx, W, H, a, P, true, opts.arc ?? 0);
        break;
      case "bandPlain":
        drawBand(ctx, W, H, a, P, false);
        break;
      case "tinWrap":
        drawTinWrap(ctx, W, H, a, P, ppm);
        break;
      case "tinCap":
        drawTinCap(ctx, W, a, P);
        break;
      case "inner":
        drawInnerCard(ctx, W, H, a, P);
        break;
      case "manual":
        drawManual(ctx, W, H, a, P);
        break;
      case "slip":
        drawSlip(ctx, W, H, a, P);
        break;
    }
    return c;
  };
  // one mask of the accent elements serves every effect (foil, spot UV, emboss, deboss)
  const fx = a.effects ?? [];
  return { color: run("color"), foil: fx.some((e) => e !== "letterpress") ? run("mask") : null, press: fx.includes("letterpress") ? run("type") : null };
}

/* ---------------------------------------------------------------- Surface textures */

let fiberCache: HTMLCanvasElement | null = null;

/** Tileable paper-fibre height map (grey = flat), used as a bump map for board and paper. */
export function fiberTexture(): HTMLCanvasElement {
  if (fiberCache) return fiberCache;
  const S = 512;
  const [c, ctx] = canvas(S, S);
  ctx.fillStyle = "#808080";
  ctx.fillRect(0, 0, S, S);
  let seed = 1234567;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  // fibres: short curved strokes, drawn wrapped so the tile repeats seamlessly
  for (let i = 0; i < 2600; i++) {
    const x = rnd() * S;
    const y = rnd() * S;
    const len = 6 + rnd() * 22;
    const ang = rnd() * Math.PI * 2;
    const light = rnd() > 0.5;
    ctx.strokeStyle = light ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.10)";
    ctx.lineWidth = 0.6 + rnd() * 1.1;
    for (const ox of [-S, 0, S])
      for (const oy of [-S, 0, S]) {
        const sx = x + ox;
        const sy = y + oy;
        if (sx < -40 || sx > S + 40 || sy < -40 || sy > S + 40) continue;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.quadraticCurveTo(sx + Math.cos(ang + 0.6) * len * 0.5, sy + Math.sin(ang + 0.6) * len * 0.5, sx + Math.cos(ang) * len, sy + Math.sin(ang) * len);
        ctx.stroke();
      }
  }
  // fine speckle
  const img = ctx.getImageData(0, 0, S, S);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (rnd() - 0.5) * 18;
    img.data[i] += n;
    img.data[i + 1] += n;
    img.data[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
  fiberCache = c;
  return c;
}

/** Combined roughness (G) / metalness (B) map from a foil mask. */
export function foilRoughMetal(mask: HTMLCanvasElement, paperRough: number, foilRough: number): HTMLCanvasElement {
  const [c, ctx] = canvas(mask.width, mask.height);
  ctx.drawImage(mask, 0, 0);
  const img = ctx.getImageData(0, 0, c.width, c.height);
  const pr = Math.round(paperRough * 255);
  const fr = Math.round(foilRough * 255);
  // stamped foil is not a mirror: the paper's tooth and the die leave a fine, even grain
  let seed = 7;
  const grain = () => ((seed = (seed * 16807) % 2147483647) / 2147483647 - 0.5) * 22;
  for (let i = 0; i < img.data.length; i += 4) {
    const k = img.data[i] / 255;
    img.data[i] = 255;
    img.data[i + 1] = Math.max(0, Math.min(255, Math.round(pr + (fr - pr) * k + (k > 0.5 ? grain() : 0))));
    img.data[i + 2] = Math.round(255 * k);
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

let normalCache: HTMLCanvasElement | null = null;

/** Tangent-space normal map of the paper fibres (both renderers support normal maps). */
export function fiberNormal(strength = 1.4): HTMLCanvasElement {
  if (normalCache) return normalCache;
  const src = fiberTexture();
  const S = src.width;
  // Height from the fibres with the per-pixel speckle blurred out: speckle in a normal map
  // reads as grain, real board does not.
  const [bc, bctx] = canvas(S, S);
  bctx.filter = "blur(1.2px)";
  for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) bctx.drawImage(src, ox, oy);
  const h = bctx.getImageData(0, 0, S, S).data;
  const [c, ctx] = canvas(S, S);
  const out = ctx.createImageData(S, S);
  const at = (x: number, y: number) => h[(((y + S) % S) * S + ((x + S) % S)) * 4] / 255;
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength;
      const dy = (at(x, y + 1) - at(x, y - 1)) * strength;
      const l = Math.hypot(dx, dy, 1);
      const o = (y * S + x) * 4;
      out.data[o] = Math.round(((-dx / l) * 0.5 + 0.5) * 255);
      out.data[o + 1] = Math.round(((dy / l) * 0.5 + 0.5) * 255);
      out.data[o + 2] = Math.round(((1 / l) * 0.5 + 0.5) * 255);
      out.data[o + 3] = 255;
    }
  ctx.putImageData(out, 0, 0);
  normalCache = c;
  return c;
}
