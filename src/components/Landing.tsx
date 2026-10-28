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
import { ThemeSwitch } from "./ThemeSwitch";
import { SegPill } from "./SegPill";
import { ColorBar } from "./ColorBar";
import { SymbiosisHero } from "./hero/SymbiosisHero";
import { FaceLayout } from "./FaceLayout";
import { PackBar } from "./PackBar";
import { FormGlyph } from "./pack/FormGlyph";
import { HowVignette } from "./HowVignettes";
import { SpaceShowcase } from "./SpaceShowcase";
import { FretCorner, InkHills, SealStamp, useUnroll } from "./SongMarks";

const UPLOAD_HREF = "/login?next=/new";

const C = {
  navHow: { zh: "怎么用", en: "How it works" },
  navAny: { zh: "适用品类", en: "Categories" },
  navSamples: { zh: "示例", en: "Samples" },
  navSpace: { zh: "3D 空间", en: "3D space" },
  heroA: { zh: "拍一张照片，", en: "One product photo in." },
  heroB: { zh: "拿到能印的包装。", en: "Print-ready packaging out." },
  heroSub: {
    zh: "茶叶、护肤品、零食、数码……什么产品都可以。三个方向里挑一个，在 3D 里按真实尺寸打样，再下载能直接交给印厂的印刷文件和电商主图。不用请设计师。",
    en: "Tea, skincare, snacks, gadgets: any product. Pick one of three directions, proof it at real size in 3D, then download a print file your printer can use and your listing images. No designer needed.",
  },
  ctaUpload: { zh: "上传你的产品", en: "Upload your product" },
  ctaSpace: { zh: "先看 3D 空间", en: "See the 3D space first" },
  testNote: { zh: "测试版，凭邀请码使用。", en: "Test version, invite only." },

  howH: { zh: "四步，从一张照片到能印的包装", en: "Four steps from a photo to print-ready packaging" },
  steps: [
    { t: UI.step1, d: { zh: "一两张手机照片，选好品类，写下品名。喜欢的参考图可加可不加。", en: "One or two phone photos, the category and the product name. References you like are optional." } },
    { t: UI.step2, d: { zh: "三个真正不同的方向：稳妥、有识别度、大胆。每个都有配色、版式、文案和措辞核查。", en: "Three genuinely different routes: safe, distinctive, bold. Each with colors, layout, copy and a wording check." } },
    { t: UI.step3, d: { zh: "选一个方向，在 3D 里按真实尺寸换盒型、装进外盒、打开看内部、出一张照片级效果图。", en: "Pick one and, in 3D at real size, change the form, pack it into an outer box, open it, and render a photo." } },
    { t: UI.step4, d: { zh: "填好标签信息和条码，下载 1:1 刀模印刷文件和电商主图，直接交给印厂。", en: "Fill in the label details and barcode, then download a 1:1 print file with die lines and your listing images for the printer." } },
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
  samplesSub: { zh: "同一套方法，用在十种完全不同的产品和包装上。三个方向会一起转，方便比较。", en: "One method on ten very different products and packages. The three directions turn together so you can compare." },
  reading: { zh: "我们看到的", en: "What we saw" },
  openSample: { zh: "在 3D 空间里打开这个示例", en: "Open this sample in the 3D space" },

  spaceKicker: { zh: "第 3 步", en: "Step 3" },
  spaceH: { zh: "像拿在手里一样看包装。", en: "See the packaging as if it were in your hand." },
  spaceSub: {
    zh: "纸盒、礼盒、飞机盒、利乐砖、自立袋、按压瓶、泡罩卡、玻璃罐、易拉罐、瓷罐、木箱、宋锦盒……都按你的尺寸画出来，还能把产品装进外盒看组合效果。",
    en: "Cartons, gift boxes, mailers, aseptic bricks, pouches, pump bottles, blister cards, glass jars, cans, porcelain caddies, crates, Song brocade boxes, all drawn at your size, and products can be packed into an outer box.",
  },
  spacePoints: [
    { t: { zh: "任意翻转", en: "Turn it any way" }, d: { zh: "鼠标拖动或单指滑动，上下左右整圈翻转；双指缩放。", en: "Drag or swipe to turn it all the way round; pinch to zoom." } },
    { t: { zh: "打开与解剖", en: "Open and take apart" }, d: { zh: "开盖、拉出抽屉、展开刀模；解剖视图标出每个部件。", en: "Lift lids, pull drawers, unfold the net; anatomy numbers every part." } },
    { t: { zh: "照片级出图", en: "Photo renders" }, d: { zh: "停下来就能出一张棚拍质感的效果图，直接用于提案。", en: "Stop turning and render a studio-quality image for your pitch." } },
  ] as { t: Pair; d: Pair }[],

  boardH: { zh: "你会拿到什么", en: "What you get" },
  items: [
    { t: { zh: "色彩卡", en: "Color card" }, d: { zh: "HEX 色值与每种颜色的面积占比。", en: "HEX values and each color's share of the surface." } },
    { t: { zh: "四个载体", en: "Four carriers" }, d: { zh: "外箱正面、侧面与背面、内包装、说明书，各自怎么排。", en: "Box front, sides and back, inner pack, manual: how each is laid out." } },
    { t: { zh: "视觉锚点", en: "Visual anchor" }, d: { zh: "一个贯穿整个开箱过程、让人记住你的元素。", en: "One element that carries through the whole unboxing." } },
    { t: { zh: "包装文案", en: "Packaging copy" }, d: { zh: "品名行、正面主张和说明书步骤，只依据你提供的事实。", en: "Name line, front promise and manual steps, from your facts only." } },
    { t: { zh: "措辞核查", en: "Wording check" }, d: { zh: "标出“医用级”“降三高”这类有风险的说法，并给出替代写法。", en: "Flags risky claims like “medical grade” and suggests safer wording." } },
    { t: { zh: "印刷文件", en: "Print file" }, d: { zh: "1:1 刀模展开图、3 mm 出血、裁切与压痕专色、印刷工单，印厂直接可用。", en: "1:1 die lines and artwork, 3 mm bleed, cut and crease spot colors and a job sheet a printer can use." } },
    { t: { zh: "电商图片", en: "Listing images" }, d: { zh: "白底主图、正背面、打开、细节、尺寸图和陈列图，从 3D 直接渲染。", en: "White main image, front, back, opened, close-up, dimensions and a gallery shot, rendered from the 3D." } },
    { t: { zh: "印前检查", en: "Pre-press checks" }, d: { zh: "标签必标项、条码、对比度、字号和措辞，下载前逐项核对。", en: "Mandatory label items, barcode, contrast, text size and wording, checked before you download." } },
  ] as { t: Pair; d: Pair }[],

  notH: { zh: "需要你知道的", en: "Good to know" },
  nots: [
    { zh: "不替印厂开模：刀模是标准结构，开模前请印厂核对。", en: "It doesn't make the cutting die: the die line is a standard structure for your printer to check." },
    { zh: "不替代打样：屏幕色与印刷色会有差异。", en: "No substitute for proofing: screen and print colors differ." },
    { zh: "不替你决定标签内容：必标项会列出来，内容由你填写并对照现行规定核对。", en: "It doesn't decide your label: mandatory items are listed, you fill them in and check them against current rules." },
    { zh: "不复制别人的设计：参考图只借鉴思路。", en: "No copying: references inform ideas, not artwork." },
  ] as Pair[],
  endH: { zh: "把你的产品放上来看看。", en: "Put your product on the press." },
  endSub: { zh: "测试期间凭邀请码使用；还没有邀请码，请联系项目负责人。", en: "Invite-only during testing; ask the project team for a code." },
  footer: { zh: "印刷前请与印厂核对刀模并打样。", en: "Check the die line with your printer and proof before printing." },
};

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
        <ThemeSwitch lang={lang} />
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
  const [scrollRef, roll] = useUnroll<HTMLDivElement>();

  return (
    <div className={lang === "en" ? "landing is-en" : "landing is-zh"}>
      <Topbar lang={lang} langSwitch={langSwitch} />

      {/* the hero is mounted like a painting; two collectors' seals straddle its mount */}
      <div className="hero-mount">
        <SymbiosisHero samples={SAMPLES} lang={lang}>
          {/* In Chinese the headline is an inscription: two columns written top to bottom, without punctuation, sealed below. */}
          <h1 className={lang === "en" ? "hero-h" : "hero-h hero-v"}>
            <span className="hero-line">{lang === "en" ? C.heroA.en : C.heroA.zh.replace(/[，。]/g, "")}</span>
            <span className="hero-line">{lang === "en" ? C.heroB.en : C.heroB.zh.replace(/[，。]/g, "")}</span>
          </h1>
          <Bi p={C.heroSub} lang={lang} as="p" className="hero-sub" />
          <div className="hero-ctas">
            <a className="btn btn-primary btn-large" href={UPLOAD_HREF}>
              <Bi p={C.ctaUpload} lang={lang} />
            </a>
            <a className="btn btn-large btn-icon sym-ghost" href="/space/demo">
              <SpaceIcon />
              <Bi p={C.ctaSpace} lang={lang} />
            </a>
          </div>
          <Bi p={C.testNote} lang={lang} as="p" className="hero-note" />
        </SymbiosisHero>
        <SealStamp text="真尺" kind="zhu" size={26} tilt={-2} className="seal-straddle seal-at-foot" />
        <SealStamp text="可印" kind="bai" size={24} tilt={1.5} className="seal-straddle seal-at-side" />
      </div>

      <section id="how" className="band band-how">
        <Bi p={C.howH} lang={lang} as="h2" className="band-h" />
        <div className="band-body">
          {/* the four steps on a handscroll: a stick at the start, the roll at the end, a silk
              divider (隔水) between steps; it unrolls once when it first comes into view */}
          <div className="handscroll" ref={scrollRef} data-roll={roll}>
            <span className="hs-stick" aria-hidden="true" />
            <div className="hs-paper">
              <ol className="how">
                {C.steps.map((s, i) => (
                  <li key={i}>
                    <HowVignette n={i} sample={SAMPLES[0]} lang={lang} />
                    <span className="how-n" aria-hidden="true">
                      {lang === "en" ? i + 1 : "壹贰叁肆"[i]}
                    </span>
                    <Bi p={s.t} lang={lang} as="h3" />
                    <Bi p={s.d} lang={lang} as="p" />
                  </li>
                ))}
              </ol>
            </div>
            <span className="hs-rod" aria-hidden="true" />
          </div>
        </div>
      </section>

      <section id="any" className="band band-wash">
        <Bi p={C.anyH} lang={lang} as="h2" className="band-h band-h-lead" />
        <div className="band-body">
          <div className="band-headrow any-head">
            <Bi p={C.anySub} lang={lang} as="p" className="any-sub" />
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
        </div>
      </section>

      <section id="samples" className="band">
        <Bi p={C.samplesH} lang={lang} as="h2" className="band-h band-h-lead" />
        <div className="band-body">
          <Bi p={C.samplesSub} lang={lang} as="p" className="band-sub band-lead" />
          <div className="sample-tabs seg" role="tablist" aria-label={one(C.samplesH)}>
            <SegPill />
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
          <Bi key={sample.id} p={board.reading.product} lang={lang} as="p" className="sample-reading fade-in" />
          <PackProvider initial={sample.pack} studioBase={`/space/demo?s=${sample.id}`} category={board.meta.category}>
            <BoxSync label={one(UI.rotateTogether)} hint={one(UI.dragHint)} toolbar={<PackBar lang={lang} />}>
              <div className="sample-grid">
                {board.directions.map((d) => (
                  <div className={d.id === board.recommendation.pick ? "sample is-recommended" : "sample"} key={d.id}>
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
        <div className="band-body">
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
                  <ColorBar palette={teaRec.palette} lang={lang} label="" />
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
        </div>
      </section>

      <section className="band band-nots">
        <Bi p={C.notH} lang={lang} as="h2" className="band-h" />
        <div className="band-body">
          <ul className="nots">
            {C.nots.map((n, i) => (
              <Bi key={i} p={n} lang={lang} as="li" />
            ))}
          </ul>
        </div>
      </section>

      {/* the closing call is set like a Song-printed cover: a thick-and-thin frame with key-fret
          corners and distant hills inside it, everything on the centre line */}
      <section className="end">
        <span className="end-frame" aria-hidden="true">
          <InkHills className="end-hills" />
          <FretCorner className="fret-tl" />
          <FretCorner className="fret-tr" />
          <FretCorner className="fret-bl" />
          <FretCorner className="fret-br" />
        </span>
        <Bi p={C.endH} lang={lang} as="h2" className="end-h" />
        <Bi p={C.endSub} lang={lang} as="p" />
        <a className="btn btn-primary btn-large" href={UPLOAD_HREF}>
          <Bi p={C.ctaUpload} lang={lang} />
        </a>
      </section>

      {/* a colophon (牌记), framed with a thick and a thin line as in a Song-printed book */}
      <footer className="footer">
        <div className="colophon">
          <span className="brandmark">
            <Brandmark size={30} />
            <Bi p={UI.appName} lang={lang} />
          </span>
          <Bi p={C.footer} lang={lang} />
        </div>
      </footer>
    </div>
  );
}
