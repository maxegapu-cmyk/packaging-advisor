/**
 * E-commerce images rendered from the 3D: the white-background main image the marketplaces
 * ask for, the other angles for the image carousel, an opened view, a close-up, a dimensions
 * image, and a brand-colored hero. 1600 × 1600 px PNG, zipped.
 */
import type { Direction } from "@/lib/board/schema";
import type { Lang } from "@/lib/i18n";
import type { PackSpec } from "@/lib/pack";
import { CAN_OPEN, ROUND_FORMS } from "@/lib/pack";
import { rolesOf, type ArtInfo } from "../three/art";
import { REST_ANGLE } from "../pack/orbit";

export type ShotSpec = { id: string; name: { zh: string; en: string }; angle: { x: number; y: number }; zoom: number; open?: boolean; bg: "white" | "brand"; dims?: boolean };

export const SHOTS: ShotSpec[] = [
  { id: "01-main", name: { zh: "主图（白底）", en: "Main image (white)" }, angle: REST_ANGLE, zoom: 1, bg: "white" },
  { id: "02-front", name: { zh: "正面", en: "Front" }, angle: { x: -4, y: 0 }, zoom: 1, bg: "white" },
  { id: "03-back", name: { zh: "背面", en: "Back" }, angle: { x: -8, y: 160 }, zoom: 1, bg: "white" },
  { id: "04-open", name: { zh: "打开", en: "Opened" }, angle: { x: -26, y: -28 }, zoom: 1, open: true, bg: "white" },
  { id: "05-detail", name: { zh: "细节", en: "Close-up" }, angle: { x: -10, y: -18 }, zoom: 2.1, bg: "white" },
  { id: "06-size", name: { zh: "尺寸", en: "Dimensions" }, angle: { x: -14, y: -32 }, zoom: 0.82, bg: "white", dims: true },
  { id: "07-brand", name: { zh: "品牌色背景", en: "Brand background" }, angle: REST_ANGLE, zoom: 0.95, bg: "brand" },
];

const SIZE = 800;
const SCALE = 2;

function dimsOverlay(ctx: CanvasRenderingContext2D, W: number, H: number, spec: PackSpec, ink: string, lang: Lang) {
  const round = ROUND_FORMS.includes(spec.form);
  const t = (zh: string, en: string) => (lang === "en" ? en : zh);
  const items = round
    ? [`${t("直径", "Ø")} ${spec.w} mm`, `${t("高", "H")} ${spec.h} mm`]
    : [`${t("宽", "W")} ${spec.w} mm`, `${t("高", "H")} ${spec.h} mm`, `${t("深", "D")} ${spec.d} mm`];
  ctx.fillStyle = ink;
  ctx.font = `600 ${Math.round(W * 0.034)}px "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", Arial, sans-serif`;
  const x = W * 0.07;
  let y = H * 0.1;
  for (const s of items) {
    ctx.fillText(s, x, y);
    y += W * 0.05;
  }
  ctx.strokeStyle = ink;
  ctx.lineWidth = Math.max(2, W * 0.002);
  ctx.beginPath();
  ctx.moveTo(x, y - W * 0.025);
  ctx.lineTo(x + W * 0.16, y - W * 0.025);
  ctx.stroke();
}

export type ImageInput = { d: Direction; brand: string; spec: PackSpec; category: string; info: ArtInfo | null; lang: Lang; onProgress?: (done: number, total: number) => void };

/** Renders every shot; returns PNG blobs keyed by file name. */
export async function renderShots(inp: ImageInput): Promise<{ name: string; label: { zh: string; en: string }; blob: Blob }[]> {
  const { PackScene } = await import("../three/engine");
  if (typeof document !== "undefined" && document.fonts?.ready) await document.fonts.ready;
  const host = document.createElement("div");
  host.style.cssText = `position:fixed;left:-${SIZE * 3}px;top:0;width:${SIZE}px;height:${SIZE}px;pointer-events:none;`;
  const canvas = document.createElement("canvas");
  host.appendChild(canvas);
  document.body.appendChild(host);
  const scene = new PackScene(canvas, { quality: "high", stage: "transparent" });
  const roles = rolesOf(inp.d);
  const out: { name: string; label: { zh: string; en: string }; blob: Blob }[] = [];
  const canOpen = CAN_OPEN.includes(inp.spec.form);
  const shots = SHOTS.filter((s) => !s.open || canOpen);
  try {
    scene.resize(SIZE, SIZE);
    for (const [i, s] of shots.entries()) {
      scene.update({ d: inp.d, brand: inp.brand, spec: inp.spec, open: false, fit: SIZE * 0.9, category: inp.category, info: inp.info });
      scene.freeze(s.open ? 1 : 0);
      scene.setView(s.angle, s.zoom);
      const bg = s.bg === "brand" ? roles.key : "#FFFFFF";
      const blob = await scene.exportImage(SCALE, (ctx, w, h) => {
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, w, h);
        if (s.bg === "brand") {
          const g = ctx.createRadialGradient(w / 2, h * 0.55, w * 0.05, w / 2, h * 0.55, w * 0.7);
          g.addColorStop(0, "rgba(255,255,255,0.22)");
          g.addColorStop(1, "rgba(0,0,0,0.12)");
          ctx.fillStyle = g;
          ctx.fillRect(0, 0, w, h);
        }
      });
      let final = blob;
      if (s.dims) {
        const bmp = await createImageBitmap(blob);
        const c = document.createElement("canvas");
        c.width = bmp.width;
        c.height = bmp.height;
        const ctx = c.getContext("2d")!;
        ctx.drawImage(bmp, 0, 0);
        dimsOverlay(ctx, c.width, c.height, inp.spec, "#222222", inp.lang);
        final = await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("export failed"))), "image/png"));
      }
      out.push({ name: `${s.id}.png`, label: s.name, blob: final });
      inp.onProgress?.(i + 1, shots.length);
    }
  } finally {
    scene.dispose();
    host.remove();
  }
  return out;
}

/** Zips the shots (JSZip is loaded on demand). */
export async function zipShots(files: { name: string; blob: Blob }[], readme: string): Promise<Blob> {
  const JSZip = (await import("jszip")).default;
  const z = new JSZip();
  for (const f of files) z.file(f.name, f.blob);
  z.file("README.txt", readme);
  return z.generateAsync({ type: "blob" });
}
