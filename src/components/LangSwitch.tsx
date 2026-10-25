import { setLangAction } from "@/app/actions";
import type { Lang } from "@/lib/i18n";

/** Display-language switch: bilingual (default), Chinese only, English only. Works without JavaScript. */
export function LangSwitch({ lang, back }: { lang: Lang; back: string }) {
  const options: { v: Lang; label: string }[] = [
    { v: "bi", label: "中英" },
    { v: "zh", label: "中文" },
    { v: "en", label: "EN" },
  ];
  return (
    <form action={setLangAction} className="lang-switch" aria-label="语言 Language">
      <input type="hidden" name="back" value={back} />
      {options.map((o) => (
        <button key={o.v} name="lang" value={o.v} aria-pressed={lang === o.v} type="submit">
          {o.label}
        </button>
      ))}
    </form>
  );
}
