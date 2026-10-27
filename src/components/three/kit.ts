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
  tex: (kind: FaceKind, wMm: number, hMm: number, surface?: Surface) => THREE.MeshPhysicalMaterial;
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
} as const;

/** Tangent-space normal map of a raised mask (emboss): white areas stand up, edges slope. */
function embossNormal(mask: HTMLCanvasElement, strength = 3): HTMLCanvasElement {
  const k = Math.min(1, 1024 / Math.max(mask.width, mask.height));
  const W = Math.max(4, Math.round(mask.width * k));
  const H = Math.max(4, Math.round(mask.height * k));
  const b = document.createElement("canvas");
  b.width = W;
  b.height = H;
  const bx = b.getContext("2d", { willReadFrequently: true })!;
  bx.filter = `blur(${Math.max(1, W / 512).toFixed(1)}px)`;
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
const woodCanvas = once("wood", woodCanvasRaw);
const fluteCanvas = once("flute", fluteCanvasRaw);

export function makeKit(renderer: THREE.WebGLRenderer, a: ArtInput, maxTex: number, category = "other"): Kit {
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

  const tex = (kind: FaceKind, wMm: number, hMm: number, surface: Surface = "board") => {
    const ppm = Math.min(16, maxTex / Math.max(wMm, hMm));
    const art = drawFace(kind, wMm, hMm, ppm, a);
    const board = surface === "board";
    let fib: THREE.Texture | null = null;
    if (board) {
      fib = fiber.clone();
      fib.repeat.set(wMm / 40, hMm / 40);
      fib.needsUpdate = true;
      disposables.push(fib);
    }
    // printed tinplate is lacquered; film is laminated (gloss or matte by finish); moulded
    // plastic is printed directly, satin
    const rough = surface === "metal" ? 0.34 : surface === "film" ? f.film : surface === "plastic" ? 0.38 : surface === "glaze" ? 0.1 : f.rough;
    const m = new THREE.MeshPhysicalMaterial({
      map: canvasTex(art.color, true),
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
    if (art.foil) {
      const foil = fx.find((e) => e === "goldFoil" || e === "silverFoil" || e === "holo");
      if (foil) {
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
      if (fx.includes("emboss")) {
        m.normalMap = canvasTex(embossNormal(art.foil), false);
        m.normalScale = nScale(1.6);
      }
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

  return { tex, edge, inside, lining, velvet, bareMetal, kraft, flute, plastic, anodised, glass, fill, insert: (kind) => inserts[kind], ceramic, plain, wood, engraved, rope, cork, dispose: () => disposables.forEach((x) => x.dispose()) };
}
