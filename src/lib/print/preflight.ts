/**
 * Pre-press checks a print shop would otherwise make: missing label information, barcode
 * number and scannability, contrast, text size on the information panel, risky wording.
 * Errors stop a clean file; warnings are the seller's call. Client-safe and pure.
 */
import type { Artwork } from "../artwork";
import { labelFields } from "../artwork";
import type { Board } from "../board/schema";
import { ROUND_FORMS, type PackSpec } from "../pack";
import { layoutBack, MIN_TEXT_MM } from "./backpanel";
import { LIST, offListOf, problemsOf, rulesFor, usesOf } from "../materials";
import { overpackChecks } from "../compliance/overpack";
import { coverage, coverageSummary, type SupplierDoc } from "../compliance/documents";
import { contrast, deltaE } from "./color";
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

export function preflight(a: Artwork, board: Board, spec: PackSpec, docs: SupplierDoc[] = []): Check[] {
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

  // the real sample (打样): size, color, and the seller's sign-off
  const pf = a.proof;
  const dims: [string, string, string, number, number | null][] = [
    ["w", ROUND_FORMS.includes(spec.form) ? "直径" : "宽", ROUND_FORMS.includes(spec.form) ? "diameter" : "width", spec.w, pf.w],
    ["h", "高", "height", spec.h, pf.h],
  ];
  if (!ROUND_FORMS.includes(spec.form)) dims.push(["d", "深", "depth", spec.d, pf.d]);
  const off = dims.filter(([, , , set, m]) => m !== null && Math.abs(m - set) > 1);
  for (const [k, zh, en, set, m] of off) out.push(C(`proof-${k}`, "error", `实测${zh} ${m} mm，设定 ${set} mm`, `Measured ${en} ${m} mm, set to ${set} mm`, "差了 1 mm 以上：请在 3D 空间改成实测尺寸，或让印厂按设定尺寸重新打样。", "More than 1 mm out: set the measured size in the 3D space, or have the printer re-proof to the set size."));
  if (!off.length && dims.every(([, , , , m]) => m !== null)) out.push(C("proof-size", "ok", "实测尺寸与设定一致（±1 mm）", "Measured size matches (±1 mm)"));
  const picked = (Object.keys(pf.colors) as (keyof typeof pf.colors)[]).map((k) => ({ k, de: deltaE(a.palette[k], pf.colors[k]!) }));
  if (picked.length) {
    const worst = picked.reduce((x, y) => (y.de > x.de ? y : x));
    const lvl: Level = worst.de > 10 ? "error" : worst.de > 5 ? "warn" : "ok";
    out.push(C("proof-color", lvl, `实物色差 ΔE ${worst.de.toFixed(1)}`, `Sample color difference ΔE ${worst.de.toFixed(1)}`, lvl === "ok" ? "肉眼几乎看不出差别。" : "照片和设计色差别明显：先确认拍照光线（白天自然光、无滤镜），仍偏差就请印厂调墨后再打样。", lvl === "ok" ? "Hard to tell apart." : "A visible difference: check the photo's lighting (daylight, no filters); if it persists, ask the printer to adjust the ink and re-proof."));
  }
  if (pf.confirmed) out.push(C("sample", "ok", `已与实物打样核对${pf.at ? `（${pf.at}）` : ""}`, `Checked against the printed sample${pf.at ? ` (${pf.at})` : ""}`));
  else out.push(C("sample", "warn", "还没有和实物打样核对", "Not yet checked against a printed sample", "在实物打样到手前，电商图片只是渲染图。拿到样品后在「实物核对」里比对并确认，图片才算与实物一致。", "Until the printed sample arrives the listing images are renders. Compare and confirm it under “Match the sample” before treating them as true to the product."));

  // materials: the principal's list
  const uses = usesOf(spec, board.meta.category);
  for (const p of problemsOf(uses, spec)) out.push(C(`mat-${p.key}`, p.level, p.text.zh, p.text.en));
  const offList = offListOf(spec);
  if (offList.length) out.push(C("mat-off", "warn", `清单外部件：${offList.map((o) => o.label.zh).join("、")}`, `Off the material list: ${offList.map((o) => o.label.en.toLowerCase()).join(", ")}`, offList.map((o) => o.why.zh).join(" ") + " 请委托方确认或补列后再下单。", offList.map((o) => o.why.en).join(" ") + " Have the principal confirm or add them before ordering."));
  const contact = uses.filter((u) => u.touches);
  if (contact.length) {
    const what = contact[0].touches === "food" ? ["食品", "food"] : ["化妆品", "the cosmetic"];
    const ids = rulesFor(spec, board.meta.category, uses).filter((r) => r.by.some((k) => contact.some((u) => u.key === k)) && r.rule.id !== "G01").map((r) => r.rule.id);
    out.push(C("mat-contact", "warn", `${contact.length} 个部件直接接触${what[0]}：向供应商取得符合性资料`, `${contact.length} part${contact.length > 1 ? "s" : ""} touch ${what[1]}: get compliance documents from the suppliers`, `${contact.map((u) => `${u.label.zh}（${u.m.name.zh} ${u.id}）`).join("、")}。按 ${ids.join("、")} 取得符合性声明和成品检测，报告须覆盖实际结构与使用条件。`, `${contact.map((u) => `${u.label.en} (${u.m.name.en} ${u.id})`).join(", ")}. Under ${ids.join(", ")}, get declarations of compliance and finished-product tests that cover the actual structure and conditions of use.`));
  }
  // picks the 3D model draws with the default look: the render is not the product until proofed
  const sketch = uses.filter((u) => !u.drawn);
  if (sketch.length) out.push(C("mat-look", "info", `${sketch.length} 处选材在 3D 中按常见外观示意`, `${sketch.length} pick${sketch.length > 1 ? "s" : ""} shown in 3D with the usual look`, `${sketch.map((u) => `${u.label.zh}（${u.m.name.zh} ${u.id}）`).join("、")}。外观以打样为准。`, `${sketch.map((u) => `${u.label.en} (${u.m.name.en} ${u.id})`).join(", ")}. The proof decides how they look.`));
  // over-packaging: GB 23350 and GB 45186, worked out from the pack
  for (const x of overpackChecks(spec, board.meta.category)) if (x.level !== "info" || x.id === "void") out.push(C(`over-${x.id}`, x.level, `${x.rule} ${x.title.zh}`, `${x.rule} ${x.title.en}`, x.detail.zh, x.detail.en));
  // supplier documents: what the rules ask for, part by part
  const reqs = coverage(uses, rulesFor(spec, board.meta.category, uses), docs);
  const sum = coverageSummary(reqs);
  const name = (r: (typeof reqs)[number], lang: "zh" | "en") => `${lang === "zh" ? r.label.zh : r.label.en}（${r.rule}）`;
  if (sum.criticalGaps.length) out.push(C("docs-critical", "warn", `${sum.criticalGaps.length} 项接触内容物的部件缺证明文件`, `${sum.criticalGaps.length} contact part requirement${sum.criticalGaps.length > 1 ? "s" : ""} lack documents`, sum.criticalGaps.map((r) => name(r, "zh")).join("、"), sum.criticalGaps.map((r) => name(r, "en")).join(", ")));
  if (sum.expired.length) out.push(C("docs-expired", "error", `${sum.expired.length} 项证明文件已过期`, `${sum.expired.length} document requirement${sum.expired.length > 1 ? "s have" : " has"} expired documents`, sum.expired.map((r) => name(r, "zh")).join("、"), sum.expired.map((r) => name(r, "en")).join(", ")));
  if (sum.expiring.length) out.push(C("docs-expiring", "warn", `${sum.expiring.length} 项证明文件 30 天内到期`, `${sum.expiring.length} document${sum.expiring.length > 1 ? "s expire" : " expires"} within 30 days`, sum.expiring.map((r) => name(r, "zh")).join("、"), sum.expiring.map((r) => name(r, "en")).join(", ")));
  if (reqs.length) out.push(C("docs", sum.met === sum.total ? "ok" : "info", `证明文件已齐 ${sum.met}/${sum.total}`, `Documents in place ${sum.met}/${sum.total}`, "在 3D 空间「合规」中上传和管理。", "Upload and manage them under Compliance in the 3D space."));
  // the materials frozen at sign-off, or not yet
  if (spec.frozen) out.push(C("frozen", "ok", `材料已冻结（${spec.frozen.at.slice(0, 10)}）`, `Materials frozen (${spec.frozen.at.slice(0, 10)})`, spec.frozen.note ?? "", spec.frozen.note ?? ""));
  else out.push(C("frozen", a.proof.confirmed ? "warn" : "info", "材料还没有冻结", "Materials not frozen yet", "定稿时在 3D 空间「合规」中冻结，之后材料库的修改不会影响这个产品。", "Freeze them under Compliance in the 3D space at sign-off, so later library changes don't touch this product."));
  const listed = new Set(uses.map((u) => u.id)).size;
  out.push(C("mat-list", "ok", `材料均来自委托方清单（${listed} 种）`, `All materials from the principal's list (${listed})`, `清单核对日期 ${LIST.checked}；所需资料见印刷工单第 2 页。`, `List checked ${LIST.checked}; the documents needed are on page 2 of the job sheet.`));

  // always
  out.push(C("die", "info", "刀模以印厂为准", "Your printer's die line wins", "结构尺寸是标准做法；开模前请印厂核对。", "Structural sizes are standard practice; have the printer check before cutting."));
  out.push(C("proof", "info", "正式印刷前请打样", "Proof before the print run", "屏幕颜色和印刷颜色会有差异。", "Screen and print colors differ."));
  return out;
}

export const blocking = (checks: Check[]) => checks.filter((c) => c.level === "error");
