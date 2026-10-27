/**
 * Labels, sleeves and printed blanks that wrap round a body: each starts as a flat print on the
 * table, stands up against the body and bends round it from its centre out, ending exactly on
 * the printed band the 3D model carries (tagged `userData.wrap` by the builders). Decals and
 * lid stickers (`userData.decal`) lift onto their place.
 */
import * as THREE from "three";
import { boxIn, U } from "../../three/common";
import { ease, seg } from "../symbiosis";
import type { Line3 } from "./net";
import type { Planes } from "./holo";

type Label = {
  mesh: THREE.Mesh;
  pos: THREE.BufferAttribute;
  s: Float32Array;
  t: Float32Array;
  r: number;
  L: number;
  Hh: number;
  axis: THREE.Vector3;
  thetaC: number;
  y0: number;
  flat: THREE.Vector3;
  at: [number, number];
};
type Decal = { mesh: THREE.Mesh; from: THREE.Vector3; to: THREE.Vector3; at: [number, number] };

export type WrapBuild = {
  root: THREE.Group;
  lines: Line3[];
  box: { x0: number; x1: number; z0: number; z1: number };
  pose: (f: number) => void;
  materials: THREE.Material[];
  dispose: () => void;
};

const Y = new THREE.Vector3(0, 1, 0);

/** Finds the printed bands and decals of `model` (item-local, units) and makes their flat prints. */
export function buildWraps(model: THREE.Object3D, planes: Planes, zMid: number): WrapBuild {
  const own: { dispose(): void }[] = [];
  const root = new THREE.Group();
  model.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(model.parent ? model.parent.matrixWorld : new THREE.Matrix4()).invert();
  const wraps: THREE.Mesh[] = [];
  const decals: THREE.Mesh[] = [];
  model.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    if (m.userData.wrap) wraps.push(m);
    if (m.userData.decal) decals.push(m);
  });
  // back labels first, then the rest from the bottom up
  const info = wraps.map((m) => {
    const rel = new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld);
    const dir = new THREE.Vector3(0, 0, 1).transformDirection(rel);
    const o = new THREE.Vector3().setFromMatrixPosition(rel);
    const bx = boxIn(m, model.parent ?? model);
    return { m, thetaC: Math.atan2(dir.x, dir.z), axis: new THREE.Vector3(o.x, 0, o.z), y0: bx.min.y, y1: bx.max.y, r: m.userData.wrap.r as number, arc: m.userData.wrap.arc as number };
  });
  info.sort((a, b) => Math.abs(b.thetaC) - Math.abs(a.thetaC) || a.y0 - b.y0);
  const gap = 12 * U;
  const widths = info.map((x) => x.r * x.arc);
  const decalW = decals.map((d) => 2 * (d.userData.decal.r as number));
  const all = [...widths, ...decalW];
  const totalW = all.reduce((a, b) => a + b, 0) + gap * (all.length - 1);
  let cx = -totalW / 2;
  const labels: Label[] = [];
  const mats: THREE.Material[] = [];
  const lines: Line3[] = [];
  const n = info.length;
  info.forEach((x, i) => {
    const L = x.r * x.arc;
    const Hh = x.y1 - x.y0;
    const seg_ = Math.max(24, Math.round((96 * x.arc) / (Math.PI * 2)));
    const g = new THREE.PlaneGeometry(L, Hh, seg_, 1);
    own.push(g);
    const src = x.m.material as THREE.MeshPhysicalMaterial;
    const mat = src.clone();
    mat.side = THREE.DoubleSide;
    mat.clippingPlanes = [planes.wipe, planes.above];
    own.push(mat);
    mats.push(mat);
    const mesh = new THREE.Mesh(g, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    root.add(mesh);
    const pos = g.getAttribute("position") as THREE.BufferAttribute;
    const s = new Float32Array(pos.count);
    const t = new Float32Array(pos.count);
    for (let k = 0; k < pos.count; k++) {
      s[k] = pos.getX(k);
      t[k] = pos.getY(k); // −Hh/2 … Hh/2
    }
    const flat = new THREE.Vector3(cx + L / 2, 0.4 * U, zMid);
    cx += L + gap;
    const a = 0.08 + (i / Math.max(1, n)) * 0.42;
    labels.push({ mesh, pos, s, t, r: x.r, L, Hh, axis: x.axis, thetaC: x.thetaC, y0: x.y0, flat, at: [a, Math.min(1, a + 0.55)] });
    const c = [
      [-L / 2, -Hh / 2],
      [L / 2, -Hh / 2],
      [L / 2, Hh / 2],
      [-L / 2, Hh / 2],
    ].map(([px, pz]) => new THREE.Vector3(flat.x + px, flat.y, flat.z + pz));
    for (let k = 0; k < 4; k++) lines.push({ a: c[k], b: c[(k + 1) % 4], kind: "cut" });
  });
  const decalList: Decal[] = decals.map((d, i) => {
    const r = d.userData.decal.r as number;
    const g = new THREE.CircleGeometry(r, 64);
    g.rotateX(-Math.PI / 2);
    own.push(g);
    const mat = (d.material as THREE.Material).clone();
    mat.clippingPlanes = [planes.wipe, planes.above];
    own.push(mat);
    mats.push(mat);
    const mesh = new THREE.Mesh(g, mat);
    mesh.castShadow = true;
    root.add(mesh);
    const from = new THREE.Vector3(cx + r, 0.4 * U, zMid);
    cx += 2 * r + gap;
    const rel = new THREE.Matrix4().multiplyMatrices(inv, d.matrixWorld);
    const to = new THREE.Vector3().setFromMatrixPosition(rel).add(new THREE.Vector3(0, 0.3 * U, 0));
    for (let k = 0; k < 48; k++) {
      const a0 = (k / 48) * Math.PI * 2;
      const a1 = ((k + 1) / 48) * Math.PI * 2;
      lines.push({ a: new THREE.Vector3(from.x + Math.cos(a0) * r, from.y, from.z + Math.sin(a0) * r), b: new THREE.Vector3(from.x + Math.cos(a1) * r, from.y, from.z + Math.sin(a1) * r), kind: "cut" });
    }
    // the lid sticker travels from the sheet to the lid: unhurried, it crosses half the frame
    return { mesh, from, to, at: [0.42 + i * 0.06, 0.96] as [number, number] };
  });

  const tmp = new THREE.Vector3();
  const pose = (f: number) => {
    for (const lb of labels) {
      const stand = ease(seg(f, [lb.at[0], lb.at[0] + (lb.at[1] - lb.at[0]) * 0.62]));
      const bend = ease(seg(f, [lb.at[0] + (lb.at[1] - lb.at[0]) * 0.38, lb.at[1]]));
      // where the label's frame is: polar round the body, from the flat spot to the tangent plane
      const rel0 = lb.flat.clone().sub(lb.axis);
      const a0 = Math.atan2(rel0.x, rel0.z);
      let da = lb.thetaC - a0;
      while (da > Math.PI) da -= Math.PI * 2;
      while (da < -Math.PI) da += Math.PI * 2;
      const ang = a0 + da * stand;
      const gapR = (1 - bend) * 6 * U;
      const rad = Math.hypot(rel0.x, rel0.z) * (1 - stand) + (lb.r + gapR) * stand;
      const yMid = lb.flat.y * (1 - stand) + (lb.y0 + lb.Hh / 2) * stand + Math.sin(Math.PI * stand) * lb.Hh * 0.35;
      const O = new THREE.Vector3(lb.axis.x + Math.sin(ang) * rad, yMid, lb.axis.z + Math.cos(ang) * rad);
      // basis: flat (s → +x, normal → +y, t → −z) to standing (s → tangent, normal → outward, t → +y)
      const Nst = new THREE.Vector3(Math.sin(ang), 0, Math.cos(ang));
      const Tst = new THREE.Vector3(Math.cos(ang), 0, -Math.sin(ang));
      // (s, normal, −t) is right-handed in both poses: flat it is (x, y, z), standing (tangent, outward, −y)
      const qStand = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(Tst, Nst, Y.clone().negate()));
      const q = new THREE.Quaternion().slerp(qStand, stand);
      const es = new THREE.Vector3(1, 0, 0).applyQuaternion(q);
      const en = new THREE.Vector3(0, 1, 0).applyQuaternion(q);
      const et = new THREE.Vector3(0, 0, -1).applyQuaternion(q);
      const kappa = bend / lb.r;
      for (let k = 0; k < lb.pos.count; k++) {
        const s = lb.s[k];
        let ls = s;
        let ln = 0;
        if (kappa > 1e-6) {
          ls = Math.sin(kappa * s) / kappa;
          ln = -(1 - Math.cos(kappa * s)) / kappa;
        }
        tmp.copy(O).addScaledVector(es, ls).addScaledVector(en, ln).addScaledVector(et, lb.t[k]);
        lb.pos.setXYZ(k, tmp.x, tmp.y, tmp.z);
      }
      lb.pos.needsUpdate = true;
      lb.mesh.geometry.computeVertexNormals();
    }
    for (const d of decalList) {
      const e = ease(seg(f, d.at));
      d.mesh.position.copy(d.from).lerp(d.to, e);
      d.mesh.position.y += Math.sin(Math.PI * e) * 40 * U;
    }
  };
  const xs = lines.flatMap((l) => [l.a.x, l.b.x]);
  const zs = lines.flatMap((l) => [l.a.z, l.b.z]);
  // the plane geometry starts centred at the origin; pose(0) puts every vertex flat on the table
  pose(0);
  return { root, lines, box: { x0: Math.min(...xs), x1: Math.max(...xs), z0: Math.min(...zs), z1: Math.max(...zs) }, pose, materials: mats, dispose: () => own.forEach((o) => o.dispose()) };
}
