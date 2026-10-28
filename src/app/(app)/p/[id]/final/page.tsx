import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { FinalStudio } from "@/components/final/FinalStudio";
import { Journey } from "@/components/Journey";
import { defaultArtwork, normalizeArtwork } from "@/lib/artwork";
import { loadLibrary } from "@/lib/materialsStore";
import { canAccess, getArtworkRaw, getBoard, getProject, listBoards } from "@/lib/projects";
import { getLang, requireInvite } from "../../../../_server/session";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "出成品 Final files · 包装视觉顾问 Packaging Advisor" };

/** Step 4: finish the artwork and download the print file and listing images. */
export default async function FinalPage({ params }: { params: Promise<{ id: string }> }) {
  const invite = await requireInvite();
  const lang = await getLang();
  const { id } = await params;
  const project = getProject(id);
  if (!canAccess(project, invite)) notFound();
  const latest = listBoards(project.id)[0];
  const record = latest ? getBoard(latest.id) : null;
  if (!record) redirect(`/p/${project.id}`);
  const base = defaultArtwork(record.data, record.picked);
  const artwork = normalizeArtwork(getArtworkRaw(project.id), base);
  const boardHref = `/p/${project.id}?v=${record.id}`;
  const spaceHref = `/space/${project.id}?v=${record.id}&d=${artwork.dir}`;
  return (
    <main className="page final-page">
      <Journey
        steps={[
          { state: "done", href: `/p/${project.id}` },
          { state: "done", href: boardHref },
          { state: "done", href: spaceHref },
          { state: "current" },
        ]}
        lang={lang}
      />
      <FinalStudio
        board={record.data}
        pack={project.pack}
        initial={artwork}
        lang={lang}
        saveUrl={`/api/projects/${project.id}/artwork`}
        logoUrl={`/api/projects/${project.id}/logo`}
        proofUrl={`/api/projects/${project.id}/proof`}
        exportUrl={`/api/projects/${project.id}/export`}
        boardHref={`${boardHref}#handoff`}
        spaceHref={spaceHref}
        fileStem={project.title}
        library={loadLibrary()}
      />
    </main>
  );
}
