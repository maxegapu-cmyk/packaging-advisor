import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { sessionInvite, SESSION_COOKIE, type Invite } from "@/lib/auth";
import { initApp } from "@/lib/init";
import { LANG_COOKIE, toLang, type Lang } from "@/lib/i18n";

export async function getLang(): Promise<Lang> {
  const v = (await cookies()).get(LANG_COOKIE)?.value;
  return toLang(v);
}

export async function currentInvite(): Promise<Invite | null> {
  initApp();
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return sessionInvite(token);
}

export async function requireInvite(): Promise<Invite> {
  const invite = await currentInvite();
  if (!invite) redirect("/login");
  return invite;
}

export async function requireAdmin(): Promise<Invite> {
  const invite = await requireInvite();
  if (!invite.isAdmin) redirect("/products");
  return invite;
}
