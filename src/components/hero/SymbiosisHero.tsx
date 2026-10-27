"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Lang, Pair } from "@/lib/i18n";
import type { Sample } from "@/lib/samples";
import { reducedMotion } from "../pack/orbit";
import { useTheme } from "@/lib/theme";
import { Bi } from "../Bi";
import { SegPill } from "../SegPill";
import type { FrameInfo, HeroItem, OverlayFrame, SymbiosisScene } from "./symbiosis";
import type { FormsFrame, FormsScene } from "./forms/film";
import { FILM, ITEM_SECONDS, PHASES, phaseOf, sizeText } from "./forms/items";

const STAGES: Pair[] = [
  { zh: "印刷", en: "Print" },
  { zh: "裁切", en: "Cut" },
  { zh: "成型", en: "Fold" },
  { zh: "成品", en: "Done" },
];

/** Which samples the film shows, and as what. */
const CAST: { id: string; kind: HeroItem["kind"]; size?: [number, number, number] }[] = [
  { id: "cosmetics", kind: "carton" },
  { id: "tea", kind: "tin", size: [86, 120, 86] },
  { id: "electronics", kind: "carton" },
  { id: "personalCare", kind: "bottle" },
  { id: "baby", kind: "tin" },
];

export function heroItems(samples: Sample[]): HeroItem[] {
  const out: HeroItem[] = [];
  for (const c of CAST) {
    const s = samples.find((x) => x.id === c.id);
    if (!s) continue;
    const b = s.board;
    const d = b.directions.find((x) => x.id === b.recommendation.pick) ?? b.directions[0];
    const [w, h, dep] = c.size ?? [s.pack.w, s.pack.h, s.pack.d];
    out.push({ id: s.id, name: b.meta.product, label: s.label, d, brand: b.meta.brand, kind: c.kind, w, h, dep });
  }
  return out;
}

const f1 = (n: number) => n.toFixed(1);
const pts = (a: [number, number][]) => a.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");

/** Draws the 2D layer into the SVG (imperatively, every frame). */
function drawOverlay(svg: SVGSVGElement, o: OverlayFrame) {
  svg.setAttribute("viewBox", `0 0 ${o.w} ${o.h}`);
  const out: string[] = [];
  // colours come from the theme (globals.css: .sy-*)
  if (o.head) {
    const { a, b } = o.head;
    out.push(`<line x1="${f1(a[0])}" y1="${f1(a[1])}" x2="${f1(b[0])}" y2="${f1(b[1])}" class="sy-head-glow"/><line x1="${f1(a[0])}" y1="${f1(a[1])}" x2="${f1(b[0])}" y2="${f1(b[1])}" class="sy-head"/>`);
  }
  for (const g of o.ghosts) out.push(`<polygon points="${pts(g)}" class="sy-ghost"/>`);
  if (o.circle) out.push(`<polyline points="${pts(o.circle)}" class="sy-circle"/>`);
  if (o.cut) {
    let len = 0;
    for (let i = 1; i < o.cut.pts.length; i++) len += Math.hypot(o.cut.pts[i][0] - o.cut.pts[i - 1][0], o.cut.pts[i][1] - o.cut.pts[i - 1][1]);
    const done = len * o.cut.p;
    out.push(`<polyline points="${pts(o.cut.pts)}" class="sy-cut" stroke-dasharray="${len.toFixed(1)}" stroke-dashoffset="${(len - done).toFixed(1)}"/>`);
    // the knife
    let acc = 0;
    for (let i = 1; i < o.cut.pts.length; i++) {
      const [x0, y0] = o.cut.pts[i - 1];
      const [x1, y1] = o.cut.pts[i];
      const l = Math.hypot(x1 - x0, y1 - y0);
      if (acc + l >= done && o.cut.p < 1) {
        const k = l ? (done - acc) / l : 0;
        out.push(`<circle cx="${(x0 + (x1 - x0) * k).toFixed(1)}" cy="${(y0 + (y1 - y0) * k).toFixed(1)}" r="3.2" class="sy-knife"/>`);
        break;
      }
      acc += l;
    }
  }
  for (const t of o.threads) {
    out.push(`<line x1="${t.a[0].toFixed(1)}" y1="${t.a[1].toFixed(1)}" x2="${t.b[0].toFixed(1)}" y2="${t.b[1].toFixed(1)}" class="sy-thread"/>`);
    out.push(`<circle cx="${t.b[0].toFixed(1)}" cy="${t.b[1].toFixed(1)}" r="2.2" class="sy-dot"/><circle cx="${t.a[0].toFixed(1)}" cy="${t.a[1].toFixed(1)}" r="2.2" class="sy-dot-o"/>`);
  }
  for (const d of o.dims) {
    const [ax, ay] = d.a;
    const [bx, by] = d.b;
    const len = Math.hypot(bx - ax, by - ay) || 1;
    const nx = -(by - ay) / len;
    const ny = (bx - ax) / len;
    const tk = 5;
    out.push(`<g class="sy-dimg"><line x1="${f1(ax)}" y1="${f1(ay)}" x2="${f1(bx)}" y2="${f1(by)}"/><line x1="${f1(ax - nx * tk)}" y1="${f1(ay - ny * tk)}" x2="${f1(ax + nx * tk)}" y2="${f1(ay + ny * tk)}"/><line x1="${f1(bx - nx * tk)}" y1="${f1(by - ny * tk)}" x2="${f1(bx + nx * tk)}" y2="${f1(by + ny * tk)}"/></g>`);
    const mx = (ax + bx) / 2 + nx * 14;
    const my = (ay + by) / 2 + ny * 14;
    out.push(`<text x="${mx.toFixed(1)}" y="${my.toFixed(1)}" text-anchor="middle" dominant-baseline="middle" class="sym-dim">${d.text}</text>`);
  }
  svg.innerHTML = `<g opacity="${o.alpha2d.toFixed(3)}">${out.join("")}</g>`;
}

/** Draws the forms film's 2D layer: the dieline, the print laser, the scan contour, the dimensions. */
function drawFormsOverlay(svg: SVGSVGElement, f: FormsFrame) {
  svg.setAttribute("viewBox", `0 0 ${f.w} ${f.h}`);
  const out: string[] = [];
  for (const l of f.lines) {
    const bx = l.a[0] + (l.b[0] - l.a[0]) * l.p;
    const by = l.a[1] + (l.b[1] - l.a[1]) * l.p;
    const crease = l.kind === "crease";
    out.push(`<line x1="${f1(l.a[0])}" y1="${f1(l.a[1])}" x2="${f1(bx)}" y2="${f1(by)}" class="${crease ? "fx-crease" : "fx-cut"}" opacity="${l.alpha.toFixed(3)}"/>`);
  }
  if (f.laser) {
    const [[x0, y0], [x1, y1]] = f.laser;
    out.push(`<line x1="${f1(x0)}" y1="${f1(y0)}" x2="${f1(x1)}" y2="${f1(y1)}" class="fx-laser-glow"/><line x1="${f1(x0)}" y1="${f1(y0)}" x2="${f1(x1)}" y2="${f1(y1)}" class="fx-laser"/>`);
  }
  if (f.scan) out.push(`<polygon points="${pts(f.scan)}" class="fx-scan"/>`);
  for (const d of f.dims) {
    const [ax, ay] = d.a;
    const [bx, by] = d.b;
    const len = Math.hypot(bx - ax, by - ay) || 1;
    const nx = -(by - ay) / len;
    const ny = (bx - ax) / len;
    const tk = 5;
    out.push(`<g opacity="${d.alpha.toFixed(3)}" class="fx-dimg"><line x1="${f1(ax)}" y1="${f1(ay)}" x2="${f1(bx)}" y2="${f1(by)}"/><line x1="${f1(ax - nx * tk)}" y1="${f1(ay - ny * tk)}" x2="${f1(ax + nx * tk)}" y2="${f1(ay + ny * tk)}"/><line x1="${f1(bx - nx * tk)}" y1="${f1(by - ny * tk)}" x2="${f1(bx + nx * tk)}" y2="${f1(by + ny * tk)}"/>`);
    const mx = (ax + bx) / 2 + nx * 15;
    const my = (ay + by) / 2 + ny * 15;
    out.push(`<text x="${f1(mx)}" y="${f1(my)}" text-anchor="middle" dominant-baseline="middle" class="fx-dim">${d.text}</text></g>`);
  }
  svg.innerHTML = out.join("");
}

export type Film = "symbiosis" | "forms";
const FILMS: { id: Film; label: Pair }[] = [
  { id: "symbiosis", label: { zh: "共生", en: "Symbiosis" } },
  { id: "forms", label: { zh: "平面到立体", en: "Flat to form" } },
];
const FILM_KEY = "pa.heroFilm";
/** Reduced motion: the gift box, finished. */
const FORMS_STILL: [number, number] = [5, 4.2];

/** Starts work once the page has loaded and gone idle, so copy and layout come first. */
function whenIdle(): Promise<void> {
  return new Promise<void>((res) => {
    const idle = () => ((window as Window & { requestIdleCallback?: (f: () => void, o?: { timeout: number }) => void }).requestIdleCallback ?? ((f: () => void) => setTimeout(f, 120)))(() => res(), { timeout: 1200 });
    if (document.readyState === "complete") idle();
    else window.addEventListener("load", idle, { once: true });
  });
}

/**
 * The homepage hero, with two code-driven films under tabs:
 * - 共生 Symbiosis: a press sheet prints, cuts and folds into the package (or wraps a label
 *   round a tin or bottle) and back again, for one product after another.
 * - 平面到立体 Flat to form: twenty packs in everyday use, each from its dieline and flat
 *   print to its finished form.
 * Copy sits over the left; the strip below jumps to any product or pack.
 */
export function SymbiosisHero({ samples, lang, children }: { samples: Sample[]; lang: Lang; children: ReactNode }) {
  const items = useMemo(() => heroItems(samples), [samples]);
  const host = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const veil = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  // where the pre-rendered film was, so a change of theme picks up at the same moment
  const videoAt = useRef<{ film: string; t: number }>({ film: "", t: 0 });
  const scene = useRef<SymbiosisScene | null>(null);
  const forms = useRef<FormsScene | null>(null);
  const [film, setFilm] = useState<Film>("symbiosis");
  const [info, setInfo] = useState<{ item: number; stage: number }>({ item: 0, stage: 3 });
  const [pack, setPack] = useState<{ item: number; phase: number }>({ item: 0, phase: 0 });
  const [ok, setOk] = useState<Record<Film, boolean>>({ symbiosis: true, forms: true });
  // the remembered film is read first, so a returning visitor's other film is never built
  const [ready, setReady] = useState(false);
  const one = (p: Pair) => (lang === "en" ? p.en : p.zh);
  const theme = useTheme();
  const dark = theme === "dark";
  // read when a film is made, so it starts in the right tone
  const darkRef = useRef(dark);
  darkRef.current = dark;

  useEffect(() => {
    scene.current?.setTone(dark);
    forms.current?.setTone(dark);
  }, [dark]);

  useEffect(() => {
    try {
      const v = localStorage.getItem(FILM_KEY);
      // the second film used to be called "civilization"
      if (v === "forms" || v === "civilization") setFilm("forms");
    } catch {
      /* storage blocked: start on the first film */
    }
    setReady(true);
  }, []);

  const choose = (f: Film) => {
    setFilm(f);
    try {
      localStorage.setItem(FILM_KEY, f);
    } catch {
      /* not remembered, which is fine */
    }
  };

  useEffect(() => {
    if (!ready) return;
    let alive = true;
    let ro: ResizeObserver | undefined;
    let io: IntersectionObserver | undefined;
    let canvas: HTMLCanvasElement | undefined;
    let run: { start(): void; stop(): void; dispose(): void } | undefined;
    const onVis = () => (document.hidden ? run?.stop() : io && run?.start());
    if (svg.current) svg.current.innerHTML = "";
    if (veil.current) veil.current.style.opacity = "0";
    const mount = (make: (c: HTMLCanvasElement) => { start(): void; stop(): void; dispose(): void; resize(w: number, h: number): void }, still: () => void) => {
      const el = host.current;
      if (!alive || !el) return;
      // exactly one film canvas, whatever order things finished in
      el.querySelectorAll(".sym-canvas").forEach((c) => c.remove());
      canvas = document.createElement("canvas");
      canvas.className = "sym-canvas";
      el.prepend(canvas);
      let sc: ReturnType<typeof make>;
      try {
        sc = make(canvas);
      } catch {
        canvas.remove();
        setOk((o) => ({ ...o, [film]: false }));
        return;
      }
      run = sc;
      const r = el.getBoundingClientRect();
      sc.resize(r.width, r.height);
      ro = new ResizeObserver(([e]) => {
        sc.resize(e.contentRect.width, e.contentRect.height);
        if (reducedMotion()) still();
      });
      ro.observe(el);
      if (reducedMotion()) {
        still();
        return;
      }
      io = new IntersectionObserver(([e]) => (e.isIntersecting && !document.hidden ? sc.start() : sc.stop()), { threshold: 0.05 });
      io.observe(el);
      document.addEventListener("visibilitychange", onVis);
      (window as unknown as { __hero?: unknown }).__hero = sc;
    };

    if (film === "symbiosis") {
      let last = { item: -1, stage: -1 };
      whenIdle()
        .then(() => import("./symbiosis"))
        .then(({ SymbiosisScene }) =>
          mount(
            (c) => {
              const sc = new SymbiosisScene(c, items);
              sc.setTone(darkRef.current);
              scene.current = sc;
              sc.onFrame = (f: FrameInfo, o: OverlayFrame) => {
                if (svg.current) drawOverlay(svg.current, o);
                if (f.item !== last.item || f.stage !== last.stage) {
                  last = { item: f.item, stage: f.stage };
                  setInfo(last);
                }
              };
              return sc;
            },
            () => scene.current?.still(last.item < 0 ? 0 : last.item, 7.4),
          ),
        )
        .catch(() => setOk((o) => ({ ...o, symbiosis: false })));
    } else {
      let last = { item: -1, phase: -1 };
      whenIdle()
        .then(() => import("./forms/film"))
        .then(({ FormsScene }) =>
          mount(
            (c) => {
              const sc = new FormsScene(c);
              sc.setTone(darkRef.current);
              forms.current = sc;
              sc.onFrame = (f: FormsFrame) => {
                if (svg.current) drawFormsOverlay(svg.current, f);
                if (veil.current) veil.current.style.opacity = f.fade.toFixed(3);
                if (f.item !== last.item || f.phase !== last.phase) {
                  last = { item: f.item, phase: f.phase };
                  setPack(last);
                }
              };
              return sc;
            },
            () => forms.current?.still(...FORMS_STILL),
          ),
        )
        .catch(() => setOk((o) => ({ ...o, forms: false })));
    }
    return () => {
      alive = false;
      ro?.disconnect();
      io?.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      run?.dispose();
      scene.current = null;
      forms.current = null;
      canvas?.remove();
      const w = window as unknown as { __hero?: unknown };
      if (run && w.__hero === run) w.__hero = undefined;
    };
  }, [items, film, ready]);

  const cur = items[info.item];
  const isForms = film === "forms";
  const fp = FILM[pack.item];
  return (
    <section className={`sym${isForms ? " is-forms" : ""}${dark ? " is-dark" : ""}`} data-film={film} aria-label={lang === "en" ? "Packaging Advisor" : "包装视觉顾问"}>
      <div className="sym-stage" ref={host}>
        <svg ref={svg} className="sym-2d" aria-hidden="true" />
        <div ref={veil} className="sym-veil" aria-hidden="true" />
        {!ok[film] ? (
          // no WebGL: the same film, pre-rendered
          <video
            key={`${film}-${theme}`}
            ref={video}
            className="sym-video"
            src={`/hero/${film}-${theme}.mp4`}
            poster={`/hero/${film}-${theme}.jpg`}
            autoPlay
            muted
            loop
            playsInline
            aria-hidden="true"
            onLoadedMetadata={(e) => {
              if (videoAt.current.film === film) e.currentTarget.currentTime = videoAt.current.t;
            }}
            // the pre-rendered film still drives the caption and the strip
            onTimeUpdate={(e) => {
              videoAt.current = { film, t: e.currentTarget.currentTime };
              if (!isForms) return;
              const t = e.currentTarget.currentTime;
              const item = Math.min(FILM.length - 1, Math.floor(t / ITEM_SECONDS));
              const tt = t - item * ITEM_SECONDS;
              setPack({ item, phase: phaseOf(tt) });
            }}
          />
        ) : null}
      </div>
      <div className="sym-films seg" role="tablist" aria-label={lang === "en" ? "Films" : "影片"}>
        <SegPill />
        {FILMS.map((f) => (
          <button key={f.id} type="button" role="tab" aria-selected={film === f.id} className={film === f.id ? "is-on" : undefined} onClick={() => choose(f.id)}>
            <Bi p={f.label} lang={lang} />
          </button>
        ))}
      </div>
      <div className="sym-copy">{children}</div>
      {isForms ? (
        <div className="sym-meta fx-meta">
          <div className="fx-cap" aria-live="polite">
            <p className="fx-count">
              {String(pack.item + 1).padStart(2, "0")} <span>/ {FILM.length}</span>
            </p>
            <Bi p={fp.name} lang={lang} as="p" className="fx-name" />
            <p className="fx-spec">
              {sizeText(fp)} · <Bi p={fp.note} lang={lang} />
            </p>
            <ol className="fx-phases" aria-label={lang === "en" ? "What the film shows" : "画面进度"}>
              {PHASES.map((s, i) => (
                <li key={i} className={i === pack.phase ? "is-on" : i < pack.phase ? "is-done" : undefined}>
                  {one(s)}
                </li>
              ))}
            </ol>
          </div>
          <div className="fx-rail" role="group" aria-label={lang === "en" ? "Packs in the film" : "影片中的包装"}>
            {FILM.map((x, i) => (
              <button
                key={x.id}
                type="button"
                className={i === pack.item ? "is-on" : i < pack.item ? "is-done" : undefined}
                aria-pressed={i === pack.item}
                aria-label={`${x.name.zh} ${x.name.en}`}
                title={`${x.name.zh} ${x.name.en}`}
                onClick={() => {
                  setPack({ item: i, phase: 0 });
                  forms.current?.show(i, reducedMotion() ? FORMS_STILL[1] : 0.05);
                  if (video.current) video.current.currentTime = i * ITEM_SECONDS + 0.05;
                }}
              >
                <span>{String(i + 1).padStart(2, "0")}</span>
              </button>
            ))}
          </div>
        </div>
      ) : cur ? (
        <div className="sym-meta">
          <ol className="sym-stages" aria-label={lang === "en" ? "What the film shows" : "画面进度"}>
            {STAGES.map((s, i) => (
              <li key={i} className={i === info.stage ? "is-on" : i < info.stage ? "is-done" : undefined}>
                {one(s)}
              </li>
            ))}
          </ol>
          <div className="sym-products seg" role="group" aria-label={lang === "en" ? "Products in the film" : "影片中的产品"}>
            <SegPill />
            {items.map((x, i) => (
              <button
                key={x.id}
                type="button"
                className={i === info.item ? "is-on" : undefined}
                aria-pressed={i === info.item}
                onClick={() => {
                  scene.current?.show(i, reducedMotion() ? 7.4 : 0.2);
                }}
              >
                <i style={{ background: x.d.palette.find((p) => p.role === "brand")?.hex ?? x.d.palette[2]?.hex }} />
                {one(x.label)}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
