/**
 * Print artwork for the 3D packages, drawn onto canvases at print-like resolution.
 * The same drawing runs twice: once for color, once for a foil mask (white where foil is
 * stamped), so the foil finish can become real metal in the material.
 * Layouts follow the direction's `layout` (offset / stripe / split) and palette roles.
 */
import type { Direction } from "@/lib/board/schema";
import type { Finish } from "@/lib/pack";

export type Roles = { ground: string; ink: string; key: string; accent: string };
export type Role = keyof Roles;

export const GOLD = "#D6B460";
const SERIF = '"Songti SC", "STSong", "Noto Serif CJK SC", "Source Han Serif SC", "Noto Serif CJK TC", serif';
const SANS = '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", "Source Han Sans SC", "Helvetica Neue", Arial, sans-serif';

export function rolesOf(d: Direction): Roles {
  const p = d.palette;
  const by = (r: string) => p.find((s) => s.role === r)?.hex;
  const ground = by("background") ?? p[0]?.hex ?? "#eeeeea";
  const ink = by("text") ?? p[1]?.hex ?? "#1a1a1a";
  const key = by("brand") ?? p[2]?.hex ?? ink;
  const accent = by("accent") ?? p[3]?.hex ?? key;
  return { ground, ink, key, accent };
}

/** Paints a role. In mask mode everything is black except foil-stamped elements. */
type Paint = (role: Role, foil?: boolean) => string;

type Ctx = CanvasRenderingContext2D;
export type ArtInput = { d: Direction; brand: string; finish: Finish };

function canvas(w: number, h: number): [HTMLCanvasElement, Ctx] {
  const c = document.createElement("canvas");
  c.width = Math.max(4, Math.round(w));
  c.height = Math.max(4, Math.round(h));
  return [c, c.getContext("2d")!];
}

function painter(roles: Roles, finish: Finish, mask: boolean): Paint {
  const foilOn = finish === "foil";
  return (role, foil = false) => {
    if (mask) return foilOn && foil ? "#ffffff" : "#000000";
    return foilOn && foil ? GOLD : roles[role];
  };
}

function setFont(ctx: Ctx, weight: number, size: number, family: string) {
  ctx.font = `${weight} ${Math.max(1, size).toFixed(1)}px ${family}`;
}

function spacing(ctx: Ctx, em: number, size: number) {
  // letterSpacing is widely supported in current browsers; harmless where it isn't.
  (ctx as Ctx & { letterSpacing?: string }).letterSpacing = `${(em * size).toFixed(1)}px`;
}

/** Shrinks the font until `text` fits `maxW`. Returns the size used. */
function fit(ctx: Ctx, text: string, weight: number, size: number, family: string, maxW: number): number {
  let s = size;
  setFont(ctx, weight, s, family);
  while (s > 6 && ctx.measureText(text).width > maxW) {
    s *= 0.94;
    setFont(ctx, weight, s, family);
  }
  return s;
}

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

/** Vertical CJK text, one character per line, centred on x. */
function vertical(ctx: Ctx, text: string, x: number, yMid: number, size: number, gap = 0.28) {
  const chars = Array.from(text).filter((c) => c.trim());
  const step = size * (1 + gap);
  let y = yMid - (chars.length * step) / 2 + size * 0.88;
  ctx.textAlign = "center";
  for (const c of chars) {
    ctx.fillText(c, x, y);
    y += step;
  }
  ctx.textAlign = "left";
}

/* ---------------------------------------------------------------- Front panels */

/** The main face. Works for portrait and landscape panels. */
function drawFront(ctx: Ctx, W: number, H: number, a: ArtInput, P: Paint) {
  const { d, brand } = a;
  const m = Math.min(W, H);
  const head = d.mockup.headline;
  const detail = d.mockup.detail;
  const showBrand = !!brand && brand !== head;
  ctx.fillStyle = P("ground");
  ctx.fillRect(0, 0, W, H);

  if (d.layout === "stripe") {
    const bw = W * 0.24;
    ctx.fillStyle = P("key");
    ctx.fillRect(0, 0, bw, H);
    // fine contour lines inside the band
    ctx.strokeStyle = P("ground", true);
    ctx.globalAlpha = a.finish === "foil" ? 0.95 : 0.32;
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
    if (showBrand) {
      ctx.fillStyle = P("ink", true);
      setFont(ctx, 700, m * 0.058, SANS);
      spacing(ctx, 0.12, m * 0.058);
      ctx.fillText(brand, x, m * 0.13);
      spacing(ctx, 0, 0);
    }
    const s = fit(ctx, head, 800, m * 0.205, SANS, W - x - m * 0.07);
    ctx.fillStyle = P("ink", true);
    ctx.fillText(head, x, H - m * 0.2);
    ctx.fillStyle = P("ink");
    setFont(ctx, 600, m * 0.064, SANS);
    spacing(ctx, 0.06, m * 0.064);
    ctx.fillText(detail, x, H - m * 0.2 + s * 0.2 + m * 0.085);
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
    if (showBrand) {
      ctx.fillStyle = P("ink", true);
      setFont(ctx, 700, m * 0.055, SANS);
      spacing(ctx, 0.14, m * 0.055);
      ctx.fillText(brand, m * 0.07, m * 0.12);
      spacing(ctx, 0, 0);
    }
    const s = fit(ctx, head, 700, m * 0.33, SERIF, kx - m * 0.12);
    ctx.fillStyle = P("ink", true);
    ctx.fillText(head, m * 0.07, H * 0.5 + s * 0.3);
    ctx.fillStyle = P("ink");
    const ds = fit(ctx, detail, 600, m * 0.06, SANS, kx - m * 0.12);
    ctx.fillText(detail, m * 0.07, H * 0.5 + s * 0.3 + ds * 1.9);
    return;
  }

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
  ctx.globalAlpha = a.finish === "foil" ? 1 : 0.85;
  ctx.beginPath();
  ctx.arc(W - m * 0.255, H - m * 0.425, m * 0.17, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;
  const x = m * 0.085;
  let y = m * 0.13;
  if (showBrand) {
    ctx.fillStyle = P("ink", true);
    setFont(ctx, 700, m * 0.056, SANS);
    spacing(ctx, 0.16, m * 0.056);
    ctx.fillText(brand, x, y);
    spacing(ctx, 0, 0);
    y += m * 0.06;
  }
  setFont(ctx, 700, m * 0.215, SERIF);
  const lines = wrap(ctx, head, W - x * 2, 2);
  const s = fit(ctx, lines.reduce((a1, b) => (a1.length > b.length ? a1 : b), ""), 700, m * 0.215, SERIF, W - x * 2);
  ctx.fillStyle = P("ink", true);
  for (const l of lines) {
    y += s * 1.02;
    ctx.fillText(l, x, y);
  }
  ctx.fillStyle = P("ink");
  setFont(ctx, 600, m * 0.064, SANS);
  spacing(ctx, 0.06, m * 0.064);
  ctx.fillText(detail, x, y + m * 0.1);
  spacing(ctx, 0, 0);
}

/* ---------------------------------------------------------------- Other panels */

/** Back panel: copy blocks, an info table, a barcode. Placeholder copy, laid out like print. */
function drawBack(ctx: Ctx, W: number, H: number, a: ArtInput, P: Paint) {
  const m = Math.min(W, H);
  const pad = m * 0.1;
  ctx.fillStyle = P("ground");
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = P("ink");
  setFont(ctx, 700, m * 0.06, SANS);
  spacing(ctx, 0.12, m * 0.06);
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
  const keyed = variant === "left" && d.layout !== "offset";
  ctx.fillStyle = P(keyed ? "key" : "ground");
  ctx.fillRect(0, 0, W, H);
  if (variant === "right" && d.layout !== "offset") {
    ctx.fillStyle = P("key");
    ctx.fillRect(0, 0, W, H * 0.16);
  }
  const text = variant === "left" ? brand || d.mockup.headline : d.mockup.detail;
  const size = Math.min(W * 0.2, (H * 0.6) / Math.max(2, Array.from(text).length * 1.3));
  ctx.fillStyle = keyed ? P("ground", true) : P("ink", true);
  setFont(ctx, 700, size, SANS);
  vertical(ctx, text, W / 2, H * 0.52, size);
}

function drawTop(ctx: Ctx, W: number, H: number, a: ArtInput, P: Paint) {
  const m = Math.min(W, H);
  ctx.fillStyle = P("ground");
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = P("key");
  ctx.fillRect(0, H - m * 0.06, W, m * 0.06);
  ctx.fillStyle = P("ink", true);
  const t = a.brand || a.d.mockup.headline;
  const s = fit(ctx, t, 700, m * 0.3, SANS, W * 0.6);
  spacing(ctx, 0.2, s);
  ctx.textAlign = "center";
  ctx.fillText(t, W / 2, H / 2 + s * 0.35);
  ctx.textAlign = "left";
  spacing(ctx, 0, 0);
}

function drawPlain(ctx: Ctx, W: number, H: number, role: Role, P: Paint) {
  ctx.fillStyle = P(role);
  ctx.fillRect(0, 0, W, H);
}

/** Lid band of a gift box: brand on the left, detail on the right. */
function drawBand(ctx: Ctx, W: number, H: number, a: ArtInput, P: Paint, withText: boolean) {
  ctx.fillStyle = P("key");
  ctx.fillRect(0, 0, W, H);
  if (!withText) return;
  const s = Math.min(H * 0.3, W * 0.05);
  ctx.fillStyle = P("ground", true);
  setFont(ctx, 700, s, SANS);
  spacing(ctx, 0.22, s);
  ctx.fillText(a.brand || a.d.mockup.headline, H * 0.45, H / 2 + s * 0.36);
  ctx.textAlign = "right";
  ctx.fillText(a.d.mockup.detail, W - H * 0.45, H / 2 + s * 0.36);
  ctx.textAlign = "left";
  spacing(ctx, 0, 0);
}

/** A round tin's printed body, wrapping all the way round; front centred. */
function drawTinWrap(ctx: Ctx, W: number, H: number, a: ArtInput, P: Paint) {
  ctx.fillStyle = P("ground");
  ctx.fillRect(0, 0, W, H);
  const fw = W * 0.3;
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
  section(W / 2 - fw / 2, fw, (c, w, h) => drawFront(c, w, h, a, P));
  section(W / 2 + fw / 2, sideW, (c, w, h) => drawSide(c, w, h, a, P, "right"));
  section(W / 2 - fw / 2 - sideW, sideW, (c, w, h) => drawSide(c, w, h, a, P, "left"));
  section(0, fw / 2, (c, w, h) => {
    c.translate(-fw / 2, 0);
    drawBack(c, fw, h, a, P);
  });
  section(W - fw / 2, fw / 2, (c, w, h) => drawBack(c, fw, h, a, P));
}

/** Printed top of a tin lid (square texture mapped onto a disc). */
function drawTinCap(ctx: Ctx, S: number, a: ArtInput, P: Paint) {
  ctx.fillStyle = P("key");
  ctx.fillRect(0, 0, S, S);
  const c = S / 2;
  ctx.strokeStyle = P("ground", true);
  ctx.lineWidth = S * 0.006;
  for (const r of [0.44, 0.405]) {
    ctx.globalAlpha = a.finish === "foil" ? 1 : 0.55;
    ctx.beginPath();
    ctx.arc(c, c, S * r, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = P("ground", true);
  const t = a.brand || a.d.mockup.headline;
  const s = fit(ctx, t, 700, S * 0.17, SERIF, S * 0.6);
  ctx.textAlign = "center";
  ctx.fillText(t, c, c + s * 0.3);
  setFont(ctx, 600, S * 0.042, SANS);
  spacing(ctx, 0.3, S * 0.042);
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
  const x = a.d.layout === "stripe" ? W * 0.2 : m * 0.12;
  ctx.fillStyle = P("ink", true);
  setFont(ctx, 700, m * 0.13, SANS);
  ctx.fillText(a.brand || a.d.mockup.headline, x, m * 0.26);
  fit(ctx, a.d.mockup.innerLabel, 700, m * 0.16, SANS, W * 0.45);
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
  ctx.fillStyle = P("key", true);
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

export type FaceKind =
  | "front"
  | "back"
  | "left"
  | "right"
  | "top"
  | "bottom"
  | "flap"
  | "band"
  | "bandPlain"
  | "baseSide"
  | "tinWrap"
  | "tinCap"
  | "inner"
  | "manual";

export type Art = { color: HTMLCanvasElement; foil: HTMLCanvasElement | null };

/** Draws one face at `wMm` × `hMm`, `ppm` pixels per millimetre. */
export function drawFace(kind: FaceKind, wMm: number, hMm: number, ppm: number, a: ArtInput): Art {
  const W = Math.max(8, Math.round(wMm * ppm));
  const H = Math.max(8, Math.round(hMm * ppm));
  const roles = rolesOf(a.d);
  const run = (mask: boolean) => {
    const [c, ctx] = canvas(W, H);
    ctx.textBaseline = "alphabetic";
    const P = painter(roles, a.finish, mask);
    switch (kind) {
      case "front":
        drawFront(ctx, W, H, a, P);
        break;
      case "back":
        drawBack(ctx, W, H, a, P);
        break;
      case "left":
      case "right":
        drawSide(ctx, W, H, a, P, kind);
        break;
      case "top":
        drawTop(ctx, W, H, a, P);
        break;
      case "bottom":
      case "flap":
      case "baseSide":
        drawPlain(ctx, W, H, "ground", P);
        break;
      case "band":
        drawBand(ctx, W, H, a, P, true);
        break;
      case "bandPlain":
        drawBand(ctx, W, H, a, P, false);
        break;
      case "tinWrap":
        drawTinWrap(ctx, W, H, a, P);
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
    }
    return c;
  };
  return { color: run(false), foil: a.finish === "foil" ? run(true) : null };
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
  for (let i = 0; i < img.data.length; i += 4) {
    const k = img.data[i] / 255;
    img.data[i] = 255;
    img.data[i + 1] = Math.round(pr + (fr - pr) * k);
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
