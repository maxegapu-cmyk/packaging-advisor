import { redirect } from "next/navigation";
import { Bi, T } from "@/components/Bi";
import { Box3D } from "@/components/Box3D";
import { Brandmark } from "@/components/Brandmark";
import { LangSwitch } from "@/components/LangSwitch";
import { plain, UI } from "@/lib/i18n";
import { DEMO_BOARD } from "@/lib/llm/demo";
import { currentInvite, getLang } from "../_server/session";
import { SignInForm } from "./SignInForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await currentInvite()) redirect("/products");
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
            <LangSwitch lang={lang} back="/login" />
          </div>
          <T k="signIn" lang={lang} as="h1" />
          <T k="tagline" lang={lang} as="p" className="muted" />
          <SignInForm
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
