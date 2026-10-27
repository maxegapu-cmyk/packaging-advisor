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
import { holographicSteps, makePlanes, setScan, setWipe, type Holo, type Planes } from "./holo";
import { FILM, ITEM_SECONDS as CH, phaseOf, type FilmItem } from "./items";
import { buildPillow, morphBlister, morphPouch } from "./morph";
import { buildNet, type Line3 } from "./net";
import { kraftPlain, rscArt, tape } from "./rsc";
import { buildWraps } from "./wrap";

/** The film's surroundings in the dark and light themes. */
const TONES = {
  dark: { bg: "#080A0C", floor: "#0D1013", grid: [0.5, 0.82, 0.8], gridA: 1, hemiSky: "#9fb4c8", hemiGround: "#0b0d10", hemi: 0.35, rim: "#9fe0da", rimI: 1.6, env: 0.62, exposure: 1.05 },
  light: { bg: "#ECEAE3", floor: "#E6E3DB", grid: [0.16, 0.2, 0.19], gridA: 0.7, hemiSky: "#ffffff", hemiGround: "#d9d5ca", hemi: 0.75, rim: "#e8f1f0", rimI: 0.7, env: 0.7, exposure: 1.0 },
} as const;
const ROUND = new Set(["tin", "can", "bottle", "tube", "jar", "glassBottle", "ceramic", "paperTube"]);
const FOLDED = new Set(["carton", "mailer", "rsc", "gift", "bookBox", "drawer", "bag", "aseptic", "woodBox"]);

/** Timing within a pack's turn (seconds). */
const T_ = { draw: [0, 0.6], wipe: [0.45, 1.1], ghost: [0.8, 1.4], form: [1.1, 3.3], scan: [3.3, 3.9], dims: [3.6, 4.9], turn: [3.4, 5.1] } as const;
/** Camera keys within a turn: on the sheet, leaving it, arriving at the pack, settled. */
const CAM_T = [0, 1.1, 2.25, 3.35, 5.1];

type Pt2 = [number, number];
export type HudLine = { a: Pt2; b: Pt2; kind: "cut" | "crease"; p: number; alpha: number };
export type HudDim = { a: Pt2; b: Pt2; text: string; alpha: number };
export type FormsFrame = { item: number; t: number; phase: number; w: number; h: number; lines: HudLine[]; dims: HudDim[]; laser: [Pt2, Pt2] | null; fade: number };

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
  holo: Holo | null;
  /** Hologram and scan line in the dark or light film. */
  tone: (dark: boolean) => void;
  /** How high the sheet is lifted to fold (scene units), for the camera to follow. */
  rise: (t: number) => number;
  /** Where the folding sheet is (act units, smoothed), for packs folded from a net. */
  sheetAt: (t: number) => { x0: number; y0: number; z0: number; x1: number; y1: number; z1: number } | null;
  dispose: () => void;
};

/** A pack being built a little at a time while the one before it plays. */
type Job = { ix: number; gen: Generator<void, Act, void>; act?: Act; warm?: THREE.Object3D[] };

const finish = <T>(g: Generator<void, T, void>): T => {
  let r = g.next();
  while (!r.done) r = g.next();
  return r.value;
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
  private floorMat: THREE.MeshStandardMaterial;
  private hemi: THREE.HemisphereLight;
  private dark = true;
  private acts = new Map<number, Act>();
  private w = 1;
  private h = 1;
  private shiftOverride: number | null = null;
  private shiftY = 0;
  private t0 = 0;
  private raf = 0;
  private running = false;
  private maxTex: number;
  private job: Job | null = null;
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
    this.scene.background = new THREE.Color(TONES.dark.bg);
    this.scene.fog = new THREE.Fog(new THREE.Color(TONES.dark.bg), 10, 40);
    this.hemi = new THREE.HemisphereLight("#9fb4c8", "#0b0d10", 0.35);
    this.scene.add(this.hemi);
    this.key = new THREE.DirectionalLight("#fff6ec", 2.4);
    this.key.castShadow = true;
    this.key.shadow.mapSize.set(2048, 2048);
    this.key.shadow.bias = -0.0004;
    this.key.shadow.normalBias = 0.015;
    this.key.shadow.radius = 4;
    this.rim = new THREE.DirectionalLight("#9fe0da", 1.6);
    this.scene.add(this.key, this.key.target, this.rim, this.rim.target);
    // floor: dark, slightly glossy, taking the shadows
    this.floorMat = new THREE.MeshStandardMaterial({ color: TONES.dark.floor, roughness: 0.62, metalness: 0.1, polygonOffset: true, polygonOffsetFactor: 4, polygonOffsetUnits: 8 });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(4000, 400), this.floorMat);
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
      uniforms: { uC: { value: new THREE.Vector2() }, uR: { value: 3 }, uCol: { value: new THREE.Vector3(...TONES.dark.grid) }, uA: { value: 1 } },
      vertexShader: `varying vec2 vP; void main(){ vec4 w = modelMatrix * vec4(position,1.); vP = w.xz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: `
        uniform vec2 uC; uniform float uR; uniform vec3 uCol; uniform float uA; varying vec2 vP;
        float gridLine(vec2 p, float s){ vec2 g = abs(fract(p / s - 0.5) - 0.5) / fwidth(p / s); return 1.0 - min(min(g.x, g.y), 1.0); }
        void main(){
          float d = length(vP - uC) / uR;
          float fade = smoothstep(1.0, 0.15, d);
          float minor = gridLine(vP, 0.1) * clamp(0.5 / (fwidth(vP.x) * 60.0), 0.0, 1.0);
          float major = gridLine(vP, 1.0);
          float a = (minor * 0.07 + major * 0.16) * fade * uA;
          gl_FragColor = vec4(uCol, a);
        }`,
    });
    this.grid = new THREE.Mesh(new THREE.PlaneGeometry(4000, 400), this.gridMat);
    this.grid.rotation.x = -Math.PI / 2;
    this.grid.position.y = 0.0004;
    this.grid.renderOrder = -1;
    this.scene.add(this.grid);
  }

  /** The dark film (the hologram glows) or the light one (paper, ink and celadon). */
  setTone(dark: boolean) {
    this.dark = dark;
    const t = dark ? TONES.dark : TONES.light;
    (this.scene.background as THREE.Color).set(t.bg);
    (this.scene.fog as THREE.Fog).color.set(t.bg);
    this.floorMat.color.set(t.floor);
    this.floorMat.roughness = dark ? 0.62 : 0.9;
    this.floorMat.metalness = dark ? 0.1 : 0;
    this.gridMat.uniforms.uCol.value.set(...t.grid);
    this.gridMat.uniforms.uA.value = t.gridA;
    this.hemi.color.set(t.hemiSky);
    this.hemi.groundColor.set(t.hemiGround);
    this.hemi.intensity = t.hemi;
    this.rim.color.set(t.rim);
    this.rim.intensity = t.rimI;
    this.scene.environmentIntensity = t.env;
    this.renderer.toneMappingExposure = t.exposure;
    for (const a of this.acts.values()) a.tone(dark);
    if (!this.running && this.lastTime !== null) this.render(this.lastTime);
  }

  /* ---------------------------------------------------------------- building a pack */

  /**
   * Builds pack `ix` in small steps (a generator: each `yield` is a place to pause), so that
   * while the film plays the work is spread over many frames instead of one long stall.
   */
  private *build(ix: number): Generator<void, Act, void> {
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
    // hidden until it is whole
    group.visible = false;
    const turn = new THREE.Group();
    group.add(turn);
    // printed faces are drawn as separate steps, after the shapes exist
    const faces: (() => void)[] = [];
    const drawFaces = function* () {
      while (faces.length) {
        faces.shift()!();
        yield;
      }
    };
    const raw = makeKit(this.renderer, art, this.maxTex, board.meta.category, { defer: (j) => faces.push(j) });
    own.push(raw);
    let built = false;
    try {
      yield;
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
        c.clipShadows = true;
        own.push(c);
        return c;
      };
      let model: THREE.Object3D | null = null;
      let holo: Holo | null = null;
      const withModel = function* (this: FormsScene) {
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
        yield;
        holo = yield* holographicSteps(b.root, planes, 3 * U, this.dark);
        own.push(holo);
        yield;
      };

      let flat: { root: THREE.Group; lines: Line3[]; box: Act["box"]; pose: (f: number) => void; dispose: () => void };
      let extra: ((t: number) => void) | null = null;
      let rise: (f: number) => number = () => 0;
      let sheet: (f: number) => ReturnType<Act["sheetAt"]> = () => null;
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
          // an ear is two layers of web, printed side out: no foil shows as it folds down
          if (p.ear) return { top, under: top, edge: cached("edge", () => clipM(raw.edge)) };
          const under = cached("under", () =>
            set.material === "corrugated" ? clipM(raw.kraft) : set.material === "rigid" ? clipM(new THREE.MeshStandardMaterial({ color: "#8F8A80", roughness: 0.95 })) : set.material === "film" ? clipM(new THREE.MeshStandardMaterial({ color: "#CDD0CF", metalness: 0.55, roughness: 0.42 })) : clipM(raw.inside),
          );
          const edge = cached("edge", () => (set.material === "corrugated" ? clipM(new THREE.MeshStandardMaterial({ color: "#A27A4E", roughness: 0.95 })) : clipM(raw.edge)));
          return { top, under, edge };
        };
        // the panels' looks first, a few at a time; buildNet then finds them made
        let t0 = performance.now();
        for (const piece of set.pieces)
          for (const p of piece.panels) {
            look(piece, p);
            if (performance.now() - t0 > 3) {
              yield;
              t0 = performance.now();
            }
          }
        yield* drawFaces();
        const net = buildNet(set, look, zMid);
        flat = net;
        rise = net.liftAt;
        sheet = net.boxAt;
        turn.add(net.root);
        yield;
        for (let k = 0; k < set.pieces.length; k++) {
          net.prepare(k);
          yield;
        }
        if (item.form === "rsc") {
          hasScan = false;
          const tp = tape(item.w, item.h, 3);
          own.push(tp);
          turn.add(tp.mesh);
          extra = (t) => tp.set(ease(seg(t, [3.35, 3.95])));
        } else yield* withModel.call(this);
      } else if (ROUND.has(item.form)) {
        yield* withModel.call(this);
        const wr = buildWraps(model!, planes, (Math.max(item.d, item.w) / 2 + 60) * U + 0.35 * item.h * U);
        flat = wr;
        turn.add(wr.root);
      } else if (item.form === "pouch") {
        yield* withModel.call(this);
        const mp = morphPouch(item.w, item.h, item.d, kit, planes, (item.d / 2 + 60 + item.h / 2) * U);
        flat = mp;
        turn.add(mp.root);
      } else if (item.form === "blister") {
        yield* withModel.call(this);
        const mp = morphBlister(item.w, item.h, item.d, kit, planes, (item.d / 2 + 50) * U);
        flat = mp;
        turn.add(mp.root);
      } else {
        hasScan = false;
        // no hologram to sit beside: the web lies where the pack will be and is formed in place
        const pl = buildPillow(item.w, item.d, item.h, art, this.renderer, planes, 0);
        flat = pl;
        turn.add(pl.root);
      }
      own.push(flat);
      yield* drawFaces();
      // reveal order of the dieline: left to right across the sheet
      const mids = flat.lines.map((l) => (l.a.x + l.b.x) / 2);
      const lo = Math.min(...mids);
      const hi = Math.max(...mids);
      const ranks = mids.map((m) => (hi > lo ? (m - lo) / (hi - lo) : 0));
      const box = flat.box;
      const top = item.h * U * 1.06 + 0.01;
      // the scan line: a hairline round the pack at the scan's height, hidden where the pack
      // hides it (drawn in 3D, so it never lies over the pack like a pane of glass)
      const ringPts: THREE.Vector3[] = [];
      const off = 0.008;
      if (ROUND.has(item.form)) for (let k = 0; k < 96; k++) ringPts.push(new THREE.Vector3(Math.cos((k / 96) * Math.PI * 2) * (item.w * U * 0.5 + off), 0, Math.sin((k / 96) * Math.PI * 2) * (item.w * U * 0.5 + off)));
      else for (const [px, pz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) ringPts.push(new THREE.Vector3(px * (item.w * U * 0.5 + off), 0, pz * (item.d * U * 0.5 + off)));
      const ringGeo = new THREE.BufferGeometry().setFromPoints(ringPts);
      const ringMat = new THREE.LineBasicMaterial({ color: this.dark ? "#5ED6D2" : "#2B6966", transparent: true, opacity: 0.95 });
      own.push(ringGeo, ringMat);
      const ring = new THREE.LineLoop(ringGeo, ringMat);
      ring.userData.noHolo = true;
      ring.visible = false;
      turn.add(ring);
      const pose = (t: number) => {
        // linear here: each fold, wrap and move eases on its own stretch of the form phase
        const f = seg(t, T_.form);
        flat.pose(f);
        extra?.(t);
        // the print: a laser line sweeps the sheet; before it, only the vector dieline exists
        const wipeK = clamp((t - T_.wipe[0]) / (T_.wipe[1] - T_.wipe[0]));
        setWipe(planes, x + box.x0 - 0.02 + (box.x1 - box.x0 + 0.04) * wipeK + (wipeK >= 1 ? 1e5 : 0));
        // the hologram shows the target while the sheet folds, and is gone once the folded
        // sheet fills it: otherwise its veil over the sheet would lift, band by band, as the
        // scan swaps the sheet for the finished pack (which match exactly)
        const ghost = hasScan ? ease(seg(t, T_.ghost)) * (1 - ease(seg(t, [T_.form[1] - 0.7, T_.form[1] - 0.05]))) : 0;
        const sk = seg(t, T_.scan);
        const scanY = !hasScan ? -1e6 : sk <= 0 ? -1e6 : sk >= 1 ? 1e6 : -0.005 + (top + 0.01) * ease(sk);
        setScan(planes, scanY);
        (holo as Holo | null)?.set(ghost, scanY, hasScan ? Math.min(1, sk * 8, (1 - sk) * 8) : 0);
        ring.visible = hasScan && sk > 0 && sk < 1;
        ring.position.y = scanY + 0.0005;
        ringMat.opacity = 0.95 * Math.min(1, sk * 8, (1 - sk) * 8);
        // after the scan, the flat print's job is done
        flat.root.visible = !hasScan || sk < 1;
        if (model) (model as THREE.Object3D).visible = t > T_.ghost[0];
        turn.rotation.y = 0.38 * ease(seg(t, T_.turn));
      };
      pose(0);
      group.visible = true;
      built = true;
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
        holo,
        tone: (dark: boolean) => {
          (holo as Holo | null)?.tone(dark);
          ringMat.color.set(dark ? "#5ED6D2" : "#2B6966");
        },
        rise: (t) => rise(seg(t, T_.form)),
        sheetAt: (t) => sheet(seg(t, T_.form)),
        dispose: () => {
          this.scene.remove(group);
          own.forEach((o) => o.dispose());
        },
      };
    } finally {
      // abandoned half way (the viewer jumped elsewhere): let go of what was made
      if (!built) {
        this.scene.remove(group);
        own.forEach((o) => o.dispose());
      }
    }
  }

  private act(ix: number): Act {
    let a = this.acts.get(ix);
    if (!a) {
      const j = this.job;
      if (j && j.ix === ix && !j.act) {
        // needed now: finish the steps that are left
        a = j.act = finish(j.gen);
        // the theme may have changed while it was being built
        a.tone(this.dark);
        j.warm = [];
        this.job = null;
      } else a = finish(this.build(ix));
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
    const j = this.job;
    if (j && (!want.has(j.ix) && !(ahead === false && j.ix === ix + 1))) {
      if (!j.act) j.gen.return(undefined as unknown as Act);
      this.job = null;
    }
    for (const i of want) this.act(i);
  }

  /**
   * A few milliseconds of work on the next pack: its build steps, then a first draw of its
   * meshes a couple at a time, into one pixel, so that their shaders compile and their
   * textures upload now, not on the frame where the pack first comes into view.
   */
  private work(budget = 5) {
    const j = this.job;
    if (!j) return;
    const t0 = performance.now();
    if (!j.act) {
      while (performance.now() - t0 < budget) {
        const r = j.gen.next();
        if (r.done) {
          j.act = r.value;
          r.value.tone(this.dark);
          this.acts.set(j.ix, r.value);
          j.warm = [];
          r.value.group.traverse((o) => {
            if ((o as THREE.Mesh).isMesh || (o as THREE.LineSegments).isLine) j.warm!.push(o);
          });
          break;
        }
      }
      return;
    }
    if (this.acts.get(j.ix) !== j.act || !j.warm?.length) {
      this.job = null;
      return;
    }
    const a = j.act;
    const hidden: THREE.Object3D[] = [];
    for (const c of this.scene.children)
      if (c !== a.group && c.visible && !(c as THREE.Light).isLight) {
        c.visible = false;
        hidden.push(c);
      }
    const inner: THREE.Object3D[] = [];
    a.group.traverse((o) => o !== a.group && inner.push(o));
    const saved = inner.map((o) => [o.visible, o.frustumCulled] as const);
    const r = this.renderer;
    r.setScissorTest(true);
    r.setScissor(0, 0, 1, 1);
    while (j.warm.length && performance.now() - t0 < budget) {
      const now = new Set(j.warm.splice(0, 3));
      for (const o of inner) {
        const drawn = (o as THREE.Mesh).isMesh || (o as THREE.LineSegments).isLine;
        o.visible = drawn ? now.has(o) : true;
        if (now.has(o)) o.frustumCulled = false;
      }
      r.render(this.scene, this.camera);
    }
    r.setScissorTest(false);
    inner.forEach((o, k) => {
      o.visible = saved[k][0];
      o.frustumCulled = saved[k][1];
    });
    for (const c of hidden) c.visible = true;
  }

  /* ---------------------------------------------------------------- camera */

  /**
   * How far back the camera must be, looking at `tgt` from (elev, azim) degrees, for every
   * corner of the box to be inside the frame with a margin.
   */
  private fitBox(b: { x0: number; y0: number; z0: number; x1: number; y1: number; z1: number }, tgt: THREE.Vector3, elev: number, azim: number): number {
    const fovY = (this.camera.fov * Math.PI) / 180;
    const aspect = this.w / this.h;
    const wide = aspect > 1.25 && this.shiftOverride === null;
    const tanY = Math.tan(fovY / 2) * 0.86;
    const tanX = Math.tan(fovY / 2) * aspect * (wide ? 0.5 : 0.9) * 0.9;
    const e = (elev * Math.PI) / 180;
    const az = (azim * Math.PI) / 180;
    const back = new THREE.Vector3(Math.sin(az) * Math.cos(e), Math.sin(e), Math.cos(az) * Math.cos(e));
    const right = new THREE.Vector3(Math.cos(az), 0, -Math.sin(az));
    const up = new THREE.Vector3().crossVectors(back, right);
    let need = 0;
    const v = new THREE.Vector3();
    for (const x of [b.x0, b.x1])
      for (const y of [b.y0, b.y1])
        for (const z of [b.z0, b.z1]) {
          v.set(x, y, z).sub(tgt);
          const along = v.dot(back);
          need = Math.max(need, along + Math.abs(v.dot(right)) / tanX, along + Math.abs(v.dot(up)) / tanY);
        }
    return need;
  }

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
    const ts = CAM_T;
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
    // a sheet lifted to fold stays in frame: the camera rises with it (the lift is smooth)
    out.ty += a.rise(t) * 0.4;
    // a net folds where it lies, in front of its hologram, then travels to it: the camera frames
    // where the sheet actually is (with the hologram) all the way, rather than going on ahead
    // to the finished pack and leaving the folding sheet at the edge of the shot
    const track = (tt: number) => {
      const sb = a.sheetAt(tt);
      if (!sb) return null;
      const u = { x0: Math.min(sb.x0, -W / 2), x1: Math.max(sb.x1, W / 2), y0: 0, y1: Math.max(sb.y1, H), z0: Math.min(sb.z0, -D / 2), z1: Math.max(sb.z1, D / 2) };
      const tx = (u.x0 + u.x1) / 2;
      const tz = (u.z0 + u.z1) / 2;
      const ty = spline(ts, v.ty, tt) + a.rise(tt) * 0.4;
      // far enough back that the sheet and the hologram are both wholly in the shot
      const p = this.fitBox(u, new THREE.Vector3(tx, ty, tz), spline(ts, v.elev, tt), spline(ts, v.azim, tt)) * 1.08;
      const q = fitProd * spline(ts, [0.4, 0.4, 1.1, 1.2, 1.08], tt);
      // the larger of the two, without a corner where they cross
      return { tx: tx + a.x, tz, dist: (p + q + Math.sqrt((p - q) ** 2 + (0.06 * (p + q)) ** 2)) / 2 };
    };
    if (track(t)) {
      // and does it like a camera operator, not a servo: a weighted average over about half a
      // second either side, so a quick move of the sheet becomes a calm move of the shot
      let tx = 0;
      let tz = 0;
      let dist = 0;
      let wsum = 0;
      for (let k = -8; k <= 8; k++) {
        const r = track(clamp(t + k * 0.07, 0, ts[ts.length - 1]))!;
        const w = Math.exp(-((k / 3.5) ** 2));
        tx += r.tx * w;
        tz += r.tz * w;
        dist += r.dist * w;
        wsum += w;
      }
      out.tx = tx / wsum;
      out.tz = tz / wsum;
      out.dist = dist / wsum;
    }
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

  private lastTime: number | null = null;

  private render(time: number) {
    this.lastTime = time;
    const total = FILM.length * CH;
    time = ((time % total) + total) % total;
    const ix = Math.min(FILM.length - 1, Math.floor(time / CH));
    const t = time - ix * CH;
    this.keep(ix, !this.running || t > CH - 1 || this.acts.has(ix + 1));
    // the next pack is built a step at a time from early in this one's turn (see work())
    if (this.running && t > 0.3 && ix + 1 < FILM.length && !this.acts.has(ix + 1) && !this.job) this.job = { ix: ix + 1, gen: this.build(ix + 1) };
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
    // the 2D layer: dieline, laser, dimensions (the scan line is drawn in 3D)
    const a = this.act(ix);
    const lines: HudLine[] = [];
    // the next pack's dieline starts drawing while the camera is still on its way
    for (const j of [ix, ix + 1]) {
      const b = this.acts.get(j);
      if (!b) continue;
      const lt = time - j * CH;
      const drawAlpha = 1 - clamp((lt - 1.2) / 0.35);
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
    const round = ROUND.has(a.item.form);
    const W = a.prod.w * U;
    const H = a.prod.h * U;
    const D = a.prod.d * U;
    const rotY = 0.38 * ease(seg(t, T_.turn));
    const toWorld = (px: number, py: number, pz: number) => new THREE.Vector3(px, py, pz).applyAxisAngle(new THREE.Vector3(0, 1, 0), rotY).add(a.group.position);
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
    this.onFrame({ item: ix, t, phase: phaseOf(t), w: this.w, h: this.h, lines, dims, laser, fade });
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
      this.work();
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
    if (this.job && !this.job.act) this.job.gen.return(undefined as unknown as Act);
    this.job = null;
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
