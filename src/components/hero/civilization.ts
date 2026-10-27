/**
 * 从平面到立体 From flat to form — the second homepage film, drawn live in code.
 *
 * Seven chapters of how people moved between flat marks and solid things: a hand stencilled
 * on rock, signs cut into bone, Bi Sheng's movable type, linear perspective, descriptive
 * geometry, the folding carton, and digital 3D. In each, something flat becomes solid (or a
 * solid makes something flat), and a 2D layer of lines stays on top to show the construction.
 *
 * Dates follow the usual references: Sulawesi hand stencils at least 39,900 years old;
 * Late Shang oracle bones, c. 1200 BC; Bi Sheng's type, 1040s (Shen Kuo); Brunelleschi's
 * perspective, c. 1420; Monge's Géométrie descriptive, 1799; Robert Gair's carton, 1879;
 * Sketchpad III, 1963.
 */
import * as THREE from "three";
import type { Direction } from "@/lib/board/schema";
import { studioEquirect } from "../three/studio";
import { buildCarton, cartonPose, clamp, ease, easeOut, seg, tex, type CartonBuild, type HeroItem } from "./symbiosis";

import { CHAPTER_SECONDS, CHAPTERS } from "./chapters";
export { CHAPTERS, type Chapter } from "./chapters";

export const CH = CHAPTER_SECONDS;
export const CIV_DUR = CH * CHAPTERS.length;

/* ---------------------------------------------------------------- helpers */

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")!];
}

/** Repeatable pseudo-random numbers. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Smooth value noise, 0..1. */
function noise2(seed: number) {
  const r = rng(seed);
  const N = 256;
  const g = Array.from({ length: N * N }, () => r());
  const at = (x: number, y: number) => g[((y % N) + N) % N * N + (((x % N) + N) % N)];
  const sm = (t: number) => t * t * (3 - 2 * t);
  return (x: number, y: number) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const fx = sm(x - xi);
    const fy = sm(y - yi);
    const a = at(xi, yi) + (at(xi + 1, yi) - at(xi, yi)) * fx;
    const b = at(xi, yi + 1) + (at(xi + 1, yi + 1) - at(xi, yi + 1)) * fx;
    return a + (b - a) * fy;
  };
}

/** Draws a path partially: the first `p` (0–1) of its length, using a dash. */
function strokePart(ctx: CanvasRenderingContext2D, path: Path2D, len: number, p: number) {
  if (p <= 0) return;
  ctx.setLineDash([len * p, len * 2]);
  ctx.stroke(path);
  ctx.setLineDash([]);
}

type Cam = { pos: THREE.Vector3; at: THREE.Vector3 };
type Lines = { pts: [number, number][]; color: string; width: number; dash?: string; p?: number; head?: boolean }[];

/** One chapter: its objects and how they move over its 8 seconds. */
type Act = {
  group: THREE.Group;
  bg: string;
  /** Poses the objects; returns the camera and 2D lines (world points, projected later). */
  pose: (t: number) => { cam: Cam; lines: { pts: THREE.Vector3[]; color: string; width: number; dash?: string; p?: number; head?: boolean }[]; light: { pos: THREE.Vector3; color: string; intensity: number } };
  dispose: () => void;
};

/* ---------------------------------------------------------------- 1. hand on the rock */

/** Outline of a left hand, fingers spread, wrist at the bottom (0–1 box). */
const HAND: [number, number][] = [
  [0.36, 1.0], [0.3, 0.72], [0.2, 0.62], [0.08, 0.5], [0.03, 0.43], [0.07, 0.38], [0.16, 0.43], [0.27, 0.5],
  [0.26, 0.3], [0.24, 0.12], [0.27, 0.07], [0.32, 0.09], [0.35, 0.27], [0.38, 0.42],
  [0.4, 0.2], [0.42, 0.03], [0.47, 0.0], [0.51, 0.04], [0.51, 0.22], [0.5, 0.41],
  [0.56, 0.22], [0.6, 0.08], [0.65, 0.07], [0.67, 0.13], [0.63, 0.32], [0.6, 0.45],
  [0.68, 0.33], [0.74, 0.25], [0.79, 0.26], [0.8, 0.32], [0.72, 0.48], [0.68, 0.6],
  [0.66, 0.74], [0.62, 1.0],
];

/** A bovid in charcoal, facing right (in a 420 × 260 box): body outline first, then the rest. */
const ANIMAL: string[] = [
  "M40 78 C70 40 120 18 170 22 C220 26 260 30 295 52 C320 66 345 88 372 112 C384 124 380 140 366 142 C350 146 330 140 318 134 C305 150 298 168 290 182 L292 246 L282 248 L272 196 C240 200 200 200 170 196 L130 192 L128 246 L118 248 L108 206 C100 180 70 160 60 140 C52 120 44 100 40 78 Z",
  "M298 56 C300 40 312 30 330 33",
  "M288 52 C283 38 289 26 303 22",
  "M42 82 C30 112 28 142 34 172",
  "M156 196 L150 240",
  "M256 198 L264 242",
];

function pathLen(d: string): number {
  try {
    const el = document.createElementNS("http://www.w3.org/2000/svg", "path");
    el.setAttribute("d", d);
    return el.getTotalLength() || 400;
  } catch {
    return 400;
  }
}

/** Strokes a list of paths one after another, `p` (0–1) of the way through the list. */
function strokeSeq(ctx: CanvasRenderingContext2D, paths: { path: Path2D; len: number }[], p: number) {
  const total = paths.reduce((a, x) => a + x.len, 0);
  let left = total * p;
  for (const x of paths) {
    if (left <= 0) break;
    strokePart(ctx, x.path, x.len, Math.min(1, left / x.len));
    left -= x.len;
  }
}

function actCave(r: THREE.WebGLRenderer, own: { dispose(): void }[]): Act {
  const W = 2048;
  const H = 1152;
  const PX = 177.8; // canvas pixels per world unit
  const nz = noise2(7);
  // the rock: colour baked once, with a torchlit falloff towards the edges
  const [base, bx] = canvas(W, H);
  const img = bx.createImageData(W, H);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const n = 0.5 * nz(x / 110, y / 110) + 0.3 * nz(x / 28, y / 28) + 0.2 * nz(x / 5, y / 5);
      const vein = Math.max(0, 1 - Math.abs(nz(x / 260 + 40, y / 90) - 0.5) * 14) * 0.12;
      const o = (y * W + x) * 4;
      img.data[o] = 128 + n * 66 - vein * 60;
      img.data[o + 1] = 104 + n * 54 - vein * 50;
      img.data[o + 2] = 82 + n * 42 - vein * 40;
      img.data[o + 3] = 255;
    }
  bx.putImageData(img, 0, 0);
  const vg = bx.createRadialGradient(W * 0.54, H * 0.5, H * 0.18, W * 0.54, H * 0.5, W * 0.62);
  vg.addColorStop(0, "rgba(12, 7, 4, 0)");
  vg.addColorStop(1, "rgba(12, 7, 4, 0.82)");
  bx.fillStyle = vg;
  bx.fillRect(0, 0, W, H);

  // the hand stencil: pigment blown round a hand pressed to the rock
  const hx = 760;
  const hy = 410;
  const hs = 300;
  const hp = HAND.map(([x, y]) => [hx + x * hs, hy + y * hs] as [number, number]);
  const hand = new Path2D();
  hand.moveTo((hp[0][0] + hp[hp.length - 1][0]) / 2, (hp[0][1] + hp[hp.length - 1][1]) / 2);
  for (let i = 0; i < hp.length; i++) {
    const a = hp[i];
    const b = hp[(i + 1) % hp.length];
    hand.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
  }
  hand.closePath();
  const r0 = rng(11);
  const [, test] = canvas(4, 4);
  const segs = hp.map((a, i) => {
    const b = hp[(i + 1) % hp.length];
    return { a, b, len: Math.hypot(b[0] - a[0], b[1] - a[1]) };
  });
  const per = segs.reduce((a, s) => a + s.len, 0);
  const dots: { x: number; y: number; r: number; a: number }[] = [];
  while (dots.length < 16000) {
    let x: number;
    let y: number;
    if (r0() < 0.8) {
      // near the outline, falling off with distance
      let k = r0() * per;
      let s = segs[0];
      for (s of segs) {
        if (k <= s.len) break;
        k -= s.len;
      }
      const f = k / s.len;
      const ang = r0() * Math.PI * 2;
      const d = -Math.log(1 - r0() * 0.999) * 34;
      x = s.a[0] + (s.b[0] - s.a[0]) * f + Math.cos(ang) * d;
      y = s.a[1] + (s.b[1] - s.a[1]) * f + Math.sin(ang) * d;
    } else {
      // the wider cloud
      const ang = r0() * Math.PI * 2;
      const d = Math.sqrt(-2 * Math.log(1 - r0() * 0.999)) * 120;
      x = hx + hs * 0.45 + Math.cos(ang) * d * 1.05;
      y = hy + hs * 0.5 + Math.sin(ang) * d;
    }
    if (test.isPointInPath(hand, x, y)) continue;
    const wash = r0() < 0.06;
    dots.push({ x, y, r: wash ? 8 + r0() * 14 : 0.7 + r0() * r0() * 3, a: wash ? 0.04 : 0.16 + r0() * 0.42 });
  }
  const [sprayC, sx] = canvas(W, H);
  let sprayed = 0;
  const sprayTo = (n: number) => {
    if (n < sprayed) {
      sx.clearRect(0, 0, W, H);
      sprayed = 0;
    }
    for (; sprayed < n; sprayed++) {
      const d = dots[sprayed];
      sx.fillStyle = `rgba(152, 50, 28, ${d.a})`;
      sx.beginPath();
      sx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      sx.fill();
    }
    // the hand kept the rock clean, edge and all
    sx.save();
    sx.globalCompositeOperation = "destination-out";
    sx.fill(hand);
    sx.restore();
  };

  // the animal, drawn in charcoal stroke by stroke, then washed with red ochre
  const ax = 1120;
  const ay = 468;
  const ak = 0.78;
  const animal = ANIMAL.map((d) => {
    const path = new Path2D();
    path.addPath(new Path2D(d), new DOMMatrix([ak, 0, 0, ak, ax, ay]));
    return { path, len: pathLen(d) * ak };
  });

  const [paint, px] = canvas(W, H);
  const [bump, bmp] = canvas(W, H);
  const map = tex(paint, r);
  const bumpTex = new THREE.CanvasTexture(bump);
  own.push(map, bumpTex);
  let drawn = { spray: -1, line: -1, fill: -1 };
  let bumpAt = -1;
  const redraw = (spray: number, line: number, fill: number) => {
    if (Math.abs(spray - drawn.spray) < 0.003 && Math.abs(line - drawn.line) < 0.003 && Math.abs(fill - drawn.fill) < 0.01) return;
    drawn = { spray, line, fill };
    sprayTo(Math.floor(dots.length * spray));
    px.drawImage(base, 0, 0);
    px.drawImage(sprayC, 0, 0);
    if (fill > 0) {
      px.fillStyle = `rgba(120, 38, 22, ${0.5 * fill})`;
      px.fill(animal[0].path);
    }
    px.lineCap = "round";
    px.lineJoin = "round";
    px.strokeStyle = "rgba(26, 18, 14, 0.9)";
    px.lineWidth = 8;
    strokeSeq(px, animal, line);
    px.strokeStyle = "rgba(26, 18, 14, 0.35)";
    px.lineWidth = 14;
    strokeSeq(px, animal, line);
    map.needsUpdate = true;
    // the relief: the drawing is engraved into the rock (only redrawn when the drawing grows)
    if (line !== bumpAt) {
      bumpAt = line;
      bmp.fillStyle = "#808080";
      bmp.fillRect(0, 0, W, H);
      bmp.lineCap = "round";
      bmp.lineJoin = "round";
      bmp.strokeStyle = "#202020";
      bmp.lineWidth = 12;
      strokeSeq(bmp, animal, line);
      bumpTex.needsUpdate = true;
    }
  };
  const geo = new THREE.PlaneGeometry(W / PX, H / PX, 320, 180);
  const pos = geo.getAttribute("position") as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    pos.setZ(i, (nz(x * 1.1 + 9, y * 1.1) - 0.5) * 0.24 + (nz(x * 5, y * 5) - 0.5) * 0.05);
  }
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ map, bumpMap: bumpTex, bumpScale: 0, roughness: 0.95 });
  own.push(geo, mat);
  const wall = new THREE.Mesh(geo, mat);
  wall.receiveShadow = true;
  const group = new THREE.Group();
  group.add(wall);
  const cx = ((hx + ax + 420 * ak) / 2 - W / 2) / PX;
  return {
    group,
    bg: "#140F0B",
    pose: (t) => {
      redraw(easeOut(seg(t, [0.3, 3.0])), seg(t, [2.6, 5.0]), ease(seg(t, [4.8, 5.8])));
      const relief = ease(seg(t, [5.2, 7.2]));
      mat.bumpScale = relief * 7;
      const k = ease(seg(t, [4.6, 8]));
      return {
        cam: { pos: new THREE.Vector3(cx + k * 1.9, 0.05, 8 - k * 2.4), at: new THREE.Vector3(cx + k * 0.7, 0, 0) },
        lines: [],
        light: { pos: new THREE.Vector3(cx - 2 - relief * 4.5, 2.4 - relief * 1.4, 5 - relief * 4), color: "#FFD3A0", intensity: 2.0 + relief * 1.6 },
      };
    },
    dispose: () => undefined,
  };
}

/* ---------------------------------------------------------------- 2. signs cut into bone */

const GLYPHS: string[] = [
  // 日
  "M0.25 0.12 L0.75 0.12 Q0.85 0.12 0.85 0.25 L0.85 0.78 Q0.85 0.9 0.75 0.9 L0.25 0.9 Q0.15 0.9 0.15 0.78 L0.15 0.25 Q0.15 0.12 0.25 0.12 Z M0.35 0.51 L0.65 0.51",
  // 月
  "M0.62 0.08 Q0.2 0.25 0.22 0.6 Q0.25 0.85 0.62 0.94 Q0.45 0.7 0.47 0.5 Q0.48 0.28 0.62 0.08 Z M0.33 0.52 L0.45 0.47",
  // 山
  "M0.1 0.86 L0.9 0.86 M0.2 0.86 L0.2 0.45 M0.5 0.86 L0.5 0.12 M0.8 0.86 L0.8 0.45",
  // 人
  "M0.58 0.08 Q0.5 0.5 0.22 0.92 M0.5 0.48 Q0.62 0.66 0.74 0.9",
  // 木
  "M0.5 0.05 L0.5 0.95 M0.5 0.36 L0.2 0.1 M0.5 0.36 L0.8 0.1 M0.5 0.7 L0.2 0.95 M0.5 0.7 L0.8 0.95",
];

function actBone(r: THREE.WebGLRenderer, own: { dispose(): void }[]): Act {
  const W = 1024;
  const H = 1400;
  const nz = noise2(23);
  const [base, bx] = canvas(W, H);
  const img = bx.createImageData(W, H);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const n = 0.6 * nz(x / 70, y / 70) + 0.4 * nz(x / 9, y / 9);
      const o = (y * W + x) * 4;
      img.data[o] = 206 + n * 32;
      img.data[o + 1] = 190 + n * 30;
      img.data[o + 2] = 158 + n * 26;
      img.data[o + 3] = 255;
    }
  bx.putImageData(img, 0, 0);
  // heat cracks first (the reading of the oracle), then the inscription in one column
  const cracks = new Path2D("M300 200 L300 520 M300 330 L420 300 M720 640 L720 980 M720 760 L600 735 M300 1050 L300 1300 M300 1150 L410 1130");
  const [paint, px] = canvas(W, H);
  const [bump, bmp] = canvas(W, H);
  const map = tex(paint, r);
  const bumpTex = new THREE.CanvasTexture(bump);
  own.push(map, bumpTex);
  const glyphs = GLYPHS.map((d) => {
    const p = new Path2D();
    p.addPath(new Path2D(d.replace(/(\d*\.\d+|\d+)/g, (v) => String(Number(v) * 200))));
    return p;
  });
  let last = { c: -1, g: -1 };
  const redraw = (crack: number, glyph: number) => {
    if (Math.abs(crack - last.c) < 0.004 && Math.abs(glyph - last.g) < 0.003) return;
    last = { c: crack, g: glyph };
    px.drawImage(base, 0, 0);
    bmp.fillStyle = "#ffffff";
    bmp.fillRect(0, 0, W, H);
    px.lineCap = bmp.lineCap = "round";
    px.lineJoin = bmp.lineJoin = "round";
    px.strokeStyle = "rgba(70, 40, 18, 0.9)";
    px.lineWidth = 5;
    strokePart(px, cracks, 1600, crack);
    for (let i = 0; i < glyphs.length; i++) {
      const p = clamp(glyph * glyphs.length - i);
      if (p <= 0) break;
      for (const [ctx, color, w] of [
        [px, "rgba(74, 52, 30, 0.92)", 14],
        [bmp, "#000000", 18],
      ] as [CanvasRenderingContext2D, string, number][]) {
        ctx.save();
        ctx.translate(412, 140 + i * 230);
        ctx.strokeStyle = color;
        ctx.lineWidth = w;
        strokePart(ctx, glyphs[i], 900, p);
        ctx.restore();
      }
    }
    map.needsUpdate = true;
    bumpTex.needsUpdate = true;
  };
  // a plastron-like plate: rounded outline with notches at the sides
  const shape = new THREE.Shape();
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i <= 64; i++) {
    const a = (i / 64) * Math.PI * 2;
    const notch = Math.abs(Math.cos(a)) > 0.92 ? 0.9 : 1;
    pts.push(new THREE.Vector2(Math.cos(a) * 1.35 * notch, Math.sin(a) * 1.85 * (0.96 + 0.04 * Math.cos(3 * a))));
  }
  shape.setFromPoints(pts);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.12, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.06, bevelSegments: 4, curveSegments: 64 });
  // planar UVs on the face
  const uv = geo.getAttribute("uv") as THREE.BufferAttribute;
  const p3 = geo.getAttribute("position") as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (p3.getX(i) + 1.45) / 2.9, (p3.getY(i) + 1.95) / 3.9);
  const mat = new THREE.MeshStandardMaterial({ map, bumpMap: bumpTex, bumpScale: 0, roughness: 0.62 });
  own.push(geo, mat);
  const plate = new THREE.Mesh(geo, mat);
  plate.castShadow = true;
  plate.receiveShadow = true;
  const group = new THREE.Group();
  const holder = new THREE.Group();
  holder.add(plate);
  group.add(holder);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshStandardMaterial({ color: "#2B241E", roughness: 1 }));
  own.push(ground.geometry, ground.material as THREE.Material);
  ground.position.z = -0.2;
  ground.receiveShadow = true;
  group.add(ground);
  return {
    group,
    bg: "#241E19",
    pose: (t) => {
      redraw(ease(seg(t, [0.3, 1.8])), seg(t, [1.6, 4.8]));
      const cut = ease(seg(t, [4.6, 6.4]));
      mat.bumpScale = -cut * 5;
      const tilt = ease(seg(t, [4.8, 8]));
      holder.rotation.set(-tilt * 0.75, tilt * 0.35, -0.08);
      return {
        cam: { pos: new THREE.Vector3(0, -0.2 - tilt * 0.9, 7.6 - tilt * 1.0), at: new THREE.Vector3(0, 0, 0) },
        lines: [],
        light: { pos: new THREE.Vector3(-3.2 + cut, 2.6, 2.2 - cut * 1.2), color: "#FFE2B8", intensity: 2.4 },
      };
    },
    dispose: () => undefined,
  };
}

/* ---------------------------------------------------------------- 3. movable type */

const QIANZI = "天地玄黄宇宙洪荒日月盈昃辰宿列张寒来暑往秋收冬藏";
const SERIF = '"Songti SC", "STSong", "SimSun", "NSimSun", "Noto Serif CJK SC", "Source Han Serif SC", serif';

function actType(r: THREE.WebGLRenderer, own: { dispose(): void }[]): Act {
  const cols = 6;
  const rows = 4;
  const S = 0.5;
  const gap = 0.04;
  const group = new THREE.Group();
  const clay = new THREE.MeshStandardMaterial({ color: "#B7774E", roughness: 0.85 });
  own.push(clay);
  type Sort = { mesh: THREE.Group; ink: THREE.MeshStandardMaterial; x: number; z: number; i: number };
  const sorts: Sort[] = [];
  const boxGeo = new THREE.BoxGeometry(S, 0.62, S);
  const topGeo = new THREE.PlaneGeometry(S * 0.96, S * 0.96);
  own.push(boxGeo, topGeo);
  // Type is cut in mirror image. Reading order on the page is columns from right to left,
  // each top to bottom; the page is turned over like a book page (about its left edge),
  // which mirrors left and right, so the type sits in mirrored columns.
  for (let c = 0; c < cols; c++)
    for (let rr = 0; rr < rows; rr++) {
      const i = c * rows + rr;
      const ch = QIANZI[i];
      const [cv, cx] = canvas(256, 256);
      cx.fillStyle = "#B7774E";
      cx.fillRect(0, 0, 256, 256);
      cx.translate(256, 0);
      cx.scale(-1, 1);
      cx.fillStyle = "#6B3E22";
      cx.font = `700 196px ${SERIF}`;
      cx.textAlign = "center";
      cx.textBaseline = "middle";
      cx.fillText(ch, 128, 140);
      const [ik, ix] = canvas(256, 256);
      ix.translate(256, 0);
      ix.scale(-1, 1);
      ix.fillStyle = "#151210";
      ix.font = `700 196px ${SERIF}`;
      ix.textAlign = "center";
      ix.textBaseline = "middle";
      ix.fillText(ch, 128, 140);
      const topM = new THREE.MeshStandardMaterial({ map: tex(cv, r), roughness: 0.8 });
      const inkM = new THREE.MeshStandardMaterial({ map: tex(ik, r), transparent: true, opacity: 0, roughness: 0.4 });
      own.push(topM, inkM, topM.map!, inkM.map!);
      const g = new THREE.Group();
      const b = new THREE.Mesh(boxGeo, clay);
      b.castShadow = true;
      b.position.y = -0.31;
      const top = new THREE.Mesh(topGeo, topM);
      top.rotation.x = -Math.PI / 2;
      top.position.y = 0.0015;
      const ink = new THREE.Mesh(topGeo, inkM);
      ink.rotation.x = -Math.PI / 2;
      ink.position.y = 0.003;
      g.add(b, top, ink);
      // mirrored column: reading column c (from the right) sits at mirrored x
      const x = (c - (cols - 1) / 2) * (S + gap);
      const z = (rr - (rows - 1) / 2) * (S + gap);
      g.position.set(x, 0, z);
      group.add(g);
      sorts.push({ mesh: g, ink: inkM, x, z, i });
    }
  // the iron forme the type is set in, flush with the type's shoulders
  const tray = new THREE.Mesh(new THREE.BoxGeometry(cols * (S + gap) + 0.3, 0.6, rows * (S + gap) + 0.3), new THREE.MeshStandardMaterial({ color: "#4A3E34", roughness: 0.55, metalness: 0.35 }));
  own.push(tray.geometry, tray.material as THREE.Material);
  tray.position.y = -0.33;
  tray.receiveShadow = true;
  group.add(tray);
  // the printed page
  const PW = cols * (S + gap) + 0.5;
  const PH = rows * (S + gap) + 0.5;
  const [page, pg] = canvas(1024, Math.round((1024 * PH) / PW));
  pg.fillStyle = "#F4EEDF";
  pg.fillRect(0, 0, page.width, page.height);
  const pageTex = tex(page, r);
  const [printed, pr] = canvas(page.width, page.height);
  pr.drawImage(page, 0, 0);
  // the box face's texture runs the other way round once the sheet is turned over
  pr.translate(page.width, page.height);
  pr.scale(-1, -1);
  const k = page.width / PW;
  pr.fillStyle = "#1A1714";
  pr.font = `700 ${Math.round(S * k * 0.76)}px ${SERIF}`;
  pr.textAlign = "center";
  pr.textBaseline = "middle";
  for (let c = 0; c < cols; c++)
    for (let rr = 0; rr < rows; rr++) {
      // readable page: column c from the right edge
      const x = page.width / 2 + ((cols - 1) / 2 - c) * (S + gap) * k;
      const y = page.height / 2 + (rr - (rows - 1) / 2) * (S + gap) * k;
      pr.fillText(QIANZI[c * rows + rr], x, y + S * k * 0.06);
    }
  const printedTex = tex(printed, r);
  own.push(pageTex, printedTex);
  const paperBack = new THREE.MeshStandardMaterial({ color: "#F4EEDF", roughness: 0.92 });
  const paperFront = new THREE.MeshStandardMaterial({ map: pageTex, roughness: 0.92 });
  own.push(paperBack, paperFront);
  const sheetGeo = new THREE.BoxGeometry(PW, 0.006, PH);
  own.push(sheetGeo);
  // faces: +y is the blank back while it lies face down; -y is the printed face
  const paper = new THREE.Mesh(sheetGeo, [paperBack, paperBack, paperBack, paperFront, paperBack, paperBack]);
  paper.castShadow = true;
  const hinge = new THREE.Group();
  hinge.position.set(-PW / 2, 0, 0);
  paper.position.set(PW / 2, 0, 0);
  hinge.add(paper);
  group.add(hinge);
  // ink roller
  const roller = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, PH + 0.2, 32), new THREE.MeshStandardMaterial({ color: "#1C1A18", roughness: 0.3 }));
  own.push(roller.geometry, roller.material as THREE.Material);
  roller.rotation.x = Math.PI / 2;
  roller.castShadow = true;
  group.add(roller);
  return {
    group,
    bg: "#EDE6D8",
    pose: (t) => {
      const span = (cols * (S + gap)) / 2 + 0.4;
      for (const s of sorts) {
        // set one by one into the forme, column by column
        const p = clamp((t - 0.15 - s.i * 0.075) / 0.45);
        s.mesh.position.y = (1 - easeOut(p)) * 0.9;
        s.mesh.visible = p > 0;
      }
      const rp = seg(t, [2.4, 3.6]);
      roller.visible = rp > 0 && rp < 1;
      const rx = -span + rp * 2 * span;
      roller.position.set(rx, 0.14, 0);
      for (const s of sorts) s.ink.opacity = clamp((rx - s.x) * 3);
      // the page comes down, takes the ink, lifts and turns over to the left
      const down = ease(seg(t, [3.6, 4.4]));
      const up = ease(seg(t, [4.7, 5.3]));
      const turn = ease(seg(t, [5.3, 6.6]));
      hinge.position.y = 2.2 * (1 - down) + 0.012 + up * 0.25;
      hinge.rotation.z = turn * Math.PI;
      paper.visible = t > 3.4;
      paperFront.map = t > 4.4 ? printedTex : pageTex;
      const end = ease(seg(t, [5.4, 8]));
      return {
        cam: { pos: new THREE.Vector3(1.2 - end * 3.4, 4.2 - end * 0.6, 4.4 - end * 0.8), at: new THREE.Vector3(-end * 2.6, 0, 0) },
        lines: [],
        light: { pos: new THREE.Vector3(-3, 6, 3), color: "#FFF6E8", intensity: 2.4 },
      };
    },
    dispose: () => undefined,
  };
}

/* ---------------------------------------------------------------- 4. linear perspective */

function actPerspective(r: THREE.WebGLRenderer, own: { dispose(): void }[]): Act {
  const group = new THREE.Group();
  const [floor, fx] = canvas(512, 2048);
  for (let y = 0; y < 16; y++)
    for (let x = 0; x < 4; x++) {
      fx.fillStyle = (x + y) % 2 ? "#E9DCC4" : "#9C4A35";
      fx.fillRect(x * 128, y * 128, 128, 128);
    }
  const floorTex = tex(floor, r);
  own.push(floorTex);
  const floorMat = new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.55, transparent: true, opacity: 0 });
  const floorGeo = new THREE.PlaneGeometry(4, 16);
  own.push(floorMat, floorGeo);
  const plane = new THREE.Mesh(floorGeo, floorMat);
  plane.rotation.x = -Math.PI / 2;
  plane.position.z = -6;
  plane.receiveShadow = true;
  group.add(plane);
  const stone = new THREE.MeshStandardMaterial({ color: "#EFE9DD", roughness: 0.6 });
  own.push(stone);
  const prof = [
    [0, 0], [0.24, 0], [0.24, 0.08], [0.2, 0.1], [0.2, 0.14], [0.16, 0.18], [0.15, 2.0], [0.2, 2.08], [0.24, 2.16], [0.24, 2.24], [0, 2.24],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const colGeo = new THREE.LatheGeometry(prof, 32);
  own.push(colGeo);
  const cols: THREE.Mesh[] = [];
  for (const side of [-1, 1])
    for (let i = 0; i < 6; i++) {
      const m = new THREE.Mesh(colGeo, stone);
      m.position.set(side * 1.6, 0, -0.5 - i * 2.2);
      m.castShadow = true;
      m.receiveShadow = true;
      m.userData.i = i;
      group.add(m);
      cols.push(m);
    }
  const beamGeo = new THREE.BoxGeometry(0.5, 0.3, 11.6);
  own.push(beamGeo);
  const beams = [-1, 1].map((side) => {
    const b = new THREE.Mesh(beamGeo, stone);
    b.position.set(side * 1.6, 2.39, -6);
    b.castShadow = true;
    group.add(b);
    return b;
  });
  return {
    group,
    bg: "#EFE8DA",
    pose: (t) => {
      const grid = seg(t, [0.2, 2.2]);
      floorMat.opacity = ease(seg(t, [1.2, 2.6]));
      for (const c of cols) {
        const p = ease(clamp((t - 2.6 - (c.userData.i as number) * 0.18) / 0.8));
        c.scale.set(1, Math.max(0.001, p), 1);
        c.visible = p > 0.001;
      }
      for (const b of beams) {
        const p = ease(seg(t, [4.2, 5.2]));
        b.scale.set(1, 1, Math.max(0.001, p));
        b.position.z = -0.5 - (1 - p) * 0 - 5.5 * p;
        b.visible = p > 0.01;
      }
      const walk = ease(seg(t, [5.0, 8]));
      const z = 7 - walk * 7.5;
      // the construction: horizon, vanishing point, orthogonals through the tile edges
      const lines: ReturnType<Act["pose"]>["lines"] = [];
      const fade = 1 - seg(t, [4.4, 6]);
      if (fade > 0) {
        for (let k = -4; k <= 4; k++) lines.push({ pts: [new THREE.Vector3(k * 0.5, 0, 2), new THREE.Vector3(k * 0.5, 0, -60)], color: `rgba(156, 74, 53, ${0.9 * fade})`, width: 1.1, p: clamp(grid * 1.4 - Math.abs(k) * 0.08) });
        lines.push({ pts: [new THREE.Vector3(-40, 1.6, -60), new THREE.Vector3(40, 1.6, -60)], color: `rgba(40, 40, 40, ${0.6 * fade})`, width: 1, p: grid });
        for (let j = 0; j < 8; j++) lines.push({ pts: [new THREE.Vector3(-2, 0, 2 - j * 1), new THREE.Vector3(2, 0, 2 - j * 1)], color: `rgba(156, 74, 53, ${0.55 * fade})`, width: 0.8, p: clamp(grid * 1.6 - j * 0.1) });
      }
      return {
        cam: { pos: new THREE.Vector3(0, 1.6, z), at: new THREE.Vector3(0, 1.6, z - 20) },
        lines,
        light: { pos: new THREE.Vector3(-4, 7, 4 + z * 0.3), color: "#FFF4E2", intensity: 2.6 },
      };
    },
    dispose: () => undefined,
  };
}

/* ---------------------------------------------------------------- 5. descriptive geometry */

function actProjection(r: THREE.WebGLRenderer, own: { dispose(): void }[]): Act {
  const group = new THREE.Group();
  const BLUE = "#1E4C7A";
  const L = 1.7;
  // house: 1.4 wide, 0.9 to the eaves, 1.35 to the ridge, 1.0 deep
  const W = 1.4;
  const E = 0.9;
  const R = 1.35;
  const D = 1.0;
  const plane = (draw: (g: CanvasRenderingContext2D, p: number) => void) => {
    const [c, g] = canvas(1024, 1024);
    const t = tex(c, r);
    own.push(t);
    let last = -1;
    const update = (p: number) => {
      if (Math.abs(p - last) < 0.004) return;
      last = p;
      g.fillStyle = BLUE;
      g.fillRect(0, 0, 1024, 1024);
      g.strokeStyle = "rgba(255,255,255,0.12)";
      g.lineWidth = 1;
      for (let i = 0; i <= 1024; i += 64) {
        g.beginPath();
        g.moveTo(i, 0);
        g.lineTo(i, 1024);
        g.moveTo(0, i);
        g.lineTo(1024, i);
        g.stroke();
      }
      g.strokeStyle = "#F4F8FF";
      g.lineWidth = 5;
      g.lineJoin = "round";
      draw(g, p);
      t.needsUpdate = true;
    };
    const m = new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 });
    own.push(m);
    return { m, update };
  };
  // canvas coordinates: 1024 px = 2L units, centred
  const u = 1024 / (2 * L);
  const cxy = (x: number, y: number): [number, number] => [512 + x * u, 512 - y * u];
  const drawPoly = (g: CanvasRenderingContext2D, pts: [number, number][], p: number, extra?: [number, number][][]) => {
    const path = new Path2D();
    pts.forEach(([x, y], i) => (i ? path.lineTo(...cxy(x, y)) : path.moveTo(...cxy(x, y))));
    path.closePath();
    extra?.forEach((seg2) => {
      path.moveTo(...cxy(seg2[0][0], seg2[0][1]));
      path.lineTo(...cxy(seg2[1][0], seg2[1][1]));
    });
    strokePart(g, path, 6000, p);
  };
  // front view on the back wall (x, y), side view on the left wall (z, y), plan on the floor (x, z)
  // The house stands at (OX, 0, OZ). Wall canvases: back wall x → x, y → y − L; left wall
  // (turned a quarter about y) x → −z, y → y − L; floor x → x, y → −z.
  const OX = 0.25;
  const OZ = 0.25;
  const front = plane((g, p) => drawPoly(g, [[-W / 2, 0], [W / 2, 0], [W / 2, E], [0, R], [-W / 2, E]].map(([x, y]) => [x + OX, y - L] as [number, number]), p));
  const side = plane((g, p) => drawPoly(g, [[-D / 2, 0], [D / 2, 0], [D / 2, R], [-D / 2, R]].map(([z, y]) => [-(z + OZ), y - L] as [number, number]), p, [[[-(-D / 2 + OZ), E - L], [-(D / 2 + OZ), E - L]]]));
  const plan = plane((g, p) => drawPoly(g, [[-W / 2, -D / 2], [W / 2, -D / 2], [W / 2, D / 2], [-W / 2, D / 2]].map(([x, z]) => [x + OX, -(z + OZ)] as [number, number]), p, [[[-W / 2 + OX, -OZ], [W / 2 + OX, -OZ]]]));
  const pg = new THREE.PlaneGeometry(2 * L, 2 * L);
  own.push(pg);
  const back = new THREE.Mesh(pg, front.m);
  back.position.set(0, L, -L);
  const left = new THREE.Mesh(pg, side.m);
  left.rotation.y = Math.PI / 2;
  left.position.set(-L, L, 0);
  const floor = new THREE.Mesh(pg, plan.m);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = back.receiveShadow = left.receiveShadow = true;
  group.add(back, left, floor);
  // the solid: the front profile extruded through the depth
  const shape = new THREE.Shape([new THREE.Vector2(-W / 2, 0), new THREE.Vector2(W / 2, 0), new THREE.Vector2(W / 2, E), new THREE.Vector2(0, R), new THREE.Vector2(-W / 2, E)]);
  const hg = new THREE.ExtrudeGeometry(shape, { depth: D, bevelEnabled: false });
  hg.translate(0, 0, -D / 2);
  const solidMat = new THREE.MeshStandardMaterial({ color: "#F6F3EC", roughness: 0.7, transparent: true, opacity: 0 });
  const edgeGeo = new THREE.EdgesGeometry(hg);
  const edgeMat = new THREE.LineBasicMaterial({ color: "#FFFFFF", transparent: true, opacity: 0 });
  own.push(hg, solidMat, edgeGeo, edgeMat);
  const solid = new THREE.Mesh(hg, solidMat);
  solid.castShadow = true;
  const edges = new THREE.LineSegments(edgeGeo, edgeMat);
  const house = new THREE.Group();
  house.add(solid, edges);
  house.position.set(OX, 0, OZ);
  group.add(house);
  // corner points for the projection lines (to each wall)
  const corners = [
    [-W / 2, 0, -D / 2], [W / 2, 0, -D / 2], [W / 2, E, -D / 2], [-W / 2, E, -D / 2], [0, R, -D / 2],
    [-W / 2, 0, D / 2], [W / 2, 0, D / 2], [W / 2, E, D / 2], [-W / 2, E, D / 2], [0, R, D / 2],
  ].map(([x, y, z]) => new THREE.Vector3(x + OX, y, z + OZ));
  return {
    group,
    bg: "#173B60",
    pose: (t) => {
      front.update(seg(t, [0.2, 1.6]));
      side.update(seg(t, [0.9, 2.3]));
      plan.update(seg(t, [1.6, 3.0]));
      const grow = ease(seg(t, [3.6, 5.4]));
      house.scale.set(1, Math.max(0.001, grow), 1);
      edgeMat.opacity = clamp(grow * 2);
      solidMat.opacity = ease(seg(t, [5.0, 6.4]));
      house.visible = grow > 0.002;
      const lines: ReturnType<Act["pose"]>["lines"] = [];
      const proj = seg(t, [2.8, 4.0]) * (1 - seg(t, [6.2, 7.2]));
      if (proj > 0)
        for (const c of corners) {
          const top = new THREE.Vector3(c.x, c.y * grow, c.z);
          const dash = "5 5";
          const col = `rgba(255,255,255,${0.7 * proj})`;
          lines.push({ pts: [top, new THREE.Vector3(top.x, top.y, -L)], color: col, width: 1, dash, p: proj });
          lines.push({ pts: [top, new THREE.Vector3(-L, top.y, top.z)], color: col, width: 1, dash, p: proj });
          lines.push({ pts: [top, new THREE.Vector3(top.x, 0, top.z)], color: col, width: 1, dash, p: proj });
        }
      const orbit = ease(seg(t, [0, 8]));
      const a = 0.55 + orbit * 0.35;
      return {
        cam: { pos: new THREE.Vector3(Math.sin(a) * 6.2, 3.4 - orbit * 0.6, Math.cos(a) * 6.2), at: new THREE.Vector3(-0.2, 0.75, -0.2) },
        lines,
        light: { pos: new THREE.Vector3(3, 6, 4), color: "#FFFFFF", intensity: 2.2 },
      };
    },
    dispose: () => undefined,
  };
}

/* ---------------------------------------------------------------- 6. the folding carton */

const KRAFT: Direction = {
  id: "K",
  route: "safe",
  name: { zh: "牛皮纸", en: "Kraft" },
  tagline: { zh: "", en: "" },
  layout: "offset",
  palette: [
    { name: { zh: "牛皮", en: "Kraft" }, role: "background", hex: "#C9A27A", share: 70 },
    { name: { zh: "墨", en: "Ink" }, role: "text", hex: "#2A211A", share: 20 },
    { name: { zh: "红", en: "Red" }, role: "brand", hex: "#8E2B22", share: 8 },
    { name: { zh: "白", en: "White" }, role: "accent", hex: "#F3EDE2", share: 2 },
  ],
  mockup: { headline: "纸盒", detail: "1879 · Brooklyn", innerLabel: "", manualTitle: "", manualStep: "" },
  carriers: { outerFront: { zh: "", en: "" }, outerBack: { zh: "", en: "" }, inner: { zh: "", en: "" }, manual: { zh: "", en: "" } },
  anchor: { zh: "", en: "" },
  styleDna: { typography: { zh: "", en: "" }, imagery: { zh: "", en: "" }, graphics: { zh: "", en: "" }, finish: { zh: "", en: "" } },
  sketch: "",
  suitable: { zh: "", en: "" },
  risk: { zh: "", en: "" },
};

function actCarton(r: THREE.WebGLRenderer, own: { dispose(): void }[]): Act {
  const it: HeroItem = { id: "civ-carton", name: { zh: "折叠纸盒", en: "Folding carton" }, label: { zh: "纸盒", en: "Carton" }, d: KRAFT, brand: "GAIR", kind: "carton", w: 90, h: 120, dep: 60 };
  const netW = 2 * it.w + 2 * it.dep;
  const s = Math.min(4.4 / netW, 3.6 / (it.h + 2 * it.dep + 2 * Math.max(10, Math.min(it.dep * 0.55, 34))));
  const c: CartonBuild = buildCarton(it, r, s, own);
  for (const m of c.arts) m.opacity = 1;
  const group = new THREE.Group();
  group.add(c.holder);
  const board = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshStandardMaterial({ color: "#3F5146", roughness: 0.92 }));
  own.push(board.geometry, board.material as THREE.Material);
  board.rotation.x = -Math.PI / 2;
  board.position.y = -0.002;
  board.receiveShadow = true;
  group.add(board);
  return {
    group,
    bg: "#3F5146",
    pose: (t) => {
      const lift = ease(seg(t, [1.8, 2.5]));
      const fold = seg(t, [2.4, 5.2]);
      const stand = ease(seg(t, [5.2, 6.2]));
      cartonPose(c, it, s, { lift, fold, stand, back: 0 });
      c.holder.rotation.y = 0;
      group.rotation.y = -ease(seg(t, [6.0, 8])) * 0.6;
      const cutP = seg(t, [0.2, 1.8]);
      const lines: ReturnType<Act["pose"]>["lines"] = [];
      if (t < 2.6) lines.push({ pts: c.cut, color: `rgba(246,241,230,${0.95 * (1 - seg(t, [2.2, 2.6]))})`, width: 1.6, p: cutP, head: true });
      const k = ease(seg(t, [4.5, 8]));
      return {
        cam: { pos: new THREE.Vector3(0, 6.2 - k * 3.4, 4.6 + k * 0.6), at: new THREE.Vector3(0, k * 0.6, 0) },
        lines,
        light: { pos: new THREE.Vector3(-3, 7, 4), color: "#FFF8EE", intensity: 2.4 },
      };
    },
    dispose: () => undefined,
  };
}

/* ---------------------------------------------------------------- 7. digital 3D */

const FLOOR_LIT = new THREE.Color("#5A6068");

function actDigital(r: THREE.WebGLRenderer, own: { dispose(): void }[]): Act {
  const group = new THREE.Group();
  const prof: THREE.Vector2[] = [];
  for (let i = 0; i <= 28; i++) {
    const y = (i / 28) * 2.2;
    const t = y / 2.2;
    const rad = 0.18 + 0.52 * Math.sin(Math.PI * Math.pow(t, 0.85)) * (1 - 0.45 * t) + (t > 0.86 ? (t - 0.86) * 1.6 : 0);
    prof.push(new THREE.Vector2(Math.max(0.12, rad), y));
  }
  const geo = new THREE.LatheGeometry(prof, 40);
  own.push(geo);
  // the point cloud: the same vertices, revealed ring by ring from the foot up
  const vp = geo.getAttribute("position") as THREE.BufferAttribute;
  const order = Array.from({ length: vp.count }, (_, i) => i).sort((a, b) => vp.getY(a) - vp.getY(b) || Math.atan2(vp.getZ(a), vp.getX(a)) - Math.atan2(vp.getZ(b), vp.getX(b)));
  const cloud = new Float32Array(order.length * 3);
  order.forEach((i, j) => cloud.set([vp.getX(i), vp.getY(i), vp.getZ(i)], j * 3));
  const ptsGeo = new THREE.BufferGeometry();
  ptsGeo.setAttribute("position", new THREE.BufferAttribute(cloud, 3));
  own.push(ptsGeo);
  const pts = new THREE.Points(ptsGeo, new THREE.PointsMaterial({ color: "#7FD3FF", size: 0.035 }));
  const wire = new THREE.LineSegments(new THREE.WireframeGeometry(geo), new THREE.LineBasicMaterial({ color: "#7FD3FF", transparent: true, opacity: 0.85 }));
  const flatMat = new THREE.MeshStandardMaterial({ color: "#9AA3AD", flatShading: true, roughness: 0.6, transparent: true, opacity: 0 });
  own.push(pts.material as THREE.Material, wire.geometry, wire.material as THREE.Material, flatMat);
  const flat = new THREE.Mesh(geo, flatMat);
  // the finished object: a glazed porcelain vase with a hand-drawn blue band
  const [pc, px] = canvas(1024, 512);
  px.fillStyle = "#F5F3EE";
  px.fillRect(0, 0, 1024, 512);
  px.strokeStyle = "#1F4E99";
  px.lineCap = "round";
  for (let k = 0; k < 3; k++) {
    px.lineWidth = k === 1 ? 10 : 4;
    px.beginPath();
    for (let x = 0; x <= 1024; x += 8) px.lineTo(x, 250 + k * 34 + Math.sin((x / 1024) * Math.PI * 8 + k) * 14);
    px.stroke();
  }
  px.lineWidth = 3;
  px.strokeRect(-10, 120, 1044, 2);
  px.strokeRect(-10, 400, 1044, 2);
  const glazeTex = tex(pc, r);
  const glaze = new THREE.MeshPhysicalMaterial({ map: glazeTex, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.04, transparent: true, opacity: 0 });
  own.push(glazeTex, glaze);
  const vase = new THREE.Mesh(geo, glaze);
  vase.castShadow = true;
  flat.castShadow = true;
  group.add(pts, wire, flat, vase);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshStandardMaterial({ color: "#2A2E33", roughness: 0.9 }));
  own.push(floor.geometry, floor.material as THREE.Material);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  group.add(floor);
  const nPts = order.length;
  const nWire = (wire.geometry.getAttribute("position") as THREE.BufferAttribute).count;
  return {
    group,
    bg: "#16191D",
    pose: (t) => {
      pts.geometry.setDrawRange(0, Math.floor(nPts * easeOut(seg(t, [0.2, 2.0]))));
      pts.visible = t < 4.6;
      wire.geometry.setDrawRange(0, Math.floor(nWire * seg(t, [1.6, 3.4])));
      (wire.material as THREE.LineBasicMaterial).opacity = 0.85 * (1 - seg(t, [4.2, 5.2]));
      flatMat.opacity = ease(seg(t, [3.2, 4.4])) * (1 - seg(t, [5.0, 6.0]));
      glaze.opacity = ease(seg(t, [4.8, 6.0]));
      const clear = glaze.opacity < 0.999;
      if (glaze.transparent !== clear) {
        glaze.transparent = clear;
        glaze.needsUpdate = true;
      }
      // transparent layers at zero opacity must not hide the ones behind them
      glaze.depthWrite = glaze.opacity > 0.5;
      flatMat.depthWrite = flatMat.opacity > 0.5;
      vase.visible = glaze.opacity > 0;
      flat.visible = flatMat.opacity > 0;
      group.rotation.y = t * 0.25;
      const light = ease(seg(t, [4.8, 6.4]));
      (floor.material as THREE.MeshStandardMaterial).color.set("#2A2E33").lerp(FLOOR_LIT, light * 0.35);
      return {
        cam: { pos: new THREE.Vector3(0, 1.9, 5.2 - light * 0.6), at: new THREE.Vector3(0, 1.0, 0) },
        lines: [],
        light: { pos: new THREE.Vector3(-3, 6, 4), color: "#FFFFFF", intensity: 1.2 + light * 1.6 },
      };
    },
    dispose: () => undefined,
  };
}

const BUILDERS = [actCave, actBone, actType, actPerspective, actProjection, actCarton, actDigital];

/* ---------------------------------------------------------------- the film */

export type CivFrame = { chapter: number; t: number; fade: number; lines: Lines; w: number; h: number };

export class CivilizationScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(32, 1, 0.05, 200);
  private key: THREE.DirectionalLight;
  private hemi: THREE.HemisphereLight;
  private env: THREE.Texture;
  private act: Act | null = null;
  private actIx = -1;
  private own: { dispose(): void }[] = [];
  private next: { ix: number; act: Act; own: { dispose(): void }[] } | null = null;
  private w = 1;
  private h = 1;
  private shiftX = 0;
  private shiftOverride: number | null = null;
  private shiftY = 0;
  private t0 = 0;
  private raf = 0;
  private running = false;
  onFrame?: (f: CivFrame) => void;

  constructor(canvasEl: HTMLCanvasElement) {
    const r = (this.renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: true, powerPreference: "high-performance" }));
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.NeutralToneMapping;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    const pm = new THREE.PMREMGenerator(r);
    const eq = studioEquirect(512);
    this.env = pm.fromEquirectangular(eq).texture;
    pm.dispose();
    eq.dispose();
    this.scene.environment = this.env;
    this.scene.environmentIntensity = 0.45;
    this.hemi = new THREE.HemisphereLight("#ffffff", "#8a8478", 0.7);
    this.key = new THREE.DirectionalLight("#ffffff", 2);
    this.key.castShadow = true;
    this.key.shadow.mapSize.set(2048, 2048);
    const sc = this.key.shadow.camera;
    sc.left = -8;
    sc.right = 8;
    sc.top = 8;
    sc.bottom = -8;
    sc.far = 40;
    this.key.shadow.radius = 5;
    this.key.shadow.bias = -0.0004;
    this.key.shadow.normalBias = 0.02;
    this.scene.add(this.hemi, this.key, this.key.target);
  }

  private use(ix: number) {
    if (ix === this.actIx) return;
    if (this.act) {
      this.scene.remove(this.act.group);
      this.act.dispose();
      this.own.forEach((o) => o.dispose());
    }
    if (this.next && this.next.ix === ix) {
      this.act = this.next.act;
      this.own = this.next.own;
      this.next = null;
    } else {
      this.own = [];
      this.act = BUILDERS[ix](this.renderer, this.own);
    }
    this.actIx = ix;
    this.scene.add(this.act.group);
    this.scene.background = new THREE.Color(this.act.bg);
  }

  /** Builds the next chapter in idle time, so the cut to it doesn't stall a frame. */
  private prefetch(ix: number) {
    if (this.next?.ix === ix || ix === this.actIx) return;
    if (this.next) this.next.own.forEach((o) => o.dispose());
    const own: { dispose(): void }[] = [];
    this.next = { ix, act: BUILDERS[ix](this.renderer, own), own };
  }

  resize(w: number, h: number) {
    this.w = Math.max(1, w);
    this.h = Math.max(1, h);
    this.renderer.setSize(this.w, this.h, false);
    this.camera.aspect = this.w / this.h;
    const wide = this.w / this.h > 1.25;
    this.shiftX = this.shiftOverride !== null ? -this.w * this.shiftOverride : wide ? -this.w * 0.2 : 0;
    this.camera.setViewOffset(this.w, this.h, this.shiftX, this.h * this.shiftY, this.w, this.h);
    this.camera.updateProjectionMatrix();
  }

  setShift(f: number | null, fy = 0) {
    this.shiftOverride = f;
    this.shiftY = fy;
    this.resize(this.w, this.h);
  }

  private project(v: THREE.Vector3): [number, number] {
    const p = v.clone().project(this.camera);
    return [((p.x + 1) / 2) * this.w, ((1 - p.y) / 2) * this.h];
  }

  frame(now: number) {
    const total = now % CIV_DUR;
    const ix = Math.floor(total / CH);
    const t = total - ix * CH;
    this.use(ix);
    if (t > 4.5 && !this.next) {
      const n = (ix + 1) % BUILDERS.length;
      const w = window as Window & { requestIdleCallback?: (f: () => void) => void };
      (w.requestIdleCallback ?? ((f: () => void) => setTimeout(f, 0)))(() => this.prefetch(n));
    }
    this.render(t);
  }

  private render(t: number) {
    const act = this.act!;
    const p = act.pose(t);
    // a slight portrait framing pull-back on narrow screens
    const narrow = this.w / this.h < 1;
    const pos = p.cam.pos.clone();
    if (narrow) pos.sub(p.cam.at).multiplyScalar(1 + (1 - this.w / this.h) * 0.9).add(p.cam.at);
    this.camera.position.copy(pos);
    this.camera.lookAt(p.cam.at);
    this.camera.updateMatrixWorld();
    this.key.position.copy(p.light.pos);
    this.key.target.position.copy(p.cam.at);
    this.key.color.set(p.light.color);
    this.key.intensity = p.light.intensity;
    this.renderer.render(this.scene, this.camera);
    const lines: Lines = p.lines.map((l) => ({ pts: l.pts.map((v) => this.project(v)), color: l.color, width: l.width, dash: l.dash, p: l.p, head: l.head }));
    // fade through black at the cut between chapters
    const fade = Math.max(1 - clamp(t / 0.45), clamp((t - (CH - 0.45)) / 0.45));
    this.onFrame?.({ chapter: this.actIx, t, fade, lines, w: this.w, h: this.h });
  }

  show(ix: number, t = 0.1) {
    this.t0 = performance.now() / 1000 - (ix * CH + t);
    if (!this.running) this.still(ix, t);
  }

  start() {
    if (this.running) return;
    this.running = true;
    if (!this.t0) this.t0 = performance.now() / 1000;
    const loop = () => {
      if (!this.running) return;
      this.frame(performance.now() / 1000 - this.t0);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  still(ix: number, t: number) {
    this.stop();
    this.use(ix);
    this.render(t);
  }

  dispose() {
    this.stop();
    if (this.act) this.act.dispose();
    this.own.forEach((o) => o.dispose());
    this.next?.own.forEach((o) => o.dispose());
    this.env.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }
}
