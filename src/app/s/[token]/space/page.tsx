import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Studio } from "@/components/pack/Studio";
import { initApp } from "@/lib/init";
import { getBoardByShareToken, getProject } from "@/lib/projects";
import { defaultPack } from "@/lib/pack";
import { getLang } from "../../../_server/session";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "3D 空间 3D space · 包装视觉顾问 Packaging Advisor" };

/** The 3D space for a shared board: read-only, the seller's saved structure, nothing saved back. */
export default async function SharedSpacePage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  initApp();
  const { token } = await params;
  const sp = await searchParams;
  const board = getBoardByShareToken(token);
  if (!board) notFound();
  const project = getProject(board.projectId);
  const lang = await getLang();
  return (
    <Studio
      board={board.data}
      initialPack={project?.pack ?? defaultPack(board.data.meta.category)}
      initialDirection={sp.d ?? board.picked ?? undefined}
      lang={lang}
      backHref={`/s/${token}`}
    />
  );
}
