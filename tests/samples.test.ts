import assert from "node:assert/strict";
import test from "node:test";
import { validateBoard } from "../src/lib/board/schema";
import { CATEGORY_FAMILIES, CATEGORY_KEYS, isCategory } from "../src/lib/categories";
import { demoClient } from "../src/lib/llm/demo";
import { generationUserText } from "../src/lib/prompts";
import { CATEGORY_PACK, normalizePack } from "../src/lib/pack";
import { SAMPLES, adaptSample } from "../src/lib/samples";

test("every category has a family and a valid default pack", () => {
  const inFamilies = CATEGORY_FAMILIES.flatMap((f) => f.cats);
  for (const c of CATEGORY_KEYS) {
    assert.equal(inFamilies.filter((x) => x === c).length, 1, `${c} in one family`);
    const p = CATEGORY_PACK[c];
    assert.deepEqual(normalizePack(p), p, `${c} default pack survives normalizing`);
  }
  // the original four keys still parse, so stored projects keep working
  for (const c of ["tea", "specialty", "cosmetics", "appliance", "other"]) assert.ok(isCategory(c));
});

test("every sample board passes validation", () => {
  for (const s of SAMPLES) {
    const r = validateBoard(JSON.parse(JSON.stringify(s.board)));
    assert.ok(r.ok, `${s.id}: ${r.ok ? "" : r.errors.join("; ")}`);
  }
});

test("a sample re-labelled for a seller carries their name and brand, and still validates", () => {
  const b = adaptSample("pet", { title: "冻干猫粮 1.5 公斤", brand: "喵记" });
  assert.equal(b.meta.product.zh, "冻干猫粮 1.5 公斤");
  assert.equal(b.meta.brand, "喵记");
  assert.ok(b.directions.some((d) => d.mockup.headline === "喵记"));
  assert.ok(validateBoard(JSON.parse(JSON.stringify(b))).ok);
});

test("the offline demo answers with the sample nearest the seller's category", async () => {
  const text = generationUserText({ title: "保湿精华", category: "cosmetics", itemType: "精华液", brand: "", description: "", mustText: "", images: [], modelCanSeeImages: false });
  assert.match(text, /具体是什么 Item type/);
  const out = await demoClient().complete({ task: "generate", model: "demo-board", messages: [{ role: "user", content: text }] } as never);
  const board = JSON.parse(out.text.replace(/^```json\n|\n```$/g, ""));
  assert.equal(board.meta.category, "cosmetics");
  assert.equal(board.meta.product.zh, "保湿精华");
  assert.equal(board.meta.brand, "[品牌]");
});
