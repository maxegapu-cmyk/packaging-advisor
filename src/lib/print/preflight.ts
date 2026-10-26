/**
 * Pre-press checks a print shop would otherwise make: missing label information, barcode
 * number and scannability, contrast, text size on the information panel, risky wording.
 * Errors stop a clean file; warnings are the seller's call. Client-safe and pure.
 */
import type { Artwork } from "../artwork";
import { labelFields } from "../artwork";
import type { Board } from "../board/schema";
import type { PackSpec } from "../pack";
import { layoutBack, MIN_TEXT_MM } from "./backpanel";
import { contrast } from "./color";
import { checkEan13, EAN_NOMINAL } from "./ean13";
import { artSize, infoPanels, printLayout, wrapBack } from "./layout";

type Pair = { zh: string; en: string };
export type Level = "error" | "warn" | "ok" | "info";
export type Check = { id: string; level: Level; title: Pair; detail: Pair };

const C = (id: string, level: Level, zh: string, en: string, dzh = "", den = ""): Check => ({ id, level, title: { zh, en }, detail: { zh: dzh, en: den } });

/** The info panel size in mm for checking (the back section of a wrap, otherwise the panel). */
export function infoSize(spec: PackSpec): { w: number; h: number } | null {
  const ip = infoPanels(printLayout(spec)).find((x) => !x.sheet.id.startsWith("inner-"));
  if (!ip) return null;
  const s = artSize(ip.panel);
  return ip.panel.kind === "tinWrap" ? wrapBack(s.w, s.h) : s;
}

export function preflight(a: Artwork, board: Board, spec: PackSpec): Check[] {
  const out: Check[] = [];
  const fields = labelFields(board.meta.category);
  const val = (k: string) => a.rows.find((r) => r.key === k)?.value.trim() ?? "";

  // label information
  const missing = fields.filter((f) => f.required && !val(f.key));
  if (missing.length) out.push(C("label", "warn", `还有 ${missing.length} 项标签信息没填`, `${missing.length} label item${missing.length > 1 ? "s" : ""} still empty`, missing.map((f) => f.label.zh).join("、"), missing.map((f) => f.label.en).join(", ")));
  else out.push(C("label", "ok", "标签信息已填写", "Label information filled in"));
  const fam = ["tea", "snacks", "beverage", "specialty", "health", "cosmetics", "personalCare", "pet"];
  if (fam.includes(board.meta.category) && !a.net.trim()) out.push(C("net", "warn", "正面没有净含量", "No net content on the front", "食品和化妆品须在正面标注净含量。", "Food and cosmetics must show net content on the front."));

  // barcode
  const bc = checkEan13(a.barcode);
  if (!bc.ok && bc.reason === "empty") out.push(C("barcode", "warn", "没有商品条码", "No barcode", "上架商超和多数电商平台需要条码。号码在中国物品编码中心注册取得，请不要自编。", "Shops and most marketplaces need one. Get the number from GS1 China; never make one up."));
  else if (!bc.ok && bc.reason === "format") out.push(C("barcode", "error", "条码号码格式不对", "Barcode number is not valid", "应为 13 位数字。", "It should be 13 digits."));
  else if (!bc.ok && bc.reason === "check") out.push(C("barcode", "error", "条码校验位不对", "Barcode check digit is wrong", `按前 12 位计算，最后一位应为 ${bc.expected}。`, `From the first 12 digits the last should be ${bc.expected}.`));
  else {
    // the code is always printed as black bars in a white box, which scans on any ground
    out.push(C("barcode", "ok", "条码号码有效，黑条白底印刷", "Barcode valid, printed black on white"));
  }

  // information panel
  const size = infoSize(spec);
  if (size) {
    const lay = layoutBack(size.w, size.h, { brand: a.brand, intro: a.intro, rows: a.rows, barcode: true });
    if (lay.overflow) out.push(C("info-fit", "error", "标签信息放不下", "Label information doesn't fit", `信息面只有 ${Math.round(size.w)} × ${Math.round(size.h)} mm。请精简介绍文字，或加大包装尺寸。`, `The information panel is only ${Math.round(size.w)} × ${Math.round(size.h)} mm. Shorten the paragraph or enlarge the package.`));
    else if (lay.textMm < MIN_TEXT_MM) out.push(C("info-size", "error", `信息字号只有 ${lay.textMm.toFixed(1)} mm`, `Information text is only ${lay.textMm.toFixed(1)} mm`, "强制标示内容的文字高度不得小于 1.8 mm。请精简文字或加大包装。", "Mandatory text must be at least 1.8 mm high. Shorten it or enlarge the package."));
    else out.push(C("info-size", "ok", `信息字号 ${lay.textMm.toFixed(1)} mm`, `Information text ${lay.textMm.toFixed(1)} mm`));
    if (lay.barcode && lay.barcode.w > size.w - 2 * lay.pad + 0.01) out.push(C("barcode-size", "error", "信息面放不下条码", "Barcode doesn't fit the panel", `条码最小约 ${(EAN_NOMINAL.w * EAN_NOMINAL.minMag).toFixed(0)} mm 宽。`, `The smallest barcode is about ${(EAN_NOMINAL.w * EAN_NOMINAL.minMag).toFixed(0)} mm wide.`));
  } else out.push(C("info-size", "info", "这种包装没有印刷信息面", "This package has no printed information panel", "标签信息请做成不干胶贴纸。", "Put label information on a sticker."));

  // contrast
  const ct = contrast(a.palette.ink, a.palette.ground);
  if (ct < 4.5) out.push(C("contrast", ct < 3 ? "error" : "warn", `文字与底色对比度 ${ct.toFixed(1)}`, `Text contrast ${ct.toFixed(1)}:1`, "小字建议对比度 4.5 以上，否则印出来难以阅读。", "Small print wants 4.5:1 or more to stay readable."));
  else out.push(C("contrast", "ok", `文字对比度 ${ct.toFixed(1)}`, `Text contrast ${ct.toFixed(1)}:1`));

  // risky wording
  const text = [a.headline, a.detail, a.intro, ...a.rows.map((r) => r.value)].join("\n");
  for (const fnd of board.claimCheck) {
    if (fnd.level === "low" || !fnd.text.trim()) continue;
    if (text.includes(fnd.text.trim())) out.push(C(`claim-${fnd.text}`, fnd.level === "high" ? "error" : "warn", `有风险的说法：「${fnd.text}」`, `Risky wording: “${fnd.text}”`, `建议改为：${fnd.safer.zh}`, `Suggested: ${fnd.safer.en}`));
  }

  // always
  out.push(C("die", "info", "刀模以印厂为准", "Your printer's die line wins", "结构尺寸是标准做法；开模前请印厂核对。", "Structural sizes are standard practice; have the printer check before cutting."));
  out.push(C("proof", "info", "正式印刷前请打样", "Proof before the print run", "屏幕颜色和印刷颜色会有差异。", "Screen and print colors differ."));
  return out;
}

export const blocking = (checks: Check[]) => checks.filter((c) => c.level === "error");
