/**
 * Dielines as drawings a die-maker and a printer work from: every printed part's cut and crease
 * lines at 1:1 in millimetres, glue areas, dimension chains read off the creases (so each panel's
 * size is stated, not just the overall blank), the rule lengths a cutting die is priced by, and a
 * title block. Also the press-sheet layout (拼版): every blank on the sheet as the quote runs it,
 * with the gripper edge, for the die board itself.
 *
 * Pure geometry, client-safe: the DXF, SVG and PDF writers draw these.
 */
import type { Pair } from "../i18n";
import type { Line, Piece, PrintLayout, Sheet } from "./layout";
import { finishText, FORM_LABELS, outerSize, type PackSpec } from "../pack";
import { wallMm } from "../spec/wall";
import { FULL_SHEETS, PRESSES } from "../spec/rates";
import { placeUps, usable, type Imposition } from "../spec/impose";

export type Pt = [number, number];
export type Shape = { kind: "poly"; pts: Pt[] } | { kind: "circle"; cx: number; cy: number; r: number };
export type Rect = { x: number; y: number; w: number; h: number };
/** A dimension: measured from a to b along the axis, drawn `off` mm away (negative: above or left). */
export type Dim = { axis: "x" | "y"; a: number; b: number; at: number; value: number };
export type Label = { x: number; y: number; size: number; text: Pair; anchor?: "start" | "middle" | "end" };

export type Drawing = {
  id: string;
  title: Pair;
  /** drawing extents, mm */
  w: number;
  h: number;
  cuts: Shape[];
  creases: Line[];
  glue: Rect[];
  dims: Dim[];
  labels: Label[];
  /** the press sheet and its gripper, for a layout */
  sheet?: Rect;
  gripper?: Rect;
  /** the title block's lines */
  info: Pair[];
  /** total rule, mm */
  rule: { cut: number; crease: number };
};

const P = (zh: string, en: string): Pair => ({ zh, en });
const r1 = (v: number) => Math.round(v * 10) / 10;
export const mmText = (v: number) => (Math.abs(v - Math.round(v)) < 0.05 ? String(Math.round(v)) : v.toFixed(1));

/** Our cut paths are polygons (M, L, Z) or circles drawn as two half arcs. */
export function shapeOf(cut: string): Shape {
  const nums = (cut.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
  if (/A/.test(cut)) {
    // M x0 y A r r 0 1 0 x1 y …: the centre is midway along the diameter
    const [x0, y0, r] = [nums[0], nums[1], nums[2]];
    return { kind: "circle", cx: x0 + r, cy: y0, r };
  }
  const pts: Pt[] = [];
  for (let i = 0; i + 1 < nums.length; i += 2) pts.push([nums[i], nums[i + 1]]);
  return { kind: "poly", pts };
}

export function shapeLength(s: Shape): number {
  if (s.kind === "circle") return 2 * Math.PI * s.r;
  let l = 0;
  for (let i = 0; i < s.pts.length; i++) {
    const [a, b] = [s.pts[i], s.pts[(i + 1) % s.pts.length]];
    l += Math.hypot(b[0] - a[0], b[1] - a[1]);
  }
  return l;
}
const lineLength = ([x1, y1, x2, y2]: Line) => Math.hypot(x2 - x1, y2 - y1);

/** Rule a piece's die needs, mm: the cut outline and the creases. */
export function ruleOf(p: Piece): { cut: number; crease: number } {
  return { cut: shapeLength(shapeOf(p.cut)), crease: p.folds.reduce((a, f) => a + lineLength(f), 0) };
}

/* ---------------------------------------------------------------- moving pieces */

type Xf = (p: Pt) => Pt;
const moveShape = (s: Shape, f: Xf): Shape => {
  if (s.kind === "circle") {
    const [cx, cy] = f([s.cx, s.cy]);
    return { ...s, cx, cy };
  }
  return { kind: "poly", pts: s.pts.map(f) };
};
const moveLine = ([x1, y1, x2, y2]: Line, f: Xf): Line => {
  const a = f([x1, y1]);
  const b = f([x2, y2]);
  return [a[0], a[1], b[0], b[1]];
};
const moveRect = (r: Rect, f: Xf): Rect => {
  const a = f([r.x, r.y]);
  const b = f([r.x + r.w, r.y + r.h]);
  return { x: Math.min(a[0], b[0]), y: Math.min(a[1], b[1]), w: Math.abs(b[0] - a[0]), h: Math.abs(b[1] - a[1]) };
};

/** Dimension chains of a piece at its place: panel sizes from the creases, then the overall size. */
function chains(p: Piece, f: Xf): Dim[] {
  const [x0, y0] = f([p.x, p.y]);
  const x1 = x0 + p.w;
  const y1 = y0 + p.h;
  const folds = p.folds.map((l) => moveLine(l, f));
  const uniq = (v: number[]) => [...new Set(v.map(r1))].sort((a, b) => a - b);
  const xs = uniq([x0, ...folds.filter(([a, , c]) => Math.abs(a - c) < 0.05).map(([a]) => a), x1]).filter((x) => x >= x0 - 0.05 && x <= x1 + 0.05);
  const ys = uniq([y0, ...folds.filter(([, b, , d]) => Math.abs(b - d) < 0.05).map(([, b]) => b), y1]).filter((y) => y >= y0 - 0.05 && y <= y1 + 0.05);
  const out: Dim[] = [];
  const chain = (axis: "x" | "y", v: number[], at: number) => {
    for (let i = 0; i + 1 < v.length; i++) if (v[i + 1] - v[i] > 1.5) out.push({ axis, a: v[i], b: v[i + 1], at, value: v[i + 1] - v[i] });
  };
  const xChain = xs.length > 2 && xs.length <= 14;
  const yChain = ys.length > 2 && ys.length <= 14;
  if (xChain) chain("x", xs, y0 - 9);
  out.push({ axis: "x", a: x0, b: x1, at: y0 - (xChain ? 19 : 9), value: p.w });
  if (yChain) chain("y", ys, x0 - 9);
  out.push({ axis: "y", a: y0, b: y1, at: x0 - (yChain ? 19 : 9), value: p.h });
  return out;
}

/** A piece's lines, moved by f. */
function pieceLines(p: Piece, f: Xf) {
  return { cut: moveShape(shapeOf(p.cut), f), creases: p.folds.map((l) => moveLine(l, f)), glue: p.glue.map((g) => moveRect(g, f)) };
}

/* ---------------------------------------------------------------- the parts' dielines */

const LEFT = 42;
const TOP = 46;
const GAP_X = 60;
const TITLE_H = 58;

/** The structure's size line and board thickness, for the title block. */
export function sizeInfo(spec: PackSpec): Pair[] {
  const o = outerSize(spec);
  const key = spec.form === "gift" || spec.form === "bookBox" || spec.form === "drawer" || spec.form === "brocade" ? "core" : "body";
  const t = wallMm(spec, key, 0);
  const lines: Pair[] = [P(`结构：${FORM_LABELS[spec.form].zh}　${finishText(spec, "zh")}`, `Structure: ${FORM_LABELS[spec.form].en}, ${finishText(spec, "en")}`)];
  lines.push(P(`尺寸（按压痕线）：${o.w} × ${o.d} × ${o.h} mm（长 × 宽 × 高）`, `Size (crease to crease): ${o.w} × ${o.d} × ${o.h} mm (L × W × H)`));
  if (t) lines.push(P(`板厚约 ${t} mm，内尺寸约 ${mmText(o.w - 2 * t)} × ${mmText(o.d - 2 * t)} × ${mmText(o.h - 2 * t)} mm`, `Board about ${t} mm; inside about ${mmText(o.w - 2 * t)} × ${mmText(o.d - 2 * t)} × ${mmText(o.h - 2 * t)} mm`));
  return lines;
}

/** One drawing per die-cut part of the pack (its pieces side by side, with dimensions). */
export function dieDrawings(spec: PackSpec, layout: PrintLayout, product: string): Drawing[] {
  const date = new Date().toISOString().slice(0, 10);
  // no cutting die: a laser-engraved crate lid, print on a tin, can or porcelain (made by their
  // makers), a pouch (sealed and cut on the bag machine) and an aseptic web
  const NO_DIE = ["tin", "can", "ceramic", "pouch", "aseptic"];
  const formOf = (s: Sheet) => (s.id.startsWith("inner-") ? spec.inner?.form : spec.form) ?? spec.form;
  return layout.sheets.filter((s) => s.process === "print" && !NO_DIE.includes(formOf(s))).map((s) => sheetDrawing(spec, s, product, date));
}

function sheetDrawing(spec: PackSpec, s: Sheet, product: string, date: string): Drawing {
  const d: Drawing = { id: s.id, title: s.name, w: 0, h: 0, cuts: [], creases: [], glue: [], dims: [], labels: [], info: [], rule: { cut: 0, crease: 0 } };
  let x = LEFT;
  let maxH = 0;
  for (const p of s.pieces) {
    const f: Xf = ([px, py]) => [px - p.x + x, py - p.y + TOP];
    const l = pieceLines(p, f);
    d.cuts.push(l.cut);
    d.creases.push(...l.creases);
    d.glue.push(...l.glue);
    d.dims.push(...chains(p, f));
    const r = ruleOf(p);
    d.rule.cut += r.cut;
    d.rule.crease += r.crease;
    d.labels.push({ x: x + p.w / 2, y: TOP + p.h + 12, size: 4, text: s.pieces.length > 1 ? p.name : s.name, anchor: "middle" });
    x += p.w + GAP_X;
    maxH = Math.max(maxH, p.h);
  }
  d.w = Math.max(x - GAP_X + 20, 260);
  const titleY = TOP + maxH + 26;
  d.h = titleY + TITLE_H;
  d.info = [
    P(`${product} · ${s.name.zh}${s.qty > 1 ? ` × ${s.qty}` : ""}`, `${product}: ${s.name.en}${s.qty > 1 ? ` × ${s.qty}` : ""}`),
    ...sizeInfo(spec),
    s.material,
    P(`刀线 ${mmText(d.rule.cut / 1000)} m，压痕线 ${mmText(d.rule.crease / 1000)} m（每模）`, `Cutting rule ${mmText(d.rule.cut / 1000)} m, creasing rule ${mmText(d.rule.crease / 1000)} m (per up)`),
    P(`刀模图 · 单位 mm · 比例 1:1 · 实线 = 切线　虚线 = 压痕　灰 = 糊位 · ${date}`, `Dieline · units mm · scale 1:1 · solid = cut, dashed = crease, grey = glue · ${date}`),
  ];
  return d;
}

/* ---------------------------------------------------------------- the press sheet (拼版) */

/**
 * The press-sheet layout of one printed part as the quote runs it: every blank (or set of blanks,
 * side by side or one above the other) placed on the sheet, the gripper edge marked.
 */
export function layoutDrawing(spec: PackSpec, pieces: Piece[], imp: Imposition, arrange: "single" | "row" | "col", name: Pair, product: string): Drawing {
  const MX = 30;
  const MY = 30;
  const [SW, SH] = imp.sheet;
  const u = usable(imp.sheet);
  // the set's own frame: pieces side by side or stacked, 5 mm apart
  const offs: Pt[] = [];
  let sw = 0;
  let sh = 0;
  for (const p of pieces) {
    if (arrange === "col") {
      offs.push([0, sh]);
      sh += p.h + 5;
      sw = Math.max(sw, p.w);
    } else {
      offs.push([sw, 0]);
      sw += p.w + 5;
      sh = Math.max(sh, p.h);
    }
  }
  if (arrange === "col") sh -= 5;
  else sw -= 5;
  const placed = placeUps(u.w, u.h, sw, sh);
  const d: Drawing = { id: `layout-${name.en}`, title: P(`拼版：${name.zh}`, `Sheet layout: ${name.en}`), w: SW + 2 * MX, h: SH + 2 * MY + TITLE_H, cuts: [], creases: [], glue: [], dims: [], labels: [], info: [], rule: { cut: 0, crease: 0 }, sheet: { x: MX, y: MY, w: SW, h: SH }, gripper: { x: MX, y: MY, w: SW, h: u.y } };
  for (const up of placed.ups) {
    const ox = MX + u.x + up.x;
    const oy = MY + u.y + up.y;
    pieces.forEach((p, i) => {
      const [px0, py0] = offs[i];
      // the set's local point, then turned a quarter (clockwise) when the up is turned
      const f: Xf = ([px, py]) => {
        const lx = px - p.x + px0;
        const ly = py - p.y + py0;
        return up.rot ? [ox + (sh - ly), oy + lx] : [ox + lx, oy + ly];
      };
      const l = pieceLines(p, f);
      d.cuts.push(l.cut);
      d.creases.push(...l.creases);
      d.glue.push(...l.glue);
      const r = ruleOf(p);
      d.rule.cut += r.cut;
      d.rule.crease += r.crease;
    });
  }
  d.dims.push({ axis: "x", a: MX, b: MX + SW, at: MY - 12, value: SW }, { axis: "y", a: MY, b: MY + SH, at: MX - 12, value: SH });
  d.labels.push({ x: MX + SW / 2, y: MY + u.y - 3, size: 4, text: P(`咬口 ${u.y} mm`, `Gripper ${u.y} mm`), anchor: "middle" });
  const fam = FULL_SHEETS[imp.family].label;
  const press = PRESSES.find((p) => p.id === imp.press)!.label;
  d.info = [
    P(`${product} · ${name.zh}`, `${product}: ${name.en}`),
    P(`${fam.zh}${imp.cutLabel.zh} ${SW} × ${SH} mm，${press.zh}，${placed.n} 模（${placed.layout}），用纸率 ${Math.round(imp.use * 100)}%`, `${fam.en} ${imp.cutLabel.en} sheet ${SW} × ${SH} mm, ${press.en.toLowerCase()}, ${placed.n}-up (${placed.layout}), ${Math.round(imp.use * 100)}% of the sheet used`),
    ...sizeInfo(spec).slice(1, 2),
    P(`整版刀线 ${mmText(d.rule.cut / 1000)} m，压痕线 ${mmText(d.rule.crease / 1000)} m`, `Die board: cutting rule ${mmText(d.rule.cut / 1000)} m, creasing rule ${mmText(d.rule.crease / 1000)} m`),
    P("矩形排布为保守算法；刀模厂可按咬合套排再多排几模。单位 mm，比例 1:1。", "A conservative rectangular layout; the die-maker may nest a few more. Units mm, scale 1:1."),
  ];
  return d;
}

/**
 * Every die drawing for a pack: each printed part's dieline, then the press-sheet layout of each
 * sheet-printed part as the quote runs it at `qty`.
 */
export function allDieDrawings(spec: PackSpec, layout: PrintLayout, product: string, layouts: { pieces: Piece[]; imposition: Imposition; arrange: "single" | "row" | "col"; name: Pair }[]): Drawing[] {
  return [...dieDrawings(spec, layout, product), ...layouts.map((l) => layoutDrawing(spec, l.pieces, l.imposition, l.arrange, l.name, product))];
}
