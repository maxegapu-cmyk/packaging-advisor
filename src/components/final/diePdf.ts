/**
 * Die drawings as a vector PDF: one page per drawing at 1:1, cut lines in the spot colour
 * "CutContour" and creases in "Crease" (dashed), as cutting tables and RIPs expect, glue areas
 * tinted, dimensions in green. Numbers are set in Helvetica; Chinese labels and the title block
 * are set as small images (the browser's Chinese fonts are not ours to embed).
 * pdf-lib is loaded on demand; client-only.
 */
import type { Lang, Pair } from "@/lib/i18n";
import { mmText, type Drawing, type Shape } from "@/lib/print/die";

const PT = 72 / 25.4;
type Lib = typeof import("pdf-lib");
type Doc = import("pdf-lib").PDFDocument;
type Page = import("pdf-lib").PDFPage;

const SANS = '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", "Helvetica Neue", Arial, sans-serif';
const one = (p: Pair, lang: Lang) => (lang === "en" ? p.en : p.zh);
const both = (p: Pair, lang: Lang) => (lang === "en" ? p.en : `${p.zh}  ${p.en}`);

function spot(L: Lib, doc: Doc, page: Page, key: string, name: string, c1: number[]) {
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

/** A line of text as a transparent PNG at 12 px per mm. */
async function textImage(doc: Doc, t: string, sizeMm: number, color = "#222", weight = 400) {
  const k = 12;
  const c = document.createElement("canvas");
  const ctx = c.getContext("2d")!;
  ctx.font = `${weight} ${sizeMm * k}px ${SANS}`;
  const w = Math.max(1, Math.ceil(ctx.measureText(t).width + 2));
  c.width = w;
  c.height = Math.ceil(sizeMm * k * 1.35);
  const g = c.getContext("2d")!;
  g.font = `${weight} ${sizeMm * k}px ${SANS}`;
  g.fillStyle = color;
  g.textBaseline = "alphabetic";
  g.fillText(t, 1, sizeMm * k * 1.05);
  const png: Uint8Array = await new Promise((res, rej) => c.toBlob((b) => (b ? b.arrayBuffer().then((x) => res(new Uint8Array(x)), rej) : rej(new Error("canvas"))), "image/png"));
  return { img: await doc.embedPng(png), wMm: w / k, hMm: c.height / k, baseMm: sizeMm * 1.05 };
}

export async function buildDiePdf(ds: Drawing[], lang: Lang, title: string): Promise<Uint8Array> {
  const L = await import("pdf-lib");
  const doc = await L.PDFDocument.create();
  doc.setTitle(title);
  doc.setCreator("Packaging Advisor");
  const font = await doc.embedFont(L.StandardFonts.Helvetica);
  for (const d of ds) {
    const H = d.h * PT;
    const page = doc.addPage([d.w * PT, H]);
    spot(L, doc, page, "CSCut", "CutContour", [0, 1, 0, 0]);
    spot(L, doc, page, "CSCrease", "Crease", [1, 0, 0, 0]);
    const X = (x: number) => x * PT;
    const Y = (y: number) => H - y * PT;
    const shapeOps = (s: Shape) => {
      if (s.kind === "circle") {
        const k = 0.5523 * s.r;
        const { cx, cy, r } = s;
        return [
          L.moveTo(X(cx + r), Y(cy)),
          L.appendBezierCurve(X(cx + r), Y(cy + k), X(cx + k), Y(cy + r), X(cx), Y(cy + r)),
          L.appendBezierCurve(X(cx - k), Y(cy + r), X(cx - r), Y(cy + k), X(cx - r), Y(cy)),
          L.appendBezierCurve(X(cx - r), Y(cy - k), X(cx - k), Y(cy - r), X(cx), Y(cy - r)),
          L.appendBezierCurve(X(cx + k), Y(cy - r), X(cx + r), Y(cy - k), X(cx + r), Y(cy)),
          L.closePath(),
        ];
      }
      return [L.moveTo(X(s.pts[0][0]), Y(s.pts[0][1])), ...s.pts.slice(1).map(([x, y]) => L.lineTo(X(x), Y(y))), L.closePath()];
    };
    // the press sheet and its gripper
    if (d.sheet) {
      if (d.gripper) page.drawRectangle({ x: X(d.gripper.x), y: Y(d.gripper.y + d.gripper.h), width: d.gripper.w * PT, height: d.gripper.h * PT, color: L.rgb(0.84, 0.86, 0.88) });
      page.drawRectangle({ x: X(d.sheet.x), y: Y(d.sheet.y + d.sheet.h), width: d.sheet.w * PT, height: d.sheet.h * PT, borderColor: L.rgb(0.69, 0, 0.56), borderWidth: 0.6 });
    }
    for (const g of d.glue) page.drawRectangle({ x: X(g.x), y: Y(g.y + g.h), width: g.w * PT, height: g.h * PT, color: L.rgb(0.86, 0.87, 0.88) });
    page.pushOperators(L.pushGraphicsState(), ...strokeSpot(L, "CSCut"), L.setLineWidth(0.5), L.setLineJoin(L.LineJoinStyle.Round), ...d.cuts.flatMap(shapeOps), L.stroke(), L.popGraphicsState());
    if (d.creases.length) page.pushOperators(L.pushGraphicsState(), ...strokeSpot(L, "CSCrease"), L.setLineWidth(0.5), L.setDashPattern([3 * PT, 2 * PT], 0), ...d.creases.flatMap(([x1, y1, x2, y2]) => [L.moveTo(X(x1), Y(y1)), L.lineTo(X(x2), Y(y2))]), L.stroke(), L.popGraphicsState());
    // dimensions
    const green = L.rgb(0.18, 0.49, 0.2);
    for (const m of d.dims) {
      const t = 1.6;
      const ls: [number, number, number, number][] =
        m.axis === "x"
          ? [[m.a, m.at, m.b, m.at], [m.a, m.at - 2, m.a, m.at + 5], [m.b, m.at - 2, m.b, m.at + 5], [m.a - t, m.at + t, m.a + t, m.at - t], [m.b - t, m.at + t, m.b + t, m.at - t]]
          : [[m.at, m.a, m.at, m.b], [m.at - 2, m.a, m.at + 5, m.a], [m.at - 2, m.b, m.at + 5, m.b], [m.at - t, m.a + t, m.at + t, m.a - t], [m.at - t, m.b + t, m.at + t, m.b - t]];
      for (const [x1, y1, x2, y2] of ls) page.drawLine({ start: { x: X(x1), y: Y(y1) }, end: { x: X(x2), y: Y(y2) }, thickness: 0.35, color: green });
      const s = mmText(m.value);
      const size = 3 * PT;
      const tw = font.widthOfTextAtSize(s, size);
      if (m.axis === "x") page.drawText(s, { x: X((m.a + m.b) / 2) - tw / 2, y: Y(m.at - 1.2), size, font, color: green });
      else page.drawText(s, { x: X(m.at - 1.2), y: Y((m.a + m.b) / 2) - tw / 2, size, font, color: green, rotate: L.degrees(90) });
    }
    // labels and the title block
    const put = async (t: string, x: number, y: number, size: number, anchor: "start" | "middle" | "end" = "start", weight = 400) => {
      const im = await textImage(doc, t, size, "#222", weight);
      const x0 = anchor === "middle" ? x - im.wMm / 2 : anchor === "end" ? x - im.wMm : x;
      page.drawImage(im.img, { x: X(x0), y: Y(y - im.baseMm + im.hMm), width: im.wMm * PT, height: im.hMm * PT });
    };
    for (const l of d.labels) await put(one(l.text, lang), l.x, l.y, l.size, l.anchor ?? "start", 600);
    const base = d.sheet ? d.sheet.y + d.sheet.h + 18 : d.h - 52;
    const x0 = d.sheet ? d.sheet.x : 22;
    await put(both(d.title, lang), x0, base, 5, "start", 700);
    for (let i = 0; i < d.info.length; i++) await put(one(d.info[i], lang), x0, base + 9 + i * 6.2, 3.2);
  }
  return doc.save();
}
