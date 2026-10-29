/**
 * Plain-text descriptions of a quoted component, as a spec sheet or job sheet prints them: its
 * stock, print, finishing and quantity per pack.
 * Client-safe.
 */
import type { Lang, Pair } from "../i18n";
import type { CompQuote } from "./quote";

const one = (p: Pair, lang: Lang) => (lang === "en" ? p.en : p.zh);
const BOUGHT: Pair = { zh: "外购", en: "bought in" };

const LAM: Record<string, Pair> = { matte: { zh: "覆哑膜", en: "matte film" }, gloss: { zh: "覆光膜", en: "gloss film" }, soft: { zh: "覆触感膜", en: "soft-touch film" }, varnish: { zh: "过油", en: "varnish" } };

export function printText(c: CompQuote, lang: Lang): string {
  const x = c.comp;
  if (x.kind === "sheet") return x.cf || x.cb ? `${x.cf ?? 0}+${x.cb ?? 0}${x.spots ? (lang === "zh" ? `（含 ${x.spots} 专色）` : ` (${x.spots} spot)`) : ""}` : lang === "zh" ? "不印" : "unprinted";
  if (x.kind === "flute") return x.cf ? (lang === "zh" ? `水印 ${x.cf} 色` : `flexo ${x.cf}`) : "—";
  if (x.kind === "flex") return lang === "zh" ? `${x.cf ?? 0} 色` : `${x.cf ?? 0} colours`;
  if (x.kind === "label") return lang === "zh" ? `${x.cf ?? 0} 色` : `${x.cf ?? 0} colours`;
  return "—";
}
export function postText(c: CompQuote, lang: Lang): string {
  const x = c.comp;
  const out: string[] = [];
  if (x.lam) out.push(one(LAM[x.lam], lang));
  if (x.foil) out.push(lang === "zh" ? `${x.foil.holo ? "烫镭射" : "烫金"} ${x.foil.cm2} cm²` : `${x.foil.holo ? "holographic" : "foil"} ${x.foil.cm2} cm²`);
  if (x.emboss) out.push(lang === "zh" ? `击凸 ${x.emboss} cm²` : `emboss ${x.emboss} cm²`);
  if (x.uv) out.push(lang === "zh" ? "局部 UV" : "spot UV");
  if (x.mount) out.push(lang === "zh" ? `裱${x.mount.name.zh}` : `mounted on ${x.mount.name.en}`);
  if (x.die) out.push(lang === "zh" ? "模切" : "die-cut");
  if (x.window) out.push(lang === "zh" ? "开窗贴膜" : "window");
  if (x.glue) out.push(lang === "zh" ? (x.glue === "crash" ? "扣底糊盒" : x.glue === "hand" ? "手工糊盒" : "直线糊盒") : x.glue === "crash" ? "crash-lock glued" : x.glue === "hand" ? "hand glued" : "straight-line glued");
  if (x.rateId?.startsWith("rigid.")) out.push(lang === "zh" ? "精装手工成型" : "rigid handwork");
  if (x.kind === "flex") out.push(lang === "zh" ? (x.rateId === "pouch.stand" ? "自立拉链袋" : "三边封") : x.rateId === "pouch.stand" ? "stand-up zip pouch" : "three-side seal");
  return out.join(lang === "zh" ? "、" : ", ") || "—";
}
export function stockText(c: CompQuote, lang: Lang): string {
  const x = c.comp;
  if (!x.stock) return "—";
  return `${one(x.stock.name, lang)}${x.gsm ? ` ${x.gsm} g` : ""}${c.bought ? ` (${one(BOUGHT, lang)})` : ""}`;
}
export function perPackText(c: CompQuote, lang: Lang): string {
  const x = c.comp;
  if (x.key === "shipper") return lang === "zh" ? `1/${Math.round(1 / x.perPack)} 箱` : `1/${Math.round(1 / x.perPack)} carton`;
  const area = x.blanks?.reduce((a, b) => a + b.area, 0) ?? x.area;
  const n = x.perPack !== 1 ? `× ${x.perPack}` : "× 1";
  const sizes = x.blanks?.map((b) => `${b.w}×${b.h}`).join(" + ");
  return [n, sizes ? (lang === "zh" ? `展开 ${sizes} mm` : `blank ${sizes} mm`) : null, area ? `${area.toFixed(3)} ㎡` : null].filter(Boolean).join(lang === "zh" ? "，" : ", ");
}

