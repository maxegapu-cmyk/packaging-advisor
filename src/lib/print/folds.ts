/**
 * How each folded package is made from its flat sheet: every panel's outline, the crease it
 * folds on, which way and how far, the artwork printed on it, and where the folded piece ends
 * up on the finished pack.
 *
 * This is the one description of the nets. The print layouts (layout.ts) take their cut
 * outline, creases, glue areas and art panels from it, and the homepage film folds the very
 * same panels in 3D, so the print file, the film and the 3D product view agree.
 *
 * Sheet coordinates are millimetres, x to the right and y down, seen from the printed side.
 * A positive fold angle folds a panel away from the printed side (its printed face stays
 * outside). Pure and client-safe; the fold maths below needs no 3D library.
 */
import type { Form } from "../pack";
import type { Pair } from "../i18n";
import type { FaceKind } from "./layout";

export type Pt = [number, number];
export type V3 = [number, number, number];
export type Rot = 0 | 90 | 180 | 270;
/** Art printed on a panel, filling its bounding box. `rsc*` are the shipping carton's one-colour prints. */
export type ArtKind = FaceKind | "rscFront" | "rscSide";

export type FoldPanel = {
  id: string;
  poly: Pt[];
  parent?: string;
  /** The crease shared with the parent. */
  hinge?: [Pt, Pt];
  /** Degrees; positive folds away from the printed side. */
  angle?: number;
  /** When it folds, as a window of the piece's forming (0–1). */
  at?: [number, number];
  art?: { kind: ArtKind; rot: Rot; info?: boolean };
  /** Unprinted (glue areas, the inside of a rolled wall). */
  glue?: boolean;
  /** Board thickness of this panel if it differs from the piece's (crate boards). */
  thick?: number;
  /** Folded down flat onto the outside (an aseptic brick's ears): it shows the outer face both ways. */
  ear?: boolean;
  /** Ends up tucked against the inside of another panel (dust flaps, tuck flaps). */
  inner?: boolean;
};

export type FoldPiece = {
  id: string;
  name: Pair;
  panels: FoldPanel[];
  /** The panel that stays put while the others fold round it. */
  anchor: string;
  /**
   * Where the anchor's printed face ends up on the finished pack, in the 3D view's coordinates
   * (mm, the pack standing on y = 0, front toward +z): its centre, outward normal, and the
   * direction the sheet's "up" (−y) points to.
   */
  final: { c: V3; n: V3; u: V3 };
  /** When the folded piece travels to its place. */
  move: [number, number];
  /** Comes in last along a straight line from this offset (mm), e.g. a drawer sliding shut. */
  slide?: { from: V3; at: [number, number] };
  /** What fills the cut outside the art panels when printed. */
  base: "ground" | "key" | "none";
  thick: number;
};

export type Material = "board" | "corrugated" | "rigid" | "film" | "wood";
export type FoldSet = { pieces: FoldPiece[]; material: Material };

const P = (zh: string, en: string): Pair => ({ zh, en });
const rect = (x: number, y: number, w: number, h: number): Pt[] => [
  [x, y],
  [x + w, y],
  [x + w, y + h],
  [x, y + h],
];
const seg = (x0: number, y0: number, x1: number, y1: number): [Pt, Pt] => [
  [x0, y0],
  [x1, y1],
];

/* ================================================================ the nets */

/** Reverse tuck-end carton (ECMA A20.20): glue flap, four walls, dust flaps, tuck lids. */
function carton(w: number, h: number, d: number): FoldSet {
  const G = Math.min(15, w * 0.3);
  const T = Math.max(10, Math.min(d * 0.55, 34));
  const dust = Math.min(d * 0.8, w * 0.5, 40);
  const ch = Math.min(T * 0.35, 6);
  const xF = G;
  const xR = G + w;
  const xB = xR + d;
  const xL = xB + w;
  const xE = xL + d;
  const yT = d + T;
  const yB = yT + h;
  const panels: FoldPanel[] = [
    { id: "front", poly: rect(xF, yT, w, h), art: { kind: "front", rot: 0 } },
    { id: "glue", poly: [[xF, yT], [xF, yB], [0, yB - 6], [0, yT + 6]], parent: "front", hinge: seg(xF, yT, xF, yB), angle: 90, at: [0, 0.3], glue: true },
    { id: "right", poly: rect(xR, yT, d, h), parent: "front", hinge: seg(xR, yT, xR, yB), angle: 90, at: [0.05, 0.35], art: { kind: "right", rot: 0 } },
    { id: "back", poly: rect(xB, yT, w, h), parent: "right", hinge: seg(xB, yT, xB, yB), angle: 90, at: [0.1, 0.4], art: { kind: "back", rot: 0, info: true } },
    { id: "left", poly: rect(xL, yT, d, h), parent: "back", hinge: seg(xL, yT, xL, yB), angle: 90, at: [0.15, 0.45], art: { kind: "left", rot: 0 } },
    { id: "dustRT", poly: [[xR, yT], [xR + 1.5, yT - 3], [xR + 2.5, yT - dust], [xB - d * 0.3, yT - dust], [xB, yT - 3], [xB, yT]], parent: "right", hinge: seg(xR, yT, xB, yT), angle: 90, at: [0.45, 0.62], inner: true },
    { id: "dustLT", poly: [[xL, yT], [xL, yT - 3], [xL + d * 0.3, yT - dust], [xE - 2.5, yT - dust], [xE - 1.5, yT - 3], [xE, yT]], parent: "left", hinge: seg(xL, yT, xE, yT), angle: 90, at: [0.45, 0.62], inner: true },
    { id: "dustRB", poly: [[xR, yB], [xB, yB], [xB, yB + 3], [xB - d * 0.3, yB + dust], [xR + 2.5, yB + dust], [xR + 1.5, yB + 3]], parent: "right", hinge: seg(xR, yB, xB, yB), angle: 90, at: [0.45, 0.62], inner: true },
    { id: "dustLB", poly: [[xL, yB], [xE, yB], [xE - 1.5, yB + 3], [xE - 2.5, yB + dust], [xL + d * 0.3, yB + dust], [xL, yB + 3]], parent: "left", hinge: seg(xL, yB, xE, yB), angle: 90, at: [0.45, 0.62], inner: true },
    { id: "top", poly: rect(xF, yT - d, w, d), parent: "front", hinge: seg(xF, yT, xR, yT), angle: 90, at: [0.62, 0.92], art: { kind: "top", rot: 0 } },
    { id: "tuckT", poly: [[xF, yT - d], [xF + 1.5, yT - d - T + ch], [xF + ch * 1.4, yT - d - T], [xR - ch * 1.4, yT - d - T], [xR - 1.5, yT - d - T + ch], [xR, yT - d]], parent: "top", hinge: seg(xF, yT - d, xR, yT - d), angle: 90, at: [0.55, 0.8], inner: true },
    { id: "bottom", poly: rect(xB, yB, w, d), parent: "back", hinge: seg(xB, yB, xL, yB), angle: 90, at: [0.62, 0.92], art: { kind: "bottom", rot: 180 } },
    { id: "tuckB", poly: [[xB, yB + d], [xL, yB + d], [xL - 1.5, yB + d + T - ch], [xL - ch * 1.4, yB + d + T], [xB + ch * 1.4, yB + d + T], [xB + 1.5, yB + d + T - ch]], parent: "bottom", hinge: seg(xB, yB + d, xL, yB + d), angle: 90, at: [0.55, 0.8], inner: true },
  ];
  return {
    material: "board",
    pieces: [{ id: "net", name: P("盒身展开图", "Carton net"), panels, anchor: "front", final: { c: [0, h / 2, d / 2], n: [0, 0, 1], u: [0, 1, 0] }, move: [0.3, 1], base: "ground", thick: 0.45 }],
  };
}

/**
 * Roll-end front-tuck mailer (FEFCO 0427), as the 3D view builds it: base, a rolled double
 * front wall, a back wall, rolled double side walls, and a lid with a tuck and two dust ears.
 */
function mailer(w: number, h: number, d: number, T = 3): FoldSet {
  const tk = Math.min(h * 0.7, 40);
  const earH = Math.min(h - 2 * T, 26);
  const earD = d * 0.42;
  // the tuck and the ears go in past the walls, so they fold a little more than square
  const cx = 2 * h;
  const y1 = tk;
  const y2 = y1 + d;
  const y3 = y2 + h;
  const y4 = y3 + d;
  const y5 = y4 + h;
  const inH = h - T;
  const e0 = y1 + (d - earD) / 2;
  const tin = 2 * T + 2;
  const panels: FoldPanel[] = [
    { id: "base", poly: rect(cx, y3, w, d), art: { kind: "bottom", rot: 180, info: true } },
    { id: "back", poly: rect(cx, y2, w, h), parent: "base", hinge: seg(cx, y3, cx + w, y3), angle: 90, at: [0, 0.3], art: { kind: "bandPlain", rot: 0 } },
    { id: "front", poly: rect(cx, y4, w, h), parent: "base", hinge: seg(cx, y4, cx + w, y4), angle: 90, at: [0.05, 0.35], art: { kind: "band", rot: 180 } },
    { id: "frontIn", poly: rect(cx, y5, w, inH), parent: "front", hinge: seg(cx, y5, cx + w, y5), angle: 180, at: [0.3, 0.55] },
    { id: "sideL", poly: rect(cx - h, y3, h, d), parent: "base", hinge: seg(cx, y3, cx, y4), angle: 90, at: [0.15, 0.45], art: { kind: "bandPlain", rot: 270 } },
    { id: "sideLIn", poly: rect(cx - h - inH, y3, inH, d), parent: "sideL", hinge: seg(cx - h, y3, cx - h, y4), angle: 180, at: [0.4, 0.62] },
    { id: "sideR", poly: rect(cx + w, y3, h, d), parent: "base", hinge: seg(cx + w, y3, cx + w, y4), angle: 90, at: [0.15, 0.45], art: { kind: "bandPlain", rot: 90 } },
    { id: "sideRIn", poly: rect(cx + w + h, y3, inH, d), parent: "sideR", hinge: seg(cx + w + h, y3, cx + w + h, y4), angle: 180, at: [0.4, 0.62] },
    { id: "lid", poly: rect(cx, y1, w, d), parent: "back", hinge: seg(cx, y2, cx + w, y2), angle: 90, at: [0.6, 0.94], art: { kind: "front", rot: 180 } },
    { id: "tuck", poly: [[cx + tin, y1], [cx + w - tin, y1], [cx + w - tin - 2, 4], [cx + w - tin - 8, 0], [cx + tin + 8, 0], [cx + tin + 2, 4]], parent: "lid", hinge: seg(cx + tin, y1, cx + w - tin, y1), angle: 102, at: [0.56, 0.8] },
    { id: "earL", poly: [[cx, e0], [cx, e0 + earD], [cx - earH, e0 + earD - 6], [cx - earH, e0 + 6]], parent: "lid", hinge: seg(cx, e0, cx, e0 + earD), angle: 102, at: [0.56, 0.8] },
    { id: "earR", poly: [[cx + w, e0], [cx + w + earH, e0 + 6], [cx + w + earH, e0 + earD - 6], [cx + w, e0 + earD]], parent: "lid", hinge: seg(cx + w, e0, cx + w, e0 + earD), angle: 102, at: [0.56, 0.8] },
  ];
  return {
    material: "corrugated",
    pieces: [{ id: "net", name: P("飞机盒展开图", "Mailer net"), panels, anchor: "base", final: { c: [0, 0, 0], n: [0, -1, 0], u: [0, 0, -1] }, move: [0.5, 1], base: "ground", thick: T }],
  };
}

/** Regular slotted container (FEFCO 0201): the corrugated shipping carton. */
function rsc(w: number, h: number, d: number): FoldSet {
  const T = 3;
  const J = 35;
  const F = d / 2;
  const s = 3; // half the slot between flaps
  const xs = [J, J + w, J + w + d, J + 2 * w + d, J + 2 * w + 2 * d];
  const walls = [
    { id: "front", x: xs[0], len: w, art: "rscFront" as ArtKind, major: true },
    { id: "sideA", x: xs[1], len: d, art: "rscSide" as ArtKind, major: false },
    { id: "back", x: xs[2], len: w, art: "rscFront" as ArtKind, major: true },
    { id: "sideB", x: xs[3], len: d, art: "rscSide" as ArtKind, major: false },
  ];
  const panels: FoldPanel[] = [];
  walls.forEach((wl, i) => {
    panels.push({
      id: wl.id,
      poly: rect(wl.x, F, wl.len, h),
      ...(i ? { parent: walls[i - 1].id, hinge: seg(wl.x, F, wl.x, F + h), angle: 90, at: [0.02 + i * 0.06, 0.32 + i * 0.06] as [number, number] } : {}),
      art: { kind: wl.art, rot: 0, info: wl.id === "sideA" },
    });
    const a = wl.x + s;
    const b = wl.x + wl.len - s;
    const top: [number, number] = wl.major ? [0.74, 0.9] : [0.62, 0.76];
    const bot: [number, number] = wl.major ? [0.5, 0.64] : [0.4, 0.54];
    panels.push({ id: `${wl.id}T`, poly: rect(a, 0, b - a, F), parent: wl.id, hinge: seg(a, F, b, F), angle: 90, at: top });
    panels.push({ id: `${wl.id}B`, poly: rect(a, F + h, b - a, F), parent: wl.id, hinge: seg(a, F + h, b, F + h), angle: 90, at: bot });
  });
  panels.push({ id: "joint", poly: [[J, F], [J, F + h], [0, F + h - 10], [0, F + 10]], parent: "front", hinge: seg(J, F, J, F + h), angle: 90, at: [0, 0.3], glue: true });
  return {
    material: "corrugated",
    pieces: [{ id: "net", name: P("纸箱展开图", "Shipping carton net"), panels, anchor: "front", final: { c: [0, h / 2, d / 2], n: [0, 0, 1], u: [0, 1, 0] }, move: [0.55, 1], base: "none", thick: T }],
  };
}

type ArmArt = { kind: FaceKind; info?: boolean };
/**
 * A cross: a centre W × D with four walls of height H, each with a turn-in `t` that folds over
 * the rim. `walls: "down"` hangs the walls from the centre (a lid: the centre is the top);
 * `"up"` raises them (a base or tray: the centre is the bottom), which turns the artwork the
 * other way. `tabs` adds the glued corner tabs a folding tray needs.
 */
function cross(id: string, W: number, D: number, H: number, t: number, centre: ArmArt | null, arms: { front: ArmArt; back: ArmArt; left: ArmArt; right: ArmArt }, walls: "down" | "up", tabs = 0): FoldPanel[] {
  const a = H + t;
  const up = walls === "up";
  const r = (down: Rot, upR: Rot): Rot => (up ? upR : down);
  const out: FoldPanel[] = [];
  const art = (x: ArmArt, rot: Rot) => ({ kind: x.kind, rot, info: x.info });
  out.push({ id: `${id}C`, poly: rect(a, a, W, D), art: centre ? art(centre, up ? 180 : 0) : undefined });
  out.push({ id: `${id}F`, poly: rect(a, a + D, W, H), parent: `${id}C`, hinge: seg(a, a + D, a + W, a + D), angle: 90, at: [0.05, 0.4], art: art(arms.front, r(0, 180)) });
  out.push({ id: `${id}B`, poly: rect(a, t, W, H), parent: `${id}C`, hinge: seg(a, a, a + W, a), angle: 90, at: [0.05, 0.4], art: art(arms.back, r(180, 0)) });
  out.push({ id: `${id}L`, poly: rect(t, a, H, D), parent: `${id}C`, hinge: seg(a, a, a, a + D), angle: 90, at: [0.12, 0.46], art: art(arms.left, r(90, 270)) });
  out.push({ id: `${id}R`, poly: rect(a + W, a, H, D), parent: `${id}C`, hinge: seg(a + W, a, a + W, a + D), angle: 90, at: [0.12, 0.46], art: art(arms.right, r(270, 90)) });
  out.push({ id: `${id}Ft`, poly: rect(a, a + D + H, W, t), parent: `${id}F`, hinge: seg(a, a + D + H, a + W, a + D + H), angle: 180, at: [0.5, 0.78] });
  out.push({ id: `${id}Bt`, poly: rect(a, 0, W, t), parent: `${id}B`, hinge: seg(a, t, a + W, t), angle: 180, at: [0.5, 0.78] });
  out.push({ id: `${id}Lt`, poly: rect(0, a, t, D), parent: `${id}L`, hinge: seg(t, a, t, a + D), angle: 180, at: [0.55, 0.82] });
  out.push({ id: `${id}Rt`, poly: rect(a + W + H, a, t, D), parent: `${id}R`, hinge: seg(a + W + H, a, a + W + H, a + D), angle: 180, at: [0.55, 0.82] });
  if (tabs > 0) {
    // corner tabs on the front and back walls, glued inside the side walls
    const tb = Math.min(tabs, H * 0.9);
    out.push({ id: `${id}FLt`, poly: [[a, a + D], [a, a + D + H], [a - tb, a + D + H - 3], [a - tb, a + D + 3]], parent: `${id}F`, hinge: seg(a, a + D, a, a + D + H), angle: 90, at: [0.0, 0.12], glue: true });
    out.push({ id: `${id}FRt`, poly: [[a + W, a + D], [a + W + tb, a + D + 3], [a + W + tb, a + D + H - 3], [a + W, a + D + H]], parent: `${id}F`, hinge: seg(a + W, a + D, a + W, a + D + H), angle: 90, at: [0.0, 0.12], glue: true });
    out.push({ id: `${id}BLt`, poly: [[a, t], [a, a], [a - tb, a - 3], [a - tb, t + 3]], parent: `${id}B`, hinge: seg(a, t, a, a), angle: 90, at: [0.0, 0.12], glue: true });
    out.push({ id: `${id}BRt`, poly: [[a + W, t], [a + W + tb, t + 3], [a + W + tb, a - 3], [a + W, a]], parent: `${id}B`, hinge: seg(a + W, t, a + W, a), angle: 90, at: [0.0, 0.12], glue: true });
  }
  return out;
}

const PLAIN = (kind: FaceKind): { front: ArmArt; back: ArmArt; left: ArmArt; right: ArmArt } => ({ front: { kind }, back: { kind }, left: { kind }, right: { kind } });

/** Shift a set of panels' windows into a sub-range of the forming. */
function within(panels: FoldPanel[], a: number, b: number): FoldPanel[] {
  return panels.map((p) => (p.at ? { ...p, at: [a + (b - a) * p.at[0], a + (b - a) * p.at[1]] as [number, number] } : p));
}

/** Rigid lid-and-base box: the printed papers that wrap the lid and the base. */
function gift(w: number, h: number, d: number): FoldSet {
  const lidH = Math.max(12, h * 0.34);
  const lid = within(cross("lid", w, d, lidH, 15, { kind: "front" }, { front: { kind: "band" }, back: { kind: "bandPlain" }, left: { kind: "bandPlain" }, right: { kind: "bandPlain" } }, "down"), 0.2, 0.62);
  const base = within(cross("base", w - 2, d - 2, h - 3, 15, { kind: "bottom", info: true }, PLAIN("baseSide"), "up"), 0, 0.45);
  return {
    material: "rigid",
    pieces: [
      { id: "lid", name: P("盖面裱纸", "Lid wrap"), panels: lid, anchor: "lidC", final: { c: [0, h, 0], n: [0, 1, 0], u: [0, 0, -1] }, move: [0.56, 1], base: "key", thick: 0.3 },
      { id: "base", name: P("底盒裱纸", "Base wrap"), panels: base, anchor: "baseC", final: { c: [0, 0, 0], n: [0, -1, 0], u: [0, 0, -1] }, move: [0.22, 0.74], base: "ground", thick: 0.3 },
    ],
  };
}

/** Book-style magnetic box: the cover wrap (bottom board, spine, lid, front flap) and the tray wrap. */
function bookBox(w: number, h: number, d: number): FoldSet {
  const t = 15;
  const flapH = h - 3;
  const rows: { id: string; len: number; art: { kind: FaceKind; rot: Rot; info?: boolean } }[] = [
    { id: "bottom", len: d, art: { kind: "bottom", rot: 0, info: true } },
    { id: "spine", len: h, art: { kind: "bandPlain", rot: 180 } },
    { id: "lid", len: d, art: { kind: "front", rot: 0 } },
    { id: "flap", len: flapH, art: { kind: "band", rot: 0 } },
  ];
  const win: Record<string, [number, number]> = { spine: [0.06, 0.3], lid: [0.6, 0.86], flap: [0.8, 1] };
  const panels: FoldPanel[] = [];
  let y = t;
  rows.forEach((r, i) => {
    panels.push({
      id: r.id,
      poly: rect(t, y, w, r.len),
      ...(i ? { parent: rows[i - 1].id, hinge: seg(t, y, t + w, y), angle: 90, at: win[r.id] } : {}),
      art: r.art,
    });
    // turn-ins along both long edges of every panel
    panels.push({ id: `${r.id}Lt`, poly: rect(0, y, t, r.len), parent: r.id, hinge: seg(t, y, t, y + r.len), angle: 180, at: [0, 0.16] });
    panels.push({ id: `${r.id}Rt`, poly: rect(t + w, y, t, r.len), parent: r.id, hinge: seg(t + w, y, t + w, y + r.len), angle: 180, at: [0, 0.16] });
    y += r.len;
  });
  panels.push({ id: "topT", poly: rect(t, 0, w, t), parent: "bottom", hinge: seg(t, t, t + w, t), angle: 180, at: [0.02, 0.18] });
  panels.push({ id: "botT", poly: rect(t, y, w, t), parent: "flap", hinge: seg(t, y, t + w, y), angle: 180, at: [0.02, 0.18] });
  const tray = within(cross("tray", w - 6, d - 6, h - 6, 15, null, PLAIN("bandPlain"), "up"), 0, 0.42);
  return {
    material: "rigid",
    pieces: [
      { id: "cover", name: P("封套裱纸", "Case wrap"), panels, anchor: "bottom", final: { c: [0, 0, 1], n: [0, -1, 0], u: [0, 0, 1] }, move: [0.14, 0.48], base: "key", thick: 0.3 },
      { id: "tray", name: P("内盒裱纸", "Tray wrap"), panels: tray, anchor: "trayC", final: { c: [0, 2, 0], n: [0, -1, 0], u: [0, 0, -1] }, move: [0.38, 0.6], base: "key", thick: 0.3 },
    ],
  };
}

/** Drawer box: a sleeve (a strip folded into a tube) and a folding tray that slides in. */
function drawer(w: number, h: number, d: number): FoldSet {
  const G = 15;
  const strip: { id: string; len: number; art: { kind: FaceKind; rot: Rot; info?: boolean } }[] = [
    { id: "top", len: w, art: { kind: "front", rot: 0 } },
    { id: "right", len: h, art: { kind: "right", rot: 270 } },
    { id: "bottom", len: w, art: { kind: "bottom", rot: 180, info: true } },
    { id: "left", len: h, art: { kind: "left", rot: 90 } },
  ];
  const sleeve: FoldPanel[] = [];
  let x = 0;
  strip.forEach((s, i) => {
    sleeve.push({ id: s.id, poly: rect(x, 0, s.len, d), ...(i ? { parent: strip[i - 1].id, hinge: seg(x, 0, x, d), angle: 90, at: [0.06 + i * 0.07, 0.3 + i * 0.07] as [number, number] } : {}), art: s.art });
    x += s.len;
  });
  sleeve.push({ id: "glue", poly: [[x, 0], [x + G, 4], [x + G, d - 4], [x, d]], parent: "left", hinge: seg(x, 0, x, d), angle: 90, at: [0.42, 0.55], glue: true });
  const tw = w - 4;
  const td = d - 2;
  const th = h - 4;
  const tray = within(cross("tray", tw, td, th, 12, null, { front: { kind: "band" }, back: { kind: "bandPlain" }, left: { kind: "bandPlain" }, right: { kind: "bandPlain" } }, "up", 12), 0, 0.5);
  return {
    material: "board",
    pieces: [
      { id: "sleeve", name: P("外套", "Sleeve"), panels: sleeve, anchor: "top", final: { c: [0, h, 0], n: [0, 1, 0], u: [0, 0, -1] }, move: [0.35, 0.72], base: "ground", thick: 0.45 },
      { id: "tray", name: P("抽屉内盒", "Tray"), panels: tray, anchor: "trayC", final: { c: [0, 2.1, 0.75], n: [0, -1, 0], u: [0, 0, -1] }, move: [0.46, 0.72], slide: { from: [0, 0, d * 1.15], at: [0.72, 1] }, base: "key", thick: 0.45 },
    ],
  };
}

/** Paper carrier bag: glue flap, front, gusset, back, gusset; top turn-in and a folded bottom. */
function bag(w: number, h: number, d: number): FoldSet {
  const G = 20;
  const turn = 40;
  const bottom = d / 2 + 15;
  const walls = [
    { id: "front", len: w, art: { kind: "front" as FaceKind, rot: 0 as Rot } },
    { id: "sideR", len: d, art: { kind: "bandPlain" as FaceKind, rot: 0 as Rot } },
    { id: "back", len: w, art: { kind: "back" as FaceKind, rot: 0 as Rot, info: true } },
    { id: "sideL", len: d, art: { kind: "bandPlain" as FaceKind, rot: 0 as Rot } },
  ];
  const panels: FoldPanel[] = [];
  let x = G;
  walls.forEach((wl, i) => {
    panels.push({ id: wl.id, poly: rect(x, turn, wl.len, h), ...(i ? { parent: walls[i - 1].id, hinge: seg(x, turn, x, turn + h), angle: 90, at: [0.04 + i * 0.07, 0.34 + i * 0.07] as [number, number] } : {}), art: wl.art });
    panels.push({ id: `${wl.id}T`, poly: rect(x, 0, wl.len, turn), parent: wl.id, hinge: seg(x, turn, x + wl.len, turn), angle: 180, at: [0.0, 0.2] });
    const side = wl.id.startsWith("side");
    panels.push({ id: `${wl.id}B`, poly: rect(x, turn + h, wl.len, bottom), parent: wl.id, hinge: seg(x, turn + h, x + wl.len, turn + h), angle: side ? 90 : 89, at: side ? [0.52, 0.66] : [0.62, 0.8] });
    x += wl.len;
  });
  panels.push({ id: "glue", poly: [[G, turn], [G, turn + h], [0, turn + h - 6], [0, turn + 6]], parent: "front", hinge: seg(G, turn, G, turn + h), angle: 90, at: [0, 0.3], glue: true });
  return {
    material: "board",
    pieces: [{ id: "net", name: P("袋身展开图", "Bag net"), panels, anchor: "front", final: { c: [0, h / 2, d / 2], n: [0, 0, 1], u: [0, 1, 0] }, move: [0.6, 1], base: "ground", thick: 0.35 }],
  };
}

/** Aseptic brick: the web folded into a tube with its seal strip, the ends folded flat. */
function aseptic(w: number, h: number, d: number): FoldSet {
  const fin = d / 2;
  const seal = 8;
  const xs = [0, w, w + d, 2 * w + d, 2 * w + 2 * d];
  const walls = [
    { id: "front", kind: "front" as FaceKind, len: w },
    { id: "right", kind: "right" as FaceKind, len: d },
    { id: "back", kind: "back" as FaceKind, len: w },
    { id: "left", kind: "left" as FaceKind, len: d },
  ];
  const panels: FoldPanel[] = [];
  walls.forEach((wl, i) => {
    const x = xs[i];
    panels.push({ id: wl.id, poly: rect(x, fin, wl.len, h), ...(i ? { parent: walls[i - 1].id, hinge: seg(x, fin, x, fin + h), angle: 90, at: [0.02 + i * 0.07, 0.3 + i * 0.07] as [number, number] } : {}), art: { kind: wl.kind, rot: 0, info: wl.id === "back" } });
    if (wl.len === w) {
      panels.push({ id: `${wl.id}T`, poly: rect(x, 0, w, fin), parent: wl.id, hinge: seg(x, fin, x + w, fin), angle: 90, at: [0.6, 0.8] });
      panels.push({ id: `${wl.id}B`, poly: rect(x, fin + h, w, fin), parent: wl.id, hinge: seg(x, fin + h, x + w, fin + h), angle: 90, at: [0.6, 0.8] });
    } else {
      // the top gussets become the ears, folded down flat onto the narrow sides; the bottom
      // ones fold in under the base
      panels.push({ id: `${wl.id}T`, poly: [[x, fin], [x + d / 2, 0.5], [x + d, fin]], parent: wl.id, hinge: seg(x, fin, x + d, fin), angle: -178, at: [0.62, 0.86], ear: true });
      panels.push({ id: `${wl.id}B`, poly: [[x, fin + h], [x + d, fin + h], [x + d / 2, fin + h + fin - 0.5]], parent: wl.id, hinge: seg(x, fin + h, x + d, fin + h), angle: 93, at: [0.45, 0.62] });
    }
  });
  panels.push({ id: "seal", poly: rect(xs[4], fin, seal, h), parent: "left", hinge: seg(xs[4], fin, xs[4], fin + h), angle: 90, at: [0.3, 0.45], glue: true });
  return {
    material: "film",
    pieces: [{ id: "web", name: P("包材展开", "Packaging web"), panels, anchor: "front", final: { c: [0, h / 2, d / 2], n: [0, 0, 1], u: [0, 1, 0] }, move: [0.3, 1], base: "ground", thick: 0.4 }],
  };
}

/** Pine crate as flat boards around its base, and the engraved lid that slides into its grooves. */
function woodBox(w: number, h: number, d: number): FoldSet {
  const T = 10;
  const Tb = 6;
  const lidT = 6;
  const recess = 3;
  const groove = 4;
  const lidBottom = h - recess - lidT;
  const Hf = lidBottom - 0.6;
  const bw = w - 2 * T;
  const bd = d - 2 * T;
  const a = h + 4;
  const panels: FoldPanel[] = [
    { id: "base", poly: rect(a, a, bw, bd), thick: Tb },
    { id: "front", poly: rect(a, a + bd, bw, Hf), parent: "base", hinge: seg(a, a + bd, a + bw, a + bd), angle: 90, at: [0.05, 0.45], thick: T },
    { id: "back", poly: rect(a, a - h, bw, h), parent: "base", hinge: seg(a, a, a + bw, a), angle: 90, at: [0.05, 0.45], thick: T },
    { id: "left", poly: rect(a - h, a - T, h, d), parent: "base", hinge: seg(a, a, a, a + bd), angle: 90, at: [0.15, 0.55], thick: T },
    { id: "right", poly: rect(a + bw, a - T, h, d), parent: "base", hinge: seg(a + bw, a, a + bw, a + bd), angle: 90, at: [0.15, 0.55], thick: T },
  ];
  const lw = w - 2 * T + 2 * groove;
  const ld = d - T + groove;
  return {
    material: "wood",
    pieces: [
      { id: "crate", name: P("箱体", "Crate"), panels, anchor: "base", final: { c: [0, 0, 0], n: [0, -1, 0], u: [0, 0, -1] }, move: [0.4, 0.8], base: "none", thick: T },
      { id: "lid", name: P("抽拉盖", "Sliding lid"), panels: [{ id: "lid", poly: rect(0, 0, lw, ld), art: { kind: "front", rot: 0 } }], anchor: "lid", final: { c: [0, lidBottom + lidT, d / 2 - ld / 2], n: [0, 1, 0], u: [0, 0, -1] }, move: [0.52, 0.82], slide: { from: [0, 0, ld + 10], at: [0.8, 1] }, base: "none", thick: lidT },
    ],
  };
}

export type FoldForm = Form | "rsc";

/**
 * The fold description of a form at a size, or null for forms that are not folded from a flat
 * sheet. `t` is the board's thickness where the die allows for it (a mailer's flute, mm).
 */
export function foldsFor(form: FoldForm, w: number, h: number, d: number, t?: number): FoldSet | null {
  switch (form) {
    case "carton":
      return carton(w, h, d);
    case "mailer":
      return mailer(w, h, d, t);
    case "rsc":
      return rsc(w, h, d);
    case "gift":
      return gift(w, h, d);
    case "bookBox":
      return bookBox(w, h, d);
    case "drawer":
      return drawer(w, h, d);
    case "bag":
      return bag(w, h, d);
    case "aseptic":
      return aseptic(w, h, d);
    case "woodBox":
      return woodBox(w, h, d);
    default:
      return null;
  }
}

/* ================================================================ outline, creases, panels */

const area = (p: Pt[]) => {
  let a = 0;
  for (let i = 0; i < p.length; i++) {
    const [x0, y0] = p[i];
    const [x1, y1] = p[(i + 1) % p.length];
    a += x0 * y1 - x1 * y0;
  }
  return a / 2;
};
const K = (p: Pt) => `${Math.round(p[0] * 1000)},${Math.round(p[1] * 1000)}`;

/**
 * The outline of panels that tile without overlapping: every edge that is not shared by two
 * panels, chained into the largest closed loop.
 */
export function outline(polys: Pt[][]): Pt[] {
  const all = polys.map((p) => (area(p) < 0 ? [...p].reverse() : p));
  const verts = all.flat();
  const edges: [Pt, Pt][] = [];
  for (const p of all)
    for (let i = 0; i < p.length; i++) {
      const a = p[i];
      const b = p[(i + 1) % p.length];
      const dx = b[0] - a[0];
      const dy = b[1] - a[1];
      const L2 = dx * dx + dy * dy;
      if (L2 < 1e-9) continue;
      // split the edge at any vertex lying on it
      const cuts = verts
        .map((v) => {
          const t = ((v[0] - a[0]) * dx + (v[1] - a[1]) * dy) / L2;
          const ex = a[0] + dx * t - v[0];
          const ey = a[1] + dy * t - v[1];
          return { v, t, off: ex * ex + ey * ey };
        })
        .filter((c) => c.t > 1e-6 && c.t < 1 - 1e-6 && c.off < 1e-6)
        .sort((m, n) => m.t - n.t);
      let prev = a;
      for (const c of cuts) {
        if (K(c.v) !== K(prev)) edges.push([prev, c.v]);
        prev = c.v;
      }
      if (K(prev) !== K(b)) edges.push([prev, b]);
    }
  // shared edges run both ways: cancel them
  const count = new Map<string, { e: [Pt, Pt]; n: number }>();
  for (const e of edges) {
    const fw = `${K(e[0])}>${K(e[1])}`;
    const bw = `${K(e[1])}>${K(e[0])}`;
    const back = count.get(bw);
    if (back && back.n > 0) back.n--;
    else {
      const c = count.get(fw);
      if (c) c.n++;
      else count.set(fw, { e, n: 1 });
    }
  }
  const rest: [Pt, Pt][] = [];
  for (const { e, n } of count.values()) for (let i = 0; i < n; i++) rest.push(e);
  const from = new Map<string, [Pt, Pt][]>();
  for (const e of rest) {
    const k = K(e[0]);
    from.set(k, [...(from.get(k) ?? []), e]);
  }
  const used = new Set<[Pt, Pt]>();
  const loops: Pt[][] = [];
  for (const e0 of rest) {
    if (used.has(e0)) continue;
    const loop: Pt[] = [];
    let e: [Pt, Pt] | undefined = e0;
    while (e && !used.has(e)) {
      used.add(e);
      loop.push(e[0]);
      e = (from.get(K(e[1])) ?? []).find((x) => !used.has(x));
    }
    loops.push(loop);
  }
  const best = loops.sort((m, n) => Math.abs(area(n)) - Math.abs(area(m)))[0] ?? [];
  // drop points in the middle of straight runs
  return best.filter((p, i) => {
    const a = best[(i - 1 + best.length) % best.length];
    const b = best[(i + 1) % best.length];
    return Math.abs((p[0] - a[0]) * (b[1] - a[1]) - (p[1] - a[1]) * (b[0] - a[0])) > 1e-6;
  });
}

export const bbox = (pts: Pt[]) => {
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
};

/** A piece's cut outline, creases (one per hinge) and the art and glue rectangles. */
export function flatOf(piece: FoldPiece) {
  const cut = outline(piece.panels.map((p) => p.poly));
  const creases = piece.panels.filter((p) => p.hinge).map((p) => [...p.hinge![0], ...p.hinge![1]] as [number, number, number, number]);
  const art = piece.panels.filter((p) => p.art).map((p) => ({ ...bbox(p.poly), art: p.art! }));
  const glue = piece.panels.filter((p) => p.glue).map((p) => bbox(p.poly));
  return { cut, creases, art, glue, box: bbox(cut) };
}

/* ================================================================ folding */

/** 4 × 4 matrices, column-major (the layout three.js uses). */
export type M4 = number[];
const I4 = (): M4 => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
export function mul(a: M4, b: M4): M4 {
  const o = new Array(16).fill(0);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) o[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k];
  return o;
}
const T4 = (x: number, y: number, z: number): M4 => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1];
function R4(k: V3, th: number): M4 {
  const [x, y, z] = k;
  const c = Math.cos(th);
  const s = Math.sin(th);
  const t = 1 - c;
  return [t * x * x + c, t * x * y + s * z, t * x * z - s * y, 0, t * x * y - s * z, t * y * y + c, t * y * z + s * x, 0, t * x * z + s * y, t * y * z - s * x, t * z * z + c, 0, 0, 0, 0, 1];
}
export const apply4 = (m: M4, p: V3, w = 1): V3 => [m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12] * w, m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13] * w, m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14] * w];
const cross3 = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const centroid = (p: Pt[]): Pt => [p.reduce((s, q) => s + q[0], 0) / p.length, p.reduce((s, q) => s + q[1], 0) / p.length];

/**
 * Each panel's transform from the flat sheet (x, printed side up as +y, sheet y as +z; mm)
 * into the piece's frame, with the anchor left where it lies. `amount` gives each panel's
 * fold (0 flat, 1 fully folded).
 */
export function foldFrames(piece: FoldPiece, amount: (p: FoldPanel) => number): Map<string, M4> {
  const byId = new Map(piece.panels.map((p) => [p.id, p]));
  const out = new Map<string, M4>();
  const frame = (p: FoldPanel): M4 => {
    const have = out.get(p.id);
    if (have) return have;
    if (!p.parent || !p.hinge) {
      out.set(p.id, I4());
      return out.get(p.id)!;
    }
    const parent = frame(byId.get(p.parent)!);
    const [A, B] = p.hinge;
    const len = Math.hypot(B[0] - A[0], B[1] - A[1]);
    const k: V3 = [(B[0] - A[0]) / len, 0, (B[1] - A[1]) / len];
    const c = centroid(p.poly);
    const r: V3 = [c[0] - A[0], 0, c[1] - A[1]];
    const side = Math.sign(cross3(k, r)[1]) || 1;
    const ang = ((p.angle ?? 90) * Math.PI) / 180;
    // away from the print, the inside faces close: the hinge runs along the inside (y = 0)
    const th = -side * ang * amount(p);
    const m = mul(parent, mul(T4(A[0], 0, A[1]), mul(R4(k, th), T4(-A[0], 0, -A[1]))));
    out.set(p.id, m);
    return m;
  };
  for (const p of piece.panels) frame(p);
  return out;
}

/** Puts the folded piece where it belongs: the anchor's printed face on its final place. */
export function placement(piece: FoldPiece): M4 {
  const anchor = piece.panels.find((p) => p.id === piece.anchor)!;
  const [ax, ay] = centroidRect(anchor.poly);
  const n = piece.final.n;
  const u = piece.final.u;
  const ex = cross3(u, n);
  // columns: sheet x → ex, printed normal (+y) → n, sheet +y (down) → −u
  const R: M4 = [ex[0], ex[1], ex[2], 0, n[0], n[1], n[2], 0, -u[0], -u[1], -u[2], 0, 0, 0, 0, 1];
  const th = anchor.thick ?? piece.thick;
  return mul(T4(...piece.final.c), mul(R, T4(-ax, -th, -ay)));
}
function centroidRect(p: Pt[]): Pt {
  const b = bbox(p);
  return [b.x + b.w / 2, b.y + b.h / 2];
}

/** Rotation part of a matrix applied to a direction. */
export const dir4 = (m: M4, v: V3): V3 => apply4(m, v, 0);

/** The direction "up" in a panel's artwork, in sheet coordinates (x, 0, y). */
export function artUp(rot: Rot): V3 {
  return rot === 0 ? [0, 0, -1] : rot === 90 ? [1, 0, 0] : rot === 180 ? [0, 0, 1] : [-1, 0, 0];
}
