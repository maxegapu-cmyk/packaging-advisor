import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { CATEGORY_PACK, FORMS, FINISHES, INSERTS, normalizePack, type PackSpec } from "../src/lib/pack";
import {
  documentsFor,
  HANDMADE,
  lookOf,
  material,
  MATERIALS,
  materialLine,
  materialWords,
  offListOf,
  optionsFor,
  partsOf,
  pick,
  problemsOf,
  pruneMaterials,
  RULES,
  rulesFor,
  slotsOf,
  usesOf,
  withMaterial,
} from "../src/lib/materials";

const spec = (o: Partial<PackSpec>): PackSpec => normalizePack({ form: "carton", w: 110, h: 150, d: 46, finish: "matte", ...o });
const ids = (rules: { rule: { id: string } }[]) => rules.map((r) => r.rule.id);

test("the catalog is the principal's list: 168 materials, 23 rules, every row bilingual", () => {
  assert.equal(MATERIALS.length, 168);
  assert.equal(RULES.length, 23);
  assert.deepEqual(
    MATERIALS.map((m) => m.id),
    Array.from({ length: 168 }, (_, i) => `M${String(i + 1).padStart(3, "0")}`),
  );
  for (const m of MATERIALS) for (const k of ["name", "use", "notes", "boundary", "parts"] as const) assert.ok(m[k].zh && m[k].en, `${m.id} ${k}`);
  for (const r of RULES) for (const k of ["scope", "standard", "status", "needs", "docs"] as const) assert.ok(r[k].zh && r[k].en, `${r.id} ${k}`);
  // every rule a material points to exists
  const known = new Set(RULES.map((r) => r.id));
  for (const m of MATERIALS) for (const f of [...m.food, ...(m.special ?? [])]) assert.ok(known.has(f), `${m.id} → ${f}`);
  // the list's own words decide food use: grey-back board and flocked paper are not for food, white board can be
  assert.ok(material("M002")!.noFood);
  assert.ok(material("M036")!.noFood);
  assert.ok(!material("M001")!.noFood);
  assert.deepEqual(material("M154")!.food, ["F01", "F12"]);
  assert.deepEqual(material("M106")!.food, ["F01", "F04"]);
  assert.deepEqual(material("M108")!.food, ["F01", "F06"]);
});

test("every part of every structure is made of listed materials, with a default", () => {
  for (const form of FORMS) {
    const slots = slotsOf(form);
    assert.ok(slots.length, form);
    for (const s of slots) {
      assert.ok(s.options.length, `${form}.${s.id}`);
      for (const id of s.options) assert.ok(material(id), `${form}.${s.id} → ${id}`);
    }
  }
  for (const k of INSERTS) {
    const p = partsOf(spec({ form: "gift", inner: { form: "tin", count: 1, w: 80, h: 100, d: 80, insert: k } })).find((x) => x.key === "insert")!;
    for (const id of p.slot.options) assert.ok(material(id), `${k} → ${id}`);
  }
  // under every finish, each part still has something to be made of
  for (const form of FORMS) for (const f of FINISHES) for (const s of slotsOf(form)) assert.ok(optionsFor(s, f).length, `${form}.${s.id} ${f}`);
});

test("the finish decides a printed sheet: coated under film, specialty uncoated, xuan and gold-fleck are the handmade paper", () => {
  const wrap = slotsOf("gift").find((s) => s.id === "wrap")!;
  assert.deepEqual(optionsFor(wrap, "matte"), ["M019", "M020"]);
  assert.ok(!optionsFor(wrap, "paper").includes("M019"));
  assert.deepEqual(optionsFor(wrap, "xuan"), [HANDMADE]);
  assert.deepEqual(optionsFor(wrap, "goldFleck"), [HANDMADE]);
  // a pick that no longer fits the finish falls back to the default
  const s = spec({ form: "gift", finish: "matte", materials: { wrap: "M020" } });
  assert.equal(pick(s, "wrap", wrap), "M020");
  assert.equal(pick({ ...s, finish: "paper" }, "wrap", wrap), optionsFor(wrap, "paper")[0]);
  // a xuan carton is white board faced with the handmade paper; a xuan gift box's wrap is the paper
  const carton = usesOf(spec({ form: "carton", finish: "xuan" }), "tea");
  assert.equal(carton.find((u) => u.key === "body")!.id, "M001");
  assert.equal(carton.find((u) => u.key === "process.facing")!.id, HANDMADE);
  assert.equal(usesOf(spec({ form: "gift", finish: "xuan" }), "tea").find((u) => u.key === "wrap")!.note!.zh, "宣纸");
  // film lamination only on laminated paper
  assert.ok(usesOf(spec({ form: "carton", finish: "gloss" }), "other").some((u) => u.id === "M053"));
  assert.ok(!usesOf(spec({ form: "carton", finish: "paper" }), "other").some((u) => u.id === "M053"));
  assert.ok(!usesOf(spec({ form: "tin", w: 86, h: 120, d: 86, finish: "matte" }), "tea").some((u) => u.id === "M053"));
});

test("picks are validated and kept small: unknown or default picks drop away", () => {
  const n = normalizePack({ form: "gift", w: 200, h: 80, d: 150, finish: "matte", materials: { wrap: "M020", core: "M999", "bad key": "M001", insert: "nope", "inner.body": "M100" } });
  assert.deepEqual(n.materials, { wrap: "M020", core: "M999" });
  // inner picks only with an inner product
  const p = pruneMaterials(n);
  assert.deepEqual(p.materials, { wrap: "M020" });
  const back = withMaterial(p, "wrap", "M019");
  assert.equal(back.materials, undefined);
  const combo = withMaterial(spec({ form: "gift", w: 200, h: 80, d: 150, inner: { form: "tin", count: 2, w: 80, h: 100, d: 80 } }), "inner.body", "M101");
  assert.deepEqual(combo.materials, { "inner.body": "M101" });
  assert.equal(usesOf(combo, "tea").find((u) => u.key === "inner.body")!.id, "M101");
});

test("rules follow category, contact and use", () => {
  // tea in tins in a gift box: the tins touch the tea, the box does not
  const tea = CATEGORY_PACK.tea;
  const r = rulesFor(tea, "tea");
  const got = ids(r);
  for (const id of ["G01", "G02", "F01", "F05", "F08"]) assert.ok(got.includes(id), id);
  assert.ok(!got.includes("C01") && !got.includes("G03") && !got.includes("P01"));
  const f05 = r.find((x) => x.rule.id === "F05")!;
  assert.ok(f05.by.every((k) => k.startsWith("inner.")), f05.by.join());
  // the gift box's wrap brings G01 only
  assert.ok(!r.some((x) => x.rule.id.startsWith("F") && x.by.includes("wrap")));
  // a pump bottle of lotion: C01 on the bottle and pump, not the label
  const c = rulesFor(CATEGORY_PACK.personalCare, "personalCare");
  const c01 = c.find((x) => x.rule.id === "C01")!;
  assert.ok(c01.by.includes("body") && c01.by.includes("pump") && !c01.by.includes("label"));
  assert.ok(!ids(c).some((id) => id.startsWith("F")));
  // a mailer for apparel ships by courier: G03, G04, and P01 is not a plastics question here
  const m = ids(rulesFor(CATEGORY_PACK.apparel, "apparel"));
  assert.ok(m.includes("G03") && m.includes("G04"));
  assert.ok(!m.includes("G02"));
  // a paper bag is a shopping bag: P01 from the bag paper's path
  assert.ok(ids(rulesFor(spec({ form: "bag", w: 260, h: 320, d: 110 }), "apparel")).includes("P01"));
  // glass for food is F04, porcelain F06, a cork stopper F09
  const bev = ids(rulesFor(spec({ form: "glassBottle", w: 72, h: 230, d: 72 }), "beverage"));
  assert.ok(bev.includes("F04") && bev.includes("F09"));
  assert.ok(ids(rulesFor(spec({ form: "ceramic", w: 90, h: 120, d: 90 }), "tea")).includes("F06"));
  // printing ink on a snack pouch is food-related (F13); on a gift box around tins it is not
  const snacks = rulesFor(CATEGORY_PACK.snacks, "snacks");
  assert.ok(snacks.find((x) => x.rule.id === "F13")?.by.includes("process.ink"));
  assert.ok(!(r.find((x) => x.rule.id === "F13")?.by ?? []).includes("process.ink"));
  assert.ok(r.find((x) => x.rule.id === "F13")?.by.includes("inner.process.ink"), "the tins' own print is");
});

test("problems: a non-food material on a food-contact part is an error", () => {
  assert.deepEqual(problemsOf(usesOf(CATEGORY_PACK.tea, "tea")), []);
  // the default parts of every category's starting pack break no limit of the list
  for (const [cat, s] of Object.entries(CATEGORY_PACK)) assert.deepEqual(problemsOf(usesOf(s, cat)), [], cat);
  const bad = usesOf(spec({ form: "tin", w: 86, h: 120, d: 86 }), "tea").map((u) => (u.key === "seal" ? { ...u, m: material("M036")!, id: "M036" } : u));
  const p = problemsOf(bad);
  assert.equal(p.length, 1);
  assert.equal(p[0].level, "error");
});

test("off-list parts are named, not swapped", () => {
  assert.deepEqual(offListOf({ form: "bookBox" }).map((x) => x.id), ["magnets"]);
  assert.deepEqual(offListOf({ form: "carton", effects: ["goldFoil", "emboss"] }).map((x) => x.id), ["foil"]);
  assert.deepEqual(offListOf({ form: "carton", effects: ["spotUV"] }), []);
  // the brocade box's clasp is a listed material now (ABS by default), not bone
  const b = usesOf(spec({ form: "brocade", w: 240, h: 96, d: 180 }), "tea");
  assert.equal(b.find((u) => u.key === "toggle")!.id, "M069");
});

test("documents and the print line name each material once", () => {
  const u = usesOf(CATEGORY_PACK.tea, "tea");
  const docs = documentsFor(u);
  const all = docs.flatMap((d) => d.ids);
  assert.equal(new Set(all).size, all.length);
  const line = materialLine(spec({ form: "gift", w: 200, h: 80, d: 150, finish: "xuan" }), "tea", false);
  assert.match(line.zh, /灰纸板 M016/);
  assert.match(line.zh, /手工装饰纸（宣纸） M038/);
  assert.match(line.en, /Handmade decorative paper \(xuan paper\) M038/);
});

test("3D looks and pin words follow the picks", () => {
  assert.deepEqual(lookOf(spec({})).board, { inside: "#D9D4C8", edge: "#ECE7DC" });
  assert.equal(lookOf(spec({ materials: { body: "M002" } })).board!.inside, "#9C988F");
  assert.equal(lookOf(spec({ form: "brocade", w: 240, h: 96, d: 180, materials: { toggle: "M111" } })).toggle!.color, "#5C3B26");
  assert.equal(lookOf(spec({ form: "paperTube", w: 80, h: 140, d: 80, materials: { liner: "M094" } })).liner, "paper");
  const w = materialWords(spec({ form: "gift", w: 200, h: 80, d: 150, finish: "matte", materials: { wrap: "M020" } }), "tea");
  assert.equal(w.core.zh, "灰纸板");
  assert.equal(w.wrap.en, "two-side coated paper (C2S)");
  const inner = materialWords(CATEGORY_PACK.tea, "tea", "inner.");
  assert.equal(inner.body.zh, "镀锡薄钢板");
});

test("the AI's reference names every listed material", () => {
  const md = fs.readFileSync("skills/packaging-visual-direction/references/material-list.md", "utf8");
  for (const m of MATERIALS) assert.ok(md.includes(`| ${m.id} | ${m.name.zh} |`), m.id);
});

test("the AI is told the list and held to it: prompts carry every number, boards naming others are sent back", async () => {
  const { generationSystemPrompt, revisionSystemPrompt } = await import("../src/lib/prompts");
  const { validateBoard } = await import("../src/lib/board/schema");
  const { SAMPLES } = await import("../src/lib/samples");
  for (const p of [generationSystemPrompt("tea"), revisionSystemPrompt("tea")]) {
    for (const m of MATERIALS) assert.ok(p.includes(m.id), m.id);
    assert.match(p, /只能用材料清单里的材料|只用材料清单里的材料/);
  }
  const board = structuredClone(SAMPLES[0].board);
  assert.ok(validateBoard(board).ok);
  board.directions[0].styleDna.finish = { zh: "单面铜版纸（M019）覆哑膜", en: "One-side coated paper (M019), matte film" };
  assert.ok(validateBoard(board).ok);
  board.directions[0].styleDna.finish = { zh: "进口珠光纸（M999）", en: "Imported pearl paper (M999)" };
  const r = validateBoard(board);
  assert.ok(!r.ok);
  assert.ok(!r.ok && r.errors.some((e) => e.includes("M999")));
});
