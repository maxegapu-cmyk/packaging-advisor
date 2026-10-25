/**
 * Render a board to a standalone HTML file without starting Next.js.
 * Useful for reviewing the board design and for screenshot tests.
 *
 *   npm run preview:board -- [board.json] [out.html] [bi|zh|en]
 * With no board.json, the built-in demo board is used.
 */
import fs from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { BoardView } from "../src/components/BoardView";
import { validateBoard } from "../src/lib/board/schema";
import { DEMO_BOARD } from "../src/lib/llm/demo";
import { isLang, type Lang } from "../src/lib/i18n";

const [input, output = "board-preview.html", langArg = "bi"] = process.argv.slice(2);
const lang: Lang = isLang(langArg) ? langArg : "bi";
const raw = input ? JSON.parse(fs.readFileSync(input, "utf8")) : DEMO_BOARD;
const v = validateBoard(raw);
if (!v.ok) {
  console.error("Board is invalid:\n- " + v.errors.join("\n- "));
  process.exit(1);
}
const css = fs.readFileSync(path.join(__dirname, "../src/app/globals.css"), "utf8");
const body = renderToStaticMarkup(<BoardView board={v.value} lang={lang} pickedId={null} />);
const html = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${v.value.meta.product.zh}</title><style>${css}</style></head><body><main class="page">${body}</main></body></html>`;
fs.writeFileSync(output, html);
console.log(`Wrote ${path.resolve(output)}`);
