"use client";

import { useState } from "react";
import type { ProviderKind } from "@/lib/llm/types";
import { addModelAction } from "../actions";

type Preset = { name: string; kind: ProviderKind; baseUrl: string };

export function ProviderFields({ presets, initial, editing }: { presets: Preset[]; initial?: { name: string; kind: ProviderKind; baseUrl: string }; editing?: boolean }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [kind, setKind] = useState<ProviderKind>(initial?.kind ?? "openai");
  const [baseUrl, setBaseUrl] = useState(initial?.baseUrl ?? "");
  return (
    <>
      {presets.length ? (
        <label className="field">
          <span className="label">从常用平台开始 Start from a common platform</span>
          <select
            defaultValue=""
            onChange={(e) => {
              const p = presets[Number(e.target.value)];
              if (!p) return;
              setName(p.name);
              setKind(p.kind);
              setBaseUrl(p.baseUrl);
            }}
          >
            <option value="">— 自定义 Custom —</option>
            {presets.map((p, i) => (
              <option key={p.name} value={i}>
                {p.name}
              </option>
            ))}
          </select>
          <span className="hint">接口地址请以平台官方文档为准。 Confirm the base URL in the platform&apos;s own docs.</span>
        </label>
      ) : null}
      <div className="inline-form">
        <label className="field">
          <span className="label">平台名称 Name</span>
          <input type="text" name="name" required value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="field">
          <span className="label">接口协议 Protocol</span>
          <select name="kind" value={kind} onChange={(e) => setKind(e.target.value as ProviderKind)}>
            <option value="openai">OpenAI 兼容 OpenAI-compatible</option>
            <option value="anthropic">Anthropic</option>
          </select>
        </label>
      </div>
      <label className="field">
        <span className="label">接口地址 Base URL</span>
        <input type="url" name="baseUrl" required value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://…/v1" />
      </label>
      <label className="field">
        <span className="label">API Key</span>
        <input type="password" name="apiKey" autoComplete="off" placeholder={editing ? "留空则保留原 Key Leave empty to keep the current key" : "sk-…"} />
      </label>
    </>
  );
}

/** Fetch the platform's model list and add models with one click. */
export function FetchModels({ providerId }: { providerId: string }) {
  const [models, setModels] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [pending, setPending] = useState(false);
  return (
    <div className="form" style={{ gap: 8 }}>
      <div>
        <button
          type="button"
          className="btn btn-small btn-quiet"
          disabled={pending}
          onClick={async () => {
            setPending(true);
            setError(null);
            const res = await fetch(`/api/admin/providers/${providerId}/models`);
            const json = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
            setPending(false);
            if (!res.ok) return setError(json.error);
            setModels(json.models);
          }}
        >
          从平台获取模型列表 Fetch model list
        </button>
      </div>
      {error ? <p className="notice notice-error">{error}</p> : null}
      {models ? (
        <>
          <input type="text" placeholder="筛选 Filter" value={filter} onChange={(e) => setFilter(e.target.value)} />
          <div style={{ maxHeight: 260, overflowY: "auto", display: "grid", gap: 4 }}>
            {models
              .filter((m) => m.toLowerCase().includes(filter.toLowerCase()))
              .slice(0, 200)
              .map((m) => (
                <form key={m} action={addModelAction} className="inline-form" style={{ alignItems: "center" }}>
                  <input type="hidden" name="providerId" value={providerId} />
                  <input type="hidden" name="model" value={m} />
                  <code style={{ flex: 1 }}>{m}</code>
                  <label className="check">
                    <input type="checkbox" name="vision" /> 能看图 Vision
                  </label>
                  <button className="btn btn-small" type="submit">
                    添加 Add
                  </button>
                </form>
              ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
