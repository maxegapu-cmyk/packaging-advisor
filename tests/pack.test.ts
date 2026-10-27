import assert from "node:assert/strict";
import test from "node:test";
import { CAN_OPEN, comboLayout, FORM_LABELS, FORM_NOTES, FORM_PRESET, FORMS, formatInner, formatSize, MATERIAL_GROUPS, normalizePack, outerSize } from "../src/lib/pack";

test("every form has a label, a note, a preset and a material group", () => {
  const grouped = MATERIAL_GROUPS.flatMap((g) => g.forms);
  for (const f of FORMS) {
    assert.ok(FORM_LABELS[f].zh && FORM_LABELS[f].en, f);
    assert.ok(FORM_NOTES[f].zh && FORM_NOTES[f].en, f);
    assert.equal(FORM_PRESET[f].form, f);
    assert.equal(grouped.filter((g) => g === f).length, 1, `${f} in exactly one group`);
  }
  assert.ok(!CAN_OPEN.includes("bag") && !CAN_OPEN.includes("pouch"));
});

test("a combination keeps a valid product only inside an outer pack", () => {
  const p = normalizePack({ form: "gift", w: 100, h: 100, d: 100, finish: "gloss", inner: { form: "jar", count: 2, w: 80, h: 95, insert: "pulp" } });
  assert.deepEqual(p.inner, { form: "jar", count: 2, w: 80, h: 95, d: 80, insert: "pulp" });
  // a jar can't hold a product, and unknown products are dropped
  assert.equal(normalizePack({ form: "jar", w: 80, h: 95, inner: { form: "tin" } }).inner, undefined);
  assert.equal(normalizePack({ form: "gift", w: 80, h: 95, d: 80, inner: { form: "sofa" } }).inner, undefined);
  // bad counts become 1, bad inserts are left out
  const q = normalizePack({ form: "mailer", w: 200, h: 80, d: 150, inner: { form: "pouch", count: 7, w: 140, h: 210, d: 70, insert: "gold" } });
  assert.equal(q.inner?.count, 1);
  assert.equal(q.inner?.insert, undefined);
});

test("the outer pack is sized to its products", () => {
  // two Ø86 tins standing in a gift box: 22 mm gaps, headroom and depth for the lid
  const gift = normalizePack({ form: "gift", w: 10, h: 10, d: 10, inner: { form: "tin", count: 2, w: 86, h: 120 } });
  const L = comboLayout(gift)!;
  assert.equal(L.lying, false);
  assert.deepEqual(outerSize(gift), { w: 2 * 86 + 3 * 22, h: 120 + 26, d: 86 + 56 });
  // a tall bottle lies down in a gift box, but stands in a carton
  const lying = comboLayout(normalizePack({ form: "gift", w: 10, h: 10, d: 10, inner: { form: "glassBottle", count: 1, w: 72, h: 230 } }))!;
  assert.equal(lying.lying, true);
  assert.deepEqual(lying.foot, { w: 230, d: 72, h: 72 });
  const carton = normalizePack({ form: "carton", w: 10, h: 10, d: 10, inner: { form: "bottle", count: 1, w: 52, h: 170 } });
  assert.deepEqual(outerSize(carton), { w: 56, h: 176, d: 56 });
  assert.equal(formatSize(carton), "56 × 176 × 56 mm");
  assert.equal(formatInner(carton), "1 × Ø52 × 170 mm");
  // two cans lie in a pine crate: 10 mm walls, a floor and a sliding lid on top
  const crate = comboLayout(normalizePack({ form: "woodBox", w: 10, h: 10, d: 10, inner: { form: "can", count: 2, w: 66, h: 115 } }))!;
  assert.equal(crate.lying, true);
  assert.deepEqual(crate.outer, { w: 2 * 115 + 3 * 22 + 20, h: 66 + 30, d: 66 + 64 });
});

test("finishes: a base plus combinable effects, one foil at most; old 'foil' packs still load", async () => {
  const { normalizePack, withEffect, foilOf, finishText, printLayoutNotes } = await import("../src/lib/pack").then(async (m) => ({ ...m, printLayoutNotes: (await import("../src/lib/print/layout")).printLayout }));
  const legacy = normalizePack({ form: "carton", w: 110, h: 150, d: 46, finish: "foil" });
  assert.equal(legacy.finish, "matte");
  assert.deepEqual(legacy.effects, ["goldFoil"]);
  let s = normalizePack({ form: "gift", w: 236, h: 146, d: 142, finish: "softTouch", effects: ["emboss", "silverFoil", "goldFoil", "nope", "spotUV"] });
  assert.equal(s.finish, "softTouch");
  assert.deepEqual(s.effects, ["silverFoil", "spotUV", "emboss"], "one foil kept, unknown dropped, canonical order");
  s = withEffect(s, "holo", true);
  assert.equal(foilOf(s), "holo");
  assert.deepEqual(s.effects, ["holo", "spotUV", "emboss"]);
  s = withEffect(s, "spotUV", false);
  assert.deepEqual(s.effects, ["holo", "emboss"]);
  assert.equal(finishText(s, "zh"), "触感膜 + 镭射 + 击凸");
  assert.equal(normalizePack({ form: "carton", w: 110, h: 150, d: 46, finish: "gloss" }).effects, undefined);
  const notes = printLayoutNotes(s).sheets[0].notes.map((n) => n.zh).join("|");
  assert.ok(/触感膜/.test(notes) && /镭射/.test(notes) && /击凸/.test(notes), notes);
});
