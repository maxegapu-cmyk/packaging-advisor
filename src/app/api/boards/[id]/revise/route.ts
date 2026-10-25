import { NextResponse } from "next/server";
import { isDimension } from "@/lib/board/revise";
import { GenerationError, reviseDirection } from "@/lib/generate";
import { canAccess, getBoard, getProject } from "@/lib/projects";
import { apiInvite, jsonError, NOT_FOUND, UNAUTHORIZED } from "../../../_auth";

export const runtime = "nodejs";
export const maxDuration = 300;

/** Revise one dimension of one direction; saves a new board version. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const invite = await apiInvite();
  if (!invite) return UNAUTHORIZED();
  const { id } = await ctx.params;
  const board = getBoard(id);
  const project = board ? getProject(board.projectId) : null;
  if (!board || !canAccess(project, invite)) return NOT_FOUND();
  const body = await req.json().catch(() => null);
  if (!body || typeof body.directionId !== "string" || !isDimension(body.dimension)) return jsonError(400, "请选择要修改的方向和维度 Choose a direction and a dimension");
  try {
    const next = await reviseDirection(board.id, invite, {
      directionId: body.directionId,
      dimension: body.dimension,
      feedback: String(body.feedback ?? ""),
      modelId: Number(body.modelId) || null,
    });
    return NextResponse.json({ projectId: project.id, boardId: next.id });
  } catch (e) {
    const err = e instanceof GenerationError ? e : new GenerationError("修改失败 Revision failed", [String((e as Error).message)]);
    return jsonError(502, err.message, { detail: err.detail });
  }
}
