import { CATEGORIES, type Category } from "@/lib/categories";
import { CATEGORY_PACK } from "@/lib/pack";
import type { Lang, Pair } from "@/lib/i18n";
import { plain, UI } from "@/lib/i18n";
import { Bi } from "./Bi";
import { Journey, journeyOf } from "./Journey";
import { FormGlyph } from "./pack/FormGlyph";

export type ProductItem = {
  id: string;
  title: string;
  category: Category;
  itemType: string;
  brand: string;
  createdAt: string;
  boardCount: number;
  picked: string | null;
  handedOff: boolean;
  thumbUrl: string | null;
};

const NEXT: Pair[] = [UI.nextGenerate, UI.cardPick, UI.cardSpace, UI.nextHandoff];

/**
 * The seller's products, each with where it is in the four steps and what to do next.
 * With none yet, the four steps themselves explain what uploading leads to.
 */
export function ProductList({ items, lang, newHref = "/new", productHref = (id: string) => `/p/${id}` }: { items: ProductItem[]; lang: Lang; newHref?: string; productHref?: (id: string) => string }) {
  if (items.length === 0)
    return (
      <div className="plist-empty">
        <Journey steps={journeyOf({ boards: 0, picked: false, handedOff: false }).map((state) => ({ state }))} lang={lang} />
        <Bi p={UI.noProducts} lang={lang} as="p" className="plist-empty-text" />
        <a className="btn btn-primary btn-large" href={newHref}>
          <Bi p={UI.newProduct} lang={lang} />
        </a>
      </div>
    );
  return (
    <ul className="plist">
      {items.map((p) => {
        const steps = journeyOf({ boards: p.boardCount, picked: !!p.picked, handedOff: p.handedOff });
        const at = steps.indexOf("current");
        const next = at === -1 ? UI.nextDone : NEXT[at];
        return (
          <li key={p.id}>
            <a className="pcard" href={productHref(p.id)}>
              <span className="pcard-thumb">
                {p.thumbUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.thumbUrl} alt="" />
                ) : (
                  <FormGlyph form={CATEGORY_PACK[p.category].form} />
                )}
              </span>
              <span className="pcard-body">
                <span className="pcard-title">{p.title}</span>
                <span className="pcard-meta">
                  <Bi p={CATEGORIES[p.category]} lang={lang} className="tag" />
                  {p.itemType ? <span>{p.itemType}</span> : null}
                  {p.brand ? <span>{p.brand}</span> : null}
                  <span>{new Date(p.createdAt).toLocaleDateString(lang === "en" ? "en-GB" : "zh-CN")}</span>
                </span>
                <span className="pcard-progress" role="img" aria-label={`${plain(UI.journey, lang)}: ${steps.filter((s) => s === "done").length} / 4`}>
                  {steps.map((s, i) => (
                    <i key={i} className={`is-${s}`} />
                  ))}
                </span>
                <span className="pcard-next">
                  {at === -1 ? null : <span className="pcard-next-label">{lang === "en" ? UI.next.en : UI.next.zh}</span>}
                  <Bi p={next} lang={lang} />
                  {p.picked ? <span className="tag tag-ink">{lang === "en" ? UI.picked.en : UI.picked.zh} {p.picked}</span> : null}
                </span>
              </span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}
