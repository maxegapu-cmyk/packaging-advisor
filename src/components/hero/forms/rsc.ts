/**
 * The shipping carton's look: unbleached kraft liner printed flexo in one colour (the brand
 * on the long sides, handling marks and the box spec on the ends), and the parcel tape that
 * closes it.
 */
import * as THREE from "three";
import { rolesOf, type ArtInput } from "../../three/art";
import { U } from "../../three/common";

const KRAFT = "#BE9468";

function kraftCanvas(wMm: number, hMm: number, ppm: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement("canvas");
  c.width = Math.max(8, Math.round(wMm * ppm));
  c.height = Math.max(8, Math.round(hMm * ppm));
  const g = c.getContext("2d")!;
  g.fillStyle = KRAFT;
  g.fillRect(0, 0, c.width, c.height);
  // fibre: faint streaks along the machine direction
  let s = 7;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < (c.width * c.height) / 90; i++) {
    g.fillStyle = rnd() > 0.5 ? "rgba(255,240,215,0.07)" : "rgba(80,50,20,0.06)";
    g.fillRect(rnd() * c.width, rnd() * c.height, 2 + rnd() * 9, 1);
  }
  return [c, g];
}

const SANS = '"PingFang SC", "Noto Sans CJK SC", "Microsoft YaHei", "Helvetica Neue", Arial, sans-serif';

/** Flexo ink: the brand's darkest colour, a little flat, as one-colour corrugated print is. */
const inkOf = (a: ArtInput) => new THREE.Color(rolesOf(a.d).ink).lerp(new THREE.Color("#2a2420"), 0.35).getStyle();

export function rscArt(kind: "rscFront" | "rscSide", wMm: number, hMm: number, a: ArtInput, spec: { w: number; h: number; d: number }, info: boolean): HTMLCanvasElement {
  const ppm = Math.min(5, 1600 / Math.max(wMm, hMm));
  const [c, g] = kraftCanvas(wMm, hMm, ppm);
  const ink = inkOf(a);
  g.fillStyle = ink;
  g.strokeStyle = ink;
  const W = c.width;
  const H = c.height;
  const mm = ppm;
  if (kind === "rscFront") {
    const size = Math.min(H * 0.2, (W * 0.7) / Math.max(2, a.brand.length));
    g.font = `800 ${size}px ${SANS}`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(a.brand, W / 2, H * 0.44);
    g.font = `500 ${size * 0.26}px ${SANS}`;
    g.fillText(a.d.mockup.headline, W / 2, H * 0.44 + size * 0.75);
    g.lineWidth = 1.2 * mm;
    g.beginPath();
    g.moveTo(W * 0.3, H * 0.44 + size * 1.08);
    g.lineTo(W * 0.7, H * 0.44 + size * 1.08);
    g.stroke();
  } else {
    // handling marks: this way up, keep dry, fragile
    const s = Math.min(H * 0.2, W * 0.2);
    const y = H * 0.3;
    const cx = [W * 0.25, W * 0.5, W * 0.75];
    g.lineWidth = Math.max(1, s * 0.07);
    g.lineCap = "round";
    g.lineJoin = "round";
    // ↑↑
    for (const dx of [-s * 0.18, s * 0.18]) {
      g.beginPath();
      g.moveTo(cx[0] + dx, y + s * 0.42);
      g.lineTo(cx[0] + dx, y - s * 0.3);
      g.moveTo(cx[0] + dx - s * 0.13, y - s * 0.16);
      g.lineTo(cx[0] + dx, y - s * 0.32);
      g.lineTo(cx[0] + dx + s * 0.13, y - s * 0.16);
      g.stroke();
    }
    g.beginPath();
    g.moveTo(cx[0] - s * 0.34, y + s * 0.44);
    g.lineTo(cx[0] + s * 0.34, y + s * 0.44);
    g.stroke();
    // umbrella with rain
    g.beginPath();
    g.arc(cx[1], y, s * 0.34, Math.PI, 0);
    g.closePath();
    g.stroke();
    g.beginPath();
    g.moveTo(cx[1], y);
    g.lineTo(cx[1], y + s * 0.34);
    g.arc(cx[1] - s * 0.07, y + s * 0.34, s * 0.07, 0, Math.PI);
    g.stroke();
    for (const dx of [-0.3, -0.1, 0.1, 0.3]) {
      g.beginPath();
      g.moveTo(cx[1] + dx * s, y - s * 0.52);
      g.lineTo(cx[1] + dx * s - s * 0.05, y - s * 0.42);
      g.stroke();
    }
    // wine glass (fragile)
    g.beginPath();
    g.moveTo(cx[2] - s * 0.2, y - s * 0.42);
    g.lineTo(cx[2] + s * 0.2, y - s * 0.42);
    g.quadraticCurveTo(cx[2] + s * 0.2, y + s * 0.02, cx[2], y + s * 0.04);
    g.quadraticCurveTo(cx[2] - s * 0.2, y + s * 0.02, cx[2] - s * 0.2, y - s * 0.42);
    g.moveTo(cx[2], y + s * 0.04);
    g.lineTo(cx[2], y + s * 0.36);
    g.moveTo(cx[2] - s * 0.16, y + s * 0.38);
    g.lineTo(cx[2] + s * 0.16, y + s * 0.38);
    g.stroke();
    g.font = `600 ${s * 0.2}px ${SANS}`;
    g.textAlign = "center";
    g.textBaseline = "top";
    g.fillText("向上", cx[0], y + s * 0.56);
    g.fillText("怕湿", cx[1], y + s * 0.56);
    g.fillText("易碎", cx[2], y + s * 0.56);
    if (info) {
      g.font = `500 ${Math.min(H * 0.07, W * 0.06)}px ${SANS}`;
      g.textAlign = "left";
      const x0 = W * 0.1;
      let yy = H * 0.66;
      for (const line of [`${a.brand}  ${a.d.mockup.headline}`, `外箱尺寸 ${spec.w} × ${spec.d} × ${spec.h} mm`, "B 楞 · 边压强度 ≥ 4.5 kN/m"]) {
        g.fillText(line, x0, yy);
        yy += Math.min(H * 0.09, W * 0.075);
      }
      // recycling mark
      const r = Math.min(H, W) * 0.08;
      const rx = W * 0.86;
      const ry = H * 0.78;
      g.lineWidth = Math.max(1, r * 0.12);
      for (let i = 0; i < 3; i++) {
        const a0 = (i / 3) * Math.PI * 2 - Math.PI / 2 + 0.25;
        g.beginPath();
        g.arc(rx, ry, r, a0, a0 + 1.6);
        g.stroke();
        const ax = rx + Math.cos(a0 + 1.6) * r;
        const ay = ry + Math.sin(a0 + 1.6) * r;
        const ta = a0 + 1.6 + Math.PI / 2;
        g.beginPath();
        g.moveTo(ax + Math.cos(ta - 2.4) * r * 0.32, ay + Math.sin(ta - 2.4) * r * 0.32);
        g.lineTo(ax, ay);
        g.lineTo(ax + Math.cos(ta + 2.4 - Math.PI) * r * 0.32, ay + Math.sin(ta + 2.4 - Math.PI) * r * 0.32);
        g.stroke();
      }
    }
  }
  return c;
}

export function kraftPlain(): HTMLCanvasElement {
  return kraftCanvas(120, 120, 4)[0];
}

/**
 * Parcel tape over the top seam, along x: down the ends `drop` mm, `width` mm wide.
 * `p` (0–1) is how much of it has been laid, from one end.
 */
export function tape(w: number, h: number, t: number, drop = 60, width = 48) {
  const own: { dispose(): void }[] = [];
  const path: [number, number][] = [
    [-w / 2 - t - 0.3, h - drop],
    [-w / 2 - t - 0.3, h + t + 0.3],
    [w / 2 + t + 0.3, h + t + 0.3],
    [w / 2 + t + 0.3, h - drop],
  ];
  const lens = path.slice(1).map((p, i) => Math.hypot(p[0] - path[i][0], p[1] - path[i][1]));
  const total = lens.reduce((a, b) => a + b, 0);
  const N = 120;
  const pos = new Float32Array((N + 1) * 2 * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const idx: number[] = [];
  for (let i = 0; i < N; i++) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
  geo.setIndex(idx);
  const at = (s: number): [number, number] => {
    let acc = 0;
    for (let i = 0; i < lens.length; i++) {
      if (s <= acc + lens[i] || i === lens.length - 1) {
        const k = Math.min(1, (s - acc) / lens[i]);
        return [path[i][0] + (path[i + 1][0] - path[i][0]) * k, path[i][1] + (path[i + 1][1] - path[i][1]) * k];
      }
      acc += lens[i];
    }
    return path[path.length - 1];
  };
  const mat = new THREE.MeshPhysicalMaterial({ color: "#B5874E", roughness: 0.28, clearcoat: 0.8, clearcoatRoughness: 0.15, transparent: true, opacity: 0.72, side: THREE.DoubleSide, depthWrite: false });
  own.push(geo, mat);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.scale.setScalar(U);
  mesh.renderOrder = 4;
  const set = (p: number) => {
    const L = total * p;
    for (let i = 0; i <= N; i++) {
      const [x, y] = at((L * i) / N);
      pos.set([x, y, -width / 2], i * 6);
      pos.set([x, y, width / 2], i * 6 + 3);
    }
    (geo.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;
    geo.computeVertexNormals();
    mesh.visible = p > 0.001;
  };
  set(0);
  return { mesh, set, dispose: () => own.forEach((o) => o.dispose()) };
}
