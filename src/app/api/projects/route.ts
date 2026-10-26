import { NextResponse } from "next/server";
import { generateBoard, GenerationError } from "@/lib/generate";
import { isCategory } from "@/lib/categories";
import { addUpload, createProject } from "@/lib/projects";
import { normalizeImage, UploadError } from "@/lib/uploads";
import { apiInvite, jsonError, UNAUTHORIZED } from "../_auth";

export const runtime = "nodejs";
export const maxDuration = 300;

/** Create a product brief from the form, store its images, then generate the first board. */
export async function POST(req: Request) {
  const invite = await apiInvite();
  if (!invite) return UNAUTHORIZED();

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return jsonError(400, "表单无法读取 Could not read the form");
  }
  const text = (k: string, max: number) => String(form.get(k) ?? "").trim().slice(0, max);
  const title = text("title", 80);
  const category = text("category", 20);
  if (!title) return jsonError(400, "请填写产品名称 Enter a product name");
  if (!isCategory(category)) return jsonError(400, "请选择品类 Choose a category");
  const itemType = text("itemType", 40);
  if (category === "other" && !itemType) return jsonError(400, "请写一下这是什么产品 Say what the product is");

  const products = form.getAll("product").filter((f): f is File => f instanceof File && f.size > 0).slice(0, 2);
  const refs = form.getAll("reference").filter((f): f is File => f instanceof File && f.size > 0).slice(0, 4);
  const productNotes = form.getAll("productNote").map(String);
  const refNotes = form.getAll("referenceNote").map(String);
  if (products.length === 0) return jsonError(400, "请至少上传一张产品照片 Upload at least one product photo");

  // Decode and normalize every image before writing anything.
  let images: { kind: "product" | "reference"; note: string; data: Buffer }[];
  try {
    images = await Promise.all([
      ...products.map(async (f, i) => ({ kind: "product" as const, note: productNotes[i] ?? "", data: await normalizeImage(Buffer.from(await f.arrayBuffer())) })),
      ...refs.map(async (f, i) => ({ kind: "reference" as const, note: refNotes[i] ?? "", data: await normalizeImage(Buffer.from(await f.arrayBuffer())) })),
    ]);
  } catch (e) {
    if (e instanceof UploadError) return jsonError(400, e.message);
    throw e;
  }

  const project = createProject(invite.id, { title, category, itemType, brand: text("brand", 60), description: text("description", 2000), mustText: text("mustText", 2000) });
  for (const img of images) addUpload(project.id, img.kind, img.note, img.data);

  const modelId = Number(form.get("modelId")) || null;
  try {
    const board = await generateBoard(project.id, invite, modelId);
    return NextResponse.json({ projectId: project.id, boardId: board.id });
  } catch (e) {
    const err = e instanceof GenerationError ? e : new GenerationError("生成失败 Generation failed", [String((e as Error).message)]);
    return jsonError(502, err.message, { detail: err.detail, projectId: project.id });
  }
}
