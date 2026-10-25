import { NextResponse } from "next/server";
import { generateBoard, GenerationError } from "@/lib/generate";
import { canAccess, getProject } from "@/lib/projects";
import { apiInvite, jsonError, NOT_FOUND, UNAUTHORIZED } from "../../../_auth";

export const runtime = "nodejs";
export const maxDuration = 300;

/** Generate a fresh set of three directions for an existing product. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const invite = await apiInvite();
  if (!invite) return UNAUTHORIZED();
  const { id } = await ctx.params;
  const project = getProject(id);
  if (!canAccess(project, invite)) return NOT_FOUND();
  const body = await req.json().catch(() => ({}));
  try {
    const board = await generateBoard(project.id, invite, Number(body?.modelId) || null);
    return NextResponse.json({ projectId: project.id, boardId: board.id });
  } catch (e) {
    const err = e instanceof GenerationError ? e : new GenerationError("生成失败 Generation failed", [String((e as Error).message)]);
    return jsonError(502, err.message, { detail: err.detail });
  }
}
