/** The chapters of the civilization film (hero/civilization.ts). No three.js here, so the hero UI can import it eagerly. */
export type Pair = { zh: string; en: string };
export type Chapter = { id: string; year: Pair; short: Pair; title: Pair; line: Pair; dark: boolean };

export const CHAPTERS: Chapter[] = [
  { id: "cave", dark: true, short: { zh: "4 万年前", en: "40,000 BP" }, year: { zh: "约 4 万年前", en: "c. 40,000 years ago" }, title: { zh: "岩壁上的手印", en: "A hand on the rock" }, line: { zh: "人第一次把自己留在一个平面上。", en: "People first leave a mark of themselves on a flat surface." } },
  { id: "bone", dark: true, short: { zh: "前 1200", en: "1200 BC" }, year: { zh: "约公元前 1200 年", en: "c. 1200 BC" }, title: { zh: "刻在甲骨上的字", en: "Signs cut into bone" }, line: { zh: "符号有了笔画，也有了刻进去的深度。", en: "Signs gain strokes, and the depth of a cut." } },
  { id: "type", dark: false, short: { zh: "1040s", en: "1040s" }, year: { zh: "1040 年代", en: "1040s" }, title: { zh: "毕昇的活字", en: "Bi Sheng's movable type" }, line: { zh: "立体的字块，印出一张又一张平面。", en: "Solid type prints one flat page after another." } },
  { id: "perspective", dark: false, short: { zh: "1420", en: "1420" }, year: { zh: "约 1420 年", en: "c. 1420" }, title: { zh: "透视", en: "Linear perspective" }, line: { zh: "平面学会了画出深度。", en: "A flat picture learns to show depth." } },
  { id: "projection", dark: true, short: { zh: "1799", en: "1799" }, year: { zh: "1799 年", en: "1799" }, title: { zh: "画法几何", en: "Descriptive geometry" }, line: { zh: "三张平面视图，确定一个立体。", en: "Three flat views fix one solid." } },
  { id: "carton", dark: true, short: { zh: "1879", en: "1879" }, year: { zh: "1879 年", en: "1879" }, title: { zh: "折叠纸盒", en: "The folding carton" }, line: { zh: "一次裁切压痕的纸板，折成一个盒子。", en: "Board cut and creased in one go folds into a box." } },
  { id: "digital", dark: true, short: { zh: "1963—", en: "1963–" }, year: { zh: "1963 年至今", en: "1963 to now" }, title: { zh: "数字三维", en: "Digital 3D" }, line: { zh: "从点、线、面，到看得见摸得着的样子。", en: "From points, lines and faces to something you could touch." } },
];


/** Length of one chapter in the film, in seconds. */
export const CHAPTER_SECONDS = 8;
