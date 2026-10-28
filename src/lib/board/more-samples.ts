/**
 * Six more sample boards, so the samples cover ten kinds of product and ten package setups:
 * a fruit wine in a gift box, a shampoo pump bottle, crayons on a blister card, baby cotton
 * buds in a tin, a cured ham in a pine crate and tableware in a mailer.
 * Placeholders in [brackets] are facts the seller fills in; nothing here is a real brand.
 */
import type { Board, Direction } from "./schema";

type D = Omit<Direction, "sketch"> & { sketch?: string };
const dir = (d: D): Direction => ({ sketch: "", ...d });
const p = (zh: string, en: string) => ({ zh, en });

export const WINE: Board = {
  meta: { product: p("梅屿 · 仙居杨梅酒 500ml", "Meiyu Xianju bayberry wine, 500 ml"), brand: "梅屿", category: "beverage" },
  reading: {
    product: p("照片是一瓶深红色果酒，透明玻璃瓶配木塞，配礼盒；定位节日送礼和家宴（推测）。", "The photo shows a deep-red fruit wine in a clear glass bottle with a cork, in a gift box; for festive gifts and family dinners (assumed)."),
    references: [{ label: "参考图 1 Reference 1", borrow: p("瓶标只占瓶身下半段，让酒色透出来。", "A label on the lower half only, so the wine's color shows."), avoid: p("不沿用其烫金花体字。", "Do not reuse its gold script lettering.") }],
    assumptions: [p("酒精度、产地以占位符表示。", "Alcohol content and origin are placeholders."), p("按礼盒 + 单瓶两种售卖方式处理。", "Assumed sold both boxed and as a single bottle.")],
  },
  directions: [
    dir({
      id: "A", route: "safe", name: p("山居白", "Hill-house white"), tagline: p("像一本宋版书的封面，端正，酒色就是主角。", "Like the cover of a Song-printed book: upright, with the wine's color as the hero."), layout: "symmetric",
      palette: [
        { name: p("米白", "Rice white"), role: "background", hex: "#F4F1EA", share: 62 },
        { name: p("墨黑", "Ink black"), role: "text", hex: "#1E1B1B", share: 22 },
        { name: p("杨梅红", "Bayberry red"), role: "brand", hex: "#8E1F3C", share: 12 },
        { name: p("青山绿", "Hill green"), role: "accent", hex: "#4E6B4A", share: 4 },
      ],
      mockup: { headline: "梅屿", detail: "仙居杨梅酒", innerLabel: "500ml", manualTitle: "饮用建议", manualStep: "冰镇后饮用" },
      carriers: { outerFront: p("中轴对称：杨梅红文武边栏、四角回纹，品名竖写在中间的题签里，下方一枚朱文小印。", "Symmetric about the centre: a bayberry-red thick-and-thin frame with key-fret corners, the name on a title slip down the middle, a small seal beneath."), outerBack: p("产地故事、[酒精度]、[配料] 三段。", "Origin story, [ABV] and [ingredients] in three blocks."), inner: p("瓶标窄条，同样的双线边框，只写品名与容量。", "A narrow bottle label in the same double frame, with the name and volume only."), manual: p("一张饮用卡，三种喝法。", "One serving card with three ways to drink it.") },
      anchor: p("文武边栏与中间的题签，从礼盒到瓶标。", "The thick-and-thin frame and the central title slip, from the box to the bottle label."),
      styleDna: { typography: p("宋体品名 + 细黑体信息。", "Song-style name with light sans-serif details."), imagery: p("不用照片。", "No photography."), graphics: p("双线边框、回纹角、题签与一枚小印，左右对称。", "Double frame, key-fret corners, a title slip and one small seal, mirrored left to right."), finish: p("特种纸，边框压凹（视觉建议）。", "Textured paper with the frame debossed (visual suggestion).") },
      suitable: p("送长辈、商务礼品。", "Gifts for elders and business."), risk: p("与普通白酒礼盒区分度有限。", "Not very different from ordinary spirits boxes."),
    }),
    dir({
      id: "B", route: "distinctive", name: p("一颗杨梅", "One bayberry"), tagline: p("把杨梅的颗粒纹理做成整面图案。", "The bayberry's bumpy texture becomes the whole surface."), layout: "split",
      palette: [
        { name: p("霜白", "Frost white"), role: "background", hex: "#F6EFEF", share: 44 },
        { name: p("深酒红", "Deep wine"), role: "text", hex: "#3A0F1E", share: 22 },
        { name: p("杨梅紫红", "Bayberry crimson"), role: "brand", hex: "#9C1B45", share: 30 },
        { name: p("叶绿", "Leaf green"), role: "accent", hex: "#5D7F3A", share: 4 },
      ],
      mockup: { headline: "梅屿", detail: "仙居杨梅酒 500ml", innerLabel: "杨梅酒", manualTitle: "三种喝法", manualStep: "1 · 加冰" },
      carriers: { outerFront: p("右侧大块杨梅紫红，上面是放大的颗粒纹；左侧品名。", "A large crimson block on the right with the magnified texture; the name on the left."), outerBack: p("颗粒纹延续到背面，信息放在白色区域。", "The texture wraps to the back; information sits in the white area."), inner: p("瓶标用同一颗粒纹压凸。", "The bottle label embosses the same texture."), manual: p("三种喝法，每种一个小杨梅图标。", "Three serves, each with a small bayberry icon.") },
      anchor: p("杨梅表面的颗粒纹，看得见也摸得到。", "The bayberry's bumpy surface, seen and felt."),
      styleDna: { typography: p("粗黑体品名，字距收紧。", "Bold sans-serif name, tight spacing."), imagery: p("放大的果实纹理。", "Magnified fruit texture."), graphics: p("大色块切分。", "Large color-block split."), finish: p("颗粒纹局部凹凸（视觉建议）。", "Embossed texture (visual suggestion).") },
      suitable: p("年轻送礼人群、电商主图。", "Younger gift buyers and listing images."), risk: p("纹理需要高质量印刷，成本略高。", "The texture needs good printing; slightly higher cost."),
    }),
    dir({
      id: "C", route: "bold", name: p("夏至", "Midsummer"), tagline: p("杨梅只在夏至前后十几天，把这段时间印上去。", "Bayberries last a fortnight around midsummer; print that window."), layout: "stripe",
      palette: [
        { name: p("暖白", "Warm white"), role: "background", hex: "#FBF6EE", share: 46 },
        { name: p("夜蓝", "Night blue"), role: "text", hex: "#16233B", share: 24 },
        { name: p("夏至红", "Solstice red"), role: "brand", hex: "#C2283C", share: 26 },
        { name: p("金", "Gold"), role: "accent", hex: "#C9A24C", share: 4 },
      ],
      mockup: { headline: "梅屿", detail: "夏至 · 杨梅酒", innerLabel: "夏至", manualTitle: "采摘日历", manualStep: "6月15日—7月1日" },
      carriers: { outerFront: p("左侧红色竖带写采摘日期，右侧品名。", "A red band on the left with the harvest dates, the name on the right."), outerBack: p("一张小日历标出采摘期。", "A small calendar marks the harvest window."), inner: p("瓶标印年份与采摘批次占位。", "The label carries the year and a batch placeholder."), manual: p("采摘日历与饮用建议。", "Harvest calendar and serving notes.") },
      anchor: p("采摘日期，每年一换。", "The harvest dates, new every year."),
      styleDna: { typography: p("等宽数字 + 粗黑体。", "Tabular numerals with bold sans."), imagery: p("纯排版。", "Pure typography."), graphics: p("竖向色带与日历格。", "A vertical band and calendar grid."), finish: p("哑光 + 局部烫金年份（视觉建议）。", "Matte with a foil year (visual suggestion).") },
      suitable: p("讲时令的品牌，可做年份系列。", "Seasonal brands; extends into vintages."), risk: p("采摘日期必须真实；每年需改版。", "The dates must be true; the design changes yearly."),
    }),
  ],
  recommendation: {
    pick: "B",
    reason: p("颗粒纹在缩略图里也认得出，又直接说明是杨梅，不依赖文字。", "The texture reads at thumbnail size and says bayberry without words."),
    designerInstruction: p("选 B：右侧杨梅紫红大色块配放大颗粒纹，左侧粗黑体“梅屿 仙居杨梅酒”，瓶标同纹压凸。", "Go with B: a crimson block with magnified texture on the right, bold 'Meiyu bayberry wine' on the left, the same texture embossed on the label."),
  },
  copy: {
    nameLine: p("梅屿 · 仙居杨梅酒", "Meiyu · Xianju bayberry wine"),
    frontPromise: p("[产地] 东魁杨梅，鲜果浸泡，酸甜清爽。", "Dongkui bayberries from [origin], steeped fresh; sweet, tart and bright."),
    manualSteps: [p("冰镇至 8–10℃ 饮用风味最佳。", "Best chilled to 8–10 °C."), p("可加冰或兑苏打水。", "Over ice or topped with soda."), p("开瓶后冷藏，尽快饮用。", "Refrigerate after opening and finish soon.")],
    placeholders: ["[酒精度]", "[配料]", "[产地]", "[生产许可证]", "[生产日期]", "[条码区]"],
  },
  claimCheck: [
    { text: "养生活血", level: "high", issue: p("酒类不得宣称保健、治疗作用。", "Alcohol may not claim health or medical benefits."), safer: p("删除功效，只写口感与产地。", "Drop the benefit; describe taste and origin.") },
    { text: "纯天然无添加", level: "medium", issue: p("“无添加”需要配料表支持，且不得暗示其他产品不安全。", "'No additives' needs the ingredient list to back it and must not imply others are unsafe."), safer: p("如实写配料，例如“杨梅、白酒、冰糖”。", "List the ingredients plainly, e.g. bayberry, baijiu, rock sugar.") },
  ],
  complianceNotes: [p("酒类须标注酒精度，并按规定标注“过量饮酒有害健康”等提示；请按现行规定核对。", "Alcohol must show ABV and the required warnings such as 'excessive drinking harms health'; check current rules.")],
};

export const SHAMPOO: Board = {
  meta: { product: p("青沐 · 氨基酸洗发水 400ml", "Qingmu amino-acid shampoo, 400 ml"), brand: "青沐", category: "personalCare" },
  reading: {
    product: p("照片是一支白色按压瓶，透明液体；定位温和日常洗护，家庭装（推测）。", "The photo shows a white pump bottle of clear liquid; a mild everyday wash, family size (assumed)."),
    references: [{ label: "参考图 1 Reference 1", borrow: p("瓶身大面积留白，只用一个颜色块区分香型。", "A mostly blank bottle with one color block per scent."), avoid: p("不沿用其瓶型与品牌字。", "Do not reuse its bottle shape or logotype.") }],
    assumptions: [p("按多香型系列处理，本款为“青草”。", "Assumed a scent range; this one is 'green grass'.")],
  },
  directions: [
    dir({
      id: "A", route: "safe", name: p("浴室白", "Bathroom white"), tagline: p("像一瓶好用的日用品，不吵。", "A good everyday product, quiet on the shelf."), layout: "offset",
      palette: [
        { name: p("白", "White"), role: "background", hex: "#F7F7F5", share: 70 },
        { name: p("石墨", "Graphite"), role: "text", hex: "#26292B", share: 18 },
        { name: p("青草绿", "Grass green"), role: "brand", hex: "#7FA65A", share: 10 },
        { name: p("浅灰", "Pale grey"), role: "accent", hex: "#C9CCCB", share: 2 },
      ],
      mockup: { headline: "青沐", detail: "氨基酸洗发水", innerLabel: "400ml", manualTitle: "用法", manualStep: "湿发后取适量" },
      carriers: { outerFront: p("瓶身正面品名左上，香型色块右下。", "Name top-left, the scent block bottom-right."), outerBack: p("全成分、用法、[备案信息]。", "Full ingredients, directions, [filing info]."), inner: p("无内包装。", "No inner pack."), manual: p("无说明书，用法印在瓶身。", "No leaflet; directions are on the bottle.") },
      anchor: p("香型色块，每个香型一个颜色。", "The scent block: one color per scent."),
      styleDna: { typography: p("圆润细黑体。", "Rounded light sans."), imagery: p("无。", "None."), graphics: p("一个色块。", "One color block."), finish: p("哑光瓶 + 光面标签（视觉建议）。", "Matte bottle, gloss label (visual suggestion).") },
      suitable: p("家庭日用、超市货架。", "Family use and supermarket shelves."), risk: p("容易和同类混在一起。", "Easy to blend in with rivals."),
    }),
    dir({
      id: "B", route: "distinctive", name: p("一片草叶", "One blade"), tagline: p("一条竖向草叶色带，系列里换颜色就行。", "One vertical grass-blade band; the range just changes its color."), layout: "stripe",
      palette: [
        { name: p("雾白", "Mist white"), role: "background", hex: "#F1F3EE", share: 56 },
        { name: p("深松绿", "Deep pine"), role: "text", hex: "#1F3326", share: 20 },
        { name: p("草叶绿", "Blade green"), role: "brand", hex: "#5E9A4B", share: 20 },
        { name: p("嫩黄", "Fresh yellow"), role: "accent", hex: "#E3D96B", share: 4 },
      ],
      mockup: { headline: "青沐", detail: "氨基酸洗发水 · 青草", innerLabel: "青草", manualTitle: "用法", manualStep: "按摩起泡后冲净" },
      carriers: { outerFront: p("左侧草叶绿竖带内是细线草叶，右侧品名与香型。", "A green band with line-drawn blades on the left; name and scent on the right."), outerBack: p("竖带延续到背面。", "The band wraps to the back."), inner: p("无内包装。", "No inner pack."), manual: p("用法印在背面。", "Directions on the back.") },
      anchor: p("竖向草叶色带：每个香型换一个颜色。", "The vertical blade band: a new color per scent."),
      styleDna: { typography: p("圆润黑体，品名加粗。", "Rounded sans, bold name."), imagery: p("细线草叶。", "Line-drawn blades."), graphics: p("竖向色带。", "A vertical band."), finish: p("哑光（视觉建议）。", "Matte (visual suggestion).") },
      suitable: p("要做成系列的新品牌。", "New brands building a range."), risk: p("竖带在圆瓶上会被侧面遮住一部分。", "On a round bottle part of the band turns away."),
    }),
    dir({
      id: "C", route: "bold", name: p("pH 5.5", "pH 5.5"), tagline: p("把温和这件事用一个数字说清楚。", "Say 'mild' with one number."), layout: "split",
      palette: [
        { name: p("浅薄荷", "Pale mint"), role: "background", hex: "#DFF0E6", share: 50 },
        { name: p("墨绿", "Ink green"), role: "text", hex: "#0F2A1E", share: 26 },
        { name: p("亮绿", "Bright green"), role: "brand", hex: "#2E9E5B", share: 20 },
        { name: p("白", "White"), role: "accent", hex: "#FFFFFF", share: 4 },
      ],
      mockup: { headline: "pH[ ]", detail: "青沐 · 氨基酸洗发水", innerLabel: "pH[ ]", manualTitle: "用法", manualStep: "每日可用" },
      carriers: { outerFront: p("左半幅大号 pH 数字占位，右侧品名。", "A large pH placeholder on the left half, the name on the right."), outerBack: p("说明数字的检测依据占位。", "A placeholder for the test basis of the number."), inner: p("无内包装。", "No inner pack."), manual: p("用法印在背面。", "Directions on the back.") },
      anchor: p("pH 数字。", "The pH figure."),
      styleDna: { typography: p("粗等宽数字。", "Bold tabular numerals."), imagery: p("纯排版。", "Pure typography."), graphics: p("大色块。", "Large color blocks."), finish: p("光面（视觉建议）。", "Gloss (visual suggestion).") },
      suitable: p("成分党、社交传播。", "Ingredient-minded buyers, social sharing."), risk: p("数字必须有检测报告。", "The figure needs a test report."),
    }),
  ],
  recommendation: {
    pick: "B",
    reason: p("草叶色带一眼能认，换颜色就能扩成系列，又不需要额外的功效证明。", "The blade band is instantly recognisable, extends into a range by color, and needs no extra efficacy proof."),
    designerInstruction: p("选 B：瓶身左侧草叶绿竖带配细线草叶，右侧圆润黑体“青沐 氨基酸洗发水”，香型名小字放在品名下。", "Go with B: a blade-green band with line-drawn blades on the left, rounded 'Qingmu amino-acid shampoo' on the right, the scent in small type below."),
  },
  copy: {
    nameLine: p("青沐 · 氨基酸洗发水 · 青草", "Qingmu · Amino-acid shampoo · Green grass"),
    frontPromise: p("氨基酸表活，泡沫细密，洗后清爽。", "Amino-acid surfactants, a fine lather, a clean finish."),
    manualSteps: [p("湿发后取适量于掌心。", "Wet hair and dispense into your palm."), p("按摩至起泡。", "Massage into a lather."), p("用清水冲净。", "Rinse well.")],
    placeholders: ["[全成分]", "[备案编号]", "[生产企业]", "[使用期限]", "[条码区]"],
  },
  claimCheck: [
    { text: "防脱生发", level: "high", issue: p("防脱发属于特殊化妆品，须取得注册证后才能宣称。", "Anti-hair-loss is a special-use claim and needs a registration certificate."), safer: p("没有注册证就删除，只写清洁与使用感受。", "Without the certificate, drop it; describe cleansing and feel.") },
    { text: "零刺激", level: "medium", issue: p("绝对化用语，难以证明。", "Absolute wording that can't be proven."), safer: p("改为“温和配方”。", "Say 'mild formula'.") },
  ],
  complianceNotes: [p("洗发水属于化妆品，标签需全成分、备案信息、使用期限等，请按现行规定核对。", "Shampoo is a cosmetic: full ingredients, filing details and use-by are needed; check current rules.")],
};

export const CRAYONS: Board = {
  meta: { product: p("小画匠 · 可水洗蜡笔 12 色", "Xiaohuajiang washable crayons, 12 colours"), brand: "小画匠", category: "toys" },
  reading: {
    product: p("照片是一排 12 支粗杆蜡笔，适合幼儿抓握；挂钩陈列的卡纸泡罩装（推测）。", "The photo shows twelve chunky crayons for small hands, in a hanging blister card (assumed)."),
    references: [{ label: "参考图 1 Reference 1", borrow: p("让产品本身透过泡罩成为画面。", "Let the product, through the blister, be the picture."), avoid: p("不沿用其卡通角色。", "Do not reuse its cartoon character.") }],
    assumptions: [p("适用年龄、安全标准以占位符表示。", "Age range and safety standard are placeholders.")],
  },
  directions: [
    dir({
      id: "A", route: "safe", name: p("白卡彩条", "White card, color bar"), tagline: p("白底配一条 12 色彩条，干净好认。", "A white card with a twelve-color bar; clean and clear."), layout: "offset",
      palette: [
        { name: p("白", "White"), role: "background", hex: "#FFFFFF", share: 64 },
        { name: p("深蓝", "Deep blue"), role: "text", hex: "#1B2A4A", share: 20 },
        { name: p("番茄红", "Tomato"), role: "brand", hex: "#E5483A", share: 12 },
        { name: p("阳光黄", "Sun yellow"), role: "accent", hex: "#F5C431", share: 4 },
      ],
      mockup: { headline: "小画匠", detail: "可水洗蜡笔 12 色", innerLabel: "12 色", manualTitle: "怎么洗", manualStep: "温水 + 肥皂" },
      carriers: { outerFront: p("卡纸上部品名，下部泡罩露出蜡笔。", "Name at the top of the card, crayons in the blister below."), outerBack: p("[适用年龄]、[安全标准]、洗涤方法。", "[Age], [safety standard] and how to wash it off."), inner: p("无。", "None."), manual: p("背面印清洗方法。", "Washing instructions on the back.") },
      anchor: p("12 色彩条。", "The twelve-color bar."),
      styleDna: { typography: p("圆体。", "Rounded type."), imagery: p("无。", "None."), graphics: p("彩条。", "A color bar."), finish: p("光面（视觉建议）。", "Gloss (visual suggestion).") },
      suitable: p("文具店挂钩陈列。", "Stationery-shop pegs."), risk: p("很常见。", "Very common."),
    }),
    dir({
      id: "B", route: "distinctive", name: p("一道彩虹", "One rainbow"), tagline: p("一道粗笔触彩虹从卡纸左侧画过来。", "One thick crayon rainbow sweeps across from the left."), layout: "stripe",
      palette: [
        { name: p("纸白", "Paper white"), role: "background", hex: "#FFF9EF", share: 54 },
        { name: p("铅笔灰", "Pencil grey"), role: "text", hex: "#2B2B2B", share: 18 },
        { name: p("蜡笔蓝", "Crayon blue"), role: "brand", hex: "#2F7DD1", share: 24 },
        { name: p("橘", "Orange"), role: "accent", hex: "#F28C28", share: 4 },
      ],
      mockup: { headline: "小画匠", detail: "可水洗蜡笔 · 12 色", innerLabel: "12", manualTitle: "洗得掉", manualStep: "温水一冲就掉" },
      carriers: { outerFront: p("左侧蓝色竖带里是蜡笔笔触，右侧品名。", "Crayon strokes in a blue band on the left, the name on the right."), outerBack: p("“洗得掉”三步图。", "Three pictures of washing it off."), inner: p("无。", "None."), manual: p("背面三步图。", "Three steps on the back.") },
      anchor: p("真实蜡笔笔触。", "A real crayon stroke."),
      styleDna: { typography: p("粗圆体。", "Bold rounded type."), imagery: p("扫描的蜡笔笔触。", "Scanned crayon strokes."), graphics: p("竖向色带。", "A vertical band."), finish: p("哑光（视觉建议）。", "Matte (visual suggestion).") },
      suitable: p("家长和幼儿园采购。", "Parents and nursery buyers."), risk: p("笔触扫描需要好的原稿。", "The strokes need good scans."),
    }),
    dir({
      id: "C", route: "bold", name: p("大号 12", "Big twelve"), tagline: p("一个巨大的“12”，每一笔一个颜色。", "One giant '12', each stroke a different color."), layout: "split",
      palette: [
        { name: p("天蓝", "Sky"), role: "background", hex: "#DCEFFB", share: 46 },
        { name: p("藏青", "Navy"), role: "text", hex: "#13284A", share: 26 },
        { name: p("草莓红", "Strawberry"), role: "brand", hex: "#E0364F", share: 24 },
        { name: p("白", "White"), role: "accent", hex: "#FFFFFF", share: 4 },
      ],
      mockup: { headline: "12", detail: "小画匠 · 可水洗蜡笔", innerLabel: "12", manualTitle: "洗得掉", manualStep: "温水 + 肥皂" },
      carriers: { outerFront: p("左半幅巨大数字 12，右侧品名。", "A giant 12 on the left half, the name on the right."), outerBack: p("信息放在白块内。", "Information in a white block."), inner: p("无。", "None."), manual: p("背面。", "On the back.") },
      anchor: p("数字 12。", "The number 12."),
      styleDna: { typography: p("超粗圆体数字。", "Extra-bold rounded numerals."), imagery: p("纯排版。", "Pure typography."), graphics: p("大色块。", "Large blocks."), finish: p("光面（视觉建议）。", "Gloss (visual suggestion).") },
      suitable: p("想在货架上远处就被看见。", "Visible from across the aisle."), risk: p("系列扩展到 24 色时要重做。", "Needs a redo for a 24-color set."),
    }),
  ],
  recommendation: {
    pick: "B",
    reason: p("真实笔触直接说明产品是什么，也最像孩子会画的东西。", "A real stroke says what the product is and looks like what a child would draw."),
    designerInstruction: p("选 B：卡纸左侧蜡笔蓝竖带，里面是扫描的粗蜡笔笔触，右侧粗圆体“小画匠 可水洗蜡笔 12 色”。", "Go with B: a crayon-blue band of scanned strokes on the left of the card, bold rounded 'Xiaohuajiang washable crayons, 12 colours' on the right."),
  },
  copy: {
    nameLine: p("小画匠 · 可水洗蜡笔 12 色", "Xiaohuajiang · Washable crayons, 12 colours"),
    frontPromise: p("粗杆好握，画在手上墙上，温水一洗就掉。", "Chunky and easy to hold; off hands and walls with warm water."),
    manualSteps: [p("用温水打湿。", "Wet with warm water."), p("抹肥皂轻擦。", "Rub gently with soap."), p("清水冲净。", "Rinse.")],
    placeholders: ["[适用年龄]", "[执行标准]", "[生产企业]", "[警示语]", "[条码区]"],
  },
  claimCheck: [
    { text: "可以吃的蜡笔", level: "high", issue: p("暗示可食用会误导幼儿使用，存在安全风险。", "Implying it is edible misleads and is unsafe for children."), safer: p("改为“符合 [标准] 的安全原料”。", "Say 'safe materials meeting [standard]'.") },
    { text: "100% 无毒", level: "medium", issue: p("绝对化用语，需要检测报告支持。", "Absolute wording that needs test reports."), safer: p("写明通过的检测标准。", "Name the standard it passed.") },
  ],
  complianceNotes: [p("玩具和学生文具需标注适用年龄、警示语与执行标准，部分品类属于 3C 认证范围，请按现行规定核对。", "Toys and school supplies need an age range, warnings and the product standard; some need CCC. Check current rules.")],
};

export const BUDS: Board = {
  meta: { product: p("棉芽 · 婴儿纸轴棉签 200 支", "Mianya baby paper-stem cotton buds, 200"), brand: "棉芽", category: "baby" },
  reading: {
    product: p("照片是一罐细头婴儿棉签，纸轴；圆罐便于放在尿布台（推测）。", "The photo shows a canister of fine baby cotton buds with paper stems; a round tin for the changing table (assumed)."),
    references: [{ label: "参考图 1 Reference 1", borrow: p("柔和的低饱和色和大圆角。", "Soft low-saturation colors and round corners."), avoid: p("不沿用其卡通小熊。", "Do not reuse its bear character.") }],
    assumptions: [p("材质与执行标准以占位符表示。", "Materials and standard are placeholders.")],
  },
  directions: [
    dir({
      id: "A", route: "safe", name: p("奶白", "Milk white"), tagline: p("像一罐干净的棉花。", "Like a tin of clean cotton."), layout: "offset",
      palette: [
        { name: p("奶白", "Milk white"), role: "background", hex: "#FAF7F1", share: 66 },
        { name: p("暖灰", "Warm grey"), role: "text", hex: "#4A4440", share: 18 },
        { name: p("杏", "Apricot"), role: "brand", hex: "#F0B48A", share: 12 },
        { name: p("浅蓝", "Pale blue"), role: "accent", hex: "#BFD8E6", share: 4 },
      ],
      mockup: { headline: "棉芽", detail: "婴儿棉签 200 支", innerLabel: "200", manualTitle: "使用提示", manualStep: "只清洁外耳" },
      carriers: { outerFront: p("品名左上，一朵棉花圆形右下。", "Name top-left, one cotton-ball circle bottom-right."), outerBack: p("[材质]、使用提示、[执行标准]。", "[Materials], tips and [standard]."), inner: p("无。", "None."), manual: p("罐身印提示。", "Tips printed on the tin.") },
      anchor: p("棉花圆。", "The cotton circle."),
      styleDna: { typography: p("圆体。", "Rounded type."), imagery: p("无。", "None."), graphics: p("圆。", "A circle."), finish: p("哑光（视觉建议）。", "Matte (visual suggestion).") },
      suitable: p("新手父母。", "New parents."), risk: p("和湿巾、棉柔巾容易混淆。", "Easily confused with wipes."),
    }),
    dir({
      id: "B", route: "distinctive", name: p("一根棉签", "One bud"), tagline: p("一根放大的细头棉签横穿罐身。", "One magnified fine bud runs around the tin."), layout: "stripe",
      palette: [
        { name: p("云白", "Cloud white"), role: "background", hex: "#F6F4F0", share: 56 },
        { name: p("深灰蓝", "Slate blue"), role: "text", hex: "#2E3A46", share: 20 },
        { name: p("雾蓝", "Mist blue"), role: "brand", hex: "#8FB3CC", share: 20 },
        { name: p("杏", "Apricot"), role: "accent", hex: "#F2B993", share: 4 },
      ],
      mockup: { headline: "棉芽", detail: "婴儿纸轴棉签 · 200 支", innerLabel: "细头", manualTitle: "使用提示", manualStep: "只清洁外耳" },
      carriers: { outerFront: p("左侧雾蓝竖带里画一根放大的细头棉签。", "A magnified fine bud in a mist-blue band on the left."), outerBack: p("提示与信息。", "Tips and information."), inner: p("无。", "None."), manual: p("罐身。", "On the tin.") },
      anchor: p("放大的细头。", "The magnified fine tip."),
      styleDna: { typography: p("圆体。", "Rounded type."), imagery: p("细线插画。", "Line illustration."), graphics: p("竖向色带。", "A vertical band."), finish: p("哑光（视觉建议）。", "Matte (visual suggestion).") },
      suitable: p("母婴店和电商。", "Baby stores and online."), risk: p("插画需细致，否则显得粗糙。", "The drawing must be fine or it looks crude."),
    }),
    dir({
      id: "C", route: "bold", name: p("200", "200"), tagline: p("把数量做成主角，一罐够用很久。", "Make the count the hero: one tin lasts."), layout: "split",
      palette: [
        { name: p("浅杏", "Pale apricot"), role: "background", hex: "#FCEBDD", share: 50 },
        { name: p("可可", "Cocoa"), role: "text", hex: "#4A2F24", share: 24 },
        { name: p("珊瑚", "Coral"), role: "brand", hex: "#E9806B", share: 22 },
        { name: p("白", "White"), role: "accent", hex: "#FFFFFF", share: 4 },
      ],
      mockup: { headline: "200", detail: "棉芽 · 婴儿棉签", innerLabel: "200", manualTitle: "使用提示", manualStep: "只清洁外耳" },
      carriers: { outerFront: p("巨大的 200。", "A giant 200."), outerBack: p("信息。", "Information."), inner: p("无。", "None."), manual: p("罐身。", "On the tin.") },
      anchor: p("数字。", "The number."),
      styleDna: { typography: p("粗圆体数字。", "Bold rounded numerals."), imagery: p("纯排版。", "Pure typography."), graphics: p("色块。", "Blocks."), finish: p("光面（视觉建议）。", "Gloss (visual suggestion).") },
      suitable: p("强调性价比。", "Value positioning."), risk: p("显得廉价。", "Can look cheap."),
    }),
  ],
  recommendation: {
    pick: "B",
    reason: p("放大的细头直接说明是婴儿专用，又显得精细可靠。", "The magnified fine tip says 'for babies' and feels careful."),
    designerInstruction: p("选 B：罐身左侧雾蓝竖带，细线画一根放大的细头棉签，右侧圆体“棉芽 婴儿纸轴棉签”。", "Go with B: a mist-blue band with a magnified fine bud in line drawing, rounded 'Mianya baby cotton buds' on the right."),
  },
  copy: {
    nameLine: p("棉芽 · 婴儿纸轴棉签", "Mianya · Baby paper-stem cotton buds"),
    frontPromise: p("细头设计，纸轴不易折断。", "Fine tips on paper stems that don't snap."),
    manualSteps: [p("只用于清洁外耳与鼻孔外侧。", "For the outer ear and nostril only."), p("不要伸入耳道。", "Never insert into the ear canal."), p("用后丢弃，不重复使用。", "Single use.")],
    placeholders: ["[材质]", "[执行标准]", "[生产企业]", "[生产日期]", "[条码区]"],
  },
  claimCheck: [
    { text: "医用级灭菌", level: "high", issue: p("普通棉签不得宣称医用；灭菌需符合医疗器械要求。", "Ordinary buds can't claim medical sterilisation."), safer: p("改为“独立罐装，保持干净”。", "Say 'kept clean in a sealed tin'.") },
  ],
  complianceNotes: [p("婴幼儿用品需标注适用年龄、材质、警示语与执行标准，请按现行规定核对。", "Baby products need age, materials, warnings and the standard; check current rules.")],
};

export const HAM: Board = {
  meta: { product: p("金府 · 金华火腿礼盒 2.5kg", "Jinfu Jinhua ham gift crate, 2.5 kg"), brand: "金府", category: "specialty" },
  reading: {
    product: p("照片是一只整腿火腿，配松木箱；定位春节送礼（推测）。", "The photo shows a whole ham in a pine crate; for Spring Festival gifts (assumed)."),
    references: [{ label: "参考图 1 Reference 1", borrow: p("木箱上只烙一个印章式品牌。", "Only a seal-like brand burnt into the crate."), avoid: p("不沿用其书法字。", "Do not reuse its calligraphy.") }],
    assumptions: [p("木箱盖面激光烙印，信息贴纸贴在箱底。", "The lid is laser-engraved; label information goes on a sticker on the base.")],
  },
  directions: [
    dir({
      id: "A", route: "safe", name: p("老字号", "Old house"), tagline: p("一方大印，稳重。", "One large seal; steady."), layout: "seal",
      palette: [
        { name: p("松木", "Pine"), role: "background", hex: "#E8D3B0", share: 70 },
        { name: p("焦褐", "Char brown"), role: "text", hex: "#3A2414", share: 20 },
        { name: p("印泥红", "Seal red"), role: "brand", hex: "#9E2B25", share: 8 },
        { name: p("麻绳", "Hemp"), role: "accent", hex: "#B89B6E", share: 2 },
      ],
      mockup: { headline: "金府", detail: "金华火腿", innerLabel: "2.5kg", manualTitle: "食用方法", manualStep: "切片蒸制" },
      carriers: { outerFront: p("盖面右上烙一方白文大印“金府”，左下宋体品名。", "One large seal reading 金府 burnt into the lid, top right; the name in Song type bottom left."), outerBack: p("箱底贴纸：配料、[生产许可]、[产地]。", "Base sticker: ingredients, [licence], [origin]."), inner: p("油纸包裹。", "Wrapped in waxed paper."), manual: p("一张切法卡。", "One cutting card.") },
      anchor: p("方形印章。", "The square seal."),
      styleDna: { typography: p("宋体。", "Song-style type."), imagery: p("无。", "None."), graphics: p("印章。", "A seal."), finish: p("激光烙印（视觉建议）。", "Laser engraving (visual suggestion).") },
      suitable: p("长辈和商务送礼。", "Gifts for elders and business."), risk: p("和其他火腿礼盒相似。", "Looks like other ham gifts."),
    }),
    dir({
      id: "B", route: "distinctive", name: p("一条腿线", "One leg line"), tagline: p("一根线画出整只火腿的轮廓，烙在盖上。", "One continuous line draws the whole ham, burnt into the lid."), layout: "split",
      palette: [
        { name: p("白松", "White pine"), role: "background", hex: "#EFDDBE", share: 56 },
        { name: p("烙痕褐", "Burn brown"), role: "text", hex: "#2F1C10", share: 26 },
        { name: p("火腿红", "Ham red"), role: "brand", hex: "#7A2E22", share: 14 },
        { name: p("金", "Gold"), role: "accent", hex: "#C8A15A", share: 4 },
      ],
      mockup: { headline: "金府", detail: "金华火腿 · 2.5kg", innerLabel: "金府", manualTitle: "切法", manualStep: "上方 · 中方 · 火爪" },
      carriers: { outerFront: p("盖面右半幅一根线画的火腿轮廓，左侧品名。", "A one-line ham outline on the right half of the lid, the name on the left."), outerBack: p("箱底贴纸。", "Base sticker."), inner: p("油纸上印同一根线。", "The same line on the waxed paper."), manual: p("切法卡按部位标出。", "A cutting card marked by cut.") },
      anchor: p("一根线的火腿轮廓。", "The one-line ham outline."),
      styleDna: { typography: p("细宋体。", "Light Song-style type."), imagery: p("单线插画。", "Single-line drawing."), graphics: p("线。", "Line."), finish: p("激光烙印（视觉建议）。", "Laser engraving (visual suggestion).") },
      suitable: p("年轻一点的送礼人群。", "Younger gift buyers."), risk: p("线条需要一笔画得好看。", "The line has to be drawn well."),
    }),
    dir({
      id: "C", route: "bold", name: p("年份", "Vintage"), tagline: p("像酒一样标出腌制年份。", "Mark the curing year like a wine vintage."), layout: "stripe",
      palette: [
        { name: p("浅松", "Light pine"), role: "background", hex: "#F2E2C6", share: 50 },
        { name: p("黑", "Black"), role: "text", hex: "#1A1410", share: 26 },
        { name: p("深红", "Deep red"), role: "brand", hex: "#6E1F1A", share: 20 },
        { name: p("金", "Gold"), role: "accent", hex: "#C9A24C", share: 4 },
      ],
      mockup: { headline: "金府", detail: "[ ] 年腌制", innerLabel: "[ ]", manualTitle: "切法", manualStep: "先切上方" },
      carriers: { outerFront: p("左侧烙一条竖带，写腌制年份。", "A burnt band on the left with the curing year."), outerBack: p("箱底贴纸。", "Base sticker."), inner: p("油纸。", "Waxed paper."), manual: p("切法卡。", "Cutting card.") },
      anchor: p("腌制年份。", "The curing year."),
      styleDna: { typography: p("等宽数字。", "Tabular numerals."), imagery: p("纯排版。", "Pure typography."), graphics: p("竖带。", "A band."), finish: p("烙印（视觉建议）。", "Engraving (visual suggestion).") },
      suitable: p("高端线。", "A premium line."), risk: p("年份必须真实。", "The year must be true."),
    }),
  ],
  recommendation: {
    pick: "B",
    reason: p("一根线的轮廓在木头上烙出来最好看，也最容易被记住。", "A one-line outline engraves beautifully on wood and is easy to remember."),
    designerInstruction: p("选 B：盖面右半幅一根线画的火腿轮廓，左侧细宋体“金府 金华火腿”，激光烙印。", "Go with B: a one-line ham outline on the right half of the lid, light Song-style 'Jinfu Jinhua ham' on the left, laser-engraved."),
  },
  copy: {
    nameLine: p("金府 · 金华火腿", "Jinfu · Jinhua ham"),
    frontPromise: p("[产地] 两头乌后腿，传统腌制 [ ] 个月。", "Liangtouwu hind leg from [origin], traditionally cured for [ ] months."),
    manualSteps: [p("去皮切片。", "Remove the skin and slice."), p("蒸 20 分钟或煲汤。", "Steam for 20 minutes or use in soup."), p("切面抹油，阴凉处存放。", "Oil the cut face; store somewhere cool.")],
    placeholders: ["[配料]", "[食品生产许可证]", "[产地]", "[生产日期]", "[保质期]", "[条码区]"],
  },
  claimCheck: [{ text: "零添加防腐剂", level: "medium", issue: p("需配料表支持，且不得暗示同类不安全。", "Needs the ingredient list to back it and must not imply others are unsafe."), safer: p("如实写配料：猪后腿、食用盐。", "List ingredients plainly: pork leg, salt.") }],
  complianceNotes: [p("木箱不印刷时，标签信息须以贴纸等方式完整标注，请按现行规定核对。", "When the crate isn't printed, label information must be complete on a sticker; check current rules.")],
};

export const TABLEWARE: Board = {
  meta: { product: p("素器 · 釉下彩餐具四件套", "Suqi underglaze tableware, four-piece set"), brand: "素器", category: "homeGoods" },
  reading: {
    product: p("照片是两碗两盘的陶瓷餐具，米白釉配蓝色手绘线；电商发货用飞机盒（推测）。", "The photo shows two bowls and two plates in cream glaze with hand-painted blue lines, shipped in a mailer (assumed)."),
    references: [{ label: "参考图 1 Reference 1", borrow: p("开箱即看到摆好的器物。", "Open the box and the pieces are laid out."), avoid: p("不沿用其品牌图形。", "Do not reuse its graphics.") }],
    assumptions: [p("盒内为瓦楞内卡固定。", "Corrugated inserts hold the pieces.")],
  },
  directions: [
    dir({
      id: "A", route: "safe", name: p("牛皮素", "Plain kraft"), tagline: p("牛皮色盒子加一个蓝印章。", "A kraft box with one blue stamp."), layout: "offset",
      palette: [
        { name: p("牛皮", "Kraft"), role: "background", hex: "#C9A57B", share: 70 },
        { name: p("深褐", "Dark brown"), role: "text", hex: "#2E2218", share: 18 },
        { name: p("钴蓝", "Cobalt"), role: "brand", hex: "#244C8F", share: 10 },
        { name: p("米白", "Cream"), role: "accent", hex: "#F2EADB", share: 2 },
      ],
      mockup: { headline: "素器", detail: "釉下彩餐具 · 四件套", innerLabel: "四件", manualTitle: "保养", manualStep: "可入洗碗机" },
      carriers: { outerFront: p("盒盖左上品名，右下钴蓝印章。", "Name top-left on the lid, a cobalt stamp bottom-right."), outerBack: p("盒底信息。", "Information on the base."), inner: p("内卡印器物轮廓。", "The insert carries the pieces' outlines."), manual: p("保养卡。", "Care card.") },
      anchor: p("钴蓝印章。", "The cobalt stamp."),
      styleDna: { typography: p("细宋。", "Light Song."), imagery: p("无。", "None."), graphics: p("印章。", "Stamp."), finish: p("单色印刷（视觉建议）。", "One-color print (visual suggestion).") },
      suitable: p("环保、低成本。", "Low cost, eco look."), risk: p("像普通快递盒。", "Can look like any parcel."),
    }),
    dir({
      id: "B", route: "distinctive", name: p("一笔蓝线", "One blue line"), tagline: p("器物上的手绘蓝线，延伸到盒盖上。", "The hand-painted blue line runs on to the lid."), layout: "stripe",
      palette: [
        { name: p("瓷白", "Porcelain"), role: "background", hex: "#F3EEE4", share: 58 },
        { name: p("墨", "Ink"), role: "text", hex: "#1F2328", share: 18 },
        { name: p("青花蓝", "Blue-and-white"), role: "brand", hex: "#2D5AA0", share: 20 },
        { name: p("釉黄", "Glaze yellow"), role: "accent", hex: "#E3CC8B", share: 4 },
      ],
      mockup: { headline: "素器", detail: "釉下彩餐具四件套", innerLabel: "素器", manualTitle: "保养", manualStep: "避免骤冷骤热" },
      carriers: { outerFront: p("盒盖左侧青花蓝竖带，手绘线从竖带里流出来。", "A blue band on the lid's left with the painted line flowing out of it."), outerBack: p("盒底信息。", "Base information."), inner: p("内卡印同一根线。", "The insert repeats the line."), manual: p("保养卡。", "Care card.") },
      anchor: p("手绘蓝线，从盒子到器物。", "The painted blue line, from box to bowl."),
      styleDna: { typography: p("细宋 + 细黑。", "Light Song with light sans."), imagery: p("手绘线。", "Hand-painted line."), graphics: p("竖带。", "Band."), finish: p("哑光（视觉建议）。", "Matte (visual suggestion).") },
      suitable: p("电商送礼与自用。", "Online gifting and own use."), risk: p("线条要和器物上的一致。", "The line must match the ware."),
    }),
    dir({
      id: "C", route: "bold", name: p("满版青花", "All-over blue"), tagline: p("整盒青花蓝，打开是白。", "All blue outside, white inside."), layout: "split",
      palette: [
        { name: p("白", "White"), role: "background", hex: "#FAF8F3", share: 40 },
        { name: p("深蓝", "Deep blue"), role: "text", hex: "#0E1E3D", share: 24 },
        { name: p("青花蓝", "Cobalt"), role: "brand", hex: "#1F4E99", share: 32 },
        { name: p("金", "Gold"), role: "accent", hex: "#C7A256", share: 4 },
      ],
      mockup: { headline: "素器", detail: "四件套", innerLabel: "四", manualTitle: "保养", manualStep: "可微波" },
      carriers: { outerFront: p("右半幅满版青花蓝。", "Cobalt across the right half."), outerBack: p("盒底信息。", "Base information."), inner: p("内部纯白。", "Plain white inside."), manual: p("保养卡。", "Care card.") },
      anchor: p("蓝外白内的反差。", "Blue outside, white inside."),
      styleDna: { typography: p("粗宋。", "Bold Song."), imagery: p("纯色。", "Flat color."), graphics: p("大色块。", "Large blocks."), finish: p("满版印刷（视觉建议）。", "Full-coverage print (visual suggestion).") },
      suitable: p("礼品。", "Gifts."), risk: p("满版印刷成本高，运输易磨损。", "Costly full coverage that scuffs in transit."),
    }),
  ],
  recommendation: {
    pick: "B",
    reason: p("蓝线把盒子和器物连成一体，开箱时最有记忆点。", "The blue line ties box and ware together and makes the unboxing memorable."),
    designerInstruction: p("选 B：飞机盒盖左侧青花蓝竖带，手绘蓝线从竖带流向右侧，细宋体“素器 釉下彩餐具四件套”。", "Go with B: a cobalt band on the left of the mailer lid, the painted line flowing right, light Song 'Suqi underglaze tableware'."),
  },
  copy: {
    nameLine: p("素器 · 釉下彩餐具四件套", "Suqi · Underglaze tableware, set of four"),
    frontPromise: p("釉下彩手绘，[ ]℃ 高温烧制。", "Hand-painted underglaze, fired at [ ] °C."),
    manualSteps: [p("首次使用前清洗。", "Wash before first use."), p("可入洗碗机、微波炉。", "Dishwasher and microwave safe."), p("避免骤冷骤热。", "Avoid sudden temperature changes.")],
    placeholders: ["[材质]", "[执行标准]", "[生产企业]", "[产地]", "[条码区]"],
  },
  claimCheck: [{ text: "抗菌陶瓷", level: "medium", issue: p("抗菌宣称需检测报告和对应标准。", "Antibacterial claims need test reports and the standard."), safer: p("没有报告就删除。", "Remove it without a report.") }],
  complianceNotes: [p("与食品接触的陶瓷需符合 GB 4806 系列并标注“食品接触用”，请按现行规定核对。", "Food-contact ceramics must meet GB 4806 and be marked for food contact; check current rules.")],
};
