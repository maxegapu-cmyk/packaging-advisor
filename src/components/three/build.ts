/**
 * Builds the package for a spec: one form, or a combination (products packed in an outer
 * pack). Every result is wrapped so that, in any pose, no part goes below the floor, and so
 * the camera frames what is actually there.
 */
import * as THREE from "three";
import { comboLayout, FORM_LABELS, isOuter, isRound, type PackSpec } from "@/lib/pack";
import type { ArtInput } from "./art";
import { boxIn, smooth, springAt, U, type Built, type Holds, type Pin, type Slot } from "./common";
import { buildCarton, buildGift, buildTin } from "./forms";
import { buildBag, buildBookBox, buildDrawer, buildMailer, buildPaperTube } from "./forms-paper";
import { buildBottle, buildCeramic, buildGlassBottle, buildJar, buildPouch, buildTube } from "./forms-round";
import { buildAseptic, buildBlister, buildCan, buildWoodBox } from "./forms-more";
import type { InsertKind, Kit } from "./kit";
import { fillWords, materialWords } from "@/lib/materials";
import { buildBrocade } from "./forms-song";

export type BuildCtx = { spec: PackSpec; kit: Kit; art: ArtInput; maxTex: number; own: { dispose: () => void }[]; category: string };

/** Puts the picked materials' names into the pins' text ("{wrap}" → "单面铜版纸"). */
function named(pins: Pin[], c: BuildCtx, prefix = ""): Pin[] {
  const w = materialWords(c.spec, c.category, prefix);
  const zh = Object.fromEntries(Object.entries(w).map(([k, v]) => [k, v.zh]));
  const en = Object.fromEntries(Object.entries(w).map(([k, v]) => [k, v.en]));
  return pins.map((p) => ({ ...p, label: { zh: fillWords(p.label.zh, zh), en: fillWords(p.label.en, en) }, detail: { zh: fillWords(p.detail.zh, zh), en: fillWords(p.detail.en, en) } }));
}

/** Outer packs that hold their products in an insert (the rest show them beside). */
const SLOTTED = new Set(["gift", "bookBox", "mailer", "drawer", "woodBox", "brocade"]);

function single(spec: PackSpec, c: BuildCtx, holds?: Holds, insert?: InsertKind): Built {
  const k = c.kit;
  switch (spec.form) {
    case "carton":
      return buildCarton(spec, k);
    case "gift":
      return buildGift(spec, k, holds, insert);
    case "bookBox":
      return buildBookBox(spec, k, holds, insert);
    case "mailer":
      return buildMailer(spec, k, holds, insert);
    case "drawer":
      return buildDrawer(spec, k, holds, insert);
    case "paperTube":
      return buildPaperTube(spec, k, c.category);
    case "bag":
      return buildBag(spec, k, c.art);
    case "pouch":
      return buildPouch(spec, k, c.own);
    case "bottle":
      return buildBottle(spec, k, c.art);
    case "tube":
      return buildTube(spec, k, c.art);
    case "jar":
      return buildJar(spec, k, c.art, c.category);
    case "glassBottle":
      return buildGlassBottle(spec, k, c.art, c.category);
    case "ceramic":
      return buildCeramic(spec, k, c.art, c.category);
    case "tin":
      return buildTin(spec, k, c.art, c.maxTex, c.own);
    case "can":
      return buildCan(spec, k, c.art);
    case "blister":
      return buildBlister(spec, k);
    case "aseptic":
      return buildAseptic(spec, k, c.art);
    case "woodBox":
      return buildWoodBox(spec, k, holds, insert);
    case "brocade":
      return buildBrocade(spec, k, holds, insert);
  }
}

type Placed = { b: Built; hold: THREE.Group; orient: THREE.Group; stand: THREE.Vector3; lie: THREE.Vector3; standW: number };

const Q_ID = new THREE.Quaternion();
// lying: front face up, length along x
const Q_LIE = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, Math.PI / 2, 0, "YXZ"));

/** Offset that puts the oriented product's footprint centre at the origin and its base on y = 0. */
function offsetFor(p: { orient: THREE.Group; hold: THREE.Group }, q: THREE.Quaternion): THREE.Vector3 {
  p.orient.quaternion.copy(q);
  p.orient.position.set(0, 0, 0);
  const bx = boxIn(p.orient, p.hold);
  const c = bx.getCenter(new THREE.Vector3());
  return new THREE.Vector3(-c.x, -bx.min.y, -c.z);
}

function combo(c: BuildCtx): Built {
  const spec = c.spec;
  const L = comboLayout(spec)!;
  const inner = spec.inner!;
  // the outer pack keeps its parts' picks, so its board is drawn at the stock's thickness
  const outerSpec: PackSpec = { form: spec.form, w: L.outer.w, h: L.outer.h, d: L.outer.d, finish: spec.finish, effects: spec.effects, materials: spec.materials };
  const n = L.n;
  const fw = L.foot.w * U;
  const fd = L.foot.d * U;
  const fh = L.foot.h * U;
  const gap = L.gap * U;
  const round = isRound(inner.form);
  const slotted = SLOTTED.has(spec.form);
  const slots: Slot[] = Array.from({ length: n }, (_, i) => ({
    x: (i - (n - 1) / 2) * (fw + gap),
    z: 0,
    w: fw,
    d: fd,
    kind: L.lying ? (round ? "stadium" : "rect") : round ? "circle" : "rect",
  }));
  const depth = Math.max(8 * U, Math.min(fh * (L.lying ? 0.6 : 0.42), outerSpec.h * U * 0.6));
  const insert: InsertKind = inner.insert ?? (spec.form === "mailer" ? "pulp" : "velvet");
  const outer = single(outerSpec, c, slotted ? { slots, depth } : undefined, insert);

  const root = new THREE.Group();
  const content = new THREE.Group();
  root.add(content);
  content.add(outer.root);
  const innerSpec: PackSpec = { form: inner.form, w: inner.w, h: inner.h, d: inner.d, finish: spec.finish, effects: spec.effects };
  const products: Placed[] = [];
  for (let i = 0; i < n; i++) {
    const b = single(innerSpec, c);
    const hold = new THREE.Group();
    const orient = new THREE.Group();
    hold.add(orient);
    orient.add(b.root);
    content.add(hold);
    b.apply(0);
    b.explode(0);
    const pl = { b, hold, orient, stand: new THREE.Vector3(), lie: new THREE.Vector3(), standW: 0 };
    pl.stand = offsetFor(pl, Q_ID);
    pl.lie = offsetFor(pl, Q_LIE);
    orient.quaternion.copy(Q_ID);
    const sb = boxIn(orient, hold);
    pl.standW = sb.max.x - sb.min.x;
    products.push(pl);
  }

  const outerH = outerSpec.h * U;
  // products fly over the walls, and over a hinged lid while it swings up (mailer, book box)
  const hinged = spec.form === "mailer" || spec.form === "bookBox";
  const arc = Math.max(outerH * 1.45, hinged ? outerH + outerSpec.d * U : 0) + 12 * U;
  let p = 0;
  const tmp = new THREE.Vector3();
  const rel = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const apply = (pp: number) => {
    p = pp;
    return outer.apply(pp);
  };
  const explode = (x: number) => {
    outer.explode(x);
    content.position.x = 0;
    // beside the outer pack, standing on the floor
    const ob = boxIn(outer.root, content);
    let bx = ob.max.x + 22 * U;
    // in the insert (slotted packs, once open)
    const t = slotted ? smooth(0.35, 1, p) : 0;
    const sl = outer.slot;
    if (sl) rel.copy(content.matrixWorld).invert().multiply(sl.parent.matrixWorld);
    products.forEach((pl, i) => {
      const besideX = bx + pl.standW / 2;
      bx += pl.standW + 14 * U;
      const from = tmp.set(besideX, 0, 0).clone();
      let to = from;
      if (sl && t > 0) to = new THREE.Vector3(slots[i].x, sl.y, slots[i].z).applyMatrix4(rel);
      const h = smooth(0, 0.75, t);
      const pos = from.clone().lerp(to, h);
      pos.y = from.y + (to.y - from.y) * t + Math.sin(Math.PI * t) * arc;
      pos.y += fh * 0.9 * springAt(x, 3 + i);
      pl.hold.position.copy(pos);
      const r = L.lying ? smooth(0.1, 0.7, t) : 0;
      q.copy(Q_ID).slerp(Q_LIE, r);
      pl.orient.quaternion.copy(q);
      pl.orient.position.copy(pl.stand).lerp(pl.lie, r);
    });
    // keep the whole set centred on the turntable
    const all = boxIn(content, root);
    content.position.x = -(all.min.x + all.max.x) / 2;
  };

  const label = FORM_LABELS[inner.form];
  const first = named(products[0].b.pins, c, "inner.");
  const off = outer.pins.length;
  const pins: Pin[] = [
    ...named(outer.pins, c),
    ...first.map((pn) => ({ ...pn, n: pn.n + off, label: { zh: `${label.zh}·${pn.label.zh}`, en: `${label.en}: ${pn.label.en}` } })),
  ];
  return { root, apply, explode, pins, staged: outer.staged, stages: outer.stages, lines: outer.lines };
}

/** The package for a spec, wrapped to rest on the floor and framed from its real extent. */
export function buildForm(c: BuildCtx): Built {
  const b = c.spec.inner && isOuter(c.spec.form) ? combo(c) : (() => {
    const one = single(c.spec, c);
    return { ...one, pins: named(one.pins, c) };
  })();
  const holder = new THREE.Group();
  holder.add(b.root);
  const bx = new THREE.Box3();
  return {
    ...b,
    root: holder,
    explode: (x: number) => {
      b.explode(x);
      holder.position.y = 0;
      const low = boxIn(b.root, holder, bx).min.y;
      if (Number.isFinite(low) && low < 0.0002) holder.position.y = 0.0002 - low;
    },
    frame: (p: number, x: number) => {
      if (b.frame) {
        const f = b.frame(p, x);
        return { r: f.r, y: f.y + holder.position.y };
      }
      boxIn(b.root, holder, bx);
      const ax = Math.max(Math.abs(bx.min.x), Math.abs(bx.max.x));
      const az = Math.max(Math.abs(bx.min.z), Math.abs(bx.max.z));
      const r = 0.5 * Math.max(bx.max.y - bx.min.y, Math.hypot(2 * ax, 2 * az) * 0.92) * 1.04;
      return { r, y: (bx.min.y + bx.max.y) / 2 + holder.position.y };
    },
  };
}
