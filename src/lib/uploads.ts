/**
 * Image uploads: verified by decoding (not by file extension), resized to keep model costs down,
 * re-encoded as JPEG (which also strips EXIF data such as GPS location).
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { dataDir } from "./db";

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
export const MAX_IMAGES = 6;
const MAX_EDGE = 1568;
const ACCEPTED = new Set(["jpeg", "png", "webp", "heif", "avif", "gif"]);

export class UploadError extends Error {}

export async function normalizeImage(input: Buffer): Promise<Buffer> {
  if (input.byteLength > MAX_UPLOAD_BYTES) throw new UploadError("图片超过 15 MB Image is larger than 15 MB");
  const meta = await sharp(input)
    .metadata()
    .catch(() => {
      throw new UploadError("无法识别的图片文件 Not a readable image");
    });
  if (!meta.format || !ACCEPTED.has(meta.format)) throw new UploadError("仅支持 JPG、PNG、WebP、HEIC 图片 Only JPG, PNG, WebP and HEIC images are supported");
  return sharp(input, { animated: false })
    .rotate()
    .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true })
    .flatten({ background: "#ffffff" })
    .jpeg({ quality: 85, mozjpeg: true })
    .toBuffer();
}

/** A logo: transparency kept (PNG), at most 1200 px, metadata stripped. */
export async function normalizeLogo(input: Buffer): Promise<Buffer> {
  if (input.byteLength > MAX_UPLOAD_BYTES) throw new UploadError("图片超过 15 MB Image is larger than 15 MB");
  const meta = await sharp(input)
    .metadata()
    .catch(() => {
      throw new UploadError("无法识别的图片文件 Not a readable image");
    });
  if (!meta.format || (!ACCEPTED.has(meta.format) && meta.format !== "svg")) throw new UploadError("标志请用 PNG、JPG、WebP 或 SVG Use PNG, JPG, WebP or SVG for the logo");
  return sharp(input, { animated: false, density: 300 })
    .rotate()
    .resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: meta.format !== "svg" })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

export function uploadPath(file: string): string {
  // file names are generated server-side; still refuse anything that is not a bare name.
  if (!/^[A-Za-z0-9_-]+\.(jpg|png)$/.test(file)) throw new UploadError("Invalid file name");
  return path.join(dataDir(), "uploads", file);
}

export function writeUpload(id: string, data: Buffer, ext: "jpg" | "png" = "jpg"): string {
  const file = `${id}.${ext}`;
  fs.writeFileSync(uploadPath(file), data);
  return file;
}

export function readUpload(file: string): Buffer {
  return fs.readFileSync(uploadPath(file));
}
