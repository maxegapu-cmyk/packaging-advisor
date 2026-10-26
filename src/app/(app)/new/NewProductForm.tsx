"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bi, T } from "@/components/Bi";
import { ErrorNotice, type ApiError } from "@/components/ErrorNotice";
import { plain, UI, type Lang, type Pair } from "@/lib/i18n";
import type { ModelChoice } from "@/lib/llm/providers";
import { CATEGORIES, CATEGORY_EXAMPLE, CATEGORY_FAMILIES, type Category } from "@/lib/categories";

type Picked = { file: File; url: string; note: string };

const ACCEPT = "image/jpeg,image/png,image/webp,image/heic,image/heif";
const isImage = (f: File) => /^image\//.test(f.type) || /\.(heic|heif)$/i.test(f.name);
const one = (p: Pair, lang: Lang) => (lang === "en" ? p.en : p.zh);

/** A drop zone: drag photos in or click to choose; each photo gets an optional note. */
function PhotoDrop({ id, max, items, setItems, lang, big }: { id: string; max: number; items: Picked[]; setItems: (v: Picked[]) => void; lang: Lang; big?: boolean }) {
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const add = (files: File[]) => setItems([...items, ...files.filter(isImage).map((file) => ({ file, url: URL.createObjectURL(file), note: "" }))].slice(0, max));
  const full = items.length >= max;
  return (
    <div className={big ? "drop is-big" : "drop"}>
      {items.length ? (
        <ul className="drop-thumbs">
          {items.map((it, i) => (
            <li key={it.url} className="drop-thumb">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={it.url} alt="" />
              <input
                type="text"
                aria-label={plain(UI.note, lang)}
                placeholder={one(UI.note, lang)}
                value={it.note}
                maxLength={120}
                onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, note: e.target.value } : x)))}
              />
              <button type="button" className="drop-remove" aria-label={plain(UI.remove, lang)} onClick={() => setItems(items.filter((_, j) => j !== i))}>
                <svg viewBox="0 0 16 16" aria-hidden="true">
                  <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {full ? null : (
        <label
          htmlFor={id}
          className={`drop-zone${over ? " is-over" : ""}${items.length ? " is-more" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setOver(false);
            add(Array.from(e.dataTransfer.files));
          }}
        >
          <svg viewBox="0 0 40 40" aria-hidden="true">
            <rect x="5" y="9" width="30" height="22" rx="3" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="14" cy="17" r="2.6" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <path d="M8 28l8-7 6 5 4-3 7 5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          </svg>
          <Bi p={items.length ? UI.dropMore : UI.dropHere} lang={lang} />
          <input
            ref={input}
            id={id}
            type="file"
            accept={ACCEPT}
            multiple
            className="sr-only"
            onChange={(e) => {
              add(Array.from(e.currentTarget.files ?? []));
              e.currentTarget.value = "";
            }}
          />
        </label>
      )}
    </div>
  );
}

/**
 * Step 1 of 4: the seller's photos and the basics. Photos come first because they are what
 * the directions are built from; everything else is a few words.
 */
export function NewProductForm({ lang, models, onPreview }: { lang: Lang; models: ModelChoice[]; onPreview?: () => void }) {
  const router = useRouter();
  const [products, setProducts] = useState<Picked[]>([]);
  const [refs, setRefs] = useState<Picked[]>([]);
  const [category, setCategory] = useState<Category>("tea");
  const [modelId, setModelId] = useState<number | "">(models[0]?.id ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const chosen = useMemo(() => models.find((m) => m.id === modelId), [models, modelId]);

  useEffect(() => () => [...products, ...refs].forEach((p) => URL.revokeObjectURL(p.url)), []); // eslint-disable-line react-hooks/exhaustive-deps

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    if (products.length === 0) return setError({ error: plain(UI.photosMissing, lang) });
    if (category === "other" && !String(fd.get("itemType") ?? "").trim()) return setError({ error: plain(UI.itemTypeRequired, lang) });
    if (onPreview) return onPreview();
    products.forEach((p) => {
      fd.append("product", p.file);
      fd.append("productNote", p.note);
    });
    refs.forEach((p) => {
      fd.append("reference", p.file);
      fd.append("referenceNote", p.note);
    });
    if (modelId) fd.set("modelId", String(modelId));
    setPending(true);
    try {
      const res = await fetch("/api/projects", { method: "POST", body: fd });
      const json = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      if (!res.ok) {
        setError(json);
        // The project may exist even when generation failed; let the tester retry from it.
        if (json.projectId) router.push(`/p/${json.projectId}?failed=1`);
        return;
      }
      router.push(`/p/${json.projectId}`);
    } catch (err) {
      setError({ error: String((err as Error).message) });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="upload">
      <form className="upload-form" onSubmit={onSubmit} noValidate>
        <section className="upload-sec">
          <h2 className="upload-h">
            <span className="upload-n">1</span>
            <Bi p={UI.secPhotos} lang={lang} />
            <span className="req">{plain(UI.required, lang)}</span>
          </h2>
          <Bi p={UI.photoTips} lang={lang} as="p" className="hint" />
          <PhotoDrop id="product-files" max={2} items={products} setItems={setProducts} lang={lang} big />
          <div className="upload-refs">
            <T k="referencePhotos" lang={lang} as="h3" className="upload-h3" />
            <T k="referencePhotosHint" lang={lang} as="p" className="hint" />
            <PhotoDrop id="reference-files" max={4} items={refs} setItems={setRefs} lang={lang} />
          </div>
        </section>

        <section className="upload-sec">
          <h2 className="upload-h">
            <span className="upload-n">2</span>
            <Bi p={UI.secProduct} lang={lang} />
          </h2>
          <fieldset className="cat-pick">
            <legend className="field-label">
              <T k="category" lang={lang} />
            </legend>
            {CATEGORY_FAMILIES.map((f) => (
              <div key={f.id} className="cat-family">
                <span className="cat-family-label">{one(f.label, lang)}</span>
                <div className="cat-chips">
                  {f.cats.map((c) => (
                    <label key={c} className={category === c ? "cat-chip is-on" : "cat-chip"}>
                      <input type="radio" name="category" value={c} checked={category === c} onChange={() => setCategory(c)} className="sr-only" />
                      {one(CATEGORIES[c], lang)}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </fieldset>
          <div className="field-row">
            <div className="field">
              <label htmlFor="itemType">
                <T k="itemType" lang={lang} />
                {category === "other" ? <span className="req">{plain(UI.required, lang)}</span> : null}
              </label>
              <input id="itemType" name="itemType" type="text" maxLength={40} required={category === "other"} placeholder={one(UI.itemTypeHint, lang)} />
            </div>
            <div className="field">
              <label htmlFor="brand">
                <T k="brand" lang={lang} />
              </label>
              <input id="brand" name="brand" type="text" maxLength={60} placeholder={one(UI.brandHint, lang)} />
            </div>
          </div>
          <div className="field">
            <label htmlFor="title">
              <T k="productName" lang={lang} />
              <span className="req">{plain(UI.required, lang)}</span>
            </label>
            <input id="title" name="title" type="text" required maxLength={80} placeholder={one(CATEGORY_EXAMPLE[category], lang)} />
          </div>
        </section>

        <section className="upload-sec">
          <h2 className="upload-h">
            <span className="upload-n">3</span>
            <Bi p={UI.secNotes} lang={lang} />
          </h2>
          <div className="field">
            <label htmlFor="description">
              <T k="description" lang={lang} />
            </label>
            <textarea id="description" name="description" maxLength={2000} />
            <T k="descriptionHint" lang={lang} as="span" className="hint" />
          </div>
          <div className="field">
            <label htmlFor="mustText">
              <T k="mustText" lang={lang} />
            </label>
            <textarea id="mustText" name="mustText" maxLength={2000} className="short" />
            <T k="mustTextHint" lang={lang} as="span" className="hint" />
          </div>
          {models.length > 1 ? (
            <div className="field">
              <label htmlFor="model">
                <T k="model" lang={lang} />
              </label>
              <select id="model" value={modelId} onChange={(e) => setModelId(Number(e.target.value))}>
                {models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.providerName}: {m.label}
                  </option>
                ))}
              </select>
              {chosen && !chosen.vision ? <T k="modelNoVision" lang={lang} as="span" className="hint" /> : null}
            </div>
          ) : null}
        </section>

        {error ? <ErrorNotice error={error} lang={lang} /> : null}
        <div className="upload-submit">
          <button className="btn btn-primary btn-large" type="submit" disabled={pending || (!onPreview && models.length === 0)}>
            <T k="generate" lang={lang} />
          </button>
          {pending ? <T k="generating" lang={lang} as="p" className="hint" /> : null}
        </div>
      </form>

      <aside className="upload-aside">
        <T k="whatNext" lang={lang} as="h2" className="upload-aside-h" />
        <ol className="upload-next">
          <li>
            <Bi p={UI.step2} lang={lang} className="upload-next-t" />
            <Bi p={UI.whatNext2} lang={lang} as="p" />
          </li>
          <li>
            <Bi p={UI.step3} lang={lang} className="upload-next-t" />
            <Bi p={UI.whatNext3} lang={lang} as="p" />
          </li>
          <li>
            <Bi p={UI.step4} lang={lang} className="upload-next-t" />
            <Bi p={UI.whatNext4} lang={lang} as="p" />
          </li>
        </ol>
        <Bi p={UI.privacy} lang={lang} as="p" className="hint" />
      </aside>
    </div>
  );
}
