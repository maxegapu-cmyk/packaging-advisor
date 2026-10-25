import { NextResponse } from "next/server";
import { providerClient } from "@/lib/llm/providers";
import { apiInvite, jsonError, UNAUTHORIZED } from "../../../../_auth";

export const runtime = "nodejs";

/** Admin: fetch the platform's model list with the stored key, so models can be added with one click. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const invite = await apiInvite();
  if (!invite?.isAdmin) return UNAUTHORIZED();
  const { id } = await ctx.params;
  try {
    const models = await providerClient(id).listModels();
    return NextResponse.json({ models });
  } catch (e) {
    return jsonError(502, `获取模型列表失败 Could not fetch models: ${(e as Error).message}`);
  }
}
