/**
 * Package forms: each builder returns a Built (geometry, open motion, anatomy, framing).
 */
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { PackSpec } from "@/lib/pack";
import { drawSeal, fiberTexture, rolesOf, type ArtInput } from "./art";
import { box, boardPanel, insertGeometry, liftOff, mmOf, RAD, restOnFloor, splitMesh, springAt, tw, U, type Built, type Holds, type Pin } from "./common";
import type { InsertKind, Kit } from "./kit";

/** Tuck carton with hinged panels, staged fold (sides → back → flaps → top/bottom). */
export function buildCarton(spec: PackSpec, k: Kit): Built {
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
    // Unfolding, the bottom panel, its tuck and the dust flaps hang below the box; keep the
    // lowest point of the carton on the floor in every pose so nothing passes through it.
    restOnFloor(root, h / 2);
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
    restOnFloor(root, h / 2);
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
      return { r: (folded + (0.5 * Math.max(netW, netH) - folded) * (1 - fs)) * (1 + 0.18 * x), y: root.position.y + d * 0.25 * x };
    },
  };
}

/** Rigid lid-and-base gift box: 1.5 mm wrapped chipboard, lining, a velvet tray, cards. */
export function buildGift(spec: PackSpec, k: Kit, holds?: Holds, insertKind: InsertKind = "velvet"): Built {
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
  // the walls stand on the floor rather than through it: overlapping, their outer faces and the
  // floor's edges shared a plane and flickered against each other as the box turned. The
  // floor's edges carry the same wrap as the walls above them.
  const floor = rb(bw, T, bd, [sideLR, sideLR, L, k.tex("bottom", spec.w, spec.d), sideFB, sideFB]);
  floor.position.y = T / 2;
  const wh = bh - T;
  const wf = rb(bw, wh, T, [L, L, L, L, sideFB, L]);
  wf.position.set(0, T + wh / 2, bd / 2 - T / 2);
  const wb = rb(bw, wh, T, [L, L, L, L, L, sideFB]);
  wb.position.set(0, T + wh / 2, -bd / 2 + T / 2);
  const wl = rb(T, wh, bd - 2 * T, [L, sideLR, L, L, L, L]);
  wl.position.set(-bw / 2 + T / 2, T + wh / 2, 0);
  const wr = rb(T, wh, bd - 2 * T, [sideLR, L, L, L, L, L]);
  wr.position.set(bw / 2 - T / 2, T + wh / 2, 0);
  base.add(floor, wf, wb, wl, wr);

  // An insert holding the packed products, or (alone) a velvet tray with the inner pack and
  // the manual resting in it.
  const trayH = holds ? holds.depth : Math.min(bh * 0.45, 30 * U);
  const tw_ = bw - 2 * T - 0.002;
  const td_ = bd - 2 * T - 0.002;
  const tray = holds ? new THREE.Mesh(insertGeometry(tw_, td_, trayH, holds.slots), k.insert(insertKind)) : new THREE.Mesh(new RoundedBoxGeometry(tw_, trayH, td_, 3, 2 * U), k.velvet);
  tray.position.y = holds ? T : T + trayH / 2;
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
  if (!holds) base.add(inner, manual);
  // products stand on the base floor inside the insert's cut-outs, and rise with it in anatomy
  const slotG = new THREE.Group();
  base.add(slotG);

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
    slotG.position.y = H * 0.55 * springAt(x, 1);
    inner.position.y = rest.inner + H * 0.55 * springAt(x, 1) + H * 0.42 * springAt(x, 2);
    manual.position.y = rest.manual + H * 0.55 * springAt(x, 1) + H * 0.42 * springAt(x, 3);
  };
  const S = spec;
  const trayPin: Pin = holds
    ? { n: 3, label: { zh: "内托", en: "Insert" }, detail: { zh: `高 ${mmOf(trayH)} mm，按产品外形开孔，固定不晃动`, en: `${mmOf(trayH)} mm high, die-cut to each product so nothing moves` }, obj: tray, at: new THREE.Vector3(tw_ * 0.42, trayH, td_ * 0.38), normal: new THREE.Vector3(0, 1, 0) }
    : { n: 3, label: { zh: "内托", en: "Tray" }, detail: { zh: `高 ${mmOf(trayH)} mm，植绒，托住内容物`, en: `${mmOf(trayH)} mm high, flocked, holds the contents` }, obj: tray, at: new THREE.Vector3(bw * 0.38, trayH / 2, bd * 0.3), normal: new THREE.Vector3(0, 1, 0) };
  const pins: Pin[] = [
    { n: 1, label: { zh: "天盖", en: "Lid" }, detail: { zh: `${S.w} × ${S.d} × ${mmOf(lidH)} mm，1.5 mm 灰板外裱印刷纸`, en: `${S.w} × ${S.d} × ${mmOf(lidH)} mm, 1.5 mm chipboard wrapped in printed paper` }, obj: lid, at: new THREE.Vector3(W * 0.3, lidH, D * 0.2), normal: new THREE.Vector3(0, 1, 0) },
    { n: 2, label: { zh: "地盒", en: "Base" }, detail: { zh: `${mmOf(bw)} × ${mmOf(bd)} × ${mmOf(bh)} mm，比盖每边小 ${mmOf(T + gap)} mm，盖能顺滑套上`, en: `${mmOf(bw)} × ${mmOf(bd)} × ${mmOf(bh)} mm, ${mmOf(T + gap)} mm smaller per side so the lid slides on` }, obj: base, at: new THREE.Vector3(-bw * 0.25, bh * 0.45, bd / 2), normal: new THREE.Vector3(0, 0, 1) },
    trayPin,
    ...(holds ? [] : ([
    { n: 4, label: { zh: "内包装", en: "Inner pack" }, detail: { zh: `${mmOf(iw)} × ${mmOf(id)} mm，印品名与规格`, en: `${mmOf(iw)} × ${mmOf(id)} mm, printed with name and size` }, obj: inner, at: new THREE.Vector3(0, 0, 1.6 * U), normal: new THREE.Vector3(0, 0, 1) },
    { n: 5, label: { zh: "说明书", en: "Manual" }, detail: { zh: `${mmOf(mw)} × ${mmOf(md)} mm，编号步骤`, en: `${mmOf(mw)} × ${mmOf(md)} mm, numbered steps` }, obj: manual, at: new THREE.Vector3(0, md * 0.2, 0.6 * U), normal: new THREE.Vector3(0, 0, 1) },
    ] as Pin[])),
  ];
  return {
    root,
    apply,
    explode,
    pins,
    slot: { parent: slotG, y: T },
    frame: (p, x) => ({ r: closedR * (1 + 0.28 * p) * (1 + 0.35 * x), y: H / 2 + (D * 0.25) * p + H * 0.95 * x }),
  };
}

/** Round tin: tinplate body with rolled beads, printed wrap, lacquered printed lid, foil seal. */
export function buildTin(spec: PackSpec, k: Kit, a: ArtInput, maxTex: number, own: { dispose: () => void }[]): Built {
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
  const wrap = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.12 * mm, R + 0.12 * mm, labelH, SEG, 1, true, Math.PI, Math.PI * 2), k.tex("tinWrap", circ / U, labelH / U, "metal"));
  wrap.position.y = labelY0 + labelH / 2;
  wrap.castShadow = true;
  wrap.userData.wrap = { r: R + 0.12 * mm, arc: Math.PI * 2 };
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
  const capMat = k.tex("tinCap", spec.w, spec.w, "metal");
  capMat.metalness = Math.max(capMat.metalness, 0.25);
  capMat.roughness = Math.min(capMat.roughness, 0.3);
  capMat.clearcoat = 1;
  capMat.bumpMap = null;
  const cap = new THREE.Mesh(new THREE.CircleGeometry(LR - 2.5 * mm, SEG), capMat);
  cap.rotation.x = -Math.PI / 2;
  cap.position.y = lidH - 0.15 * mm;
  cap.userData.decal = { r: LR - 2.5 * mm };
  lid.add(cap);

  // Opened, the lid leans upright beside the tin, its printed top toward the camera.
  const closedY = H - lidH;
  const open = new THREE.Vector3(R * 2.15, LR * 0.95, R * 0.5);
  const apply = (p: number) => {
    liftOff(lid, p, closedY, lidH + 6 * mm, open, new THREE.Euler(72 * RAD, -0.35, 0));
    return 1;
  };
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
  // framed from its real extent (the lid rests beside the tin when open)
  return { root, apply, explode, pins, turn: 22 };
}
