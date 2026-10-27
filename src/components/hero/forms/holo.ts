/**
 * The film's two looks for a 3D model: a cyan hologram of the target form (fresnel glow and
 * crisp feature edges), and the real materials, revealed bottom-up by a scanning plane. Both are
 * cut by the same world-space planes, so wherever the scan is, exactly one of them shows.
 */
import * as THREE from "three";

export const CYAN = new THREE.Color("#3FD9FF");

/** Clip planes shared by one pack: the print wipe (along x) and the scan (along y). */
export type Planes = { wipe: THREE.Plane; above: THREE.Plane; below: THREE.Plane };
export function makePlanes(): Planes {
  return {
    wipe: new THREE.Plane(new THREE.Vector3(-1, 0, 0), 1e6),
    above: new THREE.Plane(new THREE.Vector3(0, 1, 0), 1e6),
    below: new THREE.Plane(new THREE.Vector3(0, -1, 0), -1e6),
  };
}
/** Keeps x ≤ at (the printed part of a sheet). */
export const setWipe = (p: Planes, at: number) => p.wipe.set(p.wipe.normal.set(-1, 0, 0), at);
/** Real below the scan line, hologram above it. */
export function setScan(p: Planes, y: number) {
  p.above.set(p.above.normal.set(0, 1, 0), -y);
  p.below.set(p.below.normal.set(0, -1, 0), y);
}

const VERT = /* glsl */ `
  #include <common>
  #include <clipping_planes_pars_vertex>
  varying vec3 vN;
  varying vec3 vV;
  varying float vY;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vY = wp.y;
    vec4 mvPosition = viewMatrix * wp;
    vN = normalize(normalMatrix * normal);
    vV = normalize(-mvPosition.xyz);
    gl_Position = projectionMatrix * mvPosition;
    #include <clipping_planes_vertex>
  }`;
const FRAG = /* glsl */ `
  #include <common>
  #include <clipping_planes_pars_fragment>
  uniform vec3 uColor;
  uniform float uAlpha;
  uniform float uScan;
  uniform float uBand;
  varying vec3 vN;
  varying vec3 vV;
  varying float vY;
  void main() {
    #include <clipping_planes_fragment>
    float f = 1.0 - abs(dot(normalize(vN), normalize(vV)));
    float rim = pow(f, 2.4);
    // fine horizontal scan lines, and a bright band just above the scan
    float lines = 0.75 + 0.25 * smoothstep(0.35, 0.5, abs(fract(vY / uBand) - 0.5));
    float edge = exp(-pow((vY - uScan) / (uBand * 0.9), 2.0));
    float a = (0.035 + 0.5 * rim) * lines * uAlpha + edge * 0.85 * step(0.001, uAlpha);
    gl_FragColor = vec4(uColor * (0.7 + 1.6 * edge), a);
  }`;

export type Holo = {
  mat: THREE.ShaderMaterial;
  line: THREE.LineBasicMaterial;
  /** 0–1 overall visibility. */
  set: (alpha: number, scanY: number) => void;
  dispose: () => void;
};

/**
 * Adds a hologram twin to every mesh under `root` (sharing its geometry, following its motion)
 * and clips the real materials to below the scan. `band` is the scan-line spacing in scene units.
 */
export function holographic(root: THREE.Object3D, planes: Planes, band: number): Holo {
  const own: { dispose(): void }[] = [];
  const mat = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: CYAN.clone() }, uAlpha: { value: 0 }, uScan: { value: -1e6 }, uBand: { value: band } },
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    clipping: true,
    clippingPlanes: [planes.above],
  });
  const line = new THREE.LineBasicMaterial({ color: CYAN, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, clippingPlanes: [planes.above] });
  own.push(mat, line);
  const meshes: THREE.Mesh[] = [];
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh && !m.userData.noHolo) meshes.push(m);
  });
  const seen = new Set<THREE.Material>();
  for (const m of meshes) {
    const ghost = new THREE.Mesh(m.geometry, mat);
    ghost.userData.noHolo = true;
    ghost.renderOrder = 2;
    ghost.castShadow = false;
    m.add(ghost);
    const eg = new THREE.EdgesGeometry(m.geometry, 32);
    own.push(eg);
    const ln = new THREE.LineSegments(eg, line);
    ln.userData.noHolo = true;
    ln.renderOrder = 3;
    m.add(ln);
    for (const x of Array.isArray(m.material) ? m.material : [m.material]) {
      if (seen.has(x)) continue;
      seen.add(x);
      x.clippingPlanes = [planes.below];
    }
  }
  return {
    mat,
    line,
    set: (alpha, scanY) => {
      mat.uniforms.uAlpha.value = alpha;
      mat.uniforms.uScan.value = scanY;
      line.opacity = 0.55 * alpha;
      mat.visible = alpha > 0.001 || scanY > -1e5;
      line.visible = alpha > 0.001;
    },
    dispose: () => own.forEach((o) => o.dispose()),
  };
}
