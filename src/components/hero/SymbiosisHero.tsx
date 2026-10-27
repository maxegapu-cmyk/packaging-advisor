"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Lang, Pair } from "@/lib/i18n";
import type { Sample } from "@/lib/samples";
import { reducedMotion } from "../pack/orbit";
import { Bi } from "../Bi";
import type { FrameInfo, HeroItem, OverlayFrame, SymbiosisScene } from "./symbiosis";
import type { CivFrame, CivilizationScene } from "./civilization";
import { CHAPTER_SECONDS, CHAPTERS } from "./chapters";

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

const pts = (a: [number, number][]) => a.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");

/** Draws the 2D layer into the SVG (imperatively, every frame). */
function drawOverlay(svg: SVGSVGElement, o: OverlayFrame) {
  svg.setAttribute("viewBox", `0 0 ${o.w} ${o.h}`);
  const out: string[] = [];
  if (o.head) {
    const cols = ["#00A0E9", "#E4007F", "#E6D200", "#111111"];
    cols.forEach((c, i) => out.push(`<line x1="${o.head!.a[0] + i * 3}" y1="${o.head!.a[1]}" x2="${o.head!.b[0] + i * 3}" y2="${o.head!.b[1]}" stroke="${c}" stroke-width="1.2" opacity="0.85"/>`));
  }
  for (const g of o.ghosts) out.push(`<polygon points="${pts(g)}" fill="none" stroke="#00A0E9" stroke-width="0.9" stroke-dasharray="4 3" opacity="0.75"/>`);
  if (o.circle) out.push(`<polyline points="${pts(o.circle)}" fill="none" stroke="#E4007F" stroke-width="1.2" stroke-dasharray="5 4"/>`);
  if (o.cut) {
    let len = 0;
    for (let i = 1; i < o.cut.pts.length; i++) len += Math.hypot(o.cut.pts[i][0] - o.cut.pts[i - 1][0], o.cut.pts[i][1] - o.cut.pts[i - 1][1]);
    const done = len * o.cut.p;
    out.push(`<polyline points="${pts(o.cut.pts)}" fill="none" stroke="#E4007F" stroke-width="1.6" stroke-linejoin="round" stroke-dasharray="${len.toFixed(1)}" stroke-dashoffset="${(len - done).toFixed(1)}"/>`);
    // the knife
    let acc = 0;
    for (let i = 1; i < o.cut.pts.length; i++) {
      const [x0, y0] = o.cut.pts[i - 1];
      const [x1, y1] = o.cut.pts[i];
      const l = Math.hypot(x1 - x0, y1 - y0);
      if (acc + l >= done && o.cut.p < 1) {
        const k = l ? (done - acc) / l : 0;
        out.push(`<circle cx="${(x0 + (x1 - x0) * k).toFixed(1)}" cy="${(y0 + (y1 - y0) * k).toFixed(1)}" r="3.2" fill="#E4007F"/>`);
        break;
      }
      acc += l;
    }
  }
  for (const t of o.threads) {
    out.push(`<line x1="${t.a[0].toFixed(1)}" y1="${t.a[1].toFixed(1)}" x2="${t.b[0].toFixed(1)}" y2="${t.b[1].toFixed(1)}" stroke="#00A0E9" stroke-width="0.8" opacity="0.8"/>`);
    out.push(`<circle cx="${t.b[0].toFixed(1)}" cy="${t.b[1].toFixed(1)}" r="2.2" fill="#00A0E9"/><circle cx="${t.a[0].toFixed(1)}" cy="${t.a[1].toFixed(1)}" r="2.2" fill="#fff" stroke="#00A0E9" stroke-width="1"/>`);
  }
  for (const d of o.dims) {
    const [ax, ay] = d.a;
    const [bx, by] = d.b;
    const len = Math.hypot(bx - ax, by - ay) || 1;
    const nx = -(by - ay) / len;
    const ny = (bx - ax) / len;
    const tk = 5;
    out.push(`<line x1="${ax}" y1="${ay}" x2="${bx}" y2="${by}" stroke="#111" stroke-width="1"/>`);
    out.push(`<line x1="${ax - nx * tk}" y1="${ay - ny * tk}" x2="${ax + nx * tk}" y2="${ay + ny * tk}" stroke="#111" stroke-width="1"/><line x1="${bx - nx * tk}" y1="${by - ny * tk}" x2="${bx + nx * tk}" y2="${by + ny * tk}" stroke="#111" stroke-width="1"/>`);
    const mx = (ax + bx) / 2 + nx * 14;
    const my = (ay + by) / 2 + ny * 14;
    out.push(`<text x="${mx.toFixed(1)}" y="${my.toFixed(1)}" text-anchor="middle" dominant-baseline="middle" class="sym-dim">${d.text}</text>`);
  }
  svg.innerHTML = `<g opacity="${o.alpha2d.toFixed(3)}">${out.join("")}</g>`;
}

/** Draws the civilization film's 2D construction lines, each revealed up to its `p`. */
function drawCivOverlay(svg: SVGSVGElement, f: CivFrame) {
  svg.setAttribute("viewBox", `0 0 ${f.w} ${f.h}`);
  const out: string[] = [];
  for (const l of f.lines) {
    const p = l.p ?? 1;
    if (p <= 0 || l.pts.length < 2) continue;
    let len = 0;
    for (let i = 1; i < l.pts.length; i++) len += Math.hypot(l.pts[i][0] - l.pts[i - 1][0], l.pts[i][1] - l.pts[i - 1][1]);
    // cut the polyline at p of its length, so dashed lines reveal cleanly too
    const keep: [number, number][] = [l.pts[0]];
    let acc = 0;
    for (let i = 1; i < l.pts.length; i++) {
      const [x0, y0] = l.pts[i - 1];
      const [x1, y1] = l.pts[i];
      const s = Math.hypot(x1 - x0, y1 - y0);
      if (acc + s >= len * p) {
        const k = s ? (len * p - acc) / s : 0;
        keep.push([x0 + (x1 - x0) * k, y0 + (y1 - y0) * k]);
        break;
      }
      keep.push([x1, y1]);
      acc += s;
    }
    out.push(`<polyline points="${pts(keep)}" fill="none" stroke="${l.color}" stroke-width="${l.width}"${l.dash ? ` stroke-dasharray="${l.dash}"` : ""} stroke-linecap="round" stroke-linejoin="round"/>`);
    // the knife, where the cut has got to
    if (l.head && p < 1) {
      const [hx, hy] = keep[keep.length - 1];
      out.push(`<circle cx="${hx.toFixed(1)}" cy="${hy.toFixed(1)}" r="3.4" fill="${l.color}"/>`);
    }
  }
  svg.innerHTML = out.join("");
}

export type Film = "symbiosis" | "civilization";
const FILMS: { id: Film; label: Pair }[] = [
  { id: "symbiosis", label: { zh: "共生", en: "Symbiosis" } },
  { id: "civilization", label: { zh: "文明：从平面到立体", en: "Civilization: flat to form" } },
];
const FILM_KEY = "pa.heroFilm";
const CIV_STILL: [number, number] = [6, 7.2];

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
 * - 文明 Civilization: seven moments in how people went from flat marks to solid forms.
 * Copy sits over the left; the strip below jumps to any product or chapter.
 */
export function SymbiosisHero({ samples, lang, children }: { samples: Sample[]; lang: Lang; children: ReactNode }) {
  const items = useMemo(() => heroItems(samples), [samples]);
  const host = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const veil = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const scene = useRef<SymbiosisScene | null>(null);
  const civ = useRef<CivilizationScene | null>(null);
  const [film, setFilm] = useState<Film>("symbiosis");
  const [info, setInfo] = useState<{ item: number; stage: number }>({ item: 0, stage: 3 });
  const [chapter, setChapter] = useState(0);
  const [ok, setOk] = useState<Record<Film, boolean>>({ symbiosis: true, civilization: true });
  const one = (p: Pair) => (lang === "en" ? p.en : p.zh);

  useEffect(() => {
    try {
      const v = localStorage.getItem(FILM_KEY);
      if (v === "civilization") setFilm(v);
    } catch {
      /* storage blocked: start on the first film */
    }
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
      let last = -1;
      whenIdle()
        .then(() => import("./civilization"))
        .then(({ CivilizationScene }) =>
          mount(
            (c) => {
              const sc = new CivilizationScene(c);
              civ.current = sc;
              sc.onFrame = (f: CivFrame) => {
                if (svg.current) drawCivOverlay(svg.current, f);
                if (veil.current) veil.current.style.opacity = f.fade.toFixed(3);
                if (f.chapter !== last) {
                  last = f.chapter;
                  setChapter(last);
                }
              };
              return sc;
            },
            () => civ.current?.still(...CIV_STILL),
          ),
        )
        .catch(() => setOk((o) => ({ ...o, civilization: false })));
    }
    return () => {
      alive = false;
      ro?.disconnect();
      io?.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      run?.dispose();
      scene.current = null;
      civ.current = null;
      canvas?.remove();
    };
  }, [items, film]);

  const cur = items[info.item];
  const ch = CHAPTERS[chapter];
  const isCiv = film === "civilization";
  const dark = isCiv && ch.dark;
  return (
    <section className={`sym${isCiv ? " is-civ" : ""}${dark ? " is-dark" : ""}`} data-film={film} aria-label={lang === "en" ? "Packaging Advisor" : "包装视觉顾问"}>
      <div className="sym-stage" ref={host}>
        <svg ref={svg} className="sym-2d" aria-hidden="true" />
        <div ref={veil} className="sym-veil" aria-hidden="true" />
        {!ok[film] ? (
          // no WebGL: the same film, pre-rendered
          <video
            key={film}
            ref={video}
            className="sym-video"
            src={`/hero/${film}.mp4`}
            poster={`/hero/${film}-poster.jpg`}
            autoPlay
            muted
            loop
            playsInline
            aria-hidden="true"
            // the pre-rendered civilization film still drives the captions and chapter strip
            onTimeUpdate={(e) => isCiv && setChapter(Math.min(CHAPTERS.length - 1, Math.floor(e.currentTarget.currentTime / CHAPTER_SECONDS)))}
          />
        ) : null}
      </div>
      <div className="sym-films" role="tablist" aria-label={lang === "en" ? "Films" : "影片"}>
        {FILMS.map((f) => (
          <button key={f.id} type="button" role="tab" aria-selected={film === f.id} className={film === f.id ? "is-on" : undefined} onClick={() => choose(f.id)}>
            <Bi p={f.label} lang={lang} />
          </button>
        ))}
      </div>
      <div className="sym-copy">{children}</div>
      {isCiv ? (
        <div className="sym-meta civ-meta">
          <div className="civ-cap" aria-live="polite">
            <Bi p={ch.year} lang={lang} as="p" className="civ-year" />
            <Bi p={ch.title} lang={lang} as="p" className="civ-title" />
            <Bi p={ch.line} lang={lang} as="p" className="civ-line" />
          </div>
          <div className="sym-products civ-chapters" role="group" aria-label={lang === "en" ? "Chapters" : "章节"}>
            {CHAPTERS.map((c, i) => (
              <button
                key={c.id}
                type="button"
                className={i === chapter ? "is-on" : undefined}
                aria-pressed={i === chapter}
                title={`${c.title.zh} ${c.title.en}`}
                onClick={() => {
                  setChapter(i);
                  civ.current?.show(i, reducedMotion() ? 7.2 : 0.1);
                  if (video.current) video.current.currentTime = i * CHAPTER_SECONDS + 0.1;
                }}
              >
                <b>{String(i + 1).padStart(2, "0")}</b>
                {one(c.short)}
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
          <div className="sym-products" role="group" aria-label={lang === "en" ? "Products in the film" : "影片中的产品"}>
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
