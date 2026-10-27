/**
 * The packs that are not folded on creases or wrapped round a body: the stand-up pouch (two
 * films stand up, meet and swell into the pillow the 3D model has), the blister card (a clear
 * sheet is thermoformed over the printed card, which then stands up to hang), and the
 * flow-wrap pack (a printed web wraps round into a tube, its ends crimp-sealed).
 */
import * as THREE from "three";
import { rolesOf, drawFace, type ArtInput } from "../../three/art";
import { smooth, surface, U } from "../../three/common";
import type { Kit } from "../../three/kit";
import { clamp, ease, seg } from "../symbiosis";
import type { Planes } from "./holo";
import type { Line3 } from "./net";

export type MorphBuild = {
  root: THREE.Group;
  lines: Line3[];
  box: { x0: number; x1: number; z0: number; z1: number };
  pose: (f: number) => void;
  materials: THREE.Material[];
  dispose: () => void;
};

const rectLines = (cx: number, cz: number, w: number, d: number, y: number): Line3[] => {
  const c = [
    [cx - w / 2, cz - d / 2],
    [cx + w / 2, cz - d / 2],
    [cx + w / 2, cz + d / 2],
    [cx - w / 2, cz + d / 2],
  ].map(([x, z]) => new THREE.Vector3(x, y, z));
  return c.map((a, i) => ({ a, b: c[(i + 1) % 4], kind: "cut" as const }));
};
const boxOf = (lines: Line3[]) => {
  const xs = lines.flatMap((l) => [l.a.x, l.b.x]);
  const zs = lines.flatMap((l) => [l.a.z, l.b.z]);
  return { x0: Math.min(...xs), x1: Math.max(...xs), z0: Math.min(...zs), z1: Math.max(...zs) };
};
const clip = <T extends THREE.Material>(m: T, planes: Planes): T => {
  m.clippingPlanes = [planes.wipe, planes.above];
  return m;
};

/* ================================================================ stand-up pouch */

/** Mirrors buildPouch (forms-round.ts) so the swollen films land exactly on the 3D model. */
export function morphPouch(w: number, h: number, d: number, k: Kit, planes: Planes, zMid: number): MorphBuild {
  const own: { dispose(): void }[] = [];
  const W = w * U;
  const H = h * U;
  const D = d * U;
  const seal = Math.min(7 * U, W * 0.06);
  const topSeal = Math.min(12 * U, H * 0.08);
  const W2 = W / 2 - seal;
  const Hn = H - topSeal;
  const thick = (u: number, v: number) => {
    const x = 2 * u - 1;
    const kx = 0.5 + 0.5 * smooth(0, 0.3, v);
    const e = Math.pow(Math.max(0, 1 - x * x), kx);
    const g = Math.pow(1 - smooth(0.12, 1, v), 0.85) * (1 + 0.07 * Math.sin(Math.PI * v));
    return (D / 2) * e * g;
  };
  const root = new THREE.Group();
  const mats: THREE.Material[] = [];
  const mk = (m: THREE.Material) => {
    const c = clip(m.clone(), planes);
    (c as THREE.MeshPhysicalMaterial).side = THREE.DoubleSide;
    own.push(c);
    mats.push(c);
    return c;
  };
  const frontM = mk(k.tex("front", w, h, "film"));
  const backM = mk(k.tex("back", w, h, "film"));
  const sealM = mk(k.plain("film"));
  // flat: front | gusset | back, side by side, bottoms toward the camera
  const gapX = 20 * U;
  const xs = [-(W + gapX) - 0, 0, W + gapX];
  const zBottom = zMid + H / 2;
  type Sheet = { mesh: THREE.Mesh; pos: THREE.BufferAttribute; uv: THREE.BufferAttribute; flat: THREE.Vector3; q: THREE.Quaternion; back: boolean; seals: THREE.Mesh[]; sealLocal: Float32Array[] };
  const sheets: Sheet[] = [];
  for (const [i, back] of [
    [0, false],
    [2, true],
  ] as [number, boolean][]) {
    const g = surface((u, v, o) => o.set((2 * u - 1) * W2, 0, -v * Hn), 64, 64, true);
    own.push(g);
    const mesh = new THREE.Mesh(g, back ? backM : frontM);
    mesh.castShadow = true;
    mesh.frustumCulled = false;
    root.add(mesh);
    // the seal margins move with their film: two sides and the top
    const seals: THREE.Mesh[] = [];
    const sealLocal: Float32Array[] = [];
    for (const [x0, x1, y0, y1] of [
      [-W / 2, -W2, 0, Hn],
      [W2, W / 2, 0, Hn],
      [-W / 2, W / 2, Hn, H],
    ]) {
      const sg = new THREE.PlaneGeometry(1, 1);
      own.push(sg);
      const sm = new THREE.Mesh(sg, sealM);
      sm.frustumCulled = false;
      root.add(sm);
      seals.push(sm);
      sealLocal.push(new Float32Array([x0, x1, y0, y1]));
    }
    const q = back ? new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, Math.PI, 0, "YXZ")) : new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0));
    sheets.push({ mesh, pos: g.getAttribute("position") as THREE.BufferAttribute, uv: g.getAttribute("uv") as THREE.BufferAttribute, flat: new THREE.Vector3(xs[i], 0.3 * U, zBottom), q, back, seals, sealLocal });
  }
  // gusset: a plain film, folded in half then opened flat as the pouch fills
  const gg = new THREE.PlaneGeometry(2 * W2, D);
  gg.rotateX(-Math.PI / 2);
  own.push(gg);
  const gusset = new THREE.Mesh(gg, sealM);
  root.add(gusset);
  const gFlat = new THREE.Vector3(xs[1], 0.3 * U, zMid);
  const lines = [...rectLines(xs[0], zMid, W, H, 0.6 * U), ...rectLines(xs[2], zMid, W, H, 0.6 * U), ...rectLines(xs[1], zMid, W, D, 0.6 * U)];
  lines.push({ a: new THREE.Vector3(xs[1] - W / 2, 0.6 * U, zMid), b: new THREE.Vector3(xs[1] + W / 2, 0.6 * U, zMid), kind: "crease" });

  const tmp = new THREE.Vector3();
  const E = new THREE.Vector3();
  const pose = (f: number) => {
    const stand = ease(seg(f, [0.05, 0.5]));
    const fill = ease(seg(f, [0.45, 0.95]));
    for (const s of sheets) {
      const q = new THREE.Quaternion().slerp(s.q, stand);
      const en = new THREE.Vector3(0, 1, 0).applyQuaternion(q);
      E.copy(s.flat).lerp(new THREE.Vector3(0, 0, (s.back ? -1 : 1) * 0.2 * U), stand);
      E.y += Math.sin(Math.PI * stand) * H * 0.25;
      for (let i = 0; i < s.pos.count; i++) {
        const u = s.uv.getX(i);
        const v = s.uv.getY(i);
        tmp.set((2 * u - 1) * W2, 0, -v * Hn).applyQuaternion(q).add(E).addScaledVector(en, thick(u, v) * fill);
        s.pos.setXYZ(i, tmp.x, tmp.y, tmp.z);
      }
      s.pos.needsUpdate = true;
      s.mesh.geometry.computeVertexNormals();
      s.seals.forEach((m, j) => {
        const [x0, x1, y0, y1] = s.sealLocal[j];
        m.quaternion.copy(q).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0)));
        m.scale.set(x1 - x0, y1 - y0, 1);
        m.position.set((x0 + x1) / 2, 0.05 * U, -(y0 + y1) / 2).applyQuaternion(q).add(E);
      });
    }
    gusset.position.copy(gFlat).lerp(new THREE.Vector3(0, 0.25 * U, 0), stand);
    gusset.scale.set(1, 1, Math.max(0.02, (1 - stand) + fill * 0.98));
  };
  pose(0);
  return { root, lines, box: boxOf(lines), pose, materials: mats, dispose: () => own.forEach((o) => o.dispose()) };
}

/* ================================================================ blister card */

/** Mirrors buildBlister (forms-more.ts): card, euro slot, a thermoformed dome. */
export function morphBlister(w: number, h: number, d: number, k: Kit, planes: Planes, zMid: number): MorphBuild {
  const own: { dispose(): void }[] = [];
  const W = w * U;
  const H = h * U;
  const D = d * U;
  const t = 0.6 * U;
  const root = new THREE.Group();
  const mats: THREE.Material[] = [];
  const outline = new THREE.Shape();
  const cr = 3 * U;
  outline.moveTo(-W / 2 + cr, 0);
  outline.lineTo(W / 2 - cr, 0);
  outline.quadraticCurveTo(W / 2, 0, W / 2, cr);
  outline.lineTo(W / 2, H - cr);
  outline.quadraticCurveTo(W / 2, H, W / 2 - cr, H);
  outline.lineTo(-W / 2 + cr, H);
  outline.quadraticCurveTo(-W / 2, H, -W / 2, H - cr);
  outline.lineTo(-W / 2, cr);
  outline.quadraticCurveTo(-W / 2, 0, -W / 2 + cr, 0);
  const slot = new THREE.Path();
  const sw = Math.min(14 * U, W * 0.2);
  const sh = 4.5 * U;
  const sy = H - 9 * U;
  slot.absarc(-sw / 2 + sh / 2, sy, sh / 2, Math.PI / 2, (Math.PI * 3) / 2, false);
  slot.lineTo(sw / 2 - sh / 2, sy - sh / 2);
  slot.absarc(sw / 2 - sh / 2, sy, sh / 2, -Math.PI / 2, Math.PI / 2, false);
  slot.lineTo(-sw / 2 + sh / 2, sy + sh / 2);
  outline.holes.push(slot);
  // the card stands in its own frame (x across, y up, front +z), laid flat to begin with
  const card = new THREE.Group();
  root.add(card);
  const fg = new THREE.ShapeGeometry(outline, 16);
  const pos = fg.attributes.position as THREE.BufferAttribute;
  const uv = fg.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) + W / 2) / W, pos.getY(i) / H);
  fg.translate(0, 0, t / 2 + 0.02 * U);
  own.push(fg);
  const frontM = clip(k.tex("front", w, h).clone(), planes);
  own.push(frontM);
  mats.push(frontM);
  const face = new THREE.Mesh(fg, frontM);
  face.receiveShadow = true;
  card.add(face);
  const eg = new THREE.ExtrudeGeometry(outline, { depth: t, bevelEnabled: false, curveSegments: 12 });
  eg.translate(0, 0, -t / 2);
  own.push(eg);
  const insideM = clip(k.inside.clone(), planes);
  const edgeM = clip(k.edge.clone(), planes);
  own.push(insideM, edgeM);
  mats.push(insideM, edgeM);
  const body = new THREE.Mesh(eg, [insideM, edgeM]);
  body.castShadow = true;
  card.add(body);
  // the dome: a clear sheet that is pulled into shape over the card
  const bw = W * 0.64;
  const bh = H * 0.5;
  const by = H * 0.38;
  const b = Math.min(D * 0.45, 6 * U);
  const sheetW = bw + 16 * U;
  const sheetH = bh + 16 * U;
  const dg = new THREE.PlaneGeometry(sheetW, sheetH, 64, 64);
  own.push(dg);
  // clear PET: mostly reflection, a little haze
  const pet = clip(new THREE.MeshPhysicalMaterial({ color: "#EEF6F9", roughness: 0.06, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.03, transparent: true, opacity: 0.26, depthWrite: false, side: THREE.DoubleSide, envMapIntensity: 1.6 }), planes);
  own.push(pet);
  mats.push(pet);
  const dome = new THREE.Mesh(dg, pet);
  dome.frustumCulled = false;
  card.add(dome);
  const dpos = dg.getAttribute("position") as THREE.BufferAttribute;
  const base = Float32Array.from(dpos.array as Float32Array);
  const height = (x: number, y: number) => {
    const dx = bw / 2 - Math.abs(x);
    const dy = bh / 2 - Math.abs(y);
    const m = Math.min(dx, dy);
    if (m <= 0) return 0;
    const r = Math.min(1, m / b);
    return D * Math.sqrt(1 - (1 - r) * (1 - r));
  };
  // laid flat: the card's bottom edge toward the camera, the clear sheet beside it
  const cardFlat = new THREE.Vector3(-(sheetW + 20 * U) / 2, 0, zMid + H / 2);
  const sheetStart = new THREE.Vector3(W / 2 + 20 * U + sheetW / 2, by, t / 2 + 0.4 * U);
  const sheetEnd = new THREE.Vector3(0, by, t / 2 + 0.15 * U);
  const qFlat = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
  const pose = (f: number) => {
    const over = ease(seg(f, [0.08, 0.35]));
    const form = ease(seg(f, [0.32, 0.62]));
    const stand = ease(seg(f, [0.6, 1]));
    card.quaternion.copy(qFlat).slerp(new THREE.Quaternion(), stand);
    card.position.copy(cardFlat).lerp(new THREE.Vector3(0, 0, 0), stand);
    card.position.y += Math.sin(Math.PI * stand) * H * 0.15 + (1 - stand) * (t / 2);
    dome.position.copy(sheetStart).lerp(sheetEnd, over);
    dome.position.z += Math.sin(Math.PI * over) * 12 * U;
    for (let i = 0; i < dpos.count; i++) {
      const x = base[i * 3];
      const y = base[i * 3 + 1];
      dpos.setXYZ(i, x, y, height(x, y) * form);
    }
    dpos.needsUpdate = true;
    dg.computeVertexNormals();
  };
  pose(0);
  card.updateMatrix();
  root.updateMatrixWorld(true);
  const toRoot = (x: number, y: number) => new THREE.Vector3(x, y, t / 2 + 0.8 * U).applyMatrix4(card.matrix);
  const lines: Line3[] = [];
  const ring = (pts: THREE.Vector3[]) => pts.forEach((p, i) => lines.push({ a: p, b: pts[(i + 1) % pts.length], kind: "cut" }));
  ring([toRoot(-W / 2, 0), toRoot(W / 2, 0), toRoot(W / 2, H), toRoot(-W / 2, H)]);
  ring([toRoot(sheetStart.x - sheetW / 2, by - sheetH / 2), toRoot(sheetStart.x + sheetW / 2, by - sheetH / 2), toRoot(sheetStart.x + sheetW / 2, by + sheetH / 2), toRoot(sheetStart.x - sheetW / 2, by + sheetH / 2)]);
  // the euro slot and the blister seal line
  const slotPts: THREE.Vector3[] = [];
  for (let k = 0; k <= 24; k++) {
    const a = (k / 24) * Math.PI * 2;
    slotPts.push(toRoot(Math.cos(a) * (sw / 2), sy + Math.sin(a) * (sh / 2)));
  }
  ring(slotPts);
  const seal = [toRoot(-bw / 2, by - bh / 2), toRoot(bw / 2, by - bh / 2), toRoot(bw / 2, by + bh / 2), toRoot(-bw / 2, by + bh / 2)];
  seal.forEach((p, i) => lines.push({ a: p, b: seal[(i + 1) % 4], kind: "crease" }));
  return { root, lines, box: boxOf(lines), pose, materials: mats, dispose: () => own.forEach((o) => o.dispose()) };
}

/* ================================================================ flow-wrap pillow pack */

/** A pillow pack of length `len`, width `wid` and filled thickness `th` (mm). */
export function buildPillow(len: number, wid: number, th: number, a: ArtInput, r: THREE.WebGLRenderer, planes: Planes, zMid: number): MorphBuild & { size: { w: number; h: number; d: number } } {
  const own: { dispose(): void }[] = [];
  const aE = wid / 2;
  const bE = th / 2;
  const perim = Math.PI * (3 * (aE + bE) - Math.sqrt((3 * aE + bE) * (aE + 3 * bE)));
  const fin = 9;
  const G = perim + 2 * fin;
  const crimp = 16;
  const taper = Math.min(26, len * 0.18);
  // the printed web: front art over the top, back art across the seam underneath
  const ppm = Math.min(6, 2048 / Math.max(len, G));
  const c = document.createElement("canvas");
  c.width = Math.round(len * ppm);
  c.height = Math.round(G * ppm);
  const g = c.getContext("2d")!;
  const roles = rolesOf(a.d);
  g.fillStyle = roles.ground;
  g.fillRect(0, 0, c.width, c.height);
  const bodyL = len - 2 * crimp - 8;
  const front = drawFace("front", bodyL, wid * 0.92, ppm, a).color;
  g.drawImage(front, (c.width - front.width) / 2, (c.height - front.height) / 2);
  const back = drawFace("back", bodyL, wid * 0.86, ppm, a).color;
  for (const y0 of [-back.height / 2, c.height - back.height / 2]) g.drawImage(back, (c.width - back.width) / 2, y0);
  // crimp jaws leave fine ridges across both ends
  g.strokeStyle = "rgba(0,0,0,0.16)";
  g.lineWidth = Math.max(1, ppm * 0.5);
  for (const x0 of [0, c.width - crimp * ppm])
    for (let x = x0 + ppm * 1.5; x < x0 + crimp * ppm; x += ppm * 2) {
      g.beginPath();
      g.moveTo(x, 0);
      g.lineTo(x, c.height);
      g.stroke();
    }
  const map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = Math.min(8, r.capabilities.getMaxAnisotropy());
  own.push(map);
  const mat = clip(new THREE.MeshPhysicalMaterial({ map, roughness: a.finish === "gloss" ? 0.22 : 0.5, clearcoat: a.finish === "gloss" ? 1 : 0.3, clearcoatRoughness: 0.08, side: THREE.DoubleSide }), planes);
  own.push(mat);
  const NU = 128;
  const NV = 64;
  const geo = new THREE.PlaneGeometry(1, 1, NV, NU);
  own.push(geo);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  const root = new THREE.Group();
  root.add(mesh);
  const pos = geo.getAttribute("position") as THREE.BufferAttribute;
  const uvA = geo.getAttribute("uv") as THREE.BufferAttribute;
  const zMidMm = zMid / U;
  const lines = rectLines(0, zMid, len * U, G * U, 0.3 * U);
  for (const x of [-len / 2 + crimp, len / 2 - crimp]) lines.push({ a: new THREE.Vector3(x * U, 0.3 * U, zMid - (G * U) / 2), b: new THREE.Vector3(x * U, 0.3 * U, zMid + (G * U) / 2), kind: "crease" });
  const Rc = perim / (2 * Math.PI);
  const lift = 0.8; // the folded fin under the pack
  const n = 2.6;
  const sp = (x: number) => Math.sign(x) * Math.pow(Math.abs(x), 2 / n);
  const half = perim / 2;
  const pose = (f: number) => {
    const wrapP = ease(seg(f, [0.08, 0.58]));
    const shape = ease(seg(f, [0.45, 0.75]));
    const sealP = ease(seg(f, [0.68, 0.95]));
    const kappa = (wrapP * 2 * Math.PI) / perim;
    const yTop = 0.3 + (2 * Rc + lift - 0.3) * wrapP;
    const zOff = zMidMm * (1 - wrapP);
    // the web rolled round the length axis, its middle line on top (a lap seal underneath)
    const tube = (s: number): [number, number] => {
      const sb = Math.max(-half, Math.min(half, s));
      let ty: number;
      let tz: number;
      let dy = 0;
      let dz = 1;
      if (kappa < 1e-9) {
        ty = yTop;
        tz = sb;
      } else {
        const ph = sb * kappa;
        ty = yTop - (1 - Math.cos(ph)) / kappa;
        tz = Math.sin(ph) / kappa;
        dy = -Math.sin(ph);
        dz = Math.cos(ph);
      }
      const o = s - sb;
      return [Math.max(0.3, ty + dy * o), tz + dz * o];
    };
    for (let i = 0; i < pos.count; i++) {
      const v = uvA.getX(i);
      const uu = 1 - uvA.getY(i);
      const x = (v - 0.5) * len;
      const sArc = (uu - 0.5) * G;
      let [Y, Z] = tube(sArc);
      Z += zOff;
      if (shape > 0) {
        // the filled section, flattening into the crimp seals at the ends
        const ex = len / 2 - Math.abs(x);
        const puff = 1 - sealP * (1 - smooth(crimp, crimp + taper, ex));
        const a2 = aE * puff + (perim / 4) * (1 - puff);
        const b2 = bE * puff;
        const sb = Math.max(-half, Math.min(half, sArc));
        const ph = (2 * Math.PI * sb) / perim;
        let py = lift + bE + b2 * sp(Math.cos(ph));
        let pz = a2 * sp(Math.sin(ph));
        const o = sArc - sb;
        if (o !== 0) {
          // the overlap lies flat under the pack, one ply over the other
          py = lift + bE - b2 - (o > 0 ? 0.3 : 0.55);
          pz = -o;
        }
        Y = Y * (1 - shape) + py * shape;
        Z = Z * (1 - shape) + pz * shape;
      }
      let X = x;
      // the crimp jaws leave a serrated cut at both ends
      if (sealP > 0 && (v < 1e-4 || v > 1 - 1e-4)) {
        const tri = Math.abs(((sArc / 2.5) % 2 + 2) % 2 - 1) - 0.5;
        X -= Math.sign(x) * 2.2 * tri * sealP;
      }
      pos.setXYZ(i, X * U, Y * U, Z * U);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
  };
  pose(0);
  return { root, lines, box: boxOf(lines), pose, materials: [mat], dispose: () => own.forEach((o) => o.dispose()), size: { w: len, h: th, d: wid } };
}

export { clamp };
