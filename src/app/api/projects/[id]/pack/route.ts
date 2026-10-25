import { NextResponse } from "next/server";
import { canAccess, getProject, setPack } from "@/lib/projects";
import { apiInvite, jsonError, NOT_FOUND, UNAUTHORIZED } from "../../../_auth";

export const runtime = "nodejs";

/** Save the package structure (form, size, finish) for a product. Invalid fields fall back. */
export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const invite = await apiInvite();
  if (!invite) return UNAUTHORIZED();
  const { id } = await ctx.params;
  const project = getProject(id);
  if (!canAccess(project, invite)) return NOT_FOUND();
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return jsonError(400, "格式不对 Bad request");
  return NextResponse.json({ pack: setPack(project.id, body) });
}
