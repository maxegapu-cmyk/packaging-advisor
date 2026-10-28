# 包装视觉顾问 · Packaging Advisor

面向中国国内电商卖家的网页应用：上传一张产品照片，几分钟内得到三个风格明确不同的包装方向；选定后在 3D 里按真实尺寸打样，再下载能直接交给印厂的印刷文件（1:1 刀模展开图、3 mm 出血、裁切与压痕专色、印刷工单）和电商主图。一个人、不懂设计，也能把包装做到可以印刷。

A web app for domestic Chinese e-commerce sellers: upload a product photo and get three distinct packaging directions in minutes; pick one, proof it in 3D at real size, then download a print file a printer can use (1:1 die lines, 3 mm bleed, cut and crease spot colors, job sheet) and listing images. One person with no design background can take packaging all the way to print.

当前版本是给 20 位测试者使用的 MVP。任何产品都可以上传：15 个品类分 6 组（食品饮料、美妆个护、母婴宠物、家居家电、数码与生活、其他），选「其他」时用自己的话写清是什么。
This version is the MVP for 20 testers. Any product can be uploaded: 15 categories in 6 families (food and drink, beauty and personal care, baby and pet, home, tech and lifestyle, other); with Other, the seller says in their own words what it is.

**四步流程 · Four steps:** 上传产品 → 比较方向 → 3D 打样 → 出成品。首页、我的产品、上传页、方案板和 3D 空间都显示同一条进度，并给出下一步。 Upload a product → compare directions → proof in 3D → final files. The homepage, product list, upload page, board and 3D space all show the same progress and the next step.

**外观 · Look:** 整站按宋代的装裱与宋版书来做。页面是天青色的绢（汝窑釉色），带细细的织纹；首屏影片和 3D 展台像装裱好的画，裱在天青底上，四周一细一粗两道线。中文版每节的标题是一张竖写的「题签」，顶端有宋版书版心的黑鱼尾，滚动时留在一侧；首屏标题竖排成两行题跋，去掉标点，下钤一方朱印。唯一的暖色是朱砂，只用作印：品牌是一方白文印「包装顾问」（先读右行），四个步骤的序号是「壹贰叁肆」小印。结尾一屏是带开片纹的天青釉面，页脚是文武边栏框住的牌记。标题用宋体，题跋与引语用楷体，正文用无衬线；直角与 2–3 px 小圆角。默认浅色；右上角可切换深色（玄漆黑底、月白字、朱印不变），选择会被记住，且在页面绘制前生效、不闪烁。界面只有中文与英文两种语言（默认中文；英文版标题横排，保留鱼尾、印与边栏）。分段按钮与标签页的选中块会平滑滑动，切换的面板淡入。 The site is set like a mounted Song painting and a Song-printed book. The page is pale celadon silk (the glaze of Ru ware) with a faint weave; the hero film and the 3D booth are mounted on it like paintings, framed by a thin line and a second line outside. In Chinese each section title is a vertical title slip (题签) topped by the black fishtail (鱼尾) of a Song book's centre fold, kept in view as the section scrolls; the hero headline is a two-column vertical inscription without punctuation, sealed below. The only warm colour is cinnabar, and it is only ever a seal: the brand is a square seal reading 包装顾问 (right column first), and the four steps are numbered 壹贰叁肆 in small seals. The closing screen is crazed celadon glaze; the footer is a printer's colophon inside a thick-and-thin frame. Song type for titles, Kai for inscriptions and quotes, a plain sans for reading; square corners with 2–3 px radii. Light by default; a switch at the top right turns it dark (lacquer black, moon-white type, the seals unchanged), remembered and applied before the first paint, so there is no flash. The interface comes in Chinese (default) or English (English titles run horizontally and keep the fishtails, seals and frames). Segmented controls and tabs slide their highlight; switched panels fade in.

---

## 功能 · Features

| 功能 Feature | 说明 | Description |
| --- | --- | --- |
| 公开首页 Landing page | 首屏是一段用代码实时绘制的循环影片「共生」：印刷图案在纸上印出、刀线裁切、平面展开图折成盒子（或标签卷上铁罐和瓶身），立体成型的同时，平面的轮廓、连接线和尺寸线仍留在纸上，平面与立体互为一体；五种产品轮流出现。首屏右上角可切换第二部影片「平面到立体」，同样由代码实时绘制：二十种日常在用的包装（反向插舌盒、马口铁罐、飞机盒、自立袋、玻璃瓶、天地盖礼盒、易拉罐、枕式袋、抽屉盒、按压瓶、瓦楞纸箱、玻璃罐、书型磁吸盒、软管、手提纸袋、利乐砖、陶瓷茶叶罐、吸塑卡、纸罐、松木抽盖箱）在一条连续的镜头里依次出现，每种都按真实毫米尺寸，先出矢量刀模（刀线实线、压痕虚线），激光线扫过印出图案，再以它真实的成型方式变成立体：纸盒和纸箱沿压痕折起（与印刷文件用同一份折叠定义），标签和铁皮卷上瓶罐，复合膜立起鼓成袋，透明片吸塑在卡上；成品的全息轮廓从一开始就在，扫描面把它变成真实材质，最后标出尺寸。两部影片都随浅色/深色主题变化（浅色是纸、墨与天青，深色是夜色里发光的天青），镜头切换和下一种包装的准备都分散在多帧里完成，不会卡顿。两部影片都保留，选择会被记住。之后是四步流程（每步配实际产出的小图）、15 个品类总览、10 个示例（每个都可在页内旋转或进 3D 空间）。页面取宋代书画与刻本的做法：首屏像装裱的画，两方收藏印（「真尺」朱文、「可印」白文）骑在裱边上；四步画在一卷手卷上，起首是天杆、末端是带轴头的卷轴，步与步之间以隔水分开，第一次看到时展开一次（减少动态时直接展开）；首屏题字、各节标题（宽屏中文下是竖写的题签）和结尾一句用同一种题字体；结尾像宋版书封面，文武边框、四角回纹、远山水墨，居中对称 | The first screen is a looping film drawn live in code, “Symbiosis”: artwork prints on a sheet, the die cuts it, the flat net folds into a box (or a label wraps a tin or bottle), and while the 3D form stands the flat outline, threads and dimension lines stay on the sheet; five products take turns. A tab at the top right switches to a second film, “Flat to form”, also drawn live in code: twenty packs in everyday use (reverse tuck carton, tinplate tin, mailer, stand-up pouch, glass bottle, lid-and-base gift box, drink can, flow-wrap pack, drawer box, pump bottle, shipping carton, glass jar, magnetic book box, squeeze tube, carrier bag, aseptic brick, porcelain caddy, blister card, paper tube, pine crate) pass in one continuous shot, each at its real size in mm. Each starts as a vector dieline (cuts solid, creases dashed), is printed by a sweeping laser line, then takes its 3D form the way it really does: boards fold on their creases (from the same fold description as the print file), labels and tinplate wrap round their bodies, films stand up and swell into a pouch, clear PET is formed over a card. A hologram of the finished pack waits from the start; a scanning plane turns it into real materials, and the dimensions are marked. Both films follow the light or dark theme (paper, ink and celadon; or glowing celadon at night), and the next pack is prepared a few milliseconds at a time across frames, so nothing stutters. Both films stay; the choice is remembered. Then the four steps (each with a picture of what it produces), all 15 categories and 10 samples, each rotatable in place or in the 3D space. The page borrows from Song painting and printed books: the first screen is mounted like a painting, with two collectors' seals (真尺 in red characters, 可印 in white) pressed across the mount; the four steps sit on a handscroll, a stick at the start and a roll with knobs at the end, silk dividers between steps, unrolling once when it first comes into view (already open when motion is reduced); the hero's inscription, the section titles (vertical title slips on wide screens in Chinese) and the closing line are set in the same inscription face; the closing call is set like a Song-printed cover, a thick-and-thin frame with key-fret corners and distant hills in ink wash, all on the centre line |
| 上传产品 Upload | 拖入或点选产品照片（每张可加备注）、可选参考图、按组选品类、品牌和产品名；右侧说明提交后的三步。未登录点击上传会先登录再回到上传页 | Drag in or choose product photos (each with an optional note), optional references, category by family, brand and name; the side panel explains the next three steps. Signed-out visitors sign in and land back on the upload page |
| 我的产品 My products | 每个产品一张卡片：照片缩略图、四段进度、下一步该做什么 | One card per product: photo thumbnail, four-segment progress and the next thing to do |
| 邀请码登录 Invite sign-in | 每位测试者一个邀请码，无需注册 | One code per tester, no sign-up |
| 三个方向 Three directions | 稳妥耐看 / 有识别度（推荐）/ 大胆探索，每条含色彩卡、四载体版式、视觉锚点、风格 DNA、草图、适用与风险 | Safe / distinctive (recommended) / bold, each with color card, four-carrier layout, anchor, style DNA, sketch, fit and risk |
| 宋式版式 Song layouts | 六种正面版式中有三种取自宋代书画与刻本，3D、方案板和印刷文件同一份绘制：立轴/手卷（天头地头、惊燕、隔水，画心是青绿或水墨远山，品名楷书竖题，下钤白文印；横向面板为手卷，引首在右）；一方大印（品牌刻成白文大印，石面磨损、印泥不匀，旁以重宋体书品名）；宋版书封面（文武边框、四角回纹、中轴题签竖写品名、朱文小印，横向面板品名居中两侧细线菱形）。印章按品牌字数排成 1、2、3 或 4 格（右列先读），印色取方案里最接近朱砂的颜色；远山在主色是绿或蓝时用青绿，否则用水墨。茶叶、酒水、地方特产三个示例各有一个方向用了这三种版式。题字（立轴的品名与小字、宋版书封面的题签、宋锦盒题签）用一种「题字体」：配置了已授权的瘦金体网页字体时用瘦金体，否则用内置的开源朱雀仿宋（SIL OFL 1.1，取民国「南宋」仿宋活字，按 Unicode 分成 112 片，页面只下载用到的字），再没有才用楷体；3D、印刷文件和电商图片都在字形加载后才画，三者一致 | Three of the six front layouts come from Song painting and printed books, drawn once for the 3D, the board and the print file: hanging scroll or handscroll (mount bands, 惊燕 strips, 隔水 rules, a painting of distant hills in blue-green or ink, the name written down it in 楷 and sealed in white characters; landscape panels become a handscroll with the title section on the right); one large seal (the brand cut as a white-character seal with a worn stone edge and uneven paste, the name beside it in heavy Song type); a Song-printed cover (thick-and-thin frame, key-fret corners, a title slip down the centre line, a small red-character seal; landscape panels centre the name between fine rules and lozenges). Seals lay out the brand in 1, 2, 3 or 4 cells (right column first) in the palette colour nearest cinnabar; the hills are blue-green when the key colour is green or blue, ink otherwise. The tea, drinks and regional specialty samples each have one direction in one of these layouts. The inscriptions (the scroll's name and line, the cover's title slip, the brocade box's slip) are written in one inscription face: 瘦金体 (Slender Gold) when a licensed web font is configured, otherwise the bundled open-source 朱雀仿宋 Zhuque Fangsong (SIL OFL 1.1, after the 1930s "Nansong" Fangsong type, sliced into 112 Unicode ranges so a page downloads only the characters it shows), and Kaiti last; the 3D, the print file and the listing images draw only once its glyphs have loaded, so all three match |
| 3D 空间 3D space | 核心功能。每个品类有自己的默认包装（茶叶礼盒配两只茶罐、酒水礼盒配玻璃瓶、零食自立袋、数码抽屉盒、玩具泡罩卡等），可随时改。three.js 物理渲染，材质与灯光按商品摄影标准。每个方向画在真实包装上，按卖家填写的毫米尺寸，共 19 种，按材料分组：纸与卡纸（直立盒可展开成刀模、天地盖礼盒、书型磁吸礼盒、瓦楞飞机盒、抽屉盒、纸罐、手提纸袋）、复合材料（利乐砖，带旋盖）、塑料（自立拉链袋、按压瓶、软管、泡罩卡）、玻璃（玻璃罐、玻璃瓶）、金属（马口铁罐、易拉罐，可拉开拉环）、陶瓷（瓷茶叶罐）、木材（抽盖松木箱，盖面激光烙印）、织物（宋锦盒：灰板外裱宋锦，龟背纹由方案配色织成，后侧铰链开盖，盖面左侧贴印刷题签，前面扣与绳圈扣合，内衬缎面软垫；用料取自委托方材料清单）。组合包装：把产品（瓶、罐、易拉罐、利乐砖、管、袋）装进外盒（纸盒、礼盒、飞机盒、抽屉盒、木箱、纸袋），外盒尺寸按产品自动配，内托可选植绒、纸浆模塑、EPE 珍珠棉或卡纸，打开时产品落进内托。任何开合和解剖动作中，模型都不会穿过地面或彼此穿插。720° 翻转、双指/滚轮缩放、惯性旋转、自动旋转、五个视角、细节镜头（附方案板说明）、表面处理分两层：基础六选一（哑膜、亮膜、触感膜、不覆膜纸感、宣纸、洒金笺），再叠加特殊工艺（烫金、烫银、镭射烫印三选一；击凸、压凹、凸版压印三选一；可加局部 UV），3D 中各自按真实材质呈现：宣纸有长纤维和云絮、洒金笺的金箔碎片随光闪烁、击凸和压凹有 0.3 mm 斜肩、凸版压印把全部文字浅浅压进纸里；宋式版式中天头地头等大面积底色保持印刷，烫金只落在题字、隔水细线和边框上，小印始终印刷、不烫金；背景五种：素白、天青、墨三种陈列底（按品类和配色推荐：护肤、香氛、茶与茶器用天青，酒水、高端礼盒和深色包装用墨，其余用素白），加电商白底和品牌色；「尺寸」页可在包装旁放一件真实大小的日常物品（手机、银行卡、一元硬币、500 ml 矿泉水、A4 纸）对比大小，并列出外形尺寸、容积、印刷用纸面积和最大部件。参考了得物 App 的 3D 商品展示与 Pacdora 的包装 3D 预览；可导出高清 PNG | Core feature. Each category starts from its own default pack (tea gift box with two tins, drinks gift box with a glass bottle, snack pouch, electronics drawer box, toy blister card and more), changeable at any time. Physically based three.js rendering lit like product photography. Each direction on real packaging at the seller's size in mm, 19 forms grouped by material: paper and board (tuck carton that unfolds to its net, lid-and-base gift box, book-style magnetic box, corrugated mailer, drawer box, paper tube, carrier bag), composite (aseptic brick with a screw cap), plastic (stand-up pouch, pump bottle, squeeze tube, blister card), glass (jar, bottle), metal (round tin, drink can with a working pull tab), ceramic (porcelain caddy) wood (pine crate with a sliding, laser-engraved lid) and fabric (Song brocade box: greyboard covered in brocade woven in the direction's colours with a tortoise-shell pattern, a lid hinged at the back, a printed title slip pasted on the lid, a toggle the loop hooks over, a satin-covered pad (materials from the principal's list)). Combinations: pack products (bottles, jars, cans, aseptic bricks, tubes, pouches) into an outer pack (carton, gift box, mailer, drawer box, crate, bag) sized to them automatically, in a flocked, moulded-pulp, EPE-foam or card insert; opened, the products drop into the insert. No part passes through the floor or another part in any open or anatomy pose. 720° turning, pinch/scroll zoom, inertia, turntable, five views, detail shots (with the board's notes), surface in two layers: one base (matte, gloss, soft-touch, unlaminated paper, xuan paper or gold-flecked paper) plus special effects (gold, silver or holographic foil, one of them; emboss, deboss or letterpress, one of them; spot UV), each rendered as its real material: xuan shows long fibres and cloudy pulp, gold flecks catch the light, emboss and deboss have a 0.3 mm shoulder, letterpress bites all the type shallowly into the sheet; on the Song layouts the large mount colours stay printed, foil goes only on the inscription, rules and frame, and small seals stay printed; five backdrops: three display galleries, off-white, celadon and ink (recommended by category and palette: celadon for skincare, fragrance, tea and tea ware; ink for spirits, premium gift sets and dark packs; off-white otherwise), plus marketplace white and the brand colour; a Size tab that stands a real-size everyday object beside the pack (phone, bank card, 1-yuan coin, 500 ml bottle, A4 sheet) and lists outside size, volume, printed board area and the largest part. Inspired by Dewu's 3D product view and Pacdora's packaging previews; exports a high-resolution PNG |
| 方案板 Board | 可拖动旋转的立体包装盒（三个方向可同步旋转对比）、色彩面积条、正面版式图、内包装与说明书小样；中文或英文，可切换 | Rotatable 3D boxes (synced for comparison), color area bars, front-layout drawings, inner pack and manual; Chinese or English, switchable |
| 只改一个维度 Single-dimension revision | 配色、版式、字体、图像或锚点，其余保持不变（由代码保证） | Color, layout, type, imagery or anchor; everything else is kept, enforced in code |
| 包装文案与核查 Copy and claim check | 只依据卖家提供的事实撰写；标出"医用级""降三高"等风险措辞并给出替代说法 | Written only from the seller's facts; flags risky claims and suggests safer wording |
| 出成品 Final files | 定稿正面文字、颜色、标志、净含量、按品类列出的标签必标项和商品条码（EAN-13 校验）；印前检查（必标项、条码、对比度、信息字号 ≥ 1.8 mm、风险措辞）；下载印刷文件 PDF（印刷工单 + 每个部件 1:1 展开图，300 dpi、3 mm 出血、CutContour 裁切与 Crease 压痕专色、裁切标记，每种特殊工艺另附一张单色工艺版：烫金、烫银、镭射、局部 UV、击凸、压凹、凸版压印）和 8 张 1600 px 电商图片（白底主图、正背面、打开、细节、尺寸图、品牌色背景、陈列图——在推荐的素白/天青/墨陈列底上）。19 种包装形态都有展开图（宋锦盒是宋锦织成不印刷，印的是盖面题签）：直立盒刀模、礼盒与书型盒裱纸、飞机盒（FEFCO 0427）、抽屉盒、纸罐、手提袋、利乐砖、自立袋、各类标签与印铁、木箱雕刻稿 | Settle the front wording, colors, logo, net content, the label items each category must carry and the EAN-13 barcode (check-digit validated); pre-press checks (mandatory items, barcode, contrast, information text ≥ 1.8 mm, risky claims); download a print PDF (job sheet plus a 1:1 page per printed part at 300 dpi with 3 mm bleed, CutContour and Crease spot colors, crop marks, and one plate per special effect: gold, silver or holographic foil, spot UV, emboss, deboss, letterpress) and eight 1600 px listing images, the last a display shot on the recommended off-white, celadon or ink gallery. All 19 forms lay out flat (the brocade box is woven, not printed; its printed part is the title slip): tuck carton die, rigid-box and book-box wraps, mailer (FEFCO 0427), drawer box, paper tube, bag, aseptic web, pouch, labels and tin blanks, crate engraving |
| 实物核对 Match the sample | 拿到打样后：正面照片叠在印刷图案上对齐比较（透明度、差异模式），填写实测外尺寸（±1 mm），从照片取色与设计色比较 CIEDE2000 色差；可选择让 3D 和电商图片按实物取色显示。确认之前，电商图片在说明和界面里都标注为渲染图 | When the printer's sample arrives: overlay a front photo on the print artwork (opacity and difference mode), enter the measured size (±1 mm), pick colors from the photo and compare them by CIEDE2000; optionally show the 3D and listing images in the sample's measured colors. Until confirmed, listing images are marked as renders in the file notes and on screen |
| 材料清单 Material list | 选材只用委托方提供的《中国日用商品内外包装材料总表》（168 种材料、23 条合规规则，核对日期 2026-10-28）。3D 空间的「材料」页按部件列出材料（如天地盖礼盒：灰板骨架、裱纸、内托；马口铁罐：罐身、内涂层、内封），全部可改：每个部件可选清单里任一材料（适合这个盒型的推荐项排在前面，选推荐外的会提示与印厂确认、3D 按常见外观示意），工艺用料（油墨、覆膜、胶、涂层）可换或不用，每个部件可填规格/克重、颜色（内托、锦盒扣与绳圈、拉带、提手、盒板背面和木箱在 3D 中同步）、供应商和备注，可改“是否直接接触内容物”，可新增自定义部件，清单外部件可指定清单材料代替，“寄递”“购物袋”用途可手动切换；选择后 3D 外观（板背与切边、内托颜色、锦盒扣、木种、纸罐内衬）、结构解剖的部件说明、印刷工单和渲染简报一起更新。表面工艺决定承印纸：覆膜只配铜版类，不覆膜配特种纸，宣纸和洒金笺按清单 M038 手工装饰纸采购。规则按品类、部件是否直接接触内容物、是否寄递或作购物袋自动列出（G01 一般质量；G02 食品与化妆品销售包装；G03/G04 快递；P01 购物袋；直接接触食品的部件加 F01 和材料自身的 F 规则，如金属 F05、玻璃 F04、陶瓷 F06、内涂层 F08、油墨 F13；直接接触化妆品加 C01），并给出应向供应商索取的资料。清单标明“非食品”的材料用在接触食品的部件上会报错；清单里没有的部件（书型盒的磁铁、手提袋的金属扣眼、烫印电化铝、镭射烫印膜）只标为“清单外，待委托方确认”，不擅自替换。印刷工单第 2 页列出全部用料、适用规则和所需资料。生成方案时，模型只能从清单选材并写明编号，写了清单外编号的结果会被退回重写 | Materials come only from the principal's list (168 materials, 23 compliance rules, checked 2026-10-28). The Materials tab of the 3D space lists the pack's parts (a lid-and-base box: board core, wrap, insert; a tin: body, inner lacquer, inner seal), and all of it can be changed: any listed material for any part (the ones recommended for the structure first; a pick outside them asks you to check with the printer and is drawn with the usual look), process materials (ink, lamination, glue, coatings) changed or dropped, each part's grade, colour (shown in 3D for inserts, the brocade toggle and loop, ribbons, handles, the board's back and the crate), supplier and note, whether a part touches the contents, parts of your own, a listed material for a part off the list, and courier or shopping-bag use set by hand; a choice updates the 3D look (board back and cut edge, insert colour, the brocade box's toggle, timber, a paper tube's liner), the anatomy notes, the job sheet and the render brief together. The finish decides the printed paper: laminated finishes take coated papers, uncoated ones specialty papers, and xuan and gold-flecked paper are bought as the list's M038 handmade paper. The rules follow the category, whether a part touches the contents, and whether the pack is couriered or a shopping bag (G01 general quality; G02 food and cosmetics sales packs; G03/G04 courier; P01 shopping bags; food-contact parts add F01 and the material's own F rule, such as F05 metal, F04 glass, F06 ceramic, F08 inner lacquer, F13 ink; cosmetics-contact parts add C01), with the documents to get from suppliers. A material the list limits to non-food uses on a part that touches food is an error; parts the list doesn't cover (a book box's magnets, a bag's metal eyelets, hot-stamping foil, holographic stamping foil) are marked off the list for the principal to confirm, never swapped. Page 2 of the job sheet lists every material, the rules and the documents. When generating, the model may only name listed materials, by number; a result naming any other number is sent back |
| 分享给设计师 Share | 只读链接，不含卖家上传的图片，可随时停用 | Read-only link without the seller's uploads; can be turned off |
| 可插拔模型 Pluggable models | 管理员接入任何提供 API Key 的平台；测试者在生成时自由选择模型 | Admin connects any API-key platform; testers pick a model per board |
| 测试数据 Test tracking | 每位测试者的生成、选定、交出、失败与反馈，直接对应 MVP 指标 | Per-tester generations, picks, hand-offs, failures and feedback, matching the MVP measure |

## 快速开始（本地） · Quick start (local)

需要 Node.js 22.13 或更高版本（使用内置的 `node:sqlite`）。 Requires Node.js 22.13+ (uses the built-in `node:sqlite`).

```bash
npm install
cp .env.example .env.local      # 填写 APP_SECRET  Fill in APP_SECRET
npm run dev
```

首次启动时，终端会打印一个**管理员邀请码**（只显示一次）。用它登录 http://localhost:3000 。
On first start the terminal prints an **admin invite code** (shown once). Sign in with it at http://localhost:3000.

内置的"演示（离线）"模型不需要 API Key，可以先走通整个流程。
The built-in "Demo (offline)" model needs no API key, so you can try the whole flow first.

## 部署（Docker） · Deploy with Docker

```bash
cp .env.example .env            # 填写 APP_SECRET、PUBLIC_URL  Fill in APP_SECRET and PUBLIC_URL
docker compose up -d --build
docker compose logs app | grep -A2 "Admin invite"   # 查看首个管理员邀请码 First admin code
```

- 数据（数据库和上传图片）保存在 `./data`，请定期备份。 Data (database and uploads) lives in `./data`; back it up.
- 使用 HTTPS 时，在 `.env` 中设置 `COOKIE_SECURE=true`。 With HTTPS, set `COOKIE_SECURE=true`.
- 在中国大陆的服务器上提供服务需办理 ICP 备案。 Serving from a mainland China server requires ICP filing.
- 瘦金体（可选，当前未启用）：题字体默认是内置的朱雀仿宋。要换成已授权的瘦金体（例如汉仪瘦金书简），在部署机器上运行 `python3 scripts/fonts/add_shoujin.py <字体.ttf>`，它把字体按 Unicode 切片放进 `public/fonts/shoujin/`（已在 `.gitignore` 中，授权字体不进仓库），构建时自动启用；删掉这个目录再构建即恢复朱雀仿宋。字体放在别处时，可在 `.env` 设置 `NEXT_PUBLIC_SHOUJIN_FONT_URL`。授权须同时覆盖网页嵌入和印刷品。 Slender Gold (瘦金体), optional and currently off: the inscription face is the bundled Zhuque Fangsong. To use a licensed 瘦金体 instead (Hanyi Shoujin Shu, say), run `python3 scripts/fonts/add_shoujin.py <font.ttf>` on the machine you deploy from; it slices the font into `public/fonts/shoujin/` (git-ignored, so the licensed font stays out of the repository) and the build switches to it. Delete that folder and rebuild to go back to Zhuque Fangsong. If the font is served from elsewhere, set `NEXT_PUBLIC_SHOUJIN_FONT_URL` in `.env`. The licence must cover web embedding and printed products.
- 内置的朱雀仿宋由 `scripts/fonts/build_zhuque.py` 从字体源文件生成（克隆 TrionesType/zhuque 后运行），换新版本时重跑即可。 The bundled Zhuque Fangsong is generated from the font's source by `scripts/fonts/build_zhuque.py` (clone TrionesType/zhuque, then run it); rerun it for a new release.

## 接入模型平台 · Connecting model platforms

登录管理员账号 → **管理 → 模型平台**：
Sign in as admin → **Admin → Model platforms**:

1. 选择常用平台（硅基流动、阿里云百炼、DeepSeek、Kimi、智谱、火山方舟、OpenRouter、OpenAI、Anthropic）或自定义，填写接口地址和 API Key。 Pick a common platform or enter a custom one, with base URL and API key.
2. 点"从平台获取模型列表"一键添加模型，或手动填写模型 ID。 Click "Fetch model list" to add models in one click, or type a model ID.
3. 为能看图的模型勾选"能看图"。不能看图的模型只根据文字生成。 Tick "Can see images" for vision models; others work from text only.
4. 点"测试连接"确认可用，再"设为默认"。 Click "Test", then "Make default".

支持两种协议：**OpenAI 兼容**（绝大多数平台和自建的 vLLM / Ollama）与 **Anthropic**。API Key 使用 `APP_SECRET` 加密保存，不会发送到浏览器。预设的接口地址请以各平台官方文档为准。
Two protocols are supported: **OpenAI-compatible** (most platforms, plus self-hosted vLLM/Ollama) and **Anthropic**. Keys are encrypted with `APP_SECRET` and never sent to the browser. Confirm preset base URLs against each platform's docs.

上线给测试者之前，建议在管理页停用"演示（离线）"模型，或设置 `DEMO_PROVIDER=off`。
Before testers start, disable the demo model in the admin page or set `DEMO_PROVIDER=off`.

## 发放邀请码 · Issuing invite codes

**管理 → 邀请码 → 生成**，例如数量 20、备注前缀"浙江卖家"。完整邀请码只显示一次，请立即复制。之后可以修改备注或停用某个邀请码（停用会立即退出该测试者的登录）。
**Admin → Invite codes → Create**, e.g. count 20 with label prefix "Zhejiang seller". Full codes are shown once, so copy them right away. Later you can relabel or disable a code (disabling signs that tester out immediately).

本地开发时也可以用命令行： Locally you can also use the CLI:

```bash
npm run invites -- 20 "浙江卖家"
```

## 测试期间看什么 · What to watch during the test

**管理 → 测试概况** 显示每位测试者的产品数、方案数、选定方向、"已交给设计师或印厂"、失败次数和反馈。MVP 的判断标准是：至少一半测试者选定方向并交出。
**Admin → Test overview** shows each tester's products, boards, picks, hand-offs, failures and feedback. The MVP bar: at least half the testers pick a direction and hand it on.

## 使用的技能 · Skills used

`skills/` 中打包了生成时实际读取的技能说明，提示词由它们组成（见 `src/lib/prompts.ts`）：
The skill files the app reads at generation time are bundled in `skills/`; prompts are built from them (see `src/lib/prompts.ts`):

| 技能 Skill | 用途 Use | 来源 Source |
| --- | --- | --- |
| packaging-visual-direction | 核心引擎 Engine | 2026-10-skills |
| reference-rendering-reader | 参考图解读 Reference reading | skill-home |
| color-dna-card-extractor | 参考图取色 Reference colors | skill-home |
| natural-writer | 包装文案 Packaging copy | 2026-10-skills（MIT） |
| front-door | 品名与正面主张 Name line and front promise | 2026-10-skills（纸火） |
| precision-lamp | 措辞风险核查 Claim check | 2026-10-skills（纸火） |
| xiaohongshu-netfeel-guardian | 中文语感 Native Chinese tone | skill-home（Spellbook, MIT, 见 `LICENSE-spellbook`） |

修改 `skills/` 中的文字即可调整生成效果，无需改代码。 Edit the text in `skills/` to tune results without changing code.

## 材料清单 · The material list

- 原件 Original：委托方提供的 `china-packaging-materials-2026-10-28.xlsx`，放在 `data/materials/`（`data/` 不进仓库，原件不公开 the original stays out of the repository）。
- `python3 scripts/materials/build_catalog.py` 从原件生成 `src/lib/materials/catalog.ts`（材料、规则、使用说明，中英对照）、`src/lib/materials/ids.ts`（编号表，供方案校验）和 `skills/packaging-visual-direction/references/material-list.md`（生成时给模型的清单）。英文译文在 `scripts/materials/en_materials.py` 与 `en_rules.py`；清单有新增行而没有译文时脚本会停下。 Generates the catalog, the number list and the model's reference from the original; English lives in the two `en_*.py` files, and the script stops if a row has none.
- 每个盒型有哪些部件、每个部件可选哪些清单材料、规则怎样适用，见 `src/lib/materials/index.ts`。 Which parts each structure has, which listed materials each can be, and how the rules apply: `src/lib/materials/index.ts`.
- 清单给出的是合规路径，不是合格证明：最终以供应商资料和成品检测为准；标准换版或用途变化时须重新核验。 The list gives a path to compliance, not a certificate: supplier documents and finished-product tests decide, and it must be re-verified when standards or uses change.

## 开发 · Development

```bash
npm test               # 单元与流程测试（本地 SQLite + 本地模拟模型平台） Unit and flow tests
npm run typecheck
npm run preview:board  # 不启动 Next.js，直接把演示方案板渲染成 HTML  Render the demo board to HTML
```

```
src/lib/            与框架无关的核心逻辑 Framework-agnostic core
  board/            方案板数据结构、校验、单维度修改 Board schema, validation, revision
  llm/              模型平台接口（OpenAI 兼容 / Anthropic / 演示） Model platform adapters
  prompts.ts        由技能文件组成提示词 Prompts assembled from skills
  generate.ts       生成与修改流程 Generation and revision
  auth.ts           邀请码与会话 Invites and sessions
  projects.ts       产品、上传、方案板版本、测试事件 Products, uploads, board versions, events
src/components/     方案板等页面组件 Board and shared components
  pack/             3D 引擎：盒型、灯光、相机、3D 空间 3D engine: forms, lighting, camera, studio
src/lib/pack.ts     盒型、尺寸、工艺 Package structure, size, finish
src/lib/materials/  委托方材料清单：部件、选材、规则、所需资料 The principal's material list: parts, picks, rules, documents
src/lib/print/      印刷文件：展开图、条码、色差、印前检查 Print files: nets, barcode, colour, pre-press
  folds.ts          折叠结构的唯一描述：印刷展开图和首页影片的折叠都来自它 The one fold description: print nets and the film fold from it
src/components/hero/  首页影片「共生」和「平面到立体」 The homepage films, Symbiosis and Flat to form
src/lib/theme.ts    浅色/深色主题 Light and dark themes
src/components/SegPill.tsx  分段按钮与标签页的滑动选中块 The sliding highlight of segmented controls and tabs
src/lib/renderBrief.ts  渲染简报 Render brief
src/app/            Next.js 页面、接口与管理后台 Pages, API routes and admin
skills/             生成时读取的技能说明 Skill files read at generation time
tests/              测试 Tests
```

## 3D 空间 · The 3D space

- 地址 Routes：`/space/demo`（公开示例 public sample）、`/space/<产品 id>`（登录后 signed in，改动自动保存 changes save）、`/s/<分享码>/space`（设计师只读 designer, read-only）。
- 使用 three.js 物理渲染（`src/components/three/`）：摄影棚柔光箱与轮廓灯组成的环境光照（反射真实）、Khronos PBR Neutral 色调映射（印刷色准确）、0.45 mm 卡纸厚度与纸芯毛边、纸纤维微表面、覆膜清漆反光、按烫金掩膜生成的金属烫金、马口铁卷边与罐盖、柔和接触阴影。 Rendered with three.js PBR: a studio of softboxes and strip lights for real reflections, Khronos PBR Neutral tone mapping for true print colors, 0.45 mm board thickness with raw edges, paper-fibre micro-surface, laminate clearcoat, real metallic foil from a stamped mask, tinplate beads and lid, soft contact shadows.
- 照片级渲染：在 3D 空间里停止操作约 0.2 秒后，路径追踪器（three-gpu-pathtracer）接手，在真实的摄影无缝背景纸上逐帧累积采样，得到真实的全局光照、柔和阴影、角落遮蔽和轻微景深；采样过程中有渐弱的去噪。拖动时切回实时渲染，两者使用同一套摄影棚灯光，切换时光线不跳。导出图片会等路径追踪完成后输出。 Photoreal: about 0.2 s after the view stops, a path tracer (three-gpu-pathtracer) takes over and accumulates samples on a real seamless photo sweep, giving true global illumination, soft shadows, corner occlusion and a touch of depth of field, with denoising that fades as samples build up. Dragging returns to the live renderer; both use the same studio light, so nothing jumps. Exports wait for the path-traced frame.
- 结构解剖：参照 anatomy 技能（wheresryan22/anatomy，MIT）的方法——部件按顺序弹开、每个部件编号、每个数字都由模型算出——在 3D 空间里把盒子拆开，列出各部件及其尺寸和工艺。 Anatomy: following the method of the anatomy skill (wheresryan22/anatomy, MIT), assemblies spring apart in sequence and every part is numbered, with every number computed from the model.
- 切换流畅：点击后先让页面画一帧（标签的滑块用只改 transform 的合成器动画，主线程忙时也不卡）；新模型在后台准备——着色器并行编译（KHR_parallel_shader_compile）、贴图分帧上传——准备好再换上，旧模型留在画面上直到新模型画出；一页上有几个模型时每帧只重建一个；纯色面用几像素的贴图；切换示例时不再重建 WebGL 画布。首页两部影片切换时交叉淡入，建好的影片保留，切回时立即继续。 Smooth switching: a click first gets a frame of its own (the tabs' highlight glides on the compositor, so a busy main thread doesn't stall it); the new model is readied in the background (shaders compiled in parallel, textures uploaded a few per frame) and swapped in when ready, the old one staying on screen until then; with several models on a page only one rebuilds per frame; flat-colour faces use a few-pixel texture; switching samples no longer recreates the WebGL canvases. The homepage films crossfade, and a film once built is kept, so switching back is immediate.
- 卡纸面板有约 0.3–0.6 mm 的自然鼓起，折边有柔化高光；纸纤维用法线贴图表现，两种渲染器都支持。 Board panels bow very slightly and folds catch a softened highlight; paper fibre is a normal map both renderers support.
- 印刷图稿按每毫米最高 16 像素在浏览器中绘制（`art.ts`），可导出 2400 像素宽的 PNG。 Print artwork is drawn in the browser at up to 16 px/mm, and a 2400 px-wide PNG can be exported.
- 浏览器不支持 WebGL 时，自动退回 CSS 3D 版本（`PackageCSS.tsx`）。 Without WebGL it falls back to the CSS 3D version.
- 首页两部影片在不支持 WebGL 的浏览器里改为播放预先录好的视频，浅色与深色主题各一版（`public/hero/<影片>-<light|dark>.mp4`）。 Without WebGL, the two homepage films play pre-recorded videos instead, one for each theme (`public/hero/<film>-<light|dark>.mp4`).
- 盒型与尺寸按产品保存，方案板、3D 空间和分享链接显示一致。 Structure and size are saved per product, so the board, the 3D space and share links match.
- 渲染简报按 skill-home 中 `ecommerce-3d-render-assistant` 的棚拍规则生成。 The render brief follows the studio rules of the `ecommerce-3d-render-assistant` skill from skill-home.

## 致谢 · Credits

- [three.js](https://threejs.org)（MIT）
- [three-gpu-pathtracer](https://github.com/gkjohnson/three-gpu-pathtracer) 与 [three-mesh-bvh](https://github.com/gkjohnson/three-mesh-bvh)，Garrett Johnson（MIT）
- [朱雀仿宋 Zhuque Fangsong](https://github.com/TrionesType/zhuque)，璇玑造字 TrionesType（SIL OFL 1.1，许可证见 `public/fonts/zhuque/OFL.txt`）：题字与题签的内置字体 The bundled inscription face
- [anatomy](https://github.com/wheresryan22/anatomy)，wheresryan22（MIT）：结构解剖视图采用了它的爆炸视图与编号部件方法 The anatomy view adopts its exploded-view and numbered-parts method

## 已知限制 · Known limits

- 渲染图与实物的一致性：图案、尺寸和盒型结构与印刷文件同源，但纸张、油墨、印厂刀模和内装产品的真实外观只有实物打样能确认；请用「实物核对」比对后再把图片当作实物图使用。 Renders share the print file's artwork, size and structure, but paper, ink, the printer's die and the product inside can only be confirmed on a printed sample; use “Match the sample” before presenting images as the real product.
- 印刷文件中的文字随图案以 300 dpi 位图输出（中文字体不内嵌）；需要矢量文字时请让印厂或设计师替换。 Text in the print file is rasterised with the artwork at 300 dpi (Chinese fonts aren't embedded); ask the printer if vector text is required.
- 标签必标项按常见法规整理（GB 7718、化妆品标签管理办法等），法规会更新，内容需你核对。 Mandatory label items follow common rules (GB 7718, cosmetics labelling measures and others); rules change, so check them.
- 离线演示模型（未接入真实模型时）只有四套示例方案，会返回品类最接近的一套并换上卖家的产品名和品牌；真实方案需要接入模型平台。 The offline demo model has four sample boards; it returns the one nearest the category with the seller's name and brand swapped in. Real boards need a connected model platform.
- 方案板中的色值是屏幕色，正式印刷前需要打样；标签与合规内容只做提醒，不构成合规审查。 HEX values are screen colors; proof before printing. Labeling notes are reminders, not a compliance review.
- 正面草图使用等宽字符绘制，中文字符宽度不一，对齐只是示意。 The ASCII front sketch is approximate with Chinese characters.
- 完整概念效果图（第二阶段）尚未包含。 Full concept mockups (Phase 2) are not included yet.
- 刀模为标准结构（直立盒、礼盒裱纸、FEFCO 0427 等），开模前请以印厂刀模为准。 Die lines are standard structures (tuck carton, rigid-box wraps, FEFCO 0427 and others); use your printer's die before cutting.
- 3D 空间需要支持 WebGL 2 的浏览器（近五年的主流浏览器均可）；低端手机上首次加载需 1–2 秒。照片级渲染依赖显卡，独立显卡几秒内完成，集成显卡或手机上需要更久（仍可随时拖动）。 Photoreal rendering is GPU-bound: seconds on a discrete GPU, longer on integrated graphics or phones (the view stays draggable). The 3D space needs WebGL 2 (any mainstream browser of the last five years); first load takes 1–2 s on low-end phones.
