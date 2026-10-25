/**
 * The photo studio both renderers share.
 *
 * Lighting is one equirectangular HDR image computed from real light shapes: a large key
 * softbox at the upper left, two strip lights for rims, an overhead panel and a soft front
 * fill, in a dim room. The live renderer prefilters it (PMREM); the path tracer
 * importance-samples the same pixels, so switching between them changes quality, not light.
 *
 * The product stands on a seamless paper sweep (floor curving up into a back wall), as in a
 * product photographer's cove, with the gentle falloff real lights give.
 */
import * as THREE from "three";

type Panel = { c: THREE.Vector3; w: number; h: number; i: number; warm?: number };

const PANELS: Panel[] = [
  { c: new THREE.Vector3(-5.5, 5, 4.5), w: 5, h: 3.6, i: 7, warm: 1 }, // key softbox
  { c: new THREE.Vector3(6.5, 2.5, -3.5), w: 1, h: 7, i: 9 }, // right strip (rim)
  { c: new THREE.Vector3(-6.5, 2.5, -4), w: 1, h: 7, i: 6 }, // left strip (rim)
  { c: new THREE.Vector3(0, 9.5, 0), w: 8, h: 4, i: 2.2 }, // overhead
  { c: new THREE.Vector3(2, 1.8, 8), w: 7, h: 3, i: 2.0 }, // front fill
];

const smooth = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

/** Equirectangular float image of the studio (HDR: softboxes are far brighter than 1). */
export function studioEquirect(width = 1024): THREE.DataTexture {
  const W = width;
  const H = width / 2;
  const data = new Float32Array(W * H * 4);
  const origin = new THREE.Vector3(0, 0.6, 0);
  const up = new THREE.Vector3(0, 1, 0);
  const frames = PANELS.map((p) => {
    const n = origin.clone().sub(p.c).normalize();
    const u = new THREE.Vector3().crossVectors(Math.abs(n.y) > 0.95 ? new THREE.Vector3(1, 0, 0) : up, n).normalize();
    const v = new THREE.Vector3().crossVectors(n, u);
    return { ...p, n, u, v, co: p.c.clone().sub(origin) };
  });
  const d = new THREE.Vector3();
  const local = new THREE.Vector3();
  for (let j = 0; j < H; j++) {
    const lat = ((j + 0.5) / H - 0.5) * Math.PI;
    const cl = Math.cos(lat);
    const sy = Math.sin(lat);
    for (let i = 0; i < W; i++) {
      const phi = ((i + 0.5) / W - 0.5) * Math.PI * 2;
      d.set(Math.cos(phi) * cl, sy, Math.sin(phi) * cl);
      // the room: a lighter floor and a dim ceiling
      let r = sy < 0 ? 0.42 - 0.12 * smooth(-0.15, 0, sy) : 0.3 - 0.08 * smooth(0.2, 0.9, sy);
      let g = r;
      let b = r * 1.03;
      for (const p of frames) {
        const den = d.dot(p.n);
        if (den >= -1e-4) continue; // the panel faces the origin; rays must hit its front
        const t = p.co.dot(p.n) / den;
        if (t <= 0) continue;
        local.copy(d).multiplyScalar(t).sub(p.co);
        const a = Math.abs(local.dot(p.u)) / (p.w / 2);
        const c = Math.abs(local.dot(p.v)) / (p.h / 2);
        if (a >= 1 || c >= 1) continue;
        // diffuser: brighter centre, soft edges
        const k = p.i * (1 - 0.3 * (a * a + c * c) / 2) * (1 - smooth(0.92, 1, a)) * (1 - smooth(0.92, 1, c));
        const warm = p.warm ?? 0;
        r += k;
        g += k * (1 - warm * 0.03);
        b += k * (1 - warm * 0.08);
      }
      const o = (j * W + i) * 4;
      data[o] = r;
      data[o + 1] = g;
      data[o + 2] = b;
      data[o + 3] = 1;
    }
  }
  const tex = new THREE.DataTexture(data, W, H, THREE.RGBAFormat, THREE.FloatType);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.LinearSRGBColorSpace;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}

/**
 * A paper sweep: floor (y = 0) running back, curving up into a wall. Vertex colors carry the
 * falloff a real sweep shows away from the lights.
 */
export function sweepGeometry(): THREE.BufferGeometry {
  const front = 22;
  const back = 5;
  const radius = 5;
  const height = 14;
  const half = 24;
  const prof: [number, number][] = [];
  for (let z = front; z > -back; z -= 1) prof.push([z, 0]);
  for (let k = 0; k <= 24; k++) {
    const a = (k / 24) * (Math.PI / 2);
    prof.push([-back - Math.sin(a) * radius, radius - Math.cos(a) * radius]);
  }
  prof.push([-back - radius, height]);
  const cols = 24;
  const pos: number[] = [];
  const col: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  for (let r = 0; r < prof.length; r++) {
    const [z, y] = prof[r];
    for (let c = 0; c <= cols; c++) {
      const x = -half + (2 * half * c) / cols;
      pos.push(x, y, z);
      // brightest under the product, falling off toward the edges and up the wall
      const dist = Math.hypot(x * 0.55, z + 0.5, y * 0.9);
      const f = 1 - 0.32 * smooth(1.5, 16, dist);
      col.push(f, f, f);
      uv.push(c / cols, r / (prof.length - 1));
    }
  }
  for (let r = 0; r < prof.length - 1; r++)
    for (let c = 0; c < cols; c++) {
      const a = r * (cols + 1) + c;
      const b = a + cols + 1;
      idx.push(a, a + 1, b, a + 1, b + 1, b);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

export type Backdrop = "studio" | "white" | "brand" | "dark";

/** Sweep paper color and how much it glows (a white seamless is lit to near white). */
export function backdropLook(b: Backdrop, brandHex: string): { color: THREE.Color; glow: number } {
  if (b === "white") return { color: new THREE.Color("#ffffff"), glow: 0.55 };
  if (b === "dark") return { color: new THREE.Color("#2a2a2a"), glow: 0 };
  if (b === "brand") return { color: new THREE.Color(brandHex), glow: 0.08 };
  return { color: new THREE.Color("#e4e4e0"), glow: 0.12 };
}
