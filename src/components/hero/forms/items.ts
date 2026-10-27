/**
 * The twenty packs in the homepage film "平面到立体 Flat to form": packaging in everyday use,
 * each shown from its flat print to its finished form. Sizes are real (mm); every pack wears
 * one of the sample brands' directions. Pure data, so the hero UI can import it cheaply.
 */
import type { Form } from "@/lib/pack";

type Pair = { zh: string; en: string };
export type FilmForm = Form | "rsc" | "pillow";

export type FilmItem = {
  id: string;
  form: FilmForm;
  name: Pair;
  /** Material and process, one short line. */
  note: Pair;
  /** Which sample's board, and which of its three directions. */
  sample: string;
  dir: number;
  w: number;
  h: number;
  d: number;
};

export const FILM: FilmItem[] = [
  { id: "carton", form: "carton", name: { zh: "反向插舌盒", en: "Reverse tuck carton" }, note: { zh: "350 g 白卡，四色印刷", en: "350 gsm folding boxboard, four-colour" }, sample: "cosmetics", dir: 0, w: 60, h: 140, d: 40 },
  { id: "tin", form: "tin", name: { zh: "马口铁罐", en: "Tinplate tin" }, note: { zh: "平张印铁，卷圆焊缝", en: "printed flat, rolled and seamed" }, sample: "baby", dir: 0, w: 84, h: 110, d: 84 },
  { id: "mailer", form: "mailer", name: { zh: "飞机盒", en: "Mailer box" }, note: { zh: "E 楞瓦楞，FEFCO 0427", en: "E-flute corrugated, FEFCO 0427" }, sample: "homeGoods", dir: 0, w: 260, h: 80, d: 200 },
  { id: "pouch", form: "pouch", name: { zh: "自立袋", en: "Stand-up pouch" }, note: { zh: "PET / 镀铝 / PE 复合膜", en: "PET / metallised / PE laminate" }, sample: "snacks", dir: 0, w: 160, h: 230, d: 80 },
  { id: "glassBottle", form: "glassBottle", name: { zh: "玻璃瓶", en: "Glass bottle" }, note: { zh: "正标、背标、颈标", en: "front, back and neck labels" }, sample: "beverage", dir: 0, w: 72, h: 230, d: 72 },
  { id: "gift", form: "gift", name: { zh: "天地盖礼盒", en: "Lid-and-base gift box" }, note: { zh: "1200 g 灰板，外裱印刷纸", en: "1200 gsm greyboard, printed wrap" }, sample: "tea", dir: 0, w: 260, h: 90, d: 200 },
  { id: "can", form: "can", name: { zh: "易拉罐", en: "Drink can" }, note: { zh: "两片铝罐，罐身曲面印刷", en: "two-piece aluminium, printed on the body" }, sample: "beverage", dir: 1, w: 66, h: 115, d: 66 },
  { id: "pillow", form: "pillow", name: { zh: "枕式袋", en: "Flow-wrap pack" }, note: { zh: "背封加两端齿封", en: "fin seal and crimped ends" }, sample: "snacks", dir: 1, w: 150, h: 26, d: 96 },
  { id: "drawer", form: "drawer", name: { zh: "抽屉盒", en: "Drawer box" }, note: { zh: "外套加抽屉内盒", en: "a sleeve and a sliding tray" }, sample: "toys", dir: 0, w: 160, h: 40, d: 110 },
  { id: "bottle", form: "bottle", name: { zh: "按压瓶", en: "Pump bottle" }, note: { zh: "HDPE 吹塑，薄膜标签", en: "blow-moulded HDPE, film label" }, sample: "personalCare", dir: 0, w: 70, h: 220, d: 70 },
  { id: "rsc", form: "rsc", name: { zh: "瓦楞纸箱", en: "Shipping carton" }, note: { zh: "B 楞，FEFCO 0201，单色印刷", en: "B-flute, FEFCO 0201, one-colour print" }, sample: "homeGoods", dir: 1, w: 320, h: 200, d: 240 },
  { id: "jar", form: "jar", name: { zh: "玻璃罐", en: "Glass jar" }, note: { zh: "正背标加盖顶贴", en: "front and back labels, lid sticker" }, sample: "specialty", dir: 0, w: 80, h: 95, d: 80 },
  { id: "bookBox", form: "bookBox", name: { zh: "书型磁吸盒", en: "Magnetic book box" }, note: { zh: "灰板裱纸，内嵌磁铁", en: "wrapped greyboard, magnets inside" }, sample: "electronics", dir: 0, w: 200, h: 60, d: 150 },
  { id: "tube", form: "tube", name: { zh: "软管", en: "Squeeze tube" }, note: { zh: "铝塑复合管，尾部热封", en: "laminate tube, heat-sealed end" }, sample: "cosmetics", dir: 1, w: 38, h: 160, d: 38 },
  { id: "bag", form: "bag", name: { zh: "手提纸袋", en: "Paper carrier bag" }, note: { zh: "250 g 白卡覆膜，绳提手", en: "250 gsm laminated board, rope handles" }, sample: "cosmetics", dir: 2, w: 240, h: 300, d: 100 },
  { id: "aseptic", form: "aseptic", name: { zh: "利乐砖", en: "Aseptic brick" }, note: { zh: "纸 / 铝 / PE 六层复合", en: "board / foil / PE, six layers" }, sample: "beverage", dir: 2, w: 95, h: 166, d: 63 },
  { id: "ceramic", form: "ceramic", name: { zh: "陶瓷茶叶罐", en: "Porcelain caddy" }, note: { zh: "贴花纸，烤花", en: "fired-on decal" }, sample: "tea", dir: 1, w: 90, h: 120, d: 90 },
  { id: "blister", form: "blister", name: { zh: "吸塑卡", en: "Blister card" }, note: { zh: "白卡加 PET 吸塑泡壳", en: "printed card, thermoformed PET" }, sample: "toys", dir: 1, w: 130, h: 200, d: 24 },
  { id: "paperTube", form: "paperTube", name: { zh: "纸罐", en: "Paper tube" }, note: { zh: "纸管卷制，外裱印刷纸", en: "wound board, printed wrap" }, sample: "tea", dir: 2, w: 80, h: 140, d: 80 },
  { id: "woodBox", form: "woodBox", name: { zh: "松木抽盖箱", en: "Pine crate" }, note: { zh: "松木，盖面激光雕刻", en: "pine, laser-engraved lid" }, sample: "specialty", dir: 1, w: 420, h: 150, d: 220 },
];

/** Seconds each pack is on screen. */
export const ITEM_SECONDS = 4.5;
export const FILM_SECONDS = FILM.length * ITEM_SECONDS;

/** What the film shows at a moment of each pack's turn. */
export const PHASES: Pair[] = [
  { zh: "刀模", en: "Dieline" },
  { zh: "印刷", en: "Print" },
  { zh: "成型", en: "Form" },
  { zh: "成品", en: "Finished" },
];
/** Phase boundaries, in seconds into a pack's turn. */
export const PHASE_AT = [0, 0.45, 1.1, 2.7];
export const phaseOf = (t: number) => (t < PHASE_AT[1] ? 0 : t < PHASE_AT[2] ? 1 : t < PHASE_AT[3] ? 2 : 3);

export const sizeText = (it: FilmItem) => (it.form === "tin" || it.form === "can" || it.form === "bottle" || it.form === "tube" || it.form === "jar" || it.form === "glassBottle" || it.form === "ceramic" || it.form === "paperTube" ? `Ø${it.w} × ${it.h} mm` : `${it.w} × ${it.d} × ${it.h} mm`);
