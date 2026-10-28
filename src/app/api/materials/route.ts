import { NextResponse } from "next/server";
import { loadLibrary, saveLibrary } from "@/lib/materialsStore";
import { apiInvite, jsonError, UNAUTHORIZED } from "../_auth";

/** The material library: anyone signed in reads it; admins change it. */
export async function GET() {
  const invite = await apiInvite();
  if (!invite) return UNAUTHORIZED();
  return NextResponse.json(loadLibrary());
}

export async function PUT(req: Request) {
  const invite = await apiInvite();
  if (!invite) return UNAUTHORIZED();
  if (!invite.isAdmin) return jsonError(403, "只有管理员可以修改材料库 Only admins can change the material library");
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "需要 JSON Expected JSON");
  }
  if (JSON.stringify(body ?? {}).length > 600_000) return jsonError(413, "材料库太大 The library is too large");
  return NextResponse.json(saveLibrary(body));
}
