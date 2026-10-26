import { NextResponse } from "next/server";
import { defaultArtwork, normalizeArtwork } from "@/lib/artwork";
import { canAccess, getArtworkRaw, getBoard, getProject, listBoards, setArtwork } from "@/lib/projects";
import { apiInvite, jsonError, NOT_FOUND, UNAUTHORIZED } from "../../../_auth";

export const runtime = "nodejs";

/** Save the finished artwork (final files step). Anything invalid falls back to what was saved. */
export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const invite = await apiInvite();
  if (!invite) return UNAUTHORIZED();
  const { id } = await ctx.params;
  const project = getProject(id);
  if (!canAccess(project, invite)) return NOT_FOUND();
  const latest = listBoards(project.id)[0];
  const record = latest ? getBoard(latest.id) : null;
  if (!record) return jsonError(409, "还没有方案板 No board yet");
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return jsonError(400, "格式不对 Bad request");
  const base = normalizeArtwork(getArtworkRaw(project.id), defaultArtwork(record.data, record.picked));
  const artwork = normalizeArtwork(body, base);
  if (!record.data.directions.some((d) => d.id === artwork.dir)) artwork.dir = base.dir;
  return NextResponse.json({ artwork: setArtwork(project.id, artwork) });
}
