import { T } from "./Bi";
import type { Lang } from "@/lib/i18n";

export type ApiError = { error: string; detail?: string[]; projectId?: string };

export function ErrorNotice({ error, lang }: { error: ApiError; lang: Lang }) {
  return (
    <div className="notice notice-error" role="alert">
      <T k="failed" lang={lang} as="strong" />
      <p>{error.error}</p>
      {error.detail?.length ? (
        <details>
          <summary>
            <T k="details" lang={lang} />
          </summary>
          <pre>{error.detail.join("\n")}</pre>
        </details>
      ) : null}
    </div>
  );
}
