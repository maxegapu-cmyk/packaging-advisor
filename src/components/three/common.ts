/**
 * Shared pieces of the 3D engine: units, animation tweens, numbered parts, and geometry
 * helpers used by every package form.
 */
import * as THREE from "three";

export const U = 0.01; // scene units per millimetre (1 unit = 100 mm)
export const RAD = Math.PI / 180;

/* ================================================================ Animated values */

export type Tween = { v: number; from: number; to: number; t0: number; dur: number; delay: number };
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export function tw(v: number): Tween {
  return { v, from: v, to: v, t0: 0, dur: 1, delay: 0 };
}
export function aim(t: Tween, to: number, now: number, dur: number, delay = 0) {
  t.from = t.v;
  t.to = to;
  t.t0 = now;
  t.dur = dur;
  t.delay = delay;
}
/** Advances a tween; returns true while it is still moving. */
export function step(t: Tween, now: number): boolean {
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
export type Pair = { zh: string; en: string };

/** Overshooting spring ease, staggered per part: the way the anatomy skill releases assemblies. */
export function springAt(x: number, k: number, stagger = 0.13): number {
  const t = Math.min(1, Math.max(0, (x - k * stagger) / 0.62));
  const c1 = 1.25;
  const c3 = c1 + 1;
  return t === 0 ? 0 : 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}
export const mmOf = (units: number) => Math.round(units / U);

export type Built = {
  root: THREE.Group;
  /** Bounding radius and target height for camera framing, given open progress and anatomy
   * 0..1. Optional: without it the frame is measured from the geometry each frame. */
  frame?: (p: number, x: number) => { r: number; y: number };
  /** Anatomy: pull the package apart (0 = assembled, 1 = apart). Called after `apply`. */
  explode: (x: number) => void;
  pins: Pin[];
  /** Apply open progress (carton: unfold; gift / tin: lid off). Returns shadow opacity factor. */
  apply: (p: number) => number;
  /** Carton uses staged folding; others a single value. */
  staged?: boolean;
  stages?: Tween[];
  lines?: THREE.LineBasicMaterial;
  /** Extra turn (degrees) at the resting view, e.g. so a round label shows some side. */
  turn?: number;
  /** Where packed products sit (combinations): a part that moves with the opening, and the
   * height of its floor in that part's coordinates. Slot x/z are in the same coordinates. */
  slot?: { parent: THREE.Object3D; y: number };
};

/** A product's place in an insert, in the outer pack's slot coordinates. */
export type Slot = { x: number; z: number; w: number; d: number; kind: "rect" | "circle" | "stadium" };
/** What an outer pack holds: the slots and how deep its insert is. */
export type Holds = { slots: Slot[]; depth: number };

/**
 * A board panel as it really is: very slightly bowed outward (about 0.3–0.6 mm over a big
 * panel) and with its edges softened, by tilting the shading normals over the last
 * millimetre, so folds catch a thin highlight instead of reading as CG-sharp corners.
 */
export function boardPanel(pw: number, ph: number, t: number): THREE.BufferGeometry {
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
  const uv = g.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    let y = pos.getY(i);
    x = remap(x, pw / 2, sx);
    y = remap(y, ph / 2, sy);
    const bx = 1 - Math.pow((2 * x) / pw, 2);
    const by = 1 - Math.pow((2 * y) / ph, 2);
    pos.setXYZ(i, x, y, pos.getZ(i) + bulge * Math.max(0, bx) * Math.max(0, by));
    // the artwork follows the moved vertices: texture coordinates stay true to the face in
    // millimetres, exactly as on the flat print (BoxGeometry's own UVs are per grid step)
    const nx = nor.getX(i);
    const ny = nor.getY(i);
    const nz = nor.getZ(i);
    const u = (x + pw / 2) / pw;
    const v = (y + ph / 2) / ph;
    if (Math.abs(nz) > 0.5) uv.setXY(i, nz > 0 ? u : 1 - u, v);
    else if (Math.abs(nx) > 0.5) uv.setY(i, v);
    else if (Math.abs(ny) > 0.5) uv.setX(i, u);
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
  uv.needsUpdate = true;
  return g;
}

/**
 * One single-material mesh per geometry group, under a group. The path tracer assigns
 * materials per mesh, so multi-material meshes (a box with a printed face) are split here.
 */
export function splitMesh(geo: THREE.BufferGeometry, mats: THREE.Material[]): THREE.Group {
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

export function box(w: number, h: number, t: number, mats: THREE.Material[]) {
  return splitMesh(new THREE.BoxGeometry(w, h, t), mats);
}


/* ================================================================ Geometry helpers */

const _tmpBox = new THREE.Box3();
const _inv = new THREE.Matrix4();
const _rel = new THREE.Matrix4();
/**
 * Bounding box of the visible meshes under `obj`, in the coordinates of `ref` (an ancestor).
 * Rotation-safe: the engine turns the product, but this box stays in the product's own frame.
 */
export function boxIn(obj: THREE.Object3D, ref: THREE.Object3D, out = new THREE.Box3()): THREE.Box3 {
  out.makeEmpty();
  ref.updateWorldMatrix(true, false);
  obj.updateWorldMatrix(true, true);
  _inv.copy(ref.matrixWorld).invert();
  obj.traverseVisible((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || !m.geometry) return;
    if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
    _tmpBox.copy(m.geometry.boundingBox!).applyMatrix4(_rel.multiplyMatrices(_inv, o.matrixWorld));
    out.union(_tmpBox);
  });
  return out;
}

/**
 * Places `obj` at height `baseY`, then lifts it just enough that no part is below the floor
 * (y = 0 of its parent). Holds in any fold or animation pose.
 */
export function restOnFloor(obj: THREE.Object3D, baseY: number, clearance = 0.0003) {
  obj.position.y = baseY;
  if (!obj.parent) return;
  const low = boxIn(obj, obj.parent).min.y;
  if (Number.isFinite(low) && low < clearance) obj.position.y += clearance - low;
}

/** A lathe from [radius, height] pairs (scene units). */
export function lathe(pts: number[][], seg = 96): THREE.LatheGeometry {
  return new THREE.LatheGeometry(
    pts.map(([r, y]) => new THREE.Vector2(Math.max(0, r), y)),
    seg,
  );
}

/**
 * A parametric surface: `fn(u, v)` with u, v in 0..1 gives the point. UVs follow u, v.
 * `flip` reverses the winding (for a mirrored back face).
 */
export function surface(fn: (u: number, v: number, out: THREE.Vector3) => void, nu: number, nv: number, flip = false): THREE.BufferGeometry {
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  const p = new THREE.Vector3();
  for (let j = 0; j <= nv; j++)
    for (let i = 0; i <= nu; i++) {
      fn(i / nu, j / nv, p);
      pos.push(p.x, p.y, p.z);
      uv.push(i / nu, j / nv);
    }
  for (let j = 0; j < nv; j++)
    for (let i = 0; i < nu; i++) {
      const a = j * (nu + 1) + i;
      const b = a + nu + 1;
      if (flip) idx.push(a, a + 1, b, a + 1, b + 1, b);
      else idx.push(a, b, a + 1, a + 1, b, b + 1);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/**
 * A printed band around a round body, its artwork centred on the front (+z).
 * `arc` < 2π gives a front label that covers only part of the circumference.
 */
export function band(r: number, y0: number, y1: number, mat: THREE.Material, arc = Math.PI * 2, seg = 128): THREE.Mesh {
  const start = arc >= Math.PI * 2 - 1e-6 ? Math.PI : -arc / 2;
  const g = new THREE.CylinderGeometry(r, r, y1 - y0, Math.max(16, Math.round((seg * arc) / (Math.PI * 2))), 1, true, start, arc);
  const m = new THREE.Mesh(g, mat);
  m.position.y = (y0 + y1) / 2;
  // printed wraps are tagged so the homepage film can wrap the flat print onto them
  m.userData.wrap = { r, arc };
  return m;
}

function roundRect(p: THREE.Path, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  p.moveTo(x + rr, y);
  p.lineTo(x + w - rr, y);
  p.quadraticCurveTo(x + w, y, x + w, y + rr);
  p.lineTo(x + w, y + h - rr);
  p.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  p.lineTo(x + rr, y + h);
  p.quadraticCurveTo(x, y + h, x, y + h - rr);
  p.lineTo(x, y + rr);
  p.quadraticCurveTo(x, y, x + rr, y);
}

/**
 * A die-cut insert: a slab `w` × `d`, `h` high, with a cut-out for each product, so products
 * stand on the floor inside their holes and never pass through the insert.
 */
export function insertGeometry(w: number, d: number, h: number, slots: Slot[], clearance = 1.2 * U): THREE.BufferGeometry {
  const s = new THREE.Shape();
  roundRect(s, -w / 2, -d / 2, w, d, Math.min(3 * U, w * 0.05, d * 0.05));
  for (const sl of slots) {
    const p = new THREE.Path();
    const hw = sl.w / 2 + clearance;
    const hd = sl.d / 2 + clearance;
    // shape y is the negative of scene z after the rotation below
    if (sl.kind === "circle") p.absellipse(sl.x, -sl.z, hw, hd, 0, Math.PI * 2, false, 0);
    else roundRect(p, sl.x - hw, -sl.z - hd, 2 * hw, 2 * hd, sl.kind === "stadium" ? Math.min(hw, hd) : Math.min(3 * U, hw * 0.3, hd * 0.3));
    s.holes.push(p);
  }
  const g = new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: false, curveSegments: 32 });
  g.rotateX(-Math.PI / 2);
  return g;
}

/** Fine vertical ribs on a moulded cap (radius pushed out on alternate segments). */
export function ribbed(g: THREE.BufferGeometry, ribs: number, depth: number): THREE.BufferGeometry {
  const pos = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const r = Math.hypot(x, z);
    if (r < 1e-6) continue;
    const a = Math.atan2(z, x);
    const k = 1 + (depth / r) * (0.5 + 0.5 * Math.cos(a * ribs));
    pos.setXYZ(i, x * k, pos.getY(i), z * k);
  }
  pos.needsUpdate = true;
  g.computeVertexNormals();
  return g;
}

/** A thin-walled round shell (paper tube, lid): outer wall, inner wall and the two rims. */
export function tubeWall(rIn: number, rOut: number, y0: number, y1: number, outer: THREE.Material, inner: THREE.Material, rim: THREE.Material, seg = 128): THREE.Group {
  const g = new THREE.Group();
  const o = new THREE.Mesh(new THREE.CylinderGeometry(rOut, rOut, y1 - y0, seg, 1, true, Math.PI, Math.PI * 2), outer);
  const i = new THREE.Mesh(new THREE.CylinderGeometry(rIn, rIn, y1 - y0, seg, 1, true), inner);
  i.geometry.scale(-1, 1, 1); // face inward
  o.position.y = i.position.y = (y0 + y1) / 2;
  const top = new THREE.Mesh(new THREE.RingGeometry(rIn, rOut, seg), rim);
  top.rotation.x = -Math.PI / 2;
  top.position.y = y1;
  const bot = new THREE.Mesh(new THREE.RingGeometry(rIn, rOut, seg), rim);
  bot.rotation.x = Math.PI / 2;
  bot.position.y = y0;
  g.add(o, i, top, bot);
  return g;
}

/** A flat disc facing up (or down). */
export function disc(r: number, y: number, mat: THREE.Material, up = true, seg = 128): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.CircleGeometry(r, seg), mat);
  m.rotation.x = up ? -Math.PI / 2 : Math.PI / 2;
  m.position.y = y;
  return m;
}

export const smooth = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

/**
 * A lid coming off: first straight up by `clear` (so it slides off its neck without passing
 * through it), then across to its resting place `to`, turned by `rot`.
 */
export function liftOff(lid: THREE.Object3D, p: number, closedY: number, clear: number, to: THREE.Vector3, rot: THREE.Euler) {
  const a = smooth(0, 0.4, p);
  const b = smooth(0.4, 1, p);
  const arc = Math.sin(b * Math.PI) * clear * 0.6;
  lid.position.set(to.x * b, closedY + clear * a * (1 - b) + (to.y - closedY) * b + arc, to.z * b);
  lid.rotation.set(rot.x * b, rot.y * b, rot.z * b);
}

/** Shorthand for a numbered part. */
export function pin(n: number, zh: string, en: string, dzh: string, den: string, obj: THREE.Object3D, at: THREE.Vector3, normal?: THREE.Vector3, hidden = false): Pin {
  return { n, label: { zh, en }, detail: { zh: dzh, en: den }, obj, at, normal, hidden };
}
export const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
