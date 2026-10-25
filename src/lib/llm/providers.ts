/**
 * Model platforms are configured by the admin in the web UI: a platform = protocol + base URL +
 * API key; each platform exposes one or more models. Testers pick any enabled model per board.
 * API keys are stored encrypted (AES-256-GCM with APP_SECRET) and never sent to the browser.
 */
import { getDb, now } from "../db";
import { decrypt, encrypt, maskKey, randomId } from "../crypto";
import { anthropicClient } from "./anthropic";
import { DEMO_MODEL, demoClient } from "./demo";
import { openAiClient } from "./openai";
import { LlmError, type LlmClient, type ProviderConfig, type ProviderKind } from "./types";

export const PROVIDER_KINDS: ProviderKind[] = ["openai", "anthropic", "demo"];

/**
 * Starting points for common platforms. Base URLs change from time to time:
 * confirm each one against the platform's own documentation before saving.
 */
export const PRESETS: { name: string; kind: ProviderKind; baseUrl: string }[] = [
  { name: "硅基流动 SiliconFlow", kind: "openai", baseUrl: "https://api.siliconflow.cn/v1" },
  { name: "阿里云百炼 Alibaba Bailian (DashScope)", kind: "openai", baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1" },
  { name: "DeepSeek", kind: "openai", baseUrl: "https://api.deepseek.com/v1" },
  { name: "月之暗面 Moonshot (Kimi)", kind: "openai", baseUrl: "https://api.moonshot.cn/v1" },
  { name: "智谱 Zhipu (GLM)", kind: "openai", baseUrl: "https://open.bigmodel.cn/api/paas/v4" },
  { name: "火山方舟 Volcengine Ark", kind: "openai", baseUrl: "https://ark.cn-beijing.volces.com/api/v3" },
  { name: "OpenRouter", kind: "openai", baseUrl: "https://openrouter.ai/api/v1" },
  { name: "OpenAI", kind: "openai", baseUrl: "https://api.openai.com/v1" },
  { name: "Anthropic", kind: "anthropic", baseUrl: "https://api.anthropic.com" },
  { name: "自建 / 其他兼容接口 Self-hosted or other compatible", kind: "openai", baseUrl: "http://localhost:11434/v1" },
];

export type ProviderView = { id: string; name: string; kind: ProviderKind; baseUrl: string; keyHint: string; enabled: boolean; models: ModelView[] };
export type ModelView = { id: number; providerId: string; model: string; label: string; vision: boolean; enabled: boolean; isDefault: boolean };
/** What testers see when choosing a model: no keys, no URLs. */
export type ModelChoice = { id: number; label: string; providerName: string; vision: boolean; isDefault: boolean };

type ProviderRow = { id: string; name: string; kind: ProviderKind; base_url: string; api_key_enc: string; enabled: number };
type ModelRow = { id: number; provider_id: string; model: string; label: string; vision: number; enabled: number; is_default: number };

const toModel = (r: ModelRow): ModelView => ({ id: r.id, providerId: r.provider_id, model: r.model, label: r.label, vision: !!r.vision, enabled: !!r.enabled, isDefault: !!r.is_default });

function validBaseUrl(kind: ProviderKind, url: string): string {
  if (kind === "demo") return "";
  let u: URL;
  try {
    u = new URL(url.trim());
  } catch {
    throw new Error("接口地址无效 The base URL is not a valid URL");
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") throw new Error("接口地址需以 http(s) 开头 The base URL must start with http(s)");
  return u.toString().replace(/\/+$/, "");
}

/** Seed the offline demo platform once, so a fresh install works without any key. */
export function ensureDemoProvider() {
  if (process.env.DEMO_PROVIDER === "off") return;
  const db = getDb();
  const has = db.prepare("SELECT 1 FROM providers WHERE kind = 'demo'").get();
  if (has) return;
  db.prepare("INSERT INTO providers (id, name, kind, base_url, api_key_enc, enabled, created_at) VALUES ('demo', ?, 'demo', '', '', 1, ?)").run("演示（离线）Demo (offline)", now());
  db.prepare("INSERT INTO models (provider_id, model, label, vision, enabled, is_default) VALUES ('demo', ?, ?, 1, 1, 1)").run(DEMO_MODEL, "演示模型 Demo model");
}

export function listProviders(): ProviderView[] {
  const db = getDb();
  const providers = db.prepare("SELECT * FROM providers ORDER BY created_at").all() as ProviderRow[];
  const models = (db.prepare("SELECT * FROM models ORDER BY id").all() as ModelRow[]).map(toModel);
  return providers.map((p) => {
    let keyHint = "";
    try {
      keyHint = maskKey(decrypt(p.api_key_enc));
    } catch {
      keyHint = "⚠";
    }
    return { id: p.id, name: p.name, kind: p.kind, baseUrl: p.base_url, keyHint, enabled: !!p.enabled, models: models.filter((m) => m.providerId === p.id) };
  });
}

export function saveProvider(input: { id?: string; name: string; kind: ProviderKind; baseUrl: string; apiKey?: string; enabled?: boolean }): string {
  const db = getDb();
  if (!PROVIDER_KINDS.includes(input.kind) || input.kind === "demo") throw new Error("不支持的接口类型 Unsupported protocol");
  const name = input.name.trim().slice(0, 80);
  if (!name) throw new Error("请填写平台名称 Enter a platform name");
  const baseUrl = validBaseUrl(input.kind, input.baseUrl);
  if (input.id) {
    const existing = db.prepare("SELECT * FROM providers WHERE id = ?").get(input.id) as ProviderRow | undefined;
    if (!existing || existing.kind === "demo") throw new Error("找不到该平台 Platform not found");
    // An empty key field means "keep the stored key".
    const keyEnc = input.apiKey?.trim() ? encrypt(input.apiKey.trim()) : existing.api_key_enc;
    db.prepare("UPDATE providers SET name = ?, kind = ?, base_url = ?, api_key_enc = ?, enabled = ? WHERE id = ?").run(name, input.kind, baseUrl, keyEnc, input.enabled === false ? 0 : 1, input.id);
    return input.id;
  }
  const id = randomId();
  db.prepare("INSERT INTO providers (id, name, kind, base_url, api_key_enc, enabled, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").run(
    id, name, input.kind, baseUrl, encrypt(input.apiKey?.trim() ?? ""), input.enabled === false ? 0 : 1, now(),
  );
  return id;
}

export function setProviderEnabled(id: string, enabled: boolean) {
  getDb().prepare("UPDATE providers SET enabled = ? WHERE id = ?").run(enabled ? 1 : 0, id);
}

export function deleteProvider(id: string) {
  const db = getDb();
  db.prepare("DELETE FROM models WHERE provider_id = ?").run(id);
  db.prepare("DELETE FROM providers WHERE id = ?").run(id);
}

export function addModel(input: { providerId: string; model: string; label?: string; vision?: boolean }) {
  const model = input.model.trim().slice(0, 120);
  if (!model) throw new Error("请填写模型 ID Enter a model ID");
  const label = (input.label?.trim() || model).slice(0, 80);
  getDb()
    .prepare("INSERT INTO models (provider_id, model, label, vision) VALUES (?, ?, ?, ?) ON CONFLICT(provider_id, model) DO UPDATE SET label = excluded.label, vision = excluded.vision")
    .run(input.providerId, model, label, input.vision ? 1 : 0);
}

export function updateModel(id: number, patch: { enabled?: boolean; vision?: boolean; label?: string }) {
  const db = getDb();
  if (patch.enabled !== undefined) db.prepare("UPDATE models SET enabled = ? WHERE id = ?").run(patch.enabled ? 1 : 0, id);
  if (patch.vision !== undefined) db.prepare("UPDATE models SET vision = ? WHERE id = ?").run(patch.vision ? 1 : 0, id);
  if (patch.label?.trim()) db.prepare("UPDATE models SET label = ? WHERE id = ?").run(patch.label.trim().slice(0, 80), id);
}

export function deleteModel(id: number) {
  getDb().prepare("DELETE FROM models WHERE id = ?").run(id);
}

export function setDefaultModel(id: number) {
  const db = getDb();
  db.exec("UPDATE models SET is_default = 0");
  db.prepare("UPDATE models SET is_default = 1, enabled = 1 WHERE id = ?").run(id);
}

export function listModelChoices(): ModelChoice[] {
  const rows = getDb()
    .prepare(
      `SELECT m.*, p.name AS provider_name FROM models m JOIN providers p ON p.id = m.provider_id
       WHERE m.enabled = 1 AND p.enabled = 1 ORDER BY m.is_default DESC, p.created_at, m.id`,
    )
    .all() as (ModelRow & { provider_name: string })[];
  return rows.map((r) => ({ id: r.id, label: r.label, providerName: r.provider_name, vision: !!r.vision, isDefault: !!r.is_default }));
}

function clientFor(cfg: ProviderConfig): LlmClient {
  switch (cfg.kind) {
    case "openai":
      return openAiClient(cfg);
    case "anthropic":
      return anthropicClient(cfg);
    case "demo":
      return demoClient();
  }
}

export type ResolvedModel = { client: LlmClient; model: string; label: string; vision: boolean; providerName: string };

/** Resolve a model chosen by a tester (or the default) into a ready client. */
export function resolveModel(modelId?: number | null): ResolvedModel {
  const db = getDb();
  const row = (
    modelId
      ? db.prepare(`SELECT m.*, p.name AS pname, p.kind, p.base_url, p.api_key_enc FROM models m JOIN providers p ON p.id = m.provider_id WHERE m.id = ? AND m.enabled = 1 AND p.enabled = 1`).get(modelId)
      : db.prepare(`SELECT m.*, p.name AS pname, p.kind, p.base_url, p.api_key_enc FROM models m JOIN providers p ON p.id = m.provider_id WHERE m.enabled = 1 AND p.enabled = 1 ORDER BY m.is_default DESC, m.id LIMIT 1`).get()
  ) as (ModelRow & { pname: string; kind: ProviderKind; base_url: string; api_key_enc: string }) | undefined;
  if (!row) throw new LlmError("没有可用的模型，请联系管理员配置 No model is available; ask the admin to set one up");
  const cfg: ProviderConfig = { id: row.provider_id, name: row.pname, kind: row.kind, baseUrl: row.base_url, apiKey: decrypt(row.api_key_enc) };
  return { client: clientFor(cfg), model: row.model, label: `${row.pname} · ${row.label}`, vision: !!row.vision, providerName: row.pname };
}

/** Admin helpers: test a platform and fetch its model list using the stored key. */
export function providerClient(id: string): LlmClient {
  const row = getDb().prepare("SELECT * FROM providers WHERE id = ?").get(id) as ProviderRow | undefined;
  if (!row) throw new Error("找不到该平台 Platform not found");
  return clientFor({ id: row.id, name: row.name, kind: row.kind, baseUrl: row.base_url, apiKey: decrypt(row.api_key_enc) });
}
