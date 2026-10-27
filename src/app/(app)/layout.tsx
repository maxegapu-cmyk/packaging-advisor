import Link from "next/link";
import { headers } from "next/headers";
import { Bi, T } from "@/components/Bi";
import { Brandmark } from "@/components/Brandmark";
import { LangSwitch } from "@/components/LangSwitch";
import { ThemeSwitch } from "@/components/ThemeSwitch";
import { UI } from "@/lib/i18n";
import { signOutAction } from "../actions";
import { getLang, requireInvite } from "../_server/session";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const invite = await requireInvite();
  const lang = await getLang();
  const h = await headers();
  const back = h.get("x-pathname") ?? "/products";
  return (
    <>
      <header className="topbar">
        <Link href="/products" className="brandmark">
          <Brandmark />
          <Bi p={UI.appName} lang={lang} as="strong" />
        </Link>
        <nav className="topnav" aria-label="主导航 Main">
          <Link href="/products">
            <T k="myProducts" lang={lang} />
          </Link>
          <Link href="/new">
            <T k="newProduct" lang={lang} />
          </Link>
          {invite.isAdmin ? (
            <Link href="/admin">
              <T k="admin" lang={lang} />
            </Link>
          ) : null}
        </nav>
        <div className="topbar-right">
          <LangSwitch lang={lang} back={back} />
          <ThemeSwitch lang={lang} />
          <form action={signOutAction}>
            <button type="submit" className="btn btn-small btn-quiet">
              <T k="signOut" lang={lang} />
            </button>
          </form>
        </div>
      </header>
      {children}
    </>
  );
}
