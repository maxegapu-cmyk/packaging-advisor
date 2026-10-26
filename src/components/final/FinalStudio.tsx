"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { applyArtwork, labelFields, rolesOf, type Artwork, type Roles } from "@/lib/artwork";
import type { Board } from "@/lib/board/schema";
import type { Lang, Pair } from "@/lib/i18n";
import { FINISH_LABELS, FORM_LABELS, type PackSpec } from "@/lib/pack";
import { cmykText } from "@/lib/print/color";
import { checkEan13 } from "@/lib/print/ean13";
import { infoPanels, printLayout } from "@/lib/print/layout";
import { blocking, preflight, type Check } from "@/lib/print/preflight";
import { Bi } from "../Bi";
import { Package3D } from "../pack/Package3D";
import { Orbit, REST_ANGLE } from "../pack/orbit";
import { Stage3D } from "../pack/Stage3D";
import type { ArtInfo } from "../three/art";
import { drawSheetPreview } from "./render";

const T = {
  h: { zh: "出成品", en: "Final files" },
  sub: {
    zh: "把包装上的字、标签信息和条码定下来，下载可以直接交给印厂的印刷文件和电商主图。改动会自动保存，3D 和展开图同步更新。",
    en: "Settle the wording, label details and barcode, then download a print file your printer can work from and the listing images. Changes save themselves; the 3D and the flat sheet update as you type.",
  },
  secDir: { zh: "方向与颜色", en: "Direction and colors" },
  secFront: { zh: "正面", en: "Front" },
  secBack: { zh: "标签信息", en: "Label information" },
  secBackHint: {
    zh: "按品类列出常见的必标项，印在背面（或盒底）。法规会更新，以现行规定为准。",
    en: "The usual mandatory items for this category, printed on the back (or base). Rules change; the current regulations decide.",
  },
  secCode: { zh: "商品条码", en: "Barcode" },
  brand: { zh: "品牌", en: "Brand" },
  headline: { zh: "品名", en: "Product name" },
  detail: { zh: "第二行", en: "Second line" },
  detailHint: { zh: "品种、规格或一句短语", en: "Variety, size or a short phrase" },
  net: { zh: "净含量", en: "Net content" },
  netHint: { zh: "例如：净含量 100克", en: "e.g. 净含量 100克" },
  logo: { zh: "品牌标志", en: "Logo" },
  logoHint: { zh: "PNG（透明底最好）、JPG 或 SVG。没有标志就用品牌名排字。", en: "PNG (transparent is best), JPG or SVG. Without one, the brand name is typeset." },
  logoAdd: { zh: "上传标志", en: "Upload logo" },
  logoRemove: { zh: "移除", en: "Remove" },
  intro: { zh: "背面介绍", en: "Back paragraph" },
  barcode: { zh: "13 位商品条码", en: "13-digit barcode" },
  barcodeHint: { zh: "在中国物品编码中心注册取得。没有就先空着，文件里不会印假条码。", en: "Registered with GS1 China. Leave it empty if you don't have one; the file never prints a made-up code." },
  barcodeOk: { zh: "号码有效", en: "Valid number" },
  barcodeCheck: { zh: "校验位应为 {n}", en: "The check digit should be {n}" },
  barcodeFormat: { zh: "应为 13 位数字", en: "Should be 13 digits" },
  roles: { ground: { zh: "底色", en: "Ground" }, ink: { zh: "文字", en: "Text" }, key: { zh: "主色", en: "Brand" }, accent: { zh: "点缀", en: "Accent" } } as Record<keyof Roles, Pair>,
  reset: { zh: "恢复方向原色", en: "Reset to the direction's colors" },
  tab3d: { zh: "3D", en: "3D" },
  tabSheet: { zh: "印刷展开图", en: "Print sheet" },
  open: { zh: "打开", en: "Open" },
  close: { zh: "合上", en: "Close" },
  checks: { zh: "印前检查", en: "Pre-press checks" },
  dl: { zh: "下载", en: "Download" },
  pdf: { zh: "印刷文件 PDF", en: "Print file (PDF)" },
  pdfDesc: { zh: "1:1 刀模与展开图、3 mm 出血、裁切与压痕专色、印刷工单", en: "1:1 dielines and artwork, 3 mm bleed, cut and crease spot colors, job sheet" },
  pdfAnyway: { zh: "有 {n} 项需要修改，仍然下载", en: "{n} issue(s) to fix; download anyway" },
  images: { zh: "电商图片 ZIP", en: "Listing images (ZIP)" },
  imagesDesc: { zh: "白底主图、正背面、打开、细节、尺寸图、品牌色背景，1600 × 1600", en: "White main image, front, back, opened, close-up, dimensions, brand background; 1600 × 1600" },
  working: { zh: "正在生成…", en: "Working…" },
  saved: { zh: "已保存", en: "Saved" },
  saving: { zh: "保存中…", en: "Saving…" },
  saveFailed: { zh: "没能保存，请检查网络", en: "Couldn't save; check your connection" },
  designer: { zh: "还想请设计师再看一遍？", en: "Want a designer to look it over?" },
  designerLink: { zh: "分享方案板给设计师", en: "Share the board with a designer" },
  space: { zh: "改盒型或尺寸", en: "Change the form or size" },
  pack: { zh: "包装", en: "Package" },
  sheetOf: { zh: "部件", en: "Part" },
  shots: { zh: "生成的图片", en: "Images made" },
};

const one = (p: Pair, lang: Lang) => (lang === "en" ? p.en : p.zh);
const fmt = (p: Pair, lang: Lang, n: number | string) => one(p, lang).replace("{n}", String(n));

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

const safeName = (s: string) => s.replace(/[\\/:*?"<>|]+/g, " ").trim().slice(0, 40) || "package";

/** Loads an image for drawing on canvases (null while loading or when there is none). */
function useImage(src: string | null): HTMLImageElement | null {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    if (!src) return setImg(null);
    let alive = true;
    const im = new Image();
    im.onload = () => alive && setImg(im);
    im.onerror = () => alive && setImg(null);
    im.src = src;
    return () => {
      alive = false;
    };
  }, [src]);
  return img;
}

/** The label content for the 3D and the print file, from the artwork. */
export function artInfoOf(a: Artwork, spec: PackSpec, logo: CanvasImageSource | null): ArtInfo {
  const ip = infoPanels(printLayout(spec)).find((x) => !x.sheet.id.startsWith("inner-"));
  const bc = checkEan13(a.barcode);
  const rows = a.rows.filter((r) => r.value.trim()).map((r) => ({ label: r.label, value: r.value }));
  return {
    intro: a.intro,
    rows,
    barcode: bc.ok ? bc.digits : "",
    net: a.net,
    logo,
    on: ip?.panel.kind ?? null,
    key: JSON.stringify([a.intro, rows, bc.ok ? bc.digits : "", a.net, a.logoId, logo ? 1 : 0]),
  };
}

function Field({ label, hint, children, req }: { label: string; hint?: string; children: React.ReactNode; req?: boolean }) {
  return (
    <label className="ff">
      <span className="ff-label">
        {label}
        {req ? <span className="ff-req">*</span> : null}
      </span>
      {children}
      {hint ? <span className="ff-hint">{hint}</span> : null}
    </label>
  );
}

const MARK: Record<Check["level"], string> = { error: "✕", warn: "!", ok: "✓", info: "i" };

export function FinalStudio({
  board,
  pack,
  initial,
  lang,
  saveUrl,
  logoUrl,
  exportUrl,
  boardHref,
  spaceHref,
  fileStem,
  logoSrc: logoSrcFor = (id) => `/api/uploads/${id}`,
}: {
  board: Board;
  pack: PackSpec;
  initial: Artwork;
  lang: Lang;
  saveUrl?: string;
  logoUrl?: string;
  exportUrl?: string;
  boardHref?: string;
  spaceHref?: string;
  fileStem: string;
  logoSrc?: (id: string) => string;
}) {
  const [art, setArt] = useState<Artwork>(initial);
  const [save, setSave] = useState<"idle" | "saving" | "saved" | "failed">("idle");
  const [tab, setTab] = useState<"3d" | "sheet">("3d");
  const [open, setOpen] = useState(false);
  const [sheetIx, setSheetIx] = useState(0);
  const [busy, setBusy] = useState<null | "pdf" | "images">(null);
  const [progress, setProgress] = useState(0);
  const [shots, setShots] = useState<{ name: string; url: string; label: Pair }[]>([]);
  const [localLogo, setLocalLogo] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [orbit] = useState(() => new Orbit(REST_ANGLE, 1, { free: true }));
  const first = useRef(true);

  const base = board.directions.find((d) => d.id === art.dir) ?? board.directions[0];
  const d = useMemo(() => applyArtwork(base, art), [base, art]);
  const logoSrc = art.logoId ? (localLogo[art.logoId] ?? logoSrcFor(art.logoId)) : null;
  const logo = useImage(logoSrc);
  const info = useMemo(() => artInfoOf(art, pack, logo), [art, pack, logo]);
  const layout = useMemo(() => printLayout(pack), [pack]);
  const checks = useMemo(() => preflight(art, board, pack), [art, board, pack]);
  const errors = blocking(checks).length;
  const fields = useMemo(() => labelFields(board.meta.category), [board.meta.category]);
  const bc = checkEan13(art.barcode);
  const artInput = useMemo(() => ({ d, brand: art.brand, finish: pack.finish, info }), [d, art.brand, pack.finish, info]);

  // autosave
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (!saveUrl) return;
    setSave("saving");
    const t = setTimeout(() => {
      fetch(saveUrl, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(art) })
        .then((r) => setSave(r.ok ? "saved" : "failed"))
        .catch(() => setSave("failed"));
    }, 700);
    return () => clearTimeout(t);
  }, [art, saveUrl]);

  // flat sheet preview
  const sheetHost = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (tab !== "sheet") return;
    const host = sheetHost.current;
    const sheet = layout.sheets[Math.min(sheetIx, layout.sheets.length - 1)];
    if (!host || !sheet) return;
    const t = setTimeout(() => {
      const w = host.clientWidth || 600;
      const k = Math.min(4, (w * Math.min(2, window.devicePixelRatio || 1)) / sheet.w);
      const c = drawSheetPreview(sheet, artInput, { pxPerMm: k });
      c.className = "final-sheet-canvas";
      c.setAttribute("role", "img");
      c.setAttribute("aria-label", `${one(sheet.name, lang)} ${Math.round(sheet.w)} × ${Math.round(sheet.h)} mm`);
      host.replaceChildren(c);
    }, 250);
    return () => clearTimeout(t);
  }, [tab, sheetIx, layout, artInput, lang]);

  const set = (patch: Partial<Artwork>) => setArt((a) => ({ ...a, ...patch }));
  const setRow = (key: string, label: string, value: string) =>
    setArt((a) => {
      const has = a.rows.some((r) => r.key === key);
      return { ...a, rows: has ? a.rows.map((r) => (r.key === key ? { ...r, value } : r)) : [...a.rows, { key, label, value }] };
    });
  const pickDir = (id: string) => {
    const nd = board.directions.find((x) => x.id === id);
    if (!nd) return;
    set({ dir: id, palette: rolesOf(nd), headline: nd.mockup.headline, detail: nd.mockup.detail });
  };

  async function onLogo(file: File) {
    setError(null);
    if (logoUrl) {
      const fd = new FormData();
      fd.append("logo", file);
      const r = await fetch(logoUrl, { method: "POST", body: fd }).catch(() => null);
      const j = r ? await r.json().catch(() => null) : null;
      if (!r?.ok || !j?.id) return setError(j?.error ?? one(T.saveFailed, lang));
      set({ logoId: j.id });
    } else {
      const id = `local${Date.now().toString(36)}`;
      setLocalLogo((m) => ({ ...m, [id]: URL.createObjectURL(file) }));
      set({ logoId: id });
    }
  }

  async function onPdf() {
    setBusy("pdf");
    setProgress(0);
    setError(null);
    try {
      const { buildPrintPdf } = await import("./printPdf");
      const bytes = await buildPrintPdf({ layout, art: artInput, artwork: art, board, spec: pack, checks, lang, onProgress: (n, t) => setProgress(n / t) });
      download(new Blob([bytes as BlobPart], { type: "application/pdf" }), `${safeName(fileStem)}-印刷文件-print.pdf`);
      if (exportUrl) fetch(exportUrl, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind: "pdf", errors }) }).catch(() => {});
    } catch (e) {
      setError(String((e as Error).message || e));
    } finally {
      setBusy(null);
    }
  }

  async function onImages() {
    setBusy("images");
    setProgress(0);
    setError(null);
    try {
      const { renderShots, zipShots } = await import("./mainImages");
      const files = await renderShots({ d, brand: art.brand, spec: pack, category: board.meta.category, info, lang, onProgress: (n, t) => setProgress(n / t) });
      shots.forEach((s) => URL.revokeObjectURL(s.url));
      setShots(files.map((f) => ({ name: f.name, url: URL.createObjectURL(f.blob), label: f.label })));
      const readme = [
        `${art.brand} ${art.headline}`.trim(),
        "电商图片 Listing images, 1600 × 1600 px PNG.",
        ...files.map((f) => `${f.name}  ${f.label.zh} ${f.label.en}`),
        "",
        "由包装视觉顾问从 3D 渲染生成。Rendered from the 3D by Packaging Advisor.",
      ].join("\n");
      download(await zipShots(files, readme), `${safeName(fileStem)}-电商图片-images.zip`);
      if (exportUrl) fetch(exportUrl, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind: "images" }) }).catch(() => {});
    } catch (e) {
      setError(String((e as Error).message || e));
    } finally {
      setBusy(null);
    }
  }

  const sheet = layout.sheets[Math.min(sheetIx, layout.sheets.length - 1)];
  const roles = art.palette;
  const dirRoles = rolesOf(base);
  const rowVal = (k: string) => art.rows.find((r) => r.key === k)?.value ?? "";
  const extraRows = art.rows.filter((r) => !fields.some((f) => f.key === r.key));

  return (
    <div className="final">
      <header className="final-head">
        <div>
          <Bi p={T.h} lang={lang} as="h1" />
          <Bi p={T.sub} lang={lang} as="p" className="final-sub" />
        </div>
        <p className={`final-save is-${save}`} role="status" aria-live="polite">
          {save === "saving" ? one(T.saving, lang) : save === "saved" ? one(T.saved, lang) : save === "failed" ? one(T.saveFailed, lang) : ""}
        </p>
      </header>

      <div className="final-grid">
        <form className="final-form" onSubmit={(e) => e.preventDefault()}>
          <section className="final-sec">
            <Bi p={T.secDir} lang={lang} as="h2" className="final-h" />
            <div className="final-dirs" role="radiogroup" aria-label={one(T.secDir, lang)}>
              {board.directions.map((x) => (
                <button key={x.id} type="button" role="radio" aria-checked={x.id === art.dir} className={x.id === art.dir ? "final-dir is-on" : "final-dir"} onClick={() => pickDir(x.id)}>
                  <span className="final-dir-chips" aria-hidden="true">
                    {x.palette.slice(0, 4).map((s, i) => (
                      <i key={i} style={{ background: s.hex }} />
                    ))}
                  </span>
                  <span className="dir-id">{x.id}</span>
                  <span>{one(x.name, lang)}</span>
                </button>
              ))}
            </div>
            <div className="final-colors">
              {(Object.keys(T.roles) as (keyof Roles)[]).map((k) => (
                <label key={k} className="final-color">
                  <input type="color" value={roles[k]} onChange={(e) => set({ palette: { ...roles, [k]: e.target.value.toUpperCase() } })} aria-label={one(T.roles[k], lang)} />
                  <span>
                    <strong>{one(T.roles[k], lang)}</strong>
                    <small>
                      {roles[k]} · {cmykText(roles[k])}
                    </small>
                  </span>
                </label>
              ))}
            </div>
            {JSON.stringify(roles) !== JSON.stringify(dirRoles) ? (
              <button type="button" className="btn btn-small btn-quiet" onClick={() => set({ palette: dirRoles })}>
                {one(T.reset, lang)}
              </button>
            ) : null}
          </section>

          <section className="final-sec">
            <Bi p={T.secFront} lang={lang} as="h2" className="final-h" />
            <div className="final-row">
              <Field label={one(T.brand, lang)}>
                <input type="text" value={art.brand} maxLength={30} onChange={(e) => set({ brand: e.target.value })} />
              </Field>
              <Field label={one(T.headline, lang)} req>
                <input type="text" value={art.headline} maxLength={30} onChange={(e) => set({ headline: e.target.value })} />
              </Field>
            </div>
            <div className="final-row">
              <Field label={one(T.detail, lang)} hint={one(T.detailHint, lang)}>
                <input type="text" value={art.detail} maxLength={40} onChange={(e) => set({ detail: e.target.value })} />
              </Field>
              <Field label={one(T.net, lang)} hint={one(T.netHint, lang)}>
                <input type="text" value={art.net} maxLength={30} onChange={(e) => set({ net: e.target.value })} />
              </Field>
            </div>
            <div className="final-logo">
              <span className="ff-label">{one(T.logo, lang)}</span>
              <div className="final-logo-row">
                {logoSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoSrc} alt="" className="final-logo-img" style={{ background: roles.ground }} />
                ) : null}
                <label className="btn btn-small">
                  {one(T.logoAdd, lang)}
                  <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="sr-only" onChange={(e) => (e.target.files?.[0] ? onLogo(e.target.files[0]) : null, (e.target.value = ""))} />
                </label>
                {art.logoId ? (
                  <button type="button" className="btn btn-small btn-quiet" onClick={() => set({ logoId: null })}>
                    {one(T.logoRemove, lang)}
                  </button>
                ) : null}
              </div>
              <span className="ff-hint">{one(T.logoHint, lang)}</span>
            </div>
          </section>

          <section className="final-sec">
            <Bi p={T.secBack} lang={lang} as="h2" className="final-h" />
            <Bi p={T.secBackHint} lang={lang} as="p" className="final-hint" />
            <Field label={one(T.intro, lang)}>
              <textarea value={art.intro} maxLength={300} className="short" onChange={(e) => set({ intro: e.target.value })} />
            </Field>
            {fields.map((f) => (
              <Field key={f.key} label={one(f.label, lang)} hint={one(f.hint, lang) || undefined} req={f.required}>
                {f.long ? (
                  <textarea value={rowVal(f.key)} maxLength={400} className="short" onChange={(e) => setRow(f.key, f.label.zh, e.target.value)} />
                ) : (
                  <input type="text" value={rowVal(f.key)} maxLength={400} onChange={(e) => setRow(f.key, f.label.zh, e.target.value)} />
                )}
              </Field>
            ))}
            {extraRows.map((r) => (
              <Field key={r.key} label={r.label}>
                <input type="text" value={r.value} maxLength={400} onChange={(e) => setRow(r.key, r.label, e.target.value)} />
              </Field>
            ))}
          </section>

          <section className="final-sec">
            <Bi p={T.secCode} lang={lang} as="h2" className="final-h" />
            <Field label={one(T.barcode, lang)} hint={one(T.barcodeHint, lang)}>
              <input type="text" inputMode="numeric" autoComplete="off" value={art.barcode} maxLength={13} onChange={(e) => set({ barcode: e.target.value.replace(/\D/g, "").slice(0, 13) })} aria-invalid={!bc.ok && bc.reason !== "empty"} />
            </Field>
            {art.barcode ? (
              <p className={bc.ok ? "final-code is-ok" : "final-code is-bad"} role="status">
                {bc.ok ? one(T.barcodeOk, lang) : bc.reason === "check" ? fmt(T.barcodeCheck, lang, bc.expected ?? "?") : one(T.barcodeFormat, lang)}
              </p>
            ) : null}
          </section>
        </form>

        <aside className="final-side">
          <div className="final-preview">
            <div className="final-tabs" role="tablist">
              <button type="button" role="tab" aria-selected={tab === "3d"} className={tab === "3d" ? "is-on" : ""} onClick={() => setTab("3d")}>
                {one(T.tab3d, lang)}
              </button>
              <button type="button" role="tab" aria-selected={tab === "sheet"} className={tab === "sheet" ? "is-on" : ""} onClick={() => setTab("sheet")}>
                {one(T.tabSheet, lang)}
              </button>
              <span className="final-pack">
                {one(FORM_LABELS[pack.form], lang)} · {pack.w}×{pack.h}×{pack.d} mm · {one(FINISH_LABELS[pack.finish], lang)}
              </span>
            </div>
            {tab === "3d" ? (
              <div className="final-stage">
                <Stage3D orbit={orbit} label={`${art.brand} ${art.headline}`} className="final-stage-3d" inPage>
                  <Package3D d={d} brand={art.brand} spec={pack} fit={400} open={open} orbit={orbit} category={board.meta.category} info={info} quality="high" />
                </Stage3D>
                <div className="final-stage-bar">
                  <button type="button" className="btn btn-small" onClick={() => setOpen(!open)}>
                    {one(open ? T.close : T.open, lang)}
                  </button>
                  <button type="button" className="btn btn-small btn-quiet" onClick={() => orbit.tween({ x: -6, y: 180 }, 900)}>
                    {lang === "en" ? "Back" : "看背面"}
                  </button>
                  <button type="button" className="btn btn-small btn-quiet" onClick={() => orbit.tween(REST_ANGLE, 900)}>
                    {lang === "en" ? "Front" : "看正面"}
                  </button>
                  {spaceHref ? (
                    <a className="btn btn-small btn-quiet" href={spaceHref}>
                      {one(T.space, lang)}
                    </a>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="final-sheet">
                {layout.sheets.length > 1 ? (
                  <div className="final-sheet-tabs">
                    {layout.sheets.map((s, i) => (
                      <button key={s.id} type="button" className={i === sheetIx ? "is-on" : ""} onClick={() => setSheetIx(i)}>
                        {one(s.name, lang)}
                        {s.qty > 1 ? ` ×${s.qty}` : ""}
                      </button>
                    ))}
                  </div>
                ) : null}
                <div className="final-sheet-host" ref={sheetHost} />
                {sheet ? (
                  <p className="final-sheet-meta">
                    {one(sheet.name, lang)} · {Math.round(sheet.w)} × {Math.round(sheet.h)} mm · {one(sheet.material, lang)}
                    <span className="final-legend">
                      <i className="lg-cut" /> {lang === "en" ? "cut" : "裁切"} <i className="lg-fold" /> {lang === "en" ? "crease" : "压痕"}
                    </span>
                  </p>
                ) : null}
              </div>
            )}
          </div>

          <div className="final-checks">
            <Bi p={T.checks} lang={lang} as="h2" className="final-h" />
            <ul>
              {checks.map((c) => (
                <li key={c.id} className={`ck is-${c.level}`}>
                  <span className="ck-mark" aria-hidden="true">
                    {MARK[c.level]}
                  </span>
                  <span>
                    <strong>{one(c.title, lang)}</strong>
                    {c.detail.zh ? <small>{one(c.detail, lang)}</small> : null}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="final-export">
            <button type="button" className="final-dl" onClick={onPdf} disabled={!!busy}>
              <span className="final-dl-k">PDF</span>
              <span className="final-dl-t">
                <strong>{busy === "pdf" ? `${one(T.working, lang)} ${Math.round(progress * 100)}%` : errors ? fmt(T.pdfAnyway, lang, errors) : `${one(T.dl, lang)} ${one(T.pdf, lang)}`}</strong>
                <small>{one(T.pdfDesc, lang)}</small>
              </span>
            </button>
            <button type="button" className="final-dl" onClick={onImages} disabled={!!busy}>
              <span className="final-dl-k">ZIP</span>
              <span className="final-dl-t">
                <strong>{busy === "images" ? `${one(T.working, lang)} ${Math.round(progress * 100)}%` : `${one(T.dl, lang)} ${one(T.images, lang)}`}</strong>
                <small>{one(T.imagesDesc, lang)}</small>
              </span>
            </button>
            {error ? (
              <p className="notice notice-error" role="alert">
                {error}
              </p>
            ) : null}
            {shots.length ? (
              <div className="final-shots" aria-label={one(T.shots, lang)}>
                {shots.map((s) => (
                  <figure key={s.name}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={s.url} alt={one(s.label, lang)} />
                    <figcaption>{one(s.label, lang)}</figcaption>
                  </figure>
                ))}
              </div>
            ) : null}
            {boardHref ? (
              <p className="final-designer">
                {one(T.designer, lang)} <a href={boardHref}>{one(T.designerLink, lang)}</a>
              </p>
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  );
}
