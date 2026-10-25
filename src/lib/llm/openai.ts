/**
 * OpenAI-compatible Chat Completions client. Most open model platforms speak this protocol
 * (SiliconFlow, Alibaba Bailian/DashScope compatible mode, DeepSeek, Moonshot, Zhipu,
 * Volcengine Ark, OpenRouter, OpenAI and self-hosted vLLM/Ollama), so one adapter covers them.
 */
import { joinUrl, LlmError, snippet, timeoutSignal, type ChatMessage, type LlmClient, type LlmRequest, type ProviderConfig } from "./types";

function toOpenAiContent(content: ChatMessage["content"]) {
  if (typeof content === "string") return content;
  return content.map((p) =>
    p.type === "text" ? { type: "text", text: p.text } : { type: "image_url", image_url: { url: `data:${p.mime};base64,${p.base64}` } },
  );
}

export function buildOpenAiBody(req: LlmRequest) {
  return {
    model: req.model,
    messages: req.messages.map((m) => ({ role: m.role, content: toOpenAiContent(m.content) })),
    max_tokens: req.maxTokens ?? 8000,
    temperature: req.temperature ?? 0.7,
    stream: false,
  };
}

export function openAiClient(cfg: ProviderConfig, fetchImpl: typeof fetch = fetch): LlmClient {
  const headers = () => {
    const h: Record<string, string> = { "content-type": "application/json" };
    if (cfg.apiKey) h.authorization = `Bearer ${cfg.apiKey}`;
    return h;
  };
  return {
    async complete(req, signal) {
      let res: Response;
      try {
        res = await fetchImpl(joinUrl(cfg.baseUrl, "chat/completions"), {
          method: "POST",
          headers: headers(),
          body: JSON.stringify(buildOpenAiBody(req)),
          signal: timeoutSignal(signal),
        });
      } catch (e) {
        throw new LlmError(`无法连接模型平台 Could not reach ${cfg.name}: ${(e as Error).message}`, undefined, true);
      }
      const body = await res.text();
      if (!res.ok) {
        throw new LlmError(`${cfg.name} 返回 ${res.status} returned ${res.status}: ${snippet(body)}`, res.status, res.status === 429 || res.status >= 500);
      }
      let json: any;
      try {
        json = JSON.parse(body);
      } catch {
        throw new LlmError(`${cfg.name} 返回了无法解析的内容 returned unreadable data: ${snippet(body)}`);
      }
      const msg = json?.choices?.[0]?.message;
      let text: unknown = msg?.content;
      if (Array.isArray(text)) text = text.map((p: any) => (typeof p === "string" ? p : p?.text ?? "")).join("");
      if (typeof text !== "string" || !text.trim()) throw new LlmError(`${cfg.name} 没有返回文本 returned no text`, undefined, true);
      return { text, inputTokens: json?.usage?.prompt_tokens, outputTokens: json?.usage?.completion_tokens };
    },
    async listModels(signal) {
      const res = await fetchImpl(joinUrl(cfg.baseUrl, "models"), { headers: headers(), signal: timeoutSignal(signal) });
      const body = await res.text();
      if (!res.ok) throw new LlmError(`${cfg.name} 返回 ${res.status} returned ${res.status}: ${snippet(body)}`, res.status);
      const json = JSON.parse(body);
      const list: any[] = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
      return list.map((m) => (typeof m === "string" ? m : m?.id)).filter((x): x is string => typeof x === "string").sort();
    },
  };
}
