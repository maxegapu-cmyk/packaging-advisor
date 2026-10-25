/** Anthropic Messages API client (also works with gateways that expose the same protocol). */
import { joinUrl, LlmError, snippet, timeoutSignal, type ChatMessage, type LlmClient, type LlmRequest, type ProviderConfig } from "./types";

function toAnthropicContent(content: ChatMessage["content"]) {
  if (typeof content === "string") return [{ type: "text", text: content }];
  return content.map((p) =>
    p.type === "text" ? { type: "text", text: p.text } : { type: "image", source: { type: "base64", media_type: p.mime, data: p.base64 } },
  );
}

export function buildAnthropicBody(req: LlmRequest) {
  const system = req.messages
    .filter((m) => m.role === "system")
    .map((m) => (typeof m.content === "string" ? m.content : m.content.map((p) => (p.type === "text" ? p.text : "")).join("\n")))
    .join("\n\n");
  return {
    model: req.model,
    max_tokens: req.maxTokens ?? 8000,
    temperature: req.temperature ?? 0.7,
    ...(system ? { system } : {}),
    messages: req.messages.filter((m) => m.role !== "system").map((m) => ({ role: m.role, content: toAnthropicContent(m.content) })),
  };
}

export function anthropicClient(cfg: ProviderConfig, fetchImpl: typeof fetch = fetch): LlmClient {
  const base = cfg.baseUrl || "https://api.anthropic.com";
  const headers = { "content-type": "application/json", "x-api-key": cfg.apiKey, "anthropic-version": "2023-06-01" };
  return {
    async complete(req, signal) {
      let res: Response;
      try {
        res = await fetchImpl(joinUrl(base, "v1/messages"), { method: "POST", headers, body: JSON.stringify(buildAnthropicBody(req)), signal: timeoutSignal(signal) });
      } catch (e) {
        throw new LlmError(`无法连接模型平台 Could not reach ${cfg.name}: ${(e as Error).message}`, undefined, true);
      }
      const body = await res.text();
      if (!res.ok) throw new LlmError(`${cfg.name} 返回 ${res.status} returned ${res.status}: ${snippet(body)}`, res.status, res.status === 429 || res.status >= 500);
      const json = JSON.parse(body);
      const text = (json?.content ?? []).filter((b: any) => b?.type === "text").map((b: any) => b.text).join("");
      if (!text.trim()) throw new LlmError(`${cfg.name} 没有返回文本 returned no text`, undefined, true);
      return { text, inputTokens: json?.usage?.input_tokens, outputTokens: json?.usage?.output_tokens };
    },
    async listModels(signal) {
      const res = await fetchImpl(joinUrl(base, "v1/models?limit=100"), { headers, signal: timeoutSignal(signal) });
      const body = await res.text();
      if (!res.ok) throw new LlmError(`${cfg.name} 返回 ${res.status} returned ${res.status}: ${snippet(body)}`, res.status);
      return (JSON.parse(body)?.data ?? []).map((m: any) => m?.id).filter((x: unknown): x is string => typeof x === "string");
    },
  };
}
