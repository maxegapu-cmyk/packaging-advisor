import { canAccess, getProject, getUpload } from "@/lib/projects";
import { readUpload } from "@/lib/uploads";
import { apiInvite, NOT_FOUND, UNAUTHORIZED } from "../../_auth";

export const runtime = "nodejs";

/** Uploaded images are private: only the owner (or an admin) can view them. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const invite = await apiInvite();
  if (!invite) return UNAUTHORIZED();
  const { id } = await ctx.params;
  const upload = getUpload(id);
  if (!upload || !canAccess(getProject(upload.projectId), invite)) return NOT_FOUND();
  const data = readUpload(upload.file);
  return new Response(new Uint8Array(data), {
    headers: { "content-type": upload.mime, "cache-control": "private, max-age=86400", "x-content-type-options": "nosniff" },
  });
}
