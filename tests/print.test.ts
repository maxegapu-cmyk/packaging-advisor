/**
 * Print core: barcodes, colors, information-panel typesetting, print layouts for every form,
 * artwork defaults and validation, and the pre-press checks.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { applyArtwork, defaultArtwork, labelFields, normalizeArtwork, renderPalette, rolesOf } from "../src/lib/artwork";
import { CATEGORY_KEYS } from "../src/lib/categories";
import { CATEGORY_PACK, FORMS, FORM_PRESET, normalizePack, takesEffects, type PackSpec } from "../src/lib/pack";
import { breakLines, layoutBack, MIN_TEXT_MM, textWidth } from "../src/lib/print/backpanel";
import { barcodePcs, cmykText, contrast, deltaE, deltaE2000, hexToLab, toCmyk } from "../src/lib/print/color";
import { checkDigit, checkEan13, ean13Modules } from "../src/lib/print/ean13";
import { artSize, BLEED, infoPanels, printLayout } from "../src/lib/print/layout";
import { blocking, infoSize, preflight } from "../src/lib/print/preflight";
import { SAMPLES } from "../src/lib/samples";

test("EAN-13: check digits, validation and the 95 modules", () => {
  assert.equal(checkDigit("690123456789"), 2);
  assert.equal(checkDigit("400638133393"), 1); // a published example
  assert.deepEqual(checkEan13("6901234567892"), { ok: true, digits: "6901234567892" });
  assert.deepEqual(checkEan13("6901234567890"), { ok: false, reason: "check", expected: 2 });
  assert.deepEqual(checkEan13("690123456789"), { ok: false, reason: "check", expected: 2 });
  assert.deepEqual(checkEan13("69012345"), { ok: false, reason: "format" });
  assert.deepEqual(checkEan13("  "), { ok: false, reason: "empty" });
  const m = ean13Modules("4006381333931");
  assert.equal(m.length, 95);
  assert.equal(m.slice(0, 3), "101");
  assert.equal(m.slice(45, 50), "01010");
  assert.equal(m.slice(92), "101");
  // first digit 4 → parity LGLLGG; digit 0 in L is 0001101, digit 0 in G is 0100111
  assert.equal(m.slice(3, 10), "0001101");
  assert.equal(m.slice(10, 17), "0100111");
});

test("colors: contrast, CMYK and barcode print contrast", () => {
  assert.ok(Math.abs(contrast("#000000", "#FFFFFF") - 21) < 0.01);
  assert.equal(contrast("#777777", "#777777"), 1);
  assert.deepEqual(toCmyk("#000000"), { c: 0, m: 0, y: 0, k: 100 });
  assert.deepEqual(toCmyk("#FF0000"), { c: 0, m: 100, y: 100, k: 0 });
  assert.equal(cmykText("#FFFFFF"), "C0 M0 Y0 K0");
  assert.ok(barcodePcs("#000000", "#FFFFFF") > 0.95);
  assert.ok(barcodePcs("#E60012", "#FFFFFF") < 0.3, "red bars vanish under a red scanner");
});

test("information panel: wraps, shrinks, keeps text legible or reports overflow", () => {
  assert.ok(textWidth("茶叶", 2) === 4);
  const lines = breakLines("一二三四五六七八九十", 2, 9);
  assert.ok(lines.every((l) => textWidth(l, 2) <= 9), JSON.stringify(lines));
  assert.equal(lines.join(""), "一二三四五六七八九十");
  const rows = [
    { label: "产品名称", value: "明前龙井" },
    { label: "配料", value: "龙井茶叶" },
    { label: "生产者", value: "杭州某某茶业有限公司，浙江省杭州市西湖区龙井路 1 号，电话 0571-00000000" },
  ];
  const big = layoutBack(110, 150, { brand: "山径", intro: "高山明前采摘，手工炒制。", rows, barcode: true });
  assert.equal(big.overflow, false);
  assert.ok(big.textMm >= MIN_TEXT_MM);
  assert.ok(big.barcode && big.barcode.mag >= 0.8 && big.barcode.mag <= 1);
  for (const l of big.lines) assert.ok(l.x >= big.pad - 0.01 && l.y <= 150 - big.pad + 0.01, `line inside the safe zone: ${l.text}`);
  const tiny = layoutBack(40, 40, { brand: "山径", intro: "很长的介绍".repeat(20), rows: [...rows, ...rows, ...rows], barcode: true });
  assert.ok(tiny.overflow || tiny.textMm < MIN_TEXT_MM, "a tiny panel cannot hold all of it");
});

function specsToTry(): PackSpec[] {
  const out: PackSpec[] = Object.values(CATEGORY_PACK).map((s) => ({ ...s }));
  for (const f of FORMS) out.push({ ...FORM_PRESET[f], finish: "matte" });
  out.push({ ...FORM_PRESET.carton, finish: "softTouch", effects: ["goldFoil", "spotUV", "emboss"], w: 340, h: 260, d: 220 });
  return out;
}

test("print layouts: every form lays out, panels sit inside their pieces, pieces inside the sheet", () => {
  for (const spec of specsToTry()) {
    const lay = printLayout(spec);
    assert.ok(lay.sheets.length >= 1, spec.form);
    for (const s of lay.sheets) {
      assert.ok(s.w > 0 && s.h > 0 && Number.isFinite(s.w) && Number.isFinite(s.h), `${spec.form} ${s.id} size`);
      for (const p of s.pieces) {
        assert.ok(p.x >= lay.margin - 0.01 && p.y >= lay.margin - 0.01, `${spec.form} ${p.id} inside margin`);
        assert.ok(p.x + p.w <= s.w - lay.margin + 0.01 && p.y + p.h <= s.h - lay.margin + 0.01, `${spec.form} ${p.id} fits sheet`);
        assert.ok(p.cut.startsWith("M") && p.cut.endsWith("Z"), `${spec.form} ${p.id} closed cut`);
        assert.ok(!/NaN|Infinity/.test(p.cut), `${spec.form} ${p.id} finite cut`);
        for (const q of p.panels) {
          assert.ok(q.w > 0 && q.h > 0, `${spec.form} ${p.id} ${q.kind} positive`);
          assert.ok(q.x >= p.x - 0.01 && q.y >= p.y - 0.01 && q.x + q.w <= p.x + p.w + 0.01 && q.y + q.h <= p.y + p.h + 0.01, `${spec.form} ${p.id} ${q.kind} inside piece`);
          const a = artSize(q);
          assert.ok(a.w > 0 && a.h > 0);
        }
        // panels of one piece never overlap
        for (let i = 0; i < p.panels.length; i++)
          for (let j = i + 1; j < p.panels.length; j++) {
            const A = p.panels[i];
            const B = p.panels[j];
            const ox = Math.min(A.x + A.w, B.x + B.w) - Math.max(A.x, B.x);
            const oy = Math.min(A.y + A.h, B.y + B.h) - Math.max(A.y, B.y);
            assert.ok(ox <= 0.01 || oy <= 0.01, `${spec.form} ${p.id}: ${A.kind} overlaps ${B.kind}`);
          }
      }
      // pieces don't overlap each other (bleed included)
      for (let i = 0; i < s.pieces.length; i++)
        for (let j = i + 1; j < s.pieces.length; j++) {
          const A = s.pieces[i];
          const B = s.pieces[j];
          const ox = Math.min(A.x + A.w, B.x + B.w) - Math.max(A.x, B.x) + 2 * BLEED;
          const oy = Math.min(A.y + A.h, B.y + B.h) - Math.max(A.y, B.y) + 2 * BLEED;
          assert.ok(ox <= 0 || oy <= 0, `${spec.form} ${s.id}: ${A.id} and ${B.id} too close`);
        }
    }
  }
});

test("print layouts: the carton net has the right panel sizes and an info panel", () => {
  const lay = printLayout({ form: "carton", w: 110, h: 150, d: 46, finish: "matte" });
  const net = lay.sheets[0].pieces[0];
  const front = net.panels.find((p) => p.kind === "front")!;
  const back = net.panels.find((p) => p.kind === "back")!;
  assert.deepEqual([front.w, front.h, back.w, back.h], [110, 150, 110, 150]);
  assert.equal(net.folds.length, 12);
  assert.equal(infoPanels(lay).length, 1);
  assert.deepEqual(infoSize({ form: "carton", w: 110, h: 150, d: 46, finish: "matte" }), { w: 110, h: 150 });
  // a combination prints the inside products too
  const tea = printLayout(CATEGORY_PACK.tea);
  assert.ok(tea.sheets.some((s) => s.id.startsWith("inner-") && s.qty === 2));
  // foil and crate specifics
  assert.equal(printLayout({ form: "woodBox", w: 300, h: 120, d: 200, finish: "paper" }).sheets[0].process, "engrave");
});

test("artwork: defaults from every sample, roles applied, validation keeps it safe", () => {
  for (const s of SAMPLES) {
    const a = defaultArtwork(s.board);
    assert.equal(a.dir, s.board.recommendation.pick);
    assert.equal(a.rows.find((r) => r.key === "name")?.value, s.board.meta.product.zh);
    const d = s.board.directions.find((x) => x.id === a.dir)!;
    const changed = applyArtwork(d, { ...a, palette: { ...a.palette, key: "#123456" }, headline: "新名字" });
    assert.equal(rolesOf(changed).key, "#123456");
    assert.equal(changed.mockup.headline, "新名字");
  }
  for (const c of CATEGORY_KEYS) {
    const f = labelFields(c);
    assert.ok(f.length >= 5 && f[0].key === "name", c);
    assert.equal(new Set(f.map((x) => x.key)).size, f.length, `${c} keys unique`);
  }
  const base = defaultArtwork(SAMPLES[0].board);
  const n = normalizeArtwork({ brand: "x".repeat(99), headline: "", palette: { ground: "fff", ink: "nope" }, barcode: "690-1234-56789-2", rows: [{ key: "a", label: "标签", value: "值\u0001" }, { label: "" }], logoId: "../../etc" }, base);
  assert.equal(n.brand.length, 30);
  assert.equal(n.headline, base.headline);
  assert.equal(n.palette.ground, "#FFFFFF");
  assert.equal(n.palette.ink, base.palette.ink);
  assert.equal(n.barcode, "6901234567892");
  assert.deepEqual(n.rows, [{ key: "a", label: "标签", value: "值" }]);
  assert.equal(n.logoId, null);
  assert.deepEqual(normalizeArtwork(null, base), { ...base });
});

test("preflight: flags what a print shop would, passes a complete artwork", () => {
  const s = SAMPLES[0];
  const spec = s.pack;
  const a = defaultArtwork(s.board);
  const first = preflight(a, s.board, spec);
  assert.ok(first.some((c) => c.id === "label" && c.level === "warn"));
  assert.ok(first.some((c) => c.id === "barcode" && c.level === "warn"));
  const bad = preflight({ ...a, barcode: "6901234567890" }, s.board, spec);
  assert.ok(bad.some((c) => c.id === "barcode" && c.level === "error"));
  const filled = { ...a, barcode: "6901234567892", rows: a.rows.map((r) => ({ ...r, value: r.value || "已填" })) };
  const ok = preflight(filled, s.board, spec);
  assert.equal(blocking(ok).length, 0, JSON.stringify(blocking(ok)));
  // low contrast is caught
  const pale = preflight({ ...filled, palette: { ...filled.palette, ink: filled.palette.ground } }, s.board, spec);
  assert.ok(pale.some((c) => c.id === "contrast" && c.level === "error"));
  // a risky claim from the board's own check is caught when it is printed
  const risky = s.board.claimCheck.find((c) => c.level === "high");
  if (risky) assert.ok(preflight({ ...filled, intro: `本品${risky.text}` }, s.board, spec).some((c) => c.id.startsWith("claim-")));
  // every sample and default pack can be checked
  for (const x of SAMPLES) for (const sp of [x.pack, CATEGORY_PACK[x.id as keyof typeof CATEGORY_PACK] ?? x.pack]) assert.ok(preflight(defaultArtwork(x.board), x.board, sp).length > 3);
});

test("color difference: CIEDE2000 matches published test pairs; sRGB to Lab", () => {
  // Sharma, Wu and Dalal (2005) test data
  const pairs: [number[], number[], number][] = [
    [[50, 2.6772, -79.7751], [50, 0, -82.7485], 2.0425],
    [[50, 3.1571, -77.2803], [50, 0, -82.7485], 2.8615],
    [[50, -1, 2], [50, 0, 0], 2.3669],
    [[50, 2.49, -0.001], [50, -2.49, 0.0009], 7.1792],
    [[60.2574, -34.0099, 36.2677], [60.4626, -34.1751, 39.4387], 1.2644],
    [[22.7233, 20.0904, -46.694], [23.0331, 14.973, -42.5619], 2.0373],
  ];
  for (const [a, b, want] of pairs) {
    const got = deltaE2000({ L: a[0], a: a[1], b: a[2] }, { L: b[0], a: b[1], b: b[2] });
    assert.ok(Math.abs(got - want) < 1e-3, `ΔE00 ${got} vs ${want}`);
  }
  const w = hexToLab("#FFFFFF");
  assert.ok(Math.abs(w.L - 100) < 0.01 && Math.abs(w.a) < 0.01 && Math.abs(w.b) < 0.01);
  assert.equal(deltaE("#3F7A4F", "#3F7A4F"), 0);
  assert.ok(deltaE("#3F7A4F", "#C2283C") > 40);
});

test("proof: measured size, sample colors and sign-off drive the checks", () => {
  const s = SAMPLES[3]; // a carton-type pack
  const a = defaultArtwork(s.board);
  const filled = { ...a, barcode: "6901234567892", rows: a.rows.map((r) => ({ ...r, value: r.value || "已填" })) };
  const spec = s.pack;
  const none = preflight(filled, s.board, spec);
  assert.ok(none.some((c) => c.id === "sample" && c.level === "warn"), "unchecked sample is flagged");
  const off = preflight({ ...filled, proof: { ...filled.proof, w: spec.w + 2, h: spec.h, d: spec.d } }, s.board, spec);
  assert.ok(off.some((c) => c.id === "proof-w" && c.level === "error"));
  const ok = preflight({ ...filled, proof: { ...filled.proof, w: spec.w + 0.5, h: spec.h - 1, d: spec.d, colors: { key: filled.palette.key }, confirmed: true, at: "2026-10-27" } }, s.board, spec);
  assert.ok(ok.some((c) => c.id === "proof-size" && c.level === "ok"));
  assert.ok(ok.some((c) => c.id === "proof-color" && c.level === "ok"));
  assert.ok(ok.some((c) => c.id === "sample" && c.level === "ok"));
  const far = preflight({ ...filled, proof: { ...filled.proof, colors: { key: "#FF00FF" } } }, s.board, spec);
  assert.ok(far.some((c) => c.id === "proof-color" && c.level === "error"));
  // validation keeps only sane proof data
  const n = normalizeArtwork({ ...filled, proof: { w: -3, h: 150.26, d: "x", photoId: "../x", colors: { key: "abc", ink: "nope" }, confirmed: true, at: "2026-10-27T10:00:00Z" } }, filled);
  assert.deepEqual(n.proof, { w: null, h: 150.3, d: null, photoId: null, colors: { key: "#AABBCC" }, useSample: false, confirmed: true, at: "2026-10-27" });
  assert.equal(renderPalette({ ...n, proof: { ...n.proof, useSample: true } }).key, "#AABBCC");
  assert.equal(renderPalette(n).key, n.palette.key);
});

test("preflight: every check has its own id (they are list keys on the page)", () => {
  for (const x of SAMPLES) {
    const a = defaultArtwork(x.board);
    for (const art of [a, { ...a, barcode: "6901234567890", proof: { ...a.proof, w: 1, h: 1, d: 1, colors: { key: "#000000", ink: "#FFFFFF" } } }]) {
      const ids = preflight(art, x.board, x.pack).map((c) => c.id);
      assert.equal(new Set(ids).size, ids.length, `${x.id}: ${ids.join(",")}`);
    }
  }
});

test("material use: piece areas add up and the largest part is reported", async () => {
  const { materialUse, pieceArea } = await import("../src/lib/print/layout");
  const lay = printLayout({ form: "pouch", w: 160, h: 230, d: 80, finish: "matte" });
  const front = lay.sheets[0].pieces[0];
  assert.ok(Math.abs(pieceArea(front) - 160 * 230) < 1, "rectangle area");
  const tin = printLayout({ form: "tin", w: 86, h: 120, d: 86, finish: "matte" });
  const cap = tin.sheets[0].pieces.find((p) => p.id === "cap")!;
  assert.ok(Math.abs(pieceArea(cap) - Math.PI * 43 ** 2) < 1, "disc area");
  const m = materialUse({ form: "carton", w: 110, h: 150, d: 46, finish: "matte" });
  // the net is at least the four walls plus the two closures, and less than its bounding box
  const walls = 2 * (110 + 46) * 150 + 2 * 110 * 46;
  assert.ok(m.m2 * 1e6 > walls && m.m2 * 1e6 < m.largest.w * m.largest.h, `${m.m2}`);
});

test("special effects go only where something is printed, and every printed part can carry them", () => {
  for (const form of FORMS) {
    const spec = normalizePack({ ...FORM_PRESET[form], form, finish: "matte", effects: ["goldFoil", "spotUV"] });
    const printed = printLayout(spec).sheets.some((s) => s.process === "print");
    assert.equal(takesEffects(spec), printed, form);
    assert.equal(!!spec.effects?.length, printed, `${form}: effects kept only when printed`);
  }
  // a crate of labelled bottles: the labels take the effects, the engraved lid does not
  const crate = normalizePack({ form: "woodBox", w: 300, h: 140, d: 220, finish: "paper", effects: ["goldFoil"], inner: { form: "bottle", count: 2, w: 60, h: 180, d: 60 } });
  assert.deepEqual(crate.effects, ["goldFoil"]);
  const lay = printLayout(crate);
  assert.ok(lay.sheets.some((s) => s.process === "print") && lay.sheets.some((s) => s.process === "engrave"));
});
