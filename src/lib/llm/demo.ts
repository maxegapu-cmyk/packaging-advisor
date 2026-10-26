/**
 * Offline demo provider: no API key, no network. Returns a fixed, realistic board so the whole
 * flow (upload → board → revise → share) can be tried before any model platform is connected.
 * The admin can disable it once a real provider is set up.
 */
import type { Direction } from "../board/schema";
import { TEA_BOARD } from "../board/tea";
import { isCategory } from "../categories";
import { adaptSample } from "../samples";
import type { LlmClient, LlmRequest } from "./types";

export const DEMO_MODEL = "demo-board";

export { TEA_BOARD as DEMO_BOARD } from "../board/tea";

function lastUserText(req: LlmRequest): string {
  const m = [...req.messages].reverse().find((x) => x.role === "user");
  if (!m) return "";
  return typeof m.content === "string" ? m.content : m.content.map((p) => (p.type === "text" ? p.text : "")).join("\n");
}

/** For a revision, return the current direction with every dimension nudged; the server keeps only the chosen one. */
function demoRevision(req: LlmRequest): Direction {
  const text = lastUserText(req);
  const m = text.match(/<current_direction>([\s\S]*?)<\/current_direction>/);
  const current: Direction = m ? JSON.parse(m[1]) : TEA_BOARD.directions[1];
  const d: Direction = structuredClone(current);
  d.palette = d.palette.map((s, i) =>
    i === 2 ? { ...s, hex: "#2F6F8F", name: { zh: "湖水蓝", en: "Lake blue" } } : s,
  );
  d.layout = d.layout === "stripe" ? "split" : "stripe";
  d.carriers.outerFront = { zh: `${d.carriers.outerFront.zh}（演示修改）`, en: `${d.carriers.outerFront.en} (demo revision)` };
  d.styleDna.typography = { zh: "改为圆润的黑体（演示修改）", en: "Switched to a rounded sans-serif (demo revision)" };
  d.styleDna.imagery = { zh: "加入手绘茶叶插画（演示修改）", en: "Adds a hand-drawn leaf illustration (demo revision)" };
  d.anchor = { zh: "一枚圆形产地印章（演示修改）", en: "A round origin seal (demo revision)" };
  return d;
}

/** The sample nearest the seller's category, labelled with their product name and brand. */
function demoBoard(req: LlmRequest) {
  const text = lastUserText(req);
  const field = (label: string) => text.match(new RegExp(`${label}[^:]*:\\s*(.+)`))?.[1]?.trim() ?? "";
  const code = text.match(/品类 Category:.*\((\w+)\)/)?.[1];
  const brand = field("品牌 Brand");
  return adaptSample(isCategory(code) ? code : "tea", { title: field("产品名称 Product"), brand: brand.startsWith("（") ? "" : brand });
}

export function demoClient(): LlmClient {
  return {
    async complete(req) {
      await new Promise((r) => setTimeout(r, Number(process.env.DEMO_DELAY_MS ?? 600)));
      const payload = req.task === "revise" ? demoRevision(req) : demoBoard(req);
      return { text: "```json\n" + JSON.stringify(payload, null, 2) + "\n```" };
    },
    async listModels() {
      return [DEMO_MODEL];
    },
  };
}
