/**
 * Sample boards for different kinds of product, used by the homepage, the offline demo
 * provider and the preview. Tea is the original demo; the others show the same method on a
 * serum, a snack pouch, earbuds, a fruit wine, a shampoo, crayons, baby cotton buds, a ham
 * in a crate and a tableware set: ten kinds of product on ten different package setups.
 */
import type { Board, Direction } from "./board/schema";
import { BUDS, CRAYONS, HAM, SHAMPOO, TABLEWARE, WINE } from "./board/more-samples";
import { TEA_BOARD } from "./board/tea";
import { CATEGORIES, type Category } from "./categories";
import { defaultPack, type PackSpec } from "./pack";

export type Sample = { id: string; label: { zh: string; en: string }; board: Board; pack: PackSpec };

const SERUM: Board = {
  meta: { product: { zh: "澄露 · 玻尿酸保湿精华 30ml", en: "Chenglu hyaluronic hydrating serum, 30 ml" }, brand: "澄露", category: "cosmetics" },
  reading: {
    product: {
      zh: "照片是一支磨砂白瓶身、带按压泵头的精华，外盒为细长直立盒；定位日常保湿（推测）。",
      en: "The photo shows a frosted white pump bottle in a tall carton; positioned for everyday hydration (assumed).",
    },
    references: [
      {
        label: "参考图 1 Reference 1",
        borrow: { zh: "大面积浅色 + 一条细线标出容量，只借鉴这种克制的信息层级。", en: "A pale field with one hairline marking the volume; borrow only this restrained hierarchy." },
        avoid: { zh: "不沿用其品牌字体与瓶型轮廓。", en: "Do not reuse its logotype or bottle silhouette." },
      },
    ],
    assumptions: [
      { zh: "按电商主图 + 线下柜台两个场景处理。", en: "Assumed channels: online listing and a retail counter." },
      { zh: "成分浓度、备案编号等以占位符表示。", en: "Concentrations and filing numbers are placeholders." },
    ],
  },
  directions: [
    {
      id: "A",
      route: "safe",
      name: { zh: "实验室白", en: "Lab white" },
      tagline: { zh: "干净、可信，像一份清楚的说明。", en: "Clean and credible, like a clear label." },
      layout: "offset",
      palette: [
        { name: { zh: "瓷白", en: "Porcelain white" }, role: "background", hex: "#F3F4F2", share: 66 },
        { name: { zh: "深海蓝", en: "Deep navy" }, role: "text", hex: "#1D2A3A", share: 22 },
        { name: { zh: "水光蓝", en: "Dew blue" }, role: "brand", hex: "#6FA8C7", share: 10 },
        { name: { zh: "银灰", en: "Silver grey" }, role: "accent", hex: "#A9AEB3", share: 2 },
      ],
      mockup: { headline: "澄露", detail: "保湿精华 30ml", innerLabel: "30ml", manualTitle: "使用方法", manualStep: "1 · 洁面后取 2 泵" },
      carriers: {
        outerFront: { zh: "品名与容量左对齐，一条水光蓝细线标出核心成分占位。", en: "Name and volume set left; one dew-blue hairline marks the key-ingredient placeholder." },
        outerBack: { zh: "成分表、使用方法、[备案信息] 三段。", en: "Ingredients, directions and [filing info] in three blocks." },
        inner: { zh: "瓶身只留品名与容量，磨砂质感。", en: "The bottle keeps only the name and volume on a frosted surface." },
        manual: { zh: "单页折页，三步图示。", en: "A single folded leaflet with three illustrated steps." },
      },
      anchor: { zh: "一条水光蓝细线，从外盒延伸到瓶身。", en: "One dew-blue hairline that runs from the carton to the bottle." },
      styleDna: {
        typography: { zh: "细黑体，数字等宽。", en: "Light sans-serif with tabular numerals." },
        imagery: { zh: "不用模特图，只用成分示意线。", en: "No model photos; only ingredient line marks." },
        graphics: { zh: "极细线与网格。", en: "Hairlines on a grid." },
        finish: { zh: "外盒哑光，品名局部光油（视觉建议）。", en: "Matte carton with spot gloss on the name (visual suggestion)." },
      },
      sketch: "┌──────────┐\n│澄露      │\n│保湿精华  │\n│────      │\n│     30ml │\n└──────────┘",
      suitable: { zh: "注重成分与信任感的买家；柜台与电商通用。", en: "Ingredient-minded buyers; works at a counter and online." },
      risk: { zh: "过于素净时在搜索结果里容易被忽略。", en: "So quiet it can disappear in search results." },
    },
    {
      id: "B",
      route: "distinctive",
      name: { zh: "一滴水", en: "One drop" },
      tagline: { zh: "一颗放大的水滴，就是品牌的记号。", en: "One magnified drop becomes the brand's mark." },
      layout: "stripe",
      palette: [
        { name: { zh: "雾粉", en: "Mist pink" }, role: "background", hex: "#F2E6E4", share: 54 },
        { name: { zh: "可可棕", en: "Cocoa" }, role: "text", hex: "#3B2A28", share: 24 },
        { name: { zh: "玫瑰木", en: "Rosewood" }, role: "brand", hex: "#B5656B", share: 18 },
        { name: { zh: "珍珠白", en: "Pearl" }, role: "accent", hex: "#FFFFFF", share: 4 },
      ],
      mockup: { headline: "澄露", detail: "玻尿酸保湿精华", innerLabel: "No.1 精华", manualTitle: "三步保湿", manualStep: "01 取两泵" },
      carriers: {
        outerFront: { zh: "左侧玫瑰木竖带里一颗水滴，右侧品名与功效占位。", en: "A drop inside a rosewood band on the left; name and benefit placeholder on the right." },
        outerBack: { zh: "编号步骤 01–03，[备案信息] 单列。", en: "Numbered steps 01–03, with [filing info] in its own block." },
        inner: { zh: "瓶身印一颗小水滴与编号。", en: "A small drop and the number on the bottle." },
        manual: { zh: "每一步都用水滴大小表示用量。", en: "Each step shows the amount as a drop size." },
      },
      anchor: { zh: "水滴：外盒大、瓶身小、说明书里表示用量。", en: "The drop: large on the carton, small on the bottle, a dose mark in the leaflet." },
      styleDna: {
        typography: { zh: "圆润黑体，编号醒目。", en: "Rounded sans-serif with prominent numbers." },
        imagery: { zh: "一颗写实水滴插画。", en: "One realistic drop illustration." },
        graphics: { zh: "竖向色带 + 编号。", en: "A vertical band and numbering." },
        finish: { zh: "水滴局部 UV 透明光油（视觉建议）。", en: "Clear spot UV on the drop (visual suggestion)." },
      },
      sketch: "┌──┬────────┐\n│◆ │ 澄露   │\n│  │ 保湿   │\n│  │ 精华   │\n└──┴────────┘",
      suitable: { zh: "想在同类里被记住的新品牌；可延伸成系列。", en: "New brands that need to be remembered; extends into a range." },
      risk: { zh: "水滴图形常见，需与竞品做出差异（大小、位置、光泽）。", en: "Drops are common; differ from rivals in size, placement and gloss." },
    },
    {
      id: "C",
      route: "bold",
      name: { zh: "大号数字", en: "Big number" },
      tagline: { zh: "把浓度数字做成整面主角。", en: "Make the concentration figure the whole front." },
      layout: "split",
      palette: [
        { name: { zh: "冰川蓝", en: "Glacier blue" }, role: "background", hex: "#D7E7EE", share: 50 },
        { name: { zh: "墨蓝", en: "Ink blue" }, role: "text", hex: "#132B44", share: 30 },
        { name: { zh: "电光蓝", en: "Electric blue" }, role: "brand", hex: "#2F6FDF", share: 16 },
        { name: { zh: "白", en: "White" }, role: "accent", hex: "#FFFFFF", share: 4 },
      ],
      mockup: { headline: "[ ]%", detail: "澄露 · 保湿精华", innerLabel: "[ ]% · 30ml", manualTitle: "怎么用", manualStep: "第一步 洁面" },
      carriers: {
        outerFront: { zh: "左半幅巨大的浓度数字占位，右半幅品牌与品名。", en: "A giant concentration placeholder on the left half; brand and name on the right." },
        outerBack: { zh: "数字延续到背面，信息区放在白块内。", en: "The figure wraps to the back; info sits in a white block." },
        inner: { zh: "瓶身只印数字。", en: "The bottle shows only the figure." },
        manual: { zh: "口语化步骤，强调用量。", en: "Conversational steps that stress the dose." },
      },
      anchor: { zh: "浓度数字，在每个载体上都是最大的元素。", en: "The concentration figure, the largest thing on every carrier." },
      styleDna: {
        typography: { zh: "超粗等宽数字 + 小号黑体。", en: "Extra-bold numerals plus small sans-serif." },
        imagery: { zh: "纯排版。", en: "Pure typography." },
        graphics: { zh: "大色块切分。", en: "Large color-block splits." },
        finish: { zh: "高饱和光面（视觉建议）。", en: "Saturated gloss (visual suggestion)." },
      },
      sketch: "┌──────┬─────┐\n│      │澄露 │\n│ [ ]% │保湿 │\n│      │精华 │\n└──────┴─────┘",
      suitable: { zh: "成分党、社交平台传播。", en: "Ingredient enthusiasts and social sharing." },
      risk: { zh: "浓度必须真实可证；没有依据就不能用数字做主角。", en: "The figure must be real and provable; without evidence this route fails." },
    },
  ],
  recommendation: {
    pick: "B",
    reason: {
      zh: "水滴图形在缩略图里也认得出，又不依赖未经证实的浓度数字，最稳妥地兼顾识别度与合规。",
      en: "The drop reads at thumbnail size and does not depend on an unproven concentration, balancing recognition and compliance.",
    },
    designerInstruction: {
      zh: "选 B：左侧玫瑰木竖带里放一颗写实水滴，右侧圆润黑体\"澄露 玻尿酸保湿精华\"，瓶身小水滴加编号，说明书用水滴大小表示用量。",
      en: "Go with B: a realistic drop in a rosewood band on the left, rounded sans-serif 'Chenglu hydrating serum' on the right, a small drop and number on the bottle, dose shown as drop size in the leaflet.",
    },
  },
  copy: {
    nameLine: { zh: "澄露 · 玻尿酸保湿精华", en: "Chenglu · Hyaluronic hydrating serum" },
    frontPromise: { zh: "补水保湿，质地清爽不黏腻。", en: "Hydrates with a light, non-sticky feel." },
    manualSteps: [
      { zh: "洁面后取 2 泵于掌心。", en: "After cleansing, dispense two pumps." },
      { zh: "轻拍于全脸至吸收。", en: "Pat over the face until absorbed." },
      { zh: "早晚使用，之后涂抹面霜。", en: "Use morning and night, then apply cream." },
    ],
    placeholders: ["[核心成分及含量]", "[备案编号]", "[生产企业]", "[净含量]", "[保质期]", "[条码区]"],
  },
  claimCheck: [
    {
      text: "医用级修护",
      level: "high",
      issue: { zh: "普通化妆品不得使用\"医用\"\"医疗级\"等暗示医疗作用的词。", en: "Ordinary cosmetics may not use 'medical' or 'medical grade' wording." },
      safer: { zh: "改为\"温和配方\"，并写明经过的测试（如有依据）。", en: "Say 'gentle formula' and name any tests it has actually passed." },
    },
    {
      text: "7 天淡化细纹",
      level: "medium",
      issue: { zh: "功效宣称需有评价报告支持，且不得夸大。", en: "Efficacy claims need an evaluation report and must not overstate." },
      safer: { zh: "无报告时删除时间与功效，只描述使用感受。", en: "Without a report, drop the timing and effect; describe the feel instead." },
    },
  ],
  complianceNotes: [
    { zh: "化妆品标签通常需包含产品名称、全成分、净含量、使用方法、注意事项、生产企业与备案信息等，请按现行规定核对。", en: "Cosmetic labels usually need the name, full ingredients, net content, directions, cautions, manufacturer and filing details; check current rules." },
  ],
};

const NUTS: Board = {
  meta: { product: { zh: "日食记 · 每日坚果 25g × 7 袋", en: "Rishiji daily mixed nuts, 25 g × 7 packs" }, brand: "日食记", category: "snacks" },
  reading: {
    product: {
      zh: "照片是一只牛皮纸自立袋，袋内为混合坚果小包；定位办公室和家庭的日常零食（推测）。",
      en: "The photo shows a kraft stand-up pouch of small mixed-nut packs; positioned as an everyday office and home snack (assumed).",
    },
    references: [
      {
        label: "参考图 1 Reference 1",
        borrow: { zh: "一周七天的日历式排版；只借鉴\"一天一包\"的结构。", en: "A week-calendar layout; borrow only the one-pack-a-day structure." },
        avoid: { zh: "不沿用其卡通形象与配色。", en: "Do not reuse its mascot or colors." },
      },
    ],
    assumptions: [
      { zh: "按电商主图 + 收到后放在桌面两个场景处理。", en: "Assumed: online listing, then kept on a desk after delivery." },
      { zh: "配料、过敏原、生产许可等以占位符表示。", en: "Ingredients, allergens and licence are placeholders." },
    ],
  },
  directions: [
    {
      id: "A",
      route: "safe",
      name: { zh: "牛皮纸本色", en: "Honest kraft" },
      tagline: { zh: "看得见的原料，看得见的诚意。", en: "Visible ingredients, visible honesty." },
      layout: "offset",
      palette: [
        { name: { zh: "牛皮纸", en: "Kraft" }, role: "background", hex: "#D8BE94", share: 60 },
        { name: { zh: "焦糖棕", en: "Caramel brown" }, role: "text", hex: "#3E2A1C", share: 24 },
        { name: { zh: "橄榄绿", en: "Olive" }, role: "brand", hex: "#6E7B3A", share: 12 },
        { name: { zh: "米白", en: "Cream" }, role: "accent", hex: "#F6EEDC", share: 4 },
      ],
      mockup: { headline: "日食记", detail: "每日坚果", innerLabel: "25g · 1 包", manualTitle: "怎么吃", manualStep: "一天一包" },
      carriers: {
        outerFront: { zh: "品名靠左，下方一圈坚果线描，留出透明开窗位置。", en: "Name set left over a ring of line-drawn nuts, leaving room for a clear window." },
        outerBack: { zh: "配料、营养成分表、[过敏原提示]、[生产许可]。", en: "Ingredients, nutrition table, [allergen note], [licence]." },
        inner: { zh: "小包印星期几与坚果种类。", en: "Each small pack shows the weekday and the nuts inside." },
        manual: { zh: "袋背印一周搭配表。", en: "A week plan printed on the pouch back." },
      },
      anchor: { zh: "坚果线描圈，从大袋到小包重复。", en: "The ring of line-drawn nuts, repeated from pouch to small packs." },
      styleDna: {
        typography: { zh: "手写感黑体品名。", en: "A hand-lettered sans-serif name." },
        imagery: { zh: "单色线描。", en: "Single-color line drawings." },
        graphics: { zh: "圆形徽章。", en: "A round badge." },
        finish: { zh: "牛皮纸本色 + 哑光（视觉建议）。", en: "Natural kraft, matte (visual suggestion)." },
      },
      sketch: "┌──────────┐\n│日食记    │\n│  ○○○○    │\n│ ○ 窗 ○   │\n│  ○○○○    │\n└──────────┘",
      suitable: { zh: "注重天然、少加工的买家。", en: "Buyers who value natural, minimally processed food." },
      risk: { zh: "牛皮纸风格同质化严重，需靠插画做出差异。", en: "Kraft is everywhere; the drawings must set it apart." },
    },
    {
      id: "B",
      route: "distinctive",
      name: { zh: "一周七色", en: "Seven-day colors" },
      tagline: { zh: "一天一种颜色，七天排成一道彩虹。", en: "One color a day; seven days make a spectrum." },
      layout: "stripe",
      palette: [
        { name: { zh: "燕麦白", en: "Oat white" }, role: "background", hex: "#F1EBDD", share: 52 },
        { name: { zh: "可可", en: "Cocoa" }, role: "text", hex: "#2E231C", share: 22 },
        { name: { zh: "南瓜橙", en: "Pumpkin" }, role: "brand", hex: "#E07A2E", share: 18 },
        { name: { zh: "开心果绿", en: "Pistachio" }, role: "accent", hex: "#9DBA5A", share: 8 },
      ],
      mockup: { headline: "日食记", detail: "每日坚果 × 7", innerLabel: "周一 MON", manualTitle: "一周搭配", manualStep: "01 周一" },
      carriers: {
        outerFront: { zh: "左侧七条色带代表一周，右侧品名与\"7 袋\"。", en: "Seven color bands for the week on the left; name and '7 packs' on the right." },
        outerBack: { zh: "七天对应七种搭配，[营养成分] 单列。", en: "Seven days, seven mixes, with [nutrition] in its own block." },
        inner: { zh: "每个小包用当天的颜色。", en: "Each small pack takes its day's color." },
        manual: { zh: "袋背印七色日历。", en: "A seven-color calendar on the back." },
      },
      anchor: { zh: "七色带：大袋上排成一列，小包上各取一色。", en: "The seven bands: in a row on the pouch, one each on the small packs." },
      styleDna: {
        typography: { zh: "几何黑体 + 中英星期。", en: "Geometric sans-serif with bilingual weekdays." },
        imagery: { zh: "纯色块，不用照片。", en: "Solid color blocks, no photos." },
        graphics: { zh: "竖向色带系统。", en: "A vertical band system." },
        finish: { zh: "哑光膜，色带局部亮光（视觉建议）。", en: "Matte film with spot gloss on the bands (visual suggestion)." },
      },
      sketch: "┌───────┬────┐\n│▮▮▮▮▮▮▮│日食│\n│       │记  │\n│       │× 7 │\n└───────┴────┘",
      suitable: { zh: "想在货架和直播间被一眼认出的品牌。", en: "Brands that need to be spotted on a shelf or in a livestream." },
      risk: { zh: "七色要控制在同一明度，避免显得廉价。", en: "Keep the seven colors at one lightness so it doesn't look cheap." },
    },
    {
      id: "C",
      route: "bold",
      name: { zh: "一颗大坚果", en: "One giant nut" },
      tagline: { zh: "一颗放大到整面的腰果。", en: "A single cashew blown up to fill the front." },
      layout: "split",
      palette: [
        { name: { zh: "奶油黄", en: "Butter" }, role: "background", hex: "#F3D98B", share: 48 },
        { name: { zh: "深棕", en: "Dark brown" }, role: "text", hex: "#3A2414", share: 30 },
        { name: { zh: "番茄红", en: "Tomato" }, role: "brand", hex: "#D9452B", share: 18 },
        { name: { zh: "白", en: "White" }, role: "accent", hex: "#FFFFFF", share: 4 },
      ],
      mockup: { headline: "坚", detail: "日食记 · 每日坚果", innerLabel: "坚 · 01", manualTitle: "吃吧", manualStep: "撕开就吃" },
      carriers: {
        outerFront: { zh: "左半幅一颗巨大的腰果插画，右半幅品名。", en: "A giant cashew illustration on the left half; the name on the right." },
        outerBack: { zh: "腰果延伸到背面，信息在白块内。", en: "The cashew wraps to the back; info in a white block." },
        inner: { zh: "小包只露坚果一角。", en: "Small packs show one corner of the nut." },
        manual: { zh: "口语化食用建议。", en: "Conversational eating tips." },
      },
      anchor: { zh: "巨大坚果的局部，每个包装露出不同部分。", en: "Parts of the giant nut, a different part on each pack." },
      styleDna: {
        typography: { zh: "粗圆体单字 + 小号黑体。", en: "One bold rounded character plus small sans-serif." },
        imagery: { zh: "写实坚果插画。", en: "Realistic nut illustration." },
        graphics: { zh: "大色块。", en: "Large color blocks." },
        finish: { zh: "亮光膜（视觉建议）。", en: "Gloss film (visual suggestion)." },
      },
      sketch: "┌──────┬─────┐\n│ (  ) │日食 │\n│  ))  │记   │\n│      │坚果 │\n└──────┴─────┘",
      suitable: { zh: "年轻买家、礼品与社交传播。", en: "Younger buyers, gifting and social sharing." },
      risk: { zh: "插画画的坚果必须是袋里真实有的。", en: "The illustrated nut must actually be in the mix." },
    },
  ],
  recommendation: {
    pick: "B",
    reason: {
      zh: "七色带直接说明\"一天一包\"，在缩略图里也清楚，并能延伸到不同口味的系列。",
      en: "The seven bands explain one-a-day at a glance, stay clear at thumbnail size and extend to other flavors.",
    },
    designerInstruction: {
      zh: "选 B：自立袋左侧七条同明度色带，右侧几何黑体\"日食记 每日坚果 × 7\"，每个小包用当天的颜色和中英星期。",
      en: "Go with B: seven equal-lightness bands down the left of the pouch, geometric sans-serif 'Rishiji daily nuts × 7' on the right, each small pack in its day's color with the bilingual weekday.",
    },
  },
  copy: {
    nameLine: { zh: "日食记 · 每日坚果", en: "Rishiji · Daily mixed nuts" },
    frontPromise: { zh: "一天一包，[坚果种类数] 种坚果果干。", en: "One pack a day, [number] kinds of nuts and dried fruit." },
    manualSteps: [
      { zh: "撕开小包即可食用。", en: "Tear open a small pack and enjoy." },
      { zh: "开封后尽快吃完。", en: "Finish soon after opening." },
      { zh: "置于阴凉干燥处。", en: "Keep cool and dry." },
    ],
    placeholders: ["[配料表]", "[过敏原提示]", "[营养成分表]", "[生产许可证编号]", "[净含量]", "[保质期]", "[条码区]"],
  },
  claimCheck: [
    {
      text: "0 添加",
      level: "medium",
      issue: { zh: "\"0 添加\"需写明不添加的具体物质并有依据，笼统表述易被认定为误导。", en: "'Zero additives' must name what is not added and be provable; a blanket claim can mislead." },
      safer: { zh: "写明\"不额外添加白砂糖\"等具体且可证的说法。", en: "Say something specific and provable, e.g. 'no added sugar'." },
    },
    {
      text: "补脑益智",
      level: "high",
      issue: { zh: "普通食品不得宣称保健功能。", en: "Ordinary foods may not claim health functions." },
      safer: { zh: "删除功效，改为口感描述，如\"香脆\"。", en: "Remove the claim; describe texture, e.g. 'crunchy'." },
    },
  ],
  complianceNotes: [
    { zh: "预包装食品标签通常需包含品名、配料、净含量、生产者信息、生产日期与保质期、过敏原提示等，请按现行国家标准核对。", en: "Prepackaged food labels usually need the name, ingredients, net content, producer, dates and allergen notes; check current national standards." },
  ],
};

const EARBUDS: Board = {
  meta: { product: { zh: "声屿 · 无线蓝牙耳机 S1", en: "Shengyu S1 wireless earbuds" }, brand: "声屿", category: "electronics" },
  reading: {
    product: {
      zh: "照片是一副白色入耳式耳机与椭圆充电盒；定位通勤与运动的入门款（推测）。",
      en: "The photo shows white in-ear buds and an oval charging case; an entry model for commuting and exercise (assumed).",
    },
    references: [
      {
        label: "参考图 1 Reference 1",
        borrow: { zh: "抽屉式开盒、产品居中托起；只借鉴开箱顺序。", en: "A drawer box that lifts the product to the center; borrow only the unboxing order." },
        avoid: { zh: "不沿用其品牌标识与产品渲染图。", en: "Do not reuse its logo or product renders." },
      },
    ],
    assumptions: [
      { zh: "按电商主图 + 开箱视频两个场景处理。", en: "Assumed: online listing and unboxing videos." },
      { zh: "型号、续航、认证、电池信息以占位符表示。", en: "Model, battery life, certifications and battery info are placeholders." },
    ],
  },
  directions: [
    {
      id: "A",
      route: "safe",
      name: { zh: "极简黑白", en: "Monochrome" },
      tagline: { zh: "让产品本身说话。", en: "Let the product speak." },
      layout: "offset",
      palette: [
        { name: { zh: "纸白", en: "Paper white" }, role: "background", hex: "#F4F4F2", share: 64 },
        { name: { zh: "石墨黑", en: "Graphite" }, role: "text", hex: "#1C1C1E", share: 26 },
        { name: { zh: "冷灰", en: "Cool grey" }, role: "brand", hex: "#8E9399", share: 8 },
        { name: { zh: "信号蓝", en: "Signal blue" }, role: "accent", hex: "#2D7FF9", share: 2 },
      ],
      mockup: { headline: "声屿", detail: "S1 无线耳机", innerLabel: "S1", manualTitle: "快速上手", manualStep: "1 · 打开盒盖配对" },
      carriers: {
        outerFront: { zh: "产品线描居中，型号小字右下。", en: "A centered line drawing of the product; model in small type bottom right." },
        outerBack: { zh: "参数表、[认证标志]、[电池信息]。", en: "Spec table, [certification marks], [battery info]." },
        inner: { zh: "抽屉内托白色，产品居中。", en: "A white tray with the product centered." },
        manual: { zh: "三步配对图示。", en: "Three-step pairing diagrams." },
      },
      anchor: { zh: "一个蓝色小圆点，标记配对键位置。", en: "A small blue dot marking the pairing button." },
      styleDna: {
        typography: { zh: "几何黑体，参数等宽。", en: "Geometric sans-serif; tabular specs." },
        imagery: { zh: "线描产品图。", en: "Line drawings of the product." },
        graphics: { zh: "细线与圆点。", en: "Hairlines and one dot." },
        finish: { zh: "哑光白卡 + 局部压凹（视觉建议）。", en: "Matte white board with light debossing (visual suggestion)." },
      },
      sketch: "┌──────────┐\n│声屿      │\n│   ( )    │\n│   ⌒⌒     │\n│       S1 │\n└──────────┘",
      suitable: { zh: "追求质感、讨厌花哨的买家。", en: "Buyers who want quality and dislike clutter." },
      risk: { zh: "与大品牌风格接近，需靠蓝点做出记忆点。", en: "Close to big-brand style; the blue dot must carry recognition." },
    },
    {
      id: "B",
      route: "distinctive",
      name: { zh: "声波岛屿", en: "Sound islands" },
      tagline: { zh: "把品牌名里的\"屿\"画成一圈圈声波。", en: "The 'island' in the name drawn as rings of sound." },
      layout: "stripe",
      palette: [
        { name: { zh: "雾灰", en: "Fog grey" }, role: "background", hex: "#E6E9EC", share: 54 },
        { name: { zh: "夜蓝", en: "Night blue" }, role: "text", hex: "#141E2E", share: 24 },
        { name: { zh: "珊瑚", en: "Coral" }, role: "brand", hex: "#F0624D", share: 16 },
        { name: { zh: "白", en: "White" }, role: "accent", hex: "#FFFFFF", share: 6 },
      ],
      mockup: { headline: "声屿", detail: "S1 无线蓝牙耳机", innerLabel: "No.S1", manualTitle: "三步连接", manualStep: "01 打开盒盖" },
      carriers: {
        outerFront: { zh: "左侧珊瑚色竖带内一圈圈声波环，右侧品名与型号。", en: "Rings of sound inside a coral band on the left; name and model on the right." },
        outerBack: { zh: "编号步骤 + [认证] + [电池运输标识]。", en: "Numbered steps, [certifications] and [battery transport mark]." },
        inner: { zh: "抽屉侧面印声波环，拉带为珊瑚色。", en: "Rings on the drawer side; a coral pull ribbon." },
        manual: { zh: "页眉为声波环，步骤用珊瑚色编号。", en: "Rings as the page header; steps numbered in coral." },
      },
      anchor: { zh: "声波环：外盒、抽屉、说明书逐级出现。", en: "The sound rings, appearing on box, drawer and leaflet in turn." },
      styleDna: {
        typography: { zh: "宽体黑体 + 数字编号。", en: "Wide sans-serif with numbered steps." },
        imagery: { zh: "同心圆线条代替产品图。", en: "Concentric lines instead of product photos." },
        graphics: { zh: "竖向色带 + 圆环。", en: "A vertical band and rings." },
        finish: { zh: "声波环局部亮光（视觉建议）。", en: "Spot gloss on the rings (visual suggestion)." },
      },
      sketch: "┌──┬────────┐\n│◎ │ 声屿   │\n│◎ │ S1     │\n│◎ │ 无线   │\n└──┴────────┘",
      suitable: { zh: "需要在同价位里被记住的新品牌。", en: "New brands that need to stand out at this price." },
      risk: { zh: "声波图形要保持简洁，否则像音响广告。", en: "Keep the rings simple or it looks like a speaker ad." },
    },
    {
      id: "C",
      route: "bold",
      name: { zh: "满版珊瑚", en: "All coral" },
      tagline: { zh: "整盒一种颜色，开箱像打开一盒糖。", en: "One color all over; unboxing feels like opening sweets." },
      layout: "split",
      palette: [
        { name: { zh: "珊瑚", en: "Coral" }, role: "background", hex: "#F27A62", share: 56 },
        { name: { zh: "深紫", en: "Deep plum" }, role: "text", hex: "#2B1630", share: 26 },
        { name: { zh: "奶白", en: "Milk" }, role: "brand", hex: "#FFF4EC", share: 14 },
        { name: { zh: "柠檬黄", en: "Lemon" }, role: "accent", hex: "#F6D84A", share: 4 },
      ],
      mockup: { headline: "S1", detail: "声屿 · 无线耳机", innerLabel: "S1 · 声屿", manualTitle: "开始吧", manualStep: "打开盖子就配对" },
      carriers: {
        outerFront: { zh: "左半幅超大\"S1\"，右半幅品牌。", en: "A giant 'S1' on the left half; the brand on the right." },
        outerBack: { zh: "大字延续到背面，信息在奶白块内。", en: "The type wraps to the back; info in a milk-white block." },
        inner: { zh: "抽屉内里同为珊瑚色。", en: "The drawer is coral inside too." },
        manual: { zh: "口语化步骤。", en: "Conversational steps." },
      },
      anchor: { zh: "\"S1\"大字，每个面露出一部分。", en: "The big 'S1', part of it on every face." },
      styleDna: {
        typography: { zh: "超粗几何字 + 小号黑体。", en: "Extra-bold geometric type plus small sans-serif." },
        imagery: { zh: "纯排版。", en: "Pure typography." },
        graphics: { zh: "满版色。", en: "Full-bleed color." },
        finish: { zh: "高饱和光面（视觉建议）。", en: "Saturated gloss (visual suggestion)." },
      },
      sketch: "┌──────┬─────┐\n│      │声屿 │\n│  S1  │     │\n│      │无线 │\n└──────┴─────┘",
      suitable: { zh: "年轻、礼品、社交平台。", en: "Young buyers, gifts and social media." },
      risk: { zh: "满版珊瑚在白底主图上很抢眼，但需保证型号以外的信息可读。", en: "Striking on a white listing, but keep everything besides the model readable." },
    },
  ],
  recommendation: {
    pick: "B",
    reason: {
      zh: "声波环把品牌名变成图形，在缩略图里能认出，又比满版色更耐看，适合做系列。",
      en: "The rings turn the brand name into a mark that reads at thumbnail size and ages better than full coral; it works as a range.",
    },
    designerInstruction: {
      zh: "选 B：抽屉盒外套左侧珊瑚色竖带内放声波环，右侧宽体\"声屿 S1\"，抽屉侧面延续声波环，拉带珊瑚色，说明书用珊瑚色编号。",
      en: "Go with B: sound rings in a coral band on the left of the sleeve, wide sans-serif 'Shengyu S1' on the right, rings continued on the drawer side, a coral pull ribbon, coral step numbers in the leaflet.",
    },
  },
  copy: {
    nameLine: { zh: "声屿 S1 · 无线蓝牙耳机", en: "Shengyu S1 · Wireless earbuds" },
    frontPromise: { zh: "打开盒盖即配对，单次续航 [小时数] 小时。", en: "Pairs when you open the lid; [hours] hours per charge." },
    manualSteps: [
      { zh: "打开充电盒，耳机自动进入配对。", en: "Open the case; the buds enter pairing." },
      { zh: "在手机蓝牙列表中选择\"声屿 S1\"。", en: "Choose 'Shengyu S1' in your phone's Bluetooth list." },
      { zh: "放回盒中即可充电。", en: "Put them back in the case to charge." },
    ],
    placeholders: ["[型号]", "[续航时间]", "[CCC 认证]", "[无线电型号核准代码]", "[电池信息]", "[生产企业]", "[条码区]"],
  },
  claimCheck: [
    {
      text: "军工级音质",
      level: "medium",
      issue: { zh: "\"军工级\"无法证明，属于夸大宣传。", en: "'Military grade' cannot be proven and overstates." },
      safer: { zh: "描述可验证的参数，如\"[单元尺寸] 动圈单元\"。", en: "Describe a verifiable spec, e.g. '[driver size] dynamic driver'." },
    },
    {
      text: "永不断连",
      level: "high",
      issue: { zh: "绝对化用语违反广告法相关规定。", en: "Absolute wording breaches advertising rules." },
      safer: { zh: "改为\"连接稳定\"并注明测试条件。", en: "Say 'stable connection' and state the test conditions." },
    },
  ],
  complianceNotes: [
    { zh: "电子产品包装通常需标注型号、生产企业、认证标志与电池相关信息，含锂电池的产品还需符合运输标识要求，请按现行规定核对。", en: "Electronics packaging usually needs the model, manufacturer, certification marks and battery info; lithium batteries also need transport marks. Check current rules." },
  ],
};

export const SAMPLES: Sample[] = [
  { id: "tea", label: CATEGORIES.tea, board: TEA_BOARD, pack: defaultPack("tea") },
  { id: "cosmetics", label: CATEGORIES.cosmetics, board: SERUM, pack: defaultPack("cosmetics") },
  { id: "snacks", label: CATEGORIES.snacks, board: NUTS, pack: defaultPack("snacks") },
  { id: "electronics", label: CATEGORIES.electronics, board: EARBUDS, pack: defaultPack("electronics") },
  { id: "beverage", label: CATEGORIES.beverage, board: WINE, pack: defaultPack("beverage") },
  { id: "personalCare", label: CATEGORIES.personalCare, board: SHAMPOO, pack: defaultPack("personalCare") },
  { id: "toys", label: CATEGORIES.toys, board: CRAYONS, pack: { form: "blister", w: 130, h: 200, d: 24, finish: "gloss" } },
  { id: "baby", label: CATEGORIES.baby, board: BUDS, pack: { form: "tin", w: 84, h: 110, d: 84, finish: "matte" } },
  { id: "specialty", label: CATEGORIES.specialty, board: HAM, pack: { form: "woodBox", w: 520, h: 150, d: 220, finish: "paper" } },
  { id: "homeGoods", label: CATEGORIES.homeGoods, board: TABLEWARE, pack: defaultPack("homeGoods") },
];

/** The sample closest to a category, for the demo provider. */
const NEAREST: Record<Category, string> = {
  tea: "tea",
  specialty: "specialty",
  beverage: "beverage",
  cosmetics: "cosmetics",
  personalCare: "personalCare",
  baby: "baby",
  health: "cosmetics",
  snacks: "snacks",
  pet: "snacks",
  homeGoods: "homeGoods",
  apparel: "homeGoods",
  electronics: "electronics",
  appliance: "electronics",
  toys: "toys",
  other: "snacks",
};

export function sampleFor(category: Category): Sample {
  return SAMPLES.find((s) => s.id === NEAREST[category]) ?? SAMPLES[0];
}

/**
 * A sample board re-labelled for the seller's own product (offline demo): their product name
 * and brand go where the sample's were, so the boxes show their words.
 */
export function adaptSample(category: Category, product: { title: string; brand: string }): Board {
  const s = sampleFor(category);
  const b: Board = structuredClone(s.board);
  const oldBrand = b.meta.brand;
  const brand = product.brand.trim() || "[品牌]";
  const title = product.title.trim() || b.meta.product.zh;
  const swap = (t: string) => t.split(oldBrand).join(brand);
  b.meta = { product: { zh: title, en: title }, brand, category };
  b.directions = b.directions.map(
    (d): Direction => ({
      ...d,
      mockup: {
        ...d.mockup,
        headline: d.mockup.headline === oldBrand ? brand : d.mockup.headline,
        detail: d.mockup.detail.includes(oldBrand) ? `${brand} · ${title}`.slice(0, 24) : title.slice(0, 18),
        innerLabel: swap(d.mockup.innerLabel),
      },
    }),
  );
  b.recommendation.designerInstruction = { zh: swap(b.recommendation.designerInstruction.zh), en: b.recommendation.designerInstruction.en };
  b.copy.nameLine = { zh: `${brand} · ${title}`, en: `${brand} · ${title}` };
  b.reading.assumptions = [
    { zh: "这是离线演示：方案来自最接近品类的示例，只换上了你的品名和品牌。接入模型后会按你的照片生成。", en: "Offline demo: the board comes from the nearest sample with your product name and brand swapped in. With a model connected it is generated from your photos." },
    ...b.reading.assumptions,
  ];
  return b;
}
