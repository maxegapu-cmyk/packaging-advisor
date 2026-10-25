/** Pull one JSON object out of a model reply: tolerate code fences, prose around it and trailing commas. */
export function extractJson(text: string): unknown {
  let s = text.trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1].trim();
  const start = s.indexOf("{");
  if (start < 0) throw new Error("回复中没有 JSON 对象 no JSON object in the reply");
  const end = matchingBrace(s, start);
  if (end < 0) throw new Error("JSON 不完整（可能被截断） JSON is incomplete (possibly truncated)");
  const candidate = s.slice(start, end + 1);
  try {
    return JSON.parse(candidate);
  } catch {
    const repaired = candidate.replace(/,\s*([}\]])/g, "$1");
    return JSON.parse(repaired);
  }
}

function matchingBrace(s: string, start: number): number {
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < s.length; i++) {
    const ch = s[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}
