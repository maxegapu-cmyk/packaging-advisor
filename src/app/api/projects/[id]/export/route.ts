import { NextResponse } from "next/server";
import { canAccess, getProject, listBoards, logEvent } from "@/lib/projects";
import { apiInvite, jsonError, NOT_FOUND, UNAUTHORIZED } from "../../../_auth";

export const runtime = "nodejs";

/** Records that final files were downloaded (the last step of the journey, and an MVP measure). */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const invite = await apiInvite();
  if (!invite) return UNAUTHORIZED();
  const { id } = await ctx.params;
  const project = getProject(id);
  if (!canAccess(project, invite)) return NOT_FOUND();
  const body = (await req.json().catch(() => null)) as { kind?: unknown; errors?: unknown } | null;
  const kind = body?.kind === "pdf" || body?.kind === "images" ? body.kind : null;
  if (!kind) return jsonError(400, "格式不对 Bad request");
  const errors = typeof body?.errors === "number" ? Math.max(0, Math.min(99, Math.round(body.errors))) : 0;
  logEvent({ inviteId: invite.id, projectId: project.id, boardId: listBoards(project.id)[0]?.id, type: "export", payload: { kind, errors } });
  return NextResponse.json({ ok: true });
}
