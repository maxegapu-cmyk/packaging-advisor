/**
 * Paper and board forms beyond the carton and gift box: the corrugated mailer, the drawer box,
 * the book-style magnetic box, the paper tube and the carrier bag.
 * Units: 1 = 100 mm. Every form stands on y = 0, centred, its front toward +z.
 */
import * as THREE from "three";
import type { PackSpec } from "@/lib/pack";
import { rolesOf, type ArtInput } from "./art";
import { box, disc, insertGeometry, liftOff, mmOf, pin, RAD, smooth, splitMesh, springAt, tubeWall, U, V, type Built, type Holds } from "./common";
import type { InsertKind, Kit } from "./kit";

const mm = U;

/** Box material order: +x, -x, +y, -y, +z, -z. */
type Six = [THREE.Material, THREE.Material, THREE.Material, THREE.Material, THREE.Material, THREE.Material];
const slab = (w: number, h: number, d: number, m: Six, x = 0, y = 0, z = 0) => {
  const g = box(w, h, d, m);
  g.position.set(x, y, z);
  return g;
};

/* ================================================================ Corrugated mailer */

/**
 * Roll-end front-tuck mailer in 3 mm E/B-flute board: double (rolled) front and side walls,
 * a lid hinged at the back with a tuck flap and two dust ears that go inside the walls.
 */
export function buildMailer(spec: PackSpec, k: Kit, holds?: Holds, insertKind: InsertKind = "card"): Built {
  const W = spec.w * U;
  const H = spec.h * U;
  const D = spec.d * U;
  const T = 3 * mm;
  const K = k.kraft;
  const wallH = H - T;
  const fW = k.flute(spec.w);
  const fD = k.flute(spec.d);
  const fH = k.flute(spec.h, true);
  const printTop = k.tex("front", spec.w, spec.d);
  const frontBand = k.tex("band", spec.w, wallH / U);
  const plainW = k.tex("bandPlain", spec.w, wallH / U);
  const plainD = k.tex("bandPlain", spec.d, wallH / U);
  const rolled = k.plain();

  const root = new THREE.Group();
  const base = new THREE.Group();
  root.add(base);
  const innerD = D - 3 * T; // between the back wall and the double front wall
  const innerZ = -T / 2;
  // front wall: two layers rolled over at the top, so its top edge is the printed fold
  base.add(slab(W, wallH, 2 * T, [fH, fH, rolled, fW, frontBand, K], 0, wallH / 2, D / 2 - T));
  base.add(slab(W, wallH, T, [fH, fH, fW, fW, K, plainW], 0, wallH / 2, -D / 2 + T / 2));
  for (const s of [-1, 1]) {
    const side = slab(2 * T, wallH, innerD, s > 0 ? [plainD, K, rolled, fD, fH, fH] : [K, plainD, rolled, fD, fH, fH], s * (W / 2 - T), wallH / 2, innerZ);
    base.add(side);
  }
  base.add(slab(W - 4 * T, T, innerD, [K, K, K, k.tex("bottom", spec.w, spec.d), K, K], 0, T / 2, innerZ));

  // lid, hinged at the back top edge
  const lid = new THREE.Group();
  lid.position.set(0, wallH, -D / 2);
  root.add(lid);
  lid.add(slab(W, T, D, [fD, fD, printTop, K, fW, fW], 0, T / 2, D / 2));
  const tuckH = Math.min(wallH - 2 * T, wallH * 0.7, 40 * mm);
  const tuck = new THREE.Group();
  tuck.position.set(0, 0, D - 2 * T - 0.6 * mm);
  lid.add(tuck);
  tuck.add(slab(W - 4 * T - 4 * mm, tuckH, T, [fH, fH, K, fW, K, K], 0, -tuckH / 2, -T / 2));
  const earH = Math.min(wallH - 2 * T, 26 * mm);
  const earD = D * 0.42;
  for (const s of [-1, 1]) lid.add(slab(T, earH, earD, [K, K, K, fD, fH, fH], s * (W / 2 - 2 * T - 0.6 * mm - T / 2), -earH / 2, D * 0.5));

  // insert: inside the tuck and the ears, on the floor
  const inW = W - 4 * T - 2 * (T + 1.5 * mm);
  const inD = innerD - (T + 1.8 * mm);
  const slotG = new THREE.Group();
  slotG.position.set(0, T, innerZ - (T + 1.8 * mm) / 2);
  base.add(slotG);
  const insH = holds ? holds.depth : 8 * mm;
  const insert = new THREE.Mesh(insertGeometry(inW, inD, insH, holds?.slots ?? []), k.insert(insertKind));
  slotG.add(insert);

  const apply = (p: number) => {
    lid.rotation.x = -105 * RAD * smooth(0, 1, p);
    // the tuck stays upright while it slides up out of the front wall, then flares open
    tuck.rotation.x = -lid.rotation.x * (1 - smooth(0.3, 0.8, p)) - 28 * RAD * smooth(0.4, 1, p);
    return 1;
  };
  const explode = (x: number) => {
    lid.position.y = wallH + H * 1.1 * springAt(x, 0);
    slotG.position.y = T + H * 0.6 * springAt(x, 1);
  };
  const S = spec;
  const pins = [
    pin(1, "盒盖", "Lid", `${S.w} × ${S.d} mm，外面印刷，内面牛皮原色`, `${S.w} × ${S.d} mm, printed outside, plain kraft inside`, lid, V(-W * 0.2, T, D * 0.55), V(0, 1, 0)),
    pin(2, "卷边前墙", "Rolled front wall", "双层，顶边卷折，开箱时手感圆润", "two layers rolled over at the top, so the edge is smooth to the hand", base, V(W * 0.25, wallH * 0.55, D / 2), V(0, 0, 1)),
    pin(3, "插舌", "Tuck flap", `深 ${mmOf(tuckH)} mm，插进前墙内侧锁住盒盖`, `${mmOf(tuckH)} mm deep, tucks behind the front wall to lock the lid`, tuck, V(W * 0.2, -tuckH * 0.5, 0), V(0, 0, 1), true),
    pin(4, "瓦楞边", "Flute edge", "3 mm E/B 楞，抗压、轻，可回收", "3 mm E/B flute: crush-resistant, light and recyclable", base, V(-W / 2, wallH * 0.5, D * 0.2), V(-1, 0, 0)),
    pin(5, "防尘耳", "Dust ears", `高 ${mmOf(earH)} mm，折进侧墙内`, `${mmOf(earH)} mm high, fold inside the side walls`, lid, V(W / 2 - 2.5 * T, -earH * 0.5, D * 0.5), V(1, 0, 0), true),
    pin(6, "内衬", "Insert", holds ? `高 ${mmOf(insH)} mm，按产品开孔定位` : "垫底卡纸", holds ? `${mmOf(insH)} mm high, cut to locate each product` : "card pad on the floor", insert, V(inW * 0.38, insH, inD * 0.3), V(0, 1, 0)),
  ];
  return { root, apply, explode, pins, slot: { parent: slotG, y: insH > 0 && holds ? 0 : insH } };
}

/* ================================================================ Drawer box */

/** Rigid drawer box: a wrapped 1.5 mm sleeve and a lined tray that slides out on a ribbon. */
export function buildDrawer(spec: PackSpec, k: Kit, holds?: Holds, insertKind: InsertKind = "velvet"): Built {
  const W = spec.w * U;
  const H = spec.h * U;
  const D = spec.d * U;
  const T = 1.5 * mm;
  const L = k.lining;
  const P = k.plain();
  const root = new THREE.Group();
  const sleeve = new THREE.Group();
  root.add(sleeve);
  sleeve.add(slab(W, T, D, [P, P, k.tex("front", spec.w, spec.d), L, P, P], 0, H - T / 2, 0));
  sleeve.add(slab(W, T, D, [P, P, L, k.tex("bottom", spec.w, spec.d), P, P], 0, T / 2, 0));
  sleeve.add(slab(T, H - 2 * T, D, [k.tex("right", spec.d, spec.h), L, P, P, P, P], W / 2 - T / 2, H / 2, 0));
  sleeve.add(slab(T, H - 2 * T, D, [L, k.tex("left", spec.d, spec.h), P, P, P, P], -W / 2 + T / 2, H / 2, 0));

  const gap = 0.6 * mm;
  const tw = W - 2 * T - 2 * gap;
  const th = H - 2 * T - 2 * gap;
  const td = D - T;
  const t = 1.2 * mm;
  const tray = new THREE.Group();
  root.add(tray);
  const closedZ = D / 2 - td / 2;
  tray.add(slab(tw, t, td, [P, P, L, P, P, P], 0, t / 2, 0));
  tray.add(slab(tw, th, t, [P, P, P, P, k.tex("band", tw / U, th / U), L], 0, th / 2, td / 2 - t / 2));
  tray.add(slab(tw, th, t, [P, P, P, P, L, P], 0, th / 2, -td / 2 + t / 2));
  for (const s of [-1, 1]) tray.add(slab(t, th, td - 2 * t, s > 0 ? [P, L, P, P, P, P] : [L, P, P, P, P, P], s * (tw / 2 - t / 2), th / 2, 0));
  // ribbon pull, its ends buried in the front panel
  const ribbonCurve = new THREE.CatmullRomCurve3([V(0, -5 * mm, -0.6 * mm), V(0, -4 * mm, 7 * mm), V(0, 4 * mm, 7 * mm), V(0, 5 * mm, -0.6 * mm)]);
  const ribbonGeo = new THREE.TubeGeometry(ribbonCurve, 32, 0.7 * mm, 8, false);
  ribbonGeo.scale(7, 1, 1);
  const ribbon = new THREE.Mesh(ribbonGeo, k.rope);
  ribbon.position.set(0, th * 0.5, td / 2);
  tray.add(ribbon);

  const slotG = new THREE.Group();
  slotG.position.y = t;
  tray.add(slotG);
  const inW = tw - 2 * t - 1 * mm;
  const inD = td - 2 * t - 1 * mm;
  const insH = holds ? holds.depth : 8 * mm;
  const insert = new THREE.Mesh(insertGeometry(inW, inD, insH, holds?.slots ?? []), k.insert(insertKind));
  slotG.add(insert);

  const baseY = T + gap;
  const apply = (p: number) => {
    tray.position.set(0, baseY, closedZ + 0.62 * D * smooth(0, 1, p));
    return 1;
  };
  const explode = (x: number) => {
    if (x <= 0) return;
    const out = tray.position.z - closedZ;
    tray.position.z = closedZ + out + (1.04 * D - out) * springAt(x, 0);
    slotG.position.y = t + H * 0.7 * springAt(x, 1);
  };
  const S = spec;
  const pins = [
    pin(1, "外套", "Sleeve", `${S.w} × ${S.h} × ${S.d} mm，1.5 mm 灰板外裱印刷纸`, `${S.w} × ${S.h} × ${S.d} mm, 1.5 mm chipboard wrapped in printed paper`, sleeve, V(-W * 0.2, H, D * 0.1), V(0, 1, 0)),
    pin(2, "抽屉", "Tray", `${mmOf(tw)} × ${mmOf(th)} × ${mmOf(td)} mm，每边留 ${mmOf(gap)} mm 滑动间隙`, `${mmOf(tw)} × ${mmOf(th)} × ${mmOf(td)} mm, ${mmOf(gap)} mm sliding clearance each side`, tray, V(tw * 0.3, th * 0.5, td / 2), V(0, 0, 1)),
    pin(3, "拉带", "Ribbon pull", "丝带拉环，拉出抽屉", "ribbon loop to pull the tray out", ribbon, V(0, 3 * mm, 7 * mm), V(0, 0, 1)),
    pin(4, "内托", "Insert", holds ? `高 ${mmOf(insH)} mm，按产品开孔` : "植绒垫", holds ? `${mmOf(insH)} mm high, cut to each product` : "flocked pad", insert, V(inW * 0.36, insH, inD * 0.3), V(0, 1, 0)),
  ];
  return { root, apply, explode, pins, slot: { parent: slotG, y: holds ? 0 : insH } };
}

/* ================================================================ Book-style magnetic box */

/**
 * Rigid book box: the base sits inside a cover (bottom board, spine, lid) and a front flap
 * hinged to the lid closes over the base on magnets. Opens like a hardback.
 */
export function buildBookBox(spec: PackSpec, k: Kit, holds?: Holds, insertKind: InsertKind = "velvet"): Built {
  const W = spec.w * U;
  const H = spec.h * U;
  const D = spec.d * U;
  const T = 2 * mm;
  const L = k.lining;
  const P = k.plain();
  const root = new THREE.Group();
  const cover = new THREE.Group();
  root.add(cover);
  cover.add(slab(W, T, D - T, [P, P, L, k.tex("bottom", spec.w, spec.d), P, P], 0, T / 2, T / 2));
  cover.add(slab(W, H - T, T, [P, P, P, P, L, k.tex("bandPlain", spec.w, spec.h)], 0, (H - T) / 2, -D / 2 + T / 2));

  // base tray inside the cover
  const g = 1.5 * mm;
  const bw = W - 2 * g;
  const bd = D - 2 * T - 2 * g;
  const bh = H - 2 * T - 0.6 * mm;
  const bt = 1.5 * mm;
  const base = new THREE.Group();
  base.position.set(0, T, 0);
  root.add(base);
  base.add(slab(bw, bt, bd, [P, P, L, P, P, P], 0, bt / 2, 0));
  base.add(slab(bw, bh - bt, bt, [P, P, P, P, P, L], 0, bt + (bh - bt) / 2, bd / 2 - bt / 2));
  base.add(slab(bw, bh - bt, bt, [P, P, P, P, L, P], 0, bt + (bh - bt) / 2, -bd / 2 + bt / 2));
  for (const s of [-1, 1]) base.add(slab(bt, bh - bt, bd - 2 * bt, s > 0 ? [P, L, P, P, P, P] : [L, P, P, P, P, P], s * (bw / 2 - bt / 2), bt + (bh - bt) / 2, 0));
  const slotG = new THREE.Group();
  slotG.position.y = bt;
  base.add(slotG);
  const inW = bw - 2 * bt - 1 * mm;
  const inD = bd - 2 * bt - 1 * mm;
  const insH = holds ? holds.depth : Math.min(bh * 0.35, 20 * mm);
  const insert = new THREE.Mesh(insertGeometry(inW, inD, insH, holds?.slots ?? []), k.insert(insertKind));
  slotG.add(insert);

  // lid hinged at the spine's top, and the front flap hinged at the lid's front edge
  const lid = new THREE.Group();
  lid.position.set(0, H, -D / 2);
  cover.add(lid);
  lid.add(slab(W, T, D, [P, P, k.tex("front", spec.w, spec.d), L, P, P], 0, -T / 2, D / 2));
  const flapH = H - 2 * T;
  const flap = new THREE.Group();
  flap.position.set(0, -T, D);
  lid.add(flap);
  flap.add(slab(W, flapH, T, [P, P, P, P, k.tex("band", spec.w, flapH / U), L], 0, -flapH / 2, -T / 2));

  const apply = (p: number) => {
    flap.rotation.x = -90 * RAD * smooth(0, 0.45, p);
    lid.rotation.x = -108 * RAD * smooth(0.35, 1, p);
    return 1;
  };
  const explode = (x: number) => {
    if (x > 0) flap.rotation.x = Math.min(flap.rotation.x, -90 * RAD * springAt(x, 0));
    lid.position.y = H + H * 0.9 * springAt(x, 0);
    slotG.position.y = bt + H * 0.8 * springAt(x, 1);
  };
  const S = spec;
  const pins = [
    pin(1, "翻盖", "Lid", `${S.w} × ${S.d} mm，2 mm 灰板外裱印刷纸`, `${S.w} × ${S.d} mm, 2 mm chipboard wrapped in printed paper`, lid, V(-W * 0.2, 0, D * 0.5), V(0, 1, 0)),
    pin(2, "前翻边", "Front flap", "内嵌磁铁，合上时吸住", "magnets inside hold it shut", flap, V(W * 0.25, -flapH * 0.5, 0), V(0, 0, 1)),
    pin(3, "书脊", "Spine", "连接底板与翻盖，像精装书一样开合", "joins the base board and lid, opening like a hardback", cover, V(W * 0.3, H * 0.5, -D / 2), V(0, 0, -1)),
    pin(4, "内盒", "Base tray", `${mmOf(bw)} × ${mmOf(bd)} × ${mmOf(bh)} mm，内裱纸`, `${mmOf(bw)} × ${mmOf(bd)} × ${mmOf(bh)} mm, paper-lined`, base, V(-bw * 0.3, bh, bd * 0.2), V(0, 1, 0)),
    pin(5, "内托", "Insert", holds ? `高 ${mmOf(insH)} mm，按产品开孔` : `高 ${mmOf(insH)} mm`, holds ? `${mmOf(insH)} mm high, cut to each product` : `${mmOf(insH)} mm high`, insert, V(inW * 0.36, insH, inD * 0.3), V(0, 1, 0)),
  ];
  return { root, apply, explode, pins, slot: { parent: slotG, y: holds ? 0 : insH } };
}

/* ================================================================ Paper tube */

/**
 * Composite paper tube: a printed paperboard body with a foil liner, a kraft neck glued inside
 * and standing proud, and a lid that slides over the neck flush with the body.
 */
export function buildPaperTube(spec: PackSpec, k: Kit, category: string): Built {
  const R = (spec.w / 2) * U;
  const H = spec.h * U;
  const T = 1.8 * mm;
  const lidH = Math.max(24 * mm, H * 0.28);
  const yBody = H - lidH;
  const circ = 2 * Math.PI * R;
  const root = new THREE.Group();
  const foil = k.bareMetal;
  const body = tubeWall(R - T, R, 0, yBody, k.tex("tinWrap", circ / U, yBody / U), foil, k.edge);
  root.add(body);
  const plug = new THREE.Mesh(new THREE.CylinderGeometry(R - T - 0.02 * mm, R - T - 0.02 * mm, T - 0.3 * mm, 96), foil);
  plug.position.y = 0.3 * mm + (T - 0.3 * mm) / 2;
  root.add(plug, disc(R - 0.05 * mm, 0.02 * mm, k.plain(), false));
  const nOut = R - T - 0.05 * mm;
  const nIn = nOut - 1.2 * mm;
  const neck = tubeWall(nIn, nOut, yBody - 12 * mm, H - T - 0.6 * mm, k.kraft, k.kraft, k.edge);
  root.add(neck);
  // contents: tea leaves (or whatever the category holds) part-filled
  const fillY = Math.min(yBody * 0.7, yBody - 14 * mm);
  const fill = new THREE.Mesh(new THREE.CylinderGeometry(R - T - 0.3 * mm, R - T - 0.3 * mm, fillY - T, 96), k.fill(category === "cosmetics" ? "cream" : "dry"));
  fill.position.y = T + (fillY - T) / 2;
  root.add(fill);

  const lid = new THREE.Group();
  lid.position.y = yBody;
  root.add(lid);
  const lIn = R - T + 0.35 * mm;
  const lidWall = tubeWall(lIn, R, 0.5 * mm, lidH - T, k.tex("band", circ / U, lidH / U), k.kraft, k.edge);
  lid.add(lidWall);
  // cylinder groups: side, top, bottom
  const cap = splitMesh(new THREE.CylinderGeometry(R, R, T, 128), [k.plain(), k.tex("tinCap", spec.w, spec.w), k.kraft]);
  cap.position.y = lidH - T / 2;
  lid.add(cap);

  const open = V(R * 2.2, R * 0.98, R * 0.4);
  const apply = (p: number) => {
    liftOff(lid, p, yBody, lidH + 6 * mm, open, new THREE.Euler(72 * RAD, -0.35, 0));
    return 1;
  };
  const explode = (x: number) => {
    lid.position.y += H * 0.55 * springAt(x, 0);
  };
  const S = spec;
  const pins = [
    pin(1, "筒盖", "Lid", `Ø${S.w} × ${mmOf(lidH)} mm，与筒身平齐`, `Ø${S.w} × ${mmOf(lidH)} mm, flush with the body`, lid, V(R * 0.3, lidH, R * 0.3), V(0, 1, 0)),
    pin(2, "筒身", "Body", `Ø${S.w} × ${mmOf(yBody)} mm，${mmOf(T)} mm 纸板卷制，外裱印刷纸`, `Ø${S.w} × ${mmOf(yBody)} mm, ${mmOf(T)} mm spiral-wound board, printed wrap`, body, V(0, yBody * 0.45, R), V(0, 0, 1)),
    pin(3, "内颈", "Neck", "牛皮纸内颈高出筒身，盖子套在上面", "a kraft neck stands proud of the body; the lid slides over it", neck, V(0, yBody + 6 * mm, nOut), V(0, 0, 1)),
    pin(4, "铝箔内衬", "Foil liner", "防潮阻氧，茶叶常用", "keeps out moisture and oxygen, as tea needs", body, V(0, yBody * 0.8, -(R - T)), V(0, 0, 1), true),
  ];
  return { root, apply, explode, pins, turn: 18 };
}

/* ================================================================ Carrier bag */

/** Paper carrier bag: printed front and back, inward-folded side gussets, a base card, rope handles. */
export function buildBag(spec: PackSpec, k: Kit, a: ArtInput): Built {
  const W = spec.w * U;
  const H = spec.h * U;
  const D = spec.d * U;
  const t = 0.35 * mm;
  const I = k.inside;
  const E = k.edge;
  const root = new THREE.Group();
  const front = slab(W, H, t, [E, E, E, E, k.tex("front", spec.w, spec.h), I], 0, H / 2, D / 2 - t / 2);
  const back = slab(W, H, t, [E, E, E, E, I, k.tex("back", spec.w, spec.h)], 0, H / 2, -D / 2 + t / 2);
  root.add(front, back);
  const inset = D * 0.16;
  const sides: THREE.Group[] = [];
  const gussetMat = k.tex("bandPlain", spec.d / 2, spec.h);
  for (const s of [-1, 1]) {
    const side = new THREE.Group();
    for (const zs of [1, -1]) {
      const x0 = s * (W / 2 - t);
      const z0 = zs * (D / 2 - t);
      const x1 = s * (W / 2 - inset);
      const dx = x1 - x0;
      const dz = -z0;
      const len = Math.hypot(dx, dz);
      const g = new THREE.Group();
      g.position.set((x0 + x1) / 2, H / 2, z0 / 2);
      g.rotation.y = Math.atan2(-dz, dx);
      // the outer face is the one whose normal points away from the bag's centre
      const outerIsPlusZ = s * Math.sin(g.rotation.y) > 0;
      const pz = box(len, H, t, outerIsPlusZ ? [E, E, E, E, gussetMat, I] : [E, E, E, E, I, gussetMat]);
      g.add(pz);
      side.add(g);
    }
    sides.push(side);
    root.add(side);
  }
  const card = slab(W - 2 * t - 0.4 * mm, 1.2 * mm, D - 2 * t - 0.4 * mm, [I, I, I, I, I, I], 0, 0.6 * mm + 0.2 * mm, 0);
  root.add(card);

  // rope handles: from a grommet below the top edge, out, up and over; each leans its own way
  const roles = rolesOf(a.d);
  const ring = k.anodised(roles.key);
  const handles: THREE.Group[] = [];
  const hx = Math.min(W * 0.2, 60 * mm);
  const hh = Math.min(H * 0.32, 110 * mm);
  for (const zs of [1, -1]) {
    const hg = new THREE.Group();
    const z0 = zs * (D / 2 + 2 * mm);
    const curve = new THREE.CatmullRomCurve3([
      V(-hx, H - 25 * mm, zs * (D / 2 - 1.5 * mm)),
      V(-hx, H - 25 * mm, z0),
      V(-hx * 1.04, H + 4 * mm, z0 + zs * 0.5 * mm),
      V(-hx * 0.75, H + hh * 0.75, zs * D * 0.36),
      V(0, H + hh, zs * D * 0.3),
      V(hx * 0.75, H + hh * 0.75, zs * D * 0.36),
      V(hx * 1.04, H + 4 * mm, z0 + zs * 0.5 * mm),
      V(hx, H - 25 * mm, z0),
      V(hx, H - 25 * mm, zs * (D / 2 - 1.5 * mm)),
    ]);
    hg.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 160, 2.4 * mm, 10, false), k.rope));
    for (const sx of [-1, 1]) {
      const g = new THREE.Mesh(new THREE.TorusGeometry(3.4 * mm, 0.9 * mm, 10, 32), ring);
      g.position.set(sx * hx, H - 25 * mm, zs * (D / 2 + 0.6 * mm));
      hg.add(g);
    }
    handles.push(hg);
    root.add(hg);
  }

  const apply = () => 1;
  const explode = (x: number) => {
    const f = springAt(x, 0);
    front.position.z = D / 2 - t / 2 + D * 0.9 * f;
    handles[0].position.z = D * 0.9 * f;
    back.position.z = -D / 2 + t / 2 - D * 0.9 * f;
    handles[1].position.z = -D * 0.9 * f;
    sides[0].position.x = -W * 0.22 * springAt(x, 1);
    sides[1].position.x = W * 0.22 * springAt(x, 1);
    for (const h of handles) h.position.y = H * 0.12 * springAt(x, 2);
  };
  const S = spec;
  const pins = [
    pin(1, "正面", "Front", `${S.w} × ${S.h} mm，157–250 g 铜版纸或牛皮纸印刷`, `${S.w} × ${S.h} mm, 157–250 g art paper or kraft, printed`, front, V(-W * 0.2, H * 0.3, t), V(0, 0, 1)),
    pin(2, "侧面风琴折", "Side gusset", `展开 ${S.d} mm，向内折，袋子可以压平`, `${S.d} mm deep, folded inward so the bag flattens`, sides[1], V(W / 2 - inset / 2, H * 0.5, D * 0.2), V(1, 0, 0)),
    pin(3, "绳提手", "Rope handle", "棉绳或纸绳，金属扣眼加固", "cotton or paper rope, reinforced with metal grommets", handles[0], V(0, H + hh, D * 0.3), V(0, 1, 0)),
    pin(4, "底板", "Base card", "硬卡垫底，袋子站得稳", "a stiff card in the base so the bag stands", card, V(W * 0.3, 1.2 * mm, D * 0.2), V(0, 1, 0), true),
  ];
  return { root, apply, explode, pins };
}
