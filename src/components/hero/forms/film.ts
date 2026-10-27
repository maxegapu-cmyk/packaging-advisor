/**
 * 平面到立体 Flat to form — the second homepage film, drawn live in three.js.
 *
 * Twenty packs in everyday use go by on one continuous track. Each starts as a vector dieline
 * (cut lines solid, creases dashed, real millimetres), is printed by a sweeping laser line,
 * and then becomes its 3D form the way it really does: nets fold on their creases (from the
 * same fold description the print files use), labels and blanks wrap round their bodies,
 * films stand up and swell, a clear sheet is formed over a card. A cyan hologram of the
 * finished pack waits from the start; a scanning plane turns it into the real materials.
 */
import * as THREE from "three";
import { foldsFor, flatOf, type FoldPanel, type FoldPiece } from "@/lib/print/folds";
import { SAMPLES } from "@/lib/samples";
import type { PackSpec } from "@/lib/pack";
import type { ArtInput } from "../../three/art";
import { buildForm } from "../../three/build";
import { U } from "../../three/common";
import { makeKit, type Kit } from "../../three/kit";
import { studioEquirect } from "../../three/studio";
import { clamp, ease, seg } from "../symbiosis";
import { holographic, makePlanes, setScan, setWipe, type Holo, type Planes } from "./holo";
import { FILM, ITEM_SECONDS as CH, phaseOf, type FilmItem } from "./items";
import { buildPillow, morphBlister, morphPouch } from "./morph";
import { buildNet, type Line3 } from "./net";
import { kraftPlain, rscArt, tape } from "./rsc";
import { buildWraps } from "./wrap";

const BG = new THREE.Color("#07090C");
const ROUND = new Set(["tin", "can", "bottle", "tube", "jar", "glassBottle", "ceramic", "paperTube"]);
const FOLDED = new Set(["carton", "mailer", "rsc", "gift", "bookBox", "drawer", "bag", "aseptic", "woodBox"]);

/** Timing within a pack's turn (seconds). */
const T_ = { draw: [0, 0.6], wipe: [0.45, 1.1], ghost: [0.75, 1.3], form: [1.1, 2.7], scan: [2.7, 3.35], dims: [3.0, 4.3], turn: [2.9, 4.6] } as const;

type Pt2 = [number, number];
export type HudLine = { a: Pt2; b: Pt2; kind: "cut" | "crease"; p: number; alpha: number };
export type HudDim = { a: Pt2; b: Pt2; text: string; alpha: number };
export type FormsFrame = { item: number; t: number; phase: number; w: number; h: number; lines: HudLine[]; dims: HudDim[]; laser: [Pt2, Pt2] | null; scan: Pt2[] | null; fade: number };

type Act = {
  item: FilmItem;
  x: number;
  group: THREE.Group;
  lines: Line3[];
  ranks: number[];
  box: { x0: number; x1: number; z0: number; z1: number };
  prod: { w: number; h: number; d: number };
  pose: (t: number) => void;
  posedAt: number | null;
  dispose: () => void;
};

/* ---------------------------------------------------------------- sizes, before building */

function extentOf(it: FilmItem): number {
  const set = FOLDED.has(it.form) ? foldsFor(it.form as "carton", it.w, it.h, it.d) : null;
  if (set) {
    const fl = set.pieces.map((p) => flatOf(p));
    return Math.max(fl.reduce((a, f) => a + f.box.w, 0) + 30 * (fl.length - 1), it.w);
  }
  if (ROUND.has(it.form)) return Math.max(Math.PI * it.w * 1.5 + 90, 2 * it.w);
  if (it.form === "pouch") return 3 * it.w + 60;
  if (it.form === "blister") return it.w * 1.9 + 40;
  return it.w * 1.3;
}

/** Each pack's place along the track (mm). */
const TRACK: number[] = (() => {
  const out: number[] = [0];
  for (let i = 1; i < FILM.length; i++) out.push(out[i - 1] + (extentOf(FILM[i - 1]) + extentOf(FILM[i])) / 2 + 220);
  return out;
})();

/* ---------------------------------------------------------------- camera curves */

type Cam = { tx: number; ty: number; tz: number; dist: number; elev: number; azim: number };
const KEYS = ["tx", "ty", "tz", "dist", "elev", "azim"] as const;
function spline(ts: number[], vs: number[], t: number): number {
  if (t <= ts[0]) return vs[0];
  const n = ts.length;
  if (t >= ts[n - 1]) return vs[n - 1];
  let i = 0;
  while (t > ts[i + 1]) i++;
  const h = ts[i + 1] - ts[i];
  const s = (t - ts[i]) / h;
  const m = (k: number) => (k <= 0 || k >= n - 1 ? 0 : ((vs[k + 1] - vs[k - 1]) / (ts[k + 1] - ts[k - 1])) * 0.85);
  const m0 = m(i) * h;
  const m1 = m(i + 1) * h;
  const s2 = s * s;
  const s3 = s2 * s;
  return (2 * s3 - 3 * s2 + 1) * vs[i] + (s3 - 2 * s2 + s) * m0 + (-2 * s3 + 3 * s2) * vs[i + 1] + (s3 - s2) * m1;
}

/* ---------------------------------------------------------------- the scene */

export class FormsScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(30, 1, 0.01, 400);
  private key: THREE.DirectionalLight;
  private rim: THREE.DirectionalLight;
  private env: THREE.Texture;
  private grid: THREE.Mesh;
  private gridMat: THREE.ShaderMaterial;
  private acts = new Map<number, Act>();
  private w = 1;
  private h = 1;
  private shiftOverride: number | null = null;
  private shiftY = 0;
  private t0 = 0;
  private raf = 0;
  private running = false;
  private maxTex: number;
  private pending = false;
  onFrame?: (f: FormsFrame) => void;

  constructor(canvasEl: HTMLCanvasElement, opts: { maxTex?: number } = {}) {
    const r = (this.renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: true, powerPreference: "high-performance" }));
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.NeutralToneMapping;
    r.toneMappingExposure = 1.05;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.localClippingEnabled = true;
    this.maxTex = Math.min(opts.maxTex ?? 1280, r.capabilities.maxTextureSize);
    const pm = new THREE.PMREMGenerator(r);
    const eq = studioEquirect(512);
    this.env = pm.fromEquirectangular(eq).texture;
    pm.dispose();
    eq.dispose();
    this.scene.environment = this.env;
    this.scene.environmentIntensity = 0.62;
    this.scene.background = BG;
    this.scene.fog = new THREE.Fog(BG, 10, 40);
    this.scene.add(new THREE.HemisphereLight("#9fb4c8", "#0b0d10", 0.35));
    this.key = new THREE.DirectionalLight("#fff6ec", 2.4);
    this.key.castShadow = true;
    this.key.shadow.mapSize.set(2048, 2048);
    this.key.shadow.bias = -0.0004;
    this.key.shadow.normalBias = 0.015;
    this.key.shadow.radius = 4;
    this.rim = new THREE.DirectionalLight("#9fd8ff", 1.6);
    this.scene.add(this.key, this.key.target, this.rim, this.rim.target);
    // floor: dark, slightly glossy, taking the shadows
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(4000, 400), new THREE.MeshStandardMaterial({ color: "#0C0F13", roughness: 0.62, metalness: 0.1, polygonOffset: true, polygonOffsetFactor: 4, polygonOffsetUnits: 8 }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);
    // a millimetre grid on it: 10 mm and 100 mm lines that fade with distance
    // sheets lie a fraction of a millimetre above the floor: push the floor and grid back in depth
    this.gridMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: 2,
      polygonOffsetUnits: 4,
      uniforms: { uC: { value: new THREE.Vector2() }, uR: { value: 3 } },
      vertexShader: `varying vec2 vP; void main(){ vec4 w = modelMatrix * vec4(position,1.); vP = w.xz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: `
        uniform vec2 uC; uniform float uR; varying vec2 vP;
        float gridLine(vec2 p, float s){ vec2 g = abs(fract(p / s - 0.5) - 0.5) / fwidth(p / s); return 1.0 - min(min(g.x, g.y), 1.0); }
        void main(){
          float d = length(vP - uC) / uR;
          float fade = smoothstep(1.0, 0.15, d);
          float minor = gridLine(vP, 0.1) * clamp(0.5 / (fwidth(vP.x) * 60.0), 0.0, 1.0);
          float major = gridLine(vP, 1.0);
          float a = (minor * 0.07 + major * 0.16) * fade;
          gl_FragColor = vec4(vec3(0.55, 0.8, 1.0), a);
        }`,
    });
    this.grid = new THREE.Mesh(new THREE.PlaneGeometry(4000, 400), this.gridMat);
    this.grid.rotation.x = -Math.PI / 2;
    this.grid.position.y = 0.0004;
    this.grid.renderOrder = -1;
    this.scene.add(this.grid);
  }

  /* ---------------------------------------------------------------- building a pack */

  private build(ix: number): Act {
    const item = FILM[ix];
    const sample = SAMPLES.find((s) => s.id === item.sample) ?? SAMPLES[0];
    const board = sample.board;
    const d = board.directions[item.dir % board.directions.length];
    const finish = item.form === "pouch" || item.form === "pillow" ? "matte" : sample.pack.finish === "paper" && ROUND.has(item.form) ? "gloss" : sample.pack.finish;
    const art: ArtInput = { d, brand: board.meta.brand.startsWith("[") ? "" : board.meta.brand, finish, effects: [], info: null };
    const own: { dispose(): void }[] = [];
    const planes = makePlanes();
    const group = new THREE.Group();
    const x = TRACK[ix] * U;
    group.position.x = x;
    this.scene.add(group);
    const turn = new THREE.Group();
    group.add(turn);
    const raw = makeKit(this.renderer, art, this.maxTex, board.meta.category);
    own.push(raw);
    // one artwork per face and size, shared by the flat print and the 3D model
    const texCache = new Map<string, THREE.MeshPhysicalMaterial>();
    const kit: Kit = {
      ...raw,
      tex: (kind, w, h, surface) => {
        const k = `${kind}|${Math.round(w * 10)}|${Math.round(h * 10)}|${surface ?? "board"}`;
        let m = texCache.get(k);
        if (!m) texCache.set(k, (m = raw.tex(kind, w, h, surface)));
        return m;
      },
    };
    const spec: PackSpec = { form: (item.form === "rsc" || item.form === "pillow" ? "carton" : item.form) as PackSpec["form"], w: item.w, h: item.h, d: item.d, finish };
    const clipM = <T extends THREE.Material>(m: T): T => {
      const c = m.clone() as T;
      c.clippingPlanes = [planes.wipe, planes.above];
      own.push(c);
      return c;
    };
    let model: THREE.Object3D | null = null;
    let holo: Holo | null = null;
    const withModel = () => {
      const b = buildForm({ spec, kit, art, maxTex: this.maxTex, own, category: board.meta.category });
      b.apply(0);
      b.explode(0);
      b.root.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) {
          m.castShadow = true;
          m.receiveShadow = true;
        }
      });
      turn.add(b.root);
      model = b.root;
      holo = holographic(b.root, planes, 3 * U);
      own.push(holo);
    };

    let flat: { root: THREE.Group; lines: Line3[]; box: Act["box"]; pose: (f: number) => void; dispose: () => void };
    let extra: ((t: number) => void) | null = null;
    let hasScan = true;
    if (FOLDED.has(item.form)) {
      const set = foldsFor(item.form as "carton", item.w, item.h, item.d)!;
      const netD = Math.max(...set.pieces.map((p) => flatOf(p).box.h));
      const zMid = item.d / 2 + 50 + netD / 2;
      const looks = new Map<string, THREE.Material>();
      const cached = (key: string, make: () => THREE.Material) => {
        let m = looks.get(key);
        if (!m) looks.set(key, (m = make()));
        return m;
      };
      const roles = { key: new THREE.Color(d.palette.find((p) => p.role === "brand")?.hex ?? d.palette[0].hex) };
      const look = (piece: FoldPiece, p: FoldPanel) => {
        const bb = flatOf({ ...piece, panels: [p] }).box;
        const rot = p.art?.rot ?? 0;
        const aw = rot === 90 || rot === 270 ? bb.h : bb.w;
        const ah = rot === 90 || rot === 270 ? bb.w : bb.h;
        let top: THREE.Material;
        if (set.material === "wood") {
          top = p.art ? cached(`eng|${aw}|${ah}`, () => clipM(raw.engraved("front", aw, ah))) : cached(`wood|${Math.round(bb.w)}|${Math.round(bb.h)}`, () => clipM(raw.wood(bb.w, bb.h)));
          const under = cached(`woodU|${Math.round(bb.w)}`, () => clipM(raw.wood(bb.w, bb.h)));
          return { top, under, edge: under };
        }
        if (p.art && (p.art.kind === "rscFront" || p.art.kind === "rscSide")) {
          const kindR = p.art.kind;
          const info = !!p.art.info;
          top = cached(`rsc|${kindR}|${aw}|${ah}|${info}`, () => {
            const t = new THREE.CanvasTexture(rscArt(kindR, aw, ah, art, item, info));
            t.colorSpace = THREE.SRGBColorSpace;
            t.anisotropy = 4;
            own.push(t);
            return clipM(new THREE.MeshStandardMaterial({ map: t, roughness: 0.92 }));
          });
        } else if (p.art) {
          top = cached(`art|${p.art.kind}|${aw}|${ah}`, () => clipM(kit.tex(p.art!.kind as Parameters<Kit["tex"]>[0], aw, ah, set.material === "film" ? "film" : "board")));
        } else if (p.glue) {
          top = cached("glue", () => clipM(set.material === "corrugated" ? raw.kraft : raw.inside));
        } else if (item.form === "rsc") {
          top = cached("kraft", () => {
            const t = new THREE.CanvasTexture(kraftPlain());
            t.colorSpace = THREE.SRGBColorSpace;
            t.wrapS = t.wrapT = THREE.RepeatWrapping;
            own.push(t);
            return clipM(new THREE.MeshStandardMaterial({ map: t, roughness: 0.93 }));
          });
        } else if (piece.base === "key") {
          top = cached("key", () => clipM(new THREE.MeshPhysicalMaterial({ color: roles.key, roughness: 0.6 })));
        } else top = cached("plain", () => clipM(raw.plain(set.material === "film" ? "film" : "board")));
        const under = cached("under", () =>
          set.material === "corrugated" ? clipM(raw.kraft) : set.material === "rigid" ? clipM(new THREE.MeshStandardMaterial({ color: "#8F8A80", roughness: 0.95 })) : set.material === "film" ? clipM(raw.bareMetal) : clipM(raw.inside),
        );
        const edge = cached("edge", () => (set.material === "corrugated" ? clipM(new THREE.MeshStandardMaterial({ color: "#A27A4E", roughness: 0.95 })) : clipM(raw.edge)));
        return { top, under, edge };
      };
      const net = buildNet(set, look, zMid);
      flat = net;
      turn.add(net.root);
      if (item.form === "rsc") {
        hasScan = false;
        const tp = tape(item.w, item.h, 3);
        own.push(tp);
        turn.add(tp.mesh);
        extra = (t) => tp.set(ease(seg(t, [2.75, 3.4])));
      } else withModel();
    } else if (ROUND.has(item.form)) {
      withModel();
      const wr = buildWraps(model!, planes, (Math.max(item.d, item.w) / 2 + 60) * U + 0.35 * item.h * U);
      flat = wr;
      turn.add(wr.root);
    } else if (item.form === "pouch") {
      withModel();
      const mp = morphPouch(item.w, item.h, item.d, kit, planes, (item.d / 2 + 60 + item.h / 2) * U);
      flat = mp;
      turn.add(mp.root);
    } else if (item.form === "blister") {
      withModel();
      const mp = morphBlister(item.w, item.h, item.d, kit, planes, (item.d / 2 + 50) * U);
      flat = mp;
      turn.add(mp.root);
    } else {
      hasScan = false;
      const pl = buildPillow(item.w, item.d, item.h, art, this.renderer, planes, (item.d / 2 + 70 + item.d) * U);
      flat = pl;
      turn.add(pl.root);
    }
    own.push(flat);
    // reveal order of the dieline: left to right across the sheet
    const mids = flat.lines.map((l) => (l.a.x + l.b.x) / 2);
    const lo = Math.min(...mids);
    const hi = Math.max(...mids);
    const ranks = mids.map((m) => (hi > lo ? (m - lo) / (hi - lo) : 0));
    const box = flat.box;
    const top = item.h * U * 1.06 + 0.01;
    const pose = (t: number) => {
      const f = ease(seg(t, T_.form));
      flat.pose(f);
      extra?.(t);
      // the print: a laser line sweeps the sheet; before it, only the vector dieline exists
      const wipeK = clamp((t - T_.wipe[0]) / (T_.wipe[1] - T_.wipe[0]));
      setWipe(planes, x + box.x0 - 0.02 + (box.x1 - box.x0 + 0.04) * wipeK + (wipeK >= 1 ? 1e5 : 0));
      const ghost = hasScan ? ease(seg(t, T_.ghost)) : 0;
      const sk = seg(t, T_.scan);
      const scanY = !hasScan ? -1e6 : sk <= 0 ? -1e6 : sk >= 1 ? 1e6 : -0.005 + (top + 0.01) * ease(sk);
      setScan(planes, scanY);
      (holo as Holo | null)?.set(ghost, scanY);
      // after the scan, the flat print's job is done
      flat.root.visible = !hasScan || sk < 1;
      if (model) (model as THREE.Object3D).visible = t > T_.ghost[0];
      turn.rotation.y = 0.38 * ease(seg(t, T_.turn));
    };
    pose(0);
    return {
      item,
      x,
      group,
      lines: flat.lines,
      ranks,
      box,
      prod: { w: item.w, h: item.h, d: item.d },
      pose,
      posedAt: null,
      dispose: () => {
        this.scene.remove(group);
        own.forEach((o) => o.dispose());
      },
    };
  }

  private act(ix: number): Act {
    let a = this.acts.get(ix);
    if (!a) {
      a = this.build(ix);
      this.acts.set(ix, a);
    }
    return a;
  }

  /** Keeps the packs around `ix` built, and drops the rest. */
  private keep(ix: number, ahead = true) {
    const want = new Set([ix - 1, ix, ...(ahead ? [ix + 1] : [])].filter((i) => i >= 0 && i < FILM.length));
    for (const [i, a] of this.acts)
      if (!want.has(i)) {
        a.dispose();
        this.acts.delete(i);
      }
    for (const i of want) this.act(i);
  }

  /* ---------------------------------------------------------------- camera */

  private fit(wd: number, ht: number): number {
    const fovY = (this.camera.fov * Math.PI) / 180;
    const aspect = this.w / this.h;
    const wide = aspect > 1.25 && this.shiftOverride === null;
    const frac = wide ? 0.5 : 0.9;
    const fovX = 2 * Math.atan(Math.tan(fovY / 2) * aspect * frac);
    return Math.max(ht / (2 * Math.tan(fovY / 2)), wd / (2 * Math.tan(fovX / 2))) * 1.18;
  }

  private camOf(a: Act, t: number): Cam {
    const W = a.prod.w * U;
    const H = a.prod.h * U;
    const D = a.prod.d * U;
    // the sheet and the hologram of the finished pack behind it, framed together
    const nb = { x0: Math.min(a.box.x0, -W / 2), x1: Math.max(a.box.x1, W / 2), z0: Math.min(a.box.z0, -D / 2), z1: Math.max(a.box.z1, D / 2) };
    const ncx = (nb.x0 + nb.x1) / 2 + a.x;
    const ncz = (nb.z0 + nb.z1) / 2;
    const fitNet = this.fit(nb.x1 - nb.x0, (nb.z1 - nb.z0) * 0.9 + H * 0.4);
    const fitProd = this.fit(Math.max(W, D) * 1.25, H * 1.1 + D * 0.35);
    // the sheet while it is drawn, printed and folded; then the finished pack
    const mid = (p: number, q: number, k: number) => p + (q - p) * k;
    const ts = [0, 1.1, 1.95, 2.75, 4.6];
    const v: Record<(typeof KEYS)[number], number[]> = {
      tx: [ncx, ncx, mid(ncx, a.x, 0.4), a.x, a.x],
      ty: [0, 0, H * 0.3, H * 0.48, H * 0.5],
      tz: [ncz, ncz, mid(ncz, 0, 0.4), 0, 0],
      dist: [fitNet * 1.2, fitNet * 1.1, Math.max(fitNet * 0.85, fitProd * 1.3), fitProd * 1.2, fitProd * 1.08],
      elev: [64, 56, 42, 24, 19],
      azim: [-10, -4, 6, 18, 30],
    };
    const out = {} as Cam;
    for (const k of KEYS) out[k] = spline(ts, v[k], t);
    return out;
  }

  private cameraAt(time: number) {
    const ix = Math.min(FILM.length - 1, Math.floor(time / CH));
    const t = time - ix * CH;
    let c = this.camOf(this.act(ix), t);
    // glide from one pack to the next across the cut
    const half = 0.5;
    let other: Cam | null = null;
    let wgt = 0;
    if (t > CH - half && ix + 1 < FILM.length) {
      other = this.camOf(this.act(ix + 1), 0);
      wgt = (t - (CH - half)) / (2 * half);
    } else if (t < half && ix > 0) {
      other = c;
      c = this.camOf(this.act(ix - 1), CH);
      wgt = (t + half) / (2 * half);
    }
    if (other) {
      const s = wgt * wgt * wgt * (wgt * (wgt * 6 - 15) + 10);
      for (const k of KEYS) c[k] = c[k] + (other[k] - c[k]) * s;
    }
    const e = (c.elev * Math.PI) / 180;
    const az = (c.azim * Math.PI) / 180;
    const tgt = new THREE.Vector3(c.tx, c.ty, c.tz);
    this.camera.position.set(tgt.x + Math.sin(az) * Math.cos(e) * c.dist, tgt.y + Math.sin(e) * c.dist, tgt.z + Math.cos(az) * Math.cos(e) * c.dist);
    this.camera.lookAt(tgt);
    // a near plane in proportion keeps depth precise for paper a third of a millimetre thick
    this.camera.near = c.dist * 0.05;
    this.camera.far = c.dist * 12;
    this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld();
    // light and fog follow the subject's scale
    this.key.position.copy(tgt).add(new THREE.Vector3(-0.55, 1.1, 0.75).multiplyScalar(c.dist * 1.2));
    this.key.target.position.copy(tgt);
    const sc = this.key.shadow.camera;
    const R = c.dist * 0.9;
    sc.left = -R;
    sc.right = R;
    sc.top = R;
    sc.bottom = -R;
    sc.near = 0.01;
    sc.far = c.dist * 4;
    sc.updateProjectionMatrix();
    this.rim.position.copy(tgt).add(new THREE.Vector3(0.9, 0.7, -1.2).multiplyScalar(c.dist));
    this.rim.target.position.copy(tgt);
    const fog = this.scene.fog as THREE.Fog;
    fog.near = c.dist * 1.3;
    fog.far = c.dist * 4.2;
    this.gridMat.uniforms.uC.value.set(tgt.x, tgt.z);
    this.gridMat.uniforms.uR.value = c.dist * 1.6;
  }

  /* ---------------------------------------------------------------- frames */

  resize(w: number, h: number) {
    this.w = Math.max(1, w);
    this.h = Math.max(1, h);
    this.renderer.setSize(this.w, this.h, false);
    this.camera.aspect = this.w / this.h;
    const wide = this.w / this.h > 1.25;
    const shiftX = this.shiftOverride !== null ? -this.w * this.shiftOverride : wide ? -this.w * 0.2 : 0;
    // a little above centre, clear of the caption at the bottom
    this.camera.setViewOffset(this.w, this.h, shiftX, this.h * (this.shiftOverride === null ? 0.05 : this.shiftY), this.w, this.h);
    this.camera.updateProjectionMatrix();
  }

  setShift(f: number | null, fy = 0) {
    this.shiftOverride = f;
    this.shiftY = fy;
    this.resize(this.w, this.h);
  }

  private project(v: THREE.Vector3): Pt2 {
    const p = v.clone().project(this.camera);
    return [((p.x + 1) / 2) * this.w, ((1 - p.y) / 2) * this.h];
  }

  private render(time: number) {
    const total = FILM.length * CH;
    time = ((time % total) + total) % total;
    const ix = Math.min(FILM.length - 1, Math.floor(time / CH));
    const t = time - ix * CH;
    this.keep(ix, !this.running || t > CH - 1 || this.acts.has(ix + 1));
    // build the next pack while this one holds still, not in the middle of its motion
    if (this.running && t > 1.5 && ix + 1 < FILM.length && !this.acts.has(ix + 1) && !this.pending) {
      this.pending = true;
      const w = window as Window & { requestIdleCallback?: (f: () => void, o?: { timeout: number }) => void };
      (w.requestIdleCallback ?? ((f: () => void) => setTimeout(f, 0)))(
        () => {
          this.pending = false;
          if (!this.running) return;
          this.act(Math.min(FILM.length - 1, Math.floor((((performance.now() / 1000 - this.t0) % (FILM.length * CH)) + FILM.length * CH) % (FILM.length * CH) / CH) + 1));
          // compile its shaders now, while nothing moves, rather than on its first frame
          this.renderer.compile(this.scene, this.camera);
        },
        { timeout: 1500 },
      );
    }
    for (const [i, a] of this.acts) {
      // packs waiting flat, or finished and still, need no posing
      const lt = clamp(time - i * CH, -1, CH + 2);
      const done = T_.turn[1] + 0.05;
      if (a.posedAt !== null && ((lt <= 0 && a.posedAt <= 0) || (lt >= done && a.posedAt >= done))) continue;
      a.pose(lt);
      a.posedAt = lt;
    }
    this.cameraAt(time);
    this.renderer.render(this.scene, this.camera);
    if (!this.onFrame) return;
    // the 2D layer: dieline, laser, scan contour, dimensions
    const a = this.act(ix);
    const lines: HudLine[] = [];
    // the next pack's dieline starts drawing while the camera is still on its way
    for (const j of [ix, ix + 1]) {
      const b = this.acts.get(j);
      if (!b) continue;
      const lt = time - j * CH;
      const drawAlpha = 1 - clamp((lt - 1.15) / 0.35);
      if (lt < -0.5 || drawAlpha <= 0) continue;
      b.lines.forEach((l, k) => {
        const start = -0.4 + b.ranks[k] * 0.36 + (l.kind === "crease" ? 0.2 : 0);
        const p = clamp((lt - start) / 0.32);
        if (p <= 0) return;
        const A = l.a.clone().add(b.group.position);
        const B = l.b.clone().add(b.group.position);
        lines.push({ a: this.project(A), b: this.project(B), kind: l.kind, p, alpha: drawAlpha });
      });
    }
    let laser: [Pt2, Pt2] | null = null;
    const wk = (t - T_.wipe[0]) / (T_.wipe[1] - T_.wipe[0]);
    if (wk > 0 && wk < 1) {
      const lx = a.x + a.box.x0 + (a.box.x1 - a.box.x0) * wk;
      laser = [this.project(new THREE.Vector3(lx, 0.002, a.box.z0 - 0.01)), this.project(new THREE.Vector3(lx, 0.002, a.box.z1 + 0.01))];
    }
    let scan: Pt2[] | null = null;
    const sk = seg(t, T_.scan);
    const round = ROUND.has(a.item.form);
    const W = a.prod.w * U;
    const H = a.prod.h * U;
    const D = a.prod.d * U;
    const rotY = 0.38 * ease(seg(t, T_.turn));
    const toWorld = (px: number, py: number, pz: number) => new THREE.Vector3(px, py, pz).applyAxisAngle(new THREE.Vector3(0, 1, 0), rotY).add(a.group.position);
    if (sk > 0 && sk < 1 && a.item.form !== "rsc" && a.item.form !== "pillow") {
      const y = (H * 1.06 + 0.01) * ease(sk);
      const pts: Pt2[] = [];
      if (round) for (let k = 0; k < 48; k++) pts.push(this.project(toWorld(Math.cos((k / 48) * Math.PI * 2) * (W / 2 + 0.006), y, Math.sin((k / 48) * Math.PI * 2) * (W / 2 + 0.006))));
      else for (const [px, pz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) pts.push(this.project(toWorld(px * (W / 2 + 0.006), y, pz * (D / 2 + 0.006))));
      scan = pts;
    }
    const dims: HudDim[] = [];
    const da = clamp((t - T_.dims[0]) / 0.3) * (1 - clamp((t - T_.dims[1]) / 0.3));
    if (da > 0) {
      const off = Math.max(W, D) * 0.12 + 0.012;
      const it = a.item;
      if (round) {
        dims.push({ a: this.project(toWorld(-W / 2, 0, W / 2 + off)), b: this.project(toWorld(W / 2, 0, W / 2 + off)), text: `Ø${it.w} mm`, alpha: da });
        dims.push({ a: this.project(toWorld(W / 2 + off, 0, 0)), b: this.project(toWorld(W / 2 + off, H, 0)), text: `${it.h} mm`, alpha: da });
      } else {
        dims.push({ a: this.project(toWorld(-W / 2, 0, D / 2 + off)), b: this.project(toWorld(W / 2, 0, D / 2 + off)), text: `${it.w} mm`, alpha: da });
        dims.push({ a: this.project(toWorld(W / 2 + off, 0, D / 2)), b: this.project(toWorld(W / 2 + off, 0, -D / 2)), text: `${it.d} mm`, alpha: da });
        dims.push({ a: this.project(toWorld(-W / 2 - off, 0, D / 2)), b: this.project(toWorld(-W / 2 - off, H, D / 2)), text: `${it.h} mm`, alpha: da });
      }
    }
    // the loop closes through black: the last pack and the first are far apart on the track
    const fade = ix === 0 ? 1 - clamp(t / 0.45) : ix === FILM.length - 1 ? clamp((t - (CH - 0.45)) / 0.45) : 0;
    this.onFrame({ item: ix, t, phase: phaseOf(t), w: this.w, h: this.h, lines, dims, laser, scan, fade });
  }

  frame(now: number) {
    this.render(now);
  }

  /** Jump to pack `ix`, `t` seconds into its turn. */
  show(ix: number, t = 0.05) {
    this.t0 = performance.now() / 1000 - (ix * CH + t);
    if (!this.running) this.still(ix, t);
  }

  start() {
    if (this.running) return;
    this.running = true;
    if (!this.t0) this.t0 = performance.now() / 1000;
    const loop = () => {
      if (!this.running) return;
      this.render(performance.now() / 1000 - this.t0);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  still(ix: number, t: number) {
    this.stop();
    this.render(ix * CH + t);
  }

  dispose() {
    this.stop();
    for (const a of this.acts.values()) a.dispose();
    this.acts.clear();
    this.env.dispose();
    this.gridMat.dispose();
    this.grid.geometry.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }
}

export { FILM };
