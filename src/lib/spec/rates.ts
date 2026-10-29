/**
 * Process rates: what each production step costs, laid out the way East China packaging printers
 * quote (plates, make-ready per colour, a run rate past the first thousand sheets, finishing by the
 * m² or by the hit with a minimum charge, cutting dies by the metre of rule, handwork per piece).
 * All money is net of VAT; the quote adds VAT at the end. Edited in the price book (book.ts).
 * Client-safe.
 */
import type { Pair } from "../i18n";
import type { Confidence } from "./sources";

export type RateUnit = "yuan" | "yuan/m2" | "yuan/1000" | "yuan/pc" | "yuan/cm2" | "yuan/m" | "yuan/kg" | "pct" | "sheets" | "pcs";

export const RATE_UNIT_LABELS: Record<RateUnit, Pair> = {
  yuan: { zh: "元", en: "yuan" },
  "yuan/m2": { zh: "元/㎡", en: "yuan/m²" },
  "yuan/1000": { zh: "元/千", en: "yuan/1,000" },
  "yuan/pc": { zh: "元/个", en: "yuan/pc" },
  "yuan/cm2": { zh: "元/cm²", en: "yuan/cm²" },
  "yuan/m": { zh: "元/米", en: "yuan/m" },
  "yuan/kg": { zh: "元/kg", en: "yuan/kg" },
  pct: { zh: "%", en: "%" },
  sheets: { zh: "张", en: "sheets" },
  pcs: { zh: "个", en: "pcs" },
};

export type RateGroup = "press" | "coat" | "foil" | "die" | "convert" | "rigid" | "flute" | "flex" | "label" | "buyin" | "job" | "overs" | "terms";
export const RATE_GROUPS: { id: RateGroup; label: Pair }[] = [
  { id: "press", label: { zh: "印刷", en: "Printing" } },
  { id: "coat", label: { zh: "表面处理", en: "Surface finishing" } },
  { id: "foil", label: { zh: "烫印与压凸", en: "Foil and embossing" } },
  { id: "die", label: { zh: "模切", en: "Die-cutting" } },
  { id: "convert", label: { zh: "糊盒与成型", en: "Gluing and forming" } },
  { id: "rigid", label: { zh: "精装手工", en: "Rigid-box handwork" } },
  { id: "flute", label: { zh: "瓦楞纸板与纸箱", en: "Corrugated and shippers" } },
  { id: "flex", label: { zh: "软包装", en: "Flexible packaging" } },
  { id: "label", label: { zh: "不干胶标签", en: "Labels" } },
  { id: "buyin", label: { zh: "外购件", en: "Bought-in parts" } },
  { id: "job", label: { zh: "打样与包装运输", en: "Proofs, packing and freight" } },
  { id: "overs", label: { zh: "放数（损耗）", en: "Overs (waste allowance)" } },
  { id: "terms", label: { zh: "管理费、利润与税", en: "Overhead, margin and tax" } },
];

export type Rate = { id: string; group: RateGroup; name: Pair; unit: RateUnit; value: number; low?: number; high?: number; src: string; conf: Confidence; note?: Pair };

const P = (zh: string, en: string): Pair => ({ zh, en });
const r = (id: string, group: RateGroup, name: Pair, unit: RateUnit, value: number, low?: number, high?: number, extra: Partial<Rate> = {}): Rate => ({ id, group, name, unit, value, low, high, src: "trade", conf: "trade", ...extra });

export const RATES: Rate[] = [
  /* printing: offset, by press size (四开 ≤ 530×740, 对开 ≤ 720×1040, 全张 ≤ 1200×1620) */
  r("plate.q", "press", P("CTP 印版（四开机，每色）", "CTP plate, quarter-size press (per colour)"), "yuan", 40, 30, 60, { src: "film-fees", note: P("参考：四开胶片 60 元、对开 100 元。", "For reference: quarter-size film 60, half-size 100.") }),
  r("plate.h", "press", P("CTP 印版（对开机，每色）", "CTP plate, half-size press (per colour)"), "yuan", 70, 55, 100, { src: "film-fees" }),
  r("plate.f", "press", P("CTP 印版（全张机，每色）", "CTP plate, full-size press (per colour)"), "yuan", 160, 120, 220),
  r("mr.q", "press", P("开机费（四开机，每色，含首千印）", "Make-ready, quarter press (per colour, first 1,000 sheets)"), "yuan", 60, 40, 90, { src: "quote-method" }),
  r("mr.h", "press", P("开机费（对开机，每色，含首千印）", "Make-ready, half press (per colour, first 1,000 sheets)"), "yuan", 100, 75, 150, { src: "quote-method", note: P("常见报价：四色一套 300–500 元，含 3000 张以内。", "A common quote: 300–500 yuan a four-colour set, up to 3,000 sheets.") }),
  r("mr.f", "press", P("开机费（全张机，每色，含首千印）", "Make-ready, full press (per colour, first 1,000 sheets)"), "yuan", 200, 150, 300),
  r("run.q", "press", P("印工（四开机，每色每千印）", "Running, quarter press (per colour per 1,000)"), "yuan/1000", 15, 10, 22),
  r("run.h", "press", P("印工（对开机，每色每千印）", "Running, half press (per colour per 1,000)"), "yuan/1000", 25, 18, 35, { src: "quote-method" }),
  r("run.f", "press", P("印工（全张机，每色每千印）", "Running, full press (per colour per 1,000)"), "yuan/1000", 45, 35, 60),
  r("spot", "press", P("专色调墨（每个专色）", "Spot colour ink mixing (per spot)"), "yuan", 60, 30, 120),

  /* surface finishing, by the m² of press sheet */
  r("lam.gloss", "coat", P("覆光膜", "Gloss lamination"), "yuan/m2", 0.3, 0.25, 0.4),
  r("lam.matte", "coat", P("覆哑膜", "Matte lamination"), "yuan/m2", 0.35, 0.3, 0.45, { src: "foil-rates", note: P("哑膜一般比光膜贵约 15%。", "Matte usually runs about 15% above gloss.") }),
  r("lam.soft", "coat", P("覆触感膜（肤感膜）", "Soft-touch lamination"), "yuan/m2", 1.2, 0.9, 1.8),
  r("lam.min", "coat", P("覆膜起步价", "Lamination minimum"), "yuan", 120, 80, 200),
  r("varnish", "coat", P("过油（水油 / 光油）", "Varnish (water-based or oil)"), "yuan/m2", 0.15, 0.1, 0.22),
  r("uv.plate", "coat", P("局部 UV 网版", "Spot UV screen"), "yuan", 150, 100, 250),
  r("uv.sheet", "coat", P("局部 UV（对开每张）", "Spot UV, per half-size sheet"), "yuan/pc", 0.06, 0.04, 0.1),
  r("uv.min", "coat", P("局部 UV 起步价", "Spot UV minimum"), "yuan", 200, 150, 300),

  /* foil and embossing */
  r("foil.plate", "foil", P("烫金版（按版面积）", "Foil die (by area)"), "yuan/cm2", 0.6, 0.4, 1, { note: P("腐蚀锌版较便宜，雕刻铜版贵但耐印。", "Etched zinc is cheaper; engraved brass costs more and lasts longer.") }),
  r("foil.plateMin", "foil", P("烫金版最低（每块）", "Foil die minimum (each)"), "yuan", 80, 50, 120),
  r("foil.hit", "foil", P("烫金工费（每张每次）", "Foil stamping (per sheet hit)"), "yuan/pc", 0.035, 0.025, 0.06),
  r("foil.cm2", "foil", P("电化铝耗材（每 cm² 烫印面积）", "Foil consumed (per cm² stamped)"), "yuan/cm2", 0.0006, 0.0003, 0.0012),
  r("foil.holo", "foil", P("镭射烫倍数", "Holographic foil multiplier"), "pct", 260, 200, 300, { src: "foil-rates", note: P("常规 0.03 元/cm²，镭射约 0.08 元/cm²。", "Standard about 0.03 yuan/cm², holographic about 0.08.") }),
  r("foil.min", "foil", P("烫金起步价", "Foil minimum"), "yuan", 200, 150, 300, { src: "foil-rates" }),
  r("emb.plate", "foil", P("击凸 / 压凹版（一副）", "Emboss die pair (by area)"), "yuan/cm2", 1.2, 0.8, 2),
  r("emb.plateMin", "foil", P("击凸版最低（每副）", "Emboss die minimum (each)"), "yuan", 200, 150, 350),
  r("emb.hit", "foil", P("击凸工费（每张每次）", "Embossing (per sheet hit)"), "yuan/pc", 0.04, 0.03, 0.07),
  r("emb.min", "foil", P("击凸起步价", "Embossing minimum"), "yuan", 200, 150, 300),

  /* die-cutting */
  r("die.rule", "die", P("刀版（按刀线长度）", "Cutting die (by metre of rule)"), "yuan/m", 35, 25, 50),
  r("die.min", "die", P("刀版最低", "Cutting die minimum"), "yuan", 150, 100, 250),
  r("cut.q", "die", P("模切（四开，每千张）", "Die-cutting, quarter sheets (per 1,000)"), "yuan/1000", 25, 18, 35),
  r("cut.h", "die", P("模切（对开，每千张）", "Die-cutting, half sheets (per 1,000)"), "yuan/1000", 30, 22, 45),
  r("cut.f", "die", P("模切（全张，每千张）", "Die-cutting, full sheets (per 1,000)"), "yuan/1000", 45, 35, 65),
  r("cut.min", "die", P("模切起步价", "Die-cutting minimum"), "yuan", 150, 100, 250),

  /* gluing and forming */
  r("glue.straight", "convert", P("糊盒（直线 / 侧粘）", "Gluing, straight-line"), "yuan/pc", 0.025, 0.015, 0.04),
  r("glue.crash", "convert", P("糊盒（扣底 / 自锁底）", "Gluing, crash-lock bottom"), "yuan/pc", 0.05, 0.035, 0.08),
  r("glue.hand", "convert", P("手工糊盒", "Hand gluing"), "yuan/pc", 0.15, 0.1, 0.25),
  r("glue.min", "convert", P("糊盒起步价", "Gluing minimum"), "yuan", 200, 150, 300),
  r("mount.m2", "convert", P("裱坑（裱瓦工费，按面积）", "Litho-lam mounting (per m²)"), "yuan/m2", 0.35, 0.25, 0.5),
  r("mount.min", "convert", P("裱坑起步价", "Mounting minimum"), "yuan", 200, 150, 300),
  r("bag.hand", "convert", P("手提袋成型穿绳（手工）", "Carrier bag forming and roping (by hand)"), "yuan/pc", 0.55, 0.35, 0.9),
  r("insert.fit", "convert", P("装内托 / 组装", "Fitting the insert"), "yuan/pc", 0.08, 0.05, 0.15),
  r("window", "convert", P("开窗贴膜（含 PET 片）", "Window patching (PET included)"), "yuan/pc", 0.08, 0.05, 0.15),

  /* rigid boxes */
  r("rigid.lidBase", "rigid", P("天地盖成型裱糊（每套）", "Lid-and-base forming and wrapping (per set)"), "yuan/pc", 1.8, 1.2, 2.8, { note: P("含灰板开槽、围边、裱面纸、贴内衬；全自动线更低。", "Grooving, corner taping, wrapping and lining; automatic lines run lower.") }),
  r("rigid.book", "rigid", P("书型盒成型裱糊（每套）", "Book box forming and wrapping (per set)"), "yuan/pc", 3, 2.2, 4.5),
  r("rigid.drawer", "rigid", P("抽屉盒成型裱糊（每套）", "Drawer box forming and wrapping (per set)"), "yuan/pc", 2.6, 1.8, 3.8),
  r("rigid.tube", "rigid", P("纸罐卷制、裱纸、封底（每只）", "Paper tube winding, wrapping and ends (each)"), "yuan/pc", 1.5, 1, 2.5),
  r("rigid.brocade", "rigid", P("锦盒手工（每只）", "Brocade box handwork (each)"), "yuan/pc", 4.5, 3, 7),
  r("rigid.cut", "rigid", P("灰板开料 / V 槽（每套）", "Greyboard cutting and V-grooving (per set)"), "yuan/pc", 0.15, 0.08, 0.3),
  r("rigid.min", "rigid", P("精装起步价", "Rigid-box minimum"), "yuan", 300, 200, 500),

  /* corrugated */
  r("flute.c3", "flute", P("三层纸板加工费", "3-ply board converting"), "yuan/m2", 0.55, 0.4, 0.7, { src: "flute-factors" }),
  r("flute.c5", "flute", P("五层纸板加工费", "5-ply board converting"), "yuan/m2", 0.85, 0.65, 1.1, { src: "flute-factors" }),
  r("flute.c7", "flute", P("七层纸板加工费", "7-ply board converting"), "yuan/m2", 1.2, 0.95, 1.5, { src: "flute-factors" }),
  r("flute.c2", "flute", P("单面瓦加工费", "Single-face converting"), "yuan/m2", 0.3, 0.2, 0.4, { src: "flute-factors" }),
  r("flexo.plate", "flute", P("水印树脂版（按版面积）", "Flexo photopolymer plate (by area)"), "yuan/cm2", 0.12, 0.08, 0.2),
  r("flexo.run", "flute", P("水印印刷（每色每只）", "Flexo printing (per colour per box)"), "yuan/pc", 0.04, 0.02, 0.06),
  r("flexo.min", "flute", P("水印起步价", "Flexo minimum"), "yuan", 150, 100, 250),
  r("box.make", "flute", P("纸箱开槽成型、钉/粘箱（每只）", "Shipper slotting and joining (each)"), "yuan/pc", 0.12, 0.08, 0.2),

  /* flexible packaging */
  r("cyl", "flex", P("凹印版辊（每色）", "Gravure cylinder (per colour)"), "yuan", 400, 300, 600),
  r("pouch.stand", "flex", P("自立拉链袋制袋（每只）", "Stand-up zip pouch making (each)"), "yuan/pc", 0.12, 0.08, 0.2),
  r("pouch.flat", "flex", P("三边封制袋（每只）", "Three-side seal making (each)"), "yuan/pc", 0.04, 0.025, 0.07),
  r("pouch.moq", "flex", P("凹印起订量", "Gravure minimum order"), "pcs", 10000, 5000, 30000),
  r("pouch.overs", "flex", P("凹印复合损耗", "Gravure and laminating waste"), "pct", 8, 5, 12),
  r("pouch.digital", "flex", P("数码印刷复合膜（免版，小批量）", "Digitally printed laminate (no cylinders, short runs)"), "yuan/m2", 9, 6, 14, { note: P("几百到几千只时比凹印划算。", "Cheaper than gravure from a few hundred to a few thousand.") }),

  /* labels */
  r("label.plate", "label", P("标签树脂版（每色）", "Label plate (per colour)"), "yuan", 120, 80, 180),
  r("label.die", "label", P("标签刀模", "Label die"), "yuan", 200, 120, 350),
  r("label.print", "label", P("标签印刷模切（每㎡）", "Label printing and cutting (per m²)"), "yuan/m2", 1.8, 1.2, 2.8),
  r("label.min", "label", P("标签起步价", "Label minimum"), "yuan", 300, 200, 500),
  r("label.apply", "label", P("贴标（每只）", "Applying the label (each)"), "yuan/pc", 0.03, 0.01, 0.06),

  /* bought-in */
  r("buyin.scale", "buyin", P("外购件尺寸换算指数", "Bought-in size scaling exponent"), "pct", 80, 60, 100, { note: P("外购容器按表面积比例的 0.8 次方换算参考价；以供应商报价为准。", "Bought-in containers scale with the 0.8 power of surface area; supplier quotes win.") }),

  /* proofs, packing, freight */
  r("proof", "job", P("打样（数码样 + 白样，每款）", "Proofs (digital and white sample, per design)"), "yuan", 300, 150, 800),
  r("pack", "job", P("包装入箱（每只）", "Packing into cartons (each)"), "yuan/pc", 0.03, 0.02, 0.05),
  r("freight", "job", P("运费（江浙沪专线，每 kg）", "Freight, Yangtze Delta line (per kg)"), "yuan/kg", 0.35, 0.25, 0.6),

  /* overs */
  r("overs.colour", "overs", P("印刷放数（每色）", "Print overs (per colour)"), "sheets", 50, 30, 100, { note: P("每色加放 30–100 张用于调机。", "30–100 sheets a colour for make-ready.") }),
  r("overs.step", "overs", P("后道放数（每道工序）", "Finishing overs (per step)"), "sheets", 30, 20, 60),
  r("overs.pct", "overs", P("运行损耗", "Running waste"), "pct", 2.5, 1.5, 5),

  /* terms */
  r("overhead", "terms", P("管理费", "Overhead"), "pct", 8, 5, 12),
  r("margin", "terms", P("利润", "Margin"), "pct", 15, 10, 30),
  r("vat", "terms", P("增值税（专票）", "VAT (special invoice)"), "pct", 13, 13, 13),
];

export const BASE_RATE_IDS = new Set(RATES.map((x) => x.id));
export const baseRate = (id: string) => RATES.find((x) => x.id === id);

/** Press sizes: the largest sheet each takes (mm). */
export type Press = "q" | "h" | "f";
export const PRESSES: { id: Press; label: Pair; max: [number, number] }[] = [
  { id: "q", label: { zh: "四开机", en: "Quarter-size press" }, max: [530, 740] },
  { id: "h", label: { zh: "对开机", en: "Half-size press" }, max: [720, 1040] },
  { id: "f", label: { zh: "全张机", en: "Full-size press" }, max: [1200, 1620] },
];

/** The two Chinese full-sheet families and the cuts printers run (开数). */
export type SheetFamily = "zheng" | "da";
export const FULL_SHEETS: Record<SheetFamily, { label: Pair; w: number; h: number }> = {
  zheng: { label: { zh: "正度", en: "Zhengdu" }, w: 787, h: 1092 },
  da: { label: { zh: "大度", en: "Dadu" }, w: 889, h: 1194 },
};
/** A cut of the full sheet: how many it makes and its size. */
export const CUTS: { n: number; label: Pair; size: (w: number, h: number) => [number, number] }[] = [
  { n: 1, label: { zh: "全开", en: "full" }, size: (w, h) => [w, h] },
  { n: 2, label: { zh: "对开", en: "half" }, size: (w, h) => [w, Math.floor(h / 2)] },
  { n: 3, label: { zh: "三开", en: "third" }, size: (w, h) => [w, Math.floor(h / 3)] },
  { n: 4, label: { zh: "四开", en: "quarter" }, size: (w, h) => [Math.floor(w / 2), Math.floor(h / 2)] },
  { n: 6, label: { zh: "六开", en: "sixth" }, size: (w, h) => [Math.floor(w / 2), Math.floor(h / 3)] },
  { n: 8, label: { zh: "八开", en: "eighth" }, size: (w, h) => [Math.floor(w / 2), Math.floor(h / 4)] },
];
