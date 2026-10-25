import { test } from "node:test";
import assert from "node:assert/strict";
import { buildOpenAiBody, openAiClient } from "../src/lib/llm/openai";
import { anthropicClient, buildAnthropicBody } from "../src/lib/llm/anthropic";
import { LlmError, type LlmRequest } from "../src/lib/llm/types";

const req: LlmRequest = {
  model: "m1",
  maxTokens: 100,
  messages: [
    { role: "system", content: "SYS" },
    { role: "user", content: [{ type: "text", text: "hi" }, { type: "image", mime: "image/jpeg", base64: "QUJD" }] },
  ],
};

function fakeFetch(handler: (url: string, init: RequestInit) => { status: number; body: unknown }) {
  const calls: { url: string; init: RequestInit }[] = [];
  const f = (async (url: string, init: RequestInit = {}) => {
    calls.push({ url, init });
    const r = handler(url, init);
    return new Response(typeof r.body === "string" ? r.body : JSON.stringify(r.body), { status: r.status });
  }) as unknown as typeof fetch;
  return { f, calls };
}

test("OpenAI-compatible body sends images as data URLs", () => {
  const body = buildOpenAiBody(req) as any;
  assert.equal(body.model, "m1");
  assert.equal(body.messages[0].content, "SYS");
  assert.deepEqual(body.messages[1].content[1], { type: "image_url", image_url: { url: "data:image/jpeg;base64,QUJD" } });
});

test("OpenAI-compatible client posts to /chat/completions with a bearer key and reads the reply", async () => {
  const { f, calls } = fakeFetch(() => ({ status: 200, body: { choices: [{ message: { content: "OK" } }], usage: { prompt_tokens: 5, completion_tokens: 1 } } }));
  const c = openAiClient({ id: "x", name: "P", kind: "openai", baseUrl: "https://api.example.cn/v1/", apiKey: "sk-test" }, f);
  const r = await c.complete(req);
  assert.equal(r.text, "OK");
  assert.equal(r.inputTokens, 5);
  assert.equal(calls[0].url, "https://api.example.cn/v1/chat/completions");
  assert.equal((calls[0].init.headers as Record<string, string>).authorization, "Bearer sk-test");
});

test("OpenAI-compatible client accepts content returned as parts", async () => {
  const { f } = fakeFetch(() => ({ status: 200, body: { choices: [{ message: { content: [{ type: "text", text: "A" }, { type: "text", text: "B" }] } }] } }));
  const r = await openAiClient({ id: "x", name: "P", kind: "openai", baseUrl: "https://e/v1", apiKey: "" }, f).complete(req);
  assert.equal(r.text, "AB");
});

test("provider errors carry status and retryability, and never echo the key", async () => {
  const { f } = fakeFetch(() => ({ status: 429, body: "rate limited" }));
  const c = openAiClient({ id: "x", name: "P", kind: "openai", baseUrl: "https://e/v1", apiKey: "sk-secret" }, f);
  await assert.rejects(c.complete(req), (e: unknown) => e instanceof LlmError && e.status === 429 && e.retryable && !e.message.includes("sk-secret"));
});

test("model lists are read from /models", async () => {
  const { f, calls } = fakeFetch(() => ({ status: 200, body: { data: [{ id: "qwen-vl" }, { id: "deepseek-chat" }] } }));
  const models = await openAiClient({ id: "x", name: "P", kind: "openai", baseUrl: "https://e/v1", apiKey: "k" }, f).listModels();
  assert.deepEqual(models, ["deepseek-chat", "qwen-vl"]);
  assert.equal(calls[0].url, "https://e/v1/models");
});

test("Anthropic body moves system text out of the messages and uses base64 image blocks", () => {
  const body = buildAnthropicBody(req) as any;
  assert.equal(body.system, "SYS");
  assert.equal(body.messages.length, 1);
  assert.deepEqual(body.messages[0].content[1], { type: "image", source: { type: "base64", media_type: "image/jpeg", data: "QUJD" } });
});

test("Anthropic client posts to /v1/messages with x-api-key", async () => {
  const { f, calls } = fakeFetch(() => ({ status: 200, body: { content: [{ type: "text", text: "OK" }], usage: { input_tokens: 3, output_tokens: 1 } } }));
  const r = await anthropicClient({ id: "a", name: "A", kind: "anthropic", baseUrl: "https://api.anthropic.com", apiKey: "k" }, f).complete(req);
  assert.equal(r.text, "OK");
  assert.equal(calls[0].url, "https://api.anthropic.com/v1/messages");
  assert.equal((calls[0].init.headers as Record<string, string>)["x-api-key"], "k");
});
