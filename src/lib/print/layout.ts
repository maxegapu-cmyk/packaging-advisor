/**
 * Print layouts: every printed part of a package, flat, at 1:1 in millimetres.
 * Folding cartons and bags become nets (cut outline, fold lines, panels); rigid boxes become the
 * printed paper that wraps their greyboard; bottles, jars, tins and cans become labels or
 * body blanks. Each panel names the artwork drawn on it (the same `FaceKind` the 3D uses), so
 * the print file and the 3D are drawn by the same code.
 *
 * Structural sizes are standard starting points. The printer's own die line always wins; the
 * file says so. Client-safe and pure.
 */
import type { Pair } from "../i18n";
import type { Finish, Form, PackSpec } from "../pack";

export type FaceKind = "front" | "back" | "left" | "right" | "top" | "bottom" | "flap" | "band" | "bandPlain" | "baseSide" | "tinWrap" | "tinCap" | "inner" | "manual";

/** rot: clockwise quarter turns applied to the upright artwork. */
export type Panel = { kind: FaceKind; x: number; y: number; w: number; h: number; rot: 0 | 90 | 180 | 270; info?: boolean };
export type Line = [number, number, number, number];
export type Piece = {
  id: string;
  name: Pair;
  /** Bounding box on the sheet. */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Cut outline as an SVG path, sheet coordinates. */
  cut: string;
  /** Crease lines. */
  folds: Line[];
  /** Glue or seal areas (left unprinted or noted), as rectangles. */
  glue: { x: number; y: number; w: number; h: number }[];
  panels: Panel[];
  /** Color of everything inside the cut that is not a panel. */
  base: "ground" | "key" | "none";
};
export type Sheet = {
  id: string;
  name: Pair;
  w: number;
  h: number;
  pieces: Piece[];
  material: Pair;
  process: "print" | "engrave";
  notes: Pair[];
  /** How many of this part one package needs. */
  qty: number;
};
export type PrintLayout = { sheets: Sheet[]; bleed: number; margin: number };

export const BLEED = 3;
export const MARGIN = 18;
const GAP = 16;

/* ---------------------------------------------------------------- path helpers */

const r1 = (v: number) => Math.round(v * 100) / 100;
function poly(pts: [number, number][], ox: number, oy: number): string {
  return pts.map(([x, y], i) => `${i ? "L" : "M"}${r1(x + ox)} ${r1(y + oy)}`).join(" ") + " Z";
}
function rectPath(x: number, y: number, w: number, h: number) {
  return poly(
    [
      [0, 0],
      [w, 0],
      [w, h],
      [0, h],
    ],
    x,
    y,
  );
}
function circlePath(cx: number, cy: number, r: number) {
  return `M${r1(cx - r)} ${r1(cy)} A${r1(r)} ${r1(r)} 0 1 0 ${r1(cx + r)} ${r1(cy)} A${r1(r)} ${r1(r)} 0 1 0 ${r1(cx - r)} ${r1(cy)} Z`;
}
const P = (zh: string, en: string): Pair => ({ zh, en });

/** A piece built in local coordinates, placed later. */
type Local = Omit<Piece, "x" | "y" | "cut" | "folds" | "panels" | "glue"> & { cutPts?: [number, number][]; circle?: { cx: number; cy: number; r: number }; folds: Line[]; panels: Panel[]; glue: Piece["glue"] };

function place(l: Local, x: number, y: number): Piece {
  const cut = l.circle ? circlePath(l.circle.cx + x, l.circle.cy + y, l.circle.r) : poly(l.cutPts ?? [], x, y);
  return {
    id: l.id,
    name: l.name,
    x,
    y,
    w: l.w,
    h: l.h,
    cut,
    folds: l.folds.map(([a, b, c, d]) => [a + x, b + y, c + x, d + y] as Line),
    glue: l.glue.map((g) => ({ ...g, x: g.x + x, y: g.y + y })),
    panels: l.panels.map((p) => ({ ...p, x: p.x + x, y: p.y + y })),
    base: l.base,
  };
}

/** Lays pieces in rows on a sheet with margins for crop marks. */
function sheet(id: string, name: Pair, locals: Local[], material: Pair, notes: Pair[], qty = 1, process: Sheet["process"] = "print"): Sheet {
  const maxRow = Math.max(600, ...locals.map((l) => l.w));
  let x = MARGIN;
  let y = MARGIN;
  let rowH = 0;
  let w = 0;
  const pieces: Piece[] = [];
  for (const l of locals) {
    if (x > MARGIN && x + l.w > MARGIN + maxRow) {
      x = MARGIN;
      y += rowH + GAP;
      rowH = 0;
    }
    pieces.push(place(l, x, y));
    x += l.w + GAP;
    rowH = Math.max(rowH, l.h);
    w = Math.max(w, x - GAP);
  }
  return { id, name, w: r1(w + MARGIN), h: r1(y + rowH + MARGIN), pieces, material, process, notes, qty };
}

/* ---------------------------------------------------------------- shared print areas */

/** Printed bands on round forms, in mm. Mirrors the 3D builders (forms-*.ts). */
export function roundAreas(form: Form, w: number, h: number) {
  const R = w / 2;
  const circ = 2 * Math.PI * R;
  switch (form) {
    case "bottle": {
      const pumpH = Math.min(60, Math.max(34, h * 0.26));
      const bodyH = h - pumpH;
      const shH = Math.min(bodyH * 0.18, R * 0.8);
      const sh0 = bodyH - shH;
      return { wrap: { w: circ, h: sh0 - 4 - 8 } };
    }
    case "tube": {
      const capH = Math.min(26, Math.max(14, h * 0.14));
      const y0 = capH + R * 0.38;
      const y1 = h - Math.min(10, h * 0.07);
      return { wrap: { w: circ, h: y1 - y0 } };
    }
    case "tin": {
      const lidH = Math.max(10, h * 0.17);
      const neckY = h - lidH + 2;
      return { wrap: { w: circ, h: neckY - 1.4 - 3.6 }, cap: w };
    }
    case "can": {
      const neckH = Math.min(14, h * 0.13);
      return { wrap: { w: circ, h: h - neckH - 1 - 10 } };
    }
    case "ceramic": {
      const knobH = Math.max(6, h * 0.07);
      const domeH = Math.max(10, h * 0.12);
      const neckH = Math.max(10, h * 0.1);
      const Hb = h - domeH - knobH;
      const yS = Hb - neckH - h * 0.12;
      return { wrap: { w: circ, h: yS - 3 - 8 } };
    }
    case "paperTube": {
      const lidH = Math.max(24, h * 0.28);
      return { wrap: { w: circ, h: h - lidH }, lidBand: { w: circ, h: lidH }, cap: w };
    }
    case "jar": {
      const capH = Math.min(20, Math.max(10, h * 0.14));
      const rnO = R - Math.max(4, R * 0.12);
      const yN = h - capH - 1;
      const yS = yN - Math.min(h * 0.1, (R - rnO) * 1.6);
      const lh = yS - 6 - Math.max(8, h * 0.12);
      return { front: { w: R * ((150 * Math.PI) / 180), h: lh }, back: { w: R * ((100 * Math.PI) / 180), h: lh }, cap: 2 * (rnO + 2.4) };
    }
    case "glassBottle": {
      const y0 = h * 0.56;
      const lh = y0 - h * 0.06 - h * 0.1;
      const rn = Math.max(8, Math.min(R * 0.32, 15));
      const hh = Math.min(18, Math.max(10, h * 0.06));
      const Hg = h - hh - 0.3;
      const yN = y0 + Math.min(h * 0.2, (R - rn) * 2.2);
      const nb0 = yN + 4;
      const nb1 = Math.min(Hg - 9, nb0 + 18);
      return { front: { w: R * ((130 * Math.PI) / 180), h: lh }, back: { w: R * ((100 * Math.PI) / 180), h: lh }, neck: nb1 - nb0 > 5 ? { w: 2 * Math.PI * rn, h: nb1 - nb0 } : undefined };
    }
    default:
      return {};
  }
}

/** Share of a full wrap given to the front (and to the back) panel. Matches art.ts. */
export const WRAP_FRONT = 0.3;

/* ---------------------------------------------------------------- folding carton (reverse tuck end) */

function carton(w: number, h: number, d: number): Local {
  const G = Math.min(15, w * 0.3);
  const T = Math.max(10, Math.min(d * 0.55, 34));
  const dust = Math.min(d * 0.8, w * 0.5, 40);
  const top = d + T;
  const xF = G;
  const xR = G + w;
  const xB = xR + d;
  const xL = xB + w;
  const xE = xL + d;
  const yT = top;
  const yB = top + h;
  const ch = Math.min(T * 0.35, 6);
  const pts: [number, number][] = [
    [xF, yT],
    [xF, yT - d],
    [xF + 1.5, yT - d - T + ch],
    [xF + ch * 1.4, yT - d - T],
    [xR - ch * 1.4, yT - d - T],
    [xR - 1.5, yT - d - T + ch],
    [xR, yT - d],
    [xR, yT],
    [xR + 1.5, yT - 3],
    [xR + 2.5, yT - dust],
    [xB - d * 0.3, yT - dust],
    [xB, yT - 3],
    [xB, yT],
    [xL, yT],
    [xL, yT - 3],
    [xL + d * 0.3, yT - dust],
    [xE - 2.5, yT - dust],
    [xE - 1.5, yT - 3],
    [xE, yT],
    [xE, yB],
    [xE - 1.5, yB + 3],
    [xE - 2.5, yB + dust],
    [xL + d * 0.3, yB + dust],
    [xL, yB + 3],
    [xL, yB],
    [xL, yB + d],
    [xL - 1.5, yB + d + T - ch],
    [xL - ch * 1.4, yB + d + T],
    [xB + ch * 1.4, yB + d + T],
    [xB + 1.5, yB + d + T - ch],
    [xB, yB + d],
    [xB, yB],
    [xB, yB + 3],
    [xB - d * 0.3, yB + dust],
    [xR + 2.5, yB + dust],
    [xR + 1.5, yB + 3],
    [xR, yB],
    [xF, yB],
    [0, yB - 6],
    [0, yT + 6],
  ];
  return {
    id: "net",
    name: P("盒身展开图", "Carton net"),
    w: xE,
    h: yB + d + T,
    cutPts: pts,
    folds: [
      [xF, yT, xF, yB],
      [xR, yT, xR, yB],
      [xB, yT, xB, yB],
      [xL, yT, xL, yB],
      [xF, yT, xR, yT],
      [xF, yT - d, xR, yT - d],
      [xR, yT, xB, yT],
      [xL, yT, xE, yT],
      [xB, yB, xL, yB],
      [xB, yB + d, xL, yB + d],
      [xR, yB, xB, yB],
      [xL, yB, xE, yB],
    ],
    glue: [{ x: 0, y: yT + 6, w: G, h: h - 12 }],
    panels: [
      { kind: "front", x: xF, y: yT, w, h, rot: 0 },
      { kind: "right", x: xR, y: yT, w: d, h, rot: 0 },
      { kind: "back", x: xB, y: yT, w, h, rot: 0, info: true },
      { kind: "left", x: xL, y: yT, w: d, h, rot: 0 },
      { kind: "top", x: xF, y: yT - d, w, h: d, rot: 0 },
      { kind: "bottom", x: xB, y: yB, w, h: d, rot: 180 },
    ],
    base: "ground",
  };
}

/* ---------------------------------------------------------------- cross-shaped wraps and trays */

type Arm = { kind: FaceKind; rot: Panel["rot"] };
/**
 * A cross: centre W × D with four walls of height H around it, each with a turn-in `t` beyond.
 * Used for the paper that wraps a rigid lid or base, and for folding trays.
 */
function cross(id: string, name: Pair, W: number, D: number, H: number, t: number, centre: FaceKind | null, arms: { front: Arm; back: Arm; left: Arm; right: Arm }, centreInfo = false): Local {
  // turn-ins fold over the rim and show: they take the walls' color
  const base: Local["base"] = arms.left.kind === "bandPlain" || arms.left.kind === "band" ? "key" : "ground";
  const a = H + t;
  const x0 = a;
  const y0 = a;
  const pts: [number, number][] = [
    [x0, 0],
    [x0 + W, 0],
    [x0 + W, y0],
    [x0 + W + a, y0],
    [x0 + W + a, y0 + D],
    [x0 + W, y0 + D],
    [x0 + W, y0 + D + a],
    [x0, y0 + D + a],
    [x0, y0 + D],
    [0, y0 + D],
    [0, y0],
    [x0, y0],
  ];
  const panels: Panel[] = [];
  if (centre) panels.push({ kind: centre, x: x0, y: y0, w: W, h: D, rot: 0, info: centreInfo });
  panels.push({ kind: arms.front.kind, x: x0, y: y0 + D, w: W, h: H, rot: arms.front.rot });
  panels.push({ kind: arms.back.kind, x: x0, y: t, w: W, h: H, rot: arms.back.rot });
  panels.push({ kind: arms.left.kind, x: t, y: y0, w: H, h: D, rot: arms.left.rot });
  panels.push({ kind: arms.right.kind, x: x0 + W, y: y0, w: H, h: D, rot: arms.right.rot });
  return {
    id,
    name,
    w: W + 2 * a,
    h: D + 2 * a,
    cutPts: pts,
    folds: [
      [x0, y0, x0 + W, y0],
      [x0, y0 + D, x0 + W, y0 + D],
      [x0, y0, x0, y0 + D],
      [x0 + W, y0, x0 + W, y0 + D],
      [x0, t, x0 + W, t],
      [x0, y0 + D + H, x0 + W, y0 + D + H],
      [t, y0, t, y0 + D],
      [x0 + W + H, y0, x0 + W + H, y0 + D],
    ],
    glue: [],
    panels,
    base,
  };
}

/* ---------------------------------------------------------------- simple pieces */

function rectPiece(id: string, name: Pair, w: number, h: number, panels: Panel[], glue: Piece["glue"] = [], folds: Line[] = [], base: Local["base"] = "ground"): Local {
  return {
    id,
    name,
    w,
    h,
    cutPts: [
      [0, 0],
      [w, 0],
      [w, h],
      [0, h],
    ],
    folds,
    glue,
    panels,
    base,
  };
}

function disc(id: string, name: Pair, dia: number, kind: FaceKind): Local {
  return { id, name, w: dia, h: dia, circle: { cx: dia / 2, cy: dia / 2, r: dia / 2 }, folds: [], glue: [], panels: [{ kind, x: 0, y: 0, w: dia, h: dia, rot: 0 }], base: "none" };
}

/** A full wrap: front, sides and back, plus an overlap for the seam. */
function wrapLabel(id: string, name: Pair, circ: number, h: number, overlap: number): Local {
  return rectPiece(id, name, circ + overlap, h, [{ kind: "tinWrap", x: 0, y: 0, w: circ, h, rot: 0, info: true }], overlap ? [{ x: circ, y: 0, w: overlap, h }] : []);
}

/* ---------------------------------------------------------------- per form */

const MAT: Record<Form, Pair> = {
  carton: P("白卡纸 300–400 g/m²", "Folding boxboard (SBS) 300–400 gsm"),
  gift: P("1200 g 灰板 + 157 g 铜版纸裱糊", "1200 gsm greyboard wrapped in 157 gsm art paper"),
  bookBox: P("1200 g 灰板 + 157 g 铜版纸裱糊，磁铁", "1200 gsm greyboard wrapped in 157 gsm art paper, magnets"),
  mailer: P("E 楞瓦楞纸板，白面牛卡", "E-flute corrugated board, white-top kraft"),
  drawer: P("外套 350 g 白卡；内盒 350 g 白卡或灰板裱纸", "Sleeve 350 gsm board; tray 350 gsm board or wrapped greyboard"),
  paperTube: P("纸管 + 157 g 铜版纸裱糊", "Paper tube wrapped in 157 gsm art paper"),
  bag: P("250 g 白卡或牛皮纸，覆膜，绳提手", "250 gsm board or kraft, laminated, rope handles"),
  aseptic: P("纸 / PE / 铝箔复合包材", "Board / PE / foil laminate"),
  pouch: P("PET / AL / PE 复合膜，凹版印刷", "PET / AL / PE laminate, gravure printed"),
  bottle: P("不干胶标签（PP 膜）", "Self-adhesive label (PP film)"),
  tube: P("PE 软管，管身胶印", "PE tube, offset printed on the body"),
  blister: P("350 g 白卡 + PET 吸塑", "350 gsm board with a PET blister"),
  jar: P("不干胶标签（铜版纸或合成纸）", "Self-adhesive label (art paper or synthetic)"),
  glassBottle: P("不干胶标签（铜版纸或合成纸）", "Self-adhesive label (art paper or synthetic)"),
  tin: P("马口铁 0.21–0.25 mm，印铁", "Tinplate 0.21–0.25 mm, printed flat"),
  can: P("两片铝罐，罐身曲面印刷", "Two-piece aluminium can, printed on the body"),
  ceramic: P("陶瓷贴花纸，烤花", "Ceramic decal, fired on"),
  woodBox: P("松木，盖面激光雕刻", "Pine, laser-engraved lid"),
};

export const FINISH_NOTE: Record<Finish, Pair> = {
  matte: P("表面处理：覆哑膜", "Finish: matte lamination"),
  gloss: P("表面处理：覆亮膜或过光油", "Finish: gloss lamination or varnish"),
  paper: P("表面处理：特种纸，不覆膜", "Finish: textured paper, no lamination"),
  foil: P("表面处理：哑膜 + 烫金（烫金版单独一页）", "Finish: matte lamination + hot foil (foil plate on its own page)"),
};

const DIE = P("刀线和压痕为标准结构，开模前请以印厂刀模为准。", "Cut and crease lines are a standard structure; use your printer's die line before cutting.");
const CURVED = P("此为平面展开示意，曲面印刷的变形由印厂补偿。", "A flat representation; the printer compensates for printing on the curve.");

function sheetsFor(form: Form, w: number, h: number, d: number, finish: Finish, prefix = "", qty = 1): Sheet[] {
  const mat = MAT[form];
  const notes = [FINISH_NOTE[finish]];
  const id = (s: string) => prefix + s;
  const nm = (p: Pair): Pair => (prefix ? { zh: `内装 · ${p.zh}`, en: `Inside · ${p.en}` } : p);
  const ra = roundAreas(form, w, h);
  switch (form) {
    case "carton":
      return [sheet(id("net"), nm(P("直立盒刀模", "Tuck carton die")), [carton(w, h, d)], mat, [...notes, DIE], qty)];
    case "gift": {
      const lidH = Math.max(12, h * 0.34);
      const lid = cross("lid", P("盖面裱纸", "Lid wrap"), w, d, lidH, 15, "front", { front: { kind: "band", rot: 0 }, back: { kind: "bandPlain", rot: 180 }, left: { kind: "bandPlain", rot: 90 }, right: { kind: "bandPlain", rot: 270 } });
      const base = cross("base", P("底盒裱纸", "Base wrap"), w - 2, d - 2, h - 3, 15, "bottom", { front: { kind: "baseSide", rot: 0 }, back: { kind: "baseSide", rot: 180 }, left: { kind: "baseSide", rot: 90 }, right: { kind: "baseSide", rot: 270 } }, true);
      return [sheet(id("wraps"), nm(P("天地盖裱纸", "Gift box wraps")), [lid, base], mat, [...notes, DIE, P("盒底印有标签信息。", "Label information is printed on the base.")], qty)];
    }
    case "bookBox": {
      const t = 15;
      const flapH = h - 3;
      const W = w + 2 * t;
      const H = d + h + d + flapH + 2 * t;
      let y = t;
      const panels: Panel[] = [];
      const folds: Line[] = [];
      for (const [kind, ph, rot, info] of [
        ["bottom", d, 180, true],
        ["bandPlain", h, 180, false],
        ["front", d, 0, false],
        ["band", flapH, 0, false],
      ] as [FaceKind, number, Panel["rot"], boolean][]) {
        panels.push({ kind, x: t, y, w, h: ph, rot, info });
        folds.push([t, y, t + w, y]);
        y += ph;
      }
      folds.push([t, y, t + w, y], [t, t, t, y], [t + w, t, t + w, y]);
      const cover = rectPiece("cover", P("封套裱纸", "Case wrap"), W, H, panels, [], folds);
      const tray = cross("tray", P("内盒裱纸", "Tray wrap"), w - 6, d - 6, h - 6, 15, null, { front: { kind: "bandPlain", rot: 0 }, back: { kind: "bandPlain", rot: 180 }, left: { kind: "bandPlain", rot: 90 }, right: { kind: "bandPlain", rot: 270 } });
      return [sheet(id("wraps"), nm(P("书型盒裱纸", "Book box wraps")), [cover, tray], mat, [...notes, DIE], qty)];
    }
    case "mailer": {
      const H = h;
      const tuck = Math.min(H * 0.7, 40);
      // columns: inner fold | side | base | side | inner fold ; rows: tuck | lid flap | lid | back wall | base | front wall | front inner
      const cx = H + H; // side wall + its inner fold
      const cols = [H, H, w, H, H];
      const xs = cols.reduce<number[]>((a, c) => [...a, a[a.length - 1] + c], [0]);
      const rows = [tuck, H, d, H, d, H, H];
      const ys = rows.reduce<number[]>((a, c) => [...a, a[a.length - 1] + c], [0]);
      const yBase = ys[4];
      const pts: [number, number][] = [
        [cx + 3, 0],
        [cx + w - 3, 0],
        [cx + w, ys[1]],
        [cx + w, ys[3]],
        [cx + w + H, ys[3] + 4],
        [cx + w + H, yBase],
        [xs[5], yBase + 4],
        [xs[5], yBase + d - 4],
        [cx + w + H, yBase + d],
        [cx + w, yBase + d],
        [cx + w, ys[7]],
        [cx, ys[7]],
        [cx, yBase + d],
        [H, yBase + d],
        [0, yBase + d - 4],
        [0, yBase + 4],
        [H, yBase],
        [H, ys[3] + 4],
        [cx, ys[3]],
        [cx, ys[1]],
      ];
      const local: Local = {
        id: "net",
        name: P("飞机盒展开图", "Mailer net"),
        w: xs[5],
        h: ys[7],
        cutPts: pts,
        folds: [
          [cx, ys[1], cx + w, ys[1]],
          [cx, ys[2], cx + w, ys[2]],
          [cx, ys[3], cx + w, ys[3]],
          [cx, yBase, cx + w, yBase],
          [cx, yBase + d, cx + w, yBase + d],
          [cx, ys[6], cx + w, ys[6]],
          [cx, yBase, cx, yBase + d],
          [cx + w, yBase, cx + w, yBase + d],
          [H, yBase, H, yBase + d],
          [cx + w + H, yBase, cx + w + H, yBase + d],
        ],
        glue: [],
        panels: [
          { kind: "band", x: cx, y: ys[1], w, h: H, rot: 180 },
          { kind: "front", x: cx, y: ys[2], w, h: d, rot: 180 },
          { kind: "bandPlain", x: cx, y: ys[3], w, h: H, rot: 180 },
          { kind: "bottom", x: cx, y: yBase, w, h: d, rot: 0, info: true },
          { kind: "bandPlain", x: cx, y: yBase + d, w, h: H, rot: 0 },
          { kind: "bandPlain", x: H, y: yBase, w: H, h: d, rot: 90 },
          { kind: "bandPlain", x: cx + w, y: yBase, w: H, h: d, rot: 270 },
        ],
        base: "ground",
      };
      return [sheet(id("net"), nm(P("飞机盒刀模", "Mailer die")), [local], mat, [...notes, DIE, P("结构参考 FEFCO 0427。", "Structure after FEFCO 0427.")], qty)];
    }
    case "drawer": {
      const G = 15;
      const strip = [
        ["top", w, 0, false],
        ["right", h, 90, false],
        ["bottom", w, 180, true],
        ["left", h, 270, false],
      ] as [FaceKind, number, Panel["rot"], boolean][];
      let x = 0;
      const panels: Panel[] = [];
      const folds: Line[] = [];
      for (const [kind, pw, rot, info] of strip) {
        panels.push({ kind: kind === "top" ? "front" : kind, x, y: 0, w: pw, h: d, rot, info });
        if (x > 0) folds.push([x, 0, x, d]);
        x += pw;
      }
      folds.push([x, 0, x, d]);
      const sleeve = rectPiece("sleeve", P("外套", "Sleeve"), x + G, d, panels, [{ x, y: 0, w: G, h: d }], folds);
      const tray = cross("tray", P("抽屉内盒", "Tray"), w - 4, d - 4, h - 4, 12, null, { front: { kind: "band", rot: 0 }, back: { kind: "bandPlain", rot: 180 }, left: { kind: "bandPlain", rot: 90 }, right: { kind: "bandPlain", rot: 270 } });
      return [sheet(id("parts"), nm(P("抽屉盒刀模", "Drawer box die")), [sleeve, tray], mat, [...notes, DIE], qty)];
    }
    case "paperTube": {
      const ov = 8;
      const parts = [wrapLabel("body", P("罐身裱纸", "Body wrap"), ra.wrap!.w, ra.wrap!.h, ov), rectPiece("lidband", P("盖身裱纸", "Lid wrap"), ra.lidBand!.w + ov, ra.lidBand!.h, [{ kind: "band", x: 0, y: 0, w: ra.lidBand!.w, h: ra.lidBand!.h, rot: 0 }], [{ x: ra.lidBand!.w, y: 0, w: ov, h: ra.lidBand!.h }]), disc("cap", P("盖顶贴纸", "Lid top"), ra.cap!, "tinCap")];
      return [sheet(id("wraps"), nm(P("纸罐裱纸", "Paper tube wraps")), parts, mat, [...notes, P("接缝处预留 8 mm 搭接。", "8 mm overlap at the seam.")], qty)];
    }
    case "bag": {
      const G = 20;
      const turn = 40;
      const bottom = d / 2 + 15;
      const half = d / 2;
      const xs = [G, G + w, G + w + d, G + 2 * w + d, G + 2 * w + 2 * d];
      const H = turn + h + bottom;
      const panels: Panel[] = [
        { kind: "front", x: xs[0], y: turn, w, h, rot: 0 },
        { kind: "bandPlain", x: xs[1], y: turn, w: d, h, rot: 0 },
        { kind: "back", x: xs[2], y: turn, w, h, rot: 0, info: true },
        { kind: "bandPlain", x: xs[3], y: turn, w: d, h, rot: 0 },
      ];
      const folds: Line[] = [
        ...xs.slice(0, 4).map((x) => [x, 0, x, H] as Line),
        [xs[1] + half, turn, xs[1] + half, turn + h],
        [xs[3] + half, turn, xs[3] + half, turn + h],
        [0, turn, xs[4], turn],
        [0, turn + h, xs[4], turn + h],
      ];
      return [sheet(id("net"), nm(P("手提袋刀模", "Bag die")), [rectPiece("net", P("袋身展开图", "Bag net"), xs[4], H, panels, [{ x: 0, y: 0, w: G, h: H }], folds)], mat, [...notes, DIE, P("顶部 40 mm 内折；绳孔位置由印厂确定。", "Top 40 mm folds inside; the printer sets the rope holes.")], qty)];
    }
    case "aseptic": {
      const seal = 8;
      const fin = d / 2 + 8;
      const xs = [0, w, w + d, 2 * w + d, 2 * w + 2 * d];
      const panels: Panel[] = [
        { kind: "front", x: xs[0], y: fin, w, h, rot: 0 },
        { kind: "right", x: xs[1], y: fin, w: d, h, rot: 0 },
        { kind: "back", x: xs[2], y: fin, w, h, rot: 0, info: true },
        { kind: "left", x: xs[3], y: fin, w: d, h, rot: 0 },
      ];
      const folds: Line[] = [...xs.slice(1, 5).map((x) => [x, fin, x, fin + h] as Line), [0, fin, xs[4], fin], [0, fin + h, xs[4], fin + h]];
      return [sheet(id("web"), nm(P("利乐砖版式", "Aseptic carton artwork")), [rectPiece("web", P("包材展开", "Packaging web"), xs[4] + seal, h + 2 * fin, panels, [{ x: xs[4], y: 0, w: seal, h: h + 2 * fin }], folds)], mat, [...notes, P("无菌包材由灌装厂提供规格，请按其版式模板套用。", "The filler supplies the web spec; fit this artwork to their template.")], qty)];
    }
    case "pouch": {
      const s = 8;
      const front = rectPiece("front", P("正面", "Front"), w, h, [{ kind: "front", x: 0, y: 0, w, h, rot: 0 }], [
        { x: 0, y: 0, w: s, h },
        { x: w - s, y: 0, w: s, h },
      ]);
      const back = rectPiece("back", P("背面", "Back"), w, h, [{ kind: "back", x: 0, y: 0, w, h, rot: 0, info: true }], [
        { x: 0, y: 0, w: s, h },
        { x: w - s, y: 0, w: s, h },
      ]);
      const gusset = rectPiece("gusset", P("底部", "Gusset"), w, d, [{ kind: "bandPlain", x: 0, y: 0, w, h: d, rot: 0 }], [], [[0, d / 2, w, d / 2]]);
      return [sheet(id("film"), nm(P("自立袋版面", "Pouch artwork")), [front, back, gusset], mat, [...notes, P("两侧 8 mm 为热封区，不放文字。", "8 mm each side is the heat seal; keep text out of it.")], qty)];
    }
    case "bottle":
    case "tube":
    case "tin":
    case "can":
    case "ceramic": {
      const ov = form === "tin" || form === "bottle" ? 6 : 0;
      const parts: Local[] = [wrapLabel("wrap", form === "tin" ? P("罐身印铁", "Body blank") : form === "ceramic" ? P("贴花纸", "Decal") : form === "can" ? P("罐身图案", "Body artwork") : form === "tube" ? P("管身图案", "Tube artwork") : P("瓶身标签", "Bottle label"), ra.wrap!.w, ra.wrap!.h, ov)];
      if (ra.cap) parts.push(disc("cap", P("盖顶", "Lid top"), ra.cap, "tinCap"));
      const extra = form === "can" || form === "tube" || form === "ceramic" ? [CURVED] : [];
      return [sheet(id("label"), nm(P(form === "tin" ? "马口铁罐印刷" : "标签与图案", form === "tin" ? "Tin print" : "Labels and artwork")), parts, mat, [...notes, ...extra], qty)];
    }
    case "jar":
    case "glassBottle": {
      const parts: Local[] = [rectPiece("front", P("正标", "Front label"), ra.front!.w, ra.front!.h, [{ kind: "front", x: 0, y: 0, w: ra.front!.w, h: ra.front!.h, rot: 0 }]), rectPiece("back", P("背标", "Back label"), ra.back!.w, ra.back!.h, [{ kind: "back", x: 0, y: 0, w: ra.back!.w, h: ra.back!.h, rot: 0, info: true }])];
      if ("neck" in ra && ra.neck) parts.push(rectPiece("neck", P("颈标", "Neck band"), ra.neck.w, ra.neck.h, [{ kind: "bandPlain", x: 0, y: 0, w: ra.neck.w, h: ra.neck.h, rot: 0 }]));
      if ("cap" in ra && ra.cap) parts.push(disc("cap", P("盖顶贴纸", "Lid sticker"), ra.cap, "tinCap"));
      return [sheet(id("labels"), nm(P("瓶罐标签", "Labels")), parts, mat, notes, qty)];
    }
    case "blister": {
      const card = (side: "front" | "back") => {
        const l = rectPiece(side, side === "front" ? P("卡纸正面", "Card front") : P("卡纸背面", "Card back"), w, h, [{ kind: side, x: 0, y: 0, w, h, rot: 0, info: side === "back" }]);
        return l;
      };
      return [sheet(id("card"), nm(P("泡罩卡纸", "Blister card")), [card("front"), card("back")], mat, [...notes, P("挂孔位置和吸塑泡壳由吸塑厂按产品开模。", "The hang hole and blister are tooled by the blister maker to fit the product.")], qty)];
    }
    case "woodBox":
      return [sheet(id("engrave"), nm(P("盖面激光雕刻", "Lid engraving")), [rectPiece("lid", P("盖面", "Lid"), w, d, [{ kind: "front", x: 0, y: 0, w, h: d, rot: 0 }], [], [], "none")], mat, [P("黑色部分为雕刻区域。", "Black areas are engraved."), P("标签信息请另做不干胶贴在箱底。", "Put label information on a sticker on the base.")], qty, "engrave")];
  }
}

/** Every printed part of a package, including the products packed inside a combination. */
export function printLayout(spec: PackSpec): PrintLayout {
  const sheets = sheetsFor(spec.form, spec.w, spec.h, spec.d, spec.finish);
  if (spec.inner) sheets.push(...sheetsFor(spec.inner.form, spec.inner.w, spec.inner.h, spec.inner.d, spec.finish, "inner-", spec.inner.count));
  return { sheets, bleed: BLEED, margin: MARGIN };
}

/** The panel that carries the label information on the outer package (null for a crate). */
export function infoPanels(layout: PrintLayout): { sheet: Sheet; panel: Panel }[] {
  const out: { sheet: Sheet; panel: Panel }[] = [];
  for (const s of layout.sheets) for (const p of s.pieces) for (const q of p.panels) if (q.info) out.push({ sheet: s, panel: q });
  return out;
}

/** Size of the artwork drawn for a panel (before rotation). */
export const artSize = (p: Panel) => (p.rot === 90 || p.rot === 270 ? { w: p.h, h: p.w } : { w: p.w, h: p.h });

/** Back section of a full wrap, in mm (where the label table goes). */
export const wrapBack = (circ: number, h: number) => ({ w: circ * WRAP_FRONT, h });

export { rectPath };
