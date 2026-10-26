/**
 * Plastic, glass and ceramic primary packs: the stand-up pouch, the pump bottle, the squeeze
 * tube, the glass jar, the glass bottle with a stopper, and the porcelain caddy.
 * Glass is modelled as closed solids (outside up, over the rim, inside down) so both
 * renderers refract it as real glass. Units: 1 = 100 mm; every form stands on y = 0.
 */
import * as THREE from "three";
import type { PackSpec } from "@/lib/pack";
import { rolesOf, type ArtInput } from "./art";
import { band, box, disc, lathe, liftOff, mmOf, pin, RAD, ribbed, smooth, springAt, surface, U, V, type Built } from "./common";
import type { Kit } from "./kit";

const mm = U;

/** What a category's jar or bottle holds. */
const fillKind = (category: string, liquidFirst: boolean): "dry" | "liquid" | "cream" =>
  category === "cosmetics" ? "cream" : category === "tea" ? (liquidFirst ? "liquid" : "dry") : liquidFirst || category === "specialty" ? "liquid" : "dry";

/** A quarter-ellipse shoulder from (r0, y0) to (r1, y1), as [r, y] points (without the first). */
function shoulder(r0: number, y0: number, r1: number, y1: number, n = 10): number[][] {
  const out: number[][] = [];
  for (let i = 1; i <= n; i++) {
    const t = (i / n) * (Math.PI / 2);
    out.push([r1 + (r0 - r1) * Math.cos(t), y0 + (y1 - y0) * Math.sin(t)]);
  }
  return out;
}

/* ================================================================ Stand-up pouch */

/**
 * Stand-up pouch (doypack): a laminated front and back that swell into a lens-shaped pillow,
 * an oval bottom gusset it stands on, side and top seals, and a zip.
 */
export function buildPouch(spec: PackSpec, k: Kit, own: { dispose: () => void }[]): Built {
  const W = spec.w * U;
  const H = spec.h * U;
  const D = spec.d * U;
  const seal = Math.min(7 * mm, W * 0.06);
  const topSeal = Math.min(12 * mm, H * 0.08);
  const W2 = W / 2 - seal;
  const Hn = H - topSeal;
  const ft = 0.3 * mm; // two films sealed together
  const thick = (u: number, v: number) => {
    const x = 2 * u - 1;
    const kx = 0.5 + 0.5 * smooth(0, 0.3, v); // oval at the base, a lens higher up
    const e = Math.pow(Math.max(0, 1 - x * x), kx);
    const g = Math.pow(1 - smooth(0.12, 1, v), 0.85) * (1 + 0.07 * Math.sin(Math.PI * v));
    return (D / 2) * e * g;
  };
  const front = k.tex("front", spec.w, spec.h, "film");
  const backM = k.tex("back", spec.w, spec.h, "film");
  const sealM = k.plain("film");
  sealM.side = THREE.DoubleSide;
  const ownMats: THREE.Material[] = [];
  const root = new THREE.Group();
  const frontFn = (u: number, v: number, o: THREE.Vector3) => o.set((2 * u - 1) * W2, v * Hn, thick(u, v));
  const backFn = (u: number, v: number, o: THREE.Vector3) => o.set((1 - 2 * u) * W2, v * Hn, -thick(1 - u, v));
  const fg = new THREE.Mesh(surface(frontFn, 64, 64, true), front);
  const bg = new THREE.Mesh(surface(backFn, 64, 64, true), backM);
  // the inside of the laminate is the metallised barrier layer
  const foil = k.bareMetal.clone();
  foil.roughness = 0.38;
  foil.color.set("#C9CCCB");
  ownMats.push(foil);
  // just inside the print, never in front of it (it closes to nothing at the seals)
  const fIn = new THREE.Mesh(surface((u, v, o) => (frontFn(u, v, o), o.setZ(o.z * 0.97)), 48, 48, false), foil);
  const bIn = new THREE.Mesh(surface((u, v, o) => (backFn(u, v, o), o.setZ(o.z * 0.97)), 48, 48, false), foil);
  const gussetGeo = new THREE.CircleGeometry(1, 64);
  gussetGeo.rotateX(Math.PI / 2);
  gussetGeo.scale(W2, 1, D / 2);
  const gusset = new THREE.Mesh(gussetGeo, sealM);
  gusset.position.y = 0.02 * mm;
  const frontG = new THREE.Group();
  frontG.add(fg, fIn);
  const backG = new THREE.Group();
  backG.add(bg, bIn);
  root.add(frontG, backG, gusset);
  const seals = new THREE.Group();
  for (const s of [-1, 1]) {
    const fin = box(seal, Hn, ft, [sealM, sealM, sealM, sealM, sealM, sealM]);
    fin.position.set(s * (W2 + seal / 2), Hn / 2, 0);
    seals.add(fin);
  }
  const top = box(W, topSeal, ft, [sealM, sealM, sealM, sealM, sealM, sealM]);
  top.position.set(0, Hn + topSeal / 2, 0);
  seals.add(top);
  root.add(seals);
  // zip: a ridge just below the top seal, following the front surface
  const vz = (Hn - 14 * mm) / Hn;
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= 40; i++) {
    const u = i / 40;
    pts.push(V((2 * u - 1) * W2, vz * Hn, thick(u, vz) + 0.45 * mm));
  }
  const zip = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 80, 0.8 * mm, 8, false), sealM);
  root.add(zip);
  own.push(...ownMats);

  const apply = () => 1;
  const explode = (x: number) => {
    frontG.position.z = D * 0.9 * springAt(x, 0);
    zip.position.z = D * 1.5 * springAt(x, 1);
    backG.position.z = -D * 0.9 * springAt(x, 0);
    seals.position.y = H * 0.12 * springAt(x, 2);
  };
  const S = spec;
  const pins = [
    pin(1, "正面复合膜", "Front laminate", `${S.w} × ${S.h} mm，PET / 镀铝 / PE 三层复合，凹版印刷`, `${S.w} × ${S.h} mm, PET / metallised / PE three-layer laminate, gravure printed`, frontG, V(-W2 * 0.3, Hn * 0.45, thick(0.35, 0.45)), V(0, 0, 1)),
    pin(2, "自封拉链", "Zip", "可重复开合，开封后保鲜", "reclosable, keeps it fresh after opening", zip, V(W2 * 0.4, vz * Hn, thick(0.7, vz) + 1 * mm), V(0, 0, 1)),
    pin(3, "底部展开", "Bottom gusset", `展开 ${S.d} mm，装满后袋子能自己站立`, `${S.d} mm gusset; filled, the pouch stands by itself`, gusset, V(0, 0, D * 0.4), V(0, -1, 0), true),
    pin(4, "封边", "Seals", `侧封 ${mmOf(seal)} mm，顶封 ${mmOf(topSeal)} mm，带易撕口`, `${mmOf(seal)} mm side seals, ${mmOf(topSeal)} mm top seal with a tear notch`, seals, V(W / 2 - seal / 2, H - topSeal / 2, ft), V(0, 0, 1)),
  ];
  return { root, apply, explode, pins };
}

/* ================================================================ Pump bottle */

/** Blow-moulded HDPE/PET bottle with a film label and a screw-on pump (collar, stem, head, nozzle, dip tube). */
export function buildBottle(spec: PackSpec, k: Kit, a: ArtInput): Built {
  const R = (spec.w / 2) * U;
  const H = spec.h * U;
  const roles = rolesOf(a.d);
  const pumpH = Math.min(60 * mm, Math.max(34 * mm, H * 0.26));
  const bodyH = H - pumpH;
  const rn = Math.max(10 * mm, Math.min(R * 0.42, 14 * mm));
  const shH = Math.min(bodyH * 0.18, R * 0.8);
  const sh0 = bodyH - shH;
  const root = new THREE.Group();
  const bodyMat = k.plastic(new THREE.Color(roles.ground).lerp(new THREE.Color("#ffffff"), 0.1).getStyle(), 0.38);
  const prof = [
    [0, 1.5 * mm],
    [R - 4 * mm, 1.5 * mm],
    [R - 2 * mm, 0.2 * mm],
    [R - 0.6 * mm, 1.2 * mm],
    [R, 3.5 * mm],
    [R, sh0],
    ...shoulder(R, sh0, rn, bodyH - 1 * mm),
    [rn, bodyH + 6 * mm],
    [rn - 1.5 * mm, bodyH + 6 * mm],
    [0, bodyH + 6 * mm],
  ];
  const body = new THREE.Mesh(lathe(prof, 128), bodyMat);
  root.add(body);
  const circ = 2 * Math.PI * R;
  const ly0 = 8 * mm;
  const ly1 = sh0 - 4 * mm;
  const label = band(R + 0.15 * mm, ly0, ly1, k.tex("tinWrap", circ / U, (ly1 - ly0) / U, "film"));
  root.add(label);

  const pump = new THREE.Group();
  root.add(pump);
  const capMat = k.plastic(roles.key, 0.32);
  const collarH = 14 * mm;
  const rc = rn + 2.5 * mm;
  const collar = new THREE.Mesh(ribbed(new THREE.CylinderGeometry(rc, rc, collarH, 144, 2), 72, 0.3 * mm), capMat);
  collar.position.y = bodyH + collarH / 2;
  pump.add(collar);
  const stemMat = k.plastic("#F1F0EC", 0.3);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(3.2 * mm, 3.2 * mm, 7 * mm, 32), stemMat);
  stem.position.y = bodyH + collarH + 3 * mm;
  pump.add(stem);
  const hr = Math.min(rc, 11 * mm);
  const headH = Math.max(10 * mm, pumpH - collarH - 6 * mm);
  const head = new THREE.Mesh(
    lathe([
      [0, 0],
      [hr - 1 * mm, 0],
      [hr, 1 * mm],
      [hr, headH - 3 * mm],
      [hr - 1.5 * mm, headH - 0.5 * mm],
      [hr - 3.5 * mm, headH],
      [0, headH],
    ]),
    capMat,
  );
  head.position.y = bodyH + collarH + 6 * mm;
  pump.add(head);
  const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(2.2 * mm, 2.8 * mm, 16 * mm, 24), capMat);
  nozzle.rotation.x = Math.PI / 2 + 8 * RAD; // tip slightly down
  nozzle.position.set(0, head.position.y + headH * 0.62, hr + 5 * mm);
  pump.add(nozzle);
  const dip = new THREE.Mesh(new THREE.CylinderGeometry(2 * mm, 2 * mm, bodyH - 4 * mm, 16), stemMat);
  dip.position.y = 4 * mm + (bodyH - 4 * mm) / 2;
  pump.add(dip);

  const apply = () => 1;
  const explode = (x: number) => {
    pump.position.y = (bodyH + 14 * mm) * springAt(x, 0);
  };
  const S = spec;
  const pins = [
    pin(1, "泵头", "Pump head", "按压出料，约 1–2 mL 一泵，带锁扣", "press to dispense about 1–2 mL; twist-locks for shipping", head, V(0, headH, 0), V(0, 1, 0)),
    pin(2, "螺纹盖", "Screw collar", `Ø${mmOf(2 * rc)} mm，24/410 口径，外圈防滑纹`, `Ø${mmOf(2 * rc)} mm, 24/410 neck finish, ribbed for grip`, collar, V(0, 0, rc), V(0, 0, 1)),
    pin(3, "吸管", "Dip tube", "伸到瓶底，用到最后一滴", "reaches the base so the last drop comes out", dip, V(0, -bodyH * 0.2, 2 * mm), V(0, 0, 1), true),
    pin(4, "瓶身", "Bottle", `Ø${S.w} × ${mmOf(bodyH)} mm，HDPE 吹塑`, `Ø${S.w} × ${mmOf(bodyH)} mm, blow-moulded HDPE`, body, V(R * 0.7, sh0 + shH * 0.4, R * 0.5), V(0, 0, 1)),
    pin(5, "标签", "Label", `展开 ${mmOf(circ)} × ${mmOf(ly1 - ly0)} mm，薄膜不干胶，防水`, `unrolled ${mmOf(circ)} × ${mmOf(ly1 - ly0)} mm, waterproof film label`, label, V(0, 0, R + 0.4 * mm), V(0, 0, 1)),
  ];
  return { root, apply, explode, pins, turn: 18 };
}

/* ================================================================ Squeeze tube */

/** Laminated squeeze tube standing on its flip cap: round at the shoulder, flat at the crimp. */
export function buildTube(spec: PackSpec, k: Kit, a: ArtInput): Built {
  const R = (spec.w / 2) * U;
  const H = spec.h * U;
  const roles = rolesOf(a.d);
  const capH = Math.min(26 * mm, Math.max(14 * mm, H * 0.14));
  const Rc = R * 0.95;
  const rn = Math.min(7 * mm, Rc * 0.45);
  const shH = R * 0.38;
  const y0 = capH + shH;
  const crimpH = Math.min(10 * mm, H * 0.07);
  const y1 = H - crimpH;
  const flat = (Math.PI * R) / 2;
  const root = new THREE.Group();
  const cap = new THREE.Mesh(
    lathe([
      [0, 0],
      [Rc - 1.5 * mm, 0],
      [Rc, 1.5 * mm],
      [Rc, capH - 1 * mm],
      [Rc - 1 * mm, capH],
      [0, capH],
    ]),
    k.plastic(roles.key, 0.3),
  );
  const hinge = new THREE.Mesh(new THREE.TorusGeometry(Rc, 0.22 * mm, 6, 128), k.plastic(roles.ink, 0.5));
  hinge.rotation.x = Math.PI / 2;
  hinge.position.y = capH * 0.68;
  root.add(cap, hinge);

  const tube = new THREE.Group();
  root.add(tube);
  const shProf: number[][] = [
    [rn, capH],
    [rn, capH + 2 * mm],
  ];
  for (let i = 1; i <= 10; i++) {
    const t = (i / 10) * (Math.PI / 2);
    shProf.push([rn + (R - rn) * Math.sin(t), capH + 2 * mm + (shH - 2 * mm) * (1 - Math.cos(t))]);
  }
  const bodyMat = k.tex("tinWrap", (2 * Math.PI * R) / U, (y1 - y0) / U, "plastic");
  bodyMat.side = THREE.DoubleSide;
  const plainM = k.plain("plastic");
  tube.add(new THREE.Mesh(lathe(shProf, 128), plainM));
  const f = (s: number) => smooth(0, 1, s);
  const body = new THREE.Mesh(
    surface(
      (u, v, o) => {
        const th = -Math.PI / 2 - 2 * Math.PI * u;
        const ff = f(v);
        const ax = R + (flat - R) * ff;
        const bz = R * (1 - ff) + 0.35 * mm * ff;
        o.set(ax * Math.cos(th), y0 + (y1 - y0) * v, bz * Math.sin(th));
      },
      128,
      48,
      true,
    ),
    bodyMat,
  );
  tube.add(body);
  const crimp = box(2 * flat, crimpH, 0.7 * mm, [plainM, plainM, plainM, plainM, plainM, plainM]);
  crimp.position.y = y1 + crimpH / 2;
  tube.add(crimp);

  const apply = () => 1;
  const explode = (x: number) => {
    tube.position.y = (capH * 0.9 + H * 0.1) * springAt(x, 0);
  };
  const S = spec;
  const pins = [
    pin(1, "管身", "Tube body", `Ø${S.w} mm，PE 或铝塑复合（ABL / PBL），可挤压`, `Ø${S.w} mm, PE or aluminium-plastic laminate (ABL / PBL), squeezable`, body, V(0, (y0 + y1) * 0.5, R * 0.9), V(0, 0, 1)),
    pin(2, "尾封", "Crimp seal", `宽 ${mmOf(2 * flat)} mm，热封，印批号`, `${mmOf(2 * flat)} mm wide, heat-sealed, carries the batch code`, crimp, V(flat * 0.5, 0, 0.4 * mm), V(0, 0, 1)),
    pin(3, "翻盖", "Flip cap", `Ø${mmOf(2 * Rc)} × ${mmOf(capH)} mm，倒立站放`, `Ø${mmOf(2 * Rc)} × ${mmOf(capH)} mm; the tube stands on it`, cap, V(0, capH * 0.4, Rc), V(0, 0, 1)),
    pin(4, "肩部", "Shoulder", "管肩注塑，连接管口与盖", "moulded shoulder joining the tube to the cap", tube, V(0, capH + shH * 0.6, R * 0.8), V(0, 0, 1)),
  ];
  return { root, apply, explode, pins };
}

/* ================================================================ Glass jar */

/** Wide-mouth glass jar: a closed glass solid, its contents, a paper label and a lug cap over threads. */
export function buildJar(spec: PackSpec, k: Kit, a: ArtInput, category: string): Built {
  const R = (spec.w / 2) * U;
  const H = spec.h * U;
  const roles = rolesOf(a.d);
  const capH = Math.min(20 * mm, Math.max(10 * mm, H * 0.14));
  const Tg = 3 * mm;
  const Tb = 6 * mm;
  const Hg = H - 1.4 * mm;
  const rnO = R - Math.max(4 * mm, R * 0.12);
  const rnI = rnO - Tg;
  const yN = H - capH - 1 * mm;
  const shH = Math.min(H * 0.1, (R - rnO) * 1.6);
  const yS = yN - shH;
  const root = new THREE.Group();
  // outside up, over the rim, inside down: one closed glass solid
  const profFull = [
    [0, 0],
    [R - 4 * mm, 0],
    [R - 1 * mm, 1 * mm],
    [R, 4 * mm],
    [R, yS],
    ...shoulder(R, yS, rnO, yN),
    [rnO, Hg - 0.6 * mm],
    [rnO - 0.6 * mm, Hg],
    [rnI + 0.6 * mm, Hg],
    [rnI, Hg - 0.6 * mm],
    [rnI, yN],
    ...shoulder(R - Tg, yS - 1 * mm, rnI, yN).slice(0, -1).reverse(),
    [R - Tg, yS - 1 * mm],
    [R - Tg, Tb + 3 * mm],
    [R - Tg - 3 * mm, Tb],
    [0, Tb],
  ];
  const glass = new THREE.Mesh(lathe(profFull, 128), k.glass(Tg, "#EEF4F0"));
  root.add(glass);
  for (const ty of [3 * mm, 6.5 * mm]) {
    const th = new THREE.Mesh(new THREE.TorusGeometry(rnO, 0.8 * mm, 8, 96), glass.material);
    th.rotation.x = Math.PI / 2;
    th.position.y = yN + ty;
    root.add(th);
  }
  const fillY = yS - 5 * mm;
  const fill = new THREE.Mesh(
    lathe([
      [0, Tb + 0.3 * mm],
      [R - Tg - 3.2 * mm, Tb + 0.3 * mm],
      [R - Tg - 0.3 * mm, Tb + 3.2 * mm],
      [R - Tg - 0.3 * mm, fillY],
      [0, fillY],
    ]),
    k.fill(fillKind(category, false)),
  );
  root.add(fill);
  const arc = 150 * RAD;
  const ly0 = Math.max(8 * mm, H * 0.12);
  const ly1 = yS - 6 * mm;
  const label = band(R + 0.25 * mm, ly0, ly1, k.tex("front", ((R * arc) / U) | 0, (ly1 - ly0) / U), arc);
  root.add(label);

  const rci = rnO + 1.2 * mm;
  const Rc = rci + 1.2 * mm;
  const lid = new THREE.Group();
  root.add(lid);
  const capMat = k.anodised(roles.key);
  lid.add(
    new THREE.Mesh(
      lathe([
        [rci, 0],
        [Rc - 0.4 * mm, 0],
        [Rc, 0.6 * mm],
        [Rc, capH - 1.2 * mm],
        [Rc - 1.2 * mm, capH],
        [0, capH],
        [0, capH - 0.8 * mm],
        [rci, capH - 0.8 * mm],
        [rci, 0],
      ]),
      capMat,
    ),
  );
  const top = k.tex("tinCap", (2 * Rc) / U, (2 * Rc) / U, "metal");
  top.clearcoat = 1;
  lid.add(disc(Rc - 1.3 * mm, capH + 0.06 * mm, top));
  const closedY = H - capH;
  lid.position.y = closedY;

  const open = V(R * 2.3, Rc * 0.98, R * 0.4);
  const apply = (p: number) => {
    liftOff(lid, p, closedY, capH + 4 * mm, open, new THREE.Euler(72 * RAD, -0.35, 0));
    lid.rotation.y -= Math.PI * 2 * smooth(0, 0.4, p); // unscrewing
    return 1;
  };
  const explode = (x: number) => {
    lid.position.y += H * 0.6 * springAt(x, 0);
  };
  const S = spec;
  const pins = [
    pin(1, "旋盖", "Lug cap", `Ø${mmOf(2 * Rc)} × ${mmOf(capH)} mm，马口铁，内有密封垫`, `Ø${mmOf(2 * Rc)} × ${mmOf(capH)} mm, tinplate with a sealing liner`, lid, V(R * 0.3, capH, R * 0.3), V(0, 1, 0)),
    pin(2, "玻璃罐身", "Glass", `Ø${S.w} × ${mmOf(Hg)} mm，钠钙玻璃，壁厚约 ${mmOf(Tg)} mm`, `Ø${S.w} × ${mmOf(Hg)} mm, soda-lime glass, about ${mmOf(Tg)} mm wall`, glass, V(R * 0.6, yS * 0.9, R * 0.75), V(0, 0, 1)),
    pin(3, "螺纹口", "Threads", "宽口螺纹，盖子旋紧密封", "wide-mouth thread; the cap screws down to seal", glass, V(0, yN + 5 * mm, rnO), V(0, 0, 1)),
    pin(4, "标签", "Label", `正面贴标，${mmOf(R * arc)} × ${mmOf(ly1 - ly0)} mm`, `front label, ${mmOf(R * arc)} × ${mmOf(ly1 - ly0)} mm`, label, V(0, 0, R + 0.5 * mm), V(0, 0, 1)),
    pin(5, "内容物", "Contents", "透过玻璃看得见", "visible through the glass", fill, V(R * 0.4, fillY * 0.6, 0), undefined, true),
  ];
  return { root, apply, explode, pins, turn: 14 };
}

/* ================================================================ Glass bottle */

/** Glass bottle with a punt, a front label, a neck band and a bar-top stopper. */
export function buildGlassBottle(spec: PackSpec, k: Kit, a: ArtInput, category: string): Built {
  const R = (spec.w / 2) * U;
  const H = spec.h * U;
  const roles = rolesOf(a.d);
  const Tg = 3.5 * mm;
  const Tb = 7 * mm;
  const rn = Math.max(8 * mm, Math.min(R * 0.32, 15 * mm));
  const rni = rn - 3 * mm;
  const rlip = rn + 1.2 * mm;
  const hh = Math.min(18 * mm, Math.max(10 * mm, H * 0.06));
  const Hg = H - hh - 0.3 * mm;
  const y0 = H * 0.56;
  const shH = Math.min(H * 0.2, (R - rn) * 2.2);
  const yN = y0 + shH;
  const punt = R * 0.25;
  const S_ = (t: number) => 0.5 + 0.5 * Math.cos(Math.PI * t);
  const outerSh: number[][] = [];
  const innerSh: number[][] = [];
  for (let i = 1; i <= 14; i++) {
    const t = i / 14;
    outerSh.push([rn + (R - rn) * S_(t), y0 + shH * t]);
    innerSh.push([rni + (R - Tg - rni) * S_(t), y0 + shH * t]);
  }
  const prof = [
    [0, 0],
    [R - 5 * mm, 0],
    [R - 1.5 * mm, 1.5 * mm],
    [R, 5 * mm],
    [R, y0],
    ...outerSh,
    [rn, Hg - 6 * mm],
    [rlip, Hg - 5 * mm],
    [rlip, Hg - 0.8 * mm],
    [rlip - 0.8 * mm, Hg],
    [rni + 0.5 * mm, Hg],
    [rni, Hg - 0.5 * mm],
    ...innerSh.slice().reverse(),
    [R - Tg, y0],
    [R - Tg, Tb + 4 * mm],
    [R - Tg - 4 * mm, Tb],
    [R * 0.5, Tb],
    [0, Tb + punt],
  ];
  const root = new THREE.Group();
  const glass = new THREE.Mesh(lathe(prof, 128), k.glass(Tg, "#D7E8D5"));
  root.add(glass);
  const fillY = y0 - 2 * mm;
  const fill = new THREE.Mesh(
    lathe([
      [0, Tb + punt + 0.3 * mm],
      [R * 0.5, Tb + 0.3 * mm],
      [R - Tg - 4.2 * mm, Tb + 0.3 * mm],
      [R - Tg - 0.3 * mm, Tb + 4.2 * mm],
      [R - Tg - 0.3 * mm, fillY],
      [0, fillY],
    ]),
    k.fill(fillKind(category, true)),
  );
  root.add(fill);
  const arc = 130 * RAD;
  const ly0 = H * 0.1;
  const ly1 = y0 - H * 0.06;
  const label = band(R + 0.25 * mm, ly0, ly1, k.tex("front", ((R * arc) / U) | 0, (ly1 - ly0) / U), arc);
  root.add(label);
  const nb0 = yN + 4 * mm;
  const nb1 = Math.min(Hg - 9 * mm, nb0 + 18 * mm);
  const neckBand = nb1 - nb0 > 5 * mm ? band(rn + 0.2 * mm, nb0, nb1, k.tex("bandPlain", (2 * Math.PI * rn) / U, (nb1 - nb0) / U)) : null;
  if (neckBand) root.add(neckBand);

  // stopper: cork shank in the neck, a moulded head on the lip
  const stopper = new THREE.Group();
  root.add(stopper);
  const shankL = Math.min(22 * mm, (Hg - yN) * 0.7);
  const shank = new THREE.Mesh(new THREE.CylinderGeometry(rni - 0.15 * mm, rni - 0.3 * mm, shankL + 0.3 * mm, 48), k.cork);
  shank.position.y = -shankL / 2 + 0.15 * mm;
  const rh = rlip + 1 * mm;
  const head = new THREE.Mesh(
    lathe([
      [0, 0],
      [rh - 0.8 * mm, 0],
      [rh, 0.8 * mm],
      [rh, hh - 2.5 * mm],
      [rh - 2.5 * mm, hh],
      [0, hh],
    ]),
    k.plastic(roles.key, 0.25),
  );
  head.position.y = 0.3 * mm;
  stopper.add(shank, head);
  stopper.position.y = Hg;

  const open = V(R * 2.1, rh, R * 0.5);
  const apply = (p: number) => {
    liftOff(stopper, p, Hg, shankL + 6 * mm, open, new THREE.Euler(90 * RAD, 0.5, 0));
    return 1;
  };
  const explode = (x: number) => {
    stopper.position.y += H * 0.3 * springAt(x, 0);
  };
  const S = spec;
  const pins = [
    pin(1, "瓶塞", "Stopper", `软木塞身 + 塑料塞头，Ø${mmOf(2 * rh)} mm`, `cork shank with a moulded head, Ø${mmOf(2 * rh)} mm`, stopper, V(0, hh + 0.3 * mm, 0), V(0, 1, 0)),
    pin(2, "瓶身", "Glass", `Ø${S.w} × ${S.h} mm，钠钙玻璃，瓶底内凹`, `Ø${S.w} × ${S.h} mm, soda-lime glass with a punt`, glass, V(R * 0.6, y0 + shH * 0.3, R * 0.6), V(0, 0, 1)),
    pin(3, "正标", "Front label", `${mmOf(R * arc)} × ${mmOf(ly1 - ly0)} mm，纸标`, `${mmOf(R * arc)} × ${mmOf(ly1 - ly0)} mm, paper label`, label, V(0, 0, R + 0.5 * mm), V(0, 0, 1)),
    ...(neckBand ? [pin(4, "颈标", "Neck band", "环绕瓶颈的封签", "a band round the neck that also seals it", neckBand, V(0, 0, rn + 0.4 * mm), V(0, 0, 1))] : []),
  ];
  return { root, apply, explode, pins, turn: 10 };
}

/* ================================================================ Porcelain caddy */

/** Glazed porcelain tea caddy: a thick-walled body with a decal band, a domed lid and knob. */
export function buildCeramic(spec: PackSpec, k: Kit, a: ArtInput, category: string): Built {
  const R = (spec.w / 2) * U;
  const H = spec.h * U;
  const roles = rolesOf(a.d);
  const knobH = Math.max(6 * mm, H * 0.07);
  const domeH = Math.max(10 * mm, H * 0.12);
  const neckH = Math.max(10 * mm, H * 0.1);
  const Hb = H - domeH - knobH;
  const rn = R * 0.62;
  const shH = H * 0.12;
  const yS = Hb - neckH - shH;
  const Tw = 4 * mm;
  const glaze = k.ceramic(new THREE.Color(roles.ground).lerp(new THREE.Color("#ffffff"), 0.55).getStyle());
  const root = new THREE.Group();
  const prof = [
    [0, 1.5 * mm],
    [R - 5 * mm, 1.5 * mm],
    [R - 4.5 * mm, 0],
    [R - 3 * mm, 0],
    [R - 1 * mm, 1.5 * mm],
    [R, 5 * mm],
    [R, yS],
    ...shoulder(R, yS, rn, Hb - neckH),
    [rn, Hb - 0.8 * mm],
    [rn - 0.8 * mm, Hb],
    [rn - 2.2 * mm, Hb],
    [rn - 3 * mm, Hb - 0.8 * mm],
    [rn - 3 * mm, Hb - neckH],
    ...shoulder(R - Tw, yS - 2 * mm, rn - 3 * mm, Hb - neckH).slice(0, -1).reverse(),
    [R - Tw, yS - 2 * mm],
    [R - Tw, 9 * mm],
    [R - Tw - 4 * mm, 5 * mm],
    [0, 5 * mm],
  ];
  const body = new THREE.Mesh(lathe(prof, 128), glaze);
  root.add(body);
  const circ = 2 * Math.PI * R;
  const dy0 = 8 * mm;
  const dy1 = yS - 3 * mm;
  const decal = band(R + 0.15 * mm, dy0, dy1, k.tex("tinWrap", circ / U, (dy1 - dy0) / U, "glaze"));
  root.add(decal);
  const fillY = Math.min(yS * 0.75, yS - 10 * mm);
  const fill = new THREE.Mesh(new THREE.CylinderGeometry(R - Tw - 0.4 * mm, R - Tw - 0.4 * mm, fillY - 5.3 * mm, 96), k.fill(fillKind(category, false)));
  fill.position.y = 5.3 * mm + (fillY - 5.3 * mm) / 2;
  root.add(fill);

  // lid: skirt over the neck, a dome and a knob; its ceiling clears the neck's rim
  const ro = rn + 4 * mm;
  const ri = rn + 0.5 * mm;
  const kr = Math.max(5 * mm, rn * 0.28);
  const lidProf: number[][] = [
    [ri, 0],
    [ro, 0],
    [ro, neckH],
  ];
  for (let i = 1; i <= 12; i++) {
    const t = (i / 12) * (Math.PI / 2);
    const r = kr + (ro - kr) * Math.cos(t);
    lidProf.push([r, neckH + domeH * Math.sin(t)]);
  }
  lidProf.push([kr * 0.85, neckH + domeH + knobH * 0.55], [kr * 0.95, neckH + domeH + knobH * 0.8], [kr * 0.6, neckH + domeH + knobH], [0, neckH + domeH + knobH]);
  lidProf.push([0, neckH + domeH - 3 * mm]);
  for (let i = 11; i >= 0; i--) {
    const t = (i / 12) * (Math.PI / 2);
    lidProf.push([ri * Math.cos(t), neckH + 1.5 * mm + (domeH - 4.5 * mm) * Math.sin(t)]);
  }
  lidProf.push([ri, 0]);
  const lid = new THREE.Group();
  lid.add(new THREE.Mesh(lathe(lidProf, 128), glaze));
  const accent = k.ceramic(roles.key);
  const ringM = new THREE.Mesh(new THREE.TorusGeometry(ro - 0.2 * mm, 0.5 * mm, 8, 128), accent);
  ringM.rotation.x = Math.PI / 2;
  ringM.position.y = 1.5 * mm;
  lid.add(ringM);
  const closedY = Hb - neckH + 0.2 * mm;
  lid.position.y = closedY;
  root.add(lid);

  const open = V(R + ro + 8 * mm, ro * 0.98, R * 0.4);
  const apply = (p: number) => {
    liftOff(lid, p, closedY, neckH + 6 * mm, open, new THREE.Euler(70 * RAD, -0.35, 0));
    return 1;
  };
  const explode = (x: number) => {
    lid.position.y += H * 0.5 * springAt(x, 0);
  };
  const S = spec;
  const pins = [
    pin(1, "瓷盖", "Lid", `Ø${mmOf(2 * ro)} mm，套在罐口上，内壁不碰罐口`, `Ø${mmOf(2 * ro)} mm, sits over the neck without touching its rim`, lid, V(0, neckH + domeH + knobH, 0), V(0, 1, 0)),
    pin(2, "罐身", "Body", `Ø${S.w} × ${mmOf(Hb)} mm，高温瓷，釉面`, `Ø${S.w} × ${mmOf(Hb)} mm, high-fired porcelain, glazed`, body, V(R * 0.7, yS + shH * 0.4, R * 0.55), V(0, 0, 1)),
    pin(3, "釉上贴花", "Decal", `展开 ${mmOf(circ)} × ${mmOf(dy1 - dy0)} mm，烧制后耐洗`, `unrolled ${mmOf(circ)} × ${mmOf(dy1 - dy0)} mm, fired on so it washes`, decal, V(0, 0, R + 0.4 * mm), V(0, 0, 1)),
    pin(4, "罐口", "Neck", `Ø${mmOf(2 * rn)} mm，盖子落在肩上`, `Ø${mmOf(2 * rn)} mm; the lid rests on the shoulder`, body, V(0, Hb - neckH * 0.5, rn), V(0, 0, 1), true),
  ];
  return { root, apply, explode, pins, turn: 16 };
}
