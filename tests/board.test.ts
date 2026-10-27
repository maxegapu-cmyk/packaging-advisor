import { test } from "node:test";
import assert from "node:assert/strict";
import { validateBoard } from "../src/lib/board/schema";
import { applyRevision, mergeDimension } from "../src/lib/board/revise";
import { extractJson } from "../src/lib/llm/json";
import { DEMO_BOARD } from "../src/lib/llm/demo";

test("the demo board passes validation unchanged", () => {
  const v = validateBoard(structuredClone(DEMO_BOARD));
  assert.equal(v.ok, true);
  if (v.ok) assert.deepEqual(v.value, DEMO_BOARD);
});

test("small model slips are repaired: plain strings, percent shares, 3-digit hex", () => {
  const raw: any = structuredClone(DEMO_BOARD);
  raw.directions[0].tagline = "只有中文";
  raw.directions[0].palette[0].share = "65%";
  raw.directions[0].palette[1].hex = "#abc";
  raw.directions[0].layout = "diagonal";
  const v = validateBoard(raw);
  assert.equal(v.ok, true);
  if (!v.ok) return;
  assert.deepEqual(v.value.directions[0].tagline, { zh: "只有中文", en: "只有中文" });
  assert.equal(v.value.directions[0].palette[0].share, 65);
  assert.equal(v.value.directions[0].palette[1].hex, "#AABBCC");
  assert.equal(v.value.directions[0].layout, "offset");
});

test("structural problems are reported with their path", () => {
  const raw: any = structuredClone(DEMO_BOARD);
  raw.directions[1].palette = [{ name: "a", hex: "red" }];
  delete raw.directions[2].carriers;
  const v = validateBoard(raw);
  assert.equal(v.ok, false);
  if (v.ok) return;
  assert.ok(v.errors.some((e) => e.startsWith("directions[1].palette")));
  assert.ok(v.errors.some((e) => e.startsWith("directions[2].carriers.outerFront")));
});

test("a recommendation that names no direction falls back to the distinctive route", () => {
  const raw: any = structuredClone(DEMO_BOARD);
  raw.recommendation.pick = "Z";
  const v = validateBoard(raw);
  assert.equal(v.ok, true);
  if (v.ok) assert.equal(v.value.recommendation.pick, "B");
});

test("missing directions are rejected", () => {
  const raw: any = structuredClone(DEMO_BOARD);
  raw.directions = [];
  assert.equal(validateBoard(raw).ok, false);
  assert.equal(validateBoard("not an object").ok, false);
});

test("a revision only changes the chosen dimension", () => {
  const current = DEMO_BOARD.directions[1];
  const proposed = structuredClone(current);
  proposed.palette[0].hex = "#000000";
  proposed.layout = "split";
  proposed.anchor = { zh: "新锚点", en: "New anchor" };
  proposed.name = { zh: "改名", en: "Renamed" };

  const color = mergeDimension(current, proposed, "color");
  assert.equal(color.palette[0].hex, "#000000");
  assert.equal(color.layout, current.layout);
  assert.deepEqual(color.anchor, current.anchor);
  assert.deepEqual(color.name, current.name);

  const layout = mergeDimension(current, proposed, "layout");
  assert.equal(layout.layout, "split");
  assert.deepEqual(layout.palette, current.palette);

  const anchor = mergeDimension(current, proposed, "anchor");
  assert.deepEqual(anchor.anchor, proposed.anchor);
  assert.deepEqual(anchor.name, current.name, "the name is never revised");
});

test("an invalid revision proposal is rejected", () => {
  const r = applyRevision(DEMO_BOARD.directions[0], { palette: [] }, "color");
  assert.equal(r.ok, false);
});

test("JSON is extracted from fences, surrounding prose and trailing commas", () => {
  assert.deepEqual(extractJson('Here you go:\n```json\n{"a": 1}\n```\nDone.'), { a: 1 });
  assert.deepEqual(extractJson('前言 {"a": {"b": "}"}, } 后记'), { a: { b: "}" } });
  assert.deepEqual(extractJson('{"list": [1, 2,],}'), { list: [1, 2] });
  assert.throws(() => extractJson('{"a": {"b": 1}'), /incomplete/);
  assert.throws(() => extractJson("no json here"), /no JSON/);
});

test("pack: normalize and fit to pixels", async () => {
  const { normalizePack, toPx, DEFAULT_PACK, formatSize } = await import("../src/lib/pack");
  assert.deepEqual(normalizePack("not json"), DEFAULT_PACK);
  assert.deepEqual(normalizePack(undefined), DEFAULT_PACK);
  assert.equal(normalizePack('{"form":"tin","w":80,"h":100}').d, 80);
  const px = toPx({ form: "carton", w: 340, h: 260, d: 220, finish: "matte" }, 200);
  assert.ok(px.w <= 200 && px.h <= 200 && px.w > px.h);
  assert.equal(formatSize({ form: "tin", w: 86, h: 120, d: 86, finish: "matte" }), "Ø86 × 120 mm");
});

test("render brief protects structure and states the studio lighting, in both languages", async () => {
  const { renderBrief } = await import("../src/lib/renderBrief");
  const d = DEMO_BOARD.directions[1];
  const b = renderBrief(d, { form: "tin", w: 86, h: 120, d: 86, finish: "matte", effects: ["goldFoil"] }, DEMO_BOARD.meta.product, "山径");
  assert.match(b.zh, /Ø86 × 120 mm/);
  assert.match(b.zh, /不改动/);
  assert.match(b.zh, /无缝棚拍/);
  assert.match(b.zh, /烫金/);
  assert.match(b.en, /seamless studio/);
  for (const s of d.palette) assert.ok(b.zh.includes(s.hex) && b.en.includes(s.hex));
});
