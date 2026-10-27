import { redirect } from "next/navigation";
import { Bi, T } from "@/components/Bi";
import { Box3D } from "@/components/Box3D";
import { Brandmark } from "@/components/Brandmark";
import { LangSwitch } from "@/components/LangSwitch";
import { ThemeSwitch } from "@/components/ThemeSwitch";
import { plain, UI } from "@/lib/i18n";
import { DEMO_BOARD } from "@/lib/llm/demo";
import { currentInvite, getLang } from "../_server/session";
import { SignInForm } from "./SignInForm";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const next = (await searchParams).next ?? "";
  if (await currentInvite()) redirect(next === "/new" ? "/new" : "/products");
  const lang = await getLang();
  const d = DEMO_BOARD.directions[1];
  return (
    <main className="signin">
      <div className="signin-art">
        <Box3D d={d} brand={DEMO_BOARD.meta.brand} label={plain(UI.boxOf, lang)} />
      </div>
      <div className="signin-main">
        <div className="signin-sheet">
          <div className="toolbar" style={{ justifyContent: "space-between" }}>
            <a className="brandmark" href="/">
              <Brandmark />
              <Bi p={UI.appName} lang={lang} as="strong" />
            </a>
            <div className="topbar-right">
              <LangSwitch lang={lang} back="/login" />
              <ThemeSwitch lang={lang} />
            </div>
          </div>
          <T k="signIn" lang={lang} as="h1" />
          <T k="tagline" lang={lang} as="p" className="muted" />
          <SignInForm
            next={next}
            labels={{
              code: plain(UI.inviteCode, lang),
              help: plain(UI.inviteHelp, lang),
              submit: plain(UI.signIn, lang),
              bad: plain(UI.badCode, lang),
            }}
          />
        </div>
      </div>
    </main>
  );
}
