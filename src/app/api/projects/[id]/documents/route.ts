import { NextResponse } from "next/server";
import { normalizeDocMeta } from "@/lib/compliance/documents";
import { addDocument, canAccess, deleteDocument, getProject, listDocuments, updateDocument } from "@/lib/projects";
import { normalizeDocument, UploadError } from "@/lib/uploads";
import { apiInvite, jsonError, NOT_FOUND, UNAUTHORIZED } from "../../../_auth";

export const runtime = "nodejs";

/** A product's supplier documents: list, add (a PDF or image with its details), change, remove. */
async function project(ctx: { params: Promise<{ id: string }> }) {
  const invite = await apiInvite();
  if (!invite) return { error: UNAUTHORIZED() };
  const { id } = await ctx.params;
  const p = getProject(id);
  if (!canAccess(p, invite)) return { error: NOT_FOUND() };
  return { project: p };
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const r = await project(ctx);
  if (r.error) return r.error;
  return NextResponse.json(listDocuments(r.project.id));
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const r = await project(ctx);
  if (r.error) return r.error;
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File) || file.size === 0) return jsonError(400, "请选择文件 Choose a file");
  let meta;
  try {
    meta = normalizeDocMeta(JSON.parse(String(form?.get("meta") ?? "{}")));
  } catch {
    meta = null;
  }
  if (!meta) return jsonError(400, "请填写文件名称 Give the document a title");
  try {
    const doc = addDocument(r.project.id, await normalizeDocument(Buffer.from(await file.arrayBuffer())), meta);
    return NextResponse.json(doc);
  } catch (e) {
    if (e instanceof UploadError) return jsonError(400, e.message);
    throw e;
  }
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const r = await project(ctx);
  if (r.error) return r.error;
  const body = (await req.json().catch(() => null)) as { id?: unknown; meta?: unknown } | null;
  const meta = normalizeDocMeta(body?.meta);
  if (!body || typeof body.id !== "string" || !meta) return jsonError(400, "资料不完整 Incomplete details");
  return updateDocument(r.project.id, body.id, meta) ? NextResponse.json({ ok: true }) : NOT_FOUND();
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const r = await project(ctx);
  if (r.error) return r.error;
  const id = new URL(req.url).searchParams.get("doc");
  if (!id) return jsonError(400, "缺少文件编号 Missing document id");
  return deleteDocument(r.project.id, id) ? NextResponse.json({ ok: true }) : NOT_FOUND();
}
