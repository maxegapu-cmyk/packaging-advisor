"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Bi, T } from "@/components/Bi";
import { ErrorNotice, type ApiError } from "@/components/ErrorNotice";
import { plain, UI, type Lang } from "@/lib/i18n";
import type { ModelChoice } from "@/lib/llm/providers";
import { CATEGORIES } from "@/lib/categories";

type Picked = { file: File; url: string; note: string };

function ImagePicker({ name, max, items, setItems, lang, label, hint, required }: {
  name: string; max: number; items: Picked[]; setItems: (v: Picked[]) => void; lang: Lang; label: keyof typeof UI; hint: keyof typeof UI; required?: boolean;
}) {
  return (
    <div className="field">
      <label htmlFor={name}>
        <T k={label} lang={lang} />
        {required ? <span className="req">{plain(UI.required, lang)}</span> : null}
      </label>
      <div className="dropzone">
        <T k={hint} lang={lang} as="span" className="hint" />
        <input
          id={name}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          multiple
          onChange={(e) => {
            const input = e.currentTarget as HTMLInputElement;
            const files: File[] = Array.from(input.files ?? []);
            const next = [...items, ...files.map((file) => ({ file, url: URL.createObjectURL(file), note: "" }))].slice(0, max);
            setItems(next);
            input.value = "";
          }}
          disabled={items.length >= max}
        />
        {items.length ? (
          <div className="thumbs">
            {items.map((it, i) => (
              <div className="thumb" key={it.url}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={it.url} alt="" />
                <input
                  type="text"
                  aria-label="备注 Note"
                  placeholder="备注 Note"
                  value={it.note}
                  onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, note: e.target.value } : x)))}
                />
                <button type="button" className="btn btn-small btn-quiet" onClick={() => setItems(items.filter((_, j) => j !== i))}>
                  移除 Remove
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function NewProductForm({ lang, models }: { lang: Lang; models: ModelChoice[] }) {
  const router = useRouter();
  const [products, setProducts] = useState<Picked[]>([]);
  const [refs, setRefs] = useState<Picked[]>([]);
  const [modelId, setModelId] = useState<number | "">(models[0]?.id ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const chosen = useMemo(() => models.find((m) => m.id === modelId), [models, modelId]);

  useEffect(() => () => [...products, ...refs].forEach((p) => URL.revokeObjectURL(p.url)), []); // eslint-disable-line react-hooks/exhaustive-deps

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
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
    <form className="form form-card" onSubmit={onSubmit}>
      <div className="field">
        <label htmlFor="title">
          <T k="productName" lang={lang} />
          <span className="req">{plain(UI.required, lang)}</span>
        </label>
        <input id="title" name="title" type="text" required maxLength={80} placeholder={plain(UI.productNameHint, lang)} />
      </div>

      <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="field-label" style={{ fontWeight: 600, marginBottom: 6 }}>
          <T k="category" lang={lang} />
        </legend>
        <div className="radio-row">
          {Object.entries(CATEGORIES).map(([value, p], i) => (
            <label key={value}>
              <input type="radio" name="category" value={value} defaultChecked={i === 0} />
              <Bi p={p} lang={lang} />
            </label>
          ))}
        </div>
      </fieldset>

      <div className="field">
        <label htmlFor="brand">
          <T k="brand" lang={lang} />
        </label>
        <input id="brand" name="brand" type="text" maxLength={60} placeholder={plain(UI.brandHint, lang)} />
      </div>

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
        <textarea id="mustText" name="mustText" maxLength={2000} style={{ minHeight: 70 }} />
        <T k="mustTextHint" lang={lang} as="span" className="hint" />
      </div>

      <ImagePicker name="product-files" max={2} items={products} setItems={setProducts} lang={lang} label="productPhotos" hint="productPhotosHint" required />
      <ImagePicker name="reference-files" max={4} items={refs} setItems={setRefs} lang={lang} label="referencePhotos" hint="referencePhotosHint" />

      {models.length > 1 ? (
        <div className="field">
          <label htmlFor="model">
            <T k="model" lang={lang} />
          </label>
          <select id="model" value={modelId} onChange={(e) => setModelId(Number(e.target.value))}>
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.providerName} · {m.label}
              </option>
            ))}
          </select>
          {chosen && !chosen.vision ? <T k="modelNoVision" lang={lang} as="span" className="hint" /> : null}
        </div>
      ) : null}

      {error ? <ErrorNotice error={error} lang={lang} /> : null}

      <div>
        <button className="btn btn-primary" type="submit" disabled={pending || products.length === 0 || models.length === 0}>
          <T k="generate" lang={lang} />
        </button>
        {pending ? <T k="generating" lang={lang} as="p" className="hint" /> : null}
      </div>
    </form>
  );
}
