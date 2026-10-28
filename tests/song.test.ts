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

test("the inscription hand: which text it writes, and the bundled font covers it", async () => {
  const { handTextOf } = await import("../src/components/three/art");
  const fs = await import("node:fs");
  const tea = SAMPLES.find((s) => s.id === "tea")!;
  const A = tea.board.directions.find((d) => d.id === "A")!;
  const B = tea.board.directions.find((d) => d.id === "B")!;
  assert.equal(A.layout, "scroll");
  assert.ok(handTextOf(A, tea.board.meta.brand, "carton").includes(A.mockup.headline));
  assert.equal(handTextOf(B, tea.board.meta.brand, "carton"), "");
  // the brocade box's slip is written in the hand whatever the layout
  assert.ok(handTextOf(B, tea.board.meta.brand, "brocade").includes(B.mockup.headline));
  // every slice the CSS names exists, and together they cover GB 2312 and every sample's words
  const css = fs.readFileSync("src/app/fonts.css", "utf8");
  const rules = [...css.matchAll(/url\("\/fonts\/zhuque\/(zq-\d+\.woff2)"\)[^}]*unicode-range: ([^;]+);/g)];
  assert.ok(rules.length > 50, `${rules.length} slices`);
  const ranges: [number, number][] = [];
  for (const [, file, list] of rules) {
    assert.ok(fs.existsSync(`public/fonts/zhuque/${file}`), file);
    for (const r of list.split(", ")) {
      const [a, b] = r.slice(2).split("-");
      ranges.push([parseInt(a, 16), parseInt(b ?? a, 16)]);
    }
  }
  const covered = (ch: string) => ranges.some(([a, b]) => ch.codePointAt(0)! >= a && ch.codePointAt(0)! <= b);
  const gb = new TextDecoder("gb2312");
  let missing = 0;
  for (let hi = 0xb0; hi <= 0xf7; hi++)
    for (let lo = 0xa1; lo <= 0xfe; lo++) {
      const ch = gb.decode(new Uint8Array([hi, lo]));
      if (ch !== "�" && /\p{Script=Han}/u.test(ch) && !covered(ch)) missing++;
    }
  assert.equal(missing, 0, `${missing} GB 2312 hanzi without the hand`);
  for (const s of SAMPLES) for (const d of s.board.directions) for (const ch of handTextOf(d, s.board.meta.brand, "brocade")) if (/\p{Script=Han}/u.test(ch)) assert.ok(covered(ch), `${s.id} ${d.id} ${ch}`);
  assert.ok(fs.existsSync("public/fonts/zhuque/OFL.txt"), "licence beside the font");
});
