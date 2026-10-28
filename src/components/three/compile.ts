import type * as THREE from "three";

/**
 * Compiles an object's shaders without blocking the page, where the browser can
 * (KHR_parallel_shader_compile), and resolves once they are ready to draw.
 *
 * Like three's renderer.compileAsync, but safe to abandon: it stops waiting as soon as `alive()`
 * turns false, and a material that was disposed (or a renderer torn down) meanwhile counts as
 * done instead of throwing from a timer. Without the extension the browser compiles on first draw.
 */
export function compileInBackground(renderer: THREE.WebGLRenderer, object: THREE.Object3D, camera: THREE.Camera, scene: THREE.Scene, alive: () => boolean = () => true): Promise<void> {
  let pending: Set<THREE.Material>;
  try {
    pending = renderer.compile(object, camera, scene) as unknown as Set<THREE.Material>;
  } catch {
    return Promise.resolve();
  }
  const props = (renderer as unknown as { properties?: { get(m: THREE.Material): { currentProgram?: { isReady?: () => boolean } } } }).properties;
  return new Promise<void>((done) => {
    const check = () => {
      if (!alive() || !props) return done();
      for (const m of pending) {
        let ready = true;
        try {
          const p = props.get(m)?.currentProgram;
          ready = !p || typeof p.isReady !== "function" || p.isReady();
        } catch {
          ready = true;
        }
        if (ready) pending.delete(m);
      }
      if (pending.size === 0) return done();
      setTimeout(check, 10);
    };
    check();
  });
}
