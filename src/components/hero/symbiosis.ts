/**
 * 共生 Symbiosis — the homepage hero, a looping film drawn live in code.
 *
 * A package and its flat print are one thing in two states. On a press sheet the artwork
 * prints, the die cuts it, and the flat net lifts and folds into a box (or a label peels off
 * and wraps a tin or a bottle). While the 3D form exists, a 2D layer keeps it tied to the
 * sheet: the flat outline stays as a ghost, hairline threads join each face to where it was
 * printed, and dimension lines measure the result. Then it flattens back and the next product
 * prints. The artwork is drawn by the same code as the 3D space and the print file.
 *
 * Units: 1 scene unit = 100 mm after per-product scaling (`s`).
 */
import * as THREE from "three";
import { rolesOf } from "@/lib/artwork";
import type { Direction } from "@/lib/board/schema";
import { roundAreas } from "@/lib/print/layout";
import { drawFace, type FaceKind } from "../three/art";
import { studioEquirect } from "../three/studio";

export type HeroItem = {
  id: string;
  name: { zh: string; en: string };
  /** Short label for the product strip (the category). */
  label: { zh: string; en: string };
  d: Direction;
  brand: string;
  kind: "carton" | "tin" | "bottle";
  /** mm */
  w: number;
  h: number;
  dep: number;
};

export type Stage = 0 | 1 | 2 | 3;
export type FrameInfo = { item: number; stage: Stage; t: number };

/* ---------------------------------------------------------------- timeline */

export const DUR = 11;
const T = { print: [0, 1.5], cut: [1.5, 2.7], lift: [2.7, 3.4], fold: [3.4, 5.7], stand: [5.7, 6.5], hold: [6.5, 9.0], back: [9.0, 10.6] } as const;
const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const seg = (t: number, [a, b]: readonly [number, number]) => clamp((t - a) / (b - a));
const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const easeOut = (x: number) => 1 - Math.pow(1 - x, 3);

/** 0 print, 1 cut, 2 fold or wrap, 3 finished. */
export function stageAt(t: number): Stage {
  if (t < T.cut[0]) return 0;
  if (t < T.lift[0]) return 1;
  if (t < T.hold[0]) return 2;
  return t < T.back[0] ? 3 : 2;
}

/* ---------------------------------------------------------------- textures */

function tex(c: HTMLCanvasElement, r: THREE.WebGLRenderer): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = Math.min(8, r.capabilities.getMaxAnisotropy());
  return t;
}

/** Drawn artwork, kept per product so the switch to the next product doesn't stall a frame. */
const ART = new Map<string, HTMLCanvasElement>();
function artCanvas(kind: FaceKind, w: number, h: number, it: HeroItem): HTMLCanvasElement {
  const key = `${it.id}|${kind}|${w.toFixed(1)}|${h.toFixed(1)}`;
  let c = ART.get(key);
  if (!c) {
    const ppm = Math.min(6, 900 / Math.max(w, h));
    c = drawFace(kind, w, h, ppm, { d: it.d, brand: it.brand, finish: "matte" }).color;
    ART.set(key, c);
  }
  return c;
}
function art(kind: FaceKind, w: number, h: number, it: HeroItem, r: THREE.WebGLRenderer) {
  return tex(artCanvas(kind, w, h, it), r);
}

/** Draws a product's artwork ahead of time (called while the previous one is on screen). */
export function prefetchArt(it: HeroItem) {
  if (it.kind === "carton") {
    artCanvas("front", it.w, it.h, it);
    artCanvas("right", it.dep, it.h, it);
    artCanvas("back", it.w, it.h, it);
    artCanvas("left", it.dep, it.h, it);
    artCanvas("top", it.w, it.dep, it);
    artCanvas("bottom", it.w, it.dep, it);
  } else {
    const area = roundAreas(it.kind === "tin" ? "tin" : "bottle", it.w, it.h);
    artCanvas("tinWrap", area.wrap!.w, area.wrap!.h, it);
    if (it.kind === "tin") artCanvas("tinCap", it.w, it.w, it);
  }
}

/** The press sheet: paper with registration marks, a color bar and a slug line. */
function sheetCanvas(it: HeroItem, W: number, H: number): HTMLCanvasElement {
  const k = 3;
  const c = document.createElement("canvas");
  c.width = W * k;
  c.height = H * k;
  const g = c.getContext("2d")!;
  g.fillStyle = "#FBFBF9";
  g.fillRect(0, 0, c.width, c.height);
  const reg = (x: number, y: number) => {
    g.strokeStyle = "#111";
    g.lineWidth = 1.2;
    g.beginPath();
    g.arc(x, y, 9, 0, Math.PI * 2);
    g.moveTo(x - 15, y);
    g.lineTo(x + 15, y);
    g.moveTo(x, y - 15);
    g.lineTo(x, y + 15);
    g.stroke();
  };
  const m = 26;
  reg(m, m);
  reg(c.width - m, m);
  reg(m, c.height - m);
  reg(c.width - m, c.height - m);
  // color bar: process inks, then this product's palette, repeated
  const r = rolesOf(it.d);
  const bar = ["#00A0E9", "#E4007F", "#FFF100", "#000000", r.ground, r.ink, r.key, r.accent];
  const sw = 22;
  for (let x = m + 40, i = 0; x < c.width - m - 40 - sw; x += sw, i++) {
    g.fillStyle = bar[i % bar.length];
    g.fillRect(x, c.height - m - 8, sw - 2, 16);
  }
  g.fillStyle = "#777";
  g.font = `500 13px "Helvetica Neue", Arial, "PingFang SC", sans-serif`;
  g.fillText(`${it.brand}  ·  ${it.name.zh}  ·  ${it.w}×${it.h}${it.kind === "carton" ? `×${it.dep}` : ""} mm  ·  1:1  ·  bleed 3 mm`, m + 40, m + 5);
  return c;
}

/* ---------------------------------------------------------------- hinged carton net */

type Hinge = { pivot: THREE.Group; angle: number; sign: number; axis: "x" | "z"; at: [number, number]; order: number; panel: THREE.Object3D; ghost: [number, number, number, number] };

/**
 * A reverse-tuck carton net built from hinged panels. Coordinates in mm on the net (x right,
 * y down), mapped to the table as x → X, y → Z.
 */
function buildCarton(it: HeroItem, r: THREE.WebGLRenderer, s: number, own: { dispose(): void }[]) {
  const { w, h, dep: d } = it;
  const T2 = Math.max(10, Math.min(d * 0.55, 34));
  const dust = Math.min(d * 0.8, w * 0.5, 40);
  const xF = 0;
  const xR = w;
  const xB = w + d;
  const xL = 2 * w + d;
  const yT = d + T2;
  const yB = yT + h;
  const netW = 2 * w + 2 * d;
  const netH = yB + d + T2;
  const cx = netW / 2;
  const cy = netH / 2;
  const roles = rolesOf(it.d);
  const thick = 0.6;
  const board = new THREE.MeshStandardMaterial({ color: "#F3F1EC", roughness: 0.9 });
  const edge = new THREE.MeshStandardMaterial({ color: "#E8E4DA", roughness: 0.95 });
  const ground = new THREE.MeshStandardMaterial({ color: roles.ground, roughness: 0.7 });
  own.push(board, edge, ground);
  const arts: THREE.MeshStandardMaterial[] = [];

  /** A panel whose top-left corner is at the pivot's origin (local mm × s). */
  const panel = (pw: number, ph: number, kind: FaceKind | null) => {
    const g = new THREE.Group();
    const geo = new THREE.BoxGeometry(pw * s, thick * s, ph * s);
    own.push(geo);
    const mats = [edge, edge, kind ? board : ground, board, edge, edge];
    const base = new THREE.Mesh(geo, mats);
    base.castShadow = true;
    base.receiveShadow = true;
    base.position.set((pw * s) / 2, (thick * s) / 2, (ph * s) / 2);
    g.add(base);
    if (kind) {
      const m = new THREE.MeshStandardMaterial({ map: art(kind, pw, ph, it, r), roughness: 0.62, transparent: true, opacity: 0 });
      own.push(m, m.map!);
      arts.push(m);
      const pg = new THREE.PlaneGeometry(pw * s, ph * s);
      own.push(pg);
      const top = new THREE.Mesh(pg, m);
      m.userData.mesh = top;
      top.rotation.x = -Math.PI / 2;
      top.position.set((pw * s) / 2, thick * s + 0.0006, (ph * s) / 2);
      top.receiveShadow = true;
      g.add(top);
    } else {
      // flaps are printed in the ground color from the start (they are part of the sheet's art)
      (base.material as THREE.Material[])[2] = ground;
    }
    return g;
  };

  const root = new THREE.Group();
  const holder = new THREE.Group();
  holder.add(root);
  const hinges: Hinge[] = [];
  /** Attach `child` to `parent` with a hinge at local (x, y) mm along axis, folding down. */
  const attach = (parent: THREE.Object3D, child: THREE.Object3D, px: number, py: number, axis: "x" | "z", order: number, ghost: [number, number, number, number], angle = Math.PI / 2) => {
    const pivot = new THREE.Group();
    pivot.position.set(px * s, 0, py * s);
    parent.add(pivot);
    pivot.add(child);
    hinges.push({ pivot, angle, sign: 0, axis, at: [px, py], order, panel: child, ghost });
    return pivot;
  };

  const front = panel(w, h, "front");
  front.position.set((xF - cx) * s, 0, (yT - cy) * s);
  root.add(front);
  // side chain (each child placed relative to its parent's top-left)
  const right = panel(d, h, "right");
  attach(front, right, w, 0, "z", 0, [xR, yT, d, h]);
  const back = panel(w, h, "back");
  attach(right, back, d, 0, "z", 1, [xB, yT, w, h]);
  const left = panel(d, h, "left");
  attach(back, left, w, 0, "z", 2, [xL, yT, d, h]);
  // dust flaps on the side panels (top: hinge at their top edge, flap above)
  for (const [p, gx] of [
    [right, xR],
    [left, xL],
  ] as [THREE.Group, number][]) {
    const top = panel(d, dust, null);
    top.position.z = -dust * s;
    const holderT = new THREE.Group();
    holderT.add(top);
    attach(p, holderT, 0, 0, "x", 3, [gx, yT - dust, d, dust], Math.PI / 2 - 0.08);
    const bot = panel(d, dust, null);
    const holderB = new THREE.Group();
    holderB.add(bot);
    attach(p, holderB, 0, h, "x", 3, [gx, yB, d, dust], Math.PI / 2 - 0.08);
  }
  // top lid and tuck on the front
  const lid = panel(w, d, "top");
  lid.position.z = -d * s;
  const lidH = new THREE.Group();
  lidH.add(lid);
  attach(front, lidH, 0, 0, "x", 4, [xF, yT - d, w, d]);
  const tuck = panel(w, T2, null);
  tuck.position.z = -T2 * s;
  const tuckH = new THREE.Group();
  tuckH.add(tuck);
  const tp = new THREE.Group();
  tp.position.z = -d * s;
  lidH.children[0].add(tp);
  attach(lid, tuckH, 0, 0, "x", 5, [xF, yT - d - T2, w, T2]);
  // bottom lid and tuck on the back
  const blid = panel(w, d, "bottom");
  const blidH = new THREE.Group();
  blidH.add(blid);
  attach(back, blidH, 0, h, "x", 4, [xB, yB, w, d]);
  const btuck = panel(w, T2, null);
  const btuckH = new THREE.Group();
  btuckH.add(btuck);
  attach(blid, btuckH, 0, d, "x", 5, [xB, yB + d, w, T2]);

  // choose each hinge's sign so the far side folds down (away from the printed face)
  root.updateMatrixWorld(true);
  const probe = new THREE.Vector3();
  for (const hg of hinges) {
    const box = new THREE.Box3().setFromObject(hg.panel);
    box.getCenter(probe);
    const before = probe.clone();
    const ax = hg.axis === "x" ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 0, 1);
    hg.pivot.setRotationFromAxisAngle(ax, 0.3);
    hg.pivot.updateMatrixWorld(true);
    new THREE.Box3().setFromObject(hg.panel).getCenter(probe);
    hg.sign = probe.y < before.y ? 1 : -1;
    hg.pivot.rotation.set(0, 0, 0);
  }
  root.updateMatrixWorld(true);
  // where each printed face lies on the flat sheet (for the print head's order)
  for (const m of arts) {
    const c = new THREE.Box3().setFromObject(m.userData.mesh as THREE.Object3D).getCenter(new THREE.Vector3());
    m.userData.x = c.x;
  }

  const cutPts: [number, number][] = [
    [xF, yT],
    [xF, yT - d],
    [xF + 2, yT - d - T2],
    [xR - 2, yT - d - T2],
    [xR, yT - d],
    [xR, yT],
    [xR + 2, yT - dust],
    [xB - 2, yT - dust],
    [xB, yT],
    [xL, yT],
    [xL + 2, yT - dust],
    [netW - 2, yT - dust],
    [netW, yT],
    [netW, yB],
    [netW - 2, yB + dust],
    [xL + 2, yB + dust],
    [xL, yB],
    [xL, yB + d],
    [xL - 2, yB + d + T2],
    [xB + 2, yB + d + T2],
    [xB, yB + d],
    [xB, yB],
    [xB - 2, yB + dust],
    [xR + 2, yB + dust],
    [xR, yB],
    [xF, yB],
    [xF, yT],
  ];
  const toWorld = (x: number, y: number) => new THREE.Vector3((x - cx) * s, 0, (y - cy) * s);
  const ghosts = [[xF, yT, w, h] as [number, number, number, number], ...hinges.filter((x) => x.order <= 2 || x.order === 4).map((x) => x.ghost)];
  const centre = new THREE.Vector3((w / 2 - cx) * s, 0, (yT + h / 2 - cy) * s);
  return { root, holder, centre, hinges, arts, front, cut: cutPts.map(([x, y]) => toWorld(x, y)), ghosts: ghosts.map(([x, y, gw, gh]) => [toWorld(x, y), toWorld(x + gw, y), toWorld(x + gw, y + gh), toWorld(x, y + gh)]), netW, netH, thick };
}

/* ---------------------------------------------------------------- round forms */

function buildRound(it: HeroItem, r: THREE.WebGLRenderer, s: number, own: { dispose(): void }[]) {
  const R = it.w / 2;
  const roles = rolesOf(it.d);
  const area = roundAreas(it.kind === "tin" ? "tin" : "bottle", it.w, it.h);
  const lw = area.wrap!.w;
  const lh = area.wrap!.h;
  const y0 = it.kind === "tin" ? 3.6 : 8;
  // label: a strip that morphs from flat on the sheet to wrapped round the body
  const SEG = 96;
  const geo = new THREE.PlaneGeometry(lw * s, lh * s, SEG, 1);
  own.push(geo);
  const mat = new THREE.MeshStandardMaterial({ map: art("tinWrap", lw, lh, it, r), roughness: it.kind === "tin" ? 0.32 : 0.45, metalness: it.kind === "tin" ? 0.25 : 0, transparent: true, opacity: 0, side: THREE.DoubleSide });
  own.push(mat, mat.map!);
  const label = new THREE.Mesh(geo, mat);
  label.castShadow = true;
  label.receiveShadow = true;
  const pos = geo.getAttribute("position") as THREE.BufferAttribute;
  const n = pos.count;
  const flat = new Float32Array(n * 3);
  const wrapP = new Float32Array(n * 3);
  const us = new Float32Array(n);
  // the body stands at the origin (so the turntable spins it on its axis); the label lies in front
  const bodyZ = 0;
  const labelZ = (R + 10) * s + (lh * s) / 2;
  for (let i = 0; i < n; i++) {
    const u = pos.getX(i) / (lw * s) + 0.5;
    const v = pos.getY(i) / (lh * s) + 0.5;
    us[i] = u;
    flat.set([(u - 0.5) * lw * s, 0.0015, labelZ - (v - 0.5) * lh * s], i * 3);
    const phi = (u - 0.5) * Math.PI * 2;
    wrapP.set([Math.sin(phi) * (R + 0.4) * s, (y0 + v * lh) * s, bodyZ + Math.cos(phi) * (R + 0.4) * s], i * 3);
  }
  // body
  const H = it.h;
  let prof: [number, number][];
  if (it.kind === "tin") prof = [[0, 0], [R - 1.5, 0], [R, 1.5], [R, H * 0.83], [R - 1.2, H * 0.84], [R - 1.2, H * 0.98], [0, H * 0.98]];
  else {
    const pumpH = Math.min(60, Math.max(34, H * 0.26));
    const bodyH = H - pumpH;
    const rn = Math.max(10, Math.min(R * 0.42, 14));
    const shH = Math.min(bodyH * 0.18, R * 0.8);
    const sh0 = bodyH - shH;
    prof = [[0, 0], [R - 3, 0], [R, 3], [R, sh0]];
    for (let i = 1; i <= 8; i++) {
      const a = (i / 8) * (Math.PI / 2);
      prof.push([rn + (R - rn) * Math.cos(a), sh0 + shH * Math.sin(a)]);
    }
    prof.push([rn, bodyH + 6], [0, bodyH + 6]);
  }
  const lathe = new THREE.LatheGeometry(prof.map(([x, y]) => new THREE.Vector2(x * s, y * s)), 96);
  own.push(lathe);
  const bodyMat = it.kind === "tin" ? new THREE.MeshStandardMaterial({ color: "#D9DADB", metalness: 0.9, roughness: 0.28 }) : new THREE.MeshStandardMaterial({ color: new THREE.Color(roles.ground).lerp(new THREE.Color("#ffffff"), 0.35), roughness: 0.42 });
  own.push(bodyMat);
  const body = new THREE.Mesh(lathe, bodyMat);
  body.castShadow = true;
  body.receiveShadow = true;
  body.position.z = bodyZ;
  // lid (tin) or pump (bottle)
  const cap = new THREE.Group();
  let capFlat = new THREE.Vector3();
  let capTop = new THREE.Vector3();
  const keyMat = new THREE.MeshStandardMaterial({ color: roles.key, metalness: it.kind === "tin" ? 0.55 : 0, roughness: 0.35 });
  own.push(keyMat);
  if (it.kind === "tin") {
    const lidH = Math.max(10, H * 0.17);
    const side = new THREE.CylinderGeometry((R + 0.6) * s, (R + 0.6) * s, lidH * s, 96, 1, true);
    const topG = new THREE.CircleGeometry((R + 0.6) * s, 96);
    own.push(side, topG);
    const topM = new THREE.MeshStandardMaterial({ map: art("tinCap", it.w, it.w, it, r), metalness: 0.35, roughness: 0.3 });
    own.push(topM, topM.map!);
    const sideM = new THREE.Mesh(side, keyMat);
    sideM.position.y = (lidH * s) / 2;
    sideM.castShadow = true;
    const topMesh = new THREE.Mesh(topG, topM);
    topMesh.rotation.x = -Math.PI / 2;
    topMesh.position.y = lidH * s;
    topMesh.castShadow = true;
    cap.add(sideM, topMesh);
    cap.userData.lidH = lidH * s;
    capFlat = new THREE.Vector3(R * s * 2.6, 0, -R * s * 0.2);
    capTop = new THREE.Vector3(0, (H - lidH) * s, bodyZ);
  } else {
    const pumpH = Math.min(60, Math.max(34, H * 0.26));
    const rn = Math.max(10, Math.min(R * 0.42, 14));
    const collar = new THREE.CylinderGeometry((rn + 1.5) * s, (rn + 1.5) * s, 14 * s, 48);
    const stem = new THREE.CylinderGeometry(3 * s, 3 * s, (pumpH - 24) * s, 24);
    const head = new THREE.BoxGeometry(14 * s, 8 * s, 30 * s);
    own.push(collar, stem, head);
    const c1 = new THREE.Mesh(collar, keyMat);
    c1.position.y = 7 * s;
    const c2 = new THREE.Mesh(stem, keyMat);
    c2.position.y = (14 + (pumpH - 24) / 2) * s;
    const c3 = new THREE.Mesh(head, keyMat);
    c3.position.set(0, (pumpH - 6) * s, 8 * s);
    for (const m of [c1, c2, c3]) m.castShadow = true;
    cap.add(c1, c2, c3);
    cap.userData.lidH = 0;
    capFlat = new THREE.Vector3(0, 0, bodyZ);
    capTop = new THREE.Vector3(0, (H - pumpH + 6) * s, bodyZ);
  }
  const root = new THREE.Group();
  root.add(label, body, cap);
  return { root, label, mat, pos, flat, wrapP, us, body, cap, capFlat, capTop, R: R * s, bodyZ, labelZ, lw: lw * s, lh: lh * s, H: H * s };
}

/* ---------------------------------------------------------------- the scene */

export type Overlay = (ctx: OverlayFrame) => void;
export type OverlayFrame = {
  w: number;
  h: number;
  stage: Stage;
  /** Screen-space polylines and labels for the 2D layer. */
  cut: { pts: [number, number][]; p: number } | null;
  ghosts: [number, number][][];
  threads: { a: [number, number]; b: [number, number] }[];
  dims: { a: [number, number]; b: [number, number]; text: string }[];
  circle: [number, number][] | null;
  head: { a: [number, number]; b: [number, number] } | null;
  alpha2d: number;
};

export class SymbiosisScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(26, 1, 0.1, 200);
  private items: HeroItem[];
  private ix = 0;
  private own: { dispose(): void }[] = [];
  private stageRoot = new THREE.Group();
  private sheet: THREE.Mesh;
  private sheetMat: THREE.MeshStandardMaterial;
  private carton: ReturnType<typeof buildCarton> | null = null;
  private round: ReturnType<typeof buildRound> | null = null;
  private turn = new THREE.Group();
  private w = 1;
  private h = 1;
  private t0 = 0;
  private raf = 0;
  private running = false;
  private shiftX = 0;
  /** Override for the sideways framing (fraction of the width; null = automatic). */
  private shiftOverride: number | null = null;
  private shiftY = 0;
  private env: THREE.Texture;
  onFrame?: (f: FrameInfo, o: OverlayFrame) => void;

  constructor(canvas: HTMLCanvasElement, items: HeroItem[]) {
    this.items = items;
    const r = (this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" }));
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.NeutralToneMapping;
    r.toneMappingExposure = 1.05;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    const bg = new THREE.Color("#E6E7E3");
    this.scene.background = bg;
    this.scene.fog = new THREE.Fog(bg, 16, 34);
    const pm = new THREE.PMREMGenerator(r);
    const eq = studioEquirect(512);
    this.env = pm.fromEquirectangular(eq).texture;
    pm.dispose();
    eq.dispose();
    this.scene.environment = this.env;
    this.scene.environmentIntensity = 0.55;
    const hemi = new THREE.HemisphereLight("#ffffff", "#c9c8c2", 0.9);
    const key = new THREE.DirectionalLight("#fffaf2", 2.1);
    key.position.set(-5, 11, 6);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = -8;
    key.shadow.camera.right = 8;
    key.shadow.camera.top = 8;
    key.shadow.camera.bottom = -8;
    key.shadow.radius = 6;
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.02;
    const fill = new THREE.DirectionalLight("#eef3ff", 0.55);
    fill.position.set(7, 5, -3);
    this.scene.add(hemi, key, fill);
    const table = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshStandardMaterial({ color: "#DADBD6", roughness: 0.95 }));
    table.rotation.x = -Math.PI / 2;
    table.position.y = -0.004;
    table.receiveShadow = true;
    this.sheetMat = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.92 });
    this.sheet = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.sheetMat);
    this.sheet.rotation.x = -Math.PI / 2;
    this.sheet.receiveShadow = true;
    this.scene.add(table, this.stageRoot);
    this.stageRoot.add(this.sheet, this.turn);
    this.load(0);
  }

  /** Builds the current product. */
  private load(i: number) {
    this.ix = i;
    for (const o of this.own) o.dispose();
    this.own = [];
    this.turn.clear();
    this.carton = null;
    this.round = null;
    const it = this.items[i];
    const r = this.renderer;
    let SW: number;
    let SH: number;
    if (it.kind === "carton") {
      const netW = 2 * it.w + 2 * it.dep;
      const s = Math.min(4.3 / netW, 3.6 / (it.h + 2 * it.dep + 2 * Math.max(10, Math.min(it.dep * 0.55, 34))));
      this.carton = buildCarton(it, r, s, this.own);
      this.turn.add(this.carton.holder);
      SW = this.carton.netW * s + 1.2;
      SH = this.carton.netH * s + 1.0;
      this.turn.userData.s = s;
    } else {
      const area = roundAreas(it.kind === "tin" ? "tin" : "bottle", it.w, it.h);
      const s = Math.min(3.4 / (area.wrap!.w + it.w + 30), 2.4 / it.h);
      this.round = buildRound(it, r, s, this.own);
      this.turn.add(this.round.root);
      SW = this.round.lw + this.round.R * 2 + 1.6;
      SH = this.round.lh + this.round.R * 2 + 1.6;
      this.turn.userData.s = s;
    }
    SW = Math.max(SW, 5.2);
    SH = Math.max(SH, 3.9);
    const sc = sheetCanvas(it, Math.round(SW * 100), Math.round(SH * 100));
    this.sheetMat.map?.dispose();
    this.sheetMat.map = tex(sc, r);
    this.sheetMat.needsUpdate = true;
    this.sheet.scale.set(SW, SH, 1);
    // round forms: body at the turntable's centre, label in front; centre the pair on the sheet
    this.stageRoot.position.set(0, 0, this.round ? -this.round.labelZ / 2 : 0);
    this.sheet.position.set(0, 0, 0);
  }

  resize(w: number, h: number) {
    this.w = Math.max(1, w);
    this.h = Math.max(1, h);
    this.renderer.setSize(this.w, this.h, false);
    const cam = this.camera;
    cam.aspect = this.w / this.h;
    // wide: the copy sits on the left, so the scene's centre moves right
    const wide = this.w / this.h > 1.25;
    this.shiftX = this.shiftOverride !== null ? -this.w * this.shiftOverride : wide ? -this.w * 0.24 : 0;
    cam.setViewOffset(this.w, this.h, this.shiftX, this.h * this.shiftY, this.w, this.h);
    const dist = wide ? 9.4 : 9.6 + Math.max(0, 1 - cam.aspect) * 7;
    const el = (40 * Math.PI) / 180;
    cam.position.set(0, dist * Math.sin(el), dist * Math.cos(el));
    cam.lookAt(0, 0.55, wide ? 0.2 : 0.85);
    cam.updateProjectionMatrix();
  }

  private project(v: THREE.Vector3): [number, number] {
    const p = v.clone().add(this.stageRoot.position).project(this.camera);
    return [((p.x + 1) / 2) * this.w, ((1 - p.y) / 2) * this.h];
  }

  /** Poses everything for time t within the current product's cycle. */
  pose(t: number): OverlayFrame {
    const it = this.items[this.ix];
    const of: OverlayFrame = { w: this.w, h: this.h, stage: stageAt(t), cut: null, ghosts: [], threads: [], dims: [], circle: null, head: null, alpha2d: 1 };
    const print = seg(t, T.print);
    const back = ease(seg(t, T.back));
    const unprint = seg(t, [10.4, 11]);
    const turnT = seg(t, [T.stand[0], T.back[1]]);
    this.turn.rotation.y = Math.sin(turnT * Math.PI) * -0.55 * (1 - back);
    of.alpha2d = 1 - unprint;
    // print head: a CMYK line sweeping the sheet
    if (print > 0 && print < 1) {
      const sw = this.sheet.scale.x;
      const shh = this.sheet.scale.y;
      const x = -sw / 2 + print * sw;
      of.head = { a: this.project(new THREE.Vector3(x, 0, this.sheet.position.z - shh / 2)), b: this.project(new THREE.Vector3(x, 0, this.sheet.position.z + shh / 2)) };
    }
    const sx = this.sheet.scale.x;
    const fadeIn = (xw: number) => clamp((print * 1.15 - ((xw + sx / 2) / sx)) * 6) * (1 - unprint);

    if (this.carton) {
      const c = this.carton;
      const s = this.turn.userData.s as number;
      const lift = ease(seg(t, T.lift)) * (1 - back);
      const fold = seg(t, T.fold);
      const stand = ease(seg(t, T.stand)) * (1 - back);
      const tmp = new THREE.Vector3();
      for (const m of c.arts) m.opacity = fadeIn(m.userData.x as number);
      for (const hg of c.hinges) {
        const a0 = 0.06 + hg.order * 0.11;
        const p = ease(clamp((fold - a0) / 0.4)) * (1 - back);
        const ax = hg.axis === "x" ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 0, 1);
        hg.pivot.setRotationFromAxisAngle(ax, hg.sign * hg.angle * p);
      }
      // Lying folded, the front is on top at height Y0 and the box hangs below it. Standing,
      // the holder turns it about its centre so the front faces the camera, base on the table.
      const dep = it.dep * s;
      const hgt = it.h * s;
      const Y0 = dep + c.thick * s;
      const C = c.centre;
      c.root.position.set(-C.x, dep / 2, -C.z);
      const lying = new THREE.Vector3(C.x, lift * Y0 - dep / 2, C.z);
      const up = new THREE.Vector3(0, hgt / 2 + 0.002, 0);
      c.holder.position.copy(lying.lerp(up, stand));
      c.holder.rotation.set((stand * Math.PI) / 2, 0, 0);
      c.holder.updateMatrixWorld(true);
      // 2D: cut trace
      const cutP = seg(t, T.cut);
      if (cutP > 0 && t < T.fold[0]) of.cut = { pts: c.cut.map((v) => this.project(v)), p: cutP };
      // ghosts and threads while it is 3D
      const show = clamp(lift * 3) * (1 - unprint);
      if (show > 0.02) {
        of.ghosts = c.ghosts.map((g) => g.map((v) => this.project(v)));
        for (const hg of c.hinges.filter((x) => x.order <= 2 || (x.order === 4 && x.ghost[1] < c.netH / 2))) {
          const box = new THREE.Box3().setFromObject(hg.panel);
          box.getCenter(tmp);
          const [gx, gy, gw, gh] = hg.ghost;
          const flat = new THREE.Vector3((gx + gw / 2 - c.netW / 2) * s, 0, (gy + gh / 2 - c.netH / 2) * s);
          of.threads.push({ a: this.project(tmp), b: this.project(flat) });
        }
        const fb = new THREE.Box3().setFromObject(c.front);
        fb.getCenter(tmp);
        of.threads.push({ a: this.project(tmp), b: this.project(new THREE.Vector3((it.w / 2 - c.netW / 2) * s, 0, (Math.max(10, Math.min(it.dep * 0.55, 34)) + it.dep + it.h / 2 - c.netH / 2) * s)) });
      }
      // dimension lines on the standing box
      const hold = seg(t, [T.hold[0], T.hold[0] + 0.5]) * (1 - seg(t, [T.back[0], T.back[0] + 0.4]));
      if (hold > 0.02) {
        const bb = new THREE.Box3().setFromObject(c.holder);
        const off = 0.18;
        const y0 = 0.001;
        of.dims.push({ a: this.project(new THREE.Vector3(bb.min.x, y0, bb.max.z + off)), b: this.project(new THREE.Vector3(bb.max.x, y0, bb.max.z + off)), text: `${it.w} mm` });
        of.dims.push({ a: this.project(new THREE.Vector3(bb.max.x + off, bb.min.y, bb.max.z)), b: this.project(new THREE.Vector3(bb.max.x + off, bb.max.y, bb.max.z)), text: `${it.h} mm` });
        of.dims.push({ a: this.project(new THREE.Vector3(bb.min.x - off, y0, bb.max.z)), b: this.project(new THREE.Vector3(bb.min.x - off, y0, bb.min.z)), text: `${it.dep} mm` });
        of.alpha2d *= 1;
      }
    }

    if (this.round) {
      const r = this.round;
      const rise = easeOut(seg(t, [T.lift[0], T.lift[1] + 0.3])) * (1 - back);
      const wrap = seg(t, T.fold) * (1 - back);
      const capP = ease(seg(t, T.stand)) * (1 - back);
      r.mat.opacity = fadeIn(0);
      r.body.scale.y = Math.max(0.001, rise);
      r.body.visible = rise > 0.002;
      // label vertices
      const p = r.pos;
      for (let i = 0; i < p.count; i++) {
        const u = r.us[i];
        const delay = Math.abs(u - 0.5) * 2 * 0.55;
        const k = ease(clamp((wrap - delay) / 0.45));
        const lift = Math.sin(k * Math.PI) * r.R * 0.55;
        p.setXYZ(i, r.flat[i * 3] + (r.wrapP[i * 3] - r.flat[i * 3]) * k, r.flat[i * 3 + 1] + (r.wrapP[i * 3 + 1] - r.flat[i * 3 + 1]) * k + lift, r.flat[i * 3 + 2] + (r.wrapP[i * 3 + 2] - r.flat[i * 3 + 2]) * k);
      }
      p.needsUpdate = true;
      r.label.geometry.computeVertexNormals();
      // cap: from the sheet to the top
      const cp = r.capFlat.clone().lerp(r.capTop, capP);
      cp.y += Math.sin(capP * Math.PI) * r.H * 0.35;
      r.cap.position.copy(cp);
      const lidH = (r.cap.userData.lidH as number) || 0;
      if (lidH) {
        r.cap.scale.y = Math.max(0.02, Math.min(1, rise * 1.2));
        r.cap.visible = print > 0.4 || capP > 0;
      } else {
        r.cap.scale.setScalar(Math.max(0.001, capP));
        r.cap.visible = capP > 0.01;
      }
      const cutP = seg(t, T.cut);
      if (cutP > 0 && t < T.fold[0]) {
        const x0 = -r.lw / 2;
        const x1 = r.lw / 2;
        const z0 = r.labelZ - r.lh / 2;
        const z1 = r.labelZ + r.lh / 2;
        of.cut = { pts: [new THREE.Vector3(x0, 0, z0), new THREE.Vector3(x1, 0, z0), new THREE.Vector3(x1, 0, z1), new THREE.Vector3(x0, 0, z1), new THREE.Vector3(x0, 0, z0)].map((v) => this.project(v)), p: cutP };
      }
      // the circle on paper that becomes the body
      const circP = seg(t, [T.cut[0] + 0.4, T.lift[0] + 0.3]) * (1 - seg(t, [T.lift[0] + 0.2, T.lift[1]]));
      if (circP > 0.01) {
        const pts: [number, number][] = [];
        for (let i = 0; i <= 64; i++) {
          const a = (i / 64) * Math.PI * 2;
          pts.push(this.project(new THREE.Vector3(Math.sin(a) * r.R, 0.002, r.bodyZ + Math.cos(a) * r.R)));
        }
        of.circle = pts;
      }
      const show = clamp(wrap * 3) * (1 - unprint);
      if (show > 0.02) {
        const x0 = -r.lw / 2;
        const x1 = r.lw / 2;
        const z0 = r.labelZ - r.lh / 2;
        const z1 = r.labelZ + r.lh / 2;
        of.ghosts = [[new THREE.Vector3(x0, 0, z0), new THREE.Vector3(x1, 0, z0), new THREE.Vector3(x1, 0, z1), new THREE.Vector3(x0, 0, z1)].map((v) => this.project(v))];
        const pp = r.pos;
        r.root.updateMatrixWorld(true);
        for (const ui of [0, 0.25, 0.5, 0.75]) {
          const i = Math.round(ui * (pp.count / 2 - 1));
          const cur = new THREE.Vector3(pp.getX(i), pp.getY(i), pp.getZ(i)).applyMatrix4(r.label.matrixWorld).sub(this.stageRoot.position);
          const fl = new THREE.Vector3(r.flat[i * 3], 0, r.flat[i * 3 + 2]).applyMatrix4(this.turn.matrixWorld).sub(this.stageRoot.position);
          of.threads.push({ a: this.project(cur), b: this.project(fl) });
        }
      }
      const hold = seg(t, [T.hold[0], T.hold[0] + 0.5]) * (1 - seg(t, [T.back[0], T.back[0] + 0.4]));
      if (hold > 0.02) {
        const off = 0.25;
        of.dims.push({ a: this.project(new THREE.Vector3(-r.R, 0.001, r.bodyZ + r.R + off)), b: this.project(new THREE.Vector3(r.R, 0.001, r.bodyZ + r.R + off)), text: `Ø ${it.w} mm` });
        of.dims.push({ a: this.project(new THREE.Vector3(r.R + off, 0, r.bodyZ)), b: this.project(new THREE.Vector3(r.R + off, r.H, r.bodyZ)), text: `${it.h} mm` });
      }
    }
    return of;
  }

  private prefetched = -1;

  /** Renders one frame at absolute time `now` (seconds since start). */
  frame(now: number) {
    const cycle = Math.floor(now / DUR) % this.items.length;
    if (cycle !== this.ix) this.load(cycle);
    const t = now % DUR;
    // while this product holds still, draw the next one's artwork in idle time
    const next = (cycle + 1) % this.items.length;
    if (t > T.hold[0] && this.prefetched !== next) {
      this.prefetched = next;
      const run = () => prefetchArt(this.items[next]);
      const w = window as Window & { requestIdleCallback?: (f: () => void) => void };
      if (w.requestIdleCallback) w.requestIdleCallback(run);
      else setTimeout(run, 0);
    }
    const of = this.pose(t);
    this.renderer.render(this.scene, this.camera);
    this.onFrame?.({ item: this.ix, stage: of.stage, t }, of);
  }

  /** Frame the scene in the middle (e.g. for a video without the page copy). */
  setShift(f: number | null, fy = 0) {
    this.shiftOverride = f;
    this.shiftY = fy;
    this.resize(this.w, this.h);
  }

  /** Jump to a product (its finished pose when still). */
  show(i: number, t = 7.2) {
    this.t0 = performance.now() / 1000 - (i * DUR + t);
    if (!this.running) this.frame(i * DUR + t);
  }

  start() {
    if (this.running) return;
    this.running = true;
    const base = performance.now() / 1000;
    if (!this.t0) this.t0 = base;
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

  /** For stills and tests: render exactly this product at this time. */
  still(i: number, t: number) {
    this.stop();
    if (i !== this.ix) this.load(i);
    const of = this.pose(t);
    this.renderer.render(this.scene, this.camera);
    this.onFrame?.({ item: i, stage: of.stage, t }, of);
  }

  dispose() {
    this.stop();
    for (const o of this.own) o.dispose();
    this.sheetMat.map?.dispose();
    this.env.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }
}
