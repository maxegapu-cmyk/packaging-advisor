"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Artwork, Proof, Roles } from "@/lib/artwork";
import type { Lang, Pair } from "@/lib/i18n";
import { ROUND_FORMS, type PackSpec } from "@/lib/pack";
import { deltaE } from "@/lib/print/color";
import { artSize, printLayout, WRAP_FRONT, type Panel } from "@/lib/print/layout";
import { drawFace, handTextOf, type ArtInput } from "../three/art";
import { useInscription } from "../useInscription";

const T = {
  intro: {
    zh: "拿到印厂的打样后，在这里和设计逐项对照：正面照片叠在印刷图案上看对不对齐，量外尺寸，取色比色差。确认之后，渲染图和电商图片才算与实物一致。",
    en: "When the printer's sample arrives, check it here against the design: overlay a front photo on the print artwork, measure the outside size, and pick colors to compare. Only once you confirm are the renders and listing images true to the product.",
  },
  photo: { zh: "正面照片", en: "Front photo" },
  photoHint: { zh: "白天自然光、正对正面拍，不加滤镜。", en: "Daylight, straight at the front, no filters." },
  upload: { zh: "上传实物照片", en: "Upload a photo" },
  replace: { zh: "换一张", en: "Replace" },
  opacity: { zh: "照片透明度", en: "Photo opacity" },
  scale: { zh: "缩放", en: "Scale" },
  x: { zh: "左右", en: "Left–right" },
  y: { zh: "上下", en: "Up–down" },
  rot: { zh: "旋转", en: "Rotate" },
  diff: { zh: "差异模式", en: "Difference" },
  diffHint: { zh: "对齐后，一致的地方变黑，不一致的地方会亮起来。", en: "Once aligned, matching areas go black and differences light up." },
  measure: { zh: "实测外尺寸（mm）", en: "Measured outside size (mm)" },
  measureHint: { zh: "用尺子量成品外尺寸，误差 1 mm 以内算一致。", en: "Measure the finished outside size with a ruler; within 1 mm counts as matching." },
  colors: { zh: "取色比对", en: "Color check" },
  colorsHint: { zh: "点「取色」，再点照片上对应的颜色区域。", en: "Press Pick, then click that color on the photo." },
  pick: { zh: "取色", en: "Pick" },
  picking: { zh: "点照片取色…", en: "Click the photo…" },
  useSample: { zh: "3D 和电商图片按实物取色显示（印刷文件仍用设计色）", en: "Show the 3D and listing images in the sample's measured colors (the print file keeps the design colors)" },
  confirm: { zh: "我已对照实物样品：尺寸、颜色、图案和工艺与渲染一致", en: "I've checked the printed sample: size, color, artwork and finish match the render" },
  blocked: { zh: "尺寸或颜色还有明显偏差，先处理后再确认。", en: "Size or color is still clearly off; fix it before confirming." },
  roles: { ground: { zh: "底色", en: "Ground" }, ink: { zh: "文字", en: "Text" }, key: { zh: "主色", en: "Brand" }, accent: { zh: "点缀", en: "Accent" } } as Record<keyof Roles, Pair>,
};

const one = (p: Pair, lang: Lang) => (lang === "en" ? p.en : p.zh);

/** The outer package's front panel, as drawn for print (the wrap's front section for round forms). */
function frontPanel(spec: PackSpec): Panel | null {
  const sheets = printLayout(spec).sheets.filter((s) => !s.id.startsWith("inner-"));
  for (const s of sheets) for (const pc of s.pieces) for (const p of pc.panels) if (p.kind === "front" || p.kind === "tinWrap") return p;
  return null;
}

export function ProofMatch({ art, spec, input, lang, setProof, uploadPhoto, photoSrc }: { art: Artwork; spec: PackSpec; input: ArtInput; lang: Lang; setProof: (p: Proof) => void; uploadPhoto: (f: File) => Promise<string | null>; photoSrc: string | null }) {
  const pf = art.proof;
  const [opacity, setOpacity] = useState(55);
  const [scale, setScale] = useState(100);
  const [dx, setDx] = useState(0);
  const [dy, setDy] = useState(0);
  const [rot, setRot] = useState(0);
  const [diff, setDiff] = useState(false);
  const [picking, setPicking] = useState<keyof Roles | null>(null);
  const [photo, setPhoto] = useState<HTMLImageElement | null>(null);
  const cv = useRef<HTMLCanvasElement>(null);
  const round = ROUND_FORMS.includes(spec.form);

  useEffect(() => {
    if (!photoSrc) return setPhoto(null);
    const im = new Image();
    im.onload = () => setPhoto(im);
    im.src = photoSrc;
  }, [photoSrc]);

  // the front artwork exactly as it will print (wraps: the front 30%), redrawn when the
  // inscription hand arrives
  const hand = useInscription(handTextOf(input.d, input.brand, spec.form));
  const front = useMemo(() => {
    const p = frontPanel(spec);
    if (!p) return null;
    const s = artSize(p);
    const ppm = Math.min(6, 900 / Math.max(s.w, s.h));
    const c = drawFace(p.kind, s.w, s.h, ppm, input, { arc: p.arc }).color;
    if (p.kind !== "tinWrap") return { c, w: s.w, h: s.h };
    const fw = c.width * WRAP_FRONT;
    const out = document.createElement("canvas");
    out.width = Math.round(fw);
    out.height = c.height;
    out.getContext("2d")!.drawImage(c, (c.width - fw) / 2, 0, fw, c.height, 0, 0, fw, c.height);
    return { c: out, w: s.w * WRAP_FRONT, h: s.h };
  }, [spec, input, hand]);

  useEffect(() => {
    const el = cv.current;
    if (!el || !front) return;
    const W = 720;
    const H = Math.round((W * front.h) / front.w);
    el.width = W;
    el.height = H;
    const g = el.getContext("2d")!;
    g.clearRect(0, 0, W, H);
    g.drawImage(front.c, 0, 0, W, H);
    if (photo) {
      g.save();
      g.globalAlpha = diff ? 1 : opacity / 100;
      if (diff) g.globalCompositeOperation = "difference";
      g.translate(W / 2 + (dx / 100) * W, H / 2 + (dy / 100) * H);
      g.rotate((rot * Math.PI) / 180);
      const k = (scale / 100) * Math.min(W / photo.naturalWidth, H / photo.naturalHeight);
      g.drawImage(photo, (-photo.naturalWidth * k) / 2, (-photo.naturalHeight * k) / 2, photo.naturalWidth * k, photo.naturalHeight * k);
      g.restore();
    }
  }, [front, photo, opacity, scale, dx, dy, rot, diff]);

  /** Average color of the photo around a click, read from the photo alone (not the overlay). */
  function sample(e: { clientX: number; clientY: number }) {
    if (!picking || !photo || !cv.current) return;
    const el = cv.current;
    const r = el.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * el.width;
    const y = ((e.clientY - r.top) / r.height) * el.height;
    const tmp = document.createElement("canvas");
    tmp.width = el.width;
    tmp.height = el.height;
    const g = tmp.getContext("2d", { willReadFrequently: true })!;
    g.translate(el.width / 2 + (dx / 100) * el.width, el.height / 2 + (dy / 100) * el.height);
    g.rotate((rot * Math.PI) / 180);
    const k = (scale / 100) * Math.min(el.width / photo.naturalWidth, el.height / photo.naturalHeight);
    g.drawImage(photo, (-photo.naturalWidth * k) / 2, (-photo.naturalHeight * k) / 2, photo.naturalWidth * k, photo.naturalHeight * k);
    const d = g.getImageData(Math.max(0, Math.round(x) - 4), Math.max(0, Math.round(y) - 4), 9, 9).data;
    let rr = 0;
    let gg = 0;
    let bb = 0;
    let n = 0;
    for (let i = 0; i < d.length; i += 4)
      if (d[i + 3] > 200) {
        rr += d[i];
        gg += d[i + 1];
        bb += d[i + 2];
        n++;
      }
    if (!n) return;
    const hex = `#${[rr, gg, bb].map((v) => Math.round(v / n).toString(16).padStart(2, "0")).join("")}`.toUpperCase();
    setProof({ ...pf, colors: { ...pf.colors, [picking]: hex }, confirmed: false, at: null });
    setPicking(null);
  }

  const dims: ("w" | "h" | "d")[] = round ? ["w", "h"] : ["w", "h", "d"];
  const off = dims.some((k) => pf[k] !== null && Math.abs((pf[k] as number) - spec[k]) > 1);
  const worst = Math.max(0, ...(Object.keys(pf.colors) as (keyof Roles)[]).map((k) => deltaE(art.palette[k], pf.colors[k]!)));
  const blocked = off || worst > 10;
  const label = (k: "w" | "h" | "d") => (k === "w" ? (round ? "Ø" : lang === "en" ? "W" : "宽") : k === "h" ? (lang === "en" ? "H" : "高") : lang === "en" ? "D" : "深");

  return (
    <div className="proof fade-in">
      <p className="proof-intro">{one(T.intro, lang)}</p>
      <div className="proof-stage">
        <canvas ref={cv} className={picking ? "proof-canvas is-picking" : "proof-canvas"} onClick={sample} role="img" aria-label={one(T.photo, lang)} />
        {!photo ? <p className="proof-empty">{one(T.photoHint, lang)}</p> : null}
      </div>
      <div className="proof-row">
        <label className="btn btn-small">
          {one(photo ? T.replace : T.upload, lang)}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic"
            className="sr-only"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f) return;
              const id = await uploadPhoto(f);
              if (id) setProof({ ...pf, photoId: id, confirmed: false, at: null });
            }}
          />
        </label>
        {photo ? (
          <label className="proof-toggle">
            <input type="checkbox" checked={diff} onChange={(e) => setDiff(e.target.checked)} /> {one(T.diff, lang)}
          </label>
        ) : null}
      </div>
      {photo ? (
        <div className="proof-sliders">
          {(
            [
              [T.opacity, opacity, setOpacity, 0, 100],
              [T.scale, scale, setScale, 40, 250],
              [T.x, dx, setDx, -50, 50],
              [T.y, dy, setDy, -50, 50],
              [T.rot, rot, setRot, -15, 15],
            ] as [Pair, number, (v: number) => void, number, number][]
          ).map(([l, v, set, min, max], i) => (
            <label key={i} className="proof-slider">
              <span>{one(l, lang)}</span>
              <input type="range" min={min} max={max} step={i === 4 ? 0.5 : 1} value={v} onChange={(e) => set(Number(e.target.value))} disabled={diff && i === 0} />
            </label>
          ))}
          {diff ? <small className="ff-hint">{one(T.diffHint, lang)}</small> : null}
        </div>
      ) : null}

      <div className="proof-block">
        <span className="ff-label">{one(T.measure, lang)}</span>
        <div className="proof-dims">
          {dims.map((k) => (
            <label key={k} className={pf[k] !== null && Math.abs((pf[k] as number) - spec[k]) > 1 ? "proof-dim is-off" : "proof-dim"}>
              <span>
                {label(k)} <small>{spec[k]}</small>
              </span>
              <input
                type="number"
                inputMode="decimal"
                step="0.5"
                min="1"
                value={pf[k] ?? ""}
                onChange={(e) => setProof({ ...pf, [k]: e.target.value === "" ? null : Number(e.target.value), confirmed: false, at: null })}
                aria-label={`${label(k)} mm`}
              />
            </label>
          ))}
        </div>
        <span className="ff-hint">{one(T.measureHint, lang)}</span>
      </div>

      <div className="proof-block">
        <span className="ff-label">{one(T.colors, lang)}</span>
        <div className="proof-colors">
          {(Object.keys(T.roles) as (keyof Roles)[]).map((k) => {
            const got = pf.colors[k];
            const de = got ? deltaE(art.palette[k], got) : null;
            return (
              <div key={k} className="proof-color">
                <span className="proof-pair">
                  <i style={{ background: art.palette[k] }} title={art.palette[k]} />
                  <i style={{ background: got ?? "transparent" }} title={got ?? ""} className={got ? "" : "is-empty"} />
                </span>
                <span className="proof-color-t">
                  <strong>{one(T.roles[k], lang)}</strong>
                  <small className={de === null ? "" : de > 10 ? "is-bad" : de > 5 ? "is-warn" : "is-ok"}>{de === null ? "—" : `ΔE ${de.toFixed(1)}`}</small>
                </span>
                <button type="button" className={picking === k ? "btn btn-small btn-primary" : "btn btn-small"} disabled={!photo} onClick={() => setPicking(picking === k ? null : k)}>
                  {one(picking === k ? T.picking : T.pick, lang)}
                </button>
              </div>
            );
          })}
        </div>
        <span className="ff-hint">{one(T.colorsHint, lang)}</span>
        {Object.keys(pf.colors).length ? (
          <label className="proof-toggle">
            <input type="checkbox" checked={pf.useSample} onChange={(e) => setProof({ ...pf, useSample: e.target.checked })} /> {one(T.useSample, lang)}
          </label>
        ) : null}
      </div>

      <label className={blocked ? "proof-confirm is-blocked" : "proof-confirm"}>
        <input type="checkbox" checked={pf.confirmed} disabled={blocked && !pf.confirmed} onChange={(e) => setProof({ ...pf, confirmed: e.target.checked, at: e.target.checked ? new Date().toISOString().slice(0, 10) : null })} />
        <span>{one(T.confirm, lang)}</span>
      </label>
      {blocked ? <p className="ff-hint proof-blocked">{one(T.blocked, lang)}</p> : null}
    </div>
  );
}
