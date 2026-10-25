"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createInvites, setInviteDisabled, updateInviteLabel } from "@/lib/auth";
import { addModel, deleteModel, deleteProvider, providerClient, saveProvider, setDefaultModel, setProviderEnabled, updateModel } from "@/lib/llm/providers";
import type { ProviderKind } from "@/lib/llm/types";
import { requireAdmin } from "../../_server/session";

function back(path: string, params: Record<string, string>): never {
  redirect(`${path}?${new URLSearchParams(params).toString()}`);
}

const s = (form: FormData, k: string) => String(form.get(k) ?? "").trim();

export async function saveProviderAction(form: FormData) {
  await requireAdmin();
  try {
    saveProvider({
      id: s(form, "id") || undefined,
      name: s(form, "name"),
      kind: s(form, "kind") as ProviderKind,
      baseUrl: s(form, "baseUrl"),
      apiKey: s(form, "apiKey"),
      enabled: form.get("enabled") !== "0",
    });
  } catch (e) {
    back("/admin/models", { err: (e as Error).message });
  }
  back("/admin/models", { msg: "已保存 Saved" });
}

export async function toggleProviderAction(form: FormData) {
  await requireAdmin();
  setProviderEnabled(s(form, "id"), form.get("enabled") === "1");
  revalidatePath("/admin/models");
}

export async function deleteProviderAction(form: FormData) {
  await requireAdmin();
  deleteProvider(s(form, "id"));
  back("/admin/models", { msg: "已删除 Deleted" });
}

export async function testProviderAction(form: FormData) {
  await requireAdmin();
  const id = s(form, "id");
  const model = s(form, "model");
  let result: Record<string, string>;
  try {
    const client = providerClient(id);
    const started = Date.now();
    const res = await client.complete({ model, messages: [{ role: "user", content: "只回复\"OK\"。Reply with OK only." }], maxTokens: 20, temperature: 0 });
    result = { msg: `连接成功 Connected (${model}, ${Date.now() - started} ms): ${res.text.slice(0, 40)}` };
  } catch (e) {
    result = { err: `连接失败 Connection failed (${model}): ${(e as Error).message}` };
  }
  back("/admin/models", result);
}

export async function addModelAction(form: FormData) {
  await requireAdmin();
  try {
    addModel({ providerId: s(form, "providerId"), model: s(form, "model"), label: s(form, "label"), vision: form.get("vision") === "on" || form.get("vision") === "1" });
  } catch (e) {
    back("/admin/models", { err: (e as Error).message });
  }
  revalidatePath("/admin/models");
}

export async function updateModelAction(form: FormData) {
  await requireAdmin();
  const id = Number(form.get("id"));
  const op = s(form, "op");
  if (op === "default") setDefaultModel(id);
  else if (op === "delete") deleteModel(id);
  else if (op === "enable") updateModel(id, { enabled: true });
  else if (op === "disable") updateModel(id, { enabled: false });
  else if (op === "vision-on") updateModel(id, { vision: true });
  else if (op === "vision-off") updateModel(id, { vision: false });
  revalidatePath("/admin/models");
}

/** Returns the plain codes to the form once; they are never stored or put in a URL. */
export async function createInvitesAction(_prev: { codes: string[] } | null, form: FormData): Promise<{ codes: string[] }> {
  await requireAdmin();
  const count = Math.max(1, Math.min(50, Number(form.get("count")) || 1));
  const created = createInvites(count, { label: s(form, "label"), admin: form.get("admin") === "on" });
  revalidatePath("/admin/invites");
  return { codes: created.map((c) => `${c.code}  ${c.invite.label}`.trim()) };
}

export async function inviteAction(form: FormData) {
  await requireAdmin();
  const id = Number(form.get("id"));
  const op = s(form, "op");
  if (op === "disable") setInviteDisabled(id, true);
  if (op === "enable") setInviteDisabled(id, false);
  if (op === "label") updateInviteLabel(id, s(form, "label"));
  revalidatePath("/admin/invites");
}
