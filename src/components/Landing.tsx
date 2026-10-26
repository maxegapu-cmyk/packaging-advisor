import type { Lang, Pair } from "@/lib/i18n";
import { UI } from "@/lib/i18n";
import { DEMO_BOARD } from "@/lib/llm/demo";
import { Bi } from "./Bi";
import { Box3D, BoxSync, PackProvider, SpaceIcon } from "./Box3D";
import { paletteVars } from "./BoxFaces";
import { Brandmark } from "./Brandmark";
import { ColorBar } from "./ColorBar";
import { HeroSection } from "./DielineHero";
import { FaceLayout } from "./FaceLayout";
import { PackBar } from "./PackBar";
import { SpaceShowcase } from "./SpaceShowcase";
import { defaultPack } from "@/lib/pack";

const C = {
  navHow: { zh: "怎么用", en: "How it works" },
  navSample: { zh: "示例", en: "Sample" },
  navSpace: { zh: "3D 空间", en: "3D space" },
  ctaSpace: { zh: "进入 3D 空间", en: "Enter the 3D space" },
  spaceKicker: { zh: "核心功能", en: "The core" },
  spaceH: { zh: "像拿在手里一样看包装。", en: "See the packaging as if it were in your hand." },
  spaceSub: {
    zh: "三个方向都画在真实的包装上，按你的尺寸：纸盒、礼盒、飞机盒、自立袋、按压瓶、玻璃罐、铁罐、瓷罐等 14 种，还能把产品装进外盒看组合效果。转一圈、打开盖子、展开刀模，在下单打样之前就把问题看出来。",
    en: "All three directions are drawn on real packaging at your size: 14 forms including cartons, gift boxes, mailers, pouches, pump bottles, glass jars, tins and porcelain caddies, and products can be packed into an outer box to see the set. Turn it, open the lid, unfold the net, and spot problems before you pay for a proof.",
  },
  spacePoints: [
    { t: { zh: "720° 无死角", en: "720°, no blind spots" }, d: { zh: "上下左右整圈翻转，连底部都能看；双指或滚轮缩放。", en: "Turn it all the way round in every direction, bottom included; pinch or scroll to zoom." } },
    { t: { zh: "细节镜头", en: "Detail shots" }, d: { zh: "一点就推近到正面、侧面、背面、开盒内部，并说明这里该怎么做。", en: "One tap moves in on the front, side, back or inside, with a note on what goes there." } },
    { t: { zh: "工艺与背景", en: "Finish and backdrop" }, d: { zh: "哑光、亮面、纸感、烫金；棚拍、白底、品牌色、暗场。", en: "Matte, gloss, textured paper, foil; studio, white, brand color, dark." } },
    { t: { zh: "主图测试", en: "Listing test" }, d: { zh: "同时看 800×800 白底主图和搜索结果里的缩略图，品牌名是否还看得清。", en: "See the 800×800 white main image and the search-results thumbnail side by side." } },
    { t: { zh: "渲染简报", en: "Render brief" }, d: { zh: "一键复制给设计师或出图工具：结构、配色、材质、灯光按电商棚拍标准写好。", en: "Copy a brief for a designer or image tool: structure, colors, material and light to an e-commerce studio standard." } },
  ],
  navBoard: { zh: "交付内容", en: "What you get" },
  heroA: { zh: "一张产品照片，", en: "One product photo." },
  heroB: { zh: "三个包装方向。", en: "Three packaging directions." },
  heroSub: {
    zh: "为没有专职设计师的电商卖家准备：配色、版式、包装文案和措辞核查，整理成设计师可以直接执行的一页简报。",
    en: "For sellers without an in-house designer: colors, layouts, packaging copy and a wording check, in one brief a designer can act on.",
  },
  ctaSignIn: { zh: "用邀请码登录", en: "Sign in with your invite code" },
  testNote: { zh: "测试版，凭邀请码使用。", en: "Test version, invite only." },
  howH: { zh: "三步完成", en: "How it works" },
  steps: [
    { t: { zh: "上传", en: "Upload" }, d: { zh: "一两张产品照片，加上你喜欢的参考图（可选）。", en: "One or two product photos, plus references you like (optional)." } },
    { t: { zh: "比较", en: "Compare" }, d: { zh: "三个真正不同的方向：稳妥、有识别度、大胆。在 3D 空间里转动、打开、展开。", en: "Three genuinely different routes: safe, distinctive, bold. Turn, open and unfold them in the 3D space." } },
    { t: { zh: "交出", en: "Hand off" }, d: { zh: "选定一个方向，把一句话指令或分享链接发给设计师。", en: "Pick one and send your designer the one-line instruction or a share link." } },
  ],
  boardH: { zh: "方案板里有什么", en: "What's in a board" },
  items: [
    { t: { zh: "色彩卡", en: "Color card" }, d: { zh: "HEX 色值与每种颜色的面积占比。", en: "HEX values and each color's share of the surface." } },
    { t: { zh: "四个载体", en: "Four carriers" }, d: { zh: "外箱正面、侧面与背面、内包装、说明书，各自怎么排。", en: "Box front, sides and back, inner pack, manual: how each is laid out." } },
    { t: { zh: "视觉锚点", en: "Visual anchor" }, d: { zh: "一个贯穿整个开箱过程、让人记住你的元素。", en: "One element that carries through the whole unboxing." } },
    { t: { zh: "包装文案", en: "Packaging copy" }, d: { zh: "品名行、正面主张和说明书步骤，只依据你提供的事实。", en: "Name line, front promise and manual steps, from your facts only." } },
    { t: { zh: "措辞核查", en: "Wording check" }, d: { zh: "标出“医用级”“降三高”这类有风险的说法，并给出替代写法。", en: "Flags risky claims like “medical grade” and suggests safer wording." } },
    { t: { zh: "设计师指令", en: "Designer instruction" }, d: { zh: "一句话说清选哪个方向、怎么做。", en: "One sentence on which direction and how to execute it." } },
  ],
  sampleH: { zh: "示例：明前龙井", en: "Sample: Longjing green tea" },
  sampleSub: { zh: "同一款茶，三条路线。换个盒型试试，三个盒子会一起转，方便对比。", en: "One tea, three routes. Try another structure; the boxes turn together so you can compare." },
  catsH: { zh: "首批品类", en: "First categories" },
  notH: { zh: "我们不做的事", en: "What it doesn't do" },
  nots: [
    { zh: "不出可生产的刀模和印刷文件：展开图只是结构示意。", en: "No production dielines or print files: the unfolded net is a sketch." },
    { zh: "不替代打样：屏幕色与印刷色会有差异。", en: "No substitute for proofing: screen and print colors differ." },
    { zh: "不构成合规审查：标签信息以占位符提示。", en: "No compliance review: label details are placeholders." },
    { zh: "不复制别人的设计：参考图只借鉴思路。", en: "No copying: references inform ideas, not artwork." },
  ],
  endH: { zh: "测试期间凭邀请码使用。", en: "Invite-only during testing." },
  endSub: { zh: "还没有邀请码？请联系项目负责人。", en: "No code yet? Ask the project team." },
  footer: { zh: "概念方向示意，非印刷稿。", en: "Concept directions, not print files." },
} satisfies Record<string, unknown>;

const CATS = [
  { zh: "茶叶", en: "Tea", color: "#E8ECE6", key: "#3F7A4F" },
  { zh: "地方特产", en: "Local specialties", color: "#F1E6CF", key: "#B9802F" },
  { zh: "化妆品", en: "Cosmetics", color: "#F4E3E1", key: "#B9566A" },
  { zh: "家用电器", en: "Home appliances", color: "#E3E8EE", key: "#3A5878" },
];

/** Small drawings for the three steps. */
function StepArt({ n, directions }: { n: number; directions: { palette: { hex: string }[] }[] }) {
  if (n === 0)
    return (
      <svg className="step-art" viewBox="0 0 160 96" aria-hidden="true">
        <rect x="34" y="8" width="92" height="80" rx="6" fill="#fff" stroke="#000" strokeWidth="1.2" />
        <rect x="42" y="16" width="76" height="56" fill="#ECEFE9" />
        <rect x="66" y="26" width="28" height="40" rx="3" fill="#6F8A5E" />
        <rect x="66" y="32" width="28" height="6" fill="#2A2E2B" opacity="0.7" />
        <circle cx="80" cy="80" r="3" fill="#000" />
        <path d="M128 24l14-10M128 40h16" stroke="#E4007F" strokeWidth="1.4" strokeDasharray="3 2" />
      </svg>
    );
  if (n === 1)
    return (
      <svg className="step-art" viewBox="0 0 160 96" aria-hidden="true">
        {directions.slice(0, 3).map((d, i) => (
          <g key={i} transform={`translate(${14 + i * 46} ${18 + (i === 1 ? -6 : 0)})`}>
            <path d="M0 10l14-8h24l-14 8z" fill={d.palette[0].hex} stroke="#000" strokeWidth="0.8" />
            <path d="M24 10l14-8v52l-14 8z" fill={d.palette[2].hex} stroke="#000" strokeWidth="0.8" />
            <rect x="0" y="10" width="24" height="52" fill={d.palette[0].hex} stroke="#000" strokeWidth="0.8" />
            <rect x="0" y="10" width="7" height="52" fill={d.palette[2].hex} />
          </g>
        ))}
      </svg>
    );
  return (
    <svg className="step-art" viewBox="0 0 160 96" aria-hidden="true">
      <rect x="40" y="6" width="68" height="84" fill="#fff" stroke="#000" strokeWidth="1.2" />
      <rect x="34" y="0" width="80" height="96" fill="none" stroke="#E4007F" strokeWidth="1.2" strokeDasharray="4 3" />
      <rect x="48" y="16" width="52" height="8" fill="#3F7A4F" />
      <path d="M48 34h52M48 42h44M48 50h48M48 58h30" stroke="#000" strokeWidth="1.2" opacity="0.5" />
      <rect x="48" y="68" width="10" height="10" fill="#E8ECE6" stroke="#000" strokeWidth="0.6" />
      <rect x="60" y="68" width="10" height="10" fill="#1F2A24" />
      <rect x="72" y="68" width="10" height="10" fill="#3F7A4F" />
      <rect x="84" y="68" width="10" height="10" fill="#C9A14A" />
      <path d="M116 48h30m-8-6l8 6-8 6" fill="none" stroke="#000" strokeWidth="1.4" />
    </svg>
  );
}

function Topbar({ lang, langSwitch }: { lang: Lang; langSwitch: React.ReactNode }) {
  return (
    <header className="topbar topbar-landing">
      <a className="brandmark" href="/">
        <Brandmark />
        <Bi p={UI.appName} lang={lang} as="strong" />
      </a>
      <nav className="topnav" aria-label="页面导航 Page">
        <a href="#space">
          <Bi p={C.navSpace} lang={lang} />
        </a>
        <a href="#how">
          <Bi p={C.navHow} lang={lang} />
        </a>
        <a href="#board">
          <Bi p={C.navBoard} lang={lang} />
        </a>
        <a href="#sample">
          <Bi p={C.navSample} lang={lang} />
        </a>
      </nav>
      <div className="topbar-right">
        {langSwitch}
        <a className="btn btn-primary btn-small" href="/login">
          <Bi p={UI.signIn} lang={lang} />
        </a>
      </div>
    </header>
  );
}

export function Landing({ lang, langSwitch }: { lang: Lang; langSwitch: React.ReactNode }) {
  const demo = DEMO_BOARD;
  const one = (p: Pair) => (lang === "en" ? p.en : p.zh);
  const rec = demo.directions.find((d) => d.id === demo.recommendation.pick) ?? demo.directions[0];
  return (
    <div className="landing">
      <Topbar lang={lang} langSwitch={langSwitch} />

      <HeroSection directions={demo.directions} brand={demo.meta.brand} lang={lang}>
        <h1 className="hero-h">
          <span className="hero-line">{one(C.heroA)}</span>
          <span className="hero-line">{one(C.heroB)}</span>
          {lang === "bi" ? (
            <span className="hero-en">
              {C.heroA.en} {C.heroB.en}
            </span>
          ) : null}
        </h1>
        <Bi p={C.heroSub} lang={lang} as="p" className="hero-sub" />
        <div className="hero-ctas">
          <a className="btn btn-sheet btn-large" href="/login">
            <Bi p={C.ctaSignIn} lang={lang} />
          </a>
          <a className="btn btn-sheet-ghost btn-large btn-icon" href="/space/demo">
            <SpaceIcon />
            <Bi p={C.ctaSpace} lang={lang} />
          </a>
        </div>
        <Bi p={C.testNote} lang={lang} as="p" className="hero-note" />
      </HeroSection>

      <section id="space" className="space-band">
        <div className="space-inner">
          <div className="space-copy">
            <Bi p={C.spaceKicker} lang={lang} as="p" className="space-kicker" />
            <Bi p={C.spaceH} lang={lang} as="h2" className="space-h" />
            <Bi p={C.spaceSub} lang={lang} as="p" className="space-sub" />
            <ul className="space-points">
              {C.spacePoints.map((x, i) => (
                <li key={i}>
                  <Bi p={x.t} lang={lang} as="h3" />
                  <Bi p={x.d} lang={lang} as="p" />
                </li>
              ))}
            </ul>
          </div>
          <SpaceShowcase d={rec} brand={demo.meta.brand} lang={lang} href={`/space/demo?d=${rec.id}`} />
        </div>
      </section>

      <section id="how" className="band">
        <Bi p={C.howH} lang={lang} as="h2" className="band-h" />
        <ol className="how">
          {C.steps.map((s, i) => (
            <li key={i}>
              <StepArt n={i} directions={demo.directions} />
              <span className="how-n">{i + 1}</span>
              <Bi p={s.t} lang={lang} as="h3" />
              <Bi p={s.d} lang={lang} as="p" />
            </li>
          ))}
        </ol>
      </section>

      <section id="board" className="band">
        <Bi p={C.boardH} lang={lang} as="h2" className="band-h" />
        <div className="board-intro">
          <figure className="specimen" aria-hidden="true">
            <div className="specimen-top">
              <span className="dir-id">{demo.recommendation.pick}</span>
              <strong>{one(rec.name)}</strong>
              <span className="tag tag-accent">{one(UI.recommended)}</span>
            </div>
            <div className="specimen-body">
              <FaceLayout d={rec} lang={lang} title="" />
              <div className="specimen-side">
                <ColorBar palette={rec.palette} lang={lang === "bi" ? "zh" : lang} label="" />
                <div className="specimen-claim">
                  <span className="tag">{one(UI.levelHigh)}</span>
                  <q>{demo.claimCheck[1]?.text}</q>
                  <span className="specimen-arrow">{one(UI.saferWording)}</span>
                  <span>{one(demo.claimCheck[1]?.safer ?? { zh: "", en: "" })}</span>
                </div>
              </div>
            </div>
          </figure>
          <div className="items">
            {C.items.map((it, i) => (
              <div className="item" key={i}>
                <Bi p={it.t} lang={lang} as="h3" />
                <Bi p={it.d} lang={lang} as="p" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="sample" className="band band-wash">
        <div className="band-headrow">
          <Bi p={C.sampleH} lang={lang} as="h2" className="band-h" />
          <Bi p={C.sampleSub} lang={lang} as="p" className="band-sub" />
        </div>
        <PackProvider initial={defaultPack("tea")} studioBase="/space/demo">
        <BoxSync label={one(UI.rotateTogether)} hint={one(UI.dragHint)} toolbar={<PackBar lang={lang} />}>
          <div className="sample-grid">
            {demo.directions.map((d) => (
              <div className={d.id === demo.recommendation.pick ? "sample is-recommended" : "sample"} key={d.id}>
                <div className="sample-stage" style={paletteVars(d)}>
                  <Box3D d={d} brand={demo.meta.brand} lang={lang} label={`${d.id} ${one(d.name)}`} />
                </div>
                <div className="sample-name">
                  <span className="dir-id">{d.id}</span>
                  <Bi p={d.name} lang={lang} as="h3" />
                  {d.id === demo.recommendation.pick ? <Bi p={UI.recommended} lang={lang} className="tag tag-accent" /> : null}
                </div>
                <ColorBar palette={d.palette} lang={lang} label={one(UI.colorCard)} />
              </div>
            ))}
          </div>
        </BoxSync>
        </PackProvider>
        <div className="sample-quote">
          <Bi p={UI.forDesigner} lang={lang} as="p" className="label" />
          <Bi p={demo.recommendation.designerInstruction} lang={lang} as="p" className="quote" />
        </div>
      </section>

      <section className="band band-split">
        <div>
          <Bi p={C.catsH} lang={lang} as="h2" className="band-h" />
          <ul className="cats">
            {CATS.map((c) => (
              <li key={c.zh} className="cat">
                <span className="cat-chip" style={{ background: c.color }} aria-hidden="true">
                  <i style={{ background: c.key }} />
                </span>
                <Bi p={c} lang={lang} />
              </li>
            ))}
          </ul>
        </div>
        <div>
          <Bi p={C.notH} lang={lang} as="h2" className="band-h" />
          <ul className="nots">
            {C.nots.map((n, i) => (
              <Bi key={i} p={n} lang={lang} as="li" />
            ))}
          </ul>
        </div>
      </section>

      <section className="end">
        <Bi p={C.endH} lang={lang} as="h2" className="end-h" />
        <Bi p={C.endSub} lang={lang} as="p" />
        <a className="btn btn-primary btn-large" href="/login">
          <Bi p={C.ctaSignIn} lang={lang} />
        </a>
      </section>

      <footer className="footer">
        <span className="brandmark">
          <Brandmark size={22} />
          <Bi p={UI.appName} lang={lang} />
        </span>
        <Bi p={C.footer} lang={lang} />
      </footer>
    </div>
  );
}
