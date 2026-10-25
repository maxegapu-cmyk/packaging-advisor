import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Studio } from "@/components/pack/Studio";
import { DEMO_BOARD } from "@/lib/llm/demo";
import { defaultPack } from "@/lib/pack";
import { canAccess, getBoard, getProject, listBoards } from "@/lib/projects";
import { getLang, requireInvite } from "../../_server/session";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "3D 空间 3D space · 包装视觉顾问 Packaging Advisor" };

/**
 * Full-screen 3D space for one product's directions. `/space/demo` shows the public sample
 * (no sign-in, nothing saved). Query: `v` board version id, `d` direction id.
 */
export default async function SpacePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { id } = await params;
  const sp = await searchParams;
  const lang = await getLang();

  if (id === "demo") {
    return <Studio board={DEMO_BOARD} initialPack={defaultPack("tea")} initialDirection={sp.d} lang={lang} backHref="/#sample" isSample />;
  }

  const invite = await requireInvite();
  const project = getProject(id);
  if (!canAccess(project, invite)) notFound();
  const versions = listBoards(project.id);
  const record = (sp.v && versions.some((b) => b.id === sp.v) ? getBoard(sp.v) : null) ?? (versions[0] ? getBoard(versions[0].id) : null);
  if (!record) redirect(`/p/${project.id}`);

  return (
    <Studio
      board={record.data}
      initialPack={project.pack}
      initialDirection={sp.d ?? record.picked ?? undefined}
      lang={lang}
      saveUrl={`/api/projects/${project.id}/pack`}
      backHref={`/p/${project.id}?v=${record.id}`}
    />
  );
}
