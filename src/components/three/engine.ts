/**
 * Physically based packaging renderer (three.js).
 *
 * Realism comes from the same things a product photographer controls:
 *  - a studio environment of large softboxes and strip lights, so gloss, clearcoat and metal
 *    reflect real light shapes (image-based lighting through PMREM);
 *  - Khronos PBR Neutral tone mapping, so printed colors stay true;
 *  - real material thickness: 0.45 mm board for cartons (with the raw board edge and grey
 *    inside), 1.5 mm chipboard for rigid gift boxes, rolled beads on tins;
 *  - paper fibre micro-surface, laminate clearcoat, metallic foil from a stamped mask;
 *  - soft contact shadows rendered from below and blurred (like a studio sweep).
 * The camera follows an Orbit (shared with the CSS version): x = elevation, y = product turn.
 */
import * as THREE from "three";
import type { Direction } from "@/lib/board/schema";
import type { PackSpec } from "@/lib/pack";
import { rolesOf, type ArtInfo, type ArtInput } from "./art";
import type { Reference } from "@/lib/reference";
import { buildReference } from "./reference";
import { aim, RAD, step, tw, type Built, type Pair, type PinOnScreen } from "./common";
import { buildForm } from "./build";
import { LIVE_SWEEP_ENV, makeKit, type Kit } from "./kit";
import { backdropLook, studioEquirect, sweepGeometry, type Backdrop } from "./studio";

export type { Pin, PinOnScreen } from "./common";

/** Samples before the path-traced photo is clean enough to fade in over the live view. */
const PT_MIN_SAMPLES = 160;
/** A photo render accumulates this many samples. */
const PT_MAX_SAMPLES = 480;

export type SceneInput = { d: Direction; brand: string; spec: PackSpec; open: boolean; fit: number; /** board category: what jars and bottles hold */ category?: string; /** finished label content, when there is an artwork */ info?: ArtInfo | null };
export type View = { x: number; y: number };

export function webglAvailable(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

/* ================================================================ Studio lighting */

/** The shared studio (see studio.ts), prefiltered for the live renderer. */
function studioEnvironment(renderer: THREE.WebGLRenderer, equirect: THREE.DataTexture): THREE.Texture {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const rt = pmrem.fromEquirectangular(equirect);
  pmrem.dispose();
  return rt.texture;
}

/* ================================================================ Contact shadow */

const BLUR_VERT = "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }";
const BLUR_FRAG = `
uniform sampler2D tDiffuse; uniform vec2 dir; varying vec2 vUv;
void main(){
  vec4 s = vec4(0.0);
  s += texture2D(tDiffuse, vUv - 4.0*dir) * 0.051; s += texture2D(tDiffuse, vUv - 3.0*dir) * 0.0918;
  s += texture2D(tDiffuse, vUv - 2.0*dir) * 0.12245; s += texture2D(tDiffuse, vUv - dir) * 0.1531;
  s += texture2D(tDiffuse, vUv) * 0.1633;
  s += texture2D(tDiffuse, vUv + dir) * 0.1531; s += texture2D(tDiffuse, vUv + 2.0*dir) * 0.12245;
  s += texture2D(tDiffuse, vUv + 3.0*dir) * 0.0918; s += texture2D(tDiffuse, vUv + 4.0*dir) * 0.051;
  gl_FragColor = s;
}`;

/** Renders the product's depth from below the floor, blurs it, shows it on the floor. */
class ContactShadow {
  plane: THREE.Mesh;
  private rtA: THREE.WebGLRenderTarget;
  private rtB: THREE.WebGLRenderTarget;
  private cam: THREE.OrthographicCamera;
  private depthMat: THREE.MeshDepthMaterial;
  private blurMat: THREE.ShaderMaterial;
  private quad: THREE.Mesh;
  private quadScene = new THREE.Scene();
  private quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  size = 4;

  constructor(res = 512) {
    const opts = { type: THREE.HalfFloatType, generateMipmaps: false } as const;
    this.rtA = new THREE.WebGLRenderTarget(res, res, opts);
    this.rtB = new THREE.WebGLRenderTarget(res, res, opts);
    this.cam = new THREE.OrthographicCamera(-2, 2, 2, -2, 0, 3);
    this.cam.rotation.x = Math.PI / 2;
    this.depthMat = new THREE.MeshDepthMaterial();
    this.depthMat.side = THREE.DoubleSide;
    this.depthMat.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        "gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );",
        "gl_FragColor = vec4( vec3( 0.0 ), pow( 1.0 - fragCoordZ, 4.0 ) );",
      );
    };
    this.blurMat = new THREE.ShaderMaterial({ uniforms: { tDiffuse: { value: null }, dir: { value: new THREE.Vector2() } }, vertexShader: BLUR_VERT, fragmentShader: BLUR_FRAG, depthTest: false, depthWrite: false });
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.blurMat);
    this.quadScene.add(this.quad);
    this.plane = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ map: this.rtA.texture, transparent: true, depthWrite: false, opacity: 0.9, toneMapped: false }),
    );
    this.plane.rotation.x = -Math.PI / 2;
    this.plane.position.y = 0.0006;
    this.plane.renderOrder = -1;
  }

  /** Moves the shadow area sideways (when a reference object stands next to the package). */
  setCenter(x: number) {
    this.cam.position.x = x;
    this.plane.position.x = x;
  }

  setSize(size: number, height: number) {
    this.size = size;
    // the shadow camera looks up from under the floor, so its image is mirrored
    this.plane.scale.set(size, -size, 1);
    const h = size / 2;
    this.cam.left = -h;
    this.cam.right = h;
    this.cam.top = h;
    this.cam.bottom = -h;
    this.cam.far = height;
    this.cam.updateProjectionMatrix();
  }

  update(renderer: THREE.WebGLRenderer, scene: THREE.Scene, opacity: number) {
    const mat = this.plane.material as THREE.MeshBasicMaterial;
    mat.opacity = opacity;
    if (opacity <= 0.001) return;
    const prevTarget = renderer.getRenderTarget();
    const prevClear = renderer.getClearAlpha();
    const prevBg = scene.background;
    this.plane.visible = false;
    scene.background = null;
    scene.overrideMaterial = this.depthMat;
    renderer.setClearColor(0x000000, 0);
    renderer.setRenderTarget(this.rtA);
    renderer.clear();
    renderer.render(scene, this.cam);
    scene.overrideMaterial = null;
    // two blur passes of decreasing radius soften the edge like a large light
    const px = 1 / this.rtA.width;
    for (const r of [7, 3.5, 1.5]) {
      this.blur(renderer, this.rtA, this.rtB, new THREE.Vector2(px * r, 0));
      this.blur(renderer, this.rtB, this.rtA, new THREE.Vector2(0, px * r));
    }
    renderer.setRenderTarget(prevTarget);
    renderer.setClearAlpha(prevClear);
    scene.background = prevBg;
    this.plane.visible = true;
  }

  private blur(renderer: THREE.WebGLRenderer, src: THREE.WebGLRenderTarget, dst: THREE.WebGLRenderTarget, dir: THREE.Vector2) {
    this.blurMat.uniforms.tDiffuse.value = src.texture;
    this.blurMat.uniforms.dir.value.copy(dir);
    renderer.setRenderTarget(dst);
    renderer.clear();
    renderer.render(this.quadScene, this.quadCam);
  }

  dispose() {
    this.rtA.dispose();
    this.rtB.dispose();
    this.depthMat.dispose();
    this.blurMat.dispose();
    this.quad.geometry.dispose();
    this.plane.geometry.dispose();
    (this.plane.material as THREE.Material).dispose();
  }
}

/* ================================================================ Scene */

type PathTracerLike = {
  setScene: (scene: THREE.Scene, camera: THREE.Camera) => unknown;
  renderSample: () => void;
  reset: () => void;
  updateEnvironment: () => void;
  updateCamera: () => void;
  dispose?: () => void;
  samples: number;
  tiles: THREE.Vector2;
  minSamples: number;
  fadeDuration: number;
  renderDelay: number;
  renderScale: number;
  bounces: number;
  filterGlossyFactor: number;
  textureSize: THREE.Vector2;
  rasterizeScene: boolean;
};

export type SceneOptions = {
  quality?: "high" | "normal";
  /** "transparent": the package sits on the page (contact shadow only). "sweep": a photo studio. */
  stage?: "transparent" | "sweep";
  /** Progressive path tracing when the view is still (studio only). */
  photoreal?: boolean;
};

export class PackScene {
  readonly canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera = new THREE.PerspectiveCamera(28, 1, 0.01, 100);
  private turn = new THREE.Group();
  private shadow = new ContactShadow();
  private equirect: THREE.DataTexture;
  private env: THREE.Texture;
  private sweep: THREE.Mesh | null = null;
  private sweepMat: THREE.MeshPhysicalMaterial | null = null;
  private sweepMap: THREE.DataTexture | null = null;
  private backdrop: Backdrop = "studio";
  private built: Built | null = null;
  /** An everyday object at real size next to the package (null = none). */
  private ref: { kind: Reference; root: THREE.Group; size: THREE.Vector3; dispose: () => void } | null = null;
  /** Where the camera aims sideways (moves when a reference object is shown). */
  private centreX = 0;
  private kit: Kit | null = null;
  private own: { dispose: () => void }[] = [];
  private input: SceneInput | null = null;
  private buildKey = "";
  private openT = tw(0);
  private anatomyT = tw(0);
  private view: View = { x: -16, y: -34 };
  private zoom = 1;
  private w = 1;
  private h = 1;
  private frame = 0;
  private visible = true;
  private dirty = true;
  private firstFrame = false;
  private maxTex: number;
  private opts: SceneOptions;
  // path tracing
  private pt: PathTracerLike | null = null;
  private ptReady = false;
  private ptActive = false;
  private still = 0;
  private maxSamples = PT_MAX_SAMPLES;
  private ptDispose: (() => void) | null = null;
  private ptStart = 0;
  /** A photo render was asked for (the live view is used otherwise). */
  private rendering = false;
  private renderTarget = PT_MAX_SAMPLES;
  private exportWait: { samples: number; resolve: (c: HTMLCanvasElement) => void } | null = null;
  onFirstFrame?: () => void;
  afterRender?: (canvas: HTMLCanvasElement) => void;
  /** Path-tracing progress 0..1 (null when not path tracing). */
  onProgress?: (p: number | null) => void;
  /** Anatomy pin positions in CSS pixels, each frame the anatomy view is open. */
  onPins?: (pins: PinOnScreen[] | null) => void;

  constructor(canvas: HTMLCanvasElement, opts: SceneOptions = {}) {
    this.canvas = canvas;
    this.opts = opts;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance", preserveDrawingBuffer: false });
    const r = this.renderer;
    r.setClearColor(0x000000, 0);
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.NeutralToneMapping;
    r.toneMappingExposure = 1.12;
    r.shadowMap.enabled = false;
    const hi = opts.quality === "high";
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, hi ? (opts.photoreal ? 1.5 : 2) : 1.75));
    this.maxTex = Math.min(r.capabilities.maxTextureSize, hi ? 4096 : 2048);
    this.equirect = studioEquirect(hi ? 1024 : 512);
    this.env = studioEnvironment(r, this.equirect);
    this.scene.environment = this.env;
    this.scene.environmentIntensity = 0.95;
    this.scene.add(this.turn, this.shadow.plane);
    if (opts.stage === "sweep") this.makeSweep();
    // tests on software rendering can't path trace in reasonable time (window.__PA_NO_PATHTRACE)
    const noPt = typeof window !== "undefined" && (window as Window & { __PA_NO_PATHTRACE?: boolean }).__PA_NO_PATHTRACE;
    if (opts.photoreal && !noPt) this.loadPathTracer();
  }

  /* ---------------------------------------------------------------- studio sweep */

  private makeSweep() {
    // falloff baked into a small texture: brightest under the product, darker up the wall
    const geo = sweepGeometry();
    const col = geo.getAttribute("color") as THREE.BufferAttribute;
    const cols: number = geo.userData.cols;
    const rows = col.count / cols;
    const data = new Uint8Array(cols * rows * 4);
    for (let i = 0; i < col.count; i++) {
      const v = Math.round(col.getX(i) * 255);
      data.set([v, v, v, 255], i * 4);
    }
    geo.deleteAttribute("color");
    const map = new THREE.DataTexture(data, cols, rows, THREE.RGBAFormat);
    map.colorSpace = THREE.SRGBColorSpace;
    map.magFilter = THREE.LinearFilter;
    map.minFilter = THREE.LinearFilter;
    map.needsUpdate = true;
    this.sweepMap = map;
    this.sweepMat = new THREE.MeshPhysicalMaterial({ roughness: 0.96, map, emissiveMap: map, envMapIntensity: LIVE_SWEEP_ENV });
    this.sweep = new THREE.Mesh(geo, this.sweepMat);
    this.sweep.position.y = -0.0005;
    this.scene.add(this.sweep);
    this.setBackdrop("studio");
  }

  /** Backdrop of the studio sweep. */
  setBackdrop(b: Backdrop) {
    this.backdrop = b;
    if (!this.sweepMat) return;
    const look = backdropLook(b, this.input ? rolesOf(this.input.d).ground : "#e4e4e0");
    this.sweepMat.color.copy(look.color);
    this.sweepMat.emissive.copy(look.color).multiplyScalar(look.glow);
    this.scene.background = look.color.clone().multiplyScalar(b === "dark" ? 0.6 : 0.8);
    this.sweepMat.needsUpdate = true;
    this.invalidate();
  }

  /* ---------------------------------------------------------------- path tracing */

  private loadPathTracer() {
    Promise.all([import("three-gpu-pathtracer"), import("three/examples/jsm/postprocessing/Pass.js")])
      .then(([{ WebGLPathTracer, PhysicalCamera, DenoiseMaterial }, { FullScreenQuad }]) => {
        const cam = new PhysicalCamera(this.camera.fov, this.camera.aspect, 0.01, 100);
        cam.position.copy(this.camera.position);
        cam.quaternion.copy(this.camera.quaternion);
        cam.apertureBlades = 7;
        this.camera = cam;
        const pt = new WebGLPathTracer(this.renderer) as unknown as PathTracerLike;
        pt.tiles.set(1, 1);
        // Never show an early, noisy frame: the live render stays until the image is clean.
        pt.minSamples = PT_MIN_SAMPLES;
        pt.fadeDuration = 900;
        pt.renderDelay = 0;
        pt.bounces = 6;
        pt.filterGlossyFactor = 0.4;
        pt.textureSize.set(1536, 1536);
        pt.rasterizeScene = true;
        // Edge-preserving denoise while samples accumulate, easing off as the image converges.
        const denoise = new DenoiseMaterial({ transparent: true, blending: THREE.NormalBlending, premultipliedAlpha: this.renderer.getContextAttributes()?.premultipliedAlpha ?? true }) as THREE.ShaderMaterial & { map: THREE.Texture | null; opacity: number; sigma: number; threshold: number; kSigma: number };
        // Clamp fireflies (a stray path that hit a softbox through a glossy bounce) before
        // denoising, so they never flash as white specks.
        denoise.fragmentShader = denoise.fragmentShader
          .replace(/texture2D\(\s*tex\s*,/g, "clampedTex( tex,")
          .replace("vec4 smartDeNoise", "vec4 clampedTex( sampler2D t, vec2 uv ) { vec4 c = texture2D( t, uv ); float l = max( max( c.r, c.g ), c.b ); return l > 2.5 ? vec4( c.rgb * ( 2.5 / l ), c.a ) : c; }\nvec4 smartDeNoise");
        denoise.needsUpdate = true;
        const quad = new FullScreenQuad(denoise);
        (pt as unknown as { renderToCanvasCallback: (t: THREE.WebGLRenderTarget, r: THREE.WebGLRenderer, q: { material: { opacity: number } }) => void }).renderToCanvasCallback = (target, renderer, q) => {
          const k = Math.max(0, 1 - pt.samples / PT_MAX_SAMPLES);
          denoise.map = target.texture;
          denoise.opacity = q.material.opacity;
          denoise.sigma = 1.5 + 2.5 * k;
          denoise.threshold = 0.04 + 0.18 * k;
          denoise.kSigma = 1;
          const auto = renderer.autoClear;
          renderer.autoClear = false;
          quad.render(renderer);
          renderer.autoClear = auto;
        };
        this.ptDispose = () => {
          quad.dispose();
          denoise.dispose();
        };
        // the path tracer uses the same equirect HDR the live renderer was prefiltered from
        this.pt = pt;
        this.ptReady = true;
        this.invalidate();
      })
      .catch(() => {
        this.pt = null;
      });
  }

  /** Something changed: drop back to the live renderer and wait for stillness again. */
  private invalidate() {
    this.ptActive = false;
    this.rendering = false;
    this.still = performance.now();
    this.dirty = true;
    this.progress(null);
    this.request();
  }

  private lastProgress: number | null = -1;
  /** Reports path-tracing progress only when it changes (not on every drag frame). */
  private progress(p: number | null) {
    const v = p === null ? null : Math.round(p * 100) / 100;
    if (v === this.lastProgress) return;
    this.lastProgress = v;
    this.onProgress?.(v);
  }

  private startPathTracing() {
    const pt = this.pt;
    if (!pt) return;
    // the path tracer sees the real floor; the contact-shadow plane and die lines stay out
    this.scene.remove(this.shadow.plane);
    this.built?.lines && (this.built.lines.visible = false);
    const env = this.scene.environment;
    this.scene.environment = this.equirect;
    pt.setScene(this.scene, this.camera);
    this.scene.environment = env;
    this.scene.add(this.shadow.plane);
    this.ptActive = true;
  }

  /** True when a photo render can run (studio, path tracer loaded, a normal view). */
  get canRender(): boolean {
    return this.canPathTrace();
  }

  /** Starts a photo render: path traced until `samples`, shown once clean. Moving cancels it. */
  startRender(samples = PT_MAX_SAMPLES) {
    if (!this.canPathTrace()) return false;
    this.rendering = true;
    this.renderTarget = samples;
    this.ptActive = false;
    this.progress(0);
    this.request();
    return true;
  }

  private canPathTrace(): boolean {
    if (!this.pt || !this.ptReady || !this.sweep) return false;
    const fs = this.built?.stages?.[0].v ?? 1;
    const above = -this.view.x > -1;
    return fs > 0.999 && above; // not for the flat net or views from under the floor
  }

  /* ---------------------------------------------------------------- input */

  /** Change product, structure, finish or open state. The first call snaps without animating. */
  update(input: SceneInput) {
    const prev = this.input;
    this.input = input;
    const key = [input.d.id, input.d.layout, input.d.palette.map((p) => p.hex).join(), input.d.mockup.headline, input.d.mockup.detail, input.brand, input.spec.form, input.spec.w, input.spec.h, input.spec.d, input.spec.finish, (input.spec.effects ?? []).join("+"), JSON.stringify(input.spec.inner ?? null), input.category ?? "", input.info?.key ?? ""].join("|");
    let changed = false;
    if (key !== this.buildKey) {
      this.buildKey = key;
      this.rebuild(input, !prev || prev.spec.form !== input.spec.form);
      if (this.backdrop === "brand") this.setBackdrop("brand");
      changed = true;
    }
    const now = performance.now();
    if (!prev || prev.spec.form !== input.spec.form) {
      const v = input.open ? 1 : 0;
      this.openT = tw(v);
      if (this.built?.stages) for (const s of this.built.stages) Object.assign(s, tw(1 - v));
      changed = true;
    } else if (prev.open !== input.open) {
      this.animateOpen(input.open, now);
      changed = true;
    }
    if (changed || !prev || prev.fit !== input.fit) this.invalidate();
  }

  /** Holds the open and anatomy progress at fixed values (for stills and tests). */
  freeze(p: number, x = 0) {
    this.openT = tw(p);
    if (this.built?.stages) for (const s of this.built.stages) Object.assign(s, tw(1 - p));
    this.anatomyT = tw(x);
    this.invalidate();
  }

  /** Shows an everyday object at real size next to the package, or none. */
  setReference(kind: Reference | null) {
    if (this.ref?.kind === kind) return;
    if (this.ref) {
      this.scene.remove(this.ref.root);
      this.ref.dispose();
      this.ref = null;
    }
    if (kind) {
      const r = buildReference(kind);
      this.ref = { kind, ...r };
      this.scene.add(r.root);
    }
    this.invalidate();
  }

  /** Anatomy view on or off: the package comes apart into numbered parts. */
  setAnatomy(on: boolean) {
    aim(this.anatomyT, on ? 1 : 0, performance.now(), on ? 1500 : 900);
    if (!on) this.onPins?.(null);
    this.invalidate();
  }

  /** The numbered parts of the current package, for the parts list. */
  parts(): { n: number; label: Pair; detail: Pair }[] {
    return (this.built?.pins ?? []).map(({ n, label, detail }) => ({ n, label, detail }));
  }

  private animateOpen(open: boolean, now: number) {
    const b = this.built;
    if (b?.stages) {
      const [fs, fb, ffl, ftb] = b.stages;
      if (open) {
        aim(ftb, 0, now, 600, 0);
        aim(ffl, 0, now, 420, 450);
        aim(fb, 0, now, 600, 750);
        aim(fs, 0, now, 750, 1200);
      } else {
        aim(fs, 1, now, 750, 0);
        aim(fb, 1, now, 600, 550);
        aim(ffl, 1, now, 450, 1000);
        aim(ftb, 1, now, 650, 1250);
      }
    } else aim(this.openT, open ? 1 : 0, now, 1150);
  }

  private rebuild(input: SceneInput, fresh: boolean) {
    const keepStages = !fresh && this.built?.stages ? this.built.stages.map((s) => ({ ...s })) : null;
    if (this.built) this.turn.remove(this.built.root);
    this.disposeBuilt();
    const a: ArtInput = { d: input.d, brand: input.brand, finish: input.spec.finish, effects: input.spec.effects ?? [], info: input.info ?? null };
    const category = input.category ?? "other";
    this.kit = makeKit(this.renderer, a, this.maxTex, category);
    const b = buildForm({ spec: input.spec, kit: this.kit, art: a, maxTex: this.maxTex, own: this.own, category });
    if (keepStages && b.stages) b.stages.forEach((s, i) => Object.assign(s, keepStages[i]));
    this.built = b;
    this.turn.add(b.root);
  }

  private disposeBuilt() {
    if (this.built) {
      this.built.root.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
      });
      this.built.lines?.dispose();
    }
    this.kit?.dispose();
    this.own.forEach((x) => x.dispose());
    this.own = [];
    this.kit = null;
  }

  setView(v: View, zoom: number) {
    if (v.x === this.view.x && v.y === this.view.y && zoom === this.zoom) return;
    this.view = { x: v.x, y: v.y };
    this.zoom = zoom;
    this.invalidate();
  }

  /** Render again on the next frame (e.g. to refresh a snapshot). */
  refresh() {
    this.dirty = true;
    this.request();
  }

  setVisible(v: boolean) {
    this.visible = v;
    if (v) this.request();
  }

  resize(w: number, h: number) {
    this.w = Math.max(1, w);
    this.h = Math.max(1, h);
    this.renderer.setSize(this.w, this.h, false);
    this.camera.aspect = this.w / this.h;
    this.camera.updateProjectionMatrix();
    this.invalidate();
  }

  private request() {
    if (this.frame || typeof window === "undefined") return;
    this.frame = requestAnimationFrame(this.tick);
  }

  /* ---------------------------------------------------------------- frame */

  private tick = (now: number) => {
    this.frame = 0;
    if (!this.visible || !this.built || !this.input) return;
    let moving = false;
    if (this.built.stages) for (const s of this.built.stages) moving = step(s, now) || moving;
    moving = step(this.openT, now) || moving;
    moving = step(this.anatomyT, now) || moving;
    if (moving) this.still = now;

    // A photo render was asked for and nothing is moving: path trace and accumulate.
    if (this.rendering && !moving && this.canPathTrace()) {
      if (!this.ptActive) {
        this.pose();
        this.startPathTracing();
        this.ptStart = now;
      }
      const pt = this.pt!;
      const target = Math.max(this.renderTarget, this.exportWait?.samples ?? 0);
      if (pt.samples < target) {
        pt.renderSample();
        this.emitPins();
        this.afterRender?.(this.canvas);
        this.progress(Math.min(0.999, pt.samples / target));
        if (this.exportWait && pt.samples >= this.exportWait.samples) this.resolveExport();
        this.request();
      } else {
        // done: draw the finished photo once more and keep it until the view moves
        pt.renderSample();
        this.afterRender?.(this.canvas);
        if (this.exportWait) this.resolveExport();
        this.progress(1);
      }
      this.dirty = false;
      return;
    }

    if (moving || this.dirty) {
      this.renderFrame();
      this.dirty = false;
    }
    if (moving) this.request();
  };

  private resolveExport() {
    const w = this.exportWait;
    if (!w) return;
    const copy = document.createElement("canvas");
    copy.width = this.canvas.width;
    copy.height = this.canvas.height;
    copy.getContext("2d")!.drawImage(this.canvas, 0, 0);
    this.exportWait = null;
    w.resolve(copy);
  }

  /** Places the package and camera for the current state. Returns the contact-shadow strength. */
  private pose(): { shadowK: number; fr: { r: number; y: number }; phi: number } {
    const b = this.built!;
    const input = this.input!;
    const p = this.openT.v;
    const x = this.anatomyT.v;
    const shadowK = b.apply(p);
    b.explode(x);
    // a tin turns its label a little toward the camera at the resting angle
    this.turn.rotation.y = (this.view.y + (b.turn ?? 0)) * RAD;
    const fr0 = b.frame!(p, x);
    let fr = fr0;
    let cx = 0;
    if (this.ref) {
      // the object stands to the right; frame both and aim between them
      const hw = this.ref.size.x / 2;
      const gap = Math.max(0.1, fr0.r * 0.22);
      const rx = fr0.r * 0.92 + gap + hw;
      this.ref.root.position.set(rx, 0, 0);
      const left = -fr0.r;
      const right = rx + hw;
      cx = (left + right) / 2;
      fr = { r: Math.max(fr0.r, ((right - left) / 2) * 1.04, this.ref.size.y * 0.6), y: Math.max(fr0.y, this.ref.size.y / 2) };
    }
    this.centreX = cx;
    const fill = Math.min(0.92, Math.max(0.22, input.fit / Math.min(this.w, this.h)));
    const vt = Math.tan((this.camera.fov * RAD) / 2);
    const ht = vt * this.camera.aspect;
    const dist = fr.r / (fill * Math.min(vt, ht)) / this.zoom;
    const phi = -this.view.x * RAD;
    const target = new THREE.Vector3(cx, fr.y, 0);
    this.camera.position.set(cx, fr.y + Math.sin(phi) * dist, Math.cos(phi) * dist);
    this.camera.up.set(0, Math.cos(phi), -Math.sin(phi));
    this.camera.lookAt(target);
    // near enough that the floor in front of the package is never clipped (tall phone screens)
    this.camera.near = Math.max(0.02, Math.min(dist - fr.r * 4, dist * 0.2));
    this.camera.far = this.sweep ? dist + 60 : dist + fr.r * 6;
    const cam = this.camera as THREE.PerspectiveCamera & { focusDistance?: number; bokehSize?: number };
    if ("focusDistance" in cam) {
      // a product lens at a moderate aperture: the package sharp, the sweep softly out of focus
      cam.focusDistance = dist;
      cam.bokehSize = fr.r * 0.012 * this.zoom;
    }
    this.camera.updateProjectionMatrix();
    this.turn.updateMatrixWorld(true);
    return { shadowK, fr, phi };
  }

  private renderFrame() {
    const { shadowK, fr, phi } = this.pose();
    // contact shadow under the product, faded when seen from below or when the carton is flat
    const above = Math.sin(phi) > -0.02;
    const size = Math.max(2.4 * fr.r, 1.2);
    this.shadow.setCenter(this.centreX);
    this.shadow.setSize(size * 2, fr.y * 2 + 0.5 + fr.r);
    this.shadow.plane.visible = above;
    // the floor itself must not occlude in the shadow's depth pass
    if (this.sweep) this.sweep.visible = false;
    this.shadow.update(this.renderer, this.scene, above ? 0.62 * shadowK : 0);
    if (this.sweep) this.sweep.visible = above;
    this.renderer.render(this.scene, this.camera);
    this.emitPins();
    this.afterRender?.(this.canvas);
    if (!this.firstFrame) {
      this.firstFrame = true;
      this.onFirstFrame?.();
    }
  }

  private emitPins() {
    if (!this.onPins || !this.built || this.anatomyT.v < 0.02) return;
    const v = new THREE.Vector3();
    const nrm = new THREE.Vector3();
    const toCam = new THREE.Vector3();
    const out: PinOnScreen[] = this.built.pins.map((p) => {
      p.obj.updateMatrixWorld(true);
      v.copy(p.at).applyMatrix4(p.obj.matrixWorld);
      let facing = true;
      if (p.normal) {
        nrm.copy(p.normal).transformDirection(p.obj.matrixWorld);
        toCam.copy(this.camera.position).sub(v).normalize();
        facing = nrm.dot(toCam) > 0.05;
      }
      v.project(this.camera);
      return { n: p.n, x: (v.x * 0.5 + 0.5) * this.w, y: (-v.y * 0.5 + 0.5) * this.h, visible: !p.hidden && facing && v.z < 1 };
    });
    this.onPins(out);
  }

  /* ---------------------------------------------------------------- export */

  /**
   * A still as PNG. In the studio with path tracing, waits for `samples` and returns the
   * path-traced frame at the current resolution; otherwise renders at `scale` × and composites
   * on `background`.
   */
  async exportImage(scale = 2, background: string | ((ctx: CanvasRenderingContext2D, w: number, h: number) => void) = "#ffffff", samples = 160): Promise<Blob> {
    if (this.canPathTrace()) {
      const frame = await new Promise<HTMLCanvasElement>((resolve) => {
        // past the clean threshold plus the fade-in, so the export is the finished photo
        const n = Math.max(samples, PT_MIN_SAMPLES + 120);
        this.exportWait = { samples: n, resolve };
        if (!this.rendering) this.startRender(Math.max(n, this.renderTarget));
        else this.request();
      });
      return new Promise((resolve, reject) => frame.toBlob((b) => (b ? resolve(b) : reject(new Error("export failed"))), "image/png"));
    }
    const pr = this.renderer.getPixelRatio();
    this.renderer.setPixelRatio(scale);
    this.renderer.setSize(this.w, this.h, false);
    this.renderFrame();
    const out = document.createElement("canvas");
    out.width = this.canvas.width;
    out.height = this.canvas.height;
    const ctx = out.getContext("2d")!;
    if (typeof background === "string") {
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, out.width, out.height);
    } else background(ctx, out.width, out.height);
    ctx.drawImage(this.canvas, 0, 0);
    this.renderer.setPixelRatio(pr);
    this.renderer.setSize(this.w, this.h, false);
    this.invalidate();
    return new Promise((resolve, reject) => out.toBlob((b) => (b ? resolve(b) : reject(new Error("export failed"))), "image/png"));
  }

  /** Samples accumulated so far (0 when not path tracing). */
  get samples(): number {
    return this.ptActive && this.pt ? this.pt.samples : 0;
  }

  dispose() {
    if (this.frame) cancelAnimationFrame(this.frame);
    this.ref?.dispose();
    this.disposeBuilt();
    this.shadow.dispose();
    this.env.dispose();
    this.equirect.dispose();
    this.sweep?.geometry.dispose();
    this.sweepMat?.dispose();
    this.sweepMap?.dispose();
    this.ptDispose?.();
    this.pt?.dispose?.();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }
}
