"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { SESSION_COOKIE, signIn, signOut } from "@/lib/auth";
import { initApp } from "@/lib/init";
import { isLang, LANG_COOKIE } from "@/lib/i18n";
import { canAccess, disableShare, enableShare, getBoard, getProject, logEvent, setPicked } from "@/lib/projects";
import { requireInvite } from "./_server/session";

const secureCookies = () => process.env.COOKIE_SECURE === "true" || (process.env.NODE_ENV === "production" && process.env.COOKIE_SECURE !== "false");

export async function signInAction(_prev: { error: boolean } | null, form: FormData): Promise<{ error: boolean }> {
  initApp();
  const res = signIn(String(form.get("code") ?? ""));
  if (!res) return { error: true };
  (await cookies()).set(SESSION_COOKIE, res.token, { httpOnly: true, sameSite: "lax", secure: secureCookies(), path: "/", expires: res.expiresAt });
  redirect("/products");
}

export async function signOutAction() {
  const jar = await cookies();
  signOut(jar.get(SESSION_COOKIE)?.value);
  jar.delete(SESSION_COOKIE);
  redirect("/login");
}

export async function setLangAction(form: FormData) {
  const lang = form.get("lang");
  if (isLang(lang)) (await cookies()).set(LANG_COOKIE, lang, { sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
  const back = String(form.get("back") ?? "/");
  redirect(back.startsWith("/") && !back.startsWith("//") ? back : "/");
}

async function ownedBoard(boardId: string) {
  const invite = await requireInvite();
  const board = getBoard(boardId);
  const project = board ? getProject(board.projectId) : null;
  if (!board || !canAccess(project, invite)) throw new Error("Not found");
  return { invite, board, project };
}

export async function pickAction(form: FormData) {
  const { invite, board, project } = await ownedBoard(String(form.get("boardId")));
  const dir = String(form.get("directionId") ?? "");
  const next = board.picked === dir ? null : dir;
  setPicked(board.id, next);
  if (next) logEvent({ inviteId: invite.id, projectId: project.id, boardId: board.id, type: "pick", payload: { direction: next } });
  revalidatePath(`/p/${project.id}`);
}

export async function shareAction(form: FormData) {
  const { invite, board, project } = await ownedBoard(String(form.get("boardId")));
  if (form.get("mode") === "off") disableShare(board.id);
  else {
    enableShare(board.id);
    logEvent({ inviteId: invite.id, projectId: project.id, boardId: board.id, type: "share" });
  }
  revalidatePath(`/p/${project.id}`);
}

export async function handoffAction(form: FormData) {
  const { invite, board, project } = await ownedBoard(String(form.get("boardId")));
  logEvent({ inviteId: invite.id, projectId: project.id, boardId: board.id, type: "handoff", payload: { picked: board.picked } });
  redirect(`/p/${project.id}?v=${board.id}&done=handoff`);
}

export async function feedbackAction(form: FormData) {
  const { invite, board, project } = await ownedBoard(String(form.get("boardId")));
  const text = String(form.get("text") ?? "").slice(0, 2000).trim();
  const ratingRaw = Number(form.get("rating"));
  const rating = Number.isInteger(ratingRaw) && ratingRaw >= 1 && ratingRaw <= 5 ? ratingRaw : null;
  if (text || rating) logEvent({ inviteId: invite.id, projectId: project.id, boardId: board.id, type: "feedback", payload: { text, rating } });
  redirect(`/p/${project.id}?v=${board.id}&done=feedback`);
}
