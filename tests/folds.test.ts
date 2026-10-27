import assert from "node:assert/strict";
import test from "node:test";
import { FORM_PRESET } from "../src/lib/pack";
import { apply4, artUp, bbox, dir4, flatOf, foldFrames, foldsFor, mul, outline, placement, type FoldForm, type Pt, type V3 } from "../src/lib/print/folds";

const FOLDED: { form: FoldForm; w: number; h: number; d: number }[] = [
  ...(["carton", "mailer", "gift", "bookBox", "drawer", "bag", "aseptic", "woodBox"] as const).map((f) => ({ ...FORM_PRESET[f], form: f as FoldForm })),
  { form: "rsc", w: 320, h: 200, d: 240 },
  // odd proportions too
  { form: "carton", w: 56, h: 176, d: 56 },
  { form: "mailer", w: 300, h: 60, d: 240 },
  { form: "drawer", w: 120, h: 30, d: 160 },
  { form: "bag", w: 180, h: 240, d: 70 },
];

const polyArea = (p: Pt[]) => Math.abs(p.reduce((s, q, i) => s + q[0] * p[(i + 1) % p.length][1] - p[(i + 1) % p.length][0] * q[1], 0)) / 2;
const near = (a: V3, b: V3, tol = 1e-6) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) < tol;

test("folds: every net tiles without overlaps and its outline is one closed loop", () => {
  for (const s of FOLDED) {
    const set = foldsFor(s.form, s.w, s.h, s.d)!;
    for (const piece of set.pieces) {
      const cut = outline(piece.panels.map((p) => p.poly));
      const sum = piece.panels.reduce((a, p) => a + polyArea(p.poly), 0);
      assert.ok(cut.length >= 4, `${s.form} ${piece.id} outline`);
      assert.ok(Math.abs(polyArea(cut) - sum) < 0.5, `${s.form} ${piece.id}: outline ${polyArea(cut).toFixed(1)} vs panels ${sum.toFixed(1)} (overlap or gap)`);
      // every crease lies on both the panel's and its parent's edge
      const byId = new Map(piece.panels.map((p) => [p.id, p]));
      for (const p of piece.panels) {
        if (!p.parent) continue;
        assert.ok(p.hinge, `${s.form} ${p.id} has a hinge`);
        for (const q of [p, byId.get(p.parent)!]) {
          const b = bbox(q.poly);
          for (const [x, y] of p.hinge!) assert.ok(x >= b.x - 1e-6 && x <= b.x + b.w + 1e-6 && y >= b.y - 1e-6 && y <= b.y + b.h + 1e-6, `${s.form} ${p.id} hinge on ${q.id}`);
        }
      }
    }
  }
});

test("folds: folded, every printed face looks out, reads upright, and stays inside the pack", () => {
  for (const s of FOLDED) {
    const set = foldsFor(s.form, s.w, s.h, s.d)!;
    const centre: V3 = [0, s.h / 2, 0];
    for (const piece of set.pieces) {
      const frames = foldFrames(piece, () => 1);
      const place = placement(piece);
      for (const p of piece.panels) {
        const m = mul(place, frames.get(p.id)!);
        // inside the finished pack (a little slack for board thickness)
        const slack = 4 + piece.thick;
        for (const [x, y] of p.poly) {
          const q = apply4(m, [x, 0, y]);
          assert.ok(Math.abs(q[0]) <= s.w / 2 + slack && q[1] >= -slack && q[1] <= s.h + slack && Math.abs(q[2]) <= s.d / 2 + slack, `${s.form} ${piece.id} ${p.id} folds outside the pack: ${q.map((v) => v.toFixed(1)).join(", ")}`);
        }
        if (!p.art) continue;
        const b = bbox(p.poly);
        const c = apply4(m, [b.x + b.w / 2, p.thick ?? piece.thick, b.y + b.h / 2]);
        const n = dir4(m, [0, 1, 0]);
        const up = dir4(m, artUp(p.art.rot));
        const out = (c[0] - centre[0]) * n[0] + (c[1] - centre[1]) * n[1] + (c[2] - centre[2]) * n[2];
        if (s.form !== "woodBox" || piece.id !== "lid") assert.ok(out > 0, `${s.form} ${p.id}: printed face looks inward`);
        const want: V3 = Math.abs(n[1]) < 0.5 ? [0, 1, 0] : n[1] > 0 ? [0, 0, -1] : [0, 0, 1];
        assert.ok(near(up, want, 1e-6), `${s.form} ${p.id} (${p.art.kind}, rot ${p.art.rot}): art up ${up.map((v) => v.toFixed(2))} should be ${want}`);
      }
      // the anchor's printed face lands where the 3D view has it
      const a = piece.panels.find((p) => p.id === piece.anchor)!;
      const ab = bbox(a.poly);
      assert.ok(near(apply4(place, [ab.x + ab.w / 2, a.thick ?? piece.thick, ab.y + ab.h / 2]), piece.final.c, 1e-6), `${s.form} ${piece.id} anchor placement`);
    }
  }
});

test("folds: flat pieces give the print layout its cut, creases, art panels and glue", () => {
  const set = foldsFor("carton", 110, 150, 46)!;
  const f = flatOf(set.pieces[0]);
  assert.equal(f.creases.length, 12);
  assert.equal(f.art.length, 6);
  assert.equal(f.glue.length, 1);
  assert.equal(f.art.find((a) => a.art.info)?.art.kind, "back");
  assert.ok(f.cut.length > 20);
});
