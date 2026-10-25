/**
 * Camera state for the 3D packages: rotation (degrees) and zoom, with tweening, inertia and a
 * turntable spin. Views subscribe and write transforms straight to the DOM, so dragging does
 * not re-render React and several boxes can share one Orbit to rotate together.
 */
export type Angle = { x: number; y: number };
export const REST_ANGLE: Angle = { x: -16, y: -34 };
export const X_LIMIT = 80;

type Listener = (o: Orbit) => void;

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const raf = (fn: FrameRequestCallback) => (typeof window === "undefined" ? 0 : window.requestAnimationFrame(fn));
const caf = (id: number) => {
  if (id && typeof window !== "undefined") window.cancelAnimationFrame(id);
};

export function reducedMotion(): boolean {
  return typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

export class Orbit {
  angle: Angle;
  zoom: number;
  /** Vertical tilt limit; Infinity allows full 720° turning (studio). */
  xLimit = X_LIMIT;
  minZoom = 0.35;
  maxZoom = 2.6;
  private listeners = new Set<Listener>();
  private frame = 0;
  private spinning = false;
  private spinListeners = new Set<(on: boolean) => void>();

  constructor(angle: Angle = REST_ANGLE, zoom = 1, opts: { free?: boolean } = {}) {
    this.angle = { ...angle };
    this.zoom = zoom;
    if (opts.free) this.xLimit = Infinity;
  }

  private clampX(x: number) {
    return Math.max(-this.xLimit, Math.min(this.xLimit, x));
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    fn(this);
    return () => {
      this.listeners.delete(fn);
    };
  }

  onSpin(fn: (on: boolean) => void): () => void {
    this.spinListeners.add(fn);
    return () => {
      this.spinListeners.delete(fn);
    };
  }

  private emit() {
    for (const fn of this.listeners) fn(this);
  }

  /** Immediate change; cancels any motion in progress. */
  set(a: Partial<Angle>, zoom?: number) {
    this.stop();
    this.write(a, zoom);
  }

  private write(a: Partial<Angle>, zoom?: number) {
    this.angle = { x: this.clampX(a.x ?? this.angle.x), y: a.y ?? this.angle.y };
    if (zoom !== undefined) this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, zoom));
    this.emit();
  }

  zoomBy(factor: number) {
    this.write({}, this.zoom * factor);
  }

  /** Animate to an angle (and optionally a zoom) along the shortest turn. */
  tween(to: Partial<Angle>, ms = 700, zoom?: number): Promise<void> {
    this.stop();
    const from = { ...this.angle };
    const z0 = this.zoom;
    const target = { x: this.clampX(to.x ?? from.x), y: to.y ?? from.y };
    let dx = target.x - from.x;
    if (this.xLimit === Infinity) {
      dx %= 360;
      if (dx > 180) dx -= 360;
      if (dx < -180) dx += 360;
    }
    let dy = (target.y - from.y) % 360;
    if (dy > 180) dy -= 360;
    if (dy < -180) dy += 360;
    if (reducedMotion() || ms <= 0) {
      this.write({ x: from.x + dx, y: from.y + dy }, zoom);
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      const t0 = performance.now();
      const step = (t: number) => {
        const k = Math.min(1, (t - t0) / ms);
        const e = ease(k);
        this.write({ x: from.x + dx * e, y: from.y + dy * e }, zoom === undefined ? undefined : z0 + (zoom - z0) * e);
        if (k < 1) this.frame = raf(step);
        else {
          this.frame = 0;
          resolve();
        }
      };
      this.frame = raf(step);
    });
  }

  /** Keep turning after a drag is released, slowing down. Velocity in degrees per ms. */
  fling(vx: number, vy: number) {
    this.stop();
    if (reducedMotion()) return;
    let vX = Math.max(-1.2, Math.min(1.2, vx));
    let vY = Math.max(-2.4, Math.min(2.4, vy));
    if (Math.abs(vX) < 0.02 && Math.abs(vY) < 0.02) return;
    let last = performance.now();
    const step = (t: number) => {
      const dt = Math.min(40, t - last);
      last = t;
      const decay = Math.pow(0.9935, dt);
      vX *= decay;
      vY *= decay;
      this.write({ x: this.angle.x + vX * dt, y: this.angle.y + vY * dt });
      if (Math.abs(vX) > 0.004 || Math.abs(vY) > 0.004) this.frame = raf(step);
      else this.frame = 0;
    };
    this.frame = raf(step);
  }

  get isSpinning() {
    return this.spinning;
  }

  /** Turntable: a slow continuous turn around the vertical axis. */
  spin(on: boolean) {
    this.stop();
    if (on && reducedMotion()) return;
    this.spinning = on;
    for (const fn of this.spinListeners) fn(on);
    if (!on) return;
    let last = performance.now();
    const step = (t: number) => {
      const dt = Math.min(40, t - last);
      last = t;
      this.write({ y: this.angle.y + dt * 0.03 });
      this.frame = raf(step);
    };
    this.frame = raf(step);
  }

  stop() {
    caf(this.frame);
    this.frame = 0;
    if (this.spinning) {
      this.spinning = false;
      for (const fn of this.spinListeners) fn(false);
    }
  }
}

/** Named camera positions for the studio. */
export const VIEWS: { id: string; angle: Angle; label: { zh: string; en: string } }[] = [
  { id: "hero", angle: REST_ANGLE, label: { zh: "四分之三", en: "Three-quarter" } },
  { id: "front", angle: { x: 0, y: 0 }, label: { zh: "正面", en: "Front" } },
  { id: "side", angle: { x: 0, y: -90 }, label: { zh: "侧面", en: "Side" } },
  { id: "back", angle: { x: 0, y: 180 }, label: { zh: "背面", en: "Back" } },
  { id: "top", angle: { x: -72, y: 0 }, label: { zh: "俯视", en: "Top" } },
];
