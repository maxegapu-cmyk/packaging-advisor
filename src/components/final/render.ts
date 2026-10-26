/**
 * Draws print layouts with the same artwork code the 3D uses: one canvas per panel (with
 * bleed, rotated into place) for the PDF, and a whole-sheet preview for the screen.
 */
import type { Panel, Piece, Sheet } from "@/lib/print/layout";
import { artSize, BLEED, WRAP_FRONT } from "@/lib/print/layout";
import { drawFace, rolesOf, type ArtInput } from "../three/art";

const MAX_PX = 16_000_000;

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement("canvas");
  c.width = Math.max(2, Math.round(w));
  c.height = Math.max(2, Math.round(h));
  return [c, c.getContext("2d")!];
}

/** A full wrap is drawn front-centred for the 3D; print it with the seam in the middle of nothing. */
function unwrapSeam(src: HTMLCanvasElement): HTMLCanvasElement {
  const shift = Math.round(src.width * (WRAP_FRONT / 2));
  const [c, ctx] = canvas(src.width, src.height);
  ctx.drawImage(src, shift, 0, src.width - shift, src.height, 0, 0, src.width - shift, src.height);
  ctx.drawImage(src, 0, 0, shift, src.height, src.width - shift, 0, shift, src.height);
  return c;
}

/** Pixels per mm for a panel, kept under the canvas size browsers allow. */
export function panelPpm(p: Panel, dpi: number, bleed = BLEED): number {
  const want = dpi / 25.4;
  const area = (p.w + 2 * bleed) * (p.h + 2 * bleed);
  return Math.min(want, Math.sqrt(MAX_PX / area));
}

export type PanelArt = { color: HTMLCanvasElement; foil: HTMLCanvasElement | null; ppm: number; bleed: number };

/**
 * One panel at `ppm`, extended by `bleed` mm on every side (edge pixels stretched, so stripes
 * and blocks run off the cut), rotated into its place on the sheet.
 */
export function panelArt(p: Panel, a: ArtInput, ppm: number, bleed = BLEED): PanelArt {
  const s = artSize(p);
  const art = drawFace(p.kind, s.w, s.h, ppm, a);
  const fix = (c: HTMLCanvasElement) => (p.kind === "tinWrap" ? unwrapSeam(c) : c);
  const extend = (src: HTMLCanvasElement) => {
    const b = Math.round(bleed * ppm);
    const W = src.width;
    const H = src.height;
    const [c, ctx] = canvas(W + 2 * b, H + 2 * b);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(src, 0, 0, W, 1, b, 0, W, b); // top
    ctx.drawImage(src, 0, H - 1, W, 1, b, H + b, W, b); // bottom
    ctx.drawImage(src, 0, 0, 1, H, 0, b, b, H); // left
    ctx.drawImage(src, W - 1, 0, 1, H, W + b, b, b, H); // right
    ctx.drawImage(src, 0, 0, 1, 1, 0, 0, b, b);
    ctx.drawImage(src, W - 1, 0, 1, 1, W + b, 0, b, b);
    ctx.drawImage(src, 0, H - 1, 1, 1, 0, H + b, b, b);
    ctx.drawImage(src, W - 1, H - 1, 1, 1, W + b, H + b, b, b);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(src, b, b);
    return rotate(c, p.rot);
  };
  return { color: extend(fix(art.color)), foil: art.foil ? extend(fix(art.foil)) : null, ppm, bleed };
}

function rotate(src: HTMLCanvasElement, rot: Panel["rot"]): HTMLCanvasElement {
  if (!rot) return src;
  const swap = rot === 90 || rot === 270;
  const [c, ctx] = canvas(swap ? src.height : src.width, swap ? src.width : src.height);
  ctx.translate(c.width / 2, c.height / 2);
  ctx.rotate((rot * Math.PI) / 180);
  ctx.drawImage(src, -src.width / 2, -src.height / 2);
  return c;
}

/** Fill color for the parts of a piece that are not panels. */
export function baseColor(piece: Piece, a: ArtInput): string | null {
  const r = rolesOf(a.d);
  return piece.base === "ground" ? r.ground : piece.base === "key" ? r.key : null;
}

export type PreviewOptions = { pxPerMm: number; die?: boolean; labels?: boolean };

/** A whole sheet for the screen: artwork, bleed, glue areas, cut (magenta) and fold (cyan) lines. */
export function drawSheetPreview(sheet: Sheet, a: ArtInput, o: PreviewOptions): HTMLCanvasElement {
  const k = o.pxPerMm;
  const [c, ctx] = canvas(sheet.w * k, sheet.h * k);
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.save();
  ctx.scale(k, k);
  for (const piece of sheet.pieces) {
    const cut = new Path2D(piece.cut);
    const base = baseColor(piece, a);
    ctx.save();
    // bleed: the cut outline grown by 3 mm
    if (base) {
      ctx.fillStyle = base;
      ctx.strokeStyle = base;
      ctx.lineWidth = BLEED * 2;
      ctx.lineJoin = "round";
      ctx.fill(cut);
      ctx.stroke(cut);
    }
    const arts = piece.panels.map((p) => panelArt(p, a, k, BLEED));
    piece.panels.forEach((p, i) => ctx.drawImage(arts[i].color, p.x - BLEED, p.y - BLEED, p.w + 2 * BLEED, p.h + 2 * BLEED));
    // exact panels on top so a neighbour's bleed never covers real artwork
    piece.panels.forEach((p, i) => {
      const img = arts[i].color;
      const b = Math.round(BLEED * k);
      ctx.drawImage(img, b, b, img.width - 2 * b, img.height - 2 * b, p.x, p.y, p.w, p.h);
    });
    for (const g of piece.glue) {
      const wi = piece.panels.findIndex((p) => p.kind === "tinWrap");
      if (wi >= 0) {
        // a wrap's overlap continues the artwork from its start
        const wrap = piece.panels[wi];
        const img = arts[wi].color;
        const b = Math.round(BLEED * k);
        const sw = (g.w / wrap.w) * (img.width - 2 * b);
        ctx.drawImage(img, b, b, sw, img.height - 2 * b, g.x, g.y, g.w, g.h);
      } else {
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(g.x, g.y, g.w, g.h);
      }
    }
    ctx.restore();
    if (o.die !== false) {
      ctx.lineWidth = 0.35;
      ctx.strokeStyle = "#E4007F";
      ctx.stroke(cut);
      ctx.strokeStyle = "#00A0E9";
      ctx.setLineDash([3, 2]);
      for (const [x1, y1, x2, y2] of piece.folds) {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
      ctx.setLineDash([]);
    }
  }
  ctx.restore();
  return c;
}
