/**
 * Builds the everyday reference objects (lib/reference.ts) as plain, unbranded models at
 * their real size, standing on the floor with their base at y = 0.
 */
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { REFERENCE_INFO, type Reference } from "@/lib/reference";
import { U } from "./common";

export function buildReference(kind: Reference): { root: THREE.Group; dispose: () => void; size: THREE.Vector3 } {
  const root = new THREE.Group();
  const own: { dispose: () => void }[] = [];
  const mat = (o: THREE.MeshPhysicalMaterialParameters) => {
    const m = new THREE.MeshPhysicalMaterial(o);
    own.push(m);
    return m;
  };
  const add = (g: THREE.BufferGeometry, m: THREE.Material, x = 0, y = 0, z = 0) => {
    own.push(g);
    const mesh = new THREE.Mesh(g, m);
    mesh.position.set(x, y, z);
    root.add(mesh);
    return mesh;
  };
  const r = REFERENCE_INFO[kind];
  if (kind === "phone") {
    // standing upright, screen to the camera
    const body = mat({ color: "#2B2D30", metalness: 0.6, roughness: 0.35 });
    const glass = mat({ color: "#0B0C0E", roughness: 0.04, clearcoat: 1, clearcoatRoughness: 0.02 });
    add(new RoundedBoxGeometry(r.w * U, r.h * U, r.d * U, 4, 9 * U), body, 0, (r.h * U) / 2, 0);
    add(new RoundedBoxGeometry((r.w - 2.4) * U, (r.h - 2.4) * U, 0.6 * U, 4, 7.5 * U), glass, 0, (r.h * U) / 2, (r.d / 2) * U);
  } else if (kind === "card") {
    // leaning slightly back against nothing would look odd: lying flat, long side across
    const m = mat({ color: "#2F5D8C", roughness: 0.35, clearcoat: 0.6, clearcoatRoughness: 0.1 });
    const chip = mat({ color: "#C9A85A", metalness: 1, roughness: 0.3 });
    add(new RoundedBoxGeometry(r.w * U, r.d * U, r.h * U, 2, 3 * U), m, 0, (r.d * U) / 2, 0);
    add(new THREE.BoxGeometry(11 * U, 0.1 * U, 9 * U), chip, -24 * U, r.d * U + 0.05 * U, -4 * U);
  } else if (kind === "coin") {
    const m = mat({ color: "#C4C7C9", metalness: 1, roughness: 0.28 });
    add(new THREE.CylinderGeometry((r.w / 2) * U, (r.w / 2) * U, r.d * U, 64), m, 0, (r.d * U) / 2, 0);
  } else if (kind === "bottle") {
    const pet = mat({ color: "#EAF3F7", roughness: 0.04, transmission: 0.9, thickness: 0.02, ior: 1.45, transparent: true, opacity: 0.85 });
    const water = mat({ color: "#D8ECF4", roughness: 0.02, transmission: 0.95, thickness: 0.5, ior: 1.33 });
    const cap = mat({ color: "#F2F2F2", roughness: 0.4 });
    const R = (r.w / 2) * U;
    const pts = [
      [0, 0],
      [R * 0.8, 0],
      [R, 4 * U],
      [R, 150 * U],
      [R * 0.92, 165 * U],
      [R * 0.42, 188 * U],
      [R * 0.4, 192 * U],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    add(new THREE.LatheGeometry(pts, 64), pet);
    add(new THREE.CylinderGeometry(R * 0.94, R * 0.94, 160 * U, 48), water, 0, 82 * U, 0);
    add(new THREE.CylinderGeometry(R * 0.46, R * 0.46, 13 * U, 32), cap, 0, 198.5 * U, 0);
  } else {
    // A4 lying on the floor
    const m = mat({ color: "#FAFAF8", roughness: 0.9 });
    add(new THREE.BoxGeometry(r.w * U, 0.2 * U, r.d * U), m, 0, 0.1 * U, 0);
  }
  const box = new THREE.Box3().setFromObject(root);
  return { root, size: box.getSize(new THREE.Vector3()), dispose: () => own.forEach((o) => o.dispose()) };
}
