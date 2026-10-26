import { Bi, T } from "@/components/Bi";
import { Journey } from "@/components/Journey";
import { UI } from "@/lib/i18n";
import { listModelChoices } from "@/lib/llm/providers";
import { dailyLimit, usageToday } from "@/lib/projects";
import { getLang, requireInvite } from "../../_server/session";
import { NewProductForm } from "./NewProductForm";

export default async function NewProductPage() {
  const invite = await requireInvite();
  const lang = await getLang();
  const models = listModelChoices();
  const left = invite.isAdmin ? null : Math.max(0, dailyLimit() - usageToday(invite.id));
  return (
    <main className="page page-upload">
      <Journey steps={[{ state: "current" }, { state: "todo" }, { state: "todo" }, { state: "todo" }]} lang={lang} />
      <div className="page-head">
        <div>
          <T k="newProduct" lang={lang} as="h1" />
          <Bi p={UI.uploadSub} lang={lang} as="p" className="page-sub" />
        </div>
        {left !== null ? (
          <p className="muted">
            <T k="limitLeft" lang={lang} />: {left}
          </p>
        ) : null}
      </div>
      <NewProductForm lang={lang} models={models} />
    </main>
  );
}
