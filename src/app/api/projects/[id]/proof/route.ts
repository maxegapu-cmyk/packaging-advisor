import { NextResponse } from "next/server";
import { addProofPhoto, canAccess, getProject } from "@/lib/projects";
import { normalizeImage, UploadError } from "@/lib/uploads";
import { apiInvite, jsonError, NOT_FOUND, UNAUTHORIZED } from "../../../_auth";

export const runtime = "nodejs";

/** Upload a photo of the printed sample, to compare with the render. Returns its upload id. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const invite = await apiInvite();
  if (!invite) return UNAUTHORIZED();
  const { id } = await ctx.params;
  const project = getProject(id);
  if (!canAccess(project, invite)) return NOT_FOUND();
  const form = await req.formData().catch(() => null);
  const file = form?.get("photo");
  if (!(file instanceof File) || file.size === 0) return jsonError(400, "请选择实物照片 Choose a photo of the sample");
  try {
    const up = addProofPhoto(project.id, await normalizeImage(Buffer.from(await file.arrayBuffer())));
    return NextResponse.json({ id: up.id, url: `/api/uploads/${up.id}` });
  } catch (e) {
    if (e instanceof UploadError) return jsonError(400, e.message);
    throw e;
  }
}
