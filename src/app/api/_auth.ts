import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { sessionInvite, SESSION_COOKIE, type Invite } from "@/lib/auth";
import { initApp } from "@/lib/init";

export async function apiInvite(): Promise<Invite | null> {
  initApp();
  return sessionInvite((await cookies()).get(SESSION_COOKIE)?.value);
}

export function jsonError(status: number, error: string, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ error, ...extra }, { status });
}

export const UNAUTHORIZED = () => jsonError(401, "请先登录 Please sign in");
export const NOT_FOUND = () => jsonError(404, "找不到 Not found");
