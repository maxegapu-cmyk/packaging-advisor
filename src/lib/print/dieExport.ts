/**
 * Writes die drawings as files the trade opens:
 *  - DXF (R12, the most widely read version): what die-makers' CAD and cutting tables import.
 *    Layers CUT (red), CREASE (blue, dashed), GLUE, DIM, TEXT and SHEET; millimetres; Chinese
 *    text as \U+ escapes in a TrueType style, as AutoCAD and CorelDRAW read it.
 *  - SVG: for Illustrator, Inkscape and the browser, each layer a named group.
 * Several drawings go in one file, one above the other. Pure, client-safe.
 */
import type { Lang, Pair } from "../i18n";
import { mmText, type Dim, type Drawing, type Shape } from "./die";

const SPACE = 60;
const one = (p: Pair, lang: Lang) => (lang === "en" ? p.en : p.zh);
const both = (p: Pair, lang: Lang) => (lang === "en" ? p.en : `${p.zh}  ${p.en}`);
const f3 = (v: number) => (Math.round(v * 1000) / 1000).toString();

/** Stacked drawings: the vertical offset of each, and the whole height. */
function stack(ds: Drawing[]) {
  const offs: number[] = [];
  let y = 0;
  for (const d of ds) {
    offs.push(y);
    y += d.h + SPACE;
  }
  return { offs, w: Math.max(...ds.map((d) => d.w), 100), h: Math.max(y - SPACE, 100) };
}

/** Title block lines under a drawing: (x, y, size, text). */
function infoLines(d: Drawing, lang: Lang): { x: number; y: number; size: number; text: string }[] {
  const out: { x: number; y: number; size: number; text: string }[] = [];
  const base = d.sheet ? d.sheet.y + d.sheet.h + 18 : d.h - 52;
  const x = d.sheet ? d.sheet.x : 22;
  out.push({ x, y: base, size: 5, text: both(d.title, lang) });
  d.info.forEach((p, i) => out.push({ x, y: base + 9 + i * 6.2, size: 3.2, text: one(p, lang) }));
  return out;
}

/** A dimension as lines (extension lines, the dimension line, ticks) and its text position. */
function dimGeometry(m: Dim) {
  const lines: [number, number, number, number][] = [];
  const t = 1.6;
  if (m.axis === "x") {
    lines.push([m.a, m.at, m.b, m.at]);
    lines.push([m.a, m.at - 2, m.a, m.at + 5], [m.b, m.at - 2, m.b, m.at + 5]);
    lines.push([m.a - t, m.at + t, m.a + t, m.at - t], [m.b - t, m.at + t, m.b + t, m.at - t]);
    return { lines, tx: (m.a + m.b) / 2, ty: m.at - 1.2, rot: 0 };
  }
  lines.push([m.at, m.a, m.at, m.b]);
  lines.push([m.at - 2, m.a, m.at + 5, m.a], [m.at - 2, m.b, m.at + 5, m.b]);
  lines.push([m.at - t, m.a + t, m.at + t, m.a - t], [m.at - t, m.b + t, m.at + t, m.b - t]);
  return { lines, tx: m.at - 1.2, ty: (m.a + m.b) / 2, rot: -90 };
}

/* ---------------------------------------------------------------- DXF */

const dxfText = (s: string) => s.replace(/[^\x20-\x7e]/g, (c) => `\\U+${c.codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0")}`);

export function toDxf(ds: Drawing[], lang: Lang): string {
  const { offs, w, h } = stack(ds);
  const out: string[] = [];
  const g = (code: number, v: string | number) => out.push(String(code), typeof v === "number" ? f3(v) : v);
  const Y = (y: number, off: number) => h - (y + off);
  // header
  g(0, "SECTION");
  g(2, "HEADER");
  g(9, "$ACADVER");
  g(1, "AC1009");
  g(9, "$DWGCODEPAGE");
  g(3, "ANSI_936");
  g(9, "$INSUNITS");
  g(70, "4");
  g(9, "$EXTMIN");
  g(10, 0);
  g(20, 0);
  g(9, "$EXTMAX");
  g(10, w);
  g(20, h);
  g(0, "ENDSEC");
  // tables: line types, layers, a text style that can draw Chinese
  g(0, "SECTION");
  g(2, "TABLES");
  g(0, "TABLE");
  g(2, "LTYPE");
  g(70, "2");
  g(0, "LTYPE");
  g(2, "CONTINUOUS");
  g(70, "0");
  g(3, "Solid line");
  g(72, "65");
  g(73, "0");
  g(40, 0);
  g(0, "LTYPE");
  g(2, "DASHED");
  g(70, "0");
  g(3, "__ __ __");
  g(72, "65");
  g(73, "2");
  g(40, 5);
  g(49, 3);
  g(49, -2);
  g(0, "ENDTAB");
  const layers: [string, number, string][] = [
    ["CUT", 1, "CONTINUOUS"],
    ["CREASE", 5, "DASHED"],
    ["GLUE", 8, "CONTINUOUS"],
    ["DIM", 3, "CONTINUOUS"],
    ["TEXT", 7, "CONTINUOUS"],
    ["SHEET", 6, "CONTINUOUS"],
  ];
  g(0, "TABLE");
  g(2, "LAYER");
  g(70, String(layers.length));
  for (const [name, color, lt] of layers) {
    g(0, "LAYER");
    g(2, name);
    g(70, "0");
    g(62, String(color));
    g(6, lt);
  }
  g(0, "ENDTAB");
  g(0, "TABLE");
  g(2, "STYLE");
  g(70, "1");
  g(0, "STYLE");
  g(2, "CN");
  g(70, "0");
  g(40, 0);
  g(41, 1);
  g(50, 0);
  g(71, "0");
  g(42, 3);
  g(3, "simsun.ttf");
  g(4, "");
  g(0, "ENDTAB");
  g(0, "ENDSEC");
  // entities
  g(0, "SECTION");
  g(2, "ENTITIES");
  const line = (layer: string, x1: number, y1: number, x2: number, y2: number, off: number) => {
    g(0, "LINE");
    g(8, layer);
    g(10, x1);
    g(20, Y(y1, off));
    g(30, 0);
    g(11, x2);
    g(21, Y(y2, off));
    g(31, 0);
  };
  const shape = (s: Shape, layer: string, off: number) => {
    if (s.kind === "circle") {
      g(0, "CIRCLE");
      g(8, layer);
      g(10, s.cx);
      g(20, Y(s.cy, off));
      g(30, 0);
      g(40, s.r);
      return;
    }
    g(0, "POLYLINE");
    g(8, layer);
    g(66, "1");
    // R12 readers expect the (unused) polyline point before the flags
    g(10, 0);
    g(20, 0);
    g(30, 0);
    g(70, "1");
    for (const [x, y] of s.pts) {
      g(0, "VERTEX");
      g(8, layer);
      g(10, x);
      g(20, Y(y, off));
      g(30, 0);
    }
    g(0, "SEQEND");
    g(8, layer);
  };
  const text = (layer: string, x: number, y: number, size: number, t: string, off: number, align: 0 | 1 = 0, rot = 0) => {
    g(0, "TEXT");
    g(8, layer);
    g(7, "CN");
    g(10, x);
    g(20, Y(y, off));
    g(30, 0);
    g(40, size);
    g(1, dxfText(t));
    if (rot) g(50, rot);
    if (align) {
      g(72, String(align));
      g(11, x);
      g(21, Y(y, off));
      g(31, 0);
    }
  };
  ds.forEach((d, i) => {
    const off = offs[i];
    if (d.sheet) {
      const s = d.sheet;
      shape({ kind: "poly", pts: [[s.x, s.y], [s.x + s.w, s.y], [s.x + s.w, s.y + s.h], [s.x, s.y + s.h]] }, "SHEET", off);
      if (d.gripper) line("SHEET", d.gripper.x, d.gripper.y + d.gripper.h, d.gripper.x + d.gripper.w, d.gripper.y + d.gripper.h, off);
    }
    for (const r of d.glue) shape({ kind: "poly", pts: [[r.x, r.y], [r.x + r.w, r.y], [r.x + r.w, r.y + r.h], [r.x, r.y + r.h]] }, "GLUE", off);
    for (const c of d.cuts) shape(c, "CUT", off);
    for (const [x1, y1, x2, y2] of d.creases) line("CREASE", x1, y1, x2, y2, off);
    for (const m of d.dims) {
      const gm = dimGeometry(m);
      for (const [x1, y1, x2, y2] of gm.lines) line("DIM", x1, y1, x2, y2, off);
      // DXF rotation is counter-clockwise with y up: a vertical dimension reads bottom to top
      text("DIM", gm.tx, gm.ty, 3, mmText(m.value), off, 1, gm.rot ? 90 : 0);
    }
    for (const l of d.labels) text("TEXT", l.x, l.y, l.size, one(l.text, lang), off, l.anchor === "middle" ? 1 : 0);
    for (const t of infoLines(d, lang)) text("TEXT", t.x, t.y, t.size, t.text, off);
  });
  g(0, "ENDSEC");
  g(0, "EOF");
  return out.join("\r\n") + "\r\n";
}

/* ---------------------------------------------------------------- SVG */

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function toSvg(ds: Drawing[], lang: Lang): string {
  const { offs, w, h } = stack(ds);
  const layer = (id: string, label: string, body: string, style: string) => `<g id="${id}" inkscape:groupmode="layer" inkscape:label="${label}" ${style}>${body}</g>`;
  const pathOf = (s: Shape, dy: number) => (s.kind === "circle" ? `<circle cx="${f3(s.cx)}" cy="${f3(s.cy + dy)}" r="${f3(s.r)}"/>` : `<path d="M${s.pts.map(([x, y]) => `${f3(x)} ${f3(y + dy)}`).join(" L")} Z"/>`);
  let sheet = "";
  let glue = "";
  let cut = "";
  let crease = "";
  let dim = "";
  let txt = "";
  ds.forEach((d, i) => {
    const dy = offs[i];
    if (d.sheet) {
      sheet += `<rect x="${d.sheet.x}" y="${d.sheet.y + dy}" width="${d.sheet.w}" height="${d.sheet.h}"/>`;
      if (d.gripper) sheet += `<rect x="${d.gripper.x}" y="${d.gripper.y + dy}" width="${d.gripper.w}" height="${d.gripper.h}" fill="#C9CED3" fill-opacity="0.45" stroke="none"/>`;
    }
    for (const r of d.glue) glue += `<rect x="${f3(r.x)}" y="${f3(r.y + dy)}" width="${f3(r.w)}" height="${f3(r.h)}"/>`;
    for (const c of d.cuts) cut += pathOf(c, dy);
    for (const [x1, y1, x2, y2] of d.creases) crease += `<line x1="${f3(x1)}" y1="${f3(y1 + dy)}" x2="${f3(x2)}" y2="${f3(y2 + dy)}"/>`;
    for (const m of d.dims) {
      const gm = dimGeometry(m);
      for (const [x1, y1, x2, y2] of gm.lines) dim += `<line x1="${f3(x1)}" y1="${f3(y1 + dy)}" x2="${f3(x2)}" y2="${f3(y2 + dy)}"/>`;
      dim += `<text x="${f3(gm.tx)}" y="${f3(gm.ty + dy)}" text-anchor="middle"${gm.rot ? ` transform="rotate(${gm.rot} ${f3(gm.tx)} ${f3(gm.ty + dy)})"` : ""} stroke="none" fill="#2E7D32" font-size="3">${mmText(m.value)}</text>`;
    }
    for (const l of d.labels) txt += `<text x="${f3(l.x)}" y="${f3(l.y + dy)}" font-size="${l.size}" text-anchor="${l.anchor ?? "start"}">${esc(one(l.text, lang))}</text>`;
    for (const t of infoLines(d, lang)) txt += `<text x="${f3(t.x)}" y="${f3(t.y + dy)}" font-size="${t.size}">${esc(t.text)}</text>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" width="${f3(w)}mm" height="${f3(h)}mm" viewBox="0 0 ${f3(w)} ${f3(h)}">
<title>${esc(ds.map((d) => one(d.title, lang)).join(" / "))}</title>
${layer("SHEET", "SHEET 印张", sheet, 'fill="none" stroke="#B0008E" stroke-width="0.3"')}
${layer("GLUE", "GLUE 糊位", glue, 'fill="#9AA0A6" fill-opacity="0.3" stroke="#9AA0A6" stroke-width="0.2"')}
${layer("CUT", "CUT 切线", cut, 'fill="none" stroke="#D7192E" stroke-width="0.3" stroke-linejoin="round"')}
${layer("CREASE", "CREASE 压痕", crease, 'fill="none" stroke="#1F5FBF" stroke-width="0.3" stroke-dasharray="3 2"')}
${layer("DIM", "DIM 尺寸", dim, 'fill="none" stroke="#2E7D32" stroke-width="0.18" font-family="Helvetica, Arial, sans-serif"')}
${layer("TEXT", "TEXT 文字", txt, 'fill="#222" font-family="PingFang SC, Microsoft YaHei, Noto Sans CJK SC, sans-serif"')}
</svg>
`;
}
