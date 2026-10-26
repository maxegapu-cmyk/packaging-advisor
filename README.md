# 包装视觉顾问 · Packaging Advisor

面向中国国内电商卖家的网页应用：上传一张产品照片，几分钟内得到三个风格明确不同的包装方向，包括带 HEX 色值的配色、外箱/内包装/说明书的版式、包装文案、措辞风险核查，以及一句可以直接转发给设计师的指令。交付的是设计简报，不是印刷文件。

A web app for domestic Chinese e-commerce sellers: upload a product photo and get three distinct packaging directions in minutes, with HEX colors, layouts for the outer box, inner pack and manual, packaging copy, a wording-risk check, and one sentence to forward to a designer. It produces a brief, not a print file.

当前版本是给 20 位测试者使用的 MVP，起步品类为茶叶、地方特产、化妆品和家用电器。
This version is the MVP for 20 testers, starting with tea, local specialties, cosmetics and home appliances.

---

## 功能 · Features

| 功能 Feature | 说明 | Description |
| --- | --- | --- |
| 公开首页 Landing page | 访客在首页看到产品介绍、刀模折成盒子的动画和可旋转的示例方案 | Visitors see the pitch, a dieline-to-box animation and a rotatable sample |
| 邀请码登录 Invite sign-in | 每位测试者一个邀请码，无需注册 | One code per tester, no sign-up |
| 三个方向 Three directions | 稳妥耐看 / 有识别度（推荐）/ 大胆探索，每条含色彩卡、四载体版式、视觉锚点、风格 DNA、草图、适用与风险 | Safe / distinctive (recommended) / bold, each with color card, four-carrier layout, anchor, style DNA, sketch, fit and risk |
| 3D 空间 3D space | 核心功能，three.js 物理渲染，材质与灯光按商品摄影标准。每个方向画在真实包装上，按卖家填写的毫米尺寸，共 14 种，按材料分组：纸与卡纸（直立盒可展开成刀模、天地盖礼盒、书型磁吸礼盒、瓦楞飞机盒、抽屉盒、纸罐、手提纸袋）、塑料（自立拉链袋、按压瓶、软管）、玻璃（玻璃罐、玻璃瓶）、金属（马口铁罐）、陶瓷（瓷茶叶罐）。组合包装：把产品（瓶、罐、管、袋）装进外盒，外盒尺寸按产品自动配，内托可选植绒、纸浆模塑、EPE 珍珠棉或卡纸，打开时产品落进内托。任何开合和解剖动作中，模型都不会穿过地面或彼此穿插。720° 翻转、双指/滚轮缩放、惯性旋转、自动旋转、五个视角、细节镜头（附方案板说明）、四种工艺（哑光/亮面/纸感/烫金）、四种背景、主图与搜索缩略图测试、一键复制渲染简报。参考了得物 App 的 3D 商品展示与 Pacdora 的包装 3D 预览；可导出高清 PNG | Core feature, physically based three.js rendering lit like product photography. Each direction on real packaging at the seller's size in mm, 14 forms grouped by material: paper and board (tuck carton that unfolds to its net, lid-and-base gift box, book-style magnetic box, corrugated mailer, drawer box, paper tube, carrier bag), plastic (stand-up pouch, pump bottle, squeeze tube), glass (jar, bottle), metal (round tin) and ceramic (porcelain caddy). Combinations: pack products (bottles, jars, tubes, pouches) into an outer box sized to them automatically, in a flocked, moulded-pulp, EPE-foam or card insert; opened, the products drop into the insert. No part passes through the floor or another part in any open or anatomy pose. 720° turning, pinch/scroll zoom, inertia, turntable, five views, detail shots (with the board's notes), four finishes (matte/gloss/paper/foil), four backdrops, a main-image and search-thumbnail test, and a copyable render brief. Inspired by Dewu's 3D product view and Pacdora's packaging previews; exports a high-resolution PNG |
| 方案板 Board | 可拖动旋转的立体包装盒（三个方向可同步旋转对比）、色彩面积条、正面版式图、内包装与说明书小样；中英双语，可切换 | Rotatable 3D boxes (synced for comparison), color area bars, front-layout drawings, inner pack and manual; bilingual, switchable |
| 只改一个维度 Single-dimension revision | 配色、版式、字体、图像或锚点，其余保持不变（由代码保证） | Color, layout, type, imagery or anchor; everything else is kept, enforced in code |
| 包装文案与核查 Copy and claim check | 只依据卖家提供的事实撰写；标出"医用级""降三高"等风险措辞并给出替代说法 | Written only from the seller's facts; flags risky claims and suggests safer wording |
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

- 方案板中的色值是屏幕色，正式印刷前需要打样；标签与合规内容只做提醒，不构成合规审查。 HEX values are screen colors; proof before printing. Labeling notes are reminders, not a compliance review.
- 正面草图使用等宽字符绘制，中文字符宽度不一，对齐只是示意。 The ASCII front sketch is approximate with Chinese characters.
- 完整概念效果图（第二阶段）尚未包含。 Full concept mockups (Phase 2) are not included yet.
- 展开的刀模只是结构示意，不能用于生产。 The unfolded net is a structural sketch, not a production dieline.
- 3D 空间需要支持 WebGL 2 的浏览器（近五年的主流浏览器均可）；低端手机上首次加载需 1–2 秒。照片级渲染依赖显卡，独立显卡几秒内完成，集成显卡或手机上需要更久（仍可随时拖动）。 Photoreal rendering is GPU-bound: seconds on a discrete GPU, longer on integrated graphics or phones (the view stays draggable). The 3D space needs WebGL 2 (any mainstream browser of the last five years); first load takes 1–2 s on low-end phones.
