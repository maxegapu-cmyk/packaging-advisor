import type { Lang, Pair } from "@/lib/i18n";
import { UI } from "@/lib/i18n";
import { DEMO_BOARD } from "@/lib/llm/demo";
import { Bi } from "./Bi";
import { Box3D, BoxSync } from "./Box3D";
import { Brandmark } from "./Brandmark";
import { ColorBar } from "./ColorBar";
import { DielineHero } from "./DielineHero";

const C = {
  navHow: { zh: "怎么用", en: "How it works" },
  navSample: { zh: "示例", en: "Sample" },
  navBoard: { zh: "交付内容", en: "What you get" },
  heroA: { zh: "一张产品照片，", en: "One product photo." },
  heroB: { zh: "三个包装方向。", en: "Three packaging directions." },
  heroSub: {
    zh: "为没有专职设计师的电商卖家准备：配色、版式、包装文案和措辞核查，整理成设计师可以直接执行的一页简报。",
    en: "For sellers without an in-house designer: colors, layouts, packaging copy and a wording check, in one brief a designer can act on.",
  },
  ctaSignIn: { zh: "用邀请码登录", en: "Sign in with your invite code" },
  ctaSample: { zh: "看示例", en: "See the sample" },
  testNote: { zh: "测试版，凭邀请码使用。", en: "Test version, invite only." },
  howH: { zh: "三步完成", en: "How it works" },
  steps: [
    { t: { zh: "上传", en: "Upload" }, d: { zh: "一两张产品照片，加上你喜欢的参考图（可选）。", en: "One or two product photos, plus references you like (optional)." } },
    { t: { zh: "比较", en: "Compare" }, d: { zh: "三个真正不同的方向：稳妥、有识别度、大胆。拖动盒子，从各个角度看。", en: "Three genuinely different routes: safe, distinctive, bold. Drag the boxes to see every side." } },
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
  sampleSub: { zh: "同一款茶，三条路线。三个盒子会一起转，方便对比。", en: "One tea, three routes. The boxes rotate together so you can compare." },
  catsH: { zh: "首批品类", en: "First categories" },
  notH: { zh: "我们不做的事", en: "What it doesn't do" },
  nots: [
    { zh: "不出印刷刀模和印刷文件。", en: "No dielines or print-ready files." },
    { zh: "不替代打样：屏幕色与印刷色会有差异。", en: "No substitute for proofing: screen and print colors differ." },
    { zh: "不构成合规审查：标签信息以占位符提示。", en: "No compliance review: label details are placeholders." },
    { zh: "不复制别人的设计：参考图只借鉴思路。", en: "No copying: references inform ideas, not artwork." },
  ],
  endH: { zh: "测试期间凭邀请码使用。", en: "Invite-only during testing." },
  endSub: { zh: "还没有邀请码？请联系项目负责人。", en: "No code yet? Ask the project team." },
  footer: { zh: "概念方向示意，非印刷稿。", en: "Concept directions, not print files." },
} satisfies Record<string, unknown>;

function Topbar({ lang, langSwitch }: { lang: Lang; langSwitch: React.ReactNode }) {
  return (
    <header className="topbar topbar-landing">
      <a className="brandmark" href="/">
        <Brandmark />
        <Bi p={UI.appName} lang={lang} as="strong" />
      </a>
      <nav className="topnav" aria-label="页面导航 Page">
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
  return (
    <div className="landing">
      <Topbar lang={lang} langSwitch={langSwitch} />

      <section className="hero">
        <div className="hero-copy">
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
            <a className="btn btn-primary btn-large" href="/login">
              <Bi p={C.ctaSignIn} lang={lang} />
            </a>
            <a className="btn btn-ghost btn-large" href="#sample">
              <Bi p={C.ctaSample} lang={lang} />
            </a>
          </div>
          <Bi p={C.testNote} lang={lang} as="p" className="hero-note" />
        </div>
        <DielineHero directions={demo.directions} brand={demo.meta.brand} lang={lang} />
      </section>

      <section id="how" className="band">
        <Bi p={C.howH} lang={lang} as="h2" className="band-h" />
        <ol className="how">
          {C.steps.map((s, i) => (
            <li key={i}>
              <span className="how-n">{i + 1}</span>
              <Bi p={s.t} lang={lang} as="h3" />
              <Bi p={s.d} lang={lang} as="p" />
            </li>
          ))}
        </ol>
      </section>

      <section id="board" className="band">
        <Bi p={C.boardH} lang={lang} as="h2" className="band-h" />
        <div className="items">
          {C.items.map((it, i) => (
            <div className="item" key={i}>
              <Bi p={it.t} lang={lang} as="h3" />
              <Bi p={it.d} lang={lang} as="p" />
            </div>
          ))}
        </div>
      </section>

      <section id="sample" className="band band-wash">
        <div className="band-headrow">
          <Bi p={C.sampleH} lang={lang} as="h2" className="band-h" />
          <Bi p={C.sampleSub} lang={lang} as="p" className="band-sub" />
        </div>
        <BoxSync label={one(UI.rotateTogether)} hint={one(UI.dragHint)}>
          <div className="sample-grid">
            {demo.directions.map((d) => (
              <div className={d.id === demo.recommendation.pick ? "sample is-recommended" : "sample"} key={d.id}>
                <Box3D d={d} brand={demo.meta.brand} label={`${d.id} ${one(d.name)}`} />
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
        <div className="sample-quote">
          <Bi p={UI.forDesigner} lang={lang} as="p" className="label" />
          <Bi p={demo.recommendation.designerInstruction} lang={lang} as="p" className="quote" />
        </div>
      </section>

      <section className="band band-split">
        <div>
          <Bi p={C.catsH} lang={lang} as="h2" className="band-h" />
          <ul className="cats">
            {[
              { zh: "茶叶", en: "Tea" },
              { zh: "地方特产", en: "Local specialties" },
              { zh: "化妆品", en: "Cosmetics" },
              { zh: "家用电器", en: "Home appliances" },
            ].map((c) => (
              <Bi key={c.zh} p={c} lang={lang} as="li" />
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
