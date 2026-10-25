import type { Lang, Pair } from "@/lib/i18n";
import { UI, type UiKey } from "@/lib/i18n";

/** Bilingual text: Chinese first, English beneath (or one language when the reader chose so). */
export function Bi({ p, lang, as: Tag = "span", className }: { p: Pair; lang: Lang; as?: "span" | "p" | "div" | "h1" | "h2" | "h3" | "h4" | "strong" | "label" | "dd" | "dt" | "li"; className?: string }) {
  if (lang === "zh") return <Tag className={className} lang="zh-CN">{p.zh}</Tag>;
  if (lang === "en") return <Tag className={className} lang="en">{p.en || p.zh}</Tag>;
  const showEn = p.en && p.en !== p.zh;
  return (
    <Tag className={className ? `${className} bi` : "bi"}>
      <span className="bi-zh" lang="zh-CN">{p.zh}</span>
      {showEn ? <span className="bi-en" lang="en">{p.en}</span> : null}
    </Tag>
  );
}

/** Interface label from the UI dictionary. */
export function T({ k, lang, as, className }: { k: UiKey; lang: Lang; as?: Parameters<typeof Bi>[0]["as"]; className?: string }) {
  return <Bi p={UI[k]} lang={lang} as={as} className={className} />;
}
