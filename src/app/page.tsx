import { redirect } from "next/navigation";
import { LangSwitch } from "@/components/LangSwitch";
import { Landing } from "@/components/Landing";
import { currentInvite, getLang } from "./_server/session";

export const dynamic = "force-dynamic";

/** Public landing page. Signed-in testers go straight to their products. */
export default async function Home() {
  if (await currentInvite()) redirect("/products");
  const lang = await getLang();
  return <Landing lang={lang} langSwitch={<LangSwitch lang={lang} back="/" />} />;
}
