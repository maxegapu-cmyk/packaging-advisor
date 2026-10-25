export type ChatPart = { type: "text"; text: string } | { type: "image"; mime: string; base64: string };

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string | ChatPart[] };

export type LlmTask = "generate" | "revise";

export type LlmRequest = {
  model: string;
  messages: ChatMessage[];
  maxTokens?: number;
  temperature?: number;
  /** Lets the offline demo provider answer realistically. Real providers ignore it. */
  task?: LlmTask;
};

export type LlmResult = { text: string; inputTokens?: number; outputTokens?: number };

export type ProviderKind = "openai" | "anthropic" | "demo";

export type ProviderConfig = { id: string; name: string; kind: ProviderKind; baseUrl: string; apiKey: string };

export interface LlmClient {
  complete(req: LlmRequest, signal?: AbortSignal): Promise<LlmResult>;
  listModels(signal?: AbortSignal): Promise<string[]>;
}

export class LlmError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly retryable = false,
  ) {
    super(message);
  }
}

export function timeoutSignal(outer?: AbortSignal): AbortSignal {
  const ms = Number(process.env.LLM_TIMEOUT_MS || 240_000);
  const t = AbortSignal.timeout(ms);
  return outer ? AbortSignal.any([outer, t]) : t;
}

export function joinUrl(base: string, p: string): string {
  return `${base.replace(/\/+$/, "")}/${p.replace(/^\/+/, "")}`;
}

/** Shorten provider error bodies so nothing sensitive or huge reaches the UI or logs. */
export function snippet(body: string, max = 300): string {
  const s = body.replace(/\s+/g, " ").trim();
  return s.length > max ? `${s.slice(0, max)}…` : s;
}
