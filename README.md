# 包装视觉顾问 · Packaging Advisor

面向中国国内电商卖家的网页应用：上传一张产品照片，几分钟内得到三个风格明确不同的包装方向；选定后在 3D 里按真实尺寸打样，再下载能直接交给印厂的印刷文件（1:1 刀模展开图、3 mm 出血、裁切与压痕专色、印刷工单）和电商主图。一个人、不懂设计，也能把包装做到可以印刷。

A web app for domestic Chinese e-commerce sellers: upload a product photo and get three distinct packaging directions in minutes; pick one, proof it in 3D at real size, then download a print file a printer can use (1:1 die lines, 3 mm bleed, cut and crease spot colors, job sheet) and listing images. One person with no design background can take packaging all the way to print.

当前版本是给 20 位测试者使用的 MVP。任何产品都可以上传：15 个品类分 6 组（食品饮料、美妆个护、母婴宠物、家居家电、数码与生活、其他），选「其他」时用自己的话写清是什么。
This version is the MVP for 20 testers. Any product can be uploaded: 15 categories in 6 families (food and drink, beauty and personal care, baby and pet, home, tech and lifestyle, other); with Other, the seller says in their own words what it is.

**四步流程 · Four steps:** 上传产品 → 比较方向 → 3D 打样 → 出成品。首页、我的产品、上传页、方案板和 3D 空间都显示同一条进度，并给出下一步。 Upload a product → compare directions → proof in 3D → final files. The homepage, product list, upload page, board and 3D space all show the same progress and the next step.

---

## 功能 · Features

| 功能 Feature | 说明 | Description |
| --- | --- | --- |
| 公开首页 Landing page | 首屏是一段用代码实时绘制的循环影片「共生」：印刷图案在纸上印出、刀线裁切、平面展开图折成盒子（或标签卷上铁罐和瓶身），立体成型的同时，平面的轮廓、连接线和尺寸线仍留在纸上，平面与立体互为一体；五种产品轮流出现。首屏右上角可切换第二部影片「平面到立体」，同样由代码实时绘制：二十种日常在用的包装（反向插舌盒、马口铁罐、飞机盒、自立袋、玻璃瓶、天地盖礼盒、易拉罐、枕式袋、抽屉盒、按压瓶、瓦楞纸箱、玻璃罐、书型磁吸盒、软管、手提纸袋、利乐砖、陶瓷茶叶罐、吸塑卡、纸罐、松木抽盖箱）在一条连续的镜头里依次出现，每种都按真实毫米尺寸，先出矢量刀模（刀线实线、压痕虚线），激光线扫过印出图案，再以它真实的成型方式变成立体：纸盒和纸箱沿压痕折起（与印刷文件用同一份折叠定义），标签和铁皮卷上瓶罐，复合膜立起鼓成袋，透明片吸塑在卡上；成品的青色全息轮廓从一开始就在，扫描面把它变成真实材质，最后标出尺寸。两部影片都保留，选择会被记住。之后是四步流程（每步配实际产出的小图）、15 个品类总览、10 个示例（每个都可在页内旋转或进 3D 空间） | The first screen is a looping film drawn live in code, “Symbiosis”: artwork prints on a sheet, the die cuts it, the flat net folds into a box (or a label wraps a tin or bottle), and while the 3D form stands the flat outline, threads and dimension lines stay on the sheet; five products take turns. A tab at the top right switches to a second film, “Flat to form”, also drawn live in code: twenty packs in everyday use (reverse tuck carton, tinplate tin, mailer, stand-up pouch, glass bottle, lid-and-base gift box, drink can, flow-wrap pack, drawer box, pump bottle, shipping carton, glass jar, magnetic book box, squeeze tube, carrier bag, aseptic brick, porcelain caddy, blister card, paper tube, pine crate) pass in one continuous shot, each at its real size in mm. Each starts as a vector dieline (cuts solid, creases dashed), is printed by a sweeping laser line, then takes its 3D form the way it really does: boards fold on their creases (from the same fold description as the print file), labels and tinplate wrap round their bodies, films stand up and swell into a pouch, clear PET is formed over a card. A cyan hologram of the finished pack waits from the start; a scanning plane turns it into real materials, and the dimensions are marked. Both films stay; the choice is remembered. Then the four steps (each with a picture of what it produces), all 15 categories and 10 samples, each rotatable in place or in the 3D space |
| 上传产品 Upload | 拖入或点选产品照片（每张可加备注）、可选参考图、按组选品类、品牌和产品名；右侧说明提交后的三步。未登录点击上传会先登录再回到上传页 | Drag in or choose product photos (each with an optional note), optional references, category by family, brand and name; the side panel explains the next three steps. Signed-out visitors sign in and land back on the upload page |
| 我的产品 My products | 每个产品一张卡片：照片缩略图、四段进度、下一步该做什么 | One card per product: photo thumbnail, four-segment progress and the next thing to do |
| 邀请码登录 Invite sign-in | 每位测试者一个邀请码，无需注册 | One code per tester, no sign-up |
| 三个方向 Three directions | 稳妥耐看 / 有识别度（推荐）/ 大胆探索，每条含色彩卡、四载体版式、视觉锚点、风格 DNA、草图、适用与风险 | Safe / distinctive (recommended) / bold, each with color card, four-carrier layout, anchor, style DNA, sketch, fit and risk |
| 3D 空间 3D space | 核心功能。每个品类有自己的默认包装（茶叶礼盒配两只茶罐、酒水礼盒配玻璃瓶、零食自立袋、数码抽屉盒、玩具泡罩卡等），可随时改。three.js 物理渲染，材质与灯光按商品摄影标准。每个方向画在真实包装上，按卖家填写的毫米尺寸，共 18 种，按材料分组：纸与卡纸（直立盒可展开成刀模、天地盖礼盒、书型磁吸礼盒、瓦楞飞机盒、抽屉盒、纸罐、手提纸袋）、复合材料（利乐砖，带旋盖）、塑料（自立拉链袋、按压瓶、软管、泡罩卡）、玻璃（玻璃罐、玻璃瓶）、金属（马口铁罐、易拉罐，可拉开拉环）、陶瓷（瓷茶叶罐）、木材（抽盖松木箱，盖面激光烙印）。组合包装：把产品（瓶、罐、易拉罐、利乐砖、管、袋）装进外盒（纸盒、礼盒、飞机盒、抽屉盒、木箱、纸袋），外盒尺寸按产品自动配，内托可选植绒、纸浆模塑、EPE 珍珠棉或卡纸，打开时产品落进内托。任何开合和解剖动作中，模型都不会穿过地面或彼此穿插。720° 翻转、双指/滚轮缩放、惯性旋转、自动旋转、五个视角、细节镜头（附方案板说明）、表面处理分两层：基础覆膜四选一（哑膜、亮膜、触感膜、不覆膜纸感），再叠加任意特殊工艺（烫金、烫银、镭射烫印三选一，加局部 UV、击凸），3D 中各自按真实材质呈现；四种背景；「尺寸」页可在包装旁放一件真实大小的日常物品（手机、银行卡、一元硬币、500 ml 矿泉水、A4 纸）对比大小，并列出外形尺寸、容积、印刷用纸面积和最大部件。参考了得物 App 的 3D 商品展示与 Pacdora 的包装 3D 预览；可导出高清 PNG | Core feature. Each category starts from its own default pack (tea gift box with two tins, drinks gift box with a glass bottle, snack pouch, electronics drawer box, toy blister card and more), changeable at any time. Physically based three.js rendering lit like product photography. Each direction on real packaging at the seller's size in mm, 18 forms grouped by material: paper and board (tuck carton that unfolds to its net, lid-and-base gift box, book-style magnetic box, corrugated mailer, drawer box, paper tube, carrier bag), composite (aseptic brick with a screw cap), plastic (stand-up pouch, pump bottle, squeeze tube, blister card), glass (jar, bottle), metal (round tin, drink can with a working pull tab), ceramic (porcelain caddy) and wood (pine crate with a sliding, laser-engraved lid). Combinations: pack products (bottles, jars, cans, aseptic bricks, tubes, pouches) into an outer pack (carton, gift box, mailer, drawer box, crate, bag) sized to them automatically, in a flocked, moulded-pulp, EPE-foam or card insert; opened, the products drop into the insert. No part passes through the floor or another part in any open or anatomy pose. 720° turning, pinch/scroll zoom, inertia, turntable, five views, detail shots (with the board's notes), surface in two layers: one base finish (matte, gloss, soft-touch or unlaminated paper) plus any special effects (gold, silver or holographic foil, one at a time, plus spot UV and embossing), each rendered as its real material; four backdrops; a Size tab that stands a real-size everyday object beside the pack (phone, bank card, 1-yuan coin, 500 ml bottle, A4 sheet) and lists outside size, volume, printed board area and the largest part. Inspired by Dewu's 3D product view and Pacdora's packaging previews; exports a high-resolution PNG |
| 方案板 Board | 可拖动旋转的立体包装盒（三个方向可同步旋转对比）、色彩面积条、正面版式图、内包装与说明书小样；中英双语，可切换 | Rotatable 3D boxes (synced for comparison), color area bars, front-layout drawings, inner pack and manual; bilingual, switchable |
| 只改一个维度 Single-dimension revision | 配色、版式、字体、图像或锚点，其余保持不变（由代码保证） | Color, layout, type, imagery or anchor; everything else is kept, enforced in code |
| 包装文案与核查 Copy and claim check | 只依据卖家提供的事实撰写；标出"医用级""降三高"等风险措辞并给出替代说法 | Written only from the seller's facts; flags risky claims and suggests safer wording |
| 出成品 Final files | 定稿正面文字、颜色、标志、净含量、按品类列出的标签必标项和商品条码（EAN-13 校验）；印前检查（必标项、条码、对比度、信息字号 ≥ 1.8 mm、风险措辞）；下载印刷文件 PDF（印刷工单 + 每个部件 1:1 展开图，300 dpi、3 mm 出血、CutContour 裁切与 Crease 压痕专色、裁切标记，每种特殊工艺另附一张单色工艺版：烫金、烫银、镭射、局部 UV、击凸）和 7 张 1600 px 电商图片（白底主图、正背面、打开、细节、尺寸图、品牌色背景）。18 种包装形态都有展开图：直立盒刀模、礼盒与书型盒裱纸、飞机盒（FEFCO 0427）、抽屉盒、纸罐、手提袋、利乐砖、自立袋、各类标签与印铁、木箱雕刻稿 | Settle the front wording, colors, logo, net content, the label items each category must carry and the EAN-13 barcode (check-digit validated); pre-press checks (mandatory items, barcode, contrast, information text ≥ 1.8 mm, risky claims); download a print PDF (job sheet plus a 1:1 page per printed part at 300 dpi with 3 mm bleed, CutContour and Crease spot colors, crop marks, and one plate per special effect: gold, silver or holographic foil, spot UV, emboss) and seven 1600 px listing images. All 18 forms lay out flat: tuck carton die, rigid-box and book-box wraps, mailer (FEFCO 0427), drawer box, paper tube, bag, aseptic web, pouch, labels and tin blanks, crate engraving |
| 实物核对 Match the sample | 拿到打样后：正面照片叠在印刷图案上对齐比较（透明度、差异模式），填写实测外尺寸（±1 mm），从照片取色与设计色比较 CIEDE2000 色差；可选择让 3D 和电商图片按实物取色显示。确认之前，电商图片在说明和界面里都标注为渲染图 | When the printer's sample arrives: overlay a front photo on the print artwork (opacity and difference mode), enter the measured size (±1 mm), pick colors from the photo and compare them by CIEDE2000; optionally show the 3D and listing images in the sample's measured colors. Until confirmed, listing images are marked as renders in the file notes and on screen |
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
src/lib/print/      印刷文件：展开图、条码、色差、印前检查 Print files: nets, barcode, colour, pre-press
  folds.ts          折叠结构的唯一描述：印刷展开图和首页影片的折叠都来自它 The one fold description: print nets and the film fold from it
src/components/hero/  首页影片「共生」和「平面到立体」 The homepage films, Symbiosis and Flat to form
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
- 卡纸面板有约 0.3–0.6 mm 的自然鼓起，折边有柔化高光；纸纤维用法线贴图表现，两种渲染器都支持。 Board panels bow very slightly and folds catch a softened highlight; paper fibre is a normal map both renderers support.
- 印刷图稿按每毫米最高 16 像素在浏览器中绘制（`art.ts`），可导出 2400 像素宽的 PNG。 Print artwork is drawn in the browser at up to 16 px/mm, and a 2400 px-wide PNG can be exported.
- 浏览器不支持 WebGL 时，自动退回 CSS 3D 版本（`PackageCSS.tsx`）。 Without WebGL it falls back to the CSS 3D version.
- 盒型与尺寸按产品保存，方案板、3D 空间和分享链接显示一致。 Structure and size are saved per product, so the board, the 3D space and share links match.
- 渲染简报按 skill-home 中 `ecommerce-3d-render-assistant` 的棚拍规则生成。 The render brief follows the studio rules of the `ecommerce-3d-render-assistant` skill from skill-home.

## 致谢 · Credits

- [three.js](https://threejs.org)（MIT）
- [three-gpu-pathtracer](https://github.com/gkjohnson/three-gpu-pathtracer) 与 [three-mesh-bvh](https://github.com/gkjohnson/three-mesh-bvh)，Garrett Johnson（MIT）
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
