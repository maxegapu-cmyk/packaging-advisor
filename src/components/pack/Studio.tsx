"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { Board, Direction } from "@/lib/board/schema";
import type { Lang, Pair } from "@/lib/i18n";
import {
  DIAMETER_LABEL,
  DIM_LABELS,
  DIM_RANGE,
  FINISH_LABELS,
  FINISHES,
  FORM_LABELS,
  FORM_NOTES,
  FORM_PRESET,
  formatSize,
  CAN_OPEN,
  GUSSET_LABEL,
  INNER_FORMS,
  INSERT_LABELS,
  INSERTS,
  isOuter,
  isRound,
  MATERIAL_GROUPS,
  type Form,
  type InnerForm,
  type PackSpec,
} from "@/lib/pack";
import { renderBrief } from "@/lib/renderBrief";
import { paletteVars } from "../BoxFaces";
import { CopyButton } from "../CopyButton";
import { Package3D } from "./Package3D";
import type { PackScene, PinOnScreen } from "../three/engine";
import type { Backdrop } from "../three/studio";
import { Orbit, REST_ANGLE, reducedMotion, VIEWS, type Angle } from "./orbit";
import { Stage3D } from "./Stage3D";
import { FormGlyph } from "./FormGlyph";
import { ColorStrip, RegMarks, sheetVars } from "../PressSheet";

/* ---------------------------------------------------------------- Text */

const S = {
  back: { zh: "返回方案板", en: "Back to the board" },
  space: { zh: "3D 空间", en: "3D space" },
  direction: { zh: "方向", en: "Direction" },
  structure: { zh: "盒型与尺寸", en: "Structure and size" },
  finish: { zh: "表面工艺", en: "Finish" },
  backdrop: { zh: "背景", en: "Backdrop" },
  views: { zh: "视角", en: "Views" },
  details: { zh: "细节", en: "Details" },
  spin: { zh: "自动旋转", en: "Turntable" },
  unfold: { zh: "展开刀模", en: "Unfold" },
  fold: { zh: "折回盒子", en: "Fold up" },
  openLid: { zh: "打开盖子", en: "Open lid" },
  closeLid: { zh: "盖上", en: "Close lid" },
  pullOut: { zh: "拉出抽屉", en: "Pull out" },
  pushIn: { zh: "推回抽屉", en: "Push in" },
  unscrew: { zh: "拧开盖子", en: "Unscrew" },
  unstop: { zh: "拔出瓶塞", en: "Pull stopper" },
  stopIn: { zh: "塞回瓶塞", en: "Stopper in" },
  openBook: { zh: "翻开", en: "Open" },
  pullTab: { zh: "拉开拉环", en: "Pull the tab" },
  slideLid: { zh: "抽出盖子", en: "Slide the lid out" },
  slideIn: { zh: "推回盖子", en: "Slide the lid in" },
  closeBook: { zh: "合上", en: "Close" },
  combo: { zh: "组合包装", en: "Combination" },
  comboNote: { zh: "选一种产品装进这个外包装，外包装尺寸会按产品自动配好。", en: "Pick a product to pack in this outer pack; the outer size is fitted to it." },
  none: { zh: "不装产品", en: "Remove product" },
  count: { zh: "数量", en: "Count" },
  insert: { zh: "内托", en: "Insert" },
  productSize: { zh: "内装产品尺寸", en: "Product size" },
  outerFitted: { zh: "外包装自动配为", en: "Outer pack fitted to" },
  reset: { zh: "复位", en: "Reset" },
  zoomIn: { zh: "放大", en: "Zoom in" },
  zoomOut: { zh: "缩小", en: "Zoom out" },
  hint: { zh: "拖动或单指滑动任意翻转，双指捏合缩放、旋拧转动，双击复位", en: "Drag or swipe to turn it any way; pinch to zoom, twist to spin; double-tap to reset" },
  tabPack: { zh: "包装", en: "Pack" },
  nextLabel: { zh: "打样完成后，下一步", en: "When the structure is settled" },
  handoff: { zh: "交给设计师", en: "Hand it to your designer" },
  tabLook: { zh: "外观", en: "Look" },
  tabCheck: { zh: "检查", en: "Check" },
  material: { zh: "材料", en: "Material" },
  size: { zh: "尺寸", en: "Size" },
  anatomy: { zh: "结构解剖", en: "Anatomy" },
  anatomyNote: { zh: "数字都由你填的尺寸算出。", en: "Every number is computed from your sizes." },
  render: { zh: "照片级出图", en: "Render photo" },
  renderingPct: { zh: "照片级出图", en: "Rendering photo" },
  renderDone: { zh: "照片级成片 · 拖动即回到实时视图", en: "Photo ready · drag to return to the live view" },
  rendering: { zh: "正在出图后导出…", en: "Rendering, then exporting…" },
  listing: { zh: "主图测试", en: "Listing test" },
  listingNote: { zh: "左：800×800 白底主图。右：在搜索结果里大约这么大，品牌名还看得清吗？", en: "Left: an 800×800 white main image. Right: about this size in search results. Can you still read the brand?" },
  brief: { zh: "渲染简报", en: "Render brief" },
  briefNote: { zh: "给设计师或出图工具：结构、配色、材质、灯光一次说清，按电商棚拍标准。", en: "For a designer or an image tool: structure, colors, material and light in one go, to an e-commerce studio standard." },
  copy: { zh: "复制", en: "Copy" },
  copied: { zh: "已复制", en: "Copied" },
  saved: { zh: "已保存", en: "Saved" },
  saving: { zh: "保存中…", en: "Saving…" },
  saveError: { zh: "没有保存成功，请稍后再试", en: "Couldn't save; try again shortly" },
  notSaved: { zh: "示例：改动不会保存", en: "Sample: changes aren't saved" },
  adjust: { zh: "调整", en: "Adjust" },
  close: { zh: "关闭", en: "Close" },
  export: { zh: "导出图片", en: "Export image" },
  exporting: { zh: "正在导出…", en: "Exporting…" },
  recommended: { zh: "推荐", en: "Recommended" },
  mm: { zh: "毫米", en: "mm" },
  disclaimer: { zh: "立体示意用于比较方向，不是印刷效果；颜色以打样为准。", en: "A 3D sketch for comparing directions, not a print proof; confirm colors with a proof." },
} satisfies Record<string, Pair>;

const BACKDROPS: { id: string; label: Pair }[] = [
  { id: "studio", label: { zh: "棚拍", en: "Studio" } },
  { id: "white", label: { zh: "白底", en: "White" } },
  { id: "brand", label: { zh: "品牌色", en: "Brand" } },
  { id: "dark", label: { zh: "暗场", en: "Dark" } },
];

type PanelTab = "pack" | "look" | "check";

type Detail = { id: string; label: Pair; angle: Angle; zoom: number; open?: boolean; text: (d: Direction) => Pair };

/** Close-up shots, like a shopping app's detail views, each tied to what the board says. */
function detailsFor(form: Form): Detail[] {
  const front = (d: Direction) => d.carriers.outerFront;
  const back = (d: Direction) => d.carriers.outerBack;
  const anchor = (d: Direction) => d.anchor;
  const inner = (d: Direction) => d.carriers.inner;
  const type = (d: Direction) => d.styleDna.typography;
  const finish = (d: Direction) => d.styleDna.finish;
  const canOpen = CAN_OPEN.includes(form);
  if (form === "gift" || form === "bookBox" || form === "mailer" || form === "woodBox")
    return [
      { id: "lid", label: { zh: "盖面主视觉", en: "Lid artwork" }, angle: { x: -64, y: -8 }, zoom: 1.16, text: front },
      { id: "band", label: { zh: "侧边与字体", en: "Sides and type" }, angle: { x: -10, y: -22 }, zoom: 1.31, text: type },
      { id: "inside", label: { zh: "开盒内部", en: "Inside" }, angle: { x: -46, y: -20 }, zoom: 0.98, open: true, text: inner },
      { id: "anchor", label: { zh: "视觉锚点", en: "Visual anchor" }, angle: { x: -30, y: 28 }, zoom: 1.09, text: anchor },
      { id: "finish", label: { zh: "工艺", en: "Finish" }, angle: { x: -38, y: -48 }, zoom: 1.23, text: finish },
    ];
  if (form === "drawer")
    return [
      { id: "front", label: { zh: "抽屉正面", en: "Tray front" }, angle: { x: -6, y: -8 }, zoom: 1.2, text: type },
      { id: "lid", label: { zh: "外套主视觉", en: "Sleeve artwork" }, angle: { x: -64, y: -8 }, zoom: 1.16, text: front },
      { id: "inside", label: { zh: "拉开内部", en: "Inside" }, angle: { x: -40, y: -26 }, zoom: 0.96, open: true, text: inner },
      { id: "finish", label: { zh: "工艺", en: "Finish" }, angle: { x: -30, y: -48 }, zoom: 1.23, text: finish },
    ];
  if (isRound(form))
    return [
      { id: "label", label: { zh: "正面标签", en: "Label" }, angle: { x: -6, y: -8 }, zoom: 1.2, text: front },
      { id: "side", label: { zh: "侧面信息", en: "Side panel" }, angle: { x: -6, y: -150 }, zoom: 1.2, text: back },
      { id: "top", label: form === "glassBottle" ? { zh: "瓶塞", en: "Stopper" } : form === "tube" ? { zh: "尾封", en: "Crimp" } : form === "can" ? { zh: "罐盖与拉环", en: "End and tab" } : { zh: "顶部", en: "Top" }, angle: { x: -64, y: -12 }, zoom: 1.18, text: anchor },
      ...(canOpen ? [{ id: "open", label: { zh: "打开", en: "Opened" }, angle: { x: -40, y: -22 }, zoom: 0.95, open: true, text: inner }] : []),
      { id: "finish", label: { zh: "工艺", en: "Finish" }, angle: { x: -14, y: 30 }, zoom: 1.27, text: finish },
    ];
  if (form === "pouch" || form === "bag" || form === "blister")
    return [
      { id: "front", label: { zh: "正面主视觉", en: "Front artwork" }, angle: { x: -6, y: -8 }, zoom: 1.16, text: front },
      { id: "side", label: form === "bag" ? { zh: "侧面风琴折", en: "Gusset" } : form === "blister" ? { zh: "泡罩侧面", en: "Blister profile" } : { zh: "侧封与拉链", en: "Seal and zip" }, angle: { x: -8, y: 70 }, zoom: 1.2, text: type },
      { id: "back", label: { zh: "背面信息", en: "Back panel" }, angle: { x: -6, y: 180 }, zoom: 1.16, text: back },
      { id: "finish", label: { zh: "工艺", en: "Finish" }, angle: { x: -24, y: -46 }, zoom: 1.28, text: finish },
    ];
  return [
    { id: "front", label: { zh: "正面主视觉", en: "Front artwork" }, angle: { x: -4, y: -8 }, zoom: 1.18, text: front },
    { id: "spine", label: { zh: "品牌侧面", en: "Brand side" }, angle: { x: -6, y: 72 }, zoom: 1.2, text: anchor },
    { id: "back", label: { zh: "背面信息", en: "Back panel" }, angle: { x: -6, y: 180 }, zoom: 1.16, text: back },
    { id: "top", label: { zh: "顶部开口", en: "Top flap" }, angle: { x: -70, y: -24 }, zoom: 1.18, text: type },
    { id: "finish", label: { zh: "工艺", en: "Finish" }, angle: { x: -20, y: -52 }, zoom: 1.31, text: finish },
  ];
}

/** What the open button says for each form. */
function openLabelFor(form: Form, open: boolean): Pair {
  if (form === "carton") return open ? S.fold : S.unfold;
  if (form === "drawer") return open ? S.pushIn : S.pullOut;
  if (form === "jar") return open ? S.closeLid : S.unscrew;
  if (form === "glassBottle") return open ? S.stopIn : S.unstop;
  if (form === "bookBox") return open ? S.closeBook : S.openBook;
  if (form === "can") return open ? S.closeLid : S.pullTab;
  if (form === "aseptic") return open ? S.closeLid : S.unscrew;
  if (form === "woodBox") return open ? S.slideIn : S.slideLid;
  return open ? S.closeLid : S.openLid;
}

/* ---------------------------------------------------------------- Small pieces */

function L({ p, lang, className }: { p: Pair; lang: Lang; className?: string }) {
  if (lang === "zh") return <span className={className}>{p.zh}</span>;
  if (lang === "en") return <span className={className}>{p.en}</span>;
  return (
    <span className={`bi ${className ?? ""}`}>
      <span>{p.zh}</span>
      <span className="bi-en">{p.en}</span>
    </span>
  );
}
/** Mixes two hex colors (t = share of b). */
function mix(a: string, b: string, t: number): string {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)];
  return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * t)).join(",")})`;
}
const one = (p: Pair, lang: Lang) => (lang === "en" ? p.en : p.zh);
const both = (p: Pair, lang: Lang) => (lang === "bi" ? `${p.zh} ${p.en}` : one(p, lang));

function Icon({ name }: { name: string }) {
  const paths: Record<string, ReactNode> = {
    back: <path d="M15 5l-7 7 7 7" />,
    spin: (
      <>
        <path d="M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3" />
        <path d="M18 3v4h-4M6 21v-4h4" />
      </>
    ),
    open: (
      <>
        <path d="M4 10l8-4 8 4-8 4z" />
        <path d="M4 10v7l8 4 8-4v-7" />
        <path d="M12 14v7" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    minus: <path d="M5 12h14" />,
    reset: (
      <>
        <path d="M4 4v6h6" />
        <path d="M5 15a8 8 0 1 0 1.5-8.5L4 10" />
      </>
    ),
    sliders: <path d="M4 7h10M18 7h2M4 17h4M12 17h8M14 5v4M8 15v4" />,
    x: <path d="M6 6l12 12M18 6L6 18" />,
    eye: (
      <>
        <path d="M2.5 12s3.5-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.5 6.5-9.5 6.5S2.5 12 2.5 12z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
    camera: (
      <>
        <path d="M4 8h3l1.5-2h7L17 8h3v11H4z" />
        <circle cx="12" cy="13" r="3.5" />
      </>
    ),
    anatomy: (
      <>
        <path d="M4 15l8 4 8-4" />
        <path d="M4 10l8 4 8-4" />
        <path d="M4 5l8-3 8 3-8 4z" />
      </>
    ),
    download: (
      <>
        <path d="M12 4v11M7 10l5 5 5-5" />
        <path d="M5 19h14" />
      </>
    ),
  };
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  );
}

/** Tiny static thumbnail of the package for the listing test. */
function ListingTile({ children, mine }: { children?: ReactNode; mine?: boolean }) {
  return (
    <div className={`lt-tile${mine ? " is-mine" : ""}`}>
      <div className="lt-img">{children}</div>
      <i />
      <i className="short" />
    </div>
  );
}

/* ---------------------------------------------------------------- Studio */

export function Studio({
  board,
  initialPack,
  initialDirection,
  lang,
  saveUrl,
  backHref,
  handoffHref,
  isSample = false,
}: {
  board: Board;
  initialPack: PackSpec;
  initialDirection?: string;
  lang: Lang;
  saveUrl?: string;
  backHref: string;
  /** The last step, once the structure is settled: back to the board's hand-off section. */
  handoffHref?: string;
  isSample?: boolean;
}) {
  const dirs = board.directions;
  const startIdx = Math.max(0, dirs.findIndex((x) => x.id === (initialDirection ?? board.recommendation.pick)));
  const [idx, setIdx] = useState(startIdx);
  const d = dirs[idx];
  const brand = board.meta.brand.startsWith("[") ? "" : board.meta.brand;

  const [spec, setSpecState] = useState(initialPack);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const setSpec = useCallback(
    (s: PackSpec) => {
      setSpecState(s);
      if (!saveUrl) return;
      clearTimeout(saveTimer.current);
      setSaveState("saving");
      saveTimer.current = setTimeout(async () => {
        try {
          const res = await fetch(saveUrl, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(s) });
          setSaveState(res.ok ? "saved" : "error");
        } catch {
          setSaveState("error");
        }
      }, 600);
    },
    [saveUrl],
  );

  const [orbit] = useState(() => new Orbit({ x: 0, y: 0 }, 0.7, { free: true }));
  const [open, setOpen] = useState(spec.form === "carton");
  const [spinning, setSpinning] = useState(false);
  const [backdrop, setBackdrop] = useState("studio");
  const [detail, setDetail] = useState<Detail | null>(null);
  const [hint, setHint] = useState(true);
  const [panel, setPanel] = useState(false);
  const [tab, setTab] = useState<PanelTab>("pack");
  const [views, setViews] = useState(false);
  const [matGroup, setMatGroup] = useState(() => MATERIAL_GROUPS.find((g) => g.forms.includes(initialPack.form))?.id ?? "paper");
  const [anatomy, setAnatomy] = useState(false);
  const [pins, setPins] = useState<PinOnScreen[] | null>(null);
  const [parts, setParts] = useState<{ n: number; label: Pair; detail: Pair }[]>([]);
  const [progress, setProgress] = useState<number | null>(null);
  const [hot, setHot] = useState<number | null>(null);

  // Stage size decides how big the package is drawn.
  const stageRef = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState({ w: 900, h: 700 });
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setStage({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const narrow = stage.w < 640;
  const fit = Math.max(170, Math.min(stage.w * (narrow ? 0.74 : 0.44), stage.h * (narrow ? 0.5 : 0.47), 420));

  useEffect(() => orbit.onSpin(setSpinning), [orbit]);

  // Listing test: copy the rendered view into a white main image and a search-size thumbnail.
  const engine = useRef<PackScene | null>(null);
  const ltMain = useRef<HTMLCanvasElement>(null);
  const ltSmall = useRef<HTMLCanvasElement>(null);
  const lastSnap = useRef(0);
  const trailing = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const snapshot = useCallback((src: HTMLCanvasElement) => {
    const now = performance.now();
    clearTimeout(trailing.current);
    if (now - lastSnap.current < 120) {
      // the drawing buffer is gone after this frame; ask for one more render to copy from
      trailing.current = setTimeout(() => engine.current?.refresh(), 140);
      return;
    }
    lastSnap.current = now;
    const side = Math.min(src.width, src.height) * 0.86;
    const sx = (src.width - side) / 2;
    const sy = (src.height - side) / 2;
    for (const c of [ltMain.current, ltSmall.current]) {
      const ctx = c?.getContext("2d");
      if (!c || !ctx) continue;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(src, sx, sy, side, side, 0, 0, c.width, c.height);
    }
  }, []);
  const [exporting, setExporting] = useState(false);
  const exportImage = async () => {
    const e = engine.current;
    if (!e || exporting) return;
    setExporting(true);
    try {
      const paint = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
        if (backdrop === "white") {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, w, h);
          return;
        }
        const g = ctx.createRadialGradient(w * 0.42, h * 0.34, 0, w * 0.42, h * 0.34, Math.max(w, h) * 0.95);
        const stops: [number, string][] =
          backdrop === "dark" ? [[0, "#3b3b3b"], [0.58, "#171717"], [1, "#0a0a0a"]] : backdrop === "brand" ? [[0, mix(ground, "#ffffff", 0.45)], [0.52, ground], [1, mix(ground, "#000000", 0.28)]] : [[0, "#ffffff"], [0.42, "#f2f2f0"], [1, "#d9d9d5"]];
        for (const [o, c] of stops) g.addColorStop(o, c);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      };
      const blob = await e.exportImage(Math.max(2, Math.min(3, 2400 / Math.max(stage.w, 1))), paint, 160);
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${one(board.meta.product, lang)}-${d.id}.png`.replace(/[\\/:*?"<>|\s]+/g, "_");
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    } finally {
      setExporting(false);
    }
  };

  // Entrance: a carton assembles from its flat net; other forms swing into view.
  const entered = useRef(false);
  useEffect(() => {
    if (entered.current) return;
    entered.current = true;
    if (reducedMotion()) {
      setOpen(false);
      orbit.set(REST_ANGLE, 1);
      return;
    }
    if (spec.form === "carton") {
      orbit.set({ x: 0, y: 0 }, 1);
      const t = setTimeout(() => {
        setOpen(false);
        orbit.tween(REST_ANGLE, 2300, 1);
      }, 500);
      return () => clearTimeout(t);
    }
    orbit.set({ x: -8, y: -210 }, 0.6);
    orbit.tween(REST_ANGLE, 1600, 1);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const t = setTimeout(() => setHint(false), 5200);
    return () => clearTimeout(t);
  }, []);

  const toggleAnatomy = () => {
    const next = !anatomy;
    setAnatomy(next);
    setDetail(null);
    setHint(false);
    if (next) {
      setOpen(false);
      orbit.tween({ x: -24, y: -32 }, 900, 1);
    }
  };

  const interact = useCallback(() => {
    setHint(false);
    setDetail(null);
  }, []);

  const toggleOpen = () => {
    setDetail(null);
    setAnatomy(false);
    const next = !open;
    setOpen(next);
    if (spec.form === "carton") orbit.tween(next ? { x: 0, y: 0 } : REST_ANGLE, next ? 1400 : 2300, 1);
    else orbit.tween(next ? { x: -42, y: -24 } : REST_ANGLE, 1100, next ? 0.95 : 1);
  };

  const changeForm = (form: Form) => {
    if (form === spec.form) return;
    setDetail(null);
    setOpen(false);
    // a combination keeps its product when the outer pack changes
    const keep = isOuter(form) && spec.inner ? { inner: spec.inner } : {};
    setSpec({ ...FORM_PRESET[form], finish: spec.finish, ...keep });
    orbit.tween(REST_ANGLE, 700, 1);
  };
  const changeInner = (form: InnerForm | null) => {
    setDetail(null);
    if (!form) {
      const { inner: _drop, ...rest } = spec; // eslint-disable-line @typescript-eslint/no-unused-vars
      setSpec(rest);
      return;
    }
    if (spec.inner?.form === form) return;
    const p = FORM_PRESET[form];
    setSpec({ ...spec, inner: { form, count: spec.inner?.count ?? 1, w: p.w, h: p.h, d: p.d, insert: spec.inner?.insert } });
  };

  const showDetail = (x: Detail) => {
    setHint(false);
    if (detail?.id === x.id) {
      setDetail(null);
      orbit.tween(REST_ANGLE, 800, 1);
      return;
    }
    setDetail(x);
    if (spec.form === "carton") setOpen(false);
    else setOpen(!!x.open);
    orbit.tween(x.angle, 900, x.zoom);
  };

  const details = useMemo(() => detailsFor(spec.form), [spec.form]);
  const brief = useMemo(() => renderBrief(d, spec, board.meta.product, brand), [d, spec, board.meta.product, brand]);
  const briefText = lang === "zh" ? brief.zh : lang === "en" ? brief.en : `${brief.zh}\n\n${brief.en}`;
  const openLabel = openLabelFor(spec.form, open);
  const canOpen = CAN_OPEN.includes(spec.form);
  // when a product is packed, the size fields edit the product and the outer pack follows
  const sizeTarget = spec.inner ?? spec;
  const sizeForm: Form = spec.inner?.form ?? spec.form;
  const setSize = (k: "w" | "h" | "d", n: number) => {
    const roundW = isRound(sizeForm) && k === "w" ? { d: n } : {};
    if (spec.inner) setSpec({ ...spec, inner: { ...spec.inner, [k]: n, ...roundW } });
    else setSpec({ ...spec, [k]: n, ...roundW });
  };
  const ground = d.palette[0]?.hex ?? "#eee";

  const saveNote = isSample ? S.notSaved : saveState === "saving" ? S.saving : saveState === "saved" ? S.saved : saveState === "error" ? S.saveError : null;

  const panelTabs: { id: PanelTab; label: Pair }[] = [
    { id: "pack", label: S.tabPack },
    { id: "look", label: S.tabLook },
    { id: "check", label: S.tabCheck },
  ];
  const group = MATERIAL_GROUPS.find((g) => g.id === matGroup) ?? MATERIAL_GROUPS[0];

  return (
    <div className={`studio bd-${backdrop}${panel ? " panel-open" : ""}`} style={{ ...paletteVars(d), ...sheetVars(d), "--sg": ground } as CSSProperties}>
      <header className="st-top">
        <a className="st-back" href={backHref}>
          <Icon name="back" />
          <L p={S.back} lang={lang} />
        </a>
        <div className="st-title">
          <strong>{one(board.meta.product, lang)}</strong>
          <span className="st-space">{one(S.space, lang)}</span>
        </div>
        <nav className="st-dirs" aria-label={both(S.direction, lang)}>
          {dirs.map((x, i) => (
            <button key={x.id} type="button" className={i === idx ? "st-dir is-active" : "st-dir"} aria-pressed={i === idx} onClick={() => setIdx(i)}>
              <span className="st-dir-sw" style={{ background: `linear-gradient(90deg, ${x.palette[0]?.hex} 50%, ${x.palette[2]?.hex} 50%)` }} />
              <span className="dir-id">{x.id}</span>
              <span className="st-dir-name">{one(x.name, lang)}</span>
            </button>
          ))}
        </nav>
      </header>
      <ColorStrip d={d} cells={64} className="st-strip" />

      <div className="st-stage" ref={stageRef}>
        <RegMarks />
        <Stage3D orbit={orbit} label={`${one(S.space, lang)}: ${one(d.name, lang)}`} inPage={false} wheelZoom className="st-canvas" onInteract={interact}>
          <Package3D
            d={d}
            brand={brand}
            spec={spec}
            fit={fit}
            open={open}
            orbit={orbit}
            quality="high"
            category={board.meta.category}
            loader
            onEngine={(e) => (engine.current = e)}
            afterRender={snapshot}
            stage="sweep"
            photoreal
            backdrop={backdrop as Backdrop}
            anatomy={anatomy}
            onProgress={setProgress}
            onPins={(p) => {
              setPins(p);
              const list = engine.current?.parts() ?? [];
              setParts((old) => (old.length === list.length && old.every((o, i) => o.detail.zh === list[i].detail.zh && o.label.zh === list[i].label.zh) ? old : list));
            }}
          />
        </Stage3D>

        {anatomy && pins
          ? pins.map((p) =>
              p.visible ? (
                <span key={p.n} className={`st-pin${hot === p.n ? " is-hot" : ""}`} style={{ left: p.x, top: p.y }} aria-hidden="true">
                  {p.n}
                </span>
              ) : null,
            )
          : null}

        {progress !== null ? (
          <div className="st-progress" aria-live="polite">
            <span className="st-progress-bar">
              <i style={{ width: `${Math.round(progress * 100)}%` }} />
            </span>
            <span>{exporting ? one(S.rendering, lang) : progress >= 1 ? one(S.renderDone, lang) : `${one(S.renderingPct, lang)} ${Math.round(progress * 100)}%`}</span>
          </div>
        ) : null}

        <div className={`st-hint${hint ? " is-on" : ""}`} aria-hidden={!hint}>
          <svg viewBox="0 0 48 48" aria-hidden="true">
            <path d="M8 24h32M14 18l-6 6 6 6M34 18l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <L p={S.hint} lang={lang} />
        </div>

        {anatomy ? (
          <aside className="st-card st-parts" aria-live="polite">
            <div className="st-card-head">
              <span className="st-card-title">
                {one(S.anatomy, lang)}
                <small>
                  {one(FORM_LABELS[spec.form], lang)}
                  {spec.inner ? ` + ${one(FORM_LABELS[spec.inner.form], lang)}` : ""}
                </small>
              </span>
              <button type="button" className="st-icon-btn" aria-label={both(S.close, lang)} onClick={() => toggleAnatomy()}>
                <Icon name="x" />
              </button>
            </div>
            <ol className="st-part-list">
              {parts.map((x) => (
                <li key={x.n} onPointerEnter={() => setHot(x.n)} onPointerLeave={() => setHot(null)}>
                  <span className="st-pin-n">{x.n}</span>
                  <span>
                    <L p={x.label} lang={lang} className="st-part-name" />
                    <L p={x.detail} lang={lang} className="st-part-detail" />
                  </span>
                </li>
              ))}
            </ol>
            <p className="st-small">{both(S.anatomyNote, lang)}</p>
          </aside>
        ) : (
          <div className="st-details" role="group" aria-label={both(S.details, lang)}>
            {details.map((x) => (
              <button key={x.id} type="button" className={detail?.id === x.id ? "st-chip is-active" : "st-chip"} aria-pressed={detail?.id === x.id} onClick={() => showDetail(x)}>
                {one(x.label, lang)}
              </button>
            ))}
          </div>
        )}

        {detail && !anatomy ? (
          <aside className="st-card st-caption" aria-live="polite">
            <div className="st-card-head">
              <L p={detail.label} lang={lang} className="st-card-title" />
              <button type="button" className="st-icon-btn" aria-label={both(S.close, lang)} onClick={() => showDetail(detail)}>
                <Icon name="x" />
              </button>
            </div>
            <L p={detail.text(d)} lang={lang} className="st-caption-text" />
          </aside>
        ) : null}

        {views ? (
          <div className="st-views" role="menu" aria-label={both(S.views, lang)}>
            {VIEWS.map((v) => (
              <button
                key={v.id}
                type="button"
                role="menuitem"
                onClick={() => {
                  interact();
                  setViews(false);
                  if (spec.form === "carton" && open) setOpen(false);
                  orbit.tween(v.angle, 800, 1);
                }}
              >
                {one(v.label, lang)}
              </button>
            ))}
          </div>
        ) : null}

        <div className="st-dock" role="toolbar" aria-label={both(S.views, lang)}>
          <button type="button" className={views ? "st-dock-btn is-active" : "st-dock-btn"} aria-expanded={views} aria-haspopup="menu" onClick={() => setViews(!views)} title={both(S.views, lang)}>
            <Icon name="eye" />
            <span className="st-dock-text">{one(S.views, lang)}</span>
          </button>
          <button type="button" className={spinning ? "st-dock-btn is-active" : "st-dock-btn"} aria-pressed={spinning} onClick={() => (interact(), orbit.spin(!spinning))} title={both(S.spin, lang)}>
            <Icon name="spin" />
            <span className="st-dock-text">{one(S.spin, lang)}</span>
          </button>
          <button type="button" className={anatomy ? "st-dock-btn is-active" : "st-dock-btn"} aria-pressed={anatomy} onClick={() => toggleAnatomy()} title={both(S.anatomy, lang)}>
            <Icon name="anatomy" />
            <span className="st-dock-text">{one(S.anatomy, lang)}</span>
          </button>
          {canOpen ? (
            <button type="button" className={open ? "st-dock-btn is-active" : "st-dock-btn"} aria-pressed={open} onClick={toggleOpen} title={both(openLabel, lang)}>
              <Icon name="open" />
              <span className="st-dock-text">{one(openLabel, lang)}</span>
            </button>
          ) : null}
          <button
            type="button"
            className="st-dock-btn st-reset"
            onClick={() => {
              interact();
              setOpen(false);
              orbit.tween(REST_ANGLE, 800, 1);
            }}
            title={both(S.reset, lang)}
            aria-label={both(S.reset, lang)}
          >
            <Icon name="reset" />
          </button>
          <span className="st-sep" aria-hidden="true" />
          <button
            type="button"
            className={progress !== null ? "st-dock-btn st-dock-strong is-active" : "st-dock-btn st-dock-strong"}
            onClick={() => {
              setHint(false);
              orbit.stop();
              engine.current?.startRender();
            }}
            title={both(S.render, lang)}
          >
            <Icon name="camera" />
            <span className="st-dock-text">{one(S.render, lang)}</span>
          </button>
          <button type="button" className="st-dock-btn" onClick={exportImage} disabled={exporting} title={both(S.export, lang)} aria-label={both(exporting ? S.exporting : S.export, lang)}>
            <Icon name="download" />
          </button>
          <button type="button" className="st-dock-btn st-adjust" onClick={() => setPanel(!panel)} aria-expanded={panel}>
            <Icon name="sliders" />
            <span className="st-dock-text">{one(S.adjust, lang)}</span>
          </button>
        </div>
      </div>

      <aside className="st-panel" aria-label={both(S.adjust, lang)}>
        <button type="button" className="st-icon-btn st-panel-close" aria-label={both(S.close, lang)} onClick={() => setPanel(false)}>
          <Icon name="x" />
        </button>
        <section className="st-dirhead">
          <div className="st-sec-head">
            <span className="dir-id">{d.id}</span>
            {board.recommendation.pick === d.id ? <L p={S.recommended} lang={lang} className="tag tag-accent" /> : null}
          </div>
          <h1 className="st-dir-title">
            <L p={d.name} lang={lang} />
          </h1>
          <L p={d.tagline} lang={lang} className="st-tagline" />
          <div className="st-palette" role="img" aria-label={d.palette.map((s) => `${one(s.name, lang)} ${s.hex}`).join(", ")}>
            {d.palette.map((s) => (
              <span key={s.hex} style={{ background: s.hex, flexGrow: s.share || 1 }} title={`${both(s.name, lang)} ${s.hex}`} />
            ))}
          </div>
          <div className="st-palette-keys" aria-hidden="true">
            {d.palette.map((s) => (
              <span key={s.hex}>
                <i style={{ background: s.hex }} />
                {one(s.name, lang)}
              </span>
            ))}
          </div>
        </section>

        <div className="st-tabs" role="tablist" aria-label={both(S.adjust, lang)}>
          {panelTabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              className={tab === t.id ? "st-tab is-active" : "st-tab"}
              onClick={() => {
                setTab(t.id);
                if (t.id === "check") setTimeout(() => engine.current?.refresh(), 0);
              }}
            >
              <L p={t.label} lang={lang} />
            </button>
          ))}
        </div>

        {tab === "pack" ? (
          <div className="st-tabpanel" role="tabpanel">
            <section className="st-sec">
              <L p={S.structure} lang={lang} className="st-label" />
              <div className="st-mats" role="tablist" aria-label={both(S.material, lang)}>
                {MATERIAL_GROUPS.map((g) => (
                  <button key={g.id} type="button" role="tab" aria-selected={matGroup === g.id} className={matGroup === g.id ? "st-mat is-active" : "st-mat"} onClick={() => setMatGroup(g.id)}>
                    {one(g.label, lang)}
                    {g.forms.includes(spec.form) ? <i aria-hidden="true" /> : null}
                  </button>
                ))}
              </div>
              <div className="st-forms" role="radiogroup" aria-label={both(group.label, lang)}>
                {group.forms.map((f) => (
                  <button key={f} type="button" role="radio" aria-checked={spec.form === f} className={spec.form === f ? "st-form is-active" : "st-form"} onClick={() => changeForm(f)}>
                    <FormGlyph form={f} />
                    <span>{one(FORM_LABELS[f], lang)}</span>
                  </button>
                ))}
              </div>
              <p className="st-note">{one(FORM_NOTES[spec.form], lang)}</p>
            </section>

            {isOuter(spec.form) ? (
              <section className="st-sec">
                <div className="st-sec-row">
                  <L p={S.combo} lang={lang} className="st-label" />
                  {spec.inner ? (
                    <button type="button" className="st-link" onClick={() => changeInner(null)}>
                      {one(S.none, lang)}
                    </button>
                  ) : null}
                </div>
                <L p={S.comboNote} lang={lang} className="st-small" />
                <div className="st-inner" role="radiogroup" aria-label={both(S.combo, lang)}>
                  {INNER_FORMS.map((f) => (
                    <button key={f} type="button" role="radio" aria-checked={spec.inner?.form === f} className={spec.inner?.form === f ? "st-innerbtn is-active" : "st-innerbtn"} onClick={() => changeInner(f)}>
                      <FormGlyph form={f} />
                      <span>{one(FORM_LABELS[f], lang)}</span>
                    </button>
                  ))}
                </div>
                {spec.inner ? (
                  <div className="st-combo-opts">
                    <div className="st-opt">
                      <span className="st-small">{one(S.count, lang)}</span>
                      <div className="st-seg">
                        {([1, 2] as const).map((n) => (
                          <button key={n} type="button" aria-pressed={spec.inner?.count === n} className={spec.inner?.count === n ? "is-active" : ""} onClick={() => spec.inner && setSpec({ ...spec, inner: { ...spec.inner, count: n } })}>
                            × {n}
                          </button>
                        ))}
                      </div>
                    </div>
                    {spec.form !== "carton" && spec.form !== "bag" ? (
                      <div className="st-opt">
                        <span className="st-small">{one(S.insert, lang)}</span>
                        <div className="st-seg st-seg-wrap">
                          {INSERTS.map((x) => {
                            const on = (spec.inner?.insert ?? (spec.form === "mailer" ? "pulp" : "velvet")) === x;
                            return (
                              <button key={x} type="button" aria-pressed={on} className={on ? "is-active" : ""} onClick={() => spec.inner && setSpec({ ...spec, inner: { ...spec.inner, insert: x } })}>
                                {one(INSERT_LABELS[x], lang)}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </section>
            ) : null}

            <section className="st-sec">
              <L p={spec.inner ? S.productSize : S.size} lang={lang} className="st-label" />
              <div className="st-dims">
                {(isRound(sizeForm) ? (["w", "h"] as const) : (["w", "h", "d"] as const)).map((k) => (
                  <label key={k} className="st-dim">
                    <span>{one(isRound(sizeForm) && k === "w" ? DIAMETER_LABEL : k === "d" && (sizeForm === "pouch" || sizeForm === "bag") ? GUSSET_LABEL : DIM_LABELS[k], lang)}</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={DIM_RANGE.min}
                      max={DIM_RANGE.max}
                      step={1}
                      value={sizeTarget[k]}
                      onChange={(e) => {
                        const v = Number(e.currentTarget.value);
                        if (!Number.isFinite(v)) return;
                        setSize(k, Math.max(DIM_RANGE.min, Math.min(DIM_RANGE.max, Math.round(v))));
                      }}
                    />
                    <em>mm</em>
                  </label>
                ))}
              </div>
              <p className="st-size">
                {spec.inner ? <span>{one(S.outerFitted, lang)}</span> : null}
                {formatSize(spec)}
              </p>
            </section>
          </div>
        ) : null}

        {tab === "look" ? (
          <div className="st-tabpanel" role="tabpanel">
            <section className="st-sec">
              <L p={S.finish} lang={lang} className="st-label" />
              <div className="st-finishes">
                {FINISHES.map((f) => (
                  <button key={f} type="button" className={spec.finish === f ? `st-finish st-finish-${f} is-active` : `st-finish st-finish-${f}`} aria-pressed={spec.finish === f} onClick={() => setSpec({ ...spec, finish: f })}>
                    <i aria-hidden="true" />
                    {one(FINISH_LABELS[f], lang)}
                  </button>
                ))}
              </div>
            </section>
            <section className="st-sec">
              <L p={S.backdrop} lang={lang} className="st-label" />
              <div className="st-finishes">
                {BACKDROPS.map((b) => (
                  <button key={b.id} type="button" className={backdrop === b.id ? `st-finish st-bd-${b.id} is-active` : `st-finish st-bd-${b.id}`} aria-pressed={backdrop === b.id} onClick={() => setBackdrop(b.id)}>
                    <i aria-hidden="true" />
                    {one(b.label, lang)}
                  </button>
                ))}
              </div>
            </section>
          </div>
        ) : null}

        {tab === "check" ? (
          <div className="st-tabpanel" role="tabpanel">
            <section className="st-sec">
              <L p={S.listing} lang={lang} className="st-label" />
              <div className="st-listing-body">
                <div className="lt-main">
                  <canvas ref={ltMain} width={264} height={264} aria-label={both(S.listing, lang)} />
                </div>
                <div className="lt-grid" aria-hidden="true">
                  <ListingTile />
                  <ListingTile mine>
                    <canvas ref={ltSmall} width={112} height={112} />
                  </ListingTile>
                  <ListingTile />
                  <ListingTile />
                </div>
              </div>
              <L p={S.listingNote} lang={lang} className="st-small" />
            </section>
            <section className="st-sec">
              <div className="st-sec-row">
                <L p={S.brief} lang={lang} className="st-label" />
                <CopyButton text={briefText} label={one(S.copy, lang)} done={one(S.copied, lang)} />
              </div>
              <L p={S.briefNote} lang={lang} className="st-small" />
              <pre className="st-brief">{lang === "en" ? brief.en : brief.zh}</pre>
            </section>
          </div>
        ) : null}

        {handoffHref ? (
          <div className="st-next">
            <span className="st-small">{one(S.nextLabel, lang)}</span>
            <a className="btn btn-primary" href={handoffHref}>
              <L p={S.handoff} lang={lang} />
            </a>
          </div>
        ) : null}
        {saveNote ? <p className={`st-save${saveState === "error" ? " is-error" : ""}`}>{both(saveNote, lang)}</p> : null}
        <p className="st-small st-disclaimer">{both(S.disclaimer, lang)}</p>
      </aside>
    </div>
  );
}
