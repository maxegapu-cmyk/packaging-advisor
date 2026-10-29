/**
 * The solution library: for each category, the packaging the trade actually ships it in, as a
 * complete specification (structure, size, stocks, print and finish), so a seller starts from what
 * works in their market and sees its price before changing anything. Sizes are typical for the
 * category's usual product; the seller sets their own afterwards.
 * Client-safe.
 */
import type { Pair } from "../i18n";
import type { Category } from "../categories";
import type { MaterialPick, Order, PackSpec } from "../pack";
import { baseStock } from "./stocks";

export type Channel = "ecom" | "retail" | "gift" | "ship";
export const CHANNEL_LABELS: Record<Channel, Pair> = {
  ecom: { zh: "电商直发", en: "E-commerce" },
  retail: { zh: "货架零售", en: "Retail shelf" },
  gift: { zh: "礼品", en: "Gifting" },
  ship: { zh: "物流外箱", en: "Shipping" },
};

export type Solution = {
  id: string;
  cat: Category;
  name: Pair;
  channels: Channel[];
  /** when to choose it and what it costs you in look or protection */
  use: Pair;
  spec: PackSpec;
  /** the usual first order */
  qty?: number;
};

const P = (zh: string, en: string): Pair => ({ zh, en });
/** A part made of a stock (its material number set from the stock, so compliance follows). */
const m = (stock: string, extra: Partial<MaterialPick> = {}): MaterialPick => {
  const s = baseStock(stock);
  return { stock, ...(s?.mid ? { id: s.mid } : {}), ...(s?.gsm && s.kind !== "flute" ? { gsm: s.gsm } : {}), ...extra };
};
const ship = (per: number, stock = "bc5"): Order => ({ shipper: { per, stock, colours: 1 } });

export const SOLUTIONS: Solution[] = [
  /* -------------------------------------------------------------- tea */
  {
    id: "tea-tins-gift",
    cat: "tea",
    name: P("双罐天地盖礼盒", "Lid-and-base gift box with two tins"),
    channels: ["gift", "ecom"],
    use: P("节礼、伴手礼主力款：2 mm 灰板裱 157 g 铜版纸覆哑膜烫金，植绒内托卡两只印铁罐。精装手工占成本大头，3000 只起才划算。", "The festive and gifting staple: 2 mm greyboard wrapped in 157 g art paper, matte laminated and foiled, with a flocked tray holding two printed tins. Handwork is the big cost; it pays from about 3,000."),
    spec: { form: "gift", w: 236, h: 146, d: 142, finish: "matte", effects: ["goldFoil"], inner: { form: "tin", count: 2, w: 86, h: 120, d: 86, insert: "velvet" }, materials: { core: m("greyboard", { gsm: 1200 }), wrap: m("art", { gsm: 157 }), insert: m("flockTray"), "inner.body": m("tinRound") } },
    qty: 3000,
  },
  {
    id: "tea-carton-foil",
    cat: "tea",
    name: P("白卡彩盒 + 铝箔内袋", "Folding carton with a foil inner bag"),
    channels: ["retail", "ecom"],
    use: P("口粮茶、电商标准装最省的做法：350 g 白卡彩盒，内装 PET/AL/PE 铝箔袋避光防潮。单价约为礼盒的十分之一。", "The cheapest way to sell everyday tea: a 350 g carton holding a PET/AL/PE foil bag against light and moisture. About a tenth of a gift box per pack."),
    spec: { form: "carton", w: 110, h: 160, d: 60, finish: "matte", effects: ["goldFoil"], inner: { form: "pouch", count: 1, w: 100, h: 150, d: 50 }, materials: { body: m("fbb", { gsm: 350 }), "inner.film": m("petAlPe", { cf: 2 }) } },
    qty: 5000,
  },
  {
    id: "tea-kraft-pouch",
    cat: "tea",
    name: P("牛皮纸自立拉链袋", "Kraft stand-up zip pouch"),
    channels: ["ecom", "retail"],
    use: P("散茶、花草茶直发：牛皮纸/镀铝/PE 复合，自然观感，可重复封口。凹印起订约 1 万只，少量用数码印刷。", "Loose and herbal tea shipped direct: kraft/metallised/PE, natural-looking and resealable. Gravure from about 10,000; digital print below that."),
    spec: { form: "pouch", w: 140, h: 210, d: 70, finish: "paper", materials: { film: m("kraftVmpetPe", { cf: 2 }) } },
    qty: 10000,
  },
  {
    id: "tea-tin-direct",
    cat: "tea",
    name: P("印铁罐单罐直发", "Printed tin shipped on its own"),
    channels: ["ecom", "retail"],
    use: P("罐即是包装：马口铁四色印铁，开罐体验好、可复用；出货用五层外箱每箱 40 罐。", "The tin is the pack: four-colour printed tinplate, reusable and good to open; shipped 40 to a 5-ply carton."),
    spec: { form: "tin", w: 86, h: 120, d: 86, finish: "gloss", materials: { body: m("tinRound") }, order: ship(40) },
    qty: 5000,
  },

  /* -------------------------------------------------------------- specialty */
  {
    id: "spec-jar-gift",
    cat: "specialty",
    name: P("玻璃罐礼盒", "Gift box with a glass jar"),
    channels: ["gift"],
    use: P("蜂蜜、酱料、果干的伴手礼：天地盖礼盒 + 纸浆模塑内托，环保且防震。", "Honey, sauces and dried fruit as gifts: a lid-and-base box with a moulded pulp tray, protective and plastic-free."),
    spec: { form: "gift", w: 124, h: 121, d: 136, finish: "paper", inner: { form: "jar", count: 1, w: 80, h: 95, d: 80, insert: "pulp" }, materials: { core: m("greyboard", { gsm: 1200 }), wrap: m("embossed", { gsm: 140 }), insert: m("pulpDry"), "inner.glass": m("glassJar") } },
    qty: 3000,
  },
  {
    id: "spec-kraft-pouch",
    cat: "specialty",
    name: P("牛皮纸自立袋", "Kraft stand-up pouch"),
    channels: ["ecom", "retail"],
    use: P("笋干、菌菇、坚果等干货：牛皮纸观感，镀铝阻隔，开窗可选。", "Dried bamboo shoots, mushrooms, nuts: the kraft look with a metallised barrier."),
    spec: { form: "pouch", w: 160, h: 230, d: 80, finish: "paper", materials: { film: m("kraftVmpetPe", { cf: 3 }) } },
    qty: 10000,
  },
  {
    id: "spec-bag",
    cat: "specialty",
    name: P("白卡手提袋", "Card carrier bag"),
    channels: ["gift", "retail"],
    use: P("门店与展会送礼：250 g 白卡覆哑膜，棉绳手提，底部加灰板。", "For shops and fairs: 250 g card, matte laminated, cotton rope handles and a greyboard base."),
    spec: { form: "bag", w: 260, h: 320, d: 110, finish: "matte", materials: { body: m("fbb", { gsm: 250 }), handle: m("cottonHandle"), base: m("greyboard", { gsm: 650 }) } },
    qty: 3000,
  },

  /* -------------------------------------------------------------- cosmetics */
  {
    id: "cos-carton-bottle",
    cat: "cosmetics",
    name: P("白卡彩盒 + 泵瓶", "Folding carton with a pump bottle"),
    channels: ["retail", "ecom"],
    use: P("精华、乳液标准包装：350 g 白卡覆光膜，PP 合成纸防水标签，乳液泵。", "The serum and lotion standard: 350 g card, gloss laminated, a water-resistant PP label and a lotion pump."),
    spec: { form: "carton", w: 56, h: 176, d: 56, finish: "gloss", inner: { form: "bottle", count: 1, w: 52, h: 170, d: 52 }, materials: { body: m("fbb", { gsm: 350 }), "inner.body": m("petBottle"), "inner.pump": m("lotionPump"), "inner.label": m("labelPP") } },
    qty: 5000,
  },
  {
    id: "cos-carton-touch",
    cat: "cosmetics",
    name: P("触感膜烫银彩盒", "Soft-touch carton with silver foil"),
    channels: ["retail"],
    use: P("面霜、口红等高客单：400 g 白卡覆触感膜 + 烫银，比精装盒便宜得多又有质感。", "Creams and lipsticks at higher prices: 400 g card, soft-touch film and silver foil; far cheaper than a rigid box and still feels premium."),
    spec: { form: "carton", w: 70, h: 70, d: 70, finish: "softTouch", effects: ["silverFoil"], inner: { form: "jar", count: 1, w: 62, h: 55, d: 62 }, materials: { body: m("fbb", { gsm: 400 }), "inner.glass": m("glassJar"), "inner.label": m("labelArt") } },
    qty: 5000,
  },
  {
    id: "cos-book-set",
    cat: "cosmetics",
    name: P("磁吸书型礼盒套装", "Magnetic book box set"),
    channels: ["gift"],
    use: P("节日套装：高密度灰板，磁吸翻盖，EVA 内托卡位两瓶。", "Festive sets: high-density greyboard, a magnetic flap and an EVA tray holding two bottles."),
    spec: { form: "bookBox", w: 200, h: 60, d: 180, finish: "softTouch", effects: ["goldFoil"], inner: { form: "bottle", count: 2, w: 40, h: 120, d: 40, insert: "foam" }, materials: { core: m("greyboardHD", { gsm: 1300 }), wrap: m("art", { gsm: 157 }), insert: m("eva"), "inner.body": m("petBottle"), "inner.pump": m("lotionPump"), "inner.label": m("labelPP") } },
    qty: 3000,
  },
  {
    id: "cos-tube",
    cat: "cosmetics",
    name: P("PE 软管", "PE squeeze tube"),
    channels: ["retail", "ecom"],
    use: P("洁面、防晒：管身直接印刷，免外盒最省；起订约 1 万支。", "Cleansers and sunscreen: printed on the tube itself, the cheapest with no carton; from about 10,000."),
    spec: { form: "tube", w: 38, h: 160, d: 38, finish: "gloss", materials: { body: m("peTube") }, order: ship(200) },
    qty: 10000,
  },

  /* -------------------------------------------------------------- appliance */
  {
    id: "app-colour-carton",
    cat: "appliance",
    name: P("彩印裱坑彩箱", "Litho-laminated colour carton"),
    channels: ["retail", "ecom"],
    use: P("小家电标准做法：250 g 灰底白板四色印刷覆哑膜，裱 B 瓦，扣底；EPE 或纸托另配。", "The small-appliance standard: 250 g duplex printed four-colour and matte laminated, mounted on B-flute with a crash-lock bottom; EPE or pulp inserts on top."),
    spec: { form: "carton", w: 340, h: 260, d: 220, finish: "matte", materials: { body: m("bSingle"), facing: m("duplex", { gsm: 250 }) }, order: ship(4) },
    qty: 3000,
  },
  {
    id: "app-kraft-rsc",
    cat: "appliance",
    name: P("牛皮纸箱直印", "Kraft carton printed direct"),
    channels: ["ecom", "ship"],
    use: P("只走电商不上货架：三层 B 瓦 K=K 牛卡直接水印 2 色，单价约为彩箱的一半。", "E-commerce only, no shelf: 3-ply B-flute kraft printed two colours flexo, about half a colour carton."),
    spec: { form: "carton", w: 340, h: 260, d: 220, finish: "paper", materials: { body: m("b3KK", { route: "direct", cf: 2 }) } },
    qty: 3000,
  },
  {
    id: "app-mailer",
    cat: "appliance",
    name: P("彩色飞机盒", "Colour mailer"),
    channels: ["ecom"],
    use: P("吹风机、剃须刀等小件：飞机盒自带锁扣免胶带，开箱体验好。", "Hair dryers, shavers and other small items: a mailer locks shut without tape and opens well."),
    spec: { form: "mailer", w: 260, h: 90, d: 200, finish: "matte", materials: { body: m("bSingle"), facing: m("duplex", { gsm: 250 }) } },
    qty: 3000,
  },

  /* -------------------------------------------------------------- snacks */
  {
    id: "snack-stand",
    cat: "snacks",
    name: P("镀铝自立拉链袋", "Metallised stand-up zip pouch"),
    channels: ["ecom", "retail"],
    use: P("坚果、果干：PET/VMPET/PE 高阻隔，可重复封口，货架站立。", "Nuts and dried fruit: high-barrier PET/VMPET/PE, resealable and standing on shelf."),
    spec: { form: "pouch", w: 160, h: 230, d: 80, finish: "matte", materials: { film: m("petVmpetPe", { cf: 6 }) } },
    qty: 10000,
  },
  {
    id: "snack-flat",
    cat: "snacks",
    name: P("三边封小包装", "Three-side-seal sachet"),
    channels: ["retail"],
    use: P("单次分享装、试吃装：BOPP/镀铝 CPP，最低成本的阻隔包装。", "Single servings and samples: BOPP/VMCPP, the lowest-cost barrier pack."),
    spec: { form: "pouch", w: 100, h: 140, d: 20, finish: "gloss", materials: { film: m("oppCpp", { cf: 6 }) } },
    qty: 30000,
  },
  {
    id: "snack-tube",
    cat: "snacks",
    name: P("纸罐（铝箔内衬）", "Paper tube with foil liner"),
    channels: ["gift", "retail"],
    use: P("曲奇、薯片、坚果礼罐：卷制纸罐 + 铝箔复合纸内衬，替代铁罐、可回收。", "Biscuits, crisps and nut canisters: a wound paper tube with a foil liner, a recyclable alternative to tins."),
    spec: { form: "paperTube", w: 80, h: 140, d: 80, finish: "matte", materials: { body: m("tubeBoard"), wrap: m("art", { gsm: 128 }), liner: m("foilPaper") } },
    qty: 5000,
  },

  /* -------------------------------------------------------------- drinks */
  {
    id: "bev-gift",
    cat: "beverage",
    name: P("酒瓶礼盒", "Spirits bottle gift box"),
    channels: ["gift"],
    use: P("白酒、黄酒礼盒：天地盖 + 植绒内托，晶白料公模瓶。", "Baijiu and huangjiu gift boxes: lid-and-base with a flocked tray, a stock-mould flint bottle."),
    spec: { form: "gift", w: 274, h: 98, d: 128, finish: "paper", inner: { form: "glassBottle", count: 1, w: 72, h: 230, d: 72, insert: "velvet" }, materials: { core: m("greyboard", { gsm: 1200 }), wrap: m("embossed", { gsm: 140 }), insert: m("flockTray"), "inner.glass": m("glassBottle"), "inner.stopper": m("corkStopper"), "inner.label": m("labelArt") } },
    qty: 3000,
  },
  {
    id: "bev-carton",
    cat: "beverage",
    name: P("单瓶彩盒", "Single-bottle carton"),
    channels: ["retail", "ecom"],
    use: P("日常款酒水：400 g 白卡彩盒扣底，比礼盒省七成以上。", "Everyday bottles: a 400 g crash-lock carton, at less than a third of a gift box."),
    spec: { form: "carton", w: 80, h: 240, d: 80, finish: "matte", effects: ["goldFoil"], inner: { form: "glassBottle", count: 1, w: 72, h: 230, d: 72 }, materials: { body: m("fbb", { gsm: 400 }), "inner.glass": m("glassBottle"), "inner.stopper": m("corkStopper"), "inner.label": m("labelArt") } },
    qty: 5000,
  },
  {
    id: "bev-can",
    cat: "beverage",
    name: P("铝罐饮料", "Aluminium can"),
    channels: ["retail", "ecom"],
    use: P("气泡水、精酿：两片罐印刷起订量很高，小批量请用素罐 + 收缩套标。", "Sparkling water and craft beer: printed cans need very large orders; for short runs use plain cans with shrink sleeves."),
    spec: { form: "can", w: 66, h: 115, d: 66, finish: "gloss", materials: { body: m("alCan") }, order: ship(24) },
    qty: 200000,
  },

  /* -------------------------------------------------------------- health */
  {
    id: "health-carton-bottle",
    cat: "health",
    name: P("彩盒 + HDPE 瓶", "Carton with an HDPE bottle"),
    channels: ["retail", "ecom"],
    use: P("片剂、胶囊：食品级白卡彩盒，HDPE 瓶内含铝箔封口。", "Tablets and capsules: a food-grade carton and an HDPE bottle with a foil seal."),
    spec: { form: "carton", w: 70, h: 120, d: 70, finish: "gloss", inner: { form: "bottle", count: 1, w: 60, h: 110, d: 60 }, materials: { body: m("fbb", { gsm: 350 }), "inner.body": m("hdpeBottle"), "inner.label": m("labelArt") } },
    qty: 5000,
  },
  {
    id: "health-powder-pouch",
    cat: "health",
    name: P("铝箔自立袋（粉剂）", "Foil stand-up pouch for powders"),
    channels: ["ecom"],
    use: P("蛋白粉、代餐粉：铝箔结构避光防潮。", "Protein and meal powders: foil keeps out light and moisture."),
    spec: { form: "pouch", w: 180, h: 260, d: 90, finish: "matte", materials: { film: m("petAlPe", { cf: 6 }) } },
    qty: 10000,
  },

  /* -------------------------------------------------------------- personal care */
  {
    id: "pc-bottle",
    cat: "personalCare",
    name: P("泵瓶 + 防水标签", "Pump bottle with a water-resistant label"),
    channels: ["retail", "ecom"],
    use: P("洗发水、沐浴露：HDPE 瓶 + 乳液泵 + PP 合成纸标签，五层外箱每箱 24 瓶。", "Shampoo and shower gel: HDPE bottle, pump and PP synthetic label, 24 to a 5-ply carton."),
    spec: { form: "bottle", w: 70, h: 220, d: 70, finish: "gloss", materials: { body: m("hdpeBottle"), pump: m("lotionPump"), label: m("labelPP") }, order: ship(24) },
    qty: 10000,
  },
  {
    id: "pc-tube",
    cat: "personalCare",
    name: P("PE 软管", "PE squeeze tube"),
    channels: ["retail"],
    use: P("牙膏、护手霜：管身印刷，铝塑 ABL 阻隔更好。", "Toothpaste and hand cream: printed on the tube; ABL gives a better barrier."),
    spec: { form: "tube", w: 38, h: 160, d: 38, finish: "gloss", materials: { body: m("peTube") } },
    qty: 10000,
  },

  /* -------------------------------------------------------------- baby */
  {
    id: "baby-tin",
    cat: "baby",
    name: P("奶粉印铁罐", "Printed tin for milk powder"),
    channels: ["retail", "ecom"],
    use: P("奶粉、米粉：马口铁罐密封性最好，五层外箱每箱 12 罐。", "Milk and rice powder: tinplate seals best; 12 to a 5-ply carton."),
    spec: { form: "tin", w: 100, h: 130, d: 100, finish: "gloss", materials: { body: m("tinRound") }, order: ship(12) },
    qty: 5000,
  },
  {
    id: "baby-refill",
    cat: "baby",
    name: P("铝箔补充装袋", "Foil refill pouch"),
    channels: ["ecom"],
    use: P("补充装比罐装省一半以上包装成本。", "A refill costs less than half the tin to pack."),
    spec: { form: "pouch", w: 180, h: 260, d: 90, finish: "matte", materials: { film: m("petAlPe", { cf: 6 }) } },
    qty: 10000,
  },

  /* -------------------------------------------------------------- pet */
  {
    id: "pet-pouch",
    cat: "pet",
    name: P("宠物粮自立袋", "Pet food stand-up pouch"),
    channels: ["ecom", "retail"],
    use: P("猫粮、冻干：铝箔或镀铝结构，拉链复封。", "Cat food and freeze-dried treats: foil or metallised, with a reclosable zip."),
    spec: { form: "pouch", w: 200, h: 300, d: 90, finish: "matte", materials: { film: m("petAlPe", { cf: 6 }) } },
    qty: 10000,
  },
  {
    id: "pet-mono",
    cat: "pet",
    name: P("单一材质可回收袋", "Mono-material recyclable pouch"),
    channels: ["ecom"],
    use: P("全 PE 可回收结构，适合有环保诉求的品牌；阻隔低于铝箔。", "All-PE and recyclable, for brands with a sustainability story; less barrier than foil."),
    spec: { form: "pouch", w: 200, h: 300, d: 90, finish: "matte", materials: { film: m("monoPe", { cf: 6 }) } },
    qty: 10000,
  },

  /* -------------------------------------------------------------- home goods */
  {
    id: "home-mailer",
    cat: "homeGoods",
    name: P("彩色飞机盒", "Colour mailer"),
    channels: ["ecom"],
    use: P("电商直发主力：灰底白板裱 B 瓦，四色覆哑膜，免胶带。", "The e-commerce workhorse: duplex on B-flute, four colours, matte, no tape needed."),
    spec: { form: "mailer", w: 260, h: 80, d: 200, finish: "matte", materials: { body: m("bSingle"), facing: m("duplex", { gsm: 250 }) } },
    qty: 3000,
  },
  {
    id: "home-kraft-mailer",
    cat: "homeGoods",
    name: P("牛皮飞机盒直印", "Kraft mailer printed direct"),
    channels: ["ecom", "ship"],
    use: P("三层 E 瓦牛卡直接印 1 色 logo，约为彩色飞机盒的一半价。", "3-ply E-flute kraft with a one-colour logo, about half a colour mailer."),
    spec: { form: "mailer", w: 260, h: 80, d: 200, finish: "paper", materials: { body: m("e3Kraft", { route: "direct", cf: 1 }) } },
    qty: 3000,
  },
  {
    id: "home-carton",
    cat: "homeGoods",
    name: P("白卡彩盒", "Folding carton"),
    channels: ["retail"],
    use: P("杯具、小件家居上货架：350 g 白卡，扣底承重。", "Mugs and small homeware on shelf: 350 g card with a crash-lock base."),
    spec: { form: "carton", w: 110, h: 120, d: 110, finish: "matte", materials: { body: m("fbb", { gsm: 350 }) } },
    qty: 5000,
  },

  /* -------------------------------------------------------------- electronics */
  {
    id: "elec-drawer",
    cat: "electronics",
    name: P("抽屉盒", "Drawer box"),
    channels: ["retail", "gift"],
    use: P("耳机、充电器：精装抽屉盒 + 丝带拉手，开箱有仪式感。", "Earbuds and chargers: a rigid drawer box with a ribbon pull, opened with ceremony."),
    spec: { form: "drawer", w: 140, h: 50, d: 100, finish: "gloss", materials: { core: m("greyboard", { gsm: 1200 }), wrap: m("art", { gsm: 157 }), ribbon: m("ribbon") } },
    qty: 3000,
  },
  {
    id: "elec-book",
    cat: "electronics",
    name: P("磁吸翻盖书型盒", "Magnetic flap book box"),
    channels: ["retail", "gift"],
    use: P("智能手表、高端配件：磁吸翻盖，触感膜 + 局部 UV，植绒内托。", "Smartwatches and premium accessories: a magnetic flap, soft-touch with spot UV, and a flocked tray."),
    spec: { form: "bookBox", w: 160, h: 60, d: 130, finish: "softTouch", effects: ["spotUV"], materials: { core: m("greyboardHD", { gsm: 1300 }), wrap: m("art", { gsm: 157 }), insert: m("flockTray") } },
    qty: 3000,
  },
  {
    id: "elec-carton",
    cat: "electronics",
    name: P("白卡彩盒挂钩款", "Folding carton for peg display"),
    channels: ["retail", "ecom"],
    use: P("数据线、手机壳：300 g 白卡彩盒，最低成本的零售包装。", "Cables and phone cases: a 300 g carton, the lowest-cost retail pack."),
    spec: { form: "carton", w: 90, h: 160, d: 30, finish: "gloss", materials: { body: m("fbb", { gsm: 300 }) } },
    qty: 5000,
  },

  /* -------------------------------------------------------------- apparel */
  {
    id: "app-kraft-mailer",
    cat: "apparel",
    name: P("牛皮飞机盒", "Kraft mailer"),
    channels: ["ecom"],
    use: P("服装、鞋子直发：E 瓦牛卡直印，环保感。", "Clothing and shoes shipped direct: kraft E-flute printed direct, the eco look."),
    spec: { form: "mailer", w: 300, h: 80, d: 240, finish: "paper", materials: { body: m("e3Kraft", { route: "direct", cf: 1 }) } },
    qty: 3000,
  },
  {
    id: "app-bag",
    cat: "apparel",
    name: P("白牛皮纸手提袋", "White kraft carrier bag"),
    channels: ["retail"],
    use: P("门店购物袋：140 g 白牛皮纸，纸绳手提。", "Store bags: 140 g white kraft with paper rope handles."),
    spec: { form: "bag", w: 300, h: 380, d: 120, finish: "paper", materials: { body: m("whiteKraft", { gsm: 140, cf: 2 }), handle: m("ropeHandle"), base: m("greyboard", { gsm: 650 }) } },
    qty: 5000,
  },
  {
    id: "app-gift",
    cat: "apparel",
    name: P("天地盖礼盒", "Lid-and-base gift box"),
    channels: ["gift"],
    use: P("围巾、丝巾礼盒：浅盖天地盖，烫金 logo。", "Scarves and silk: a shallow-lid box with a foil logo."),
    spec: { form: "gift", w: 300, h: 60, d: 220, finish: "matte", effects: ["goldFoil"], materials: { core: m("greyboard", { gsm: 1200 }), wrap: m("art", { gsm: 157 }) } },
    qty: 3000,
  },

  /* -------------------------------------------------------------- toys */
  {
    id: "toy-blister",
    cat: "toys",
    name: P("吸塑卡板", "Blister card"),
    channels: ["retail"],
    use: P("挂钩陈列的小玩具、文具：350 g 白卡背卡 + APET 吸塑。", "Small toys and stationery on pegs: a 350 g card and an APET blister."),
    spec: { form: "blister", w: 150, h: 220, d: 40, finish: "gloss", materials: { card: m("fbb", { gsm: 350 }), blister: m("blisterPet") } },
    qty: 5000,
  },
  {
    id: "toy-carton",
    cat: "toys",
    name: P("开窗彩盒", "Window carton"),
    channels: ["retail"],
    use: P("盲盒、积木：开窗看到产品，350 g 白卡 + PET 窗片。", "Blind boxes and building sets: see the product through a PET window in a 350 g carton."),
    spec: { form: "carton", w: 120, h: 180, d: 60, finish: "gloss", materials: { body: m("fbb", { gsm: 350, window: true }) } },
    qty: 5000,
  },

  /* -------------------------------------------------------------- other */
  {
    id: "other-carton",
    cat: "other",
    name: P("白卡彩盒", "Folding carton"),
    channels: ["retail", "ecom"],
    use: P("最通用的单品包装：350 g 白卡四色覆哑膜。", "The most general single-item pack: 350 g card, four colours, matte."),
    spec: { form: "carton", w: 120, h: 170, d: 60, finish: "matte", materials: { body: m("fbb", { gsm: 350 }) } },
    qty: 5000,
  },
  {
    id: "other-mailer",
    cat: "other",
    name: P("彩色飞机盒", "Colour mailer"),
    channels: ["ecom"],
    use: P("电商直发：B 瓦裱坑，四色印刷。", "Shipped direct: B-flute litho-lam, four colours."),
    spec: { form: "mailer", w: 260, h: 80, d: 200, finish: "matte", materials: { body: m("bSingle"), facing: m("duplex", { gsm: 250 }) } },
    qty: 3000,
  },
];

export const solutionsFor = (cat: string): Solution[] => SOLUTIONS.filter((s) => s.cat === cat);
export const solutionById = (id: string) => SOLUTIONS.find((s) => s.id === id);

/**
 * A solution applied to a pack: its structure, stocks and print, keeping the seller's product size
 * when the product inside is the same kind, and the pack's compliance inputs and frozen state.
 */
export function applySolution(current: PackSpec, s: Solution): PackSpec {
  const next: PackSpec = JSON.parse(JSON.stringify(s.spec));
  if (current.inner && next.inner && current.inner.form === next.inner.form) next.inner = { ...next.inner, w: current.inner.w, h: current.inner.h, d: current.inner.d };
  if (current.content) next.content = current.content;
  if (current.usage) next.usage = current.usage;
  next.order = { ...(current.order ?? {}), ...(s.spec.order ?? {}), shipper: s.spec.order?.shipper ?? null };
  return next;
}
