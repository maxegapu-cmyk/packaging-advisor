import type { Lang, Pair } from "@/lib/i18n";
import { UI, type UiKey } from "@/lib/i18n";

/** Text in the reader's language: Chinese, or English (falling back to Chinese where a text has none). */
export function Bi({ p, lang, as: Tag = "span", className }: { p: Pair; lang: Lang; as?: "span" | "p" | "div" | "h1" | "h2" | "h3" | "h4" | "strong" | "label" | "dd" | "dt" | "li"; className?: string }) {
  if (lang === "en" && p.en) return <Tag className={className} lang="en">{p.en}</Tag>;
  return <Tag className={className} lang="zh-CN">{p.zh}</Tag>;
}

/** Interface label from the UI dictionary. */
export function T({ k, lang, as, className }: { k: UiKey; lang: Lang; as?: Parameters<typeof Bi>[0]["as"]; className?: string }) {
  return <Bi p={UI[k]} lang={lang} as={as} className={className} />;
}
