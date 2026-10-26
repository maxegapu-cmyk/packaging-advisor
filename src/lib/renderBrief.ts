/**
 * A render brief for the chosen direction on the chosen package: text a designer (or an
 * image model) can use to make a realistic e-commerce render. Follows the rules of the
 * `ecommerce-3d-render-assistant` skill: protect structure and layout first, then materials,
 * a light-grey-to-white seamless studio, a large soft key light, one narrow rim light, weak
 * front fill, natural contact shadow, restrained highlights, no heavy HDR or sharpening.
 * Client-safe.
 */
import type { Direction } from "./board/schema";
import type { Pair } from "./i18n";
import { FORM_LABELS, formatInner, formatSize, INSERT_LABELS, type PackSpec } from "./pack";

const FINISH_TEXT: Record<PackSpec["finish"], Pair> = {
  matte: { zh: "哑光纸面，低反射，颜色饱满不发灰", en: "matte paper stock, low reflection, colors full and not greyed" },
  gloss: { zh: "亮面覆膜，高光柔和连续、形状干净，不出现杂乱热点", en: "gloss laminate, soft continuous highlights with clean shapes, no random hot spots" },
  paper: { zh: "特种纹理纸，近看可见细微纸纤维，整体仍然干净", en: "textured specialty paper, fine fibres visible up close, still clean overall" },
  foil: { zh: "品名与重点图形烫金，金属高光随角度变化，其余为哑光纸面", en: "foil-stamped name and key graphic with highlights that shift with the angle; the rest matte paper" },
};

const FORM_TEXT: Record<PackSpec["form"], Pair> = {
  carton: { zh: "直立折叠纸盒", en: "upright folding carton" },
  gift: { zh: "天地盖礼盒（上盖与底盒分体）", en: "lid-and-base gift box (separate lid and base)" },
  bookBox: { zh: "书型磁吸硬礼盒，翻盖带前翻边", en: "book-style rigid box with a magnetic front flap" },
  mailer: { zh: "瓦楞飞机盒，翻盖带插舌，外印内牛皮", en: "corrugated mailer box with a tuck lid, printed outside and kraft inside" },
  drawer: { zh: "抽屉盒（外套 + 抽屉 + 丝带拉环）", en: "drawer box (sleeve, sliding tray and ribbon pull)" },
  paperTube: { zh: "纸罐，筒盖与筒身平齐，内颈可见", en: "paper tube with a flush lid over an inner neck" },
  bag: { zh: "手提纸袋，侧面风琴折，绳提手", en: "paper carrier bag with gusseted sides and rope handles" },
  pouch: { zh: "自立拉链袋，复合膜，底部展开站立", en: "stand-up zip pouch in laminated film, standing on its bottom gusset" },
  bottle: { zh: "塑料按压泵瓶，薄膜标签", en: "plastic pump bottle with a film label" },
  tube: { zh: "倒立软管，翻盖在下，尾部压封", en: "squeeze tube standing on its flip cap, crimp sealed at the top" },
  jar: { zh: "玻璃罐配金属旋盖，内容物透过玻璃可见", en: "glass jar with a metal lug cap, the contents visible through the glass" },
  glassBottle: { zh: "玻璃瓶配瓶塞，正标与颈标", en: "glass bottle with a stopper, front label and neck band" },
  tin: { zh: "金属圆罐，标签环绕罐身，金属罐盖", en: "round metal tin with a wrap-around label and a metal lid" },
  ceramic: { zh: "釉面瓷罐配瓷盖，釉上贴花", en: "glazed porcelain caddy with a porcelain lid and a fired-on decal" },
};

/** Surface notes for forms whose outside is not printed paper. */
const SURFACE_TEXT: Partial<Record<PackSpec["form"], Pair>> = {
  pouch: { zh: "复合膜表面，高光沿袋身鼓起的曲面连续过渡", en: "laminated film, highlights running smoothly over the pouch's swell" },
  jar: { zh: "玻璃清澈有厚度感，边缘有自然折射，不发绿不发灰", en: "clear glass with visible thickness and natural refraction at the edges, not green or grey" },
  glassBottle: { zh: "玻璃清澈有厚度感，瓶肩与瓶底有自然折射", en: "clear glass with visible thickness, natural refraction at the shoulder and base" },
  ceramic: { zh: "釉面温润光滑，高光柔和，贴花平整", en: "smooth, warm glaze with soft highlights and a flat decal" },
  tin: { zh: "印铁表面罩清漆，卷边处有金属高光", en: "lacquered printed tinplate with metallic highlights on the rolled edges" },
};

const role = (d: Direction, r: string) => d.palette.find((s) => s.role === r);

export function renderBrief(d: Direction, spec: PackSpec, product: Pair, brand: string): Pair {
  const size = formatSize(spec);
  const colors = d.palette.map((s) => ({ zh: `${s.name.zh} ${s.hex}（约 ${s.share}%）`, en: `${s.name.en} ${s.hex} (about ${s.share}%)` }));
  const ground = role(d, "background") ?? d.palette[0];
  const key = role(d, "brand") ?? d.palette[2] ?? d.palette[0];
  const name = brand || d.mockup.headline;
  const inner = spec.inner;
  const innerText = inner
    ? {
        zh: `组合包装：内装 ${formatInner(spec)} 的${FORM_LABELS[inner.form].zh}，${inner.insert ? INSERT_LABELS[inner.insert].zh : "内托"}固定，外包装按内容物尺寸配好。`,
        en: `Combination: holds ${formatInner(spec)} ${FORM_LABELS[inner.form].en.toLowerCase()}${inner.count > 1 ? "s" : ""}, held in a ${inner.insert ? INSERT_LABELS[inner.insert].en.toLowerCase() : "insert"}; the outer pack is sized to them.`,
      }
    : null;
  const surface = SURFACE_TEXT[spec.form];
  const zh = [
    `用途：电商主图与详情页的包装渲染，产品为「${product.zh}」，品牌「${name}」。`,
    `结构：${FORM_TEXT[spec.form].zh}，外尺寸 ${size}。保持盒型、比例、开口和接缝不变；正面版式、文字内容与位置、图形位置都不改动，不增加装饰零件。`,
    ...(innerText ? [innerText.zh] : []),
    `版式：${d.carriers.outerFront.zh}`,
    `视觉锚点：${d.anchor.zh}`,
    `配色：${colors.map((c) => c.zh).join("、")}。底色 ${ground.hex} 与品牌色 ${key.hex} 在成片中必须准确，不受背景光污染。`,
    `材质：${FINISH_TEXT[spec.finish].zh}${surface ? `；${surface.zh}` : ""}。`,
    "灯光与背景：浅灰到白色无缝棚拍背景；左上方大面积柔光作主光，一条窄长轮廓光勾出盒边，弱正面补光；自然接触阴影。高光连续、受控，用来说明形体；不过度 HDR、不发光、不过度锐化。",
    "镜头：四分之三视角，略高于产品俯视，产品居中，约占画面 60%；另出一张正面平视图。",
    "检查：轮廓与部件数量未变，文字清楚可读，看起来是真实可售的商品，而不是概念图。",
  ].join("\n");
  const en = [
    `Purpose: packaging render for an e-commerce main image and detail page. Product: "${product.en || product.zh}", brand "${name}".`,
    `Structure: ${FORM_TEXT[spec.form].en}, outside size ${size}. Keep the shape, proportions, openings and seams exactly; keep the front layout, wording, text and graphic positions unchanged; add no decorative parts.`,
    ...(innerText ? [innerText.en] : []),
    `Layout: ${d.carriers.outerFront.en}`,
    `Visual anchor: ${d.anchor.en}`,
    `Colors: ${colors.map((c) => c.en).join(", ")}. The ground ${ground.hex} and brand color ${key.hex} must stay accurate and must not be tinted by the background light.`,
    `Material: ${FINISH_TEXT[spec.finish].en}${surface ? `; ${surface.en}` : ""}.`,
    "Light and background: light-grey-to-white seamless studio sweep; a large soft key light from the upper left, one narrow rim light along the box edge, weak front fill; natural contact shadow. Highlights continuous and controlled, describing the form; no heavy HDR, bloom or over-sharpening.",
    "Camera: three-quarter view from slightly above, product centred at about 60% of the frame; plus one straight-on front view.",
    "Check: silhouette and part count unchanged, text legible, and it reads as a real product for sale rather than a concept image.",
  ].join("\n");
  return { zh, en };
}

