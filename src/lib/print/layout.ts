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
import type { Effect, Finish, Form, PackSpec } from "../pack";
import { flatOf, foldsFor, type FoldPiece } from "./folds";

export type FaceKind = "front" | "back" | "left" | "right" | "top" | "bottom" | "flap" | "band" | "bandPlain" | "baseSide" | "tinWrap" | "tinCap" | "inner" | "manual";

/** rot: clockwise quarter turns applied to the upright artwork. arc: degrees the panel wraps round a curved body. */
export type Panel = { kind: FaceKind; x: number; y: number; w: number; h: number; rot: 0 | 90 | 180 | 270; info?: boolean; arc?: number };

/** How far the labels of a jar and a glass bottle wrap round the body, in degrees (3D and print). */
export const LABEL_ARC = { jar: 150, glassBottle: 130, back: 100 } as const;
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
      return { front: { w: R * ((LABEL_ARC.jar * Math.PI) / 180), h: lh, arc: LABEL_ARC.jar }, back: { w: R * ((LABEL_ARC.back * Math.PI) / 180), h: lh, arc: LABEL_ARC.back }, cap: 2 * (rnO + 2.4) };
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
      return { front: { w: R * ((LABEL_ARC.glassBottle * Math.PI) / 180), h: lh, arc: LABEL_ARC.glassBottle }, back: { w: R * ((LABEL_ARC.back * Math.PI) / 180), h: lh, arc: LABEL_ARC.back }, neck: nb1 - nb0 > 5 ? { w: 2 * Math.PI * rn, h: nb1 - nb0 } : undefined };
    }
    default:
      return {};
  }
}

/** Share of a full wrap given to the front (and to the back) panel. Matches art.ts. */
export const WRAP_FRONT = 0.3;

/* ---------------------------------------------------------------- folded nets */

/**
 * A folded piece's flat net, from the shared fold description (folds.ts): the same panels the
 * homepage film folds, so the printed net and the folded pack cannot disagree.
 */
function fromFolds(piece: FoldPiece): Local {
  const f = flatOf(piece);
  const ox = f.box.x;
  const oy = f.box.y;
  return {
    id: piece.id,
    name: piece.name,
    w: f.box.w,
    h: f.box.h,
    cutPts: f.cut.map(([x, y]) => [x - ox, y - oy] as [number, number]),
    folds: f.creases.map(([a, b, c, d]) => [a - ox, b - oy, c - ox, d - oy] as Line),
    glue: f.glue.map((g) => ({ x: g.x - ox, y: g.y - oy, w: g.w, h: g.h })),
    panels: f.art.map((a) => ({ kind: a.art.kind as FaceKind, x: a.x - ox, y: a.y - oy, w: a.w, h: a.h, rot: a.art.rot, info: a.art.info })),
    base: piece.base,
  };
}
const nets = (form: Form, w: number, h: number, d: number) => foldsFor(form, w, h, d)!.pieces.map(fromFolds);

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
  softTouch: P("表面处理：覆触感膜（丝绒膜）", "Finish: soft-touch (velvet) lamination"),
  paper: P("表面处理：特种纸，不覆膜", "Finish: textured paper, no lamination"),
};

/** Each extra effect gets its own plate in the print file. */
export const EFFECT_NOTE: Record<Effect, Pair> = {
  goldFoil: P("烫金：品名与重点图形，烫金版单独一页（黑色为烫印区域）", "Gold foil on the name and key graphics; the foil plate is on its own page (black = foil)"),
  silverFoil: P("烫银：品名与重点图形，烫银版单独一页", "Silver foil on the name and key graphics; plate on its own page"),
  holo: P("镭射膜烫印：品名与重点图形，镭射版单独一页", "Holographic foil on the name and key graphics; plate on its own page"),
  spotUV: P("局部 UV：品名与重点图形上亮油，UV 版单独一页", "Spot UV gloss on the name and key graphics; UV plate on its own page"),
  emboss: P("击凸：品名与重点图形凸起，击凸版单独一页，印厂据此做阴阳模", "Emboss on the name and key graphics; the emboss plate is on its own page for the printer's male and female dies"),
};

const DIE = P("刀线和压痕为标准结构，开模前请以印厂刀模为准。", "Cut and crease lines are a standard structure; use your printer's die line before cutting.");
const CURVED = P("此为平面展开示意，曲面印刷的变形由印厂补偿。", "A flat representation; the printer compensates for printing on the curve.");

function sheetsFor(form: Form, w: number, h: number, d: number, finish: Finish, prefix = "", qty = 1, effects: Effect[] = []): Sheet[] {
  const mat = MAT[form];
  const notes = [FINISH_NOTE[finish], ...effects.map((e) => EFFECT_NOTE[e])];
  const id = (s: string) => prefix + s;
  const nm = (p: Pair): Pair => (prefix ? { zh: `内装 · ${p.zh}`, en: `Inside · ${p.en}` } : p);
  const ra = roundAreas(form, w, h);
  switch (form) {
    case "carton":
      return [sheet(id("net"), nm(P("直立盒刀模", "Tuck carton die")), nets("carton", w, h, d), mat, [...notes, DIE], qty)];
    case "gift":
      return [sheet(id("wraps"), nm(P("天地盖裱纸", "Gift box wraps")), nets("gift", w, h, d), mat, [...notes, DIE, P("盒底印有标签信息。", "Label information is printed on the base.")], qty)];
    case "bookBox":
      return [sheet(id("wraps"), nm(P("书型盒裱纸", "Book box wraps")), nets("bookBox", w, h, d), mat, [...notes, DIE], qty)];
    case "mailer":
      return [sheet(id("net"), nm(P("飞机盒刀模", "Mailer die")), nets("mailer", w, h, d), mat, [...notes, DIE, P("结构参考 FEFCO 0427：前墙与侧墙双层卷边，盒盖带插舌和防尘耳。", "Structure after FEFCO 0427: rolled double front and side walls, a lid with a tuck and dust ears.")], qty)];
    case "drawer":
      return [sheet(id("parts"), nm(P("抽屉盒刀模", "Drawer box die")), nets("drawer", w, h, d), mat, [...notes, DIE], qty)];
    case "paperTube": {
      const ov = 8;
      const parts = [wrapLabel("body", P("罐身裱纸", "Body wrap"), ra.wrap!.w, ra.wrap!.h, ov), rectPiece("lidband", P("盖身裱纸", "Lid wrap"), ra.lidBand!.w + ov, ra.lidBand!.h, [{ kind: "band", x: 0, y: 0, w: ra.lidBand!.w, h: ra.lidBand!.h, rot: 0, arc: 360 }], [{ x: ra.lidBand!.w, y: 0, w: ov, h: ra.lidBand!.h }]), disc("cap", P("盖顶贴纸", "Lid top"), ra.cap!, "tinCap")];
      return [sheet(id("wraps"), nm(P("纸罐裱纸", "Paper tube wraps")), parts, mat, [...notes, P("接缝处预留 8 mm 搭接。", "8 mm overlap at the seam.")], qty)];
    }
    case "bag":
      return [sheet(id("net"), nm(P("手提袋刀模", "Bag die")), nets("bag", w, h, d), mat, [...notes, DIE, P("顶部 40 mm 内折；绳孔位置由印厂确定。", "Top 40 mm folds inside; the printer sets the rope holes.")], qty)];
    case "aseptic":
      return [sheet(id("web"), nm(P("利乐砖版式", "Aseptic carton artwork")), nets("aseptic", w, h, d), mat, [...notes, P("无菌包材由灌装厂提供规格，请按其版式模板套用。", "The filler supplies the web spec; fit this artwork to their template.")], qty)];
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
      const parts: Local[] = [rectPiece("front", P("正标", "Front label"), ra.front!.w, ra.front!.h, [{ kind: "front", x: 0, y: 0, w: ra.front!.w, h: ra.front!.h, rot: 0, arc: ra.front!.arc }]), rectPiece("back", P("背标", "Back label"), ra.back!.w, ra.back!.h, [{ kind: "back", x: 0, y: 0, w: ra.back!.w, h: ra.back!.h, rot: 0, info: true, arc: ra.back!.arc }])];
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
  const fx = spec.effects ?? [];
  const sheets = sheetsFor(spec.form, spec.w, spec.h, spec.d, spec.finish, "", 1, fx);
  if (spec.inner) sheets.push(...sheetsFor(spec.inner.form, spec.inner.w, spec.inner.h, spec.inner.d, spec.finish, "inner-", spec.inner.count, fx));
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

/** Area of a piece inside its cut line, in mm² (shoelace for polygons, πr² for discs). */
export function pieceArea(p: Piece): number {
  const arc = p.cut.match(/A(-?\d+(?:\.\d+)?)/);
  if (arc) return Math.PI * Number(arc[1]) ** 2;
  const pts = (p.cut.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
  let a = 0;
  for (let i = 0; i + 3 < pts.length; i += 2) a += pts[i] * pts[i + 3] - pts[i + 2] * pts[i + 1];
  const n = pts.length;
  if (n >= 4) a += pts[n - 2] * pts[1] - pts[0] * pts[n - 1];
  return Math.abs(a) / 2;
}

/** Printed material for one package: total area (m²) and the largest part (mm). */
export function materialUse(spec: PackSpec): { m2: number; largest: { w: number; h: number; name: Pair } } {
  const lay = printLayout(spec);
  let m2 = 0;
  let largest = { w: 0, h: 0, name: { zh: "", en: "" } };
  for (const s of lay.sheets)
    for (const p of s.pieces) {
      m2 += (pieceArea(p) * s.qty) / 1e6;
      if (p.w * p.h > largest.w * largest.h) largest = { w: Math.round(p.w), h: Math.round(p.h), name: p.name };
    }
  return { m2, largest };
}
