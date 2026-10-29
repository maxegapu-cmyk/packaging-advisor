/**
 * Where the reference prices come from. Every stock and rate in the price book names one of these,
 * with how sure the figure is:
 *  - market:   a published market price for that grade, dated (paper and resin indices, mill notices)
 *  - listing:  prices sellers list publicly for the item (wholesale platforms), dated
 *  - trade:    the usual range factories quote for the step, gathered from how printers in East China
 *              lay out their quotes; to be confirmed with your own suppliers
 *  - derived:  worked out from other entries here (a corrugated board from its papers)
 *  - supplier: entered by you from a supplier's quote (always wins)
 * Client-safe.
 */
import type { Pair } from "../i18n";

export type Confidence = "market" | "listing" | "trade" | "derived" | "supplier";

export const CONFIDENCE_LABELS: Record<Confidence, Pair> = {
  market: { zh: "市场行情", en: "Market index" },
  listing: { zh: "公开挂牌价", en: "Public listings" },
  trade: { zh: "行业经验值，待供应商确认", en: "Trade range, confirm with suppliers" },
  derived: { zh: "由原纸价推算", en: "Derived from the papers" },
  supplier: { zh: "供应商报价", en: "Supplier quote" },
};

export type Source = { id: string; title: Pair; url?: string; date: string; note?: Pair };

export const SOURCES: Source[] = [
  {
    id: "sbb-oct26",
    title: { zh: "生意社白卡纸基准价（10 月 12 日 4006.67 元/吨，含税）；玖龙、博汇、APP 10 月 1 日起上调 200 元/吨", en: "100ppi white folding boxboard benchmark (12 Oct: 4,006.67 yuan/t incl. VAT); Nine Dragons, Bohui and APP up 200 yuan/t from 1 Oct" },
    url: "https://news.qq.com/rain/a/20261012A0C0SQ00",
    date: "2026-10-12",
  },
  {
    id: "duplex-aug26",
    title: { zh: "无锡经销商灰底白板纸报价 3687–4087 元/吨（含税）", en: "Wuxi distributor quotes for grey-back duplex board, 3,687–4,087 yuan/t incl. VAT" },
    url: "https://www.100ppi.com/mprice/detail-21481371.html",
    date: "2026-08-17",
  },
  {
    id: "coated-sep26",
    title: { zh: "铜版纸 9 月均价约 5450 元/吨（含税），10 月起文化纸再涨 200 元/吨", en: "Coated paper averaged about 5,450 yuan/t in September (incl. VAT); culture papers up a further 200 from October" },
    url: "https://m.jiemian.com/article/5124702.html",
    date: "2026-09-30",
  },
  {
    id: "nbs-oct26",
    title: { zh: "国家统计局 10 月中旬流通领域重要生产资料价格：AA 级 120g 瓦楞纸 3098.8 元/吨；LLDPE 9999 元/吨；拉丝 PP 10666 元/吨；A00 铝锭 23570 元/吨", en: "NBS means of production, 11–20 Oct: AA 120 g corrugating medium 3,098.8 yuan/t; LLDPE 9,999; PP 10,666; A00 aluminium 23,570" },
    url: "https://www.stats.gov.cn/english/PressRelease/202610/t20261023_1965682.html",
    date: "2026-10-20",
  },
  {
    id: "flute-factors",
    title: { zh: "纸箱计价公式与瓦楞收缩率（A 1.59、B 1.36、C 1.50、E 1.27），修边 60 mm、舌边 40 mm", en: "Carton pricing formula and flute take-up (A 1.59, B 1.36, C 1.50, E 1.27), 60 mm trim and 40 mm joint" },
    url: "https://m.maigoo.com/goomai/283092.html",
    date: "2026-10-28",
  },
  {
    id: "quote-method",
    title: { zh: "彩盒报价构成：纸张（令重×克数×吨价÷开数×印数×损耗）+ 印前 + 开机费 + 印后 + 税 + 运输", en: "How colour boxes are quoted: paper (ream weight × gsm × tonne price ÷ ups × run × waste) + prepress + make-ready + finishing + tax + freight" },
    url: "https://www.lukkapack.com/Article/bzchsccjrh.html",
    date: "2026-10-28",
  },
  {
    id: "film-fees",
    title: { zh: "胶片/版费按开数计：8 开 30 元、4 开 60 元、对开 100 元", en: "Film and plate fees by sheet size: 8-up 30, quarter 60, half 100 yuan" },
    url: "https://dybhys.com/index.php?a=index&aid=537&c=View&m=home",
    date: "2026-10-28",
  },
  {
    id: "foil-rates",
    title: { zh: "烫金常规 0.03 元/cm²、镭射 0.08 元/cm²；哑膜比亮膜贵约 15%", en: "Hot foil about 0.03 yuan/cm², holographic 0.08; matte film about 15% dearer than gloss" },
    url: "https://www.bilibili.com/read/cv48274803",
    date: "2026-10-28",
  },
  {
    id: "tins-1688",
    title: { zh: "1688 茶叶铁罐挂牌价：二两方罐 3.2 元、50 g 圆罐 2.0–2.14 元、迷你罐 1.5 元", en: "1688 tea tin listings: 100 g square 3.2 yuan, 50 g round 2.0–2.14, mini 1.5" },
    url: "https://www.1688.com/market/-C2EDBFDACCFACCFAB9DECCFABAD0.html",
    date: "2026-10-28",
  },
  {
    id: "trade",
    title: { zh: "华东包装印刷厂常见报价区间（经验值）：请以你的供应商报价替换", en: "Usual quoting ranges of East China packaging printers (experience): replace with your suppliers' quotes" },
    date: "2026-10-28",
  },
];

export const sourceById = (id: string): Source | undefined => SOURCES.find((s) => s.id === id);

/** Chinese VAT on goods (增值税), used to turn the tax-inclusive market prices into the book's net prices. */
export const VAT = 0.13;
export const net = (incl: number) => Math.round((incl / (1 + VAT)) * 100) / 100;
