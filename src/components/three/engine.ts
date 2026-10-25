/**
 * Physically based packaging renderer (three.js).
 *
 * Realism comes from the same things a product photographer controls:
 *  - a studio environment of large softboxes and strip lights, so gloss, clearcoat and metal
 *    reflect real light shapes (image-based lighting through PMREM);
 *  - Khronos PBR Neutral tone mapping, so printed colors stay true;
 *  - real material thickness: 0.45 mm board for cartons (with the raw board edge and grey
 *    inside), 1.5 mm chipboard for rigid gift boxes, rolled beads on tins;
 *  - paper fibre micro-surface, laminate clearcoat, metallic foil from a stamped mask;
 *  - soft contact shadows rendered from below and blurred (like a studio sweep).
 * The camera follows an Orbit (shared with the CSS version): x = elevation, y = product turn.
 */
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { Direction } from "@/lib/board/schema";
import type { PackSpec } from "@/lib/pack";
import { drawFace, drawSeal, fiberNormal, fiberTexture, foilRoughMetal, rolesOf, type ArtInput, type FaceKind } from "./art";
import { backdropLook, studioEquirect, sweepGeometry, type Backdrop } from "./studio";

const U = 0.01; // scene units per millimetre (1 unit = 100 mm)
const RAD = Math.PI / 180;

export type SceneInput = { d: Direction; brand: string; spec: PackSpec; open: boolean; fit: number };
export type View = { x: number; y: number };

export function webglAvailable(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

/* ================================================================ Studio lighting */

/** The shared studio (see studio.ts), prefiltered for the live renderer. */
function studioEnvironment(renderer: THREE.WebGLRenderer, equirect: THREE.DataTexture): THREE.Texture {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const rt = pmrem.fromEquirectangular(equirect);
  pmrem.dispose();
  return rt.texture;
}

/* ================================================================ Contact shadow */

const BLUR_VERT = "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }";
const BLUR_FRAG = `
uniform sampler2D tDiffuse; uniform vec2 dir; varying vec2 vUv;
void main(){
  vec4 s = vec4(0.0);
  s += texture2D(tDiffuse, vUv - 4.0*dir) * 0.051; s += texture2D(tDiffuse, vUv - 3.0*dir) * 0.0918;
  s += texture2D(tDiffuse, vUv - 2.0*dir) * 0.12245; s += texture2D(tDiffuse, vUv - dir) * 0.1531;
  s += texture2D(tDiffuse, vUv) * 0.1633;
  s += texture2D(tDiffuse, vUv + dir) * 0.1531; s += texture2D(tDiffuse, vUv + 2.0*dir) * 0.12245;
  s += texture2D(tDiffuse, vUv + 3.0*dir) * 0.0918; s += texture2D(tDiffuse, vUv + 4.0*dir) * 0.051;
  gl_FragColor = s;
}`;

/** Renders the product's depth from below the floor, blurs it, shows it on the floor. */
class ContactShadow {
  plane: THREE.Mesh;
  private rtA: THREE.WebGLRenderTarget;
  private rtB: THREE.WebGLRenderTarget;
  private cam: THREE.OrthographicCamera;
  private depthMat: THREE.MeshDepthMaterial;
  private blurMat: THREE.ShaderMaterial;
  private quad: THREE.Mesh;
  private quadScene = new THREE.Scene();
  private quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  size = 4;

  constructor(res = 512) {
    const opts = { type: THREE.HalfFloatType, generateMipmaps: false } as const;
    this.rtA = new THREE.WebGLRenderTarget(res, res, opts);
    this.rtB = new THREE.WebGLRenderTarget(res, res, opts);
    this.cam = new THREE.OrthographicCamera(-2, 2, 2, -2, 0, 3);
    this.cam.rotation.x = Math.PI / 2;
    this.depthMat = new THREE.MeshDepthMaterial();
    this.depthMat.side = THREE.DoubleSide;
    this.depthMat.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        "gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );",
        "gl_FragColor = vec4( vec3( 0.0 ), pow( 1.0 - fragCoordZ, 4.0 ) );",
      );
    };
    this.blurMat = new THREE.ShaderMaterial({ uniforms: { tDiffuse: { value: null }, dir: { value: new THREE.Vector2() } }, vertexShader: BLUR_VERT, fragmentShader: BLUR_FRAG, depthTest: false, depthWrite: false });
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.blurMat);
    this.quadScene.add(this.quad);
    this.plane = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ map: this.rtA.texture, transparent: true, depthWrite: false, opacity: 0.9, toneMapped: false }),
    );
    this.plane.rotation.x = -Math.PI / 2;
    this.plane.position.y = 0.0006;
    this.plane.renderOrder = -1;
  }

  setSize(size: number, height: number) {
    this.size = size;
    // the shadow camera looks up from under the floor, so its image is mirrored
    this.plane.scale.set(size, -size, 1);
    const h = size / 2;
    this.cam.left = -h;
    this.cam.right = h;
    this.cam.top = h;
    this.cam.bottom = -h;
    this.cam.far = height;
    this.cam.updateProjectionMatrix();
  }

  update(renderer: THREE.WebGLRenderer, scene: THREE.Scene, opacity: number) {
    const mat = this.plane.material as THREE.MeshBasicMaterial;
    mat.opacity = opacity;
    if (opacity <= 0.001) return;
    const prevTarget = renderer.getRenderTarget();
    const prevClear = renderer.getClearAlpha();
    const prevBg = scene.background;
    this.plane.visible = false;
    scene.background = null;
    scene.overrideMaterial = this.depthMat;
    renderer.setClearColor(0x000000, 0);
    renderer.setRenderTarget(this.rtA);
    renderer.clear();
    renderer.render(scene, this.cam);
    scene.overrideMaterial = null;
    // two blur passes of decreasing radius soften the edge like a large light
    const px = 1 / this.rtA.width;
    for (const r of [7, 3.5, 1.5]) {
      this.blur(renderer, this.rtA, this.rtB, new THREE.Vector2(px * r, 0));
      this.blur(renderer, this.rtB, this.rtA, new THREE.Vector2(0, px * r));
    }
    renderer.setRenderTarget(prevTarget);
    renderer.setClearAlpha(prevClear);
    scene.background = prevBg;
    this.plane.visible = true;
  }

  private blur(renderer: THREE.WebGLRenderer, src: THREE.WebGLRenderTarget, dst: THREE.WebGLRenderTarget, dir: THREE.Vector2) {
    this.blurMat.uniforms.tDiffuse.value = src.texture;
    this.blurMat.uniforms.dir.value.copy(dir);
    renderer.setRenderTarget(dst);
    renderer.clear();
    renderer.render(this.quadScene, this.quadCam);
  }

  dispose() {
    this.rtA.dispose();
    this.rtB.dispose();
    this.depthMat.dispose();
    this.blurMat.dispose();
    this.quad.geometry.dispose();
    this.plane.geometry.dispose();
    (this.plane.material as THREE.Material).dispose();
  }
}

/* ================================================================ Materials */

type Kit = {
  tex: (kind: FaceKind, wMm: number, hMm: number) => THREE.MeshPhysicalMaterial;
  edge: THREE.MeshStandardMaterial;
  inside: THREE.MeshStandardMaterial;
  lining: THREE.MeshPhysicalMaterial;
  velvet: THREE.MeshPhysicalMaterial;
  bareMetal: THREE.MeshPhysicalMaterial;
  dispose: () => void;
};

const FINISH = {
  matte: { rough: 0.74, bump: 0.22, clearcoat: 0, ccRough: 0.1, sheen: 0.15 },
  gloss: { rough: 0.42, bump: 0.08, clearcoat: 1, ccRough: 0.04, sheen: 0 },
  paper: { rough: 0.9, bump: 0.7, clearcoat: 0, ccRough: 0.1, sheen: 0.35 },
  foil: { rough: 0.72, bump: 0.22, clearcoat: 0, ccRough: 0.1, sheen: 0.12 },
} as const;

function makeKit(renderer: THREE.WebGLRenderer, a: ArtInput, maxTex: number, metalPrint: boolean): Kit {
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

  const canvasTex = (c: HTMLCanvasElement, srgb: boolean) => {
    const t = new THREE.CanvasTexture(c);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = aniso;
    t.generateMipmaps = true;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    disposables.push(t);
    return t;
  };

  const tex = (kind: FaceKind, wMm: number, hMm: number) => {
    const ppm = Math.min(16, maxTex / Math.max(wMm, hMm));
    const art = drawFace(kind, wMm, hMm, ppm, a);
    const fib = fiber.clone();
    fib.repeat.set(wMm / 40, hMm / 40);
    fib.needsUpdate = true;
    disposables.push(fib);
    const m = new THREE.MeshPhysicalMaterial({
      map: canvasTex(art.color, true),
      roughness: metalPrint ? 0.34 : f.rough,
      metalness: metalPrint ? 0.18 : 0,
      normalMap: metalPrint ? null : fib,
      normalScale: nScale(f.bump),
      clearcoat: metalPrint ? Math.max(0.6, f.clearcoat) : f.clearcoat,
      clearcoatRoughness: metalPrint ? 0.08 : f.ccRough,
      sheen: metalPrint ? 0 : f.sheen,
      sheenRoughness: 0.8,
      sheenColor: new THREE.Color(1, 1, 1),
    });
    if (art.foil) {
      const rm = canvasTex(foilRoughMetal(art.foil, metalPrint ? 0.34 : f.rough, 0.3), false);
      m.roughness = 1;
      m.metalness = 1;
      m.roughnessMap = rm;
      m.metalnessMap = rm;
    }
    disposables.push(m);
    return m;
  };

  const edge = new THREE.MeshStandardMaterial({ color: "#ECE7DC", roughness: 0.95, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
  const insideFiber = fiber.clone();
  insideFiber.repeat.set(4, 4);
  insideFiber.needsUpdate = true;
  disposables.push(insideFiber);
  const inside = new THREE.MeshStandardMaterial({ color: "#D9D4C8", roughness: 0.92, normalMap: insideFiber, normalScale: nScale(0.6) });
  const lining = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(roles.ground).lerp(new THREE.Color("#ffffff"), 0.15), roughness: 0.85, normalMap: insideFiber, normalScale: nScale(0.35), sheen: 0.3 });
  const velvet = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(roles.ink).lerp(new THREE.Color(roles.key), 0.35), roughness: 1, sheen: 1, sheenRoughness: 0.55, sheenColor: new THREE.Color(roles.key).lerp(new THREE.Color("#ffffff"), 0.4) });
  const bareMetal = new THREE.MeshPhysicalMaterial({ color: "#D7D9D8", metalness: 1, roughness: 0.22 });
  disposables.push(edge, inside, lining, velvet, bareMetal);
  return { tex, edge, inside, lining, velvet, bareMetal, dispose: () => disposables.forEach((x) => x.dispose()) };
}

/* ================================================================ Animated values */

type Tween = { v: number; from: number; to: number; t0: number; dur: number; delay: number };
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function tw(v: number): Tween {
  return { v, from: v, to: v, t0: 0, dur: 1, delay: 0 };
}
function aim(t: Tween, to: number, now: number, dur: number, delay = 0) {
  t.from = t.v;
  t.to = to;
  t.t0 = now;
  t.dur = dur;
  t.delay = delay;
}
/** Advances a tween; returns true while it is still moving. */
function step(t: Tween, now: number): boolean {
  if (t.v === t.to) return false;
  const k = Math.min(1, Math.max(0, (now - t.t0 - t.delay) / t.dur));
  t.v = t.from + (t.to - t.from) * easeInOut(k);
  if (k >= 1) t.v = t.to;
  return t.v !== t.to;
}

/* ================================================================ Builders */

/** A numbered part in the anatomy view: where its pin sits and what the model says about it. */
export type Pin = { n: number; label: Pair; detail: Pair; obj: THREE.Object3D; at: THREE.Vector3; normal?: THREE.Vector3; /** inside the package: listed, not pinned */ hidden?: boolean };
export type PinOnScreen = { n: number; x: number; y: number; visible: boolean };
type Pair = { zh: string; en: string };

/** Overshooting spring ease, staggered per part: the way the anatomy skill releases assemblies. */
function springAt(x: number, k: number, stagger = 0.13): number {
  const t = Math.min(1, Math.max(0, (x - k * stagger) / 0.62));
  const c1 = 1.25;
  const c3 = c1 + 1;
  return t === 0 ? 0 : 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}
const mmOf = (units: number) => Math.round(units / U);

type Built = {
  root: THREE.Group;
  /** Bounding radius and target height for camera framing, given open progress and anatomy 0..1. */
  frame: (p: number, x: number) => { r: number; y: number };
  /** Anatomy: pull the package apart (0 = assembled, 1 = apart). Called after `apply`. */
  explode: (x: number) => void;
  pins: Pin[];
  /** Apply open progress (carton: unfold; gift / tin: lid off). Returns shadow opacity factor. */
  apply: (p: number) => number;
  /** Carton uses staged folding; others a single value. */
  staged?: boolean;
  stages?: Tween[];
  lines?: THREE.LineBasicMaterial;
};

/**
 * A board panel as it really is: very slightly bowed outward (about 0.3–0.6 mm over a big
 * panel) and with its edges softened, by tilting the shading normals over the last
 * millimetre, so folds catch a thin highlight instead of reading as CG-sharp corners.
 */
function boardPanel(pw: number, ph: number, t: number): THREE.BufferGeometry {
  const sx = Math.max(4, Math.min(20, Math.round(pw / (8 * U))));
  const sy = Math.max(4, Math.min(20, Math.round(ph / (8 * U))));
  const g = new THREE.BoxGeometry(pw, ph, t, sx, sy, 1);
  const pos = g.attributes.position as THREE.BufferAttribute;
  const nor = g.attributes.normal as THREE.BufferAttribute;
  const e = Math.min(1.1 * U, pw * 0.08, ph * 0.08); // softened edge width
  // Move the vertex row next to each edge to `e` from it, so the softened rim stays narrow.
  const remap = (v: number, half: number, seg: number) => {
    const a = Math.abs(v);
    if (a >= half - 1e-7) return v;
    const step = (2 * half) / seg;
    return Math.sign(v) * ((a * (half - e)) / (half - step));
  };
  const bulge = Math.min(0.6 * U, Math.min(pw, ph) * 0.006);
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    let y = pos.getY(i);
    x = remap(x, pw / 2, sx);
    y = remap(y, ph / 2, sy);
    const bx = 1 - Math.pow((2 * x) / pw, 2);
    const by = 1 - Math.pow((2 * y) / ph, 2);
    pos.setXYZ(i, x, y, pos.getZ(i) + bulge * Math.max(0, bx) * Math.max(0, by));
    // outer face: tilt normals at the rim toward the edge
    if (nor.getZ(i) > 0.9) {
      const ex = Math.abs(x) >= pw / 2 - 1e-7 ? Math.sign(x) : 0;
      const ey = Math.abs(y) >= ph / 2 - 1e-7 ? Math.sign(y) : 0;
      const n = new THREE.Vector3(ex * 0.75, ey * 0.75, 1).normalize();
      nor.setXYZ(i, n.x, n.y, n.z);
    }
  }
  pos.needsUpdate = true;
  nor.needsUpdate = true;
  return g;
}

/**
 * One single-material mesh per geometry group, under a group. The path tracer assigns
 * materials per mesh, so multi-material meshes (a box with a printed face) are split here.
 */
function splitMesh(geo: THREE.BufferGeometry, mats: THREE.Material[]): THREE.Group {
  const g = new THREE.Group();
  if (!geo.index) {
    const n = geo.getAttribute("position").count;
    geo.setIndex(Array.from({ length: n }, (_, i) => i));
  }
  const index = geo.index!.array;
  const groups = geo.groups.length ? geo.groups : [{ start: 0, count: index.length, materialIndex: 0 }];
  const byMat = new Map<number, number[]>();
  for (const gr of groups) {
    const list = byMat.get(gr.materialIndex ?? 0) ?? [];
    for (let i = gr.start; i < Math.min(index.length, gr.start + gr.count); i++) list.push(index[i]);
    byMat.set(gr.materialIndex ?? 0, list);
  }
  for (const [mi, idx] of byMat) {
    const sub = new THREE.BufferGeometry();
    for (const name of Object.keys(geo.attributes)) sub.setAttribute(name, geo.getAttribute(name));
    sub.setIndex(idx);
    const m = new THREE.Mesh(sub, mats[mi] ?? mats[0]);
    g.add(m);
  }
  return g;
}

function box(w: number, h: number, t: number, mats: THREE.Material[]) {
  return splitMesh(new THREE.BoxGeometry(w, h, t), mats);
}

/** Tuck carton with hinged panels, staged fold (sides → back → flaps → top/bottom). */
function buildCarton(spec: PackSpec, k: Kit): Built {
  const w = spec.w * U;
  const h = spec.h * U;
  const d = spec.d * U;
  const t = 0.45 * U;
  const g = Math.max(8, Math.min(spec.d * 0.32, 18)) * U;
  const tuck = Math.max(10, Math.min(spec.d * 0.55, 34)) * U;
  const dust = Math.max(8, Math.min(spec.d * 0.7, spec.w * 0.45)) * U;
  const E = k.edge;
  const I = k.inside;
  // BoxGeometry material order: +x, -x, +y, -y, +z (outer, printed), -z (inside)
  const panel = (pw: number, ph: number, outer: THREE.Material, anchor: "c" | "l" | "r" | "t" | "b") => {
    const geo = boardPanel(pw, ph, t);
    const ox = anchor === "l" ? pw / 2 : anchor === "r" ? -pw / 2 : 0;
    const oy = anchor === "b" ? ph / 2 : anchor === "t" ? -ph / 2 : 0;
    geo.translate(ox, oy, -t / 2);
    return splitMesh(geo, [E, E, E, E, outer, I]);
  };
  const flapMat = k.tex("flap", 60, 60);
  const shapeFlap = (shape: THREE.Shape) => {
    const geo = new THREE.ExtrudeGeometry(shape, { depth: t, bevelEnabled: false, curveSegments: 10 });
    geo.translate(0, 0, -t);
    // Extrude groups: 0 = caps, 1 = sides
    return splitMesh(geo, [flapMat, E]);
  };
  const lineMat = new THREE.LineBasicMaterial({ color: 0xe4007f, transparent: true, opacity: 0, depthTest: true });
  const outline = (pw: number, ph: number, ox: number, oy: number) => {
    const geo = new THREE.EdgesGeometry(new THREE.PlaneGeometry(pw, ph));
    geo.translate(ox, oy, 0.0004);
    return new THREE.LineSegments(geo, lineMat);
  };

  const root = new THREE.Group();
  const frontG = new THREE.Group();
  root.add(frontG);
  frontG.add(panel(w, h, k.tex("front", spec.w, spec.h), "c"), outline(w, h, 0, 0));

  // left side + glue flap + dust flaps
  const leftH = new THREE.Group();
  leftH.position.set(-w / 2, 0, 0);
  frontG.add(leftH);
  leftH.add(panel(d, h, k.tex("left", spec.d, spec.h), "r"), outline(d, h, -d / 2, 0));
  const glueH = new THREE.Group();
  glueH.position.set(-d, 0, -t);
  leftH.add(glueH);
  const gs = new THREE.Shape();
  gs.moveTo(0, -h * 0.45);
  gs.lineTo(0, h * 0.45);
  gs.lineTo(-g, h * 0.4);
  gs.lineTo(-g, -h * 0.4);
  gs.closePath();
  glueH.add(shapeFlap(gs));

  const dustShape = (dir: 1 | -1) => {
    const s = new THREE.Shape();
    s.moveTo(-d / 2, 0);
    s.lineTo(d / 2, 0);
    s.lineTo(d / 2, dir * dust);
    s.lineTo(-d / 2 + d * 0.35, dir * dust);
    s.quadraticCurveTo(-d / 2, dir * dust * 0.9, -d / 2, dir * dust * 0.25);
    s.closePath();
    return s;
  };
  const addDust = (parent: THREE.Group, cx: number) => {
    const top = new THREE.Group();
    top.position.set(cx, h / 2, -t);
    top.add(shapeFlap(dustShape(1)));
    const bot = new THREE.Group();
    bot.position.set(cx, -h / 2, -t);
    bot.add(shapeFlap(dustShape(-1)));
    parent.add(top, bot);
    return { top, bot };
  };
  const dustL = addDust(leftH, -d / 2);

  // right side → back
  const rightH = new THREE.Group();
  rightH.position.set(w / 2, 0, 0);
  frontG.add(rightH);
  rightH.add(panel(d, h, k.tex("right", spec.d, spec.h), "l"), outline(d, h, d / 2, 0));
  const dustR = addDust(rightH, d / 2);
  const backH = new THREE.Group();
  backH.position.set(d, 0, 0);
  rightH.add(backH);
  backH.add(panel(w, h, k.tex("back", spec.w, spec.h), "l"), outline(w, h, w / 2, 0));

  // top + tuck, bottom + tuck
  const topH = new THREE.Group();
  topH.position.set(0, h / 2, 0);
  frontG.add(topH);
  topH.add(panel(w, d, k.tex("top", spec.w, spec.d), "b"), outline(w, d, 0, d / 2));
  const tuckShape = (dir: 1 | -1) => {
    const s = new THREE.Shape();
    const hw = w * 0.48;
    s.moveTo(-hw, 0);
    s.lineTo(-hw, dir * tuck * 0.45);
    s.quadraticCurveTo(-hw, dir * tuck, -hw + tuck * 0.6, dir * tuck);
    s.lineTo(hw - tuck * 0.6, dir * tuck);
    s.quadraticCurveTo(hw, dir * tuck, hw, dir * tuck * 0.45);
    s.lineTo(hw, 0);
    s.closePath();
    return s;
  };
  const tuckT = new THREE.Group();
  tuckT.position.set(0, d, -t);
  topH.add(tuckT);
  tuckT.add(shapeFlap(tuckShape(1)));
  const botH = new THREE.Group();
  botH.position.set(0, -h / 2, 0);
  frontG.add(botH);
  botH.add(panel(w, d, k.tex("bottom", spec.w, spec.d), "t"), outline(w, d, 0, -d / 2));
  const tuckB = new THREE.Group();
  tuckB.position.set(0, -d, -t);
  botH.add(tuckB);
  tuckB.add(shapeFlap(tuckShape(-1)));

  const flaps = [glueH, dustL.top, dustL.bot, dustR.top, dustR.bot, tuckT, tuckB];
  root.position.y = h / 2;
  const stages = [tw(1), tw(1), tw(1), tw(1)]; // sides, back, flaps, top/bottom
  const netW = 2 * w + 2 * d + g;
  const netH = h + 2 * d + 2 * tuck;
  const shift = (g - w) / 2;

  const apply = () => {
    const [fs, fb, ffl, ftb] = stages.map((s) => s.v);
    frontG.position.set(shift * (1 - fs), 0, (d / 2) * fs);
    leftH.rotation.y = (-Math.PI / 2) * fs;
    rightH.rotation.y = (Math.PI / 2) * fs;
    backH.rotation.y = (Math.PI / 2) * fb;
    topH.rotation.x = (-Math.PI / 2) * ftb;
    botH.rotation.x = (Math.PI / 2) * ftb;
    glueH.rotation.y = (-Math.PI / 2) * ffl;
    for (const fl of [dustL.top, dustR.top]) fl.rotation.x = (-Math.PI / 2) * ffl;
    for (const fl of [dustL.bot, dustR.bot]) fl.rotation.x = (Math.PI / 2) * ffl;
    tuckT.rotation.x = (-Math.PI / 2) * ffl;
    tuckB.rotation.x = (Math.PI / 2) * ffl;
    // tucked-in flaps are hidden once inside, so they never show through
    for (const fl of flaps) fl.visible = ffl < 0.985;
    lineMat.opacity = Math.max(0, 1 - fs * 1.6);
    lineMat.visible = lineMat.opacity > 0.01;
    return Math.max(0, fs * 1.4 - 0.4);
  };
  const folded = 0.5 * Math.max(h, Math.hypot(w, d)) * 1.04;
  // Anatomy: the top opens and its tuck and dust flaps stand up, so the closure reads.
  const explode = (x: number) => {
    if (x <= 0) return;
    const [, , ffl, ftb] = stages.map((s) => s.v);
    const top = springAt(x, 0);
    const flap = springAt(x, 1);
    topH.rotation.x = (-Math.PI / 2) * ftb * (1 - 0.62 * top);
    tuckT.rotation.x = (-Math.PI / 2) * ffl * (1 - 0.8 * flap);
    for (const fl of [dustL.top, dustR.top]) fl.rotation.x = (-Math.PI / 2) * ffl * (1 - 0.75 * springAt(x, 2));
    for (const fl of [tuckT, dustL.top, dustR.top]) fl.visible = true;
  };
  const S = spec;
  const pins: Pin[] = [
    { n: 1, label: { zh: "正面", en: "Front panel" }, detail: { zh: `${S.w} × ${S.h} mm，350 g 白卡（约 0.45 mm）四色印刷`, en: `${S.w} × ${S.h} mm, 350 g white board (about 0.45 mm), four-colour print` }, obj: frontG, at: new THREE.Vector3(-w * 0.18, h * 0.12, 0.001), normal: new THREE.Vector3(0, 0, 1) },
    { n: 2, label: { zh: "侧面", en: "Side panel" }, detail: { zh: `${S.d} × ${S.h} mm，压痕折成 90°`, en: `${S.d} × ${S.h} mm, creased and folded to 90°` }, obj: rightH, at: new THREE.Vector3(d / 2, -h * 0.2, 0.001), normal: new THREE.Vector3(0, 0, 1) },
    { n: 3, label: { zh: "顶盖", en: "Top panel" }, detail: { zh: `${S.w} × ${S.d} mm，开合的盖`, en: `${S.w} × ${S.d} mm, the opening lid` }, obj: topH, at: new THREE.Vector3(-w * 0.25, d / 2, 0.001), normal: new THREE.Vector3(0, 0, 1) },
    { n: 4, label: { zh: "插舌", en: "Tuck flap" }, detail: { zh: `深 ${mmOf(tuck)} mm，插进盒内把盖锁住`, en: `${mmOf(tuck)} mm deep, tucks inside to lock the lid` }, obj: tuckT, at: new THREE.Vector3(w * 0.2, tuck * 0.55, 0.001), normal: new THREE.Vector3(0, 0, 1) },
    { n: 5, label: { zh: "防尘翼", en: "Dust flaps" }, detail: { zh: `高 ${mmOf(dust)} mm，挡住盖两侧的缝`, en: `${mmOf(dust)} mm high, close the gaps at the lid's sides` }, obj: dustR.top, at: new THREE.Vector3(0, dust * 0.5, 0.001), normal: new THREE.Vector3(0, 0, 1) },
    { n: 6, label: { zh: "糊口", en: "Glue flap" }, detail: { zh: `宽 ${mmOf(g)} mm，在盒内与背面粘合`, en: `${mmOf(g)} mm wide, glued to the back inside the box` }, obj: glueH, at: new THREE.Vector3(-g / 2, 0, -0.001), hidden: true },
  ];
  return {
    root,
    staged: true,
    stages,
    lines: lineMat,
    apply,
    explode,
    pins,
    frame: (_p, x) => {
      const fs = stages[0].v;
      return { r: (folded + (0.5 * Math.max(netW, netH) - folded) * (1 - fs)) * (1 + 0.18 * x), y: h / 2 + d * 0.25 * x };
    },
  };
}

/** Rigid lid-and-base gift box: 1.5 mm wrapped chipboard, lining, a velvet tray, cards. */
function buildGift(spec: PackSpec, k: Kit): Built {
  const W = spec.w * U;
  const H = spec.h * U;
  const D = spec.d * U;
  const T = 1.5 * U;
  const lidH = Math.max(12, spec.h * 0.34) * U;
  const gap = 0.6 * U;
  const bw = W - 2 * (T + gap);
  const bd = D - 2 * (T + gap);
  const bh = H - T;
  const L = k.lining;
  const rb = (w: number, h: number, d: number, mats: THREE.Material[]) => {
    return splitMesh(new RoundedBoxGeometry(w, h, d, 2, Math.min(w, h, d) * 0.45), mats);
  };
  // material order: +x, -x, +y, -y, +z, -z
  const root = new THREE.Group();
  const base = new THREE.Group();
  root.add(base);
  const sideFB = k.tex("baseSide", spec.w, spec.h);
  const sideLR = k.tex("baseSide", spec.d, spec.h);
  const floor = rb(bw, T, bd, [L, L, L, k.tex("bottom", spec.w, spec.d), L, L]);
  floor.position.y = T / 2;
  const wf = rb(bw, bh, T, [L, L, L, L, sideFB, L]);
  wf.position.set(0, bh / 2, bd / 2 - T / 2);
  const wb = rb(bw, bh, T, [L, L, L, L, L, sideFB]);
  wb.position.set(0, bh / 2, -bd / 2 + T / 2);
  const wl = rb(T, bh, bd - 2 * T, [L, sideLR, L, L, L, L]);
  wl.position.set(-bw / 2 + T / 2, bh / 2, 0);
  const wr = rb(T, bh, bd - 2 * T, [sideLR, L, L, L, L, L]);
  wr.position.set(bw / 2 - T / 2, bh / 2, 0);
  base.add(floor, wf, wb, wl, wr);

  // velvet tray with the inner pack and the manual resting in it
  const trayH = Math.min(bh * 0.45, 30 * U);
  const tray = new THREE.Mesh(new RoundedBoxGeometry(bw - 2 * T - 0.002, trayH, bd - 2 * T - 0.002, 3, 2 * U), k.velvet);
  tray.position.y = T + trayH / 2;
  base.add(tray);
  const iw = Math.min(bw * 0.46, 120 * U);
  const id = Math.min(bd * 0.62, iw * 0.62);
  const inner = box(iw, id, 3 * U, [L, L, L, L, k.tex("inner", iw / U, id / U), L]);
  inner.rotation.x = -Math.PI / 2;
  inner.rotation.z = 0.04;
  inner.position.set(-bw * 0.16, T + trayH + 1.5 * U, 0);
  const mw = Math.min(bw * 0.24, 70 * U);
  const md = mw * 1.32;
  const manual = box(mw, md, 1 * U, [L, L, L, L, k.tex("manual", mw / U, md / U), L]);
  manual.rotation.x = -Math.PI / 2;
  manual.rotation.z = -0.09;
  manual.position.set(bw * 0.24, T + trayH + 0.6 * U, 0.01);
  base.add(inner, manual);

  // lid (origin at its bottom centre)
  const lid = new THREE.Group();
  root.add(lid);
  const top = rb(W, T, D, [L, L, k.tex("front", spec.w, spec.d), L, L, L]);
  top.position.y = lidH - T / 2;
  const bandW = k.tex("band", spec.w, lidH / U);
  const bandBack = k.tex("bandPlain", spec.w, lidH / U);
  const bandD = k.tex("bandPlain", spec.d, lidH / U);
  const lf = rb(W, lidH - T, T, [L, L, L, L, bandW, L]);
  lf.position.set(0, (lidH - T) / 2, D / 2 - T / 2);
  const lb = rb(W, lidH - T, T, [L, L, L, L, L, bandBack]);
  lb.position.set(0, (lidH - T) / 2, -D / 2 + T / 2);
  const ll = rb(T, lidH - T, D - 2 * T, [L, bandD, L, L, L, L]);
  ll.position.set(-W / 2 + T / 2, (lidH - T) / 2, 0);
  const lr = rb(T, lidH - T, D - 2 * T, [bandD, L, L, L, L, L]);
  lr.position.set(W / 2 - T / 2, (lidH - T) / 2, 0);
  lid.add(top, lf, lb, ll, lr);

  const closedY = H - lidH;
  const openPos = new THREE.Vector3(0, (D / 2) * 0.97 + T, -bd / 2 - lidH * 0.9 - 0.02);
  const openRot = 74 * RAD;
  const apply = (p: number) => {
    const lift = Math.sin(p * Math.PI) * H * 0.55;
    lid.position.set(0, closedY + (openPos.y - closedY) * p + lift, openPos.z * p);
    lid.rotation.x = openRot * Math.min(1, p * 1.15);
    return 1;
  };
  const closedR = 0.5 * Math.hypot(W, D) * 0.98;
  // Anatomy: lid, tray and the two cards lift off the base one after another.
  const rest = { tray: tray.position.y, inner: inner.position.y, manual: manual.position.y };
  const explode = (x: number) => {
    lid.position.y += H * 1.55 * springAt(x, 0);
    tray.position.y = rest.tray + H * 0.55 * springAt(x, 1);
    inner.position.y = rest.inner + H * 0.55 * springAt(x, 1) + H * 0.42 * springAt(x, 2);
    manual.position.y = rest.manual + H * 0.55 * springAt(x, 1) + H * 0.42 * springAt(x, 3);
  };
  const S = spec;
  const pins: Pin[] = [
    { n: 1, label: { zh: "天盖", en: "Lid" }, detail: { zh: `${S.w} × ${S.d} × ${mmOf(lidH)} mm，1.5 mm 灰板外裱印刷纸`, en: `${S.w} × ${S.d} × ${mmOf(lidH)} mm, 1.5 mm chipboard wrapped in printed paper` }, obj: lid, at: new THREE.Vector3(W * 0.3, lidH, D * 0.2), normal: new THREE.Vector3(0, 1, 0) },
    { n: 2, label: { zh: "地盒", en: "Base" }, detail: { zh: `${mmOf(bw)} × ${mmOf(bd)} × ${mmOf(bh)} mm，比盖每边小 ${mmOf(T + gap)} mm，盖能顺滑套上`, en: `${mmOf(bw)} × ${mmOf(bd)} × ${mmOf(bh)} mm, ${mmOf(T + gap)} mm smaller per side so the lid slides on` }, obj: base, at: new THREE.Vector3(-bw * 0.25, bh * 0.45, bd / 2), normal: new THREE.Vector3(0, 0, 1) },
    { n: 3, label: { zh: "内托", en: "Tray" }, detail: { zh: `高 ${mmOf(trayH)} mm，植绒，托住内容物`, en: `${mmOf(trayH)} mm high, flocked, holds the contents` }, obj: tray, at: new THREE.Vector3(bw * 0.38, trayH / 2, bd * 0.3), normal: new THREE.Vector3(0, 1, 0) },
    { n: 4, label: { zh: "内包装", en: "Inner pack" }, detail: { zh: `${mmOf(iw)} × ${mmOf(id)} mm，印品名与规格`, en: `${mmOf(iw)} × ${mmOf(id)} mm, printed with name and size` }, obj: inner, at: new THREE.Vector3(0, 0, 1.6 * U), normal: new THREE.Vector3(0, 0, 1) },
    { n: 5, label: { zh: "说明书", en: "Manual" }, detail: { zh: `${mmOf(mw)} × ${mmOf(md)} mm，编号步骤`, en: `${mmOf(mw)} × ${mmOf(md)} mm, numbered steps` }, obj: manual, at: new THREE.Vector3(0, md * 0.2, 0.6 * U), normal: new THREE.Vector3(0, 0, 1) },
  ];
  return {
    root,
    apply,
    explode,
    pins,
    frame: (p, x) => ({ r: closedR * (1 + 0.28 * p) * (1 + 0.35 * x), y: H / 2 + (D * 0.25) * p + H * 0.95 * x }),
  };
}

/** Round tin: tinplate body with rolled beads, printed wrap, lacquered printed lid, foil seal. */
function buildTin(spec: PackSpec, k: Kit, a: ArtInput, maxTex: number, own: { dispose: () => void }[]): Built {
  const R = (spec.w / 2) * U;
  const H = spec.h * U;
  const lidH = Math.max(10, spec.h * 0.17) * U;
  const mm = U;
  const SEG = 128;
  const root = new THREE.Group();
  const M = k.bareMetal;

  // body profile (radius, height), bottom to top; the neck is where the lid slides on
  const neckY = H - lidH + 2 * mm;
  const body = [
    [0, 0.6 * mm],
    [R - 2.4 * mm, 0.6 * mm],
    [R - 1.2 * mm, 0],
    [R + 0.4 * mm, 0.5 * mm],
    [R + 0.8 * mm, 1.6 * mm],
    [R + 0.5 * mm, 2.8 * mm],
    [R, 3.4 * mm],
    [R, neckY - 1.2 * mm],
    [R - 1.2 * mm, neckY],
    [R - 1.2 * mm, H - 2.2 * mm],
    [R - 0.6 * mm, H - 1.6 * mm],
    [R - 1.6 * mm, H - 1.2 * mm],
    [R - 2.0 * mm, H - 2.0 * mm],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const bodyMesh = new THREE.Mesh(new THREE.LatheGeometry(body, SEG), M);
  (bodyMesh.material as THREE.Material).side = THREE.DoubleSide;
  bodyMesh.castShadow = true;
  root.add(bodyMesh);

  // printed wrap (on the metal, lacquered)
  const labelY0 = 3.6 * mm;
  const labelY1 = neckY - 1.4 * mm;
  const labelH = labelY1 - labelY0;
  const circ = 2 * Math.PI * R;
  const wrap = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.12 * mm, R + 0.12 * mm, labelH, SEG, 1, true, Math.PI, Math.PI * 2), k.tex("tinWrap", circ / U, labelH / U));
  wrap.position.y = labelY0 + labelH / 2;
  wrap.castShadow = true;
  root.add(wrap);

  // foil seal at the top of the body
  const sealC = drawSeal(Math.min(1024, maxTex / 2), a);
  const sealTex = new THREE.CanvasTexture(sealC);
  sealTex.colorSpace = THREE.SRGBColorSpace;
  own.push(sealTex);
  const fiber = new THREE.CanvasTexture(fiberTexture());
  fiber.wrapS = fiber.wrapT = THREE.RepeatWrapping;
  fiber.repeat.set(3, 3);
  own.push(fiber);
  const sealMat = new THREE.MeshPhysicalMaterial({ map: sealTex, color: "#f4f4f2", metalness: 0.75, roughness: 0.42, bumpMap: fiber, bumpScale: 3 });
  own.push(sealMat);
  const seal = new THREE.Mesh(new THREE.CircleGeometry(R - 1.9 * mm, SEG), sealMat);
  seal.rotation.x = -Math.PI / 2;
  seal.position.y = H - 1.9 * mm;
  root.add(seal);

  // lid: printed, lacquered tinplate with a rolled edge
  const lid = new THREE.Group();
  root.add(lid);
  const LR = R + 0.9 * mm;
  const lidProfile = [
    [LR - 0.4 * mm, 0],
    [LR + 0.5 * mm, 0.4 * mm],
    [LR + 0.6 * mm, 1.2 * mm],
    [LR, 1.6 * mm],
    [LR, lidH - 2.2 * mm],
    [LR + 0.5 * mm, lidH - 1.4 * mm],
    [LR + 0.2 * mm, lidH - 0.4 * mm],
    [LR - 1.0 * mm, lidH],
    [LR - 2.2 * mm, lidH - 0.6 * mm],
    [LR - 2.6 * mm, lidH - 0.2 * mm],
    [0, lidH - 0.2 * mm],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const roles = rolesOf(a.d);
  const lidPaint = new THREE.MeshPhysicalMaterial({ color: roles.key, metalness: 0.4, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.06 });
  own.push(lidPaint);
  const lidMesh = new THREE.Mesh(new THREE.LatheGeometry(lidProfile, SEG), lidPaint);
  lidMesh.material.side = THREE.DoubleSide;
  lidMesh.castShadow = true;
  lid.add(lidMesh);
  const capMat = k.tex("tinCap", spec.w, spec.w);
  capMat.metalness = Math.max(capMat.metalness, 0.25);
  capMat.roughness = Math.min(capMat.roughness, 0.3);
  capMat.clearcoat = 1;
  capMat.bumpMap = null;
  const cap = new THREE.Mesh(new THREE.CircleGeometry(LR - 2.5 * mm, SEG), capMat);
  cap.rotation.x = -Math.PI / 2;
  cap.position.y = lidH - 0.15 * mm;
  lid.add(cap);

  // Opened, the lid leans upright beside the tin, its printed top toward the camera.
  const closedY = H - lidH;
  const open = new THREE.Vector3(R * 2.15, LR * 0.95, R * 0.5);
  const apply = (p: number) => {
    const lift = Math.sin(p * Math.PI) * H * 0.35;
    lid.position.set(open.x * p, closedY + (open.y - closedY) * p + lift, open.z * p);
    lid.rotation.set(72 * RAD * Math.min(1, p * 1.1), -0.35 * p, 0);
    return 1;
  };
  const closedR = 0.5 * Math.max(H, 2 * R) * 1.05;
  // Anatomy: the lid lifts, then the foil seal rises out of the neck.
  const sealY = seal.position.y;
  const explode = (x: number) => {
    lid.position.y += H * 0.62 * springAt(x, 0);
    seal.position.y = sealY + H * 0.3 * springAt(x, 1);
  };
  const S = spec;
  const pins: Pin[] = [
    { n: 1, label: { zh: "罐盖", en: "Lid" }, detail: { zh: `Ø${mmOf(2 * LR)} × ${mmOf(lidH)} mm，印铁，罩清漆，卷边包口`, en: `Ø${mmOf(2 * LR)} × ${mmOf(lidH)} mm, printed tinplate, lacquered, rolled edge` }, obj: lid, at: new THREE.Vector3(R * 0.4, lidH, R * 0.3), normal: new THREE.Vector3(0, 1, 0) },
    { n: 2, label: { zh: "铝箔内封", en: "Foil seal" }, detail: { zh: `Ø${mmOf(2 * (R - 1.9 * mm))} mm，开罐前保鲜防潮`, en: `Ø${mmOf(2 * (R - 1.9 * mm))} mm, keeps it fresh and dry until opened` }, obj: seal, at: new THREE.Vector3(R * 0.35, -R * 0.3, 0), normal: new THREE.Vector3(0, 0, 1) },
    { n: 3, label: { zh: "罐身印刷", en: "Printed body" }, detail: { zh: `Ø${S.w} × ${S.h} mm，印刷面展开 ${mmOf(circ)} × ${mmOf(labelH)} mm`, en: `Ø${S.w} × ${S.h} mm, printed area unrolled ${mmOf(circ)} × ${mmOf(labelH)} mm` }, obj: wrap, at: new THREE.Vector3(0, labelH * 0.1, R + 0.4 * mm), normal: new THREE.Vector3(0, 0, 1) },
    { n: 4, label: { zh: "罐口", en: "Neck" }, detail: { zh: `收口 ${mmOf(1.2 * mm)} mm，罐盖套在这里`, en: `stepped in ${mmOf(1.2 * mm)} mm for the lid to sit on` }, obj: root, at: new THREE.Vector3(0, neckY + 1 * mm, R - 1.2 * mm), normal: new THREE.Vector3(0, 0, 1) },
    { n: 5, label: { zh: "底部卷边", en: "Bottom bead" }, detail: { zh: "金属卷边，罐底不刮桌面", en: "rolled metal bead, so the base doesn't scratch" }, obj: root, at: new THREE.Vector3(0, 1.6 * mm, R + 0.8 * mm), normal: new THREE.Vector3(0, 0, 1) },
  ];
  return { root, apply, explode, pins, frame: (p, x) => ({ r: closedR * (1 + 0.35 * p) * (1 + 0.55 * x), y: H / 2 + H * 0.4 * x }) };
}

/* ================================================================ Scene */

type PathTracerLike = {
  setScene: (scene: THREE.Scene, camera: THREE.Camera) => unknown;
  renderSample: () => void;
  reset: () => void;
  updateEnvironment: () => void;
  updateCamera: () => void;
  dispose?: () => void;
  samples: number;
  tiles: THREE.Vector2;
  minSamples: number;
  fadeDuration: number;
  renderDelay: number;
  renderScale: number;
  bounces: number;
  filterGlossyFactor: number;
  textureSize: THREE.Vector2;
  rasterizeScene: boolean;
};

export type SceneOptions = {
  quality?: "high" | "normal";
  /** "transparent": the package sits on the page (contact shadow only). "sweep": a photo studio. */
  stage?: "transparent" | "sweep";
  /** Progressive path tracing when the view is still (studio only). */
  photoreal?: boolean;
};

export class PackScene {
  readonly canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera = new THREE.PerspectiveCamera(28, 1, 0.01, 100);
  private turn = new THREE.Group();
  private shadow = new ContactShadow();
  private equirect: THREE.DataTexture;
  private env: THREE.Texture;
  private sweep: THREE.Mesh | null = null;
  private sweepMat: THREE.MeshPhysicalMaterial | null = null;
  private sweepMap: THREE.DataTexture | null = null;
  private backdrop: Backdrop = "studio";
  private built: Built | null = null;
  private kit: Kit | null = null;
  private own: { dispose: () => void }[] = [];
  private input: SceneInput | null = null;
  private buildKey = "";
  private openT = tw(0);
  private anatomyT = tw(0);
  private view: View = { x: -16, y: -34 };
  private zoom = 1;
  private w = 1;
  private h = 1;
  private frame = 0;
  private visible = true;
  private dirty = true;
  private firstFrame = false;
  private maxTex: number;
  private opts: SceneOptions;
  // path tracing
  private pt: PathTracerLike | null = null;
  private ptReady = false;
  private ptActive = false;
  private still = 0;
  private maxSamples = 400;
  private ptDispose: (() => void) | null = null;
  private exportWait: { samples: number; resolve: (c: HTMLCanvasElement) => void } | null = null;
  onFirstFrame?: () => void;
  afterRender?: (canvas: HTMLCanvasElement) => void;
  /** Path-tracing progress 0..1 (null when not path tracing). */
  onProgress?: (p: number | null) => void;
  /** Anatomy pin positions in CSS pixels, each frame the anatomy view is open. */
  onPins?: (pins: PinOnScreen[] | null) => void;

  constructor(canvas: HTMLCanvasElement, opts: SceneOptions = {}) {
    this.canvas = canvas;
    this.opts = opts;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance", preserveDrawingBuffer: false });
    const r = this.renderer;
    r.setClearColor(0x000000, 0);
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.NeutralToneMapping;
    r.toneMappingExposure = 1.12;
    r.shadowMap.enabled = false;
    const hi = opts.quality === "high";
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, hi ? (opts.photoreal ? 1.5 : 2) : 1.75));
    this.maxTex = Math.min(r.capabilities.maxTextureSize, hi ? 4096 : 2048);
    this.equirect = studioEquirect(hi ? 1024 : 512);
    this.env = studioEnvironment(r, this.equirect);
    this.scene.environment = this.env;
    this.scene.environmentIntensity = 0.95;
    this.scene.add(this.turn, this.shadow.plane);
    if (opts.stage === "sweep") this.makeSweep();
    if (opts.photoreal) this.loadPathTracer();
  }

  /* ---------------------------------------------------------------- studio sweep */

  private makeSweep() {
    // falloff baked into a small texture: brightest under the product, darker up the wall
    const geo = sweepGeometry();
    const col = geo.getAttribute("color") as THREE.BufferAttribute;
    const cols = 25;
    const rows = col.count / cols;
    const data = new Uint8Array(cols * rows * 4);
    for (let i = 0; i < col.count; i++) {
      const v = Math.round(col.getX(i) * 255);
      data.set([v, v, v, 255], i * 4);
    }
    geo.deleteAttribute("color");
    const map = new THREE.DataTexture(data, cols, rows, THREE.RGBAFormat);
    map.colorSpace = THREE.SRGBColorSpace;
    map.magFilter = THREE.LinearFilter;
    map.minFilter = THREE.LinearFilter;
    map.needsUpdate = true;
    this.sweepMap = map;
    this.sweepMat = new THREE.MeshPhysicalMaterial({ roughness: 0.96, map, emissiveMap: map });
    this.sweep = new THREE.Mesh(geo, this.sweepMat);
    this.sweep.position.y = -0.0005;
    this.scene.add(this.sweep);
    this.setBackdrop("studio");
  }

  /** Backdrop of the studio sweep. */
  setBackdrop(b: Backdrop) {
    this.backdrop = b;
    if (!this.sweepMat) return;
    const look = backdropLook(b, this.input ? rolesOf(this.input.d).ground : "#e4e4e0");
    this.sweepMat.color.copy(look.color);
    this.sweepMat.emissive.copy(look.color).multiplyScalar(look.glow);
    this.scene.background = look.color.clone().multiplyScalar(b === "dark" ? 0.6 : 0.8);
    this.sweepMat.needsUpdate = true;
    this.invalidate();
  }

  /* ---------------------------------------------------------------- path tracing */

  private loadPathTracer() {
    Promise.all([import("three-gpu-pathtracer"), import("three/examples/jsm/postprocessing/Pass.js")])
      .then(([{ WebGLPathTracer, PhysicalCamera, DenoiseMaterial }, { FullScreenQuad }]) => {
        const cam = new PhysicalCamera(this.camera.fov, this.camera.aspect, 0.01, 100);
        cam.position.copy(this.camera.position);
        cam.quaternion.copy(this.camera.quaternion);
        cam.apertureBlades = 7;
        this.camera = cam;
        const pt = new WebGLPathTracer(this.renderer) as unknown as PathTracerLike;
        pt.tiles.set(2, 2);
        pt.minSamples = 4;
        pt.fadeDuration = 700;
        pt.renderDelay = 0;
        pt.bounces = 6;
        pt.filterGlossyFactor = 0.4;
        pt.textureSize.set(1536, 1536);
        pt.rasterizeScene = true;
        // Edge-preserving denoise while samples accumulate, easing off as the image converges.
        const denoise = new DenoiseMaterial({ transparent: true, blending: THREE.NormalBlending, premultipliedAlpha: this.renderer.getContextAttributes()?.premultipliedAlpha ?? true }) as THREE.ShaderMaterial & { map: THREE.Texture | null; opacity: number; sigma: number; threshold: number; kSigma: number };
        const quad = new FullScreenQuad(denoise);
        (pt as unknown as { renderToCanvasCallback: (t: THREE.WebGLRenderTarget, r: THREE.WebGLRenderer, q: { material: { opacity: number } }) => void }).renderToCanvasCallback = (target, renderer, q) => {
          const k = Math.max(0, 1 - pt.samples / (this.maxSamples * 0.8));
          denoise.map = target.texture;
          denoise.opacity = q.material.opacity;
          denoise.sigma = 2 + 3 * k;
          denoise.threshold = 0.01 + 0.16 * k;
          denoise.kSigma = 1;
          const auto = renderer.autoClear;
          renderer.autoClear = false;
          quad.render(renderer);
          renderer.autoClear = auto;
        };
        this.ptDispose = () => {
          quad.dispose();
          denoise.dispose();
        };
        // the path tracer uses the same equirect HDR the live renderer was prefiltered from
        this.pt = pt;
        this.ptReady = true;
        this.invalidate();
      })
      .catch(() => {
        this.pt = null;
      });
  }

  /** Something changed: drop back to the live renderer and wait for stillness again. */
  private invalidate() {
    this.ptActive = false;
    this.still = performance.now();
    this.dirty = true;
    this.onProgress?.(null);
    this.request();
  }

  private startPathTracing() {
    const pt = this.pt;
    if (!pt) return;
    // the path tracer sees the real floor; the contact-shadow plane and die lines stay out
    this.scene.remove(this.shadow.plane);
    this.built?.lines && (this.built.lines.visible = false);
    const env = this.scene.environment;
    this.scene.environment = this.equirect;
    pt.setScene(this.scene, this.camera);
    this.scene.environment = env;
    this.scene.add(this.shadow.plane);
    this.ptActive = true;
  }

  private canPathTrace(): boolean {
    if (!this.pt || !this.ptReady || !this.sweep) return false;
    const fs = this.built?.stages?.[0].v ?? 1;
    const above = -this.view.x > -1;
    return fs > 0.999 && above; // not for the flat net or views from under the floor
  }

  /* ---------------------------------------------------------------- input */

  /** Change product, structure, finish or open state. The first call snaps without animating. */
  update(input: SceneInput) {
    const prev = this.input;
    this.input = input;
    const key = [input.d.id, input.d.layout, input.d.palette.map((p) => p.hex).join(), input.d.mockup.headline, input.d.mockup.detail, input.brand, input.spec.form, input.spec.w, input.spec.h, input.spec.d, input.spec.finish].join("|");
    let changed = false;
    if (key !== this.buildKey) {
      this.buildKey = key;
      this.rebuild(input, !prev || prev.spec.form !== input.spec.form);
      if (this.backdrop === "brand") this.setBackdrop("brand");
      changed = true;
    }
    const now = performance.now();
    if (!prev || prev.spec.form !== input.spec.form) {
      const v = input.open ? 1 : 0;
      this.openT = tw(v);
      if (this.built?.stages) for (const s of this.built.stages) Object.assign(s, tw(1 - v));
      changed = true;
    } else if (prev.open !== input.open) {
      this.animateOpen(input.open, now);
      changed = true;
    }
    if (changed || !prev || prev.fit !== input.fit) this.invalidate();
  }

  /** Anatomy view on or off: the package comes apart into numbered parts. */
  setAnatomy(on: boolean) {
    aim(this.anatomyT, on ? 1 : 0, performance.now(), on ? 1500 : 900);
    if (!on) this.onPins?.(null);
    this.invalidate();
  }

  /** The numbered parts of the current package, for the parts list. */
  parts(): { n: number; label: Pair; detail: Pair }[] {
    return (this.built?.pins ?? []).map(({ n, label, detail }) => ({ n, label, detail }));
  }

  private animateOpen(open: boolean, now: number) {
    const b = this.built;
    if (b?.stages) {
      const [fs, fb, ffl, ftb] = b.stages;
      if (open) {
        aim(ftb, 0, now, 600, 0);
        aim(ffl, 0, now, 420, 450);
        aim(fb, 0, now, 600, 750);
        aim(fs, 0, now, 750, 1200);
      } else {
        aim(fs, 1, now, 750, 0);
        aim(fb, 1, now, 600, 550);
        aim(ffl, 1, now, 450, 1000);
        aim(ftb, 1, now, 650, 1250);
      }
    } else aim(this.openT, open ? 1 : 0, now, 1150);
  }

  private rebuild(input: SceneInput, fresh: boolean) {
    const keepStages = !fresh && this.built?.stages ? this.built.stages.map((s) => ({ ...s })) : null;
    if (this.built) this.turn.remove(this.built.root);
    this.disposeBuilt();
    const a: ArtInput = { d: input.d, brand: input.brand, finish: input.spec.finish };
    const metalPrint = input.spec.form === "tin";
    this.kit = makeKit(this.renderer, a, this.maxTex, metalPrint);
    const b =
      input.spec.form === "gift"
        ? buildGift(input.spec, this.kit)
        : input.spec.form === "tin"
          ? buildTin(input.spec, this.kit, a, this.maxTex, this.own)
          : buildCarton(input.spec, this.kit);
    if (keepStages && b.stages) b.stages.forEach((s, i) => Object.assign(s, keepStages[i]));
    this.built = b;
    this.turn.add(b.root);
  }

  private disposeBuilt() {
    if (this.built) {
      this.built.root.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
      });
      this.built.lines?.dispose();
    }
    this.kit?.dispose();
    this.own.forEach((x) => x.dispose());
    this.own = [];
    this.kit = null;
  }

  setView(v: View, zoom: number) {
    if (v.x === this.view.x && v.y === this.view.y && zoom === this.zoom) return;
    this.view = { x: v.x, y: v.y };
    this.zoom = zoom;
    this.invalidate();
  }

  /** Render again on the next frame (e.g. to refresh a snapshot). */
  refresh() {
    this.dirty = true;
    this.request();
  }

  setVisible(v: boolean) {
    this.visible = v;
    if (v) this.request();
  }

  resize(w: number, h: number) {
    this.w = Math.max(1, w);
    this.h = Math.max(1, h);
    this.renderer.setSize(this.w, this.h, false);
    this.camera.aspect = this.w / this.h;
    this.camera.updateProjectionMatrix();
    this.invalidate();
  }

  private request() {
    if (this.frame || typeof window === "undefined") return;
    this.frame = requestAnimationFrame(this.tick);
  }

  /* ---------------------------------------------------------------- frame */

  private tick = (now: number) => {
    this.frame = 0;
    if (!this.visible || !this.built || !this.input) return;
    let moving = false;
    if (this.built.stages) for (const s of this.built.stages) moving = step(s, now) || moving;
    moving = step(this.openT, now) || moving;
    moving = step(this.anatomyT, now) || moving;
    if (moving) this.still = now;

    // Still for a moment, in the studio: hand over to the path tracer and accumulate.
    if (!moving && this.canPathTrace() && now - this.still > 220) {
      if (!this.ptActive) {
        this.pose();
        this.startPathTracing();
      }
      const pt = this.pt!;
      if (pt.samples < this.maxSamples || this.exportWait) {
        pt.renderSample();
        this.emitPins();
        this.afterRender?.(this.canvas);
        this.onProgress?.(Math.min(1, pt.samples / this.maxSamples));
        if (this.exportWait && pt.samples >= this.exportWait.samples) {
          const copy = document.createElement("canvas");
          copy.width = this.canvas.width;
          copy.height = this.canvas.height;
          copy.getContext("2d")!.drawImage(this.canvas, 0, 0);
          const w = this.exportWait;
          this.exportWait = null;
          w.resolve(copy);
        }
        this.request();
      }
      this.dirty = false;
      return;
    }

    if (moving || this.dirty) {
      this.renderFrame();
      this.dirty = false;
    }
    if (moving || (this.canPathTrace() && !this.ptActive)) this.request();
  };

  /** Places the package and camera for the current state. Returns the contact-shadow strength. */
  private pose(): { shadowK: number; fr: { r: number; y: number }; phi: number } {
    const b = this.built!;
    const input = this.input!;
    const p = this.openT.v;
    const x = this.anatomyT.v;
    const shadowK = b.apply(p);
    b.explode(x);
    // a tin turns its label a little toward the camera at the resting angle
    this.turn.rotation.y = (this.view.y + (input.spec.form === "tin" ? 22 : 0)) * RAD;
    const fr = b.frame(p, x);
    const fill = Math.min(0.92, Math.max(0.22, input.fit / Math.min(this.w, this.h)));
    const vt = Math.tan((this.camera.fov * RAD) / 2);
    const ht = vt * this.camera.aspect;
    const dist = fr.r / (fill * Math.min(vt, ht)) / this.zoom;
    const phi = -this.view.x * RAD;
    const target = new THREE.Vector3(0, fr.y, 0);
    this.camera.position.set(0, fr.y + Math.sin(phi) * dist, Math.cos(phi) * dist);
    this.camera.up.set(0, Math.cos(phi), -Math.sin(phi));
    this.camera.lookAt(target);
    this.camera.near = Math.max(0.01, dist - fr.r * 4);
    this.camera.far = this.sweep ? dist + 60 : dist + fr.r * 6;
    const cam = this.camera as THREE.PerspectiveCamera & { focusDistance?: number; bokehSize?: number };
    if ("focusDistance" in cam) {
      // a product lens at a moderate aperture: the package sharp, the sweep softly out of focus
      cam.focusDistance = dist;
      cam.bokehSize = fr.r * 0.012 * this.zoom;
    }
    this.camera.updateProjectionMatrix();
    this.turn.updateMatrixWorld(true);
    return { shadowK, fr, phi };
  }

  private renderFrame() {
    const { shadowK, fr, phi } = this.pose();
    // contact shadow under the product, faded when seen from below or when the carton is flat
    const above = Math.sin(phi) > -0.02;
    const size = Math.max(2.4 * fr.r, 1.2);
    this.shadow.setSize(size * 2, fr.y * 2 + 0.5 + fr.r);
    this.shadow.plane.visible = above;
    // the floor itself must not occlude in the shadow's depth pass
    if (this.sweep) this.sweep.visible = false;
    this.shadow.update(this.renderer, this.scene, above ? 0.62 * shadowK : 0);
    if (this.sweep) this.sweep.visible = above;
    this.renderer.render(this.scene, this.camera);
    this.emitPins();
    this.afterRender?.(this.canvas);
    if (!this.firstFrame) {
      this.firstFrame = true;
      this.onFirstFrame?.();
    }
  }

  private emitPins() {
    if (!this.onPins || !this.built || this.anatomyT.v < 0.02) return;
    const v = new THREE.Vector3();
    const nrm = new THREE.Vector3();
    const toCam = new THREE.Vector3();
    const out: PinOnScreen[] = this.built.pins.map((p) => {
      p.obj.updateMatrixWorld(true);
      v.copy(p.at).applyMatrix4(p.obj.matrixWorld);
      let facing = true;
      if (p.normal) {
        nrm.copy(p.normal).transformDirection(p.obj.matrixWorld);
        toCam.copy(this.camera.position).sub(v).normalize();
        facing = nrm.dot(toCam) > 0.05;
      }
      v.project(this.camera);
      return { n: p.n, x: (v.x * 0.5 + 0.5) * this.w, y: (-v.y * 0.5 + 0.5) * this.h, visible: !p.hidden && facing && v.z < 1 };
    });
    this.onPins(out);
  }

  /* ---------------------------------------------------------------- export */

  /**
   * A still as PNG. In the studio with path tracing, waits for `samples` and returns the
   * path-traced frame at the current resolution; otherwise renders at `scale` × and composites
   * on `background`.
   */
  async exportImage(scale = 2, background: string | ((ctx: CanvasRenderingContext2D, w: number, h: number) => void) = "#ffffff", samples = 160): Promise<Blob> {
    if (this.canPathTrace()) {
      const frame = await new Promise<HTMLCanvasElement>((resolve) => {
        this.exportWait = { samples, resolve };
        this.request();
      });
      return new Promise((resolve, reject) => frame.toBlob((b) => (b ? resolve(b) : reject(new Error("export failed"))), "image/png"));
    }
    const pr = this.renderer.getPixelRatio();
    this.renderer.setPixelRatio(scale);
    this.renderer.setSize(this.w, this.h, false);
    this.renderFrame();
    const out = document.createElement("canvas");
    out.width = this.canvas.width;
    out.height = this.canvas.height;
    const ctx = out.getContext("2d")!;
    if (typeof background === "string") {
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, out.width, out.height);
    } else background(ctx, out.width, out.height);
    ctx.drawImage(this.canvas, 0, 0);
    this.renderer.setPixelRatio(pr);
    this.renderer.setSize(this.w, this.h, false);
    this.invalidate();
    return new Promise((resolve, reject) => out.toBlob((b) => (b ? resolve(b) : reject(new Error("export failed"))), "image/png"));
  }

  /** Samples accumulated so far (0 when not path tracing). */
  get samples(): number {
    return this.ptActive && this.pt ? this.pt.samples : 0;
  }

  dispose() {
    if (this.frame) cancelAnimationFrame(this.frame);
    this.disposeBuilt();
    this.shadow.dispose();
    this.env.dispose();
    this.equirect.dispose();
    this.sweep?.geometry.dispose();
    this.sweepMat?.dispose();
    this.sweepMap?.dispose();
    this.ptDispose?.();
    this.pt?.dispose?.();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }
}
