"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bi, T } from "@/components/Bi";
import { ErrorNotice, type ApiError } from "@/components/ErrorNotice";
import { DIMENSION_LABELS, DIMENSIONS, type Dimension } from "@/lib/board/revise";
import { plain, UI, type Lang } from "@/lib/i18n";
import type { ModelChoice } from "@/lib/llm/providers";

function ModelSelect({ models, value, onChange, lang }: { models: ModelChoice[]; value: number | ""; onChange: (v: number) => void; lang: Lang }) {
  if (models.length < 2) return null;
  return (
    <label className="field">
      <T k="model" lang={lang} className="label" />
      <select value={value} onChange={(e) => onChange(Number(e.target.value))}>
        {models.map((m) => (
          <option key={m.id} value={m.id}>
            {m.providerName} · {m.label}
          </option>
        ))}
      </select>
    </label>
  );
}

async function postJson(url: string, body: unknown): Promise<{ ok: true; data: any } | { ok: false; error: ApiError }> {
  try {
    const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    return res.ok ? { ok: true, data } : { ok: false, error: data };
  } catch (e) {
    return { ok: false, error: { error: String((e as Error).message) } };
  }
}

export function ReviseForm({ projectId, boardId, directionId, lang, models }: { projectId: string; boardId: string; directionId: string; lang: Lang; models: ModelChoice[] }) {
  const router = useRouter();
  const [dimension, setDimension] = useState<Dimension>("color");
  const [feedback, setFeedback] = useState("");
  const [modelId, setModelId] = useState<number | "">(models[0]?.id ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  return (
    <details className="revise-form">
      <summary>
        <T k="revise" lang={lang} />
      </summary>
      <form
        className="form"
        style={{ gap: 12, marginTop: 10 }}
        onSubmit={async (e) => {
          e.preventDefault();
          setPending(true);
          setError(null);
          const r = await postJson(`/api/boards/${boardId}/revise`, { directionId, dimension, feedback, modelId: modelId || null });
          setPending(false);
          if (!r.ok) return setError(r.error);
          router.push(`/p/${projectId}?v=${r.data.boardId}`);
          router.refresh();
        }}
      >
        <T k="reviseHelp" lang={lang} as="p" className="hint" />
        <fieldset className="radio-row" style={{ border: 0, padding: 0, margin: 0 }} aria-label={plain(UI.dimension, lang)}>
          {DIMENSIONS.map((d) => (
            <label key={d}>
              <input type="radio" name={`dim-${directionId}`} value={d} checked={dimension === d} onChange={() => setDimension(d)} />
              <Bi p={DIMENSION_LABELS[d]} lang={lang} />
            </label>
          ))}
        </fieldset>
        <label className="field">
          <T k="feedback" lang={lang} className="label" />
          <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} maxLength={1000} placeholder={plain(UI.feedbackHint, lang)} style={{ minHeight: 70 }} />
        </label>
        <ModelSelect models={models} value={modelId} onChange={setModelId} lang={lang} />
        {error ? <ErrorNotice error={error} lang={lang} /> : null}
        <div>
          <button className="btn" type="submit" disabled={pending}>
            <T k={pending ? "revising" : "applyRevision"} lang={lang} />
          </button>
        </div>
      </form>
    </details>
  );
}

export function RegenerateButton({ projectId, lang, models, primary }: { projectId: string; lang: Lang; models: ModelChoice[]; primary?: boolean }) {
  const router = useRouter();
  const [modelId, setModelId] = useState<number | "">(models[0]?.id ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  return (
    <div className="form" style={{ gap: 10 }}>
      <div className="toolbar">
        <ModelSelect models={models} value={modelId} onChange={setModelId} lang={lang} />
        <button
          type="button"
          className={primary ? "btn btn-primary" : "btn btn-quiet"}
          disabled={pending}
          onClick={async () => {
            setPending(true);
            setError(null);
            const r = await postJson(`/api/projects/${projectId}/generate`, { modelId: modelId || null });
            setPending(false);
            if (!r.ok) return setError(r.error);
            router.push(`/p/${projectId}?v=${r.data.boardId}`);
            router.refresh();
          }}
        >
          <T k="regenerate" lang={lang} />
        </button>
      </div>
      {pending ? <T k="generating" lang={lang} as="p" className="hint" /> : null}
      {error ? <ErrorNotice error={error} lang={lang} /> : null}
    </div>
  );
}
