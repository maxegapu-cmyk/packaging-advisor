/**
 * Song structures. The brocade box (宋锦盒): greyboard covered in Song brocade, a lid hinged at
 * the back, a printed title slip (题签) pasted on the lid, and a bone toggle (骨扣) at the front
 * that a silk loop from the lid hooks over. Inside, a silk lining and an insert for the products.
 * Everything at real size in millimetres (U per mm).
 */
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { PackSpec } from "@/lib/pack";
import { box, insertGeometry, mmOf, pin, RAD, smooth, springAt, U, V, type Built, type Holds } from "./common";
import type { InsertKind, Kit } from "./kit";

const mm = U;
type Six = [THREE.Material, THREE.Material, THREE.Material, THREE.Material, THREE.Material, THREE.Material];
const slab = (w: number, h: number, d: number, m: Six, x = 0, y = 0, z = 0) => {
  const g = box(w, h, d, m);
  g.position.set(x, y, z);
  return g;
};

/** The title slip's size on a lid this big (the print layout uses the same rule). */
export function slipSize(wMm: number, dMm: number): { w: number; h: number } {
  return { w: Math.round(Math.min(wMm * 0.18, 44)), h: Math.round(Math.min(Math.max(40, dMm * 0.66), dMm - 16)) };
}

export function buildBrocade(spec: PackSpec, k: Kit, holds?: Holds, insertKind: InsertKind = "velvet"): Built {
  const W = spec.w * U;
  const H = spec.h * U;
  const D = spec.d * U;
  const T = 2.2 * mm; // greyboard and brocade
  const lidH = Math.min(40 * mm, Math.max(14 * mm, H * 0.32));
  const hb = H - lidH;
  const wh = hb - T;
  const L = k.lining;
  const bro = (w: number, h: number) => k.brocade(w / U, h / U);
  const root = new THREE.Group();

  // base: a floor with the four walls standing on it (no two outer faces share a plane)
  const base = new THREE.Group();
  root.add(base);
  const bFront = bro(W, hb);
  const bSide = bro(D, hb);
  base.add(slab(W, T, D, [bSide, bSide, L, bro(W, D), bFront, bFront], 0, T / 2, 0));
  base.add(slab(W, wh, T, [L, L, L, L, bFront, L], 0, T + wh / 2, D / 2 - T / 2));
  base.add(slab(W, wh, T, [L, L, L, L, L, bFront], 0, T + wh / 2, -D / 2 + T / 2));
  base.add(slab(T, wh, D - 2 * T, [L, bSide, L, L, L, L], -W / 2 + T / 2, T + wh / 2, 0));
  base.add(slab(T, wh, D - 2 * T, [bSide, L, L, L, L, L], W / 2 - T / 2, T + wh / 2, 0));

  // the insert holding the products, or a silk-covered pad
  const slotG = new THREE.Group();
  slotG.position.y = T;
  base.add(slotG);
  const tw = W - 2 * T - 0.2 * mm;
  const td = D - 2 * T - 0.2 * mm;
  const trayH = holds ? holds.depth : Math.min(wh * 0.5, 24 * mm);
  const tray = holds ? new THREE.Mesh(insertGeometry(tw, td, trayH, holds.slots), k.insert(insertKind)) : new THREE.Mesh(new RoundedBoxGeometry(tw, trayH, td, 3, 2 * mm), k.velvet);
  tray.position.y = holds ? 0 : trayH / 2;
  slotG.add(tray);

  // the bone toggle on the front of the base
  const toggleY = hb - 14 * mm;
  const toggle = new THREE.Mesh(new RoundedBoxGeometry(18 * mm, 6 * mm, 4 * mm, 4, 2.4 * mm), k.bone);
  toggle.position.set(0, toggleY, D / 2 + 2 * mm);
  base.add(toggle);

  // lid, hinged along the top of the back wall
  const hinge = new THREE.Group();
  hinge.position.set(0, hb, -D / 2);
  root.add(hinge);
  const lid = new THREE.Group();
  lid.position.z = D / 2;
  hinge.add(lid);
  const sk = lidH - T;
  const lFront = bro(W, lidH);
  const lSide = bro(D, lidH);
  lid.add(slab(W, T, D, [lSide, lSide, bro(W, D), L, lFront, lFront], 0, lidH - T / 2, 0));
  lid.add(slab(W, sk, T, [L, L, L, L, lFront, L], 0, sk / 2, D / 2 - T / 2));
  lid.add(slab(W, sk, T, [L, L, L, L, L, lFront], 0, sk / 2, -D / 2 + T / 2));
  lid.add(slab(T, sk, D - 2 * T, [L, lSide, L, L, L, L], -W / 2 + T / 2, sk / 2, 0));
  lid.add(slab(T, sk, D - 2 * T, [lSide, L, L, L, L, L], W / 2 - T / 2, sk / 2, 0));

  // the title slip, on the left of the lid, as far from the left edge as from front and back
  const ss = slipSize(spec.w, spec.d);
  const sw = ss.w * mm;
  const sh = ss.h * mm;
  const margin = (D - sh) / 2;
  const P = k.plain();
  const slip = slab(sw, 0.3 * mm, sh, [P, P, k.tex("slip", sw / U, sh / U), P, P, P], -W / 2 + margin + sw / 2, lidH + 0.15 * mm, 0);
  lid.add(slip);

  // a silk loop from the lid's front edge, hooked over the toggle
  const loopPts = [V(-4, 6, 0.4), V(-4.6, -5, 2.6), V(-3.4, -16, 5.4), V(0, -19.8, 6), V(3.4, -16, 5.4), V(4.6, -5, 2.6), V(4, 6, 0.4)].map((p) => p.multiplyScalar(mm));
  const loop = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(loopPts), 48, 0.9 * mm, 8, false), k.rope);
  loop.position.set(0, 0, D / 2);
  lid.add(loop);

  const apply = (p: number) => {
    hinge.rotation.x = -105 * RAD * smooth(0, 1, p);
    return 1;
  };
  const explode = (x: number) => {
    if (x <= 0) return;
    hinge.position.y = hb + H * 0.8 * springAt(x, 0);
    slotG.position.y = T + H * 0.55 * springAt(x, 1);
  };
  const S = spec;
  const pins = [
    pin(1, "宋锦面", "Song brocade", `${S.w} × ${S.h} × ${S.d} mm，灰板外裱宋锦，龟背纹`, `${S.w} × ${S.h} × ${S.d} mm, greyboard covered in Song brocade, tortoise-shell pattern`, base, V(W * 0.3, hb * 0.5, D / 2), V(0, 0, 1)),
    pin(2, "题签", "Title slip", `${ss.w} × ${mmOf(sh)} mm，印刷纸签贴于盖面`, `${ss.w} × ${mmOf(sh)} mm, a printed paper slip pasted on the lid`, slip, V(0, 0.2 * mm, -sh * 0.3), V(0, 1, 0)),
    pin(3, "骨扣", "Bone clasp", "牛骨或仿玉扣，丝绳圈扣合", "a bone or jade-like toggle; the silk loop hooks over it", toggle, V(0, 0, 2 * mm), V(0, 0, 1)),
    pin(4, "内衬", "Lining", holds ? `高 ${mmOf(trayH)} mm，按产品开孔` : "丝绸内衬软垫", holds ? `${mmOf(trayH)} mm high, cut to each product` : "a silk-covered pad", tray, V(tw * 0.3, trayH / 2, td * 0.25), V(0, 1, 0), true),
  ];
  return { root, apply, explode, pins, slot: { parent: slotG, y: holds ? 0 : trayH } };
}
