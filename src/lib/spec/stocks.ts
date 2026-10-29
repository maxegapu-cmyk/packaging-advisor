/**
 * The stock library: what a packaging buyer actually orders, named as the trade names it (350 g
 * 白卡, 2 mm 灰板, 三层 B 瓦 K=K, PET12/VMPET12/PE80…), each with its price basis, a reference
 * price net of VAT and the range seen, where the figure comes from, and the material number on the
 * principal's list it is made of (so the compliance rules, the 3D look and the print checks follow
 * the stock). Prices are edited in the price book (book.ts); these are the defaults.
 * Client-safe.
 */
import type { Pair } from "../i18n";
import { net, type Confidence } from "./sources";

export type StockKind = "board" | "paper" | "special" | "greyboard" | "tube" | "flute" | "laminate" | "label" | "fabric" | "container" | "insert" | "trim";
export type Basis = "ton" | "m2" | "piece" | "litre";

export const BASIS_UNIT: Record<Basis, Pair> = {
  ton: { zh: "元/吨", en: "yuan/t" },
  m2: { zh: "元/㎡", en: "yuan/m²" },
  piece: { zh: "元/个", en: "yuan/pc" },
  litre: { zh: "元/升", en: "yuan/L" },
};

export const KIND_LABELS: Record<StockKind, Pair> = {
  board: { zh: "卡纸与白板", en: "Folding boxboard" },
  paper: { zh: "面纸与印刷纸", en: "Printing and wrapping papers" },
  special: { zh: "特种纸", en: "Speciality papers" },
  greyboard: { zh: "灰板", en: "Greyboard" },
  tube: { zh: "纸管纸板", en: "Tube board" },
  flute: { zh: "瓦楞纸板", en: "Corrugated board" },
  laminate: { zh: "软包装复合膜", en: "Flexible laminates" },
  label: { zh: "不干胶标签材料", en: "Label stock" },
  fabric: { zh: "布料", en: "Fabrics" },
  container: { zh: "外购容器", en: "Bought-in containers" },
  insert: { zh: "内托", en: "Inserts" },
  trim: { zh: "配件", en: "Fittings" },
};

/** One layer of a corrugated board: a liner (paper id from FLUTE_PAPERS) or a fluted medium. */
export type Ply = { paper: keyof typeof FLUTE_PAPERS; gsm: number; flute?: "A" | "B" | "C" | "E" | "F" };

export type Stock = {
  id: string;
  kind: StockKind;
  name: Pair;
  /** what suppliers call it, when it differs from the name */
  trade?: string;
  /** the principal's material number it is made of */
  mid: string;
  basis: Basis;
  /** reference price net of VAT, per basis; null for a corrugated board priced from its papers */
  price: number | null;
  low?: number;
  high?: number;
  src: string;
  conf: Confidence;
  /** grammages sold (g/m²); `gsm` is the usual one */
  gsms?: number[];
  gsm?: number;
  /** a corrugated board's layers, outside first */
  plies?: Ply[];
  /** flute thickness, mm */
  caliper?: number;
  /** a bought-in container's reference size (mm: w, h, d) its price is for; others scale by surface */
  ref?: { w: number; h: number; d: number };
  /** the supplier's minimum order, pieces */
  moq?: number;
  /** one-off: a new mould or tooling for a non-standard size (yuan) */
  tooling?: number;
  /** one-off: plates or set-up per design (yuan) */
  setup?: number;
  /** cleared for direct food contact by the maker (with its declaration) */
  food?: boolean;
  note?: Pair;
};

const P = (zh: string, en: string): Pair => ({ zh, en });

/**
 * The papers corrugated boards are built from, tonne prices net of VAT. Kraft liner and white-top
 * liner are trade ranges; the medium follows the NBS AA 120 g index.
 */
export const FLUTE_PAPERS = {
  kraft: { name: P("牛卡纸（K 级）", "Kraft liner (K grade)"), price: net(4200), src: "trade", conf: "trade" as Confidence },
  test: { name: P("箱板纸（A 级，再生）", "Test liner (A grade, recycled)"), price: net(3600), src: "trade", conf: "trade" as Confidence },
  white: { name: P("白面牛卡", "White-top liner"), price: net(4800), src: "trade", conf: "trade" as Confidence },
  medium: { name: P("瓦楞原纸（AA 级）", "Corrugating medium (AA)"), price: net(3099), src: "nbs-oct26", conf: "market" as Confidence },
} as const;
/** How much more medium a flute takes than the board's area. */
export const TAKE_UP = { A: 1.59, B: 1.36, C: 1.5, E: 1.27, F: 1.2 } as const;

const greyNote = P("灰板密度约 0.65 g/cm³：650 g≈1.0 mm，1000 g≈1.5 mm，1300 g≈2.0 mm，1600 g≈2.5 mm，2000 g≈3.0 mm。", "Greyboard runs about 0.65 g/cm³: 650 g ≈ 1.0 mm, 1000 g ≈ 1.5 mm, 1300 g ≈ 2.0 mm, 1600 g ≈ 2.5 mm, 2000 g ≈ 3.0 mm.");

export const STOCKS: Stock[] = [
  /* ------------------------------------------------------------ folding boxboard (sheets, by the tonne) */
  {
    id: "fbb",
    kind: "board",
    name: P("白卡纸（FBB）", "Folding boxboard (FBB)"),
    trade: "白卡",
    mid: "M001",
    basis: "ton",
    price: net(4250),
    low: net(4050),
    high: net(4800),
    src: "sbb-oct26",
    conf: "market",
    gsms: [210, 230, 250, 270, 300, 350, 400],
    gsm: 350,
    note: P("厂家基准价约 4007 元/吨（含税），到印厂按品牌加 100–800 元。彩盒主力用纸。", "Mill benchmark about 4,007 yuan/t incl. VAT; printers pay 100–800 more by brand. The workhorse of folding cartons."),
  },
  {
    id: "fbbFood",
    kind: "board",
    name: P("食品级白卡", "Food-grade FBB"),
    trade: "食品卡",
    mid: "M001",
    basis: "ton",
    price: net(5200),
    low: net(4800),
    high: net(5800),
    src: "trade",
    conf: "trade",
    gsms: [230, 250, 280, 300, 350],
    gsm: 300,
    food: true,
    note: P("原生木浆、可直接接触食品，需供应商提供 GB 4806.8 符合性声明。", "Virgin fibre, for direct food contact; the supplier gives a GB 4806.8 declaration."),
  },
  {
    id: "duplex",
    kind: "board",
    name: P("灰底白板纸", "Grey-back duplex board"),
    trade: "白板",
    mid: "M002",
    basis: "ton",
    price: net(3887),
    low: net(3687),
    high: net(4087),
    src: "duplex-aug26",
    conf: "market",
    gsms: [230, 250, 300, 350, 400, 450],
    gsm: 350,
    note: P("比白卡便宜约 10%，背面灰色，适合外盒、彩箱面纸与裱坑面纸；不可直接接触食品。", "About 10% cheaper than FBB with a grey back: outer cartons and litho-lam facings; not for direct food contact."),
  },
  {
    id: "duplexWB",
    kind: "board",
    name: P("白底白板纸", "White-back duplex board"),
    mid: "M003",
    basis: "ton",
    price: net(4150),
    low: net(3950),
    high: net(4400),
    src: "trade",
    conf: "trade",
    gsms: [250, 300, 350, 400],
    gsm: 350,
  },
  {
    id: "kraftCard",
    kind: "board",
    name: P("牛卡纸（本色）", "Kraft board (brown)"),
    trade: "牛卡",
    mid: "M007",
    basis: "ton",
    price: net(4200),
    low: net(3900),
    high: net(4600),
    src: "trade",
    conf: "trade",
    gsms: [170, 200, 230, 250, 300, 350],
    gsm: 300,
    note: P("本色牛皮纸观感，印刷色彩偏暗，常见于自然、农产品风格。", "The brown kraft look; colours print darker. Common for natural and farm-produce styles."),
  },
  {
    id: "blackCard",
    kind: "board",
    name: P("黑卡纸", "Black board"),
    mid: "M017",
    basis: "ton",
    price: net(9500),
    low: net(8000),
    high: net(12000),
    src: "trade",
    conf: "trade",
    gsms: [150, 200, 250, 300, 350],
    gsm: 300,
    note: P("通体黑色，只适合烫金、烫银或 UV，不能四色印刷。", "Black through; for foil and UV only, it can't take four-colour print."),
  },

  /* ------------------------------------------------------------ printing and wrapping papers */
  {
    id: "art",
    kind: "paper",
    name: P("铜版纸（双铜）", "Coated art paper (C2S)"),
    trade: "铜版纸",
    mid: "M020",
    basis: "ton",
    price: net(5800),
    low: net(5450),
    high: net(6300),
    src: "coated-sep26",
    conf: "market",
    gsms: [105, 128, 157, 200, 250, 300],
    gsm: 157,
    note: P("精装盒面纸首选：157 g 裱灰板最常见，印刷还原好，覆膜后耐磨。", "The usual rigid-box wrap: 157 g on greyboard is the norm; prints true and wears well once laminated."),
  },
  {
    id: "matteArt",
    kind: "paper",
    name: P("哑粉纸", "Matte coated paper"),
    mid: "M020",
    basis: "ton",
    price: net(5950),
    low: net(5600),
    high: net(6400),
    src: "trade",
    conf: "trade",
    gsms: [105, 128, 157, 200, 250],
    gsm: 157,
  },
  {
    id: "offset",
    kind: "paper",
    name: P("双胶纸", "Uncoated offset paper"),
    mid: "M021",
    basis: "ton",
    price: net(4600),
    low: net(4300),
    high: net(5000),
    src: "trade",
    conf: "trade",
    gsms: [70, 80, 100, 120, 140],
    gsm: 100,
    note: P("说明书、标签、内衬纸；不覆膜时手感自然。", "Leaflets, labels and lining papers; a natural feel unlaminated."),
  },
  {
    id: "whiteKraft",
    kind: "paper",
    name: P("白牛皮纸", "Bleached kraft paper"),
    mid: "M005",
    basis: "ton",
    price: net(7300),
    low: net(6500),
    high: net(8500),
    src: "trade",
    conf: "trade",
    gsms: [100, 120, 140, 160, 200, 250],
    gsm: 140,
    note: P("手提袋、纸袋常用；强度高，可水性印刷。", "Common for carrier and paper bags; strong, prints with water-based inks."),
  },
  {
    id: "brownKraft",
    kind: "paper",
    name: P("本色牛皮纸", "Unbleached kraft paper"),
    mid: "M004",
    basis: "ton",
    price: net(5200),
    low: net(4800),
    high: net(5800),
    src: "trade",
    conf: "trade",
    gsms: [80, 100, 120, 140, 160],
    gsm: 120,
  },

  /* ------------------------------------------------------------ speciality papers */
  { id: "touchPaper", kind: "special", name: P("触感纸（肤感特种纸）", "Soft-touch speciality paper"), mid: "M029", basis: "ton", price: net(26000), low: net(20000), high: net(36000), src: "trade", conf: "trade", gsms: [120, 140, 157, 200, 250], gsm: 140, note: P("自带肤感，免覆膜；常用于高端礼盒面纸。", "Soft to the touch without film; for premium gift-box wraps.") },
  { id: "pearl", kind: "special", name: P("珠光纸", "Pearlescent paper"), mid: "M030", basis: "ton", price: net(21000), low: net(16000), high: net(28000), src: "trade", conf: "trade", gsms: [120, 150, 200, 250], gsm: 150 },
  { id: "embossed", kind: "special", name: P("压纹艺术纸", "Embossed art paper"), mid: "M031", basis: "ton", price: net(16000), low: net(12000), high: net(24000), src: "trade", conf: "trade", gsms: [120, 140, 157, 200], gsm: 140, note: P("自带布纹、皮纹等纹理，常配烫金。", "Linen or leather grain built in; often paired with foil.") },
  { id: "cottonArt", kind: "special", name: P("棉浆艺术纸", "Cotton art paper"), mid: "M037", basis: "ton", price: net(32000), low: net(24000), high: net(45000), src: "trade", conf: "trade", gsms: [120, 150, 200, 250, 300], gsm: 150 },
  { id: "leatherette", kind: "special", name: P("充皮纸", "Leatherette paper"), mid: "M028", basis: "m2", price: net(4.5), low: net(3), high: net(7), src: "trade", conf: "trade", gsm: 120, note: P("仿皮纹理，耐磨，多用于首饰盒、酒盒，烫印为主。", "Leather-like and hard-wearing: jewellery and wine boxes, usually foiled rather than printed.") },
  { id: "foilPaper", kind: "special", name: P("铝箔复合纸（内衬）", "Foil-lined paper (liner)"), mid: "M033", basis: "m2", price: 1.6, low: 1.2, high: 2.2, src: "trade", conf: "trade", gsm: 70, food: true },
  { id: "handmade", kind: "special", name: P("手工宣纸 / 洒金笺", "Handmade xuan / gold-fleck paper"), mid: "M038", basis: "m2", price: net(6), low: net(3.5), high: net(12), src: "trade", conf: "trade", gsm: 60, note: P("手工纸张张不同，裱糊损耗高，起订量看纸坊库存。", "Every sheet differs; mounting waste runs high; minimums depend on the mill's stock.") },

  /* ------------------------------------------------------------ greyboard and tube board */
  {
    id: "greyboard",
    kind: "greyboard",
    name: P("双灰板", "Greyboard"),
    trade: "灰板",
    mid: "M016",
    basis: "ton",
    price: net(3000),
    low: net(2600),
    high: net(3400),
    src: "trade",
    conf: "trade",
    gsms: [650, 1000, 1200, 1300, 1600, 2000],
    gsm: 1300,
    note: greyNote,
  },
  {
    id: "greyboardHD",
    kind: "greyboard",
    name: P("高密度灰板（硬挺）", "High-density greyboard"),
    mid: "M016",
    basis: "ton",
    price: net(4300),
    low: net(3800),
    high: net(5200),
    src: "trade",
    conf: "trade",
    gsms: [1000, 1300, 1600, 2000],
    gsm: 1300,
    note: P("更平整、不易翘，适合大尺寸书型盒与磁吸翻盖。", "Flatter and less prone to warp: large book boxes and magnetic flaps."),
  },
  { id: "tubeBoard", kind: "tube", name: P("纸管原纸（卷制）", "Tube board (spiral-wound)"), mid: "M027", basis: "ton", price: net(3300), low: net(3000), high: net(3800), src: "trade", conf: "trade", gsms: [250, 300, 360, 420], gsm: 360, note: P("纸罐壁由 4–6 层卷制，壁厚约 1.5–2.5 mm。", "Tube walls are wound from 4–6 plies, about 1.5–2.5 mm thick.") },

  /* ------------------------------------------------------------ corrugated board (by the m², from its papers) */
  {
    id: "eSingle",
    kind: "flute",
    name: P("单面 E 瓦（裱坑用）", "Single-face E-flute (for litho-lam)"),
    mid: "M015",
    basis: "m2",
    price: null,
    src: "flute-factors",
    conf: "derived",
    plies: [{ paper: "medium", gsm: 120, flute: "E" }, { paper: "test", gsm: 140 }],
    caliper: 1.5,
    note: P("彩印面纸裱在单面瓦上，就是常见的彩色飞机盒、彩箱。", "A printed facing mounted on single-face flute: the usual colour mailer or retail carton."),
  },
  {
    id: "bSingle",
    kind: "flute",
    name: P("单面 B 瓦（裱坑用）", "Single-face B-flute (for litho-lam)"),
    mid: "M012",
    basis: "m2",
    price: null,
    src: "flute-factors",
    conf: "derived",
    plies: [{ paper: "medium", gsm: 120, flute: "B" }, { paper: "test", gsm: 160 }],
    caliper: 3,
  },
  { id: "e3White", kind: "flute", name: P("三层 E 瓦（白面）", "3-ply E-flute, white top"), mid: "M015", basis: "m2", price: null, src: "flute-factors", conf: "derived", plies: [{ paper: "white", gsm: 170 }, { paper: "medium", gsm: 120, flute: "E" }, { paper: "kraft", gsm: 170 }], caliper: 1.5, note: P("可直接胶印或水印的白面微瓦，电商飞机盒常用。", "White-top micro flute that takes offset or flexo direct: a common e-commerce mailer board.") },
  { id: "e3Kraft", kind: "flute", name: P("三层 E 瓦（牛卡 K=K）", "3-ply E-flute, kraft K=K"), mid: "M015", basis: "m2", price: null, src: "flute-factors", conf: "derived", plies: [{ paper: "kraft", gsm: 170 }, { paper: "medium", gsm: 120, flute: "E" }, { paper: "kraft", gsm: 170 }], caliper: 1.5 },
  { id: "b3KK", kind: "flute", name: P("三层 B 瓦（K=K）", "3-ply B-flute (K=K)"), mid: "M012", basis: "m2", price: null, src: "flute-factors", conf: "derived", plies: [{ paper: "kraft", gsm: 170 }, { paper: "medium", gsm: 120, flute: "B" }, { paper: "kraft", gsm: 170 }], caliper: 3 },
  { id: "b3AA", kind: "flute", name: P("三层 B 瓦（A=A，经济型）", "3-ply B-flute (A=A, economy)"), mid: "M012", basis: "m2", price: null, src: "flute-factors", conf: "derived", plies: [{ paper: "test", gsm: 140 }, { paper: "medium", gsm: 105, flute: "B" }, { paper: "test", gsm: 140 }], caliper: 3 },
  { id: "be5", kind: "flute", name: P("五层 BE 瓦", "5-ply BE-flute"), mid: "M013", basis: "m2", price: null, src: "flute-factors", conf: "derived", plies: [{ paper: "kraft", gsm: 170 }, { paper: "medium", gsm: 120, flute: "B" }, { paper: "test", gsm: 120 }, { paper: "medium", gsm: 120, flute: "E" }, { paper: "kraft", gsm: 170 }], caliper: 4.5 },
  { id: "bc5", kind: "flute", name: P("五层 BC 瓦（K=K）", "5-ply BC-flute (K=K)"), mid: "M013", basis: "m2", price: null, src: "flute-factors", conf: "derived", plies: [{ paper: "kraft", gsm: 170 }, { paper: "medium", gsm: 120, flute: "B" }, { paper: "test", gsm: 120 }, { paper: "medium", gsm: 120, flute: "C" }, { paper: "kraft", gsm: 170 }], caliper: 7, note: P("电商外箱、家电纸箱主力。", "The standard e-commerce shipper and appliance carton.") },
  { id: "bcb7", kind: "flute", name: P("七层 BCB 瓦", "7-ply BCB-flute"), mid: "M014", basis: "m2", price: null, src: "flute-factors", conf: "derived", plies: [{ paper: "kraft", gsm: 200 }, { paper: "medium", gsm: 120, flute: "B" }, { paper: "test", gsm: 120 }, { paper: "medium", gsm: 120, flute: "C" }, { paper: "test", gsm: 120 }, { paper: "medium", gsm: 120, flute: "B" }, { paper: "kraft", gsm: 200 }], caliper: 10 },

  /* ------------------------------------------------------------ flexible laminates (printed, by the m²) */
  { id: "oppCpp", kind: "laminate", name: P("BOPP20 / VMCPP25（镀铝）", "BOPP20 / VMCPP25 (metallised)"), trade: "OPP/镀铝CPP", mid: "M085", basis: "m2", price: 1.0, low: 0.85, high: 1.25, src: "trade", conf: "trade", gsm: 41, food: true, note: P("膨化、糖果、饼干的经济型阻隔结构。含印刷与复合。", "The economy barrier for crisps, sweets and biscuits. Printed and laminated.") },
  { id: "petVmpetPe", kind: "laminate", name: P("PET12 / VMPET12 / PE80", "PET12 / VMPET12 / PE80"), mid: "M084", basis: "m2", price: 1.75, low: 1.5, high: 2.1, src: "trade", conf: "trade", gsm: 108, food: true, note: P("茶叶、咖啡、坚果常用的高阻隔三层结构。", "The high-barrier three-ply for tea, coffee and nuts.") },
  { id: "petAlPe", kind: "laminate", name: P("PET12 / AL7 / PE80（铝箔）", "PET12 / AL7 / PE80 (foil)"), mid: "M083", basis: "m2", price: 2.15, low: 1.85, high: 2.6, src: "trade", conf: "trade", gsm: 111, food: true, note: P("阻隔最好，避光防潮，适合茶叶内袋、奶粉、宠物食品。", "The best barrier against light and moisture: tea inner bags, milk powder, pet food.") },
  { id: "kraftVmpetPe", kind: "laminate", name: P("牛皮纸 / VMPET12 / PE70", "Kraft / VMPET12 / PE70"), mid: "M084", basis: "m2", price: 1.95, low: 1.7, high: 2.4, src: "trade", conf: "trade", gsm: 135, food: true, note: P("外层牛皮纸的自然观感，内层镀铝阻隔；外层纸材料为 M004。", "A kraft outside for the natural look with a metallised barrier inside; the outer paper is M004.") },
  { id: "petPe", kind: "laminate", name: P("PET12 / PE60（透明）", "PET12 / PE60 (clear)"), mid: "M081", basis: "m2", price: 1.45, low: 1.2, high: 1.75, src: "trade", conf: "trade", gsm: 72, food: true },
  { id: "nyPe", kind: "laminate", name: P("NY15 / PE70（真空、冷冻）", "NY15 / PE70 (vacuum, frozen)"), mid: "M082", basis: "m2", price: 1.85, low: 1.6, high: 2.2, src: "trade", conf: "trade", gsm: 82, food: true },
  { id: "monoPe", kind: "laminate", name: P("MDO-PE / PE（单一材质，可回收）", "MDO-PE / PE (mono-material, recyclable)"), mid: "M051", basis: "m2", price: 1.7, low: 1.45, high: 2.1, src: "trade", conf: "trade", gsm: 95, food: true, note: P("全 PE 结构可进入 PE 回收流，阻隔低于铝箔结构。", "All-PE so it can go into PE recycling; less barrier than foil.") },

  /* ------------------------------------------------------------ label stock */
  { id: "labelArt", kind: "label", name: P("铜版不干胶", "Coated paper label stock"), mid: "M019", basis: "m2", price: 1.4, low: 1.1, high: 1.8, src: "trade", conf: "trade", gsm: 80 },
  { id: "labelPP", kind: "label", name: P("PP 合成纸不干胶（防水）", "PP synthetic label stock (water-resistant)"), mid: "M079", basis: "m2", price: 2.4, low: 2, high: 3, src: "trade", conf: "trade", gsm: 80, note: P("洗护、冷藏产品首选，遇水不起皱。", "The choice for bathroom and chilled products: it doesn't wrinkle when wet.") },
  { id: "labelClear", kind: "label", name: P("透明 BOPP 不干胶", "Clear BOPP label stock"), mid: "M053", basis: "m2", price: 2.2, low: 1.8, high: 2.8, src: "trade", conf: "trade", gsm: 60 },

  /* ------------------------------------------------------------ fabrics */
  { id: "brocadeCloth", kind: "fabric", name: P("提花织锦（涤纶）", "Jacquard brocade (polyester)"), mid: "M126", basis: "m2", price: 14, low: 9, high: 25, src: "trade", conf: "trade" },
  { id: "satin", kind: "fabric", name: P("缎面布", "Satin"), mid: "M128", basis: "m2", price: 7, low: 5, high: 11, src: "trade", conf: "trade" },
  { id: "linen", kind: "fabric", name: P("棉麻布", "Cotton-linen"), mid: "M123", basis: "m2", price: 12, low: 8, high: 18, src: "trade", conf: "trade" },

  /* ------------------------------------------------------------ bought-in containers (per piece, at a reference size) */
  { id: "tinRound", kind: "container", name: P("马口铁圆罐（印铁四色）", "Tinplate round tin (printed 4C)"), trade: "马口铁罐", mid: "M099", basis: "piece", price: net(3.6), low: net(2.2), high: net(5.5), src: "tins-1688", conf: "listing", ref: { w: 86, h: 120, d: 86 }, moq: 3000, setup: 1500, tooling: 8000, food: true, note: P("1688 现货素罐 50 g 约 2 元、二两约 3.2 元；定制印铁加印版费，非标尺寸需开模。", "Stock plain tins list at about 2 yuan (50 g) and 3.2 yuan (100 g) on 1688; custom printing adds plates, and a non-standard size needs new tooling.") },
  { id: "tinSquare", kind: "container", name: P("马口铁方罐（印铁四色）", "Tinplate square tin (printed 4C)"), mid: "M099", basis: "piece", price: net(3.8), low: net(2.5), high: net(6), src: "tins-1688", conf: "listing", ref: { w: 75, h: 120, d: 75 }, moq: 3000, setup: 1500, tooling: 9000, food: true },
  { id: "alCan", kind: "container", name: P("两片铝罐 330 mL", "Two-piece aluminium can, 330 mL"), mid: "M101", basis: "piece", price: 0.48, low: 0.4, high: 0.6, src: "trade", conf: "trade", ref: { w: 66, h: 115, d: 66 }, moq: 200000, setup: 6000, food: true, note: P("罐厂起订量很高；小批量可用素罐 + 收缩膜套标。", "Can makers' minimums are high; for short runs use plain cans with shrink sleeves.") },
  { id: "glassJar", kind: "container", name: P("钠钙玻璃罐 + 马口铁旋盖", "Soda-lime glass jar with tinplate lug cap"), mid: "M106", basis: "piece", price: 1.1, low: 0.8, high: 1.6, src: "trade", conf: "trade", ref: { w: 80, h: 95, d: 80 }, moq: 5000, tooling: 12000, food: true },
  { id: "glassBottle", kind: "container", name: P("晶白料玻璃酒瓶", "Flint glass spirits bottle"), mid: "M106", basis: "piece", price: 2.6, low: 1.6, high: 4.5, src: "trade", conf: "trade", ref: { w: 72, h: 230, d: 72 }, moq: 10000, tooling: 15000, food: true, note: P("公模瓶价低；独立瓶型开模 1–3 万元，起订 1 万只以上。", "Stock moulds are cheap; your own bottle shape needs 10–30k yuan of moulds and 10,000+ pieces.") },
  { id: "petBottle", kind: "container", name: P("PET 吹塑瓶", "PET blow-moulded bottle"), mid: "M057", basis: "piece", price: 0.75, low: 0.45, high: 1.3, src: "trade", conf: "trade", ref: { w: 52, h: 170, d: 52 }, moq: 5000, tooling: 6000 },
  { id: "hdpeBottle", kind: "container", name: P("HDPE 吹塑瓶", "HDPE blow-moulded bottle"), mid: "M047", basis: "piece", price: 0.65, low: 0.4, high: 1.1, src: "trade", conf: "trade", ref: { w: 52, h: 170, d: 52 }, moq: 5000, tooling: 6000 },
  { id: "peTube", kind: "container", name: P("PE 软管（含翻盖、印刷）", "PE squeeze tube (cap and print included)"), mid: "M045", basis: "piece", price: 0.95, low: 0.6, high: 1.5, src: "trade", conf: "trade", ref: { w: 38, h: 160, d: 38 }, moq: 10000, setup: 800 },
  { id: "abl", kind: "container", name: P("铝塑复合软管（ABL）", "Aluminium-barrier laminate tube (ABL)"), mid: "M083", basis: "piece", price: 1.05, low: 0.7, high: 1.6, src: "trade", conf: "trade", ref: { w: 38, h: 160, d: 38 }, moq: 10000, setup: 1200 },
  { id: "aseptic", kind: "container", name: P("无菌复合纸盒", "Aseptic carton"), mid: "M096", basis: "piece", price: 0.35, low: 0.28, high: 0.45, src: "trade", conf: "trade", ref: { w: 63, h: 166, d: 95 }, moq: 500000, note: P("需配套灌装线，适合大批量饮料。", "Needs a matching filling line: for high-volume drinks.") },
  { id: "ceramicJar", kind: "container", name: P("陶瓷罐（釉上贴花）", "Porcelain caddy (overglaze decal)"), mid: "M108", basis: "piece", price: 12, low: 7, high: 30, src: "trade", conf: "trade", ref: { w: 90, h: 120, d: 90 }, moq: 1000, setup: 1500, tooling: 3000 },
  { id: "pineCrate", kind: "container", name: P("松木盒（激光雕刻）", "Pine crate (laser-engraved)"), mid: "M110", basis: "piece", price: 28, low: 18, high: 45, src: "trade", conf: "trade", ref: { w: 300, h: 140, d: 220 }, moq: 500 },
  { id: "bambooCrate", kind: "container", name: P("竹盒", "Bamboo box"), mid: "M118", basis: "piece", price: 32, low: 20, high: 55, src: "trade", conf: "trade", ref: { w: 300, h: 140, d: 220 }, moq: 500 },
  { id: "blisterPet", kind: "container", name: P("APET 吸塑泡罩", "APET thermoformed blister"), mid: "M058", basis: "piece", price: 0.18, low: 0.1, high: 0.35, src: "trade", conf: "trade", ref: { w: 120, h: 180, d: 28 }, moq: 5000, tooling: 1500 },

  /* ------------------------------------------------------------ inserts */
  { id: "flockTray", kind: "insert", name: P("植绒吸塑内托", "Flocked thermoformed tray"), mid: "M036", basis: "m2", price: 6.5, low: 4.5, high: 9, src: "trade", conf: "trade", tooling: 800, note: P("按内托投影面积计；模具约 500–1500 元。", "Priced by the tray's footprint; the mould costs about 500–1,500 yuan.") },
  { id: "eva", kind: "insert", name: P("EVA 内托（雕刻/冲型）", "EVA insert (cut or CNC)"), mid: "M141", basis: "litre", price: 0.95, low: 0.7, high: 1.4, src: "trade", conf: "trade", tooling: 300, note: P("按内托外形体积计；植绒或贴绒另加约 0.3 元。", "Priced by the block's volume; flocking or a velvet facing adds about 0.3 yuan.") },
  { id: "epe", kind: "insert", name: P("EPE 珍珠棉内衬", "EPE foam insert"), mid: "M138", basis: "litre", price: 0.38, low: 0.25, high: 0.55, src: "trade", conf: "trade", tooling: 200 },
  { id: "pulpDry", kind: "insert", name: P("纸浆模塑内托（干压）", "Moulded pulp tray (dry-pressed)"), mid: "M145", basis: "m2", price: 9, low: 6, high: 14, src: "trade", conf: "trade", tooling: 6000, moq: 5000, note: P("按投影面积计；湿压精品浆托单价约 2–3 倍，模具 2 万元以上。", "Priced by footprint; wet-pressed fine pulp costs 2–3× with moulds from 20k yuan.") },
  { id: "bagassePulp", kind: "insert", name: P("甘蔗渣浆模塑内托", "Bagasse pulp tray"), mid: "M148", basis: "m2", price: 11, low: 7, high: 16, src: "trade", conf: "trade", tooling: 8000, moq: 5000 },

  /* ------------------------------------------------------------ fittings */
  { id: "ropeHandle", kind: "trim", name: P("手提绳（一对）", "Rope handles (pair)"), mid: "M126", basis: "piece", price: 0.18, low: 0.1, high: 0.4, src: "trade", conf: "trade" },
  { id: "cottonHandle", kind: "trim", name: P("棉绳手提（一对）", "Cotton rope handles (pair)"), mid: "M122", basis: "piece", price: 0.32, low: 0.2, high: 0.6, src: "trade", conf: "trade" },
  { id: "ribbon", kind: "trim", name: P("丝带拉手", "Ribbon pull"), mid: "M128", basis: "piece", price: 0.12, low: 0.06, high: 0.25, src: "trade", conf: "trade" },
  { id: "magnets", kind: "trim", name: P("钕铁硼磁铁（一对）", "Neodymium magnets (pair)"), mid: "", basis: "piece", price: 0.14, low: 0.08, high: 0.3, src: "trade", conf: "trade" },
  { id: "lotionPump", kind: "trim", name: P("乳液泵（含吸管）", "Lotion pump with dip tube"), mid: "M052", basis: "piece", price: 0.85, low: 0.5, high: 1.5, src: "trade", conf: "trade" },
  { id: "screwCap", kind: "trim", name: P("PP 旋盖", "PP screw cap"), mid: "M052", basis: "piece", price: 0.12, low: 0.06, high: 0.25, src: "trade", conf: "trade" },
  { id: "corkStopper", kind: "trim", name: P("软木塞（含塞头）", "Cork stopper with head"), mid: "M120", basis: "piece", price: 0.9, low: 0.5, high: 2, src: "trade", conf: "trade" },
  { id: "toggle", kind: "trim", name: P("锦盒骨扣与绳圈", "Brocade toggle and loop"), mid: "M069", basis: "piece", price: 0.35, low: 0.2, high: 0.8, src: "trade", conf: "trade" },
  { id: "included", kind: "trim", name: P("已含在容器价中", "Included in the container price"), mid: "", basis: "piece", price: 0, src: "trade", conf: "trade" },
];

const BY_ID = new Map(STOCKS.map((s) => [s.id, s]));
export const baseStock = (id: string): Stock | undefined => BY_ID.get(id);
export const BASE_STOCK_IDS = new Set(STOCKS.map((s) => s.id));

/** Thickness of a sheet stock, mm (greyboard by density; boards and papers about 1.25 µm per gsm). */
export function thicknessOf(s: Stock, gsm = s.gsm ?? 0): number {
  if (s.caliper) return s.caliper;
  if (s.kind === "greyboard") return Math.round((gsm / 650) * 10) / 10;
  return Math.round(gsm * 0.00125 * 100) / 100;
}
