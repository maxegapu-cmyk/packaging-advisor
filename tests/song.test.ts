import assert from "node:assert/strict";
import test from "node:test";
import { hillRoleOf, rolesOf, sealRoleOf, type Roles } from "../src/lib/artwork";
import { LAYOUTS } from "../src/lib/board/schema";
import { galleryFor, GALLERIES, GALLERY_HINTS, GALLERY_LABELS, GALLERY_TONES } from "../src/lib/gallery";
import { EFFECTS, FINISHES, normalizePack, PRESSES, withEffect } from "../src/lib/pack";
import { printLayout } from "../src/lib/print/layout";
import { SAMPLES } from "../src/lib/samples";

const roles = (ground: string, ink: string, key: string, accent: string): Roles => ({ ground, ink, key, accent });

test("seals take the colour nearest cinnabar; hills are blue-green only on a green or blue key", () => {
  // a red accent is the seal; a red key is too when the accent is not red
  assert.equal(sealRoleOf(roles("#F2EFE8", "#1E2320", "#2F6B4F", "#B23A2B")), "accent");
  assert.equal(sealRoleOf(roles("#F2EFE8", "#1E2320", "#9E2A2B", "#C9A14A")), "key");
  // no red anywhere: the key colour stands in
  assert.equal(sealRoleOf(roles("#F2EFE8", "#1E2320", "#2F6B4F", "#C9A14A")), "key");
  assert.equal(hillRoleOf(roles("#F2EFE8", "#1E2320", "#2F6B4F", "#C9A14A")), "key");
  assert.equal(hillRoleOf(roles("#F2EFE8", "#1E2320", "#2E5E8C", "#C9A14A")), "key");
  assert.equal(hillRoleOf(roles("#F2EFE8", "#1E2320", "#9E2A2B", "#C9A14A")), "ink");
  // a grey key is not green
  assert.equal(hillRoleOf(roles("#F2EFE8", "#1E2320", "#808580", "#C9A14A")), "ink");
});

test("the Song layouts are valid layouts, and three samples use them", () => {
  for (const l of ["scroll", "seal", "symmetric"]) assert.ok((LAYOUTS as readonly string[]).includes(l), l);
  const layoutOf = (id: string) => SAMPLES.find((s) => s.id === id)!.board.directions.find((d) => d.id === "A")!.layout;
  assert.equal(layoutOf("tea"), "scroll");
  assert.equal(layoutOf("beverage"), "symmetric");
  assert.equal(layoutOf("specialty"), "seal");
  for (const s of SAMPLES) for (const d of s.board.directions) assert.ok((LAYOUTS as readonly string[]).includes(d.layout), `${s.id} ${d.id}`);
});

test("galleries: three grounds, each labelled, recommended by category, form and palette", () => {
  assert.deepEqual([...GALLERIES], ["paper", "celadon", "ink"]);
  for (const g of GALLERIES) {
    assert.ok(GALLERY_LABELS[g].zh && GALLERY_LABELS[g].en && GALLERY_HINTS[g].zh && GALLERY_HINTS[g].en, g);
    assert.equal(GALLERY_TONES[g].dark, g === "ink");
  }
  const light = roles("#F2EFE8", "#1E2320", "#2F6B4F", "#B23A2B");
  assert.equal(galleryFor("cosmetics", light), "celadon");
  assert.equal(galleryFor("tea", light), "celadon");
  assert.equal(galleryFor("beverage", light), "ink");
  assert.equal(galleryFor("specialty", light, "gift"), "ink");
  assert.equal(galleryFor("specialty", light, "pouch"), "paper");
  assert.equal(galleryFor("snacks", light), "paper");
  // black packaging shows on ink whatever it is
  assert.equal(galleryFor("snacks", roles("#141414", "#F2EFE8", "#C9A14A", "#B23A2B")), "ink");
  // every sample gets one
  for (const s of SAMPLES) for (const d of s.board.directions) assert.ok(GALLERIES.includes(galleryFor(s.board.meta.category, rolesOf(d), s.pack.form)));
});

test("crafts: the new papers and pressings exist, and only one pressing is kept", () => {
  assert.ok(FINISHES.includes("xuan") && FINISHES.includes("goldFleck"));
  for (const e of ["deboss", "letterpress"] as const) assert.ok(EFFECTS.includes(e), e);
  let s = normalizePack({ form: "carton", w: 90, h: 160, d: 60, finish: "xuan" });
  s = withEffect(s, "goldFoil", true);
  s = withEffect(s, "emboss", true);
  s = withEffect(s, "deboss", true);
  assert.deepEqual(s.effects, ["goldFoil", "deboss"]);
  s = withEffect(s, "letterpress", true);
  assert.deepEqual(s.effects, ["goldFoil", "letterpress"]);
  assert.equal(s.effects!.filter((e) => PRESSES.includes(e)).length, 1);
  // a spec that arrives with two pressings keeps one
  const n = normalizePack({ form: "carton", w: 90, h: 160, d: 60, effects: ["emboss", "deboss", "spotUV"] });
  assert.equal(n.effects!.filter((e) => PRESSES.includes(e)).length, 1);
});

test("the brocade box prints only its title slip, sized to the lid and inside it", () => {
  for (const [w, h, d] of [[240, 96, 180], [160, 60, 120], [400, 140, 300]]) {
    const L = printLayout(normalizePack({ form: "brocade", w, h, d }));
    const panels = L.sheets.flatMap((s) => s.pieces.flatMap((p) => p.panels));
    assert.equal(panels.length, 1, `${w}×${d}`);
    const p = panels[0];
    assert.equal(p.kind, "slip");
    assert.equal(p.w, Math.round(Math.min(w * 0.18, 44)));
    assert.equal(p.h, Math.round(Math.min(Math.max(40, d * 0.66), d - 16)));
    // equal margins on the left and top and bottom: the slip fits on the lid
    assert.ok(p.h < d && (d - p.h) / 2 + p.w < w / 2, `${w}×${d}`);
  }
});
