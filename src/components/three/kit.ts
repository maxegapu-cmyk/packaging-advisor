/**
 * Materials for every package: printed board, paper, plastic film and tinplate per finish;
 * board edges and insides; linings and velvet; bare and anodised metal; moulded plastic;
 * glass; kraft; corrugated flutes; rope and cork; and what is inside a jar or bottle.
 * Print artwork comes from art.ts.
 */
import * as THREE from "three";
import { drawFace, fiberNormal, foilRoughMetal, rolesOf, type ArtInput, type FaceKind } from "./art";

/** What the print sits on. */
export type Surface = "board" | "film" | "metal" | "plastic" | "glaze";
/** Insert (cushioning) materials in a combination. */
export type InsertKind = "velvet" | "pulp" | "foam" | "card";

export type Kit = {
  /** A printed face. `arc`: degrees it wraps round a curved body (a jar's label, a tube's lid band). */
  tex: (kind: FaceKind, wMm: number, hMm: number, surface?: Surface, arc?: number) => THREE.MeshPhysicalMaterial;
  edge: THREE.MeshStandardMaterial;
  inside: THREE.MeshStandardMaterial;
  lining: THREE.MeshPhysicalMaterial;
  velvet: THREE.MeshPhysicalMaterial;
  bareMetal: THREE.MeshPhysicalMaterial;
  kraft: THREE.MeshStandardMaterial;
  /** Corrugated board's cut edge: two liners with the fluting between, `lengthMm` long. */
  flute: (lengthMm: number, vertical?: boolean) => THREE.MeshStandardMaterial;
  /** Moulded or lacquered parts in a role color (caps, pumps, lids). */
  plastic: (hex: string, rough?: number) => THREE.MeshPhysicalMaterial;
  anodised: (hex: string) => THREE.MeshPhysicalMaterial;
  glass: (thicknessMm: number, tint?: string) => THREE.MeshPhysicalMaterial;
  fill: (kind: "dry" | "liquid" | "cream") => THREE.MeshStandardMaterial;
  insert: (kind: InsertKind) => THREE.MeshStandardMaterial;
  /** Glazed porcelain in a color. */
  ceramic: (hex: string) => THREE.MeshPhysicalMaterial;
  /** A plain printed sheet in the ground color, for wrapped edges and seals. */
  plain: (surface?: Surface) => THREE.MeshPhysicalMaterial;
  /** Pine, its grain along u, for a face `uMm` × `vMm`. */
  wood: (uMm: number, vMm: number) => THREE.MeshPhysicalMaterial;
  /** A face's artwork laser-engraved into pine (dark burn where the print has ink). */
  engraved: (kind: FaceKind, wMm: number, hMm: number) => THREE.MeshPhysicalMaterial;
  rope: THREE.MeshStandardMaterial;
  cork: THREE.MeshStandardMaterial;
  /** Song brocade covering a box, `wMm` × `hMm` of it. */
  brocade: (wMm: number, hMm: number) => THREE.MeshPhysicalMaterial;
  /** Polished bone, for a clasp. */
  bone: THREE.MeshPhysicalMaterial;
  dispose: () => void;
};

/**
 * The live renderer has no bounce light, so packages read about 12% darker and the floor a
 * little brighter than in the path tracer. These factors match the two, so switching between
 * them is not a visible jump. Measured on the studio sweep at rest.
 */
const LIVE_PRODUCT_ENV = 1.18;
export const LIVE_SWEEP_ENV = 0.92;

const FINISH = {
  matte: { rough: 0.74, bump: 0.1, clearcoat: 0, ccRough: 0.1, sheen: 0.15, film: 0.5 },
  gloss: { rough: 0.42, bump: 0.04, clearcoat: 1, ccRough: 0.04, sheen: 0, film: 0.18 },
  softTouch: { rough: 0.9, bump: 0.05, clearcoat: 0, ccRough: 0.1, sheen: 0.6, film: 0.72 },
  paper: { rough: 0.9, bump: 0.38, clearcoat: 0, ccRough: 0.1, sheen: 0.35, film: 0.62 },
  // 宣纸: long soft fibres, a dry surface that drinks the ink
  xuan: { rough: 0.96, bump: 0.55, clearcoat: 0, ccRough: 0.1, sheen: 0.28, film: 0.62 },
  // 洒金笺: a sized paper with flakes of gold leaf in it (the flakes are added per face)
  goldFleck: { rough: 0.88, bump: 0.3, clearcoat: 0, ccRough: 0.1, sheen: 0.3, film: 0.62 },
} as const;

/**
 * Tangent-space normal map of a pressed mask. Positive `strength` raises the white areas
 * (emboss), negative presses them in (deboss, letterpress). `bevelPx` is the width of the slope
 * at the mask's own resolution, so the shoulder is the same in millimetres on any face: a die
 * leaves a rounded shoulder about 0.3 mm wide, a letterpress plate a sharper one.
 */
function embossNormal(mask: HTMLCanvasElement, strength = 3, bevelPx?: number): HTMLCanvasElement {
  const k = Math.min(1, 1024 / Math.max(mask.width, mask.height));
  const W = Math.max(4, Math.round(mask.width * k));
  const H = Math.max(4, Math.round(mask.height * k));
  const b = document.createElement("canvas");
  b.width = W;
  b.height = H;
  const bx = b.getContext("2d", { willReadFrequently: true })!;
  bx.filter = `blur(${Math.max(0.6, bevelPx !== undefined ? bevelPx * k : W / 512).toFixed(2)}px)`;
  bx.drawImage(mask, 0, 0, W, H);
  const h = bx.getImageData(0, 0, W, H).data;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;
  const out = ctx.createImageData(W, H);
  const at = (x: number, y: number) => h[(Math.min(H - 1, Math.max(0, y)) * W + Math.min(W - 1, Math.max(0, x))) * 4] / 255;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength;
      const dy = (at(x, y + 1) - at(x, y - 1)) * strength;
      const l = Math.hypot(dx, dy, 1);
      const o = (y * W + x) * 4;
      out.data[o] = Math.round(((-dx / l) * 0.5 + 0.5) * 255);
      out.data[o + 1] = Math.round(((dy / l) * 0.5 + 0.5) * 255);
      out.data[o + 2] = Math.round(((1 / l) * 0.5 + 0.5) * 255);
      out.data[o + 3] = 255;
    }
  ctx.putImageData(out, 0, 0);
  return c;
}

/**
 * Gold flecks for 洒金笺: irregular flakes of leaf, 0.4–2 mm, about 2% of the sheet, seeded per
 * face. Returns the print with the flakes laid in (shown most where the print is light, as leaf
 * under thin ink is) and a roughness / metalness map maker that marks them as metal.
 */
/**
 * 宣纸 seen close: long soft fibres lying in the sheet, some a shade lighter, some darker, and a
 * faint cloudiness where the pulp lay thicker. Printed over, so it shows most in light areas.
 */
function xuanCloud(color: HTMLCanvasElement, ppm: number, key: string) {
  const W = color.width;
  const H = color.height;
  let h = 2166136261;
  for (const ch of key) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  let seed = (h >>> 0) % 2147483646 || 1;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const out = document.createElement("canvas");
  out.width = W;
  out.height = H;
  const o = out.getContext("2d")!;
  o.drawImage(color, 0, 0);
  // the cloud: broad soft patches where the pulp lay thicker or thinner
  const area = (W * H) / (ppm * ppm);
  o.globalCompositeOperation = "multiply";
  for (let i = 0, n = Math.min(90, Math.round(area / 260)); i < n; i++) {
    const x = rnd() * W;
    const y = rnd() * H;
    const r = (8 + rnd() * 26) * ppm;
    const g = o.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(196,188,170,${(0.06 + rnd() * 0.07).toFixed(3)})`);
    g.addColorStop(1, "rgba(196,188,170,0)");
    o.fillStyle = g;
    o.fillRect(x - r, y - r, 2 * r, 2 * r);
  }
  // the fibres: long, thin, gently curved
  o.lineCap = "round";
  const count = Math.min(3200, Math.round(area * 0.05));
  for (let i = 0; i < count; i++) {
    const dark = rnd() < 0.45;
    o.globalCompositeOperation = dark ? "multiply" : "screen";
    o.strokeStyle = dark ? `rgba(150,140,120,${(0.1 + rnd() * 0.14).toFixed(3)})` : `rgba(255,255,255,${(0.12 + rnd() * 0.2).toFixed(3)})`;
    o.lineWidth = Math.max(0.6, (0.04 + rnd() * 0.09) * ppm);
    const x = rnd() * W;
    const y = rnd() * H;
    const len = (2 + rnd() * rnd() * 9) * ppm;
    const a = rnd() * Math.PI * 2;
    const bend = (rnd() - 0.5) * len * 0.5;
    const ex = x + Math.cos(a) * len;
    const ey = y + Math.sin(a) * len;
    o.beginPath();
    o.moveTo(x, y);
    o.quadraticCurveTo((x + ex) / 2 - Math.sin(a) * bend, (y + ey) / 2 + Math.cos(a) * bend, ex, ey);
    o.stroke();
  }
  o.globalCompositeOperation = "source-over";
  return out;
}

function goldFlecks(color: HTMLCanvasElement, ppm: number, key: string) {
  const W = color.width;
  const H = color.height;
  let h = 2166136261;
  for (const ch of key) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  let seed = (h >>> 0) % 2147483646 || 1;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const flakes: [number, number][][] = [];
  const area = (W * H) / (ppm * ppm);
  const count = Math.min(2600, Math.round(area * 0.012));
  for (let i = 0; i < count; i++) {
    const cx = rnd() * W;
    const cy = rnd() * H;
    const r = (0.2 + rnd() * rnd() * 0.85) * ppm;
    const n = 5 + Math.floor(rnd() * 4);
    const pts: [number, number][] = [];
    for (let j = 0; j < n; j++) {
      const a = (j / n) * Math.PI * 2 + rnd() * 0.6;
      const rr = r * (0.45 + rnd() * 0.75);
      pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * (0.6 + rnd() * 0.5)]);
    }
    flakes.push(pts);
  }
  const trace = (ctx: CanvasRenderingContext2D) => {
    ctx.beginPath();
    for (const f of flakes) {
      f.forEach(([x, y], j) => (j ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.closePath();
    }
  };
  const out = document.createElement("canvas");
  out.width = W;
  out.height = H;
  const o = out.getContext("2d")!;
  o.drawImage(color, 0, 0);
  // the leaf shows through light print and is mostly hidden under dark ink
  const leaf = document.createElement("canvas");
  leaf.width = W;
  leaf.height = H;
  const l = leaf.getContext("2d")!;
  l.fillStyle = "#D2AE58";
  trace(l);
  l.fill();
  l.globalCompositeOperation = "destination-in";
  l.drawImage(color, 0, 0);
  const id = l.getImageData(0, 0, W, H);
  const src = o.getImageData(0, 0, W, H).data;
  for (let i = 0; i < id.data.length; i += 4) {
    if (!id.data[i + 3]) continue;
    const lum = (0.3 * src[i] + 0.59 * src[i + 1] + 0.11 * src[i + 2]) / 255;
    id.data[i] = 0xd2;
    id.data[i + 1] = 0xae;
    id.data[i + 2] = 0x58;
    id.data[i + 3] = Math.round(255 * Math.max(0.12, Math.min(0.92, (lum - 0.25) * 1.3)));
  }
  l.putImageData(id, 0, 0);
  o.drawImage(leaf, 0, 0);
  return {
    color: out,
    roughMetal: (paperRough: number, base: HTMLCanvasElement | null) => {
      const c = document.createElement("canvas");
      c.width = W;
      c.height = H;
      const x = c.getContext("2d")!;
      if (base) x.drawImage(base, 0, 0, W, H);
      else {
        x.fillStyle = `rgb(255,${Math.round(paperRough * 255)},0)`;
        x.fillRect(0, 0, W, H);
      }
      x.globalAlpha = 0.9;
      x.fillStyle = "rgb(255,70,255)";
      trace(x);
      x.fill();
      return c;
    },
  };
}

/**
 * One repeat of Song brocade (宋锦) in the palette: a tortoise-shell lattice (龟背纹) in the
 * accent colour on the key colour, a four-petal flower in each cell, a small lozenge at each
 * node. Drawn to tile seamlessly.
 */
function brocadeCanvasRaw(base: string, line: string, flower: string): HTMLCanvasElement {
  const S = 512;
  const c = document.createElement("canvas");
  c.width = S;
  c.height = S;
  const x = c.getContext("2d")!;
  x.fillStyle = base;
  x.fillRect(0, 0, S, S);
  // hexagons on a grid that tiles: two columns and two rows per tile
  const r = S / 4 / Math.cos(Math.PI / 6) / 1.0;
  const dx = S / 2;
  const dy = S / 2;
  const hex = (cx: number, cy: number, rr: number) => {
    x.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i + Math.PI / 6;
      const px = cx + Math.cos(a) * rr;
      const py = cy + Math.sin(a) * rr * 1.0;
      if (i) x.lineTo(px, py);
      else x.moveTo(px, py);
    }
    x.closePath();
  };
  const centres: [number, number][] = [];
  for (let row = -1; row <= 2; row++)
    for (let col = -1; col <= 2; col++) centres.push([col * dx + (row % 2 ? dx / 2 : 0), row * dy]);
  x.strokeStyle = line;
  x.lineWidth = S * 0.018;
  x.globalAlpha = 0.85;
  for (const [cx, cy] of centres) {
    hex(cx, cy, r * 0.98);
    x.stroke();
  }
  x.lineWidth = S * 0.006;
  x.globalAlpha = 0.55;
  for (const [cx, cy] of centres) {
    hex(cx, cy, r * 0.82);
    x.stroke();
  }
  // a four-petal flower in each cell
  x.globalAlpha = 0.9;
  for (const [cx, cy] of centres) {
    x.fillStyle = flower;
    for (let i = 0; i < 4; i++) {
      x.save();
      x.translate(cx, cy);
      x.rotate((Math.PI / 2) * i + Math.PI / 4);
      x.beginPath();
      x.ellipse(0, -r * 0.2, r * 0.1, r * 0.2, 0, 0, Math.PI * 2);
      x.fill();
      x.restore();
    }
    x.fillStyle = line;
    x.beginPath();
    x.arc(cx, cy, r * 0.06, 0, Math.PI * 2);
    x.fill();
  }
  x.globalAlpha = 1;
  // the woven look: fine warp lines
  x.globalAlpha = 0.07;
  x.fillStyle = "#000";
  for (let i = 0; i < S; i += 3) x.fillRect(i, 0, 1, S);
  x.globalAlpha = 1;
  return c;
}

/** A tiny warp-and-weft normal map: alternating floats, as silk weave catches the light. */
function weaveNormalRaw(): HTMLCanvasElement {
  const S = 16;
  const c = document.createElement("canvas");
  c.width = S;
  c.height = S;
  const x = c.getContext("2d")!;
  const img = x.createImageData(S, S);
  for (let y = 0; y < S; y++)
    for (let i = 0; i < S; i++) {
      const warp = ((Math.floor(i / 4) + Math.floor(y / 4)) & 1) === 0;
      const t = warp ? Math.sin(((i % 4) / 4) * Math.PI * 2) : Math.sin(((y % 4) / 4) * Math.PI * 2);
      const nx = warp ? t * 0.5 : 0;
      const ny = warp ? 0 : t * 0.5;
      const l = Math.hypot(nx, ny, 1);
      const o = (y * S + i) * 4;
      img.data[o] = Math.round(((nx / l) * 0.5 + 0.5) * 255);
      img.data[o + 1] = Math.round(((ny / l) * 0.5 + 0.5) * 255);
      img.data[o + 2] = Math.round(((1 / l) * 0.5 + 0.5) * 255);
      img.data[o + 3] = 255;
    }
  x.putImageData(img, 0, 0);
  return c;
}

/** Contents by category: tea leaves, a specialty's amber, a cosmetic's cream. */
const CONTENTS: Record<string, { dry: string; liquid: string; cream: string }> = {
  tea: { dry: "#5B6236", liquid: "#8A5A1E", cream: "#EFE9DC" },
  specialty: { dry: "#8C5A2B", liquid: "#C77A12", cream: "#F1E4C8" },
  cosmetics: { dry: "#E9DFD3", liquid: "#F3D9D2", cream: "#F6F1EA" },
  appliance: { dry: "#9A9A96", liquid: "#DCE6EA", cream: "#F1F1EE" },
  snacks: { dry: "#B8864E", liquid: "#C98A3A", cream: "#EADCC2" },
  beverage: { dry: "#7A3B2E", liquid: "#8E2F3C", cream: "#EFE2D0" },
  health: { dry: "#D9A441", liquid: "#E2B54A", cream: "#F3EAD6" },
  personalCare: { dry: "#E7E3DA", liquid: "#CFE3E6", cream: "#F4F1EC" },
  baby: { dry: "#F2EADB", liquid: "#F4EDE0", cream: "#FAF5EC" },
  pet: { dry: "#8A5B34", liquid: "#B98A55", cream: "#EBDCC6" },
  other: { dry: "#8F8A7E", liquid: "#D8C6A0", cream: "#F2EEE6" },
};

function noiseCanvasRaw(base: string, spread: number, size = 256, flecks = 2400): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);
  let seed = 99;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < flecks; i++) {
    const l = (rnd() - 0.5) * spread;
    ctx.fillStyle = l > 0 ? `rgba(255,255,255,${l})` : `rgba(0,0,0,${-l})`;
    const x = rnd() * size;
    const y = rnd() * size;
    ctx.beginPath();
    ctx.ellipse(x, y, 1 + rnd() * 5, 0.6 + rnd() * 1.6, rnd() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  return c;
}

/** Flat-sawn pine: fine growth rings of uneven spacing along the length, pores, a soft knot. */
function woodCanvasRaw(W = 1024, H = 512, seed0 = 7): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;
  let seed = seed0;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const img = ctx.createImageData(W, H);
  const base = [222, 194, 150];
  const late = [176, 132, 84];
  const kx = W * (0.2 + rnd() * 0.6);
  const ky = H * (0.2 + rnd() * 0.6);
  const p = [rnd() * 6, rnd() * 6, rnd() * 6];
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const dx = (x - kx) / W;
      const dy = (y - ky) / H;
      const knot = Math.exp(-(dx * dx * 900 + dy * dy * 3600));
      const sx = x / W;
      let u = y / H + 0.006 * Math.sin(sx * 9 + p[0]) + 0.003 * Math.sin(sx * 31 + p[1]) + knot * 0.03 * Math.sign(dy || 1);
      u = u * 28 + 1.6 * Math.sin(u * 4.1 + p[2]); // rings of uneven width
      const f = u - Math.floor(u);
      const ring = Math.pow(Math.max(0, Math.sin(f * Math.PI)), 14);
      const tone = 0.08 * Math.sin((y / H) * 5.3 + p[0]) + 0.05 * Math.sin(sx * 2.1 + p[1]);
      const t = Math.min(1, ring * 0.55 + Math.max(0, tone) + knot * 0.55);
      const o = (y * W + x) * 4;
      for (let i = 0; i < 3; i++) img.data[o + i] = base[i] + (late[i] - base[i]) * t;
      img.data[o + 3] = 255;
    }
  ctx.putImageData(img, 0, 0);
  for (let i = 0; i < 14000; i++) {
    ctx.fillStyle = `rgba(110,72,36,${rnd() * 0.1})`;
    ctx.fillRect(rnd() * W, rnd() * H, 2 + rnd() * 12, 0.7);
  }
  return c;
}

function fluteCanvasRaw(): HTMLCanvasElement {
  // one flute period (about 3.5 mm for E/B flute) across a 3 mm board
  const W = 128;
  const H = 96;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#6E5435";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#B8935F";
  ctx.fillRect(0, 0, W, 12);
  ctx.fillRect(0, H - 12, W, 12);
  ctx.strokeStyle = "#C29C66";
  ctx.lineWidth = 9;
  ctx.beginPath();
  for (let x = 0; x <= W; x++) {
    const y = H / 2 + Math.sin((x / W) * Math.PI * 2) * (H / 2 - 16);
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  return c;
}

/** The surface images are the same for every package: draw each once. */
const surfaceCache = new Map<string, HTMLCanvasElement>();
const once = <A extends unknown[]>(name: string, f: (...a: A) => HTMLCanvasElement) => (...a: A) => {
  const k = name + JSON.stringify(a);
  let c = surfaceCache.get(k);
  if (!c) surfaceCache.set(k, (c = f(...a)));
  return c;
};
const noiseCanvas = once("noise", noiseCanvasRaw);
const brocadeCanvas = once("brocade", brocadeCanvasRaw);
const weaveNormal = once("weave", weaveNormalRaw);
const woodCanvas = once("wood", woodCanvasRaw);
const fluteCanvas = once("flute", fluteCanvasRaw);

/**
 * `defer`: when given, printed faces are drawn later rather than now. Each face's material is
 * returned at once with a blank map, and the drawing is handed to `defer` as a job; the map
 * fills in when the job runs (used by the homepage film to spread the work over frames).
 */
export function makeKit(renderer: THREE.WebGLRenderer, a: ArtInput, maxTex: number, category = "other", opts: { defer?: (job: () => void) => void } = {}): Kit {
  const disposables: { dispose: () => void }[] = [];
  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const fiber = new THREE.CanvasTexture(fiberNormal());
  fiber.wrapS = fiber.wrapT = THREE.RepeatWrapping;
  fiber.colorSpace = THREE.NoColorSpace;
  fiber.anisotropy = aniso;
  disposables.push(fiber);
  const f = FINISH[a.finish];
  const nScale = (k: number) => new THREE.Vector2(k, k);
  const roles = rolesOf(a.d);
  const live = <T extends THREE.MeshStandardMaterial>(m: T) => {
    m.envMapIntensity = LIVE_PRODUCT_ENV;
    disposables.push(m);
    return m;
  };

  const canvasTex = (c: HTMLCanvasElement, srgb: boolean, repeat = false) => {
    const t = new THREE.CanvasTexture(c);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = aniso;
    t.generateMipmaps = true;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    disposables.push(t);
    return t;
  };

  const blank = () => {
    const c = document.createElement("canvas");
    c.width = c.height = 2;
    const x = c.getContext("2d")!;
    x.fillStyle = roles.ground;
    x.fillRect(0, 0, 2, 2);
    return c;
  };

  const tex = (kind: FaceKind, wMm: number, hMm: number, surface: Surface = "board", arc?: number) => {
    const ppm = Math.min(16, maxTex / Math.max(wMm, hMm));
    // effects need the drawn masks now; plain print can wait
    // (洒金 needs the print too: its flakes change the roughness and metalness maps)
    const lazy = !!opts.defer && !(a.effects ?? []).length && a.finish !== "goldFleck";
    const art = lazy ? null : drawFace(kind, wMm, hMm, ppm, a, { arc });
    const board = surface === "board";
    let fib: THREE.Texture | null = null;
    if (board) {
      fib = fiber.clone();
      // xuan's fibres are long: the same fibre map, drawn larger
      const fl = a.finish === "xuan" ? 72 : 40;
      fib.repeat.set(wMm / fl, hMm / fl);
      fib.needsUpdate = true;
      disposables.push(fib);
    }
    // printed tinplate is lacquered; film is laminated (gloss or matte by finish); moulded
    // plastic is printed directly, satin
    const rough = surface === "metal" ? 0.34 : surface === "film" ? f.film : surface === "plastic" ? 0.38 : surface === "glaze" ? 0.1 : f.rough;
    // 洒金: flakes of gold leaf in the paper itself (not printed: they sit under thin ink and
    // show most where the print is light)
    const flecks = board && a.finish === "goldFleck" && art ? goldFlecks(art.color, ppm, kind + wMm + "x" + hMm) : null;
    const paper = (c: HTMLCanvasElement) => (board && a.finish === "xuan" ? xuanCloud(c, ppm, kind + wMm + "x" + hMm) : c);
    const map = canvasTex(flecks ? flecks.color : art ? paper(art.color) : blank(), true);
    if (lazy)
      opts.defer!(() => {
        // the same texture object, so every clone of the material sees the print
        map.image = paper(drawFace(kind, wMm, hMm, ppm, a, { arc }).color);
        map.needsUpdate = true;
      });
    const m = new THREE.MeshPhysicalMaterial({
      map,
      roughness: rough,
      metalness: surface === "metal" ? 0.18 : 0,
      normalMap: fib,
      normalScale: nScale(f.bump),
      clearcoat: surface === "metal" ? Math.max(0.6, f.clearcoat) : surface === "film" ? (a.finish === "gloss" ? 1 : a.finish === "softTouch" ? 0 : 0.25) : surface === "plastic" ? 0.5 : surface === "glaze" ? 1 : f.clearcoat,
      clearcoatRoughness: surface === "metal" ? 0.08 : surface === "film" ? (a.finish === "gloss" ? 0.03 : 0.4) : surface === "glaze" ? 0.03 : f.ccRough,
      sheen: board ? f.sheen : 0,
      sheenRoughness: 0.8,
      sheenColor: new THREE.Color(1, 1, 1),
    });
    const fx = a.effects ?? [];
    if (flecks) {
      const rmc = art?.foil && fx.some((e) => e === "goldFoil" || e === "silverFoil" || e === "holo") ? foilRoughMetal(art.foil, rough, 0.3) : null;
      const rm = canvasTex(flecks.roughMetal(rough, rmc), false);
      m.roughness = 1;
      m.metalness = 1;
      m.roughnessMap = rm;
      m.metalnessMap = rm;
    }
    if (art?.foil) {
      const foil = fx.find((e) => e === "goldFoil" || e === "silverFoil" || e === "holo");
      if (foil && !flecks) {
        // stamped foil: metal where the mask is white
        const rm = canvasTex(foilRoughMetal(art.foil, rough, foil === "holo" ? 0.18 : 0.3), false);
        m.roughness = 1;
        m.metalness = 1;
        m.roughnessMap = rm;
        m.metalnessMap = rm;
        if (foil === "holo") {
          // thin-film interference: rainbow colors that shift with the angle
          m.iridescence = 1;
          m.iridescenceMap = canvasTex(art.foil, false);
          m.iridescenceIOR = 1.7;
          m.iridescenceThicknessRange = [180, 820];
        }
      }
      if (fx.includes("spotUV")) {
        // a clear gloss coat on the accent elements only
        m.clearcoat = 1;
        m.clearcoatMap = canvasTex(art.foil, false);
        m.clearcoatRoughness = 0.03;
      }
      // a die raises (击凸) or presses in (压凹) the accent elements, with a 0.3 mm shoulder
      if (fx.includes("emboss") || fx.includes("deboss")) {
        m.normalMap = canvasTex(embossNormal(art.foil, fx.includes("deboss") ? -2.6 : 2.6, 0.3 * ppm), false);
        m.normalScale = nScale(1.5);
      }
    }
    if (art?.press && fx.includes("letterpress")) {
      // a relief plate presses every word into the sheet: a crisp, shallow bite
      m.normalMap = canvasTex(embossNormal(art.press, -1.8, 0.14 * ppm), false);
      m.normalScale = nScale(1.2);
    }
    return live(m);
  };

  const edge = new THREE.MeshStandardMaterial({ color: "#ECE7DC", roughness: 0.95, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
  const insideFiber = fiber.clone();
  insideFiber.repeat.set(4, 4);
  insideFiber.needsUpdate = true;
  disposables.push(insideFiber);
  const inside = new THREE.MeshStandardMaterial({ color: "#D9D4C8", roughness: 0.92, normalMap: insideFiber, normalScale: nScale(0.3) });
  const lining = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(roles.ground).lerp(new THREE.Color("#ffffff"), 0.15), roughness: 0.85, normalMap: insideFiber, normalScale: nScale(0.18), sheen: 0.3 });
  const velvet = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(roles.ink).lerp(new THREE.Color(roles.key), 0.35), roughness: 1, sheen: 1, sheenRoughness: 0.55, sheenColor: new THREE.Color(roles.key).lerp(new THREE.Color("#ffffff"), 0.4) });
  const bareMetal = new THREE.MeshPhysicalMaterial({ color: "#D7D9D8", metalness: 1, roughness: 0.22 });
  const kraft = new THREE.MeshStandardMaterial({ color: "#B7905E", roughness: 0.93, normalMap: insideFiber, normalScale: nScale(0.45) });
  const rope = new THREE.MeshStandardMaterial({ color: new THREE.Color(roles.ink).lerp(new THREE.Color(roles.key), 0.3), roughness: 0.95 });
  const cork = new THREE.MeshStandardMaterial({ map: canvasTex(noiseCanvas("#B98D5C", 0.35, 128, 900), true, true), roughness: 0.95 });
  for (const m of [edge, inside, lining, velvet, bareMetal, kraft, rope, cork]) live(m);

  // 宋锦: the brocade a Song box is covered in, woven in the palette; the pattern repeats every
  // 28 mm, with a fine warp-and-weft and the sheen of silk
  const brocadeTile = canvasTex(brocadeCanvas(roles.key, roles.accent, roles.ground), true, true);
  const weave = canvasTex(weaveNormal(), false, true);
  const brocade = (wMm: number, hMm: number) => {
    const t = brocadeTile.clone();
    t.repeat.set(wMm / 28, hMm / 28);
    t.needsUpdate = true;
    const n = weave.clone();
    n.repeat.set(wMm / 1.2, hMm / 1.2);
    n.needsUpdate = true;
    disposables.push(t, n);
    return live(new THREE.MeshPhysicalMaterial({ map: t, roughness: 0.62, sheen: 1, sheenRoughness: 0.42, sheenColor: new THREE.Color(roles.accent).lerp(new THREE.Color("#ffffff"), 0.55), normalMap: n, normalScale: nScale(0.35) }));
  };
  // bone (骨扣): warm ivory, polished
  const bone = live(new THREE.MeshPhysicalMaterial({ color: "#EDE3CF", roughness: 0.32, clearcoat: 0.4, clearcoatRoughness: 0.25, sheen: 0.2 }));

  const fluteBase = canvasTex(fluteCanvas(), true, true);
  const flute = (lengthMm: number, vertical = false) => {
    const t = fluteBase.clone();
    t.repeat.set(lengthMm / 3.6, 1);
    if (vertical) {
      t.center.set(0.5, 0.5);
      t.rotation = Math.PI / 2;
    }
    t.needsUpdate = true;
    disposables.push(t);
    return live(new THREE.MeshStandardMaterial({ map: t, roughness: 0.95, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 }));
  };
  const plastic = (hex: string, rough = 0.3) => live(new THREE.MeshPhysicalMaterial({ color: hex, roughness: rough, clearcoat: 0.6, clearcoatRoughness: 0.12 }));
  const anodised = (hex: string) => live(new THREE.MeshPhysicalMaterial({ color: hex, metalness: 0.75, roughness: 0.32, clearcoat: 0.5, clearcoatRoughness: 0.1 }));
  const glass = (thicknessMm: number, tint = "#E9F2EC") =>
    live(
      new THREE.MeshPhysicalMaterial({
        color: "#ffffff",
        metalness: 0,
        roughness: 0.02,
        transmission: 1,
        ior: 1.5,
        thickness: thicknessMm * 0.01,
        attenuationColor: new THREE.Color(tint),
        attenuationDistance: 0.6,
        specularIntensity: 1,
        side: THREE.DoubleSide,
      }),
    );
  // Liquids and creams are opaque here: the live renderer does not show a transmissive
  // object through another (the glass), and a glossy amber reads correctly in both renderers.
  const contents = CONTENTS[category] ?? CONTENTS.other;
  const fill = (kind: "dry" | "liquid" | "cream") => {
    if (kind === "liquid")
      return live(new THREE.MeshPhysicalMaterial({ color: contents.liquid, roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.02, sheen: 0.25, sheenColor: new THREE.Color(contents.liquid).lerp(new THREE.Color("#ffffff"), 0.5) }));
    if (kind === "cream") return live(new THREE.MeshPhysicalMaterial({ color: contents.cream, roughness: 0.55, sheen: 0.4 }));
    return live(new THREE.MeshStandardMaterial({ map: canvasTex(noiseCanvas(contents.dry, 0.55), true, true), roughness: 0.92 }));
  };

  const pulpTex = canvasTex(noiseCanvas("#CBC1AC", 0.3, 256, 5200), true, true);
  pulpTex.repeat.set(3, 3);
  const foamTex = canvasTex(noiseCanvas("#F3F3EF", 0.12, 256, 3000), true, true);
  foamTex.repeat.set(4, 4);
  const inserts = {
    velvet: velvet as THREE.MeshStandardMaterial,
    pulp: live(new THREE.MeshStandardMaterial({ map: pulpTex, roughness: 1, normalMap: insideFiber, normalScale: nScale(1.1) })),
    foam: live(new THREE.MeshPhysicalMaterial({ map: foamTex, roughness: 0.82, sheen: 0.6, sheenRoughness: 0.5, sheenColor: new THREE.Color("#ffffff") })),
    card: live(new THREE.MeshStandardMaterial({ color: "#ECE8DF", roughness: 0.9, normalMap: insideFiber, normalScale: nScale(0.35) })),
  };
  const ceramic = (hex: string) => live(new THREE.MeshPhysicalMaterial({ color: hex, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.03, sheen: 0.2, sheenColor: new THREE.Color("#ffffff") }));
  // pine: one grain image for the walls, and engraving drawn over a copy of it
  const woodImg = woodCanvas();
  const woodBase = canvasTex(woodImg, true, true);
  const wood = (uMm: number, vMm: number) => {
    const t = woodBase.clone();
    t.repeat.set(uMm / 320, vMm / 160);
    t.needsUpdate = true;
    disposables.push(t);
    return live(new THREE.MeshPhysicalMaterial({ map: t, roughness: 0.78, sheen: 0.25, sheenRoughness: 0.7, sheenColor: new THREE.Color("#fff3df"), normalMap: insideFiber, normalScale: nScale(0.25) }));
  };
  const engraved = (kind: FaceKind, wMm: number, hMm: number) => {
    const ppm = Math.min(8, maxTex / Math.max(wMm, hMm));
    const art = drawFace(kind, wMm, hMm, ppm, { ...a, finish: "matte", effects: [] }).color;
    const W = art.width;
    const H = art.height;
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(woodImg, 0, 0, woodImg.width * Math.min(1, wMm / 320), woodImg.height * Math.min(1, hMm / 160), 0, 0, W, H);
    // burn: wherever the artwork differs from its ground color
    const src = art.getContext("2d")!.getImageData(0, 0, W, H);
    const dst = ctx.getImageData(0, 0, W, H);
    const g = new THREE.Color(roles.ground);
    const gr = g.r * 255;
    const gg = g.g * 255;
    const gb = g.b * 255;
    for (let i = 0; i < src.data.length; i += 4) {
      const d = Math.min(1, Math.hypot(src.data[i] - gr, src.data[i + 1] - gg, src.data[i + 2] - gb) / 90);
      const k = d * 0.66;
      dst.data[i] = dst.data[i] * (1 - k) + 58 * k;
      dst.data[i + 1] = dst.data[i + 1] * (1 - k) + 36 * k;
      dst.data[i + 2] = dst.data[i + 2] * (1 - k) + 20 * k;
    }
    ctx.putImageData(dst, 0, 0);
    return live(new THREE.MeshPhysicalMaterial({ map: canvasTex(c, true), roughness: 0.8, sheen: 0.25, sheenRoughness: 0.7, sheenColor: new THREE.Color("#fff3df"), normalMap: insideFiber, normalScale: nScale(0.25) }));
  };
  const plainCache = new Map<Surface, THREE.MeshPhysicalMaterial>();
  const plain = (surface: Surface = "board") => {
    let m = plainCache.get(surface);
    if (!m) plainCache.set(surface, (m = tex("bottom", 60, 60, surface)));
    return m;
  };

  return { tex, edge, inside, lining, velvet, bareMetal, kraft, flute, plastic, anodised, glass, fill, insert: (kind) => inserts[kind], ceramic, plain, wood, engraved, rope, cork, brocade, bone, dispose: () => disposables.forEach((x) => x.dispose()) };
}
