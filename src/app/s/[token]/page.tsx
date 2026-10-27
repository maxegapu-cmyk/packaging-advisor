import { notFound } from "next/navigation";
import { Bi, T } from "@/components/Bi";
import { BoardView } from "@/components/BoardView";
import { Brandmark } from "@/components/Brandmark";
import { LangSwitch } from "@/components/LangSwitch";
import { ThemeSwitch } from "@/components/ThemeSwitch";
import { UI } from "@/lib/i18n";
import { initApp } from "@/lib/init";
import { getBoardByShareToken, getProject } from "@/lib/projects";
import { defaultPack } from "@/lib/pack";
import { getLang } from "../../_server/session";

export const dynamic = "force-dynamic";

/** Read-only board for the seller's designer. No sign-in, no uploads, no actions. */
export default async function SharedBoardPage({ params }: { params: Promise<{ token: string }> }) {
  initApp();
  const { token } = await params;
  const board = getBoardByShareToken(token);
  if (!board) notFound();
  const lang = await getLang();
  return (
    <>
      <header className="topbar">
        <span className="brandmark">
          <Brandmark />
          <Bi p={UI.appName} lang={lang} as="strong" />
        </span>
        <T k="sharedBoard" lang={lang} className="muted" />
        <div className="topbar-right">
          <LangSwitch lang={lang} back={`/s/${token}`} />
          <ThemeSwitch lang={lang} />
        </div>
      </header>
      <main className="page">
        <BoardView
          board={board.data}
          lang={lang}
          pickedId={board.picked}
          pack={getProject(board.projectId)?.pack ?? defaultPack(board.data.meta.category)}
          studioBase={`/s/${token}/space`}
        />
      </main>
    </>
  );
}
