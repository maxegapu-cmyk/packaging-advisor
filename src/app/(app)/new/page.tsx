import { T } from "@/components/Bi";
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
    <main className="page page-narrow">
      <div className="page-head">
        <T k="newProduct" lang={lang} as="h1" />
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
