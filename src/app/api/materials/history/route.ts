import { NextResponse } from "next/server";
import { loadHistory, restoreLibrary } from "@/lib/materialsStore";
import { apiInvite, jsonError, UNAUTHORIZED } from "../../_auth";

/** The material library's saved versions (admins), and putting one back. */
export async function GET() {
  const invite = await apiInvite();
  if (!invite) return UNAUTHORIZED();
  if (!invite.isAdmin) return jsonError(403, "只有管理员可以查看修改记录 Only admins can see the history");
  return NextResponse.json(loadHistory());
}

export async function POST(req: Request) {
  const invite = await apiInvite();
  if (!invite) return UNAUTHORIZED();
  if (!invite.isAdmin) return jsonError(403, "只有管理员可以恢复材料库 Only admins can restore the library");
  const body = (await req.json().catch(() => null)) as { at?: unknown } | null;
  if (!body || typeof body.at !== "string") return jsonError(400, "需要版本时间 Expected the version's time");
  const lib = restoreLibrary(body.at, invite.label || `#${invite.id}`);
  return lib ? NextResponse.json(lib) : jsonError(404, "找不到这个版本 Version not found");
}
