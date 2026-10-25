/**
 * Per-face lighting for the CSS 3D packages. Each face carries its outward normal in
 * `data-n="x,y,z"` (CSS axes: x right, y down, z toward the viewer). After the package is
 * rotated, we light each face from a soft key light at the upper left and write three custom
 * properties the stylesheet uses:
 *   --shade  darkening, 0..~0.4
 *   --spec   specular strength for glossy finishes, 0..1
 *   --gl     where the sheen band sits across the face, in percent
 */
import type { Angle } from "./orbit";

type V3 = [number, number, number];

const norm = (v: V3): V3 => {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
};
const LIGHT: V3 = norm([-0.5, -0.75, 0.95]);
const VIEW: V3 = [0, 0, 1];
const RAD = Math.PI / 180;

/** Applies CSS `rotateX(ax) rotateY(ay)` to a direction vector. */
export function rotate(n: V3, a: Angle): V3 {
  const b = a.y * RAD;
  const c = a.x * RAD;
  const x1 = Math.cos(b) * n[0] + Math.sin(b) * n[2];
  const z1 = -Math.sin(b) * n[0] + Math.cos(b) * n[2];
  const y1 = n[1];
  return [x1, Math.cos(c) * y1 - Math.sin(c) * z1, Math.sin(c) * y1 + Math.cos(c) * z1];
}

export function lightFor(n: V3, a: Angle): { shade: number; spec: number; gl: number } {
  const r = rotate(n, a);
  const ndl = r[0] * LIGHT[0] + r[1] * LIGHT[1] + r[2] * LIGHT[2];
  const diffuse = Math.max(0, ndl);
  const shade = 0.34 * Math.pow(1 - diffuse, 1.5);
  const refl: V3 = [2 * ndl * r[0] - LIGHT[0], 2 * ndl * r[1] - LIGHT[1], 2 * ndl * r[2] - LIGHT[2]];
  const spec = Math.pow(Math.max(0, refl[0] * VIEW[0] + refl[1] * VIEW[1] + refl[2] * VIEW[2]), 18);
  const gl = 50 - r[0] * 90 + r[1] * 30;
  return { shade, spec, gl };
}

const cache = new WeakMap<Element, V3>();

function normalOf(el: HTMLElement): V3 | null {
  let n = cache.get(el);
  if (n) return n;
  const parts = (el.dataset.n || "").split(",").map(Number);
  if (parts.length !== 3 || parts.some((p) => !Number.isFinite(p))) return null;
  n = norm(parts as V3);
  cache.set(el, n);
  return n;
}

/** Writes lighting variables onto every face with a normal. */
export function lightFaces(faces: Iterable<HTMLElement>, a: Angle) {
  for (const el of faces) {
    const n = normalOf(el);
    if (!n) continue;
    const { shade, spec, gl } = lightFor(n, a);
    el.style.setProperty("--shade", shade.toFixed(3));
    el.style.setProperty("--spec", spec.toFixed(3));
    el.style.setProperty("--gl", gl.toFixed(1));
  }
}
