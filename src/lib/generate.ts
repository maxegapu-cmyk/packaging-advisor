/**
 * Orchestrates one board generation or one single-dimension revision:
 * prompt → model → JSON extraction → validation (one repair retry) → saved board version.
 */
import { validateBoard, type Board } from "./board/schema";
import { loadLibrary } from "./materialsStore";
import { applyRevision, type Dimension } from "./board/revise";
import { extractJson } from "./llm/json";
import { resolveModel, type ResolvedModel } from "./llm/providers";
import { LlmError, type ChatMessage, type ChatPart, type LlmTask } from "./llm/types";
import { generationSystemPrompt, generationUserText, revisionSystemPrompt, revisionUserText } from "./prompts";
import { dailyLimit, getBoard, getProject, listUploads, logEvent, saveBoard, uploadBase64, usageToday, type BoardRecord } from "./projects";

export class GenerationError extends Error {
  constructor(message: string, readonly detail?: string[]) {
    super(message);
  }
}

type Actor = { id: number; isAdmin: boolean };

function checkLimit(actor: Actor) {
  if (actor.isAdmin) return;
  if (usageToday(actor.id) >= dailyLimit()) {
    throw new GenerationError(`今天的生成次数已用完（每天 ${dailyLimit()} 次），明天再试 Today's limit of ${dailyLimit()} generations is used up; try again tomorrow`);
  }
}

/** Call the model; if the JSON is unusable, ask once more with the validation errors. */
async function callForJson<T>(
  resolved: ResolvedModel,
  task: LlmTask,
  messages: ChatMessage[],
  validate: (raw: unknown) => { ok: true; value: T } | { ok: false; errors: string[] },
): Promise<{ value: T; ms: number; tokens: { in?: number; out?: number } }> {
  const started = Date.now();
  const maxTokens = Number(process.env.LLM_MAX_TOKENS || 12000);
  let tokens = { in: 0, out: 0 };
  let lastErrors: string[] = [];
  let convo = messages;
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await resolved.client.complete({ model: resolved.model, messages: convo, task, maxTokens, temperature: attempt === 0 ? 0.8 : 0.3 });
    tokens = { in: tokens.in + (res.inputTokens ?? 0), out: tokens.out + (res.outputTokens ?? 0) };
    let raw: unknown;
    try {
      raw = extractJson(res.text);
    } catch (e) {
      lastErrors = [(e as Error).message];
      convo = [...messages, { role: "assistant", content: res.text.slice(0, 20000) }, { role: "user", content: repairMessage(lastErrors) }];
      continue;
    }
    const v = validate(raw);
    if (v.ok) return { value: v.value, ms: Date.now() - started, tokens };
    lastErrors = v.errors;
    convo = [...messages, { role: "assistant", content: res.text.slice(0, 20000) }, { role: "user", content: repairMessage(lastErrors) }];
  }
  throw new GenerationError("模型返回的方案不完整，请重试或换一个模型 The model's answer was incomplete; try again or pick another model", lastErrors);
}

function repairMessage(errors: string[]): string {
  return `上一次输出无法使用，问题如下：\n- ${errors.slice(0, 15).join("\n- ")}\n请修正后重新输出完整的 JSON 对象，不要输出其他文字。 Fix these issues and output the complete JSON object only.`;
}

function friendly(e: unknown): GenerationError {
  if (e instanceof GenerationError) return e;
  if (e instanceof LlmError) {
    if (e.status === 401 || e.status === 403) return new GenerationError("模型平台拒绝了 API Key，请联系管理员检查 The platform rejected the API key; ask the admin to check it", [e.message]);
    if (e.status === 429) return new GenerationError("模型平台繁忙或额度不足，请稍后重试 The platform is busy or out of quota; try again later", [e.message]);
    if ((e as Error).name === "TimeoutError" || /aborted|timeout/i.test(e.message)) return new GenerationError("模型响应超时，请重试或换一个更快的模型 The model timed out; retry or pick a faster model", [e.message]);
    return new GenerationError("调用模型失败 The model call failed", [e.message]);
  }
  if ((e as Error)?.name === "TimeoutError") return new GenerationError("模型响应超时，请重试或换一个更快的模型 The model timed out; retry or pick a faster model");
  return new GenerationError("生成失败 Generation failed", [String((e as Error)?.message ?? e)]);
}

export async function generateBoard(projectId: string, actor: Actor, modelId?: number | null): Promise<BoardRecord> {
  const project = getProject(projectId);
  if (!project) throw new GenerationError("找不到该产品 Project not found");
  checkLimit(actor);
  const resolved = resolveModel(modelId);
  const uploads = listUploads(projectId);

  const parts: ChatPart[] = [
    {
      type: "text",
      text: generationUserText({
        title: project.title,
        category: project.category,
        itemType: project.itemType,
        brand: project.brand,
        description: project.description,
        mustText: project.mustText,
        images: uploads.map((u) => ({ kind: u.kind === "reference" ? ("reference" as const) : ("product" as const), note: u.note })),
        modelCanSeeImages: resolved.vision,
      }),
    },
  ];
  if (resolved.vision) for (const u of uploads) parts.push({ type: "image", mime: "image/jpeg", base64: uploadBase64(u) });

  const messages: ChatMessage[] = [
    { role: "system", content: (loadLibrary(), generationSystemPrompt(project.category)) },
    { role: "user", content: parts },
  ];

  try {
    const { value, ms, tokens } = await callForJson<Board>(resolved, "generate", messages, validateBoard);
    const board = saveBoard(projectId, value, resolved.label, "生成 Generated");
    logEvent({ inviteId: actor.id, projectId, boardId: board.id, type: "generate", payload: { model: resolved.label, ms, tokens } });
    return board;
  } catch (e) {
    const err = friendly(e);
    logEvent({ inviteId: actor.id, projectId, type: "generate_failed", payload: { model: resolved.label, error: err.message, detail: err.detail?.slice(0, 5) } });
    throw err;
  }
}

export async function reviseDirection(
  boardId: string,
  actor: Actor,
  args: { directionId: string; dimension: Dimension; feedback: string; modelId?: number | null },
): Promise<BoardRecord> {
  const current = getBoard(boardId);
  if (!current) throw new GenerationError("找不到该方案板 Board not found");
  const project = getProject(current.projectId);
  if (!project) throw new GenerationError("找不到该产品 Project not found");
  const direction = current.data.directions.find((d) => d.id === args.directionId);
  if (!direction) throw new GenerationError("找不到该方向 Direction not found");
  checkLimit(actor);
  const resolved = resolveModel(args.modelId);
  const messages: ChatMessage[] = [
    { role: "system", content: (loadLibrary(), revisionSystemPrompt(project.category)) },
    { role: "user", content: revisionUserText(direction, args.dimension, args.feedback.slice(0, 1000)) },
  ];
  try {
    const { value, ms, tokens } = await callForJson(resolved, "revise", messages, (raw) => applyRevision(direction, raw, args.dimension));
    const next: Board = structuredClone(current.data);
    next.directions = next.directions.map((d) => (d.id === args.directionId ? value : d));
    const board = saveBoard(project.id, next, resolved.label, `修改 ${args.directionId} · ${args.dimension}`);
    logEvent({ inviteId: actor.id, projectId: project.id, boardId: board.id, type: "revise", payload: { model: resolved.label, ms, tokens, direction: args.directionId, dimension: args.dimension, feedback: args.feedback.slice(0, 300) } });
    return board;
  } catch (e) {
    const err = friendly(e);
    logEvent({ inviteId: actor.id, projectId: project.id, boardId, type: "revise_failed", payload: { model: resolved.label, error: err.message, detail: err.detail?.slice(0, 5) } });
    throw err;
  }
}
