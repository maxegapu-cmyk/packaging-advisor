/**
 * Builds and folds a flat net in 3D from the shared fold description (lib/print/folds.ts):
 * each panel a board with its printed face, its inside and its cut edges; folding uses the
 * same fold maths as the unit tests, so what the film folds is what the print file cuts.
 * Geometry is in millimetres under a group scaled to scene units.
 */
import * as THREE from "three";
import { apply4, flatOf, foldFrames, placement, type FoldPanel, type FoldPiece, type FoldSet, type M4, type Pt, type V3 } from "@/lib/print/folds";
import { U } from "../../three/common";
import { clamp, ease, seg } from "../symbiosis";

export type Line3 = { a: THREE.Vector3; b: THREE.Vector3; kind: "cut" | "crease" };
export type PanelLook = { top: THREE.Material; under: THREE.Material; edge: THREE.Material };

type PieceState = {
  piece: FoldPiece;
  holder: THREE.Group;
  panels: Map<string, THREE.Group>;
  origin: THREE.Vector3; // where the sheet's (0, 0) lies when flat, item mm
  qFinal: THREE.Quaternion;
  anchor: THREE.Vector3; // anchor printed-face centre, sheet coordinates
  arc: number;
  /** How far the piece is lifted over the folding (mm, sampled on f), smoothed; see prepare. */
  lift: number[] | null;
  /** Its bounding box (root units, lift included) at each sample, smoothed: [x0, y0, z0, x1, y1, z1]. */
  boxes: number[][] | null;
};

export type NetBuild = {
  root: THREE.Group;
  lines: Line3[];
  /** Flat footprint in item-local scene units. */
  box: { x0: number; x1: number; z0: number; z1: number };
  pose: (f: number) => void;
  /** Works out piece `k`'s lift over the fold ahead of time (otherwise it is found frame by frame). */
  prepare: (k: number) => void;
  /** How high (scene units) the highest-lifted piece floats at `f`, from the prepared curves. */
  liftAt: (f: number) => number;
  /** Where the sheet is at `f` (scene units, smoothed), once prepared: for the camera to frame. */
  boxAt: (f: number) => { x0: number; y0: number; z0: number; x1: number; y1: number; z1: number } | null;
  materials: THREE.Material[];
  dispose: () => void;
};

const m4 = new THREE.Matrix4();
/** Shares of the form phase for lifting the sheet before the folds, and setting the pack down after. */
// a big net (a carton's walls fold down under its front) is lifted by about the pack's height:
// that takes a third of the phase, unhurried, before the first fold starts
const LEAD = 0.3;
const TAIL = 0.12;
/** Caps of the extruded edge geometry: drawn as separate faces instead. */
const HIDDEN = new THREE.MeshBasicMaterial({ visible: false });
const toM = (a: M4) => new THREE.Matrix4().fromArray(a);

/** Bounding box of a panel polygon. */
const bboxOf = (p: Pt[]) => {
  const xs = p.map((q) => q[0]);
  const ys = p.map((q) => q[1]);
  return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
};

/** UVs of a panel's top face for its artwork (rot: clockwise quarter turns of the upright art). */
function artUV(g: THREE.BufferGeometry, p: FoldPanel) {
  const b = bboxOf(p.poly);
  const rot = p.art?.rot ?? 0;
  const aw = rot === 90 || rot === 270 ? b.h : b.w;
  const ah = rot === 90 || rot === 270 ? b.w : b.h;
  const pos = g.getAttribute("position") as THREE.BufferAttribute;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const lx = pos.getX(i) - b.x;
    const ly = pos.getZ(i) - b.y;
    let ax = lx;
    let ay = ly;
    if (rot === 90) [ax, ay] = [ly, b.w - lx];
    else if (rot === 180) [ax, ay] = [b.w - lx, b.h - ly];
    else if (rot === 270) [ax, ay] = [b.h - ly, lx];
    uv[i * 2] = ax / aw;
    uv[i * 2 + 1] = 1 - ay / ah;
  }
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
}

/** The panel outline as a shape; `down` mirrors it for a face that looks down after rotating. */
function shapeOf(poly: Pt[], down = false) {
  const s = new THREE.Shape();
  const k = down ? 1 : -1;
  poly.forEach(([x, y], i) => (i ? s.lineTo(x, k * y) : s.moveTo(x, k * y)));
  s.closePath();
  return s;
}

/**
 * Builds the pieces of a fold set laid flat, side by side, centred on x = 0 and centred in z on
 * `zMid` (item mm). `look` gives each panel its materials.
 */
export function buildNet(set: FoldSet, look: (piece: FoldPiece, p: FoldPanel) => PanelLook, zMid: number, gap = 30): NetBuild {
  const own: { dispose(): void }[] = [];
  const root = new THREE.Group();
  const mm = new THREE.Group();
  mm.scale.setScalar(U);
  root.add(mm);
  const flats = set.pieces.map((p) => flatOf(p));
  const totalW = flats.reduce((a, f) => a + f.box.w, 0) + gap * (flats.length - 1);
  let x = -totalW / 2;
  const states: PieceState[] = [];
  const lines: Line3[] = [];
  const mats = new Set<THREE.Material>();
  set.pieces.forEach((piece, i) => {
    const f = flats[i];
    const origin = new THREE.Vector3(x - f.box.x, 0, zMid - f.box.h / 2 - f.box.y);
    x += f.box.w + gap;
    const holder = new THREE.Group();
    holder.matrixAutoUpdate = false;
    mm.add(holder);
    const groups = new Map<string, THREE.Group>();
    for (const p of piece.panels) {
      const g = new THREE.Group();
      g.matrixAutoUpdate = false;
      holder.add(g);
      groups.set(p.id, g);
      const t = p.thick ?? piece.thick;
      const L = look(piece, p);
      for (const m of [L.top, L.under, L.edge]) mats.add(m);
      const shape = shapeOf(p.poly);
      // the cut edges only: the two faces are separate meshes, so nothing is coplanar
      const body = new THREE.ExtrudeGeometry(shape, { depth: t, bevelEnabled: false, curveSegments: 4 });
      body.rotateX(-Math.PI / 2);
      own.push(body);
      const slab = new THREE.Mesh(body, [HIDDEN, L.edge]);
      slab.castShadow = true;
      slab.receiveShadow = true;
      g.add(slab);
      const down = new THREE.ShapeGeometry(shapeOf(p.poly, true), 4);
      down.rotateX(Math.PI / 2);
      own.push(down);
      const under = new THREE.Mesh(down, L.under);
      under.receiveShadow = true;
      under.castShadow = true;
      g.add(under);
      const face = new THREE.ShapeGeometry(shape, 4);
      face.rotateX(-Math.PI / 2);
      face.translate(0, t, 0);
      artUV(face, p);
      own.push(face);
      const top = new THREE.Mesh(face, L.top);
      top.receiveShadow = true;
      // the sheet casts the shadow the finished pack will, so nothing changes at the swap
      top.castShadow = true;
      g.add(top);
      // a glue flap or seal strip ends up glued inside the wall it overlaps, not over its
      // print: it lies one board below the others
      if (p.glue || p.inner) for (const geo of [body, down, face]) geo.translate(0, -(t + 0.05), 0);
    }
    // the dieline, as it lies flat
    const y = piece.thick + 0.25;
    const at = (px: number, py: number) => new THREE.Vector3((origin.x + px) * U, y * U, (origin.z + py) * U);
    f.cut.forEach((p, k) => {
      const q = f.cut[(k + 1) % f.cut.length];
      lines.push({ a: at(p[0], p[1]), b: at(q[0], q[1]), kind: "cut" });
    });
    for (const [a, b, c, d] of f.creases) lines.push({ a: at(a, b), b: at(c, d), kind: "crease" });
    const place = placement(piece);
    const pm = toM(place);
    const qFinal = new THREE.Quaternion().setFromRotationMatrix(pm);
    const anc = piece.panels.find((p) => p.id === piece.anchor)!;
    const ab = bboxOf(anc.poly);
    states.push({ piece, holder, panels: groups, origin, qFinal, anchor: new THREE.Vector3(ab.x + ab.w / 2, anc.thick ?? piece.thick, ab.y + ab.h / 2), arc: 0.16 * Math.max(f.box.w, f.box.h), lift: null, boxes: null });
  });

  const tmpBox = new THREE.Box3();
  const q = new THREE.Quaternion();
  const P = new THREE.Vector3();
  const place = (st: PieceState, lift: number) => {
    m4.compose(new THREE.Vector3(P.x, P.y + lift, P.z), q, new THREE.Vector3(1, 1, 1));
    st.holder.matrix.copy(m4).multiply(new THREE.Matrix4().makeTranslation(-st.anchor.x, -st.anchor.y, -st.anchor.z));
    st.holder.matrixWorldNeedsUpdate = true;
  };
  /**
   * Folds piece `st` to `f` and places it unlifted; returns how far it then hangs below the
   * floor (mm). The folding itself runs between LEAD and 1 − TAIL: the first stretch lifts the
   * sheet off the table, the last one sets the finished pack down.
   */
  const fold = (st: PieceState, f: number) => {
    f = seg(f, [LEAD, 1 - TAIL]);
    const frames = foldFrames(st.piece, (p) => (p.at ? ease(seg(f, p.at)) : 1));
    for (const [id, g] of st.panels) {
      g.matrix.fromArray(frames.get(id)!);
      g.matrixWorldNeedsUpdate = true;
    }
    const e = ease(seg(f, st.piece.move));
    const start = st.anchor.clone().add(st.origin);
    const end = new THREE.Vector3(...st.piece.final.c);
    if (st.piece.slide) {
      const s = 1 - ease(seg(f, st.piece.slide.at));
      end.add(new THREE.Vector3(...st.piece.slide.from).multiplyScalar(s));
    }
    q.identity().slerp(st.qFinal, e);
    P.copy(start).lerp(end, e);
    // a little arc, so a piece travels over rather than through what is already there
    P.y += Math.sin(Math.PI * e) * st.arc;
    place(st, 0);
    st.holder.updateMatrixWorld(true);
    tmpBox.makeEmpty();
    const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
    st.holder.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
      tmpBox.union(m.geometry.boundingBox!.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld)));
    });
    return Math.max(0, -tmpBox.min.y / U);
  };
  const N = 80;
  const smooth = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
  const prepare = (k: number) => {
    const st = states[k];
    if (!st || st.lift) return;
    const need: number[] = [];
    const raw: number[][] = [];
    for (let i = 0; i <= N; i++) {
      need.push(fold(st, i / N));
      raw.push([tmpBox.min.x, tmpBox.min.y, tmpBox.min.z, tmpBox.max.x, tmpBox.max.y, tmpBox.max.z]);
    }
    // the most that will be needed a little ahead (and just behind), so the piece rises before
    // a panel swings down and stays up while it folds; then smoothed, so it floats up and down
    // instead of being pushed frame by frame
    const ahead = Math.round(0.22 * N);
    const behind = Math.round(0.06 * N);
    let v = need.map((_, i) => Math.max(...need.slice(Math.max(0, i - behind), i + ahead + 1)));
    for (let pass = 0; pass < 6; pass++) v = v.map((_, i) => (v[Math.max(0, i - 2)] + v[Math.max(0, i - 1)] + v[i] + v[Math.min(N, i + 1)] + v[Math.min(N, i + 2)]) / 5);
    // on the table at the start and at the end, never lower than needed in between
    st.lift = v.map((x, i) => Math.max(x * smooth(Math.min(i / (LEAD * N), (N - i) / (TAIL * N))), need[i]));
    // where it is, lifted, smoothed the same way (the camera follows this, not every panel)
    let bx = raw.map((b, i) => [b[0], b[1] + st.lift![i] * U, b[2], b[3], b[4] + st.lift![i] * U, b[5]]);
    for (let pass = 0; pass < 6; pass++) bx = bx.map((_, i) => [0, 1, 2, 3, 4, 5].map((k) => (bx[Math.max(0, i - 2)][k] + bx[Math.max(0, i - 1)][k] + bx[i][k] + bx[Math.min(N, i + 1)][k] + bx[Math.min(N, i + 2)][k]) / 5));
    st.boxes = bx;
    fold(st, 0);
  };
  const curveAt = (c: number[], f: number) => {
    const x = clamp(f) * N;
    const i = Math.min(N - 1, Math.floor(x));
    return c[i] + (c[i + 1] - c[i]) * (x - i);
  };
  const boxAt = (f: number) => {
    if (!states.every((st) => st.boxes)) return null;
    const x = clamp(f) * N;
    const i = Math.min(N - 1, Math.floor(x));
    const k = x - i;
    const b = [1e9, 1e9, 1e9, -1e9, -1e9, -1e9];
    for (const st of states)
      for (let c = 0; c < 6; c++) {
        const v = st.boxes![i][c] + (st.boxes![i + 1][c] - st.boxes![i][c]) * k;
        b[c] = c < 3 ? Math.min(b[c], v) : Math.max(b[c], v);
      }
    return { x0: b[0], y0: b[1], z0: b[2], x1: b[3], y1: b[4], z1: b[5] };
  };
  const liftAt = (f: number) => Math.max(0, ...states.map((st) => (st.lift ? curveAt(st.lift, f) : 0))) * U;
  const pose = (f: number) => {
    for (const st of states) {
      const low = fold(st, f);
      let lift = low;
      if (st.lift) lift = Math.max(low, curveAt(st.lift, f));
      // never through the floor
      if (lift > 0) place(st, lift + 0.05);
    }
    root.updateMatrixWorld(true);
  };
  const xs = lines.flatMap((l) => [l.a.x, l.b.x]);
  const zs = lines.flatMap((l) => [l.a.z, l.b.z]);
  pose(0);
  return {
    root,
    lines,
    box: { x0: Math.min(...xs), x1: Math.max(...xs), z0: Math.min(...zs), z1: Math.max(...zs) },
    pose,
    prepare,
    liftAt,
    boxAt,
    materials: [...mats],
    dispose: () => own.forEach((o) => o.dispose()),
  };
}

export { apply4, clamp };
export type { V3 };
