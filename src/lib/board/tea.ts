/** The original sample board: Longjing green tea in a tin. */
import type { Board } from "./schema";

export const TEA_BOARD: Board = {
  meta: { product: { zh: "明前龙井 · 100 克罐装", en: "Pre-Qingming Longjing tea, 100 g tin" }, brand: "山径", category: "tea" },
  reading: {
    product: {
      zh: "照片显示扁平挺直的绿茶干茶与一只圆柱形金属罐；品类为绿茶礼品与日常自饮两用（推测）。",
      en: "The photo shows flat, straight dry green tea and a cylindrical metal tin; likely sold both as a gift and for daily drinking (assumed).",
    },
    references: [
      {
        label: "参考图 1 Reference 1",
        borrow: { zh: "大面积留白 + 偏左的竖排品名；只借鉴这种阅读路径。", en: "Generous white space with a vertical name set left of center; borrow only this reading path." },
        avoid: { zh: "不沿用其品牌印章、山水插画与原有文字。", en: "Do not reuse its brand seal, landscape illustration or text." },
      },
    ],
    assumptions: [
      { zh: "暂按\"电商展示 + 收到实物开箱\"两个场景处理。", en: "Assumed channels: online listing plus unboxing at delivery." },
      { zh: "产地、等级、净含量等信息以占位符表示，需卖家提供。", en: "Origin, grade and net weight are placeholders the seller must supply." },
    ],
  },
  directions: [
    {
      id: "A",
      route: "safe",
      name: { zh: "茶室留白", en: "Tearoom quiet" },
      tagline: { zh: "像茶室墙上挂的一幅立轴。", en: "Like the hanging scroll on a tearoom wall." },
      layout: "scroll",
      palette: [
        { name: { zh: "宣纸白", en: "Rice-paper white" }, role: "background", hex: "#EFEDE4", share: 64 },
        { name: { zh: "松烟墨", en: "Pine-soot ink" }, role: "text", hex: "#2A2E2B", share: 24 },
        { name: { zh: "龙井绿", en: "Longjing green" }, role: "brand", hex: "#6F8A5E", share: 10 },
        { name: { zh: "朱砂", en: "Cinnabar" }, role: "accent", hex: "#B5483A", share: 2 },
      ],
      mockup: { headline: "山径", detail: "明前龙井", innerLabel: "100g · 罐", manualTitle: "冲泡指南", manualStep: "一 · 温杯" },
      carriers: {
        outerFront: { zh: "立轴装裱：天头地头龙井绿，画心淡淡几重远山，品名楷书竖题在右，下钤朱砂小印。", en: "Mounted like a hanging scroll: Longjing-green top and foot, faint layered hills in the painting, the name brushed down the right and sealed in cinnabar." },
        outerBack: { zh: "三栏信息：产地与等级、冲泡、[法规信息]。", en: "Three columns: origin and grade, brewing, [regulatory info]." },
        inner: { zh: "罐身正面是缩小的立轴，罐盖只钤一方印。", en: "The tin's front is the scroll in miniature; the lid carries only the seal." },
        manual: { zh: "封面沿用远山，内页四步冲泡，每步一图。", en: "Cover reuses the hills; inside, four brewing steps, one image each." },
      },
      anchor: { zh: "一方朱砂小印，从外盒题款下到罐盖再到说明书封底。", en: "One small cinnabar seal: under the box inscription, on the tin lid, on the manual's back." },
      styleDna: {
        typography: { zh: "楷书竖排题款，黑体小字说明。", en: "Kai-style vertical inscription; small sans-serif body text." },
        imagery: { zh: "不用照片，只用几重淡墨远山。", en: "No photos; only a few pale layers of distant hills." },
        graphics: { zh: "装裱的天头、惊燕、隔水与一方朱砂白文印。", en: "The mount's top band, hanging strips and dividers, and one cinnabar seal." },
        finish: { zh: "哑光纸感，局部压凹（视觉建议）。", en: "Matte paper feel with light debossing (visual suggestion)." },
      },
      sketch: "┌▓▓▓▌▓▌▓▓▓▓┐\n│┌────────┐│\n││     山 明││\n││     径 前││\n││～远山～[印]││\n└▓▓▓▓▓▓▓▓▓▓┘",
      suitable: { zh: "中高端礼赠与自饮；适合注重安静质感的买家。", en: "Mid-to-high-end gifting and personal use; buyers who value calm." },
      risk: { zh: "留白过多时远看像空盒，需保证\"龙井\"二字清晰。", en: "Too much white space reads as empty from afar; keep 'Longjing' legible." },
    },
    {
      id: "B",
      route: "distinctive",
      name: { zh: "茶山等高线", en: "Tea-hill contours" },
      tagline: { zh: "把产地的山形变成一枚可识别的标志。", en: "Turn the hills it grows on into a recognizable mark." },
      layout: "stripe",
      palette: [
        { name: { zh: "雾白", en: "Mist white" }, role: "background", hex: "#E8ECE6", share: 56 },
        { name: { zh: "深茶", en: "Deep tea" }, role: "text", hex: "#1F2A24", share: 26 },
        { name: { zh: "新芽绿", en: "Bud green" }, role: "brand", hex: "#3F7A4F", share: 14 },
        { name: { zh: "晨光金", en: "Morning gold" }, role: "accent", hex: "#C9A14A", share: 4 },
      ],
      mockup: { headline: "山径", detail: "明前龙井", innerLabel: "No.01 茶罐", manualTitle: "一杯好茶", manualStep: "01 温杯" },
      carriers: {
        outerFront: { zh: "左侧竖向绿色等高线色带，右侧粗体品名与产地占位。", en: "A green contour band down the left; bold name and origin placeholder on the right." },
        outerBack: { zh: "编号清单：01 产地 02 冲泡 03 储存，另设[法规信息]区。", en: "Numbered list: 01 origin, 02 brewing, 03 storage, plus a [regulatory info] block." },
        inner: { zh: "罐身环绕一圈等高线，罐盖印编号。", en: "Contours wrap the tin; the lid carries the number." },
        manual: { zh: "页眉为等高线细条，步骤用绿色编号。", en: "A thin contour strip as the page header; steps numbered in green." },
      },
      anchor: { zh: "茶山等高线：在色带、罐身环绕和说明书页眉中重复出现。", en: "Tea-hill contour lines, repeated in the band, around the tin and in the manual header." },
      styleDna: {
        typography: { zh: "粗黑体品名，数字编号醒目。", en: "Bold sans-serif name with prominent numerals." },
        imagery: { zh: "线描等高线代替照片。", en: "Line-drawn contours instead of photos." },
        graphics: { zh: "编号系统 + 细线网格。", en: "A numbering system on a fine-line grid." },
        finish: { zh: "等高线局部烫金（视觉建议）。", en: "Contours in gold foil (visual suggestion)." },
      },
      sketch: "┌──┬───────────┐\n│≈ │ 山径       │\n│≈ │ 明前龙井   │\n│≈ │            │\n│≈ │ [产地]     │\n└──┴───────────┘",
      suitable: { zh: "想在货架和搜索结果里被记住的新品牌；可扩展成系列。", en: "New brands that need to be remembered in search results; extends into a series." },
      risk: { zh: "等高线需来自真实产地意象，不可暗示未经证实的产区。", en: "Contours must reflect the real origin and must not imply an unverified growing area." },
    },
    {
      id: "C",
      route: "bold",
      name: { zh: "绿色单字", en: "One green character" },
      tagline: { zh: "一个巨大的\"茶\"字就是整张海报。", en: "One huge character for 'tea' is the whole poster." },
      layout: "split",
      palette: [
        { name: { zh: "茶汤黄", en: "Tea-liquor yellow" }, role: "background", hex: "#E9DFA8", share: 48 },
        { name: { zh: "墨绿", en: "Ink green" }, role: "text", hex: "#1E3B2C", share: 30 },
        { name: { zh: "嫩绿", en: "Fresh green" }, role: "brand", hex: "#7FA83A", share: 18 },
        { name: { zh: "白", en: "White" }, role: "accent", hex: "#FFFFFF", share: 4 },
      ],
      mockup: { headline: "茶", detail: "山径 · 明前龙井", innerLabel: "茶 · 01", manualTitle: "喝茶这件事", manualStep: "第一步 温杯" },
      carriers: {
        outerFront: { zh: "左半幅一个巨大的\"茶\"字，右半幅品牌与品名。", en: "A giant 'tea' character on the left half; brand and name on the right." },
        outerBack: { zh: "大字的局部延伸到背面，信息区放在白色块内。", en: "Part of the character wraps to the back; info sits in a white block." },
        inner: { zh: "罐身只印\"茶\"字的一角。", en: "The tin shows only one corner of the character." },
        manual: { zh: "封面同色体系，内页口语化步骤。", en: "Same colors on the cover; conversational steps inside." },
      },
      anchor: { zh: "\"茶\"字的笔画局部，在每个载体上露出不同部分。", en: "Fragments of the character, a different part on each carrier." },
      styleDna: {
        typography: { zh: "超大号书法感黑体单字 + 小号现代黑体。", en: "One oversized calligraphic character plus small modern sans-serif." },
        imagery: { zh: "纯排版，不用图像。", en: "Pure typography, no images." },
        graphics: { zh: "大色块切分。", en: "Large color-block splits." },
        finish: { zh: "高饱和印刷，光面（视觉建议）。", en: "Saturated print, gloss (visual suggestion)." },
      },
      sketch: "┌───────┬──────┐\n│       │ 山径 │\n│  茶   │ 明前 │\n│       │ 龙井 │\n└───────┴──────┘",
      suitable: { zh: "面向年轻消费者、追求社交平台传播的产品。", en: "Products aimed at younger buyers and social sharing." },
      risk: { zh: "大字过强会掩盖品牌名，新品牌需保证品牌名第二层级可见。", en: "The character can drown the brand; keep the brand name clearly second." },
    },
  ],
  recommendation: {
    pick: "B",
    reason: {
      zh: "电商搜索结果里缩略图很小，B 的竖向色带和编号在小尺寸下仍可辨认，也能延伸到后续的系列产品。",
      en: "Search-result thumbnails are small; B's vertical band and numbering stay legible at that size and extend to future products.",
    },
    designerInstruction: {
      zh: "选 B：左侧一条新芽绿等高线竖带，右侧粗黑体\"山径 明前龙井\"，罐身环绕等高线，说明书用绿色编号步骤。",
      en: "Go with B: a bud-green contour band on the left, bold sans-serif name on the right, contours around the tin, green numbered steps in the manual.",
    },
  },
  copy: {
    nameLine: { zh: "山径 · 明前龙井", en: "Shanjing · Pre-Qingming Longjing" },
    frontPromise: { zh: "采自[产地]，[采摘时间]手工炒制。", en: "Picked in [origin], hand-roasted [harvest date]." },
    manualSteps: [
      { zh: "温杯：用热水把杯子烫一遍。", en: "Warm the cup with hot water." },
      { zh: "投茶：约 3 克茶叶放入杯中。", en: "Add about 3 g of tea." },
      { zh: "注水：沿杯壁注入约 80°C 的水。", en: "Pour water at about 80°C along the side of the cup." },
      { zh: "等待：约 1 分钟后即可饮用。", en: "Wait about a minute, then drink." },
    ],
    placeholders: ["[产地]", "[采摘时间]", "[等级]", "[净含量]", "[生产许可证编号]", "[配料表]", "[条码区]"],
  },
  claimCheck: [
    {
      text: "正宗西湖龙井",
      level: "high",
      issue: { zh: "\"西湖龙井\"是受保护的产地名称，需有对应资质才能使用。", en: "'West Lake Longjing' is a protected origin name and needs proper authorization." },
      safer: { zh: "写明真实产地，例如\"龙井茶 · 产地：[产地]\"。", en: "State the real origin, e.g. 'Longjing tea · Origin: [origin]'." },
    },
    {
      text: "降三高",
      level: "high",
      issue: { zh: "普通食品不得宣称疾病预防或治疗功效。", en: "Ordinary foods may not claim to prevent or treat disease." },
      safer: { zh: "删除功效描述，改为风味描述，如\"豆香清鲜\"。", en: "Remove the health claim; describe flavor instead, e.g. 'fresh and bean-like'." },
    },
  ],
  complianceNotes: [
    { zh: "预包装食品标签通常需包含品名、配料、净含量、生产者信息、生产日期与保质期等，请按现行国家标准核对。", en: "Prepackaged food labels usually need the name, ingredients, net content, producer, production date and shelf life; check against current national standards." },
  ],
};
