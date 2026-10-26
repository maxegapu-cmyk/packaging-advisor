import { NextResponse } from "next/server";
import { addLogo, canAccess, getProject } from "@/lib/projects";
import { normalizeLogo, UploadError } from "@/lib/uploads";
import { apiInvite, jsonError, NOT_FOUND, UNAUTHORIZED } from "../../../_auth";

export const runtime = "nodejs";

/** Upload the brand logo for the artwork. Returns its upload id. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const invite = await apiInvite();
  if (!invite) return UNAUTHORIZED();
  const { id } = await ctx.params;
  const project = getProject(id);
  if (!canAccess(project, invite)) return NOT_FOUND();
  const form = await req.formData().catch(() => null);
  const file = form?.get("logo");
  if (!(file instanceof File) || file.size === 0) return jsonError(400, "请选择标志图片 Choose a logo image");
  try {
    const png = await normalizeLogo(Buffer.from(await file.arrayBuffer()));
    const up = addLogo(project.id, png);
    return NextResponse.json({ id: up.id, url: `/api/uploads/${up.id}` });
  } catch (e) {
    if (e instanceof UploadError) return jsonError(400, e.message);
    throw e;
  }
}
