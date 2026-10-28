/**
 * The print file: a PDF a printer can work from.
 *
 * Page 1 is the job sheet (parts, sizes, materials, colors, checks). Then one page per printed
 * part at 1:1: artwork at 300 dpi with 3 mm bleed, cut lines in a spot color named
 * "CutContour" and creases in "Crease" (the names cutting tables and RIPs look for), crop
 * marks and a slug line. A foil finish adds a foil plate page per part.
 *
 * Text is rasterised with the artwork (the browser's Chinese fonts are not ours to embed).
 */
import type { Artwork } from "@/lib/artwork";
import type { Board } from "@/lib/board/schema";
import type { Lang } from "@/lib/i18n";
import { EFFECT_LABELS, finishText, FORM_LABELS, type Effect, type PackSpec } from "@/lib/pack";
import { cmykText } from "@/lib/print/color";
import { BLEED, type PrintLayout, type Sheet } from "@/lib/print/layout";
import type { Check } from "@/lib/print/preflight";
import { handTextOf, rolesOf, type ArtInput } from "../three/art";
import { loadInscription } from "@/lib/fonts";
import { baseColor, drawSheetPreview, panelArt, panelPpm } from "./render";

const PT = 72 / 25.4;

type Lib = typeof import("pdf-lib");

function hexRgb(L: Lib, hex: string) {
  const n = parseInt(hex.replace("#", ""), 16);
  return L.rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

function toJpeg(c: HTMLCanvasElement, q = 0.95): Promise<Uint8Array> {
  return new Promise((resolve, reject) =>
    c.toBlob(
      (b) => (b ? b.arrayBuffer().then((x) => resolve(new Uint8Array(x)), reject) : reject(new Error("canvas export failed"))),
      "image/jpeg",
      q,
    ),
  );
}

/** Our SVG paths use M, L, A (full circles) and Z only. Emits PDF path operators in points. */
function pathOps(L: Lib, d: string, pageH: number) {
  const ops: ReturnType<Lib["moveTo"]>[] = [];
  const X = (x: number) => x * PT;
  const Y = (y: number) => pageH - y * PT;
  const tok = d.match(/[MLAZ]|-?\d+(?:\.\d+)?/g) ?? [];
  let i = 0;
  let cx = 0;
  let cy = 0;
  const num = () => Number(tok[i++]);
  while (i < tok.length) {
    const c = tok[i++];
    if (c === "M") {
      cx = num();
      cy = num();
      ops.push(L.moveTo(X(cx), Y(cy)));
    } else if (c === "L") {
      cx = num();
      cy = num();
      ops.push(L.lineTo(X(cx), Y(cy)));
    } else if (c === "A") {
      const r = num();
      num();
      num();
      num();
      num();
      const ex = num();
      const ey = num();
      // half circle from (cx, cy) to (ex, ey): two quarter Béziers around the centre
      const mx = (cx + ex) / 2;
      const my = (cy + ey) / 2;
      const k = 0.5523 * r;
      const dir = ex > cx ? 1 : -1; // drawn below the diameter when moving right (sweep 0)
      const bx = mx;
      const by = my + dir * r;
      ops.push(L.appendBezierCurve(X(cx), Y(cy + dir * k), X(bx - dir * k), Y(by), X(bx), Y(by)));
      ops.push(L.appendBezierCurve(X(bx + dir * k), Y(by), X(ex), Y(ey + dir * k), X(ex), Y(ey)));
      cx = ex;
      cy = ey;
    } else if (c === "Z") ops.push(L.closePath());
  }
  return ops;
}

/** Adds a Separation color space (a named spot color shown as a CMYK tint) to a page. */
function spot(L: Lib, doc: import("pdf-lib").PDFDocument, page: import("pdf-lib").PDFPage, key: string, name: string, c1: number[]) {
  const ctx = doc.context;
  const fn = ctx.obj({ FunctionType: 2, Domain: [0, 1], C0: [0, 0, 0, 0], C1: c1, N: 1 });
  const cs = ctx.register(ctx.obj([L.PDFName.of("Separation"), L.PDFName.of(name), L.PDFName.of("DeviceCMYK"), fn]));
  const { Resources } = page.node.normalizedEntries();
  let dict = Resources.lookup(L.PDFName.of("ColorSpace"));
  if (!(dict instanceof L.PDFDict)) {
    dict = ctx.obj({});
    Resources.set(L.PDFName.of("ColorSpace"), dict as import("pdf-lib").PDFDict);
  }
  (dict as import("pdf-lib").PDFDict).set(L.PDFName.of(key), cs);
}

const strokeSpot = (L: Lib, key: string) => [L.PDFOperator.of(L.PDFOperatorNames.StrokingColorspace, [L.PDFName.of(key)]), L.PDFOperator.of(L.PDFOperatorNames.StrokingColorN, [L.PDFNumber.of(1)])];

/** Crop marks at the corners of each piece's box, outside the bleed, in registration color. */
function cropMarks(L: Lib, sheet: Sheet, pageH: number) {
  const ops = [];
  const off = BLEED + 2;
  const len = 5;
  for (const p of sheet.pieces) {
    const xs = [p.x, p.x + p.w];
    const ys = [p.y, p.y + p.h];
    for (const x of xs)
      for (const y of ys) {
        const sx = x === p.x ? -1 : 1;
        const sy = y === p.y ? -1 : 1;
        ops.push(L.moveTo((x + sx * off) * PT, pageH - y * PT), L.lineTo((x + sx * (off + len)) * PT, pageH - y * PT));
        ops.push(L.moveTo(x * PT, pageH - (y + sy * off) * PT), L.lineTo(x * PT, pageH - (y + sy * (off + len)) * PT));
      }
  }
  return ops;
}

/** Engraving: dark marks become solid black, everything else white. */
function threshold(c: HTMLCanvasElement, ground: string): HTMLCanvasElement {
  const ctx = c.getContext("2d")!;
  const img = ctx.getImageData(0, 0, c.width, c.height);
  const n = parseInt(ground.replace("#", ""), 16);
  const gl = 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
  for (let i = 0; i < img.data.length; i += 4) {
    const l = 0.299 * img.data[i] + 0.587 * img.data[i + 1] + 0.114 * img.data[i + 2];
    const v = Math.abs(l - gl) > 28 ? 0 : 255;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

/** Foil masks are white-on-black; plates are black where the foil goes. */
function invert(c: HTMLCanvasElement): HTMLCanvasElement {
  const ctx = c.getContext("2d")!;
  const img = ctx.getImageData(0, 0, c.width, c.height);
  for (let i = 0; i < img.data.length; i += 4) {
    img.data[i] = 255 - img.data[i];
    img.data[i + 1] = 255 - img.data[i + 1];
    img.data[i + 2] = 255 - img.data[i + 2];
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

/** "art" is the color page; an effect name is that effect's plate (black = where it goes). */
type PageKind = "art" | Effect;
const PLATE: Record<Effect, string> = { goldFoil: "GOLD FOIL PLATE", silverFoil: "SILVER FOIL PLATE", holo: "HOLOGRAPHIC FOIL PLATE", spotUV: "SPOT UV PLATE", emboss: "EMBOSS PLATE", deboss: "DEBOSS PLATE", letterpress: "LETTERPRESS PLATE" };

async function artPage(L: Lib, doc: import("pdf-lib").PDFDocument, sheet: Sheet, a: ArtInput, kind: PageKind, dpi: number, font: import("pdf-lib").PDFFont, slug: string) {
  const W = sheet.w * PT;
  const H = sheet.h * PT;
  const page = doc.addPage([W, H]);
  spot(L, doc, page, "CSCut", "CutContour", [0, 1, 0, 0]);
  spot(L, doc, page, "CSCrease", "Crease", [1, 0, 0, 0]);
  spot(L, doc, page, "CSReg", "All", [1, 1, 1, 1]);
  const engrave = sheet.process === "engrave";
  const ground = rolesOf(a.d).ground;

  for (const piece of sheet.pieces) {
    // the piece's own color under the panels, grown by the bleed
    const base = kind === "art" && !engrave ? baseColor(piece, a) : null;
    if (base) {
      const col = hexRgb(L, base);
      page.pushOperators(L.pushGraphicsState(), L.setFillingColor(col), L.setStrokingColor(col), L.setLineWidth(BLEED * 2 * PT), L.setLineJoin(L.LineJoinStyle.Round), ...pathOps(L, piece.cut, H), L.fillAndStroke(), L.popGraphicsState());
    }
    for (const p of piece.panels) {
      const ppm = panelPpm(p, dpi);
      const art = panelArt(p, a, ppm, BLEED);
      // a letterpress plate is all the type; every other effect plate is the accent mask
      const plate = kind === "letterpress" ? art.press : art.foil;
      let src = kind !== "art" ? (plate ? invert(plate) : null) : art.color;
      if (!src) continue;
      if (engrave) src = threshold(src, ground);
      const img = await doc.embedJpg(await toJpeg(src));
      const x = (p.x - BLEED) * PT;
      const y = H - (p.y + p.h + BLEED) * PT;
      const w = (p.w + 2 * BLEED) * PT;
      const h = (p.h + 2 * BLEED) * PT;
      // first pass: with bleed, clipped to the outside of the panel area so neighbours stay exact
      page.drawImage(img, { x, y, width: w, height: h });
      (p as typeof p & { _img?: typeof img })._img = img;
    }
    // second pass: each panel exactly, clipped to its own rectangle
    for (const p of piece.panels) {
      const img = (p as typeof p & { _img?: import("pdf-lib").PDFImage })._img;
      if (!img) continue;
      page.pushOperators(L.pushGraphicsState(), L.rectangle(p.x * PT, H - (p.y + p.h) * PT, p.w * PT, p.h * PT), L.clip(), L.endPath());
      page.drawImage(img, { x: (p.x - BLEED) * PT, y: H - (p.y + p.h + BLEED) * PT, width: (p.w + 2 * BLEED) * PT, height: (p.h + 2 * BLEED) * PT });
      page.pushOperators(L.popGraphicsState());
      delete (p as typeof p & { _img?: unknown })._img;
    }
    // glue areas stay unprinted (except a wrap's overlap, which continues the artwork)
    if (kind === "art" && !piece.panels.some((p) => p.kind === "tinWrap"))
      for (const g of piece.glue) page.drawRectangle({ x: g.x * PT, y: H - (g.y + g.h) * PT, width: g.w * PT, height: g.h * PT, color: L.rgb(1, 1, 1) });
    else if (kind === "art")
      for (const g of piece.glue) {
        const wrap = piece.panels.find((p) => p.kind === "tinWrap")!;
        const ppm = panelPpm(wrap, dpi);
        const art = panelArt(wrap, a, ppm, 0);
        const sw = Math.round((g.w / wrap.w) * art.color.width);
        const c = document.createElement("canvas");
        c.width = Math.max(2, sw);
        c.height = art.color.height;
        c.getContext("2d")!.drawImage(art.color, 0, 0);
        const img = await doc.embedJpg(await toJpeg(c));
        page.drawImage(img, { x: g.x * PT, y: H - (g.y + g.h) * PT, width: g.w * PT, height: g.h * PT });
      }
  }

  // die layer: cut and crease in spot colors, hairline
  const die = [];
  for (const piece of sheet.pieces) die.push(...pathOps(L, piece.cut, H));
  page.pushOperators(L.pushGraphicsState(), ...strokeSpot(L, "CSCut"), L.setLineWidth(0.25), ...die, L.stroke(), L.popGraphicsState());
  const creases = [];
  for (const piece of sheet.pieces) for (const [x1, y1, x2, y2] of piece.folds) creases.push(L.moveTo(x1 * PT, H - y1 * PT), L.lineTo(x2 * PT, H - y2 * PT));
  if (creases.length) page.pushOperators(L.pushGraphicsState(), ...strokeSpot(L, "CSCrease"), L.setLineWidth(0.25), L.setDashPattern([3 * PT, 2 * PT], 0), ...creases, L.stroke(), L.popGraphicsState());
  page.pushOperators(L.pushGraphicsState(), ...strokeSpot(L, "CSReg"), L.setLineWidth(0.25), ...cropMarks(L, sheet, H), L.stroke(), L.popGraphicsState());

  const label = kind !== "art" ? `${slug}  |  ${sheet.name.en}  |  ${PLATE[kind]} (black = ${EFFECT_LABELS[kind].en.toLowerCase()})` : `${slug}  |  ${sheet.name.en}  |  1:1 mm  |  bleed ${BLEED} mm  |  CutContour = cut  |  Crease = fold`;
  page.drawText(label.replace(/[^\x20-\x7E\xA0-\xFF]/g, ""), { x: 6 * PT, y: 5 * PT, size: 6.5, font, color: L.rgb(0.25, 0.25, 0.25) });
}

export type PdfInput = {
  layout: PrintLayout;
  art: ArtInput;
  artwork: Artwork;
  board: Board;
  spec: PackSpec;
  checks: Check[];
  lang: Lang;
  dpi?: number;
  onProgress?: (done: number, total: number) => void;
};

/** The job sheet: an A4 page drawn in the browser (Chinese text needs the system fonts). */
function jobSheet(inp: PdfInput): HTMLCanvasElement {
  const dpm = 150 / 25.4;
  const W = Math.round(210 * dpm);
  const H = Math.round(297 * dpm);
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;
  const SANS = '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", "Source Han Sans SC", "Helvetica Neue", Arial, sans-serif';
  const mm = (v: number) => v * dpm;
  const text = (t: string, x: number, y: number, size: number, weight = 400, color = "#111") => {
    ctx.font = `${weight} ${mm(size).toFixed(1)}px ${SANS}`;
    ctx.fillStyle = color;
    ctx.fillText(t, mm(x), mm(y));
  };
  const two = (p: { zh: string; en: string }) => (inp.lang === "en" ? p.en : inp.lang === "zh" ? p.zh : `${p.zh}  ${p.en}`);
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, W, H);
  const { board, artwork, spec } = inp;
  const d = inp.art.d;
  // header
  ctx.fillStyle = rolesOf(d).key;
  ctx.fillRect(0, 0, W, mm(6));
  text(inp.lang === "en" ? "Print job sheet" : "印刷工单  Print job sheet", 14, 22, 7, 700);
  text(`${artwork.brand} ${artwork.headline}`.trim(), 14, 31, 4.2, 600);
  text(`${two(board.meta.product)}  ·  ${two(d.name)}  ·  ${new Date().toISOString().slice(0, 10)}`, 14, 37, 3, 400, "#555");
  // package
  let y = 50;
  text(inp.lang === "en" ? "Package" : "包装  Package", 14, y, 3.6, 700);
  y += 7;
  const dims = (s: { w: number; h: number; d: number }) => `${s.w} × ${s.h} × ${s.d} mm`;
  text(`${two(FORM_LABELS[spec.form])}   ${dims(spec)}   ${inp.lang === "en" ? finishText(spec, "en") : finishText(spec, "zh")}`, 14, y, 3.1);
  if (spec.inner) {
    y += 5.5;
    text(`${inp.lang === "en" ? "Inside" : "内装"}: ${spec.inner.count} × ${two(FORM_LABELS[spec.inner.form])}  ${dims(spec.inner)}`, 14, y, 3.1);
  }
  // parts
  y += 11;
  text(inp.lang === "en" ? "Printed parts" : "印刷部件  Printed parts", 14, y, 3.6, 700);
  for (const s of inp.layout.sheets) {
    y += 6.2;
    text(`${two(s.name)}`, 14, y, 3, 600);
    text(`${Math.round(s.w)} × ${Math.round(s.h)} mm  ×${s.qty}`, 110, y, 3, 400, "#333");
    y += 4.6;
    text(two(s.material), 18, y, 2.6, 400, "#555");
    for (const n of s.notes) {
      y += 4.2;
      text(two(n), 18, y, 2.6, 400, "#555");
    }
  }
  // colors
  y += 11;
  text(inp.lang === "en" ? "Colors (screen values; CMYK approximate, proof before printing)" : "颜色（屏幕值；CMYK 为近似换算，请打样确认）", 14, y, 3.6, 700);
  const roles = rolesOf(d);
  const names: [keyof typeof roles, string][] = [
    ["ground", inp.lang === "en" ? "Ground" : "底色"],
    ["ink", inp.lang === "en" ? "Text" : "文字"],
    ["key", inp.lang === "en" ? "Brand" : "主色"],
    ["accent", inp.lang === "en" ? "Accent" : "点缀"],
  ];
  for (const [k, n] of names) {
    y += 8;
    ctx.fillStyle = roles[k];
    ctx.fillRect(mm(14), mm(y - 5), mm(10), mm(6.5));
    ctx.strokeStyle = "#ccc";
    ctx.lineWidth = 1;
    ctx.strokeRect(mm(14), mm(y - 5), mm(10), mm(6.5));
    text(n, 28, y, 3, 600);
    text(roles[k], 52, y, 3);
    text(cmykText(roles[k]), 80, y, 3, 400, "#333");
  }
  // checks
  y += 13;
  text(inp.lang === "en" ? "Pre-press checks" : "印前检查  Pre-press checks", 14, y, 3.6, 700);
  const mark = { error: "✕", warn: "!", ok: "✓", info: "i" } as const;
  const tone = { error: "#C8102E", warn: "#B25E00", ok: "#2E7D32", info: "#555" } as const;
  for (const ch of inp.checks) {
    y += 5.6;
    if (y > 262) break;
    text(mark[ch.level], 14, y, 3, 700, tone[ch.level]);
    text(two(ch.title), 19, y, 2.9, 500, "#222");
  }
  // thumbnails
  const thumbs = inp.layout.sheets.slice(0, 3);
  let tx = 14;
  for (const s of thumbs) {
    const k = Math.min(56 / s.w, 30 / s.h);
    const prev = drawSheetPreview(s, inp.art, { pxPerMm: k * dpm });
    ctx.drawImage(prev, mm(tx), mm(270 - s.h * k), prev.width, prev.height);
    tx += s.w * k + 6;
  }
  text(inp.lang === "en" ? "Made with Packaging Advisor. Check the die line with your printer." : "由包装视觉顾问生成。开模前请与印厂核对刀模。", 14, 290, 2.5, 400, "#777");
  return c;
}

/** Builds the PDF. pdf-lib is loaded on demand. */
export async function buildPrintPdf(inp: PdfInput): Promise<Uint8Array> {
  const L = await import("pdf-lib");
  // the inscription hand must be loaded before its text is set on canvas
  await loadInscription(handTextOf(inp.art.d, inp.art.brand, inp.spec.form));
  const dpi = inp.dpi ?? 300;
  const doc = await L.PDFDocument.create();
  doc.setTitle(`${inp.artwork.brand} ${inp.artwork.headline} print file`.trim());
  doc.setCreator("Packaging Advisor");
  doc.setProducer("Packaging Advisor (pdf-lib)");
  const font = await doc.embedFont(L.StandardFonts.Helvetica);
  const fx = inp.spec.effects ?? [];
  const total = 1 + inp.layout.sheets.reduce((n, s) => n + 1 + (s.process === "print" ? fx.length : 0), 0);
  let done = 0;
  const tick = () => inp.onProgress?.(++done, total);

  const js = jobSheet(inp);
  const jsImg = await doc.embedJpg(await toJpeg(js, 0.9));
  const jp = doc.addPage([210 * PT, 297 * PT]);
  jp.drawImage(jsImg, { x: 0, y: 0, width: 210 * PT, height: 297 * PT });
  tick();

  const slug = `${inp.artwork.brand} ${inp.artwork.headline}`.trim() || "Packaging Advisor";
  for (const s of inp.layout.sheets) {
    await artPage(L, doc, s, inp.art, "art", dpi, font, slug);
    tick();
    if (s.process === "print")
      for (const e of fx) {
        await artPage(L, doc, s, inp.art, e, dpi, font, slug);
        tick();
      }
  }
  return doc.save();
}
