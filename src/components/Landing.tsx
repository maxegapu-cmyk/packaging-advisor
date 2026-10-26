"use client";

import { useState } from "react";
import type { Lang, Pair } from "@/lib/i18n";
import { UI } from "@/lib/i18n";
import { CATEGORIES, CATEGORY_FAMILIES } from "@/lib/categories";
import { CATEGORY_PACK, FORMS } from "@/lib/pack";
import { SAMPLES } from "@/lib/samples";
import { Bi } from "./Bi";
import { Box3D, BoxSync, PackProvider, SpaceIcon } from "./Box3D";
import { paletteVars } from "./BoxFaces";
import { Brandmark } from "./Brandmark";
import { ColorBar } from "./ColorBar";
import { HeroSection } from "./DielineHero";
import { FaceLayout } from "./FaceLayout";
import { PackBar } from "./PackBar";
import { FormGlyph } from "./pack/FormGlyph";
import { SpaceShowcase } from "./SpaceShowcase";

const UPLOAD_HREF = "/login?next=/new";

const C = {
  navHow: { zh: "怎么用", en: "How it works" },
  navAny: { zh: "适用品类", en: "Categories" },
  navSamples: { zh: "示例", en: "Samples" },
  navSpace: { zh: "3D 空间", en: "3D space" },
  heroA: { zh: "一张产品照片，", en: "One product photo." },
  heroB: { zh: "三个包装方向。", en: "Three packaging directions." },
  heroSub: {
    zh: "茶叶、护肤品、零食、数码配件，什么产品都可以。上传照片，几分钟后得到三个能直接交给设计师的包装方向，再在 3D 里按真实尺寸看清楚。",
    en: "Tea, skincare, snacks, gadgets: any product. Upload a photo and in minutes get three packaging directions a designer can act on, then check them at real size in 3D.",
  },
  ctaUpload: { zh: "上传你的产品", en: "Upload your product" },
  ctaSpace: { zh: "先看 3D 空间", en: "See the 3D space first" },
  testNote: { zh: "测试版，凭邀请码使用。", en: "Test version, invite only." },

  howH: { zh: "四步，从照片到交给设计师", en: "Four steps from a photo to your designer" },
  steps: [
    { t: UI.step1, d: { zh: "一两张手机照片，选好品类，写下品名。喜欢的参考图可加可不加。", en: "One or two phone photos, the category and the product name. References you like are optional." } },
    { t: UI.step2, d: { zh: "三个真正不同的方向：稳妥、有识别度、大胆。每个都有配色、版式、文案和措辞核查。", en: "Three genuinely different routes: safe, distinctive, bold. Each with colors, layout, copy and a wording check." } },
    { t: UI.step3, d: { zh: "选一个方向，在 3D 里按真实尺寸换盒型、装进外盒、打开看内部、出一张照片级效果图。", en: "Pick one and, in 3D at real size, change the form, pack it into an outer box, open it, and render a photo." } },
    { t: UI.step4, d: { zh: "复制一句话指令或分享链接，设计师照着就能做。", en: "Copy the one-line brief or a share link; your designer can work straight from it." } },
  ] as { t: Pair; d: Pair }[],

  anyH: { zh: "什么产品都可以", en: "Works for any product" },
  anySub: {
    zh: "选好品类，默认的包装形态、包装里装的东西，以及标签上要注意的规定都会跟着变。列表里没有的，选「其他」写下它是什么。",
    en: "Pick a category and the default packaging, what it holds and the labeling rules to watch all follow. Not listed? Choose Other and say what it is.",
  },
  formsCount: { zh: `${FORMS.length} 种包装形态`, en: `${FORMS.length} packaging forms` },
  catsCount: { zh: `${Object.keys(CATEGORIES).length} 个品类`, en: `${Object.keys(CATEGORIES).length} categories` },
  hasSample: { zh: "有示例", en: "Sample" },

  samplesH: { zh: "示例", en: "Samples" },
  samplesSub: { zh: "同一套方法，用在四种完全不同的产品上。三个盒子会一起转，方便比较。", en: "One method on four very different products. The three boxes turn together so you can compare." },
  reading: { zh: "我们看到的", en: "What we saw" },
  openSample: { zh: "在 3D 空间里打开这个示例", en: "Open this sample in the 3D space" },

  spaceKicker: { zh: "第 3 步", en: "Step 3" },
  spaceH: { zh: "像拿在手里一样看包装。", en: "See the packaging as if it were in your hand." },
  spaceSub: {
    zh: "纸盒、礼盒、飞机盒、利乐砖、自立袋、按压瓶、泡罩卡、玻璃罐、易拉罐、瓷罐、木箱……都按你的尺寸画出来，还能把产品装进外盒看组合效果。",
    en: "Cartons, gift boxes, mailers, aseptic bricks, pouches, pump bottles, blister cards, glass jars, cans, porcelain caddies, crates, all drawn at your size, and products can be packed into an outer box.",
  },
  spacePoints: [
    { t: { zh: "任意翻转", en: "Turn it any way" }, d: { zh: "鼠标拖动或单指滑动，上下左右整圈翻转；双指缩放。", en: "Drag or swipe to turn it all the way round; pinch to zoom." } },
    { t: { zh: "打开与解剖", en: "Open and take apart" }, d: { zh: "开盖、拉出抽屉、展开刀模；解剖视图标出每个部件。", en: "Lift lids, pull drawers, unfold the net; anatomy numbers every part." } },
    { t: { zh: "照片级出图", en: "Photo renders" }, d: { zh: "停下来就能出一张棚拍质感的效果图，直接用于提案。", en: "Stop turning and render a studio-quality image for your pitch." } },
  ] as { t: Pair; d: Pair }[],

  boardH: { zh: "方案板里有什么", en: "What's in a board" },
  items: [
    { t: { zh: "色彩卡", en: "Color card" }, d: { zh: "HEX 色值与每种颜色的面积占比。", en: "HEX values and each color's share of the surface." } },
    { t: { zh: "四个载体", en: "Four carriers" }, d: { zh: "外箱正面、侧面与背面、内包装、说明书，各自怎么排。", en: "Box front, sides and back, inner pack, manual: how each is laid out." } },
    { t: { zh: "视觉锚点", en: "Visual anchor" }, d: { zh: "一个贯穿整个开箱过程、让人记住你的元素。", en: "One element that carries through the whole unboxing." } },
    { t: { zh: "包装文案", en: "Packaging copy" }, d: { zh: "品名行、正面主张和说明书步骤，只依据你提供的事实。", en: "Name line, front promise and manual steps, from your facts only." } },
    { t: { zh: "措辞核查", en: "Wording check" }, d: { zh: "标出“医用级”“降三高”这类有风险的说法，并给出替代写法。", en: "Flags risky claims like “medical grade” and suggests safer wording." } },
    { t: { zh: "设计师指令", en: "Designer instruction" }, d: { zh: "一句话说清选哪个方向、怎么做。", en: "One sentence on which direction and how to execute it." } },
  ] as { t: Pair; d: Pair }[],

  notH: { zh: "我们不做的事", en: "What it doesn't do" },
  nots: [
    { zh: "不出可生产的刀模和印刷文件：展开图只是结构示意。", en: "No production dielines or print files: the unfolded net is a sketch." },
    { zh: "不替代打样：屏幕色与印刷色会有差异。", en: "No substitute for proofing: screen and print colors differ." },
    { zh: "不构成合规审查：标签信息以占位符提示。", en: "No compliance review: label details are placeholders." },
    { zh: "不复制别人的设计：参考图只借鉴思路。", en: "No copying: references inform ideas, not artwork." },
  ] as Pair[],
  endH: { zh: "把你的产品放上来看看。", en: "Put your product on the press." },
  endSub: { zh: "测试期间凭邀请码使用；还没有邀请码，请联系项目负责人。", en: "Invite-only during testing; ask the project team for a code." },
  footer: { zh: "概念方向示意，非印刷稿。", en: "Concept directions, not print files." },
};

/** Small drawings for the four steps. */
function StepArt({ n }: { n: number }) {
  const ink = "#161616";
  if (n === 0)
    return (
      <svg className="step-art" viewBox="0 0 160 96" aria-hidden="true">
        <rect x="46" y="6" width="68" height="84" rx="8" fill="#fff" stroke={ink} strokeWidth="1.2" />
        <rect x="52" y="14" width="56" height="58" rx="2" fill="#ECEFE9" />
        <path d="M70 62V36c0-4 4-6 10-6s10 2 10 6v26z" fill="#6F8A5E" />
        <rect x="70" y="42" width="20" height="5" fill="#2A2E2B" opacity="0.7" />
        <circle cx="80" cy="81" r="3" fill={ink} />
        <path d="M122 30l14-10M122 46h18" stroke="#E4007F" strokeWidth="1.4" strokeDasharray="3 2" />
      </svg>
    );
  if (n === 1)
    return (
      <svg className="step-art" viewBox="0 0 160 96" aria-hidden="true">
        {[
          ["#EFEDE4", "#6F8A5E"],
          ["#E8ECE6", "#3F7A4F"],
          ["#E9DFA8", "#7FA83A"],
        ].map(([g, k], i) => (
          <g key={i} transform={`translate(${14 + i * 46} ${18 + (i === 1 ? -6 : 0)})`}>
            <path d="M0 10l14-8h24l-14 8z" fill={g} stroke={ink} strokeWidth="0.8" />
            <path d="M24 10l14-8v52l-14 8z" fill={k} stroke={ink} strokeWidth="0.8" />
            <rect x="0" y="10" width="24" height="52" fill={g} stroke={ink} strokeWidth="0.8" />
            <rect x="0" y="10" width="7" height="52" fill={k} />
          </g>
        ))}
        <rect x="58" y="6" width="44" height="72" fill="none" stroke="#E4007F" strokeWidth="1.2" strokeDasharray="4 3" />
      </svg>
    );
  if (n === 2)
    return (
      <svg className="step-art" viewBox="0 0 160 96" aria-hidden="true">
        <ellipse cx="80" cy="84" rx="44" ry="6" fill="#000" opacity="0.08" />
        <path d="M50 34l30-14 30 14-30 14z" fill="#E8ECE6" stroke={ink} strokeWidth="1" />
        <path d="M50 34v36l30 14V48z" fill="#E8ECE6" stroke={ink} strokeWidth="1" />
        <path d="M110 34v36l-30 14V48z" fill="#3F7A4F" stroke={ink} strokeWidth="1" />
        <path d="M30 40a52 52 0 0 1 100 0" fill="none" stroke="#E4007F" strokeWidth="1.3" strokeDasharray="3 3" />
        <path d="M126 34l4 6 6-3" fill="none" stroke="#E4007F" strokeWidth="1.3" />
      </svg>
    );
  return (
    <svg className="step-art" viewBox="0 0 160 96" aria-hidden="true">
      <rect x="40" y="6" width="68" height="84" fill="#fff" stroke={ink} strokeWidth="1.2" />
      <rect x="48" y="16" width="52" height="8" fill="#3F7A4F" />
      <path d="M48 34h52M48 42h44M48 50h48M48 58h30" stroke={ink} strokeWidth="1.2" opacity="0.5" />
      <rect x="48" y="68" width="10" height="10" fill="#E8ECE6" stroke={ink} strokeWidth="0.6" />
      <rect x="60" y="68" width="10" height="10" fill="#1F2A24" />
      <rect x="72" y="68" width="10" height="10" fill="#3F7A4F" />
      <rect x="84" y="68" width="10" height="10" fill="#C9A14A" />
      <path d="M116 48h30m-8-6l8 6-8 6" fill="none" stroke={ink} strokeWidth="1.4" />
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
        <a href="#how">
          <Bi p={C.navHow} lang={lang} />
        </a>
        <a href="#any">
          <Bi p={C.navAny} lang={lang} />
        </a>
        <a href="#samples">
          <Bi p={C.navSamples} lang={lang} />
        </a>
        <a href="#space">
          <Bi p={C.navSpace} lang={lang} />
        </a>
      </nav>
      <div className="topbar-right">
        {langSwitch}
        <a className="btn btn-quiet btn-small" href="/login">
          <Bi p={UI.signIn} lang={lang} />
        </a>
        <a className="btn btn-primary btn-small topbar-cta" href={UPLOAD_HREF}>
          <Bi p={C.ctaUpload} lang={lang} />
        </a>
      </div>
    </header>
  );
}

export function Landing({ lang, langSwitch }: { lang: Lang; langSwitch: React.ReactNode }) {
  const one = (p: Pair) => (lang === "en" ? p.en : p.zh);
  const [si, setSi] = useState(0);
  const sample = SAMPLES[si];
  const board = sample.board;
  const rec = board.directions.find((d) => d.id === board.recommendation.pick) ?? board.directions[0];
  const tea = SAMPLES[0].board;
  const teaRec = tea.directions.find((d) => d.id === tea.recommendation.pick) ?? tea.directions[0];
  const sampleIds = new Set(SAMPLES.map((s) => s.id));

  return (
    <div className="landing">
      <Topbar lang={lang} langSwitch={langSwitch} />

      <HeroSection samples={SAMPLES} lang={lang}>
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
          <a className="btn btn-sheet btn-large" href={UPLOAD_HREF}>
            <Bi p={C.ctaUpload} lang={lang} />
          </a>
          <a className="btn btn-sheet-ghost btn-large btn-icon" href="/space/demo">
            <SpaceIcon />
            <Bi p={C.ctaSpace} lang={lang} />
          </a>
        </div>
        <Bi p={C.testNote} lang={lang} as="p" className="hero-note" />
      </HeroSection>

      <section id="how" className="band band-how">
        <Bi p={C.howH} lang={lang} as="h2" className="band-h" />
        <ol className="how">
          {C.steps.map((s, i) => (
            <li key={i}>
              <StepArt n={i} />
              <span className="how-n">{i + 1}</span>
              <Bi p={s.t} lang={lang} as="h3" />
              <Bi p={s.d} lang={lang} as="p" />
            </li>
          ))}
        </ol>
      </section>

      <section id="any" className="band band-wash">
        <div className="band-headrow any-head">
          <div>
            <Bi p={C.anyH} lang={lang} as="h2" className="band-h" />
            <Bi p={C.anySub} lang={lang} as="p" className="any-sub" />
          </div>
          <div className="any-counts">
            <span>{one(C.catsCount)}</span>
            <span>{one(C.formsCount)}</span>
          </div>
        </div>
        <div className="families">
          {CATEGORY_FAMILIES.map((f) => (
            <div key={f.id} className="family">
              <h3 className="family-h">{one(f.label)}</h3>
              <ul>
                {f.cats.map((c) => (
                  <li key={c}>
                    <FormGlyph form={CATEGORY_PACK[c].form} />
                    <span>{one(CATEGORIES[c])}</span>
                    {sampleIds.has(c) ? (
                      <button type="button" className="family-sample" onClick={() => (setSi(SAMPLES.findIndex((s) => s.id === c)), document.getElementById("samples")?.scrollIntoView({ behavior: "smooth" }))}>
                        {one(C.hasSample)}
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section id="samples" className="band">
        <div className="band-headrow">
          <Bi p={C.samplesH} lang={lang} as="h2" className="band-h" />
          <Bi p={C.samplesSub} lang={lang} as="p" className="band-sub" />
        </div>
        <div className="sample-tabs" role="tablist" aria-label={one(C.samplesH)}>
          {SAMPLES.map((s, i) => (
            <button key={s.id} type="button" role="tab" aria-selected={i === si} className={i === si ? "sample-tab is-active" : "sample-tab"} onClick={() => setSi(i)}>
              <FormGlyph form={s.pack.form} />
              <span className="sample-tab-text">
                <strong>{one(s.label)}</strong>
                <small>{one(s.board.meta.product)}</small>
              </span>
            </button>
          ))}
        </div>
        <Bi p={board.reading.product} lang={lang} as="p" className="sample-reading" />
        <PackProvider key={sample.id} initial={sample.pack} studioBase={`/space/demo?s=${sample.id}`} category={board.meta.category}>
          <BoxSync label={one(UI.rotateTogether)} hint={one(UI.dragHint)} toolbar={<PackBar lang={lang} />}>
            <div className="sample-grid">
              {board.directions.map((d) => (
                <div className={d.id === board.recommendation.pick ? "sample is-recommended" : "sample"} key={`${sample.id}-${d.id}`}>
                  <div className="sample-stage" style={paletteVars(d)}>
                    <Box3D d={d} brand={board.meta.brand} lang={lang} label={`${d.id} ${one(d.name)}`} />
                  </div>
                  <div className="sample-name">
                    <span className="dir-id">{d.id}</span>
                    <Bi p={d.name} lang={lang} as="h3" />
                    {d.id === board.recommendation.pick ? <Bi p={UI.recommended} lang={lang} className="tag tag-accent" /> : null}
                  </div>
                  <ColorBar palette={d.palette} lang={lang} label={one(UI.colorCard)} />
                </div>
              ))}
            </div>
          </BoxSync>
        </PackProvider>
        <div className="sample-quote">
          <Bi p={UI.forDesigner} lang={lang} as="p" className="label" />
          <Bi p={board.recommendation.designerInstruction} lang={lang} as="p" className="quote" />
          <a className="btn btn-icon" href={`/space/demo?s=${sample.id}&d=${rec.id}`}>
            <SpaceIcon />
            <Bi p={C.openSample} lang={lang} />
          </a>
        </div>
      </section>

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
          <SpaceShowcase d={teaRec} brand={tea.meta.brand} lang={lang} href={`/space/demo?d=${teaRec.id}`} />
        </div>
      </section>

      <section id="board" className="band">
        <Bi p={C.boardH} lang={lang} as="h2" className="band-h" />
        <div className="board-intro">
          <figure className="specimen" aria-hidden="true">
            <div className="specimen-top">
              <span className="dir-id">{tea.recommendation.pick}</span>
              <strong>{one(teaRec.name)}</strong>
              <span className="tag tag-accent">{one(UI.recommended)}</span>
            </div>
            <div className="specimen-body">
              <FaceLayout d={teaRec} lang={lang} title="" />
              <div className="specimen-side">
                <ColorBar palette={teaRec.palette} lang={lang === "bi" ? "zh" : lang} label="" />
                <div className="specimen-claim">
                  <span className="tag">{one(UI.levelHigh)}</span>
                  <q>{tea.claimCheck[1]?.text}</q>
                  <span className="specimen-arrow">{one(UI.saferWording)}</span>
                  <span>{one(tea.claimCheck[1]?.safer ?? { zh: "", en: "" })}</span>
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

      <section className="band band-nots">
        <Bi p={C.notH} lang={lang} as="h2" className="band-h" />
        <ul className="nots">
          {C.nots.map((n, i) => (
            <Bi key={i} p={n} lang={lang} as="li" />
          ))}
        </ul>
      </section>

      <section className="end">
        <Bi p={C.endH} lang={lang} as="h2" className="end-h" />
        <Bi p={C.endSub} lang={lang} as="p" />
        <a className="btn btn-primary btn-large" href={UPLOAD_HREF}>
          <Bi p={C.ctaUpload} lang={lang} />
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
