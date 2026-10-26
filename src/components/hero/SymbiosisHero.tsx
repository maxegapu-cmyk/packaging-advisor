"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Lang, Pair } from "@/lib/i18n";
import type { Sample } from "@/lib/samples";
import { reducedMotion } from "../pack/orbit";
import type { FrameInfo, HeroItem, OverlayFrame, SymbiosisScene } from "./symbiosis";

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

/**
 * The homepage hero: a code-driven film where a press sheet prints, cuts and folds into the
 * package (or wraps a label round a tin or bottle) and back again, for one product after
 * another. Copy sits over the left; the product strip below jumps to any of them.
 */
export function SymbiosisHero({ samples, lang, children }: { samples: Sample[]; lang: Lang; children: ReactNode }) {
  const items = useMemo(() => heroItems(samples), [samples]);
  const host = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const scene = useRef<SymbiosisScene | null>(null);
  const [info, setInfo] = useState<{ item: number; stage: number }>({ item: 0, stage: 3 });
  const [ok, setOk] = useState(true);
  const one = (p: Pair) => (lang === "en" ? p.en : p.zh);

  useEffect(() => {
    let alive = true;
    let ro: ResizeObserver | undefined;
    let io: IntersectionObserver | undefined;
    let canvas: HTMLCanvasElement | undefined;
    let last = { item: -1, stage: -1 };
    const onVis = () => (document.hidden ? scene.current?.stop() : io && scene.current?.start());
    import("./symbiosis")
      .then(({ SymbiosisScene }) => {
        const el = host.current;
        if (!alive || !el) return;
        canvas = document.createElement("canvas");
        canvas.className = "sym-canvas";
        el.prepend(canvas);
        let sc: SymbiosisScene;
        try {
          sc = new SymbiosisScene(canvas, items);
        } catch {
          setOk(false);
          return;
        }
        scene.current = sc;
        sc.onFrame = (f: FrameInfo, o: OverlayFrame) => {
          if (svg.current) drawOverlay(svg.current, o);
          if (f.item !== last.item || f.stage !== last.stage) {
            last = { item: f.item, stage: f.stage };
            setInfo(last);
          }
        };
        const r = el.getBoundingClientRect();
        sc.resize(r.width, r.height);
        ro = new ResizeObserver(([e]) => {
          sc.resize(e.contentRect.width, e.contentRect.height);
          if (reducedMotion()) sc.still(last.item < 0 ? 0 : last.item, 7.4);
        });
        ro.observe(el);
        if (reducedMotion()) {
          sc.still(0, 7.4);
          return;
        }
        io = new IntersectionObserver(([e]) => (e.isIntersecting && !document.hidden ? sc.start() : sc.stop()), { threshold: 0.05 });
        io.observe(el);
        document.addEventListener("visibilitychange", onVis);
        const w = window as unknown as { __hero?: SymbiosisScene };
        w.__hero = sc;
      })
      .catch(() => setOk(false));
    return () => {
      alive = false;
      ro?.disconnect();
      io?.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      scene.current?.dispose();
      scene.current = null;
      canvas?.remove();
    };
  }, [items]);

  const cur = items[info.item];
  return (
    <section className="sym" aria-label={lang === "en" ? "Packaging Advisor" : "包装视觉顾问"}>
      <div className="sym-stage" ref={host}>
        <svg ref={svg} className="sym-2d" aria-hidden="true" />
        {!ok ? <div className="sym-fallback" aria-hidden="true" /> : null}
      </div>
      <div className="sym-copy">{children}</div>
      {cur ? (
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
