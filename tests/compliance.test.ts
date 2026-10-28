import assert from "node:assert/strict";
import test from "node:test";
import { CATEGORY_PACK, normalizePack, type PackSpec } from "../src/lib/pack";
import { diffLibraries, freezeMaterials, normalizeLibrary, rulesFor, setLibrary, unfreezeMaterials, usesOf, withChoice } from "../src/lib/materials";
import { overpackChecks, voidLimit } from "../src/lib/compliance/overpack";
import { DEFAULT_LIMITS, normalizeLimits } from "../src/lib/compliance/limits";
import { coverage, coverageSummary, normalizeDocMeta, statusOf, type SupplierDoc } from "../src/lib/compliance/documents";

const tea = (content: PackSpec["content"]): PackSpec => normalizePack({ ...CATEGORY_PACK.tea, content });
const find = (spec: PackSpec, cat: string, id: string) => overpackChecks(spec, cat).find((x) => x.id === id)!;

test("void-ratio bands follow GB 23350: the larger one unit, the lower the limit", () => {
  setLibrary({});
  assert.deepEqual([0.5, 1, 3, 10, 20, 50, 51, 500].map((q) => voidLimit(q)), [85, 85, 70, 60, 50, 40, 30, 30]);
});

test("two 50 g tins of tea in the default gift box are over-packaged; the fitted box size is given", () => {
  setLibrary({});
  const v = find(tea({ net: 50, unit: "g" }), "tea", "void");
  // outer 238 × 146 × 142 mm = 4934.3 cm³; necessary space 13 × 50 × 2 = 1300 cm³
  assert.equal(v.level, "error");
  assert.match(v.title.zh, /73\.7%/);
  assert.match(v.title.zh, /40%/);
  assert.match(v.detail.zh, /不应超过 2,167 cm³/);
  // tea allows three layers: tin + gift box is two
  assert.equal(find(tea({ net: 50 }), "tea", "layers").level, "ok");
  assert.equal(find(tea({ net: 50, extraLayers: 2 }), "tea", "layers").level, "error");
  // cost: tea above 200 yuan is held to 15%
  assert.equal(find(tea({ net: 50, price: 300, packCost: 50 }), "tea", "cost").level, "error");
  assert.equal(find(tea({ net: 50, price: 150, packCost: 25 }), "tea", "cost").level, "ok");
  // mass: packaging at most 8 × the tea
  assert.equal(find(tea({ net: 50, totalMass: 900 }), "tea", "mass").level, "ok");
  assert.equal(find(tea({ net: 50, totalMass: 1000 }), "tea", "mass").level, "error");
});

test("without a net content or k the checks say what to enter; other categories skip GB 23350", () => {
  setLibrary({});
  assert.equal(find(tea(undefined), "tea", "void").level, "info");
  const lotion = normalizePack({ ...CATEGORY_PACK.cosmetics, content: { net: 100, unit: "mL" } });
  assert.equal(find(lotion, "cosmetics", "void").level, "info");
  assert.equal(find({ ...lotion, content: { net: 100, unit: "mL", kind: "lotion" } }, "cosmetics", "void").level !== "info", true);
  assert.ok(!overpackChecks(CATEGORY_PACK.electronics, "electronics").some((x) => x.rule === "G02"));
});

test("courier boxes: layers by item class, tape by size", () => {
  setLibrary({});
  const m = normalizePack({ ...CATEGORY_PACK.apparel, content: { courierExtra: 2 } });
  assert.equal(find(m, "apparel", "courierLayers").level, "error");
  assert.equal(find({ ...m, content: { courierClass: "fresh", courierExtra: 2 } }, "apparel", "courierLayers").level, "ok");
  // 300 × 80 × 240 → sum 620 ≤ 700: tape at most 3 × 620 = 1860 mm
  assert.match(find(m, "apparel", "tape").title.zh, /1,860/);
  assert.equal(find({ ...m, content: { tape: 2000 } }, "apparel", "tape").level, "error");
});

test("limits are editable in the library and validated", () => {
  const l = normalizeLimits({ cost: 18, voidBands: [{ upTo: null, limit: 25 }, { upTo: 10, limit: 50 }], kinds: [{ id: "nuts", label: { zh: "坚果", en: "Nuts" }, k: 4 }, { id: "bad id", label: { zh: "x" } }] })!;
  assert.equal(l.cost, 18);
  assert.deepEqual(l.voidBands, [{ upTo: 10, limit: 50 }, { upTo: null, limit: 25 }]);
  assert.deepEqual(l.kinds!.map((k) => k.id), ["nuts"]);
  setLibrary(normalizeLibrary({ limits: { cost: 18 } }));
  assert.equal(find(tea({ net: 50, price: 100, packCost: 19 }), "tea", "cost").level, "error");
  setLibrary({});
  assert.equal(DEFAULT_LIMITS.cost, 20);
});

test("a frozen pack keeps its library; the drift is reported", () => {
  setLibrary({});
  const live = normalizeLibrary({ materials: { M019: { name: { zh: "改名铜版纸", en: "Renamed" } } } });
  const f = freezeMaterials(CATEGORY_PACK.tea, {}, "proof OK");
  const back = normalizePack(JSON.parse(JSON.stringify(f)));
  assert.ok(back.frozen && back.frozen.note === "proof OK");
  const d = diffLibraries(back.frozen!.library, live);
  assert.deepEqual(d.materials, ["M019"]);
  assert.equal(unfreezeMaterials(back).frozen, undefined);
});

test("documents: coverage by part and rule, expiry, validation", () => {
  setLibrary({});
  const spec = CATEGORY_PACK.tea;
  const uses = usesOf(spec, "tea");
  const rules = rulesFor(spec, "tea", uses);
  const base = coverage(uses, rules, []);
  const body = base.find((r) => r.key === "inner.body" && r.rule === "F05")!;
  assert.equal(body.missing.length, 2);
  assert.ok(body.critical);
  const docs: SupplierDoc[] = [
    { id: "a", type: "declaration", title: "DoC", parts: ["inner.body"], materials: [], rules: [] },
    { id: "b", type: "test", title: "Migration", parts: [], materials: ["M099"], rules: ["F05"], expires: "2000-01-01" },
  ];
  const r = coverage(uses, rules, docs).find((x) => x.key === "inner.body" && x.rule === "F05")!;
  assert.equal(r.missing.length, 1, "the expired report doesn't count");
  assert.equal(r.expired.length, 1);
  assert.equal(statusOf({ ...docs[1], expires: "2999-01-01" }), "valid");
  assert.ok(coverageSummary(coverage(uses, rules, docs)).criticalGaps.length >= 1);
  assert.equal(normalizeDocMeta({ title: "" }), null);
  assert.deepEqual(normalizeDocMeta({ type: "nope", title: "X", parts: ["wrap", "bad key!"], expires: "2027-1-1" }), { type: "other", title: "X", parts: ["wrap"], materials: [], rules: [] });
  // a pack's own contact choice brings its own requirements
  const direct = withChoice(normalizePack({ ...spec }), "wrap", { contact: "direct" });
  assert.ok(coverage(usesOf(direct, "tea"), rulesFor(direct, "tea"), []).some((x) => x.key === "wrap" && x.rule.startsWith("F")));
});
