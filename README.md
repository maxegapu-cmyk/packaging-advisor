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
src/app/            Next.js 页面、接口与管理后台 Pages, API routes and admin
skills/             生成时读取的技能说明 Skill files read at generation time
tests/              测试 Tests
```

## 已知限制 · Known limits

- 方案板中的色值是屏幕色，正式印刷前需要打样；标签与合规内容只做提醒，不构成合规审查。 HEX values are screen colors; proof before printing. Labeling notes are reminders, not a compliance review.
- 正面草图使用等宽字符绘制，中文字符宽度不一，对齐只是示意。 The ASCII front sketch is approximate with Chinese characters.
- 完整概念效果图（第二阶段）尚未包含。 Full concept mockups (Phase 2) are not included yet.
