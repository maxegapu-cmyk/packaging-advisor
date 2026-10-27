import { setLangAction } from "@/app/actions";
import type { Lang } from "@/lib/i18n";
import { SegPill } from "./SegPill";

/** Display-language switch: Chinese (default) or English. Works without JavaScript. */
export function LangSwitch({ lang, back }: { lang: Lang; back: string }) {
  const options: { v: Lang; label: string }[] = [
    { v: "zh", label: "中文" },
    { v: "en", label: "EN" },
  ];
  return (
    <form action={setLangAction} className="lang-switch seg" aria-label="语言 Language">
      <input type="hidden" name="back" value={back} />
      <SegPill />
      {options.map((o) => (
        <button key={o.v} name="lang" value={o.v} aria-pressed={lang === o.v} type="submit">
          {o.label}
        </button>
      ))}
    </form>
  );
}
