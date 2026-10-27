/**
 * Four more formats from the packaging survey: the aluminium drink can, the blister card,
 * the aseptic brick and the pine crate with a sliding lid.
 * Units: 1 = 100 mm. Every form stands on y = 0, centred, its front toward +z.
 */
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { PackSpec } from "@/lib/pack";
import { rolesOf, type ArtInput } from "./art";
import { band, box, disc, insertGeometry, lathe, liftOff, mmOf, pin, RAD, ribbed, smooth, splitMesh, springAt, U, V, type Built, type Holds } from "./common";
import type { InsertKind, Kit } from "./kit";

const mm = U;

/** Box material order: +x, -x, +y, -y, +z, -z. */
type Six = [THREE.Material, THREE.Material, THREE.Material, THREE.Material, THREE.Material, THREE.Material];
const slab = (w: number, h: number, d: number, m: Six, x = 0, y = 0, z = 0) => {
  const g = box(w, h, d, m);
  g.position.set(x, y, z);
  return g;
};

/** A teardrop (the can's opening), narrow end toward the back, from z0 to z1, in the x-z plane. */
function teardrop(z0: number, z1: number, halfW: number): THREE.Shape {
  const s = new THREE.Shape();
  // shape y is the negative of scene z after rotating the shape to lie flat
  const n = 40;
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * Math.PI * 2;
    const k = 0.5 - 0.5 * Math.cos(t); // 0 at the back, 1 at the front
    const z = z0 + (z1 - z0) * k;
    const w = halfW * Math.sin(t) * (0.55 + 0.45 * k);
    if (i === 0) s.moveTo(w, -z);
    else s.lineTo(w, -z);
  }
  return s;
}

/* ================================================================ Drink can */

/** Two-piece aluminium can: domed base, printed body, necked shoulder, double seam, pull tab. */
export function buildCan(spec: PackSpec, k: Kit, a: ArtInput): Built {
  const R = (spec.w / 2) * U;
  const H = spec.h * U;
  const roles = rolesOf(a.d);
  const Rl = R * 0.82;
  const neckH = Math.min(14 * mm, H * 0.13);
  const root = new THREE.Group();
  const alu = k.bareMetal;
  const prof = [
    [0, 9.5 * mm],
    [R * 0.55, 6 * mm],
    [R * 0.72, 1.6 * mm],
    [R * 0.78, 0],
    [R * 0.85, 0.3 * mm],
    [R * 0.93, 2.6 * mm],
    [R, 9 * mm],
    [R, H - neckH],
    [R * 0.97, H - neckH * 0.62],
    [Rl + 0.9 * mm, H - 3.2 * mm],
    [Rl + 0.7 * mm, H - 2.4 * mm],
    [Rl + 0.75 * mm, H - 0.3 * mm],
    [Rl + 0.2 * mm, H],
    [Rl - 0.6 * mm, H - 0.2 * mm],
    [Rl - 1.2 * mm, H - 5.6 * mm],
    [Rl - 1.9 * mm, H - 5.8 * mm],
  ];
  const body = new THREE.Mesh(lathe(prof, 128), alu);
  root.add(body);
  const circ = 2 * Math.PI * R;
  const py0 = 10 * mm;
  const py1 = H - neckH - 1 * mm;
  const print = band(R + 0.05 * mm, py0, py1, k.tex("tinWrap", circ / U, (py1 - py0) / U, "metal"));
  root.add(print);
  // inside, seen through the opening
  const innerGeo = new THREE.CylinderGeometry(R - 0.4 * mm, R - 0.4 * mm, H - 20 * mm, 64, 1, true);
  innerGeo.scale(-1, 1, 1);
  const darkM = new THREE.MeshStandardMaterial({ color: "#1d1b18", roughness: 0.6 });
  const inner = new THREE.Mesh(innerGeo, darkM);
  inner.position.y = 10 * mm + (H - 20 * mm) / 2;
  root.add(inner, disc(R - 0.5 * mm, 12 * mm, darkM));

  // the end: a panel with the opening cut out, the scored flap in it, and the tab
  const panelY = H - 5.6 * mm;
  const pr = Rl - 1.9 * mm;
  const hz0 = Rl * 0.1;
  const hz1 = Rl * 0.72;
  const hw = Rl * 0.3;
  const panelShape = new THREE.Shape();
  panelShape.absarc(0, 0, pr, 0, Math.PI * 2, false);
  panelShape.holes.push(teardrop(hz0, hz1, hw));
  const endM = alu.clone();
  endM.roughness = 0.3;
  endM.color.set("#E3E5E4");
  const panelGeo = new THREE.ShapeGeometry(panelShape, 48);
  panelGeo.rotateX(-Math.PI / 2);
  const panel = new THREE.Mesh(panelGeo, endM);
  panel.position.y = panelY;
  root.add(panel);
  const flapPivot = new THREE.Group();
  flapPivot.position.set(0, panelY, hz0);
  root.add(flapPivot);
  const flapGeo = new THREE.ShapeGeometry(teardrop(hz0 + 0.25 * mm, hz1 - 0.25 * mm, hw - 0.25 * mm), 32);
  flapGeo.rotateX(-Math.PI / 2);
  flapGeo.translate(0, 0, -hz0);
  const flapM = endM.clone();
  flapM.side = THREE.DoubleSide;
  const flap = new THREE.Mesh(flapGeo, flapM);
  flapPivot.add(flap);
  const rivet = new THREE.Mesh(new THREE.CylinderGeometry(2.2 * mm, 2.4 * mm, 1.2 * mm, 24), endM);
  rivet.position.y = panelY + 0.6 * mm;
  root.add(rivet);
  // tab: nose over the opening, finger ring toward the back
  const tabS = new THREE.Shape();
  const tw_ = Rl * 0.22;
  const nose = Rl * 0.4;
  const tail = Rl * 0.62;
  tabS.moveTo(-tw_ * 0.6, -nose);
  tabS.quadraticCurveTo(0, -nose - tw_ * 0.5, tw_ * 0.6, -nose);
  tabS.lineTo(tw_, tail * 0.5);
  tabS.quadraticCurveTo(tw_ * 1.05, tail, 0, tail + tw_ * 0.15);
  tabS.quadraticCurveTo(-tw_ * 1.05, tail, -tw_, tail * 0.5);
  tabS.closePath();
  const ring = new THREE.Path();
  ring.absellipse(0, tail * 0.62, tw_ * 0.62, tail * 0.3, 0, Math.PI * 2, true, 0);
  tabS.holes.push(ring);
  const tabGeo = new THREE.ExtrudeGeometry(tabS, { depth: 0.6 * mm, bevelEnabled: true, bevelThickness: 0.15 * mm, bevelSize: 0.15 * mm, bevelSegments: 2, curveSegments: 24 });
  tabGeo.rotateX(-Math.PI / 2);
  const tabM = k.anodised(roles.key);
  const tab = new THREE.Group();
  tab.position.y = panelY + 1.2 * mm;
  tab.add(new THREE.Mesh(tabGeo, tabM));
  root.add(tab);

  const apply = (p: number) => {
    // lift the ring: the nose presses the scored flap into the can
    tab.rotation.x = 12 * RAD * smooth(0, 0.6, p);
    flapPivot.rotation.x = 75 * RAD * smooth(0.1, 0.7, p);
    return 1;
  };
  const tabRest = tab.position.y;
  const explode = (x: number) => {
    tab.position.y = tabRest + H * 0.28 * springAt(x, 0);
  };
  const S = spec;
  const pins = [
    pin(1, "拉环", "Pull tab", "铝制拉环，拉起后压开刻痕处", "an aluminium tab; lifted, it presses the scored opening in", tab, V(0, 0.6 * mm, -tail * 0.6), V(0, 1, 0)),
    pin(2, "罐盖", "Can end", `Ø${mmOf(2 * Rl)} mm，与罐身二重卷封`, `Ø${mmOf(2 * Rl)} mm, double-seamed onto the body`, panel, V(-pr * 0.55, 0, -pr * 0.3), V(0, 1, 0)),
    pin(3, "罐身印刷", "Printed body", `Ø${S.w} × ${S.h} mm，铝罐直接印刷，展开 ${mmOf(circ)} × ${mmOf(py1 - py0)} mm`, `Ø${S.w} × ${S.h} mm, printed straight onto the aluminium, unrolled ${mmOf(circ)} × ${mmOf(py1 - py0)} mm`, print, V(0, 0, R + 0.3 * mm), V(0, 0, 1)),
    pin(4, "缩颈", "Neck", "罐肩收窄，罐盖更小更省料", "the shoulder narrows so a smaller end can be used", body, V(0, H - neckH * 0.5, R * 0.95), V(0, 0, 1)),
    pin(5, "罐底", "Domed base", "向内拱起，承受内压", "domed inward to take the internal pressure", body, V(0, 2 * mm, R * 0.9), V(0, 0, 1), true),
  ];
  return { root, apply, explode, pins, turn: 14 };
}

/* ================================================================ Blister card */

/** A printed backing card with a euro hang slot and a clear PET blister holding the product. */
export function buildBlister(spec: PackSpec, k: Kit): Built {
  const W = spec.w * U;
  const H = spec.h * U;
  const D = spec.d * U;
  const t = 0.6 * mm;
  const root = new THREE.Group();
  const card = new THREE.Group();
  root.add(card);
  const outline = new THREE.Shape();
  const cr = 3 * mm;
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
  const sw = Math.min(14 * mm, W * 0.2);
  const sh = 4.5 * mm;
  const sy = H - 9 * mm;
  slot.absarc(-sw / 2 + sh / 2, sy, sh / 2, Math.PI / 2, (Math.PI * 3) / 2, false);
  slot.lineTo(sw / 2 - sh / 2, sy - sh / 2);
  slot.absarc(sw / 2 - sh / 2, sy, sh / 2, -Math.PI / 2, Math.PI / 2, false);
  slot.lineTo(-sw / 2 + sh / 2, sy + sh / 2);
  outline.holes.push(slot);
  // edges: the extruded card; faces: printed sheets just outside it
  const edgeGeo = new THREE.ExtrudeGeometry(outline, { depth: t, bevelEnabled: false, curveSegments: 16 });
  edgeGeo.translate(0, 0, -t / 2);
  const edges = splitMesh(edgeGeo, [k.inside, k.edge]);
  // the caps: the printed sheets below take their place
  const caps = edges.children[0] as THREE.Mesh;
  edges.remove(caps);
  caps.geometry.dispose();
  card.add(edges);
  const face = (front: boolean) => {
    const g = new THREE.ShapeGeometry(outline, 16);
    const pos = g.attributes.position as THREE.BufferAttribute;
    const uv = g.attributes.uv as THREE.BufferAttribute;
    // the back is the same sheet turned round: rotating it reverses left and right on its own,
    // so the print reads correctly from behind without also flipping u
    for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) + W / 2) / W, pos.getY(i) / H);
    if (!front) g.rotateY(Math.PI);
    g.translate(0, 0, front ? t / 2 + 0.02 * mm : -t / 2 - 0.02 * mm);
    return new THREE.Mesh(g, k.tex(front ? "front" : "back", spec.w, spec.h));
  };
  card.add(face(true), face(false));

  // blister: a rounded dome sealed to the front
  const bw = W * 0.64;
  const bh = H * 0.5;
  const by = H * 0.38;
  const b = Math.min(D * 0.45, 6 * mm);
  const r = 4 * mm;
  const bs = new THREE.Shape();
  const x0 = -bw / 2 + b;
  const y0 = by - bh / 2 + b;
  const ww = bw - 2 * b;
  const hh = bh - 2 * b;
  bs.moveTo(x0 + r, y0);
  bs.lineTo(x0 + ww - r, y0);
  bs.quadraticCurveTo(x0 + ww, y0, x0 + ww, y0 + r);
  bs.lineTo(x0 + ww, y0 + hh - r);
  bs.quadraticCurveTo(x0 + ww, y0 + hh, x0 + ww - r, y0 + hh);
  bs.lineTo(x0 + r, y0 + hh);
  bs.quadraticCurveTo(x0, y0 + hh, x0, y0 + hh - r);
  bs.lineTo(x0, y0 + r);
  bs.quadraticCurveTo(x0, y0, x0 + r, y0);
  const bubbleGeo = new THREE.ExtrudeGeometry(bs, { depth: Math.max(0.5 * mm, D - 2 * b), bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 8, curveSegments: 16 });
  bubbleGeo.translate(0, 0, t / 2 + 0.15 * mm + b);
  const pet = k.glass(0.3, "#F5F8F7");
  const bubble = new THREE.Mesh(bubbleGeo, pet);
  root.add(bubble);
  // the product inside, clear of the dome all round
  const inset = b * 0.6 + 2 * mm;
  const cw = bw - 2 * inset;
  const ch = bh - 2 * inset;
  const cd = Math.max(2 * mm, D - b * 0.6 - 2.5 * mm);
  const L = k.plain();
  const prodGeo = new RoundedBoxGeometry(cw, ch, cd, 3, Math.min(b * 0.9, cd * 0.45, cw * 0.2));
  const product = splitMesh(prodGeo, [L, L, L, L, k.tex("inner", cw / U, ch / U), L]);
  product.position.set(0, by, t / 2 + 0.4 * mm + cd / 2);
  root.add(product);

  const apply = () => 1;
  const bRest = bubble.position.z;
  const pRest = product.position.z;
  const explode = (x: number) => {
    bubble.position.z = bRest + D * 1.5 * springAt(x, 0);
    product.position.z = pRest + D * 0.75 * springAt(x, 1);
  };
  const S = spec;
  const pins = [
    pin(1, "泡罩", "Blister", `${mmOf(bw)} × ${mmOf(bh)} × ${S.d} mm，透明 PET 吸塑，热封在卡上`, `${mmOf(bw)} × ${mmOf(bh)} × ${S.d} mm, clear thermoformed PET, heat-sealed to the card`, bubble, V(bw * 0.3, by + bh * 0.3, D + t), V(0, 0, 1)),
    pin(2, "背卡", "Backing card", `${S.w} × ${S.h} mm，白卡印刷，背面涂热封胶`, `${S.w} × ${S.h} mm, printed board with heat-seal coating`, card, V(-W * 0.35, H * 0.82, t), V(0, 0, 1)),
    pin(3, "挂孔", "Hang slot", "欧式挂孔，挂在货架挂钩上", "a euro slot for the store peg", card, V(0, sy, t), V(0, 0, 1)),
    pin(4, "产品", "Product", "被泡罩固定，看得见摸不着", "held in place by the blister: visible, not touchable", product, V(cw * 0.2, ch * 0.2, cd / 2), V(0, 0, 1)),
  ];
  return { root, apply, explode, pins };
}

/* ================================================================ Aseptic brick */

/** Aseptic brick (board / PE / foil): printed body, top seal fin, folded ears, back seam, screw cap. */
export function buildAseptic(spec: PackSpec, k: Kit, a: ArtInput): Built {
  const W = spec.w * U;
  const H = spec.h * U;
  const D = spec.d * U;
  const roles = rolesOf(a.d);
  const fin = 0.8 * mm;
  const Hb = H - fin;
  const root = new THREE.Group();
  const f = (kind: Parameters<Kit["tex"]>[0], w: number, h: number) => k.tex(kind, w, h, "film");
  const plainF = k.plain("film");
  const bodyGeo = new RoundedBoxGeometry(W, Hb, D, 2, 1.6 * mm);
  // the top is formed from the two unprinted flaps of the web (see the print net), so it is plain
  const body = splitMesh(bodyGeo, [f("right", spec.d, spec.h), f("left", spec.d, spec.h), plainF, plainF, f("front", spec.w, spec.h), f("back", spec.w, spec.h)]);
  body.position.y = Hb / 2;
  root.add(body);
  // top seal fin, folded flat toward the back
  const finD = Math.min(8 * mm, D * 0.16);
  const finM = slab(W - 2 * mm, fin, finD, [plainF, plainF, plainF, plainF, plainF, plainF], 0, Hb + fin / 2, -D / 2 + finD / 2 + 1.5 * mm);
  root.add(finM);
  // ears folded down onto the narrow sides
  const ears: THREE.Group[] = [];
  for (const s of [-1, 1]) {
    const tri = new THREE.Shape();
    tri.moveTo(-D / 2 + 1 * mm, 0);
    tri.lineTo(D / 2 - 1 * mm, 0);
    // as deep as the web's gusset that forms it (half the depth)
    tri.lineTo(0, -(D / 2 - 0.5 * mm));
    tri.closePath();
    const g = new THREE.ExtrudeGeometry(tri, { depth: 0.7 * mm, bevelEnabled: false });
    // shape x → scene z, shape y → scene y, extrude → outward x
    g.rotateY(s > 0 ? Math.PI / 2 : -Math.PI / 2);
    const pivot = new THREE.Group();
    pivot.position.set(s * (W / 2 + 0.05 * mm), Hb - 0.6 * mm, 0);
    pivot.add(new THREE.Mesh(g, plainF));
    ears.push(pivot);
    root.add(pivot);
  }
  // longitudinal seal strip on the back
  root.add(slab(6 * mm, Hb - 4 * mm, 0.3 * mm, [plainF, plainF, plainF, plainF, plainF, plainF], W * 0.28, Hb / 2, -D / 2 - 0.15 * mm));

  // screw cap on a spout
  const cr = Math.min(13 * mm, D * 0.28, W * 0.18);
  const cx = -W * 0.2;
  const cz = D * 0.16;
  const capM = k.plastic(roles.key, 0.35);
  const spout = new THREE.Mesh(new THREE.CylinderGeometry(cr + 2.5 * mm, cr + 3 * mm, 2 * mm, 64), k.plastic("#F2F1EE", 0.4));
  spout.position.set(cx, Hb + 1 * mm, cz);
  root.add(spout);
  const hole = disc(cr - 3 * mm, Hb + 2.05 * mm, new THREE.MeshStandardMaterial({ color: "#2a2723", roughness: 0.7 }), true, 48);
  hole.position.x = cx;
  hole.position.z = cz;
  root.add(hole);
  const cap = new THREE.Group();
  const capH = Math.min(14 * mm, H * 0.08);
  const capMesh = new THREE.Mesh(ribbed(new THREE.CylinderGeometry(cr, cr, capH, 96, 2), 48, 0.3 * mm), capM);
  capMesh.position.y = capH / 2;
  cap.add(capMesh);
  const closedY = Hb + 2 * mm;
  cap.position.set(cx, closedY, cz);
  root.add(cap);

  const open = V(W / 2 + cr + 14 * mm, cr, D * 0.3);
  const apply = (p: number) => {
    liftOff(cap, p, closedY, capH, new THREE.Vector3(open.x, open.y, open.z), new THREE.Euler(90 * RAD, 0.3, 0));
    // liftOff moves relative to the origin; the cap starts off-centre
    cap.position.x += cx * (1 - smooth(0.4, 1, p));
    cap.position.z += cz * (1 - smooth(0.4, 1, p));
    cap.rotation.y -= Math.PI * 2 * smooth(0, 0.4, p);
    return 1;
  };
  const explode = (x: number) => {
    cap.position.y += H * 0.3 * springAt(x, 0);
    ears[0].rotation.z = -110 * RAD * springAt(x, 1);
    ears[1].rotation.z = 110 * RAD * springAt(x, 1);
  };
  const S = spec;
  const pins = [
    pin(1, "旋盖", "Screw cap", `Ø${mmOf(2 * cr)} mm，带防盗环`, `Ø${mmOf(2 * cr)} mm, with a tamper ring`, cap, V(0, capH, 0), V(0, 1, 0)),
    pin(2, "六层复合纸板", "Six-layer board", `${S.w} × ${S.h} × ${S.d} mm，PE / 纸板 / PE / 铝箔 / PE / PE，常温保存不用冷藏`, `${S.w} × ${S.h} × ${S.d} mm, PE / board / PE / foil / PE / PE, keeps without refrigeration`, body, V(-W * 0.25, 0, D / 2), V(0, 0, 1)),
    pin(3, "顶部封边", "Top seal", "横向热封后折平", "the transverse seal, folded flat", finM, V(W * 0.3, fin / 2, 0), V(0, 1, 0)),
    pin(4, "折耳", "Ears", "成型时多出的三角，折贴在两侧", "the triangles left by forming, folded onto the sides", ears[1], V(0.7 * mm, -D * 0.12, 0), V(1, 0, 0)),
  ];
  return { root, apply, explode, pins };
}

/* ================================================================ Pine crate */

/** Pine crate with 10 mm walls and a lid that slides out along grooves, brand engraved on top. */
export function buildWoodBox(spec: PackSpec, k: Kit, holds?: Holds, insertKind: InsertKind = "velvet"): Built {
  const W = spec.w * U;
  const H = spec.h * U;
  const D = spec.d * U;
  const T = 10 * mm;
  const Tb = 6 * mm;
  const lidT = 6 * mm;
  const recess = 3 * mm;
  const groove = 4 * mm;
  const root = new THREE.Group();
  const base = new THREE.Group();
  root.add(base);
  const wFront = k.wood(spec.w, spec.h);
  const wSide = k.wood(spec.d, spec.h);
  const wTop = k.wood(spec.w, 10);
  const wEnd = k.wood(10, spec.h);
  const lidBottom = H - recess - lidT;
  const Hf = lidBottom - 0.6 * mm;
  base.add(slab(W - 2 * T, Tb, D - 2 * T, [wEnd, wEnd, wFront, wFront, wEnd, wEnd], 0, Tb / 2, 0));
  for (const s of [-1, 1]) base.add(slab(T, H, D, [wSide, wSide, k.wood(spec.d, 10), wTop, wEnd, wEnd], s * (W / 2 - T / 2), H / 2, 0));
  base.add(slab(W - 2 * T, H, T, [wEnd, wEnd, wTop, wTop, wFront, wFront], 0, H / 2, -D / 2 + T / 2));
  base.add(slab(W - 2 * T, Hf, T, [wEnd, wEnd, wTop, wTop, wFront, wFront], 0, Hf / 2, D / 2 - T / 2));

  // lid: runs in grooves in the side walls and the back wall, slides out over the front wall
  const lw = W - 2 * T + 2 * groove;
  const ld = D - T + groove;
  const lid = new THREE.Group();
  root.add(lid);
  lid.add(slab(lw, lidT, ld, [wEnd, wEnd, k.engraved("front", spec.w, spec.d), k.wood(spec.w, spec.d), wTop, wTop], 0, lidT / 2, 0));
  // 0.3 mm behind the front of the side walls: flush, the ends of its tongues (inside the
  // grooves) shared that plane with the walls and their two grains flickered
  const lidZ = D / 2 - 0.3 * mm - ld / 2;
  lid.position.set(0, lidBottom, lidZ);

  const slotG = new THREE.Group();
  slotG.position.y = Tb;
  base.add(slotG);
  const inW = W - 2 * T - 1 * mm;
  const inD = D - 2 * T - 1 * mm;
  const insH = holds ? holds.depth : 10 * mm;
  const insert = new THREE.Mesh(insertGeometry(inW, inD, insH, holds?.slots ?? []), k.insert(insertKind));
  slotG.add(insert);

  // open: slide the lid clear of the box, then set it down flat in front
  const out = ld + 6 * mm;
  const rest = V(0, 0, D / 2 + 18 * mm + ld / 2);
  const apply = (p: number) => {
    const s = smooth(0, 0.55, p);
    const dwn = smooth(0.5, 1, p);
    const zSlid = lidZ + out * s;
    lid.position.set(0, lidBottom + (rest.y - lidBottom) * dwn, zSlid + (rest.z - zSlid) * dwn);
    lid.rotation.y = -8 * RAD * dwn;
    return 1;
  };
  const explode = (x: number) => {
    lid.position.y += H * 1.2 * springAt(x, 0);
    slotG.position.y = Tb + H * 0.7 * springAt(x, 1);
  };
  const S = spec;
  const pins = [
    pin(1, "抽拉盖", "Sliding lid", `${mmOf(lw)} × ${mmOf(ld)} × ${mmOf(lidT)} mm，激光烙印品牌`, `${mmOf(lw)} × ${mmOf(ld)} × ${mmOf(lidT)} mm, brand laser-engraved`, lid, V(-lw * 0.25, lidT, 0), V(0, 1, 0)),
    pin(2, "侧板", "Side wall", `松木 ${mmOf(T)} mm，内侧开 ${mmOf(groove)} mm 槽`, `${mmOf(T)} mm pine, with a ${mmOf(groove)} mm groove inside`, base, V(W / 2, H * 0.5, D * 0.2), V(1, 0, 0)),
    pin(3, "前板", "Front wall", `比侧板低 ${mmOf(H - Hf)} mm，盖子从上面抽出`, `${mmOf(H - Hf)} mm lower than the sides so the lid slides out over it`, base, V(-W * 0.2, Hf * 0.6, D / 2), V(0, 0, 1)),
    pin(4, "内托", "Insert", holds ? `高 ${mmOf(insH)} mm，按产品开孔` : `高 ${mmOf(insH)} mm`, holds ? `${mmOf(insH)} mm high, cut to each product` : `${mmOf(insH)} mm high`, insert, V(inW * 0.36, insH, inD * 0.3), V(0, 1, 0)),
  ];
  return { root, apply, explode, pins, slot: { parent: slotG, y: holds ? 0 : insH } };
}
