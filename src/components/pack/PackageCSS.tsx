"use client";

import { useEffect, useLayoutEffect, useRef, type CSSProperties, type ReactNode } from "react";
import type { Direction } from "@/lib/board/schema";
import { toPx, type PackSpec, type PxDims } from "@/lib/pack";
import { BackFace, FrontFace, InnerAndManual, paletteVars, SideFace, TopFace } from "../BoxFaces";
import { lightFaces } from "./light";
import type { Orbit } from "./orbit";

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/**
 * Fallback when WebGL is unavailable. A package drawn in CSS 3D: tuck carton, lid-and-base gift box or round tin.
 *  - `open` unfolds the carton into its flat net, or lifts the lid of the gift box / tin.
 *  - Faces are lit from the camera angle (see light.ts) and take the chosen finish.
 * The camera (rotation, zoom) comes from an Orbit, applied directly to the DOM.
 */
export function PackageCSS({ d, brand, spec, fit, open = false, orbit }: { d: Direction; brand: string; spec: PackSpec; fit: number; open?: boolean; orbit: Orbit }) {
  const rig = useRef<HTMLDivElement>(null);
  const px = toPx(spec, fit);

  // A flat carton net is much wider than the box; shrink it to fit the same stage.
  const net = netSize(px);
  const netScale = spec.form === "carton" && open ? Math.min(1, (fit * 1.9) / net.w, (fit * 1.6) / net.h) : 1;
  const scaleRef = useRef(netScale);
  scaleRef.current = netScale;

  useIsoLayoutEffect(() => {
    const el = rig.current;
    if (!el) return;
    const faces = Array.from(el.querySelectorAll<HTMLElement>("[data-n]"));
    // A tin turns its label a little toward the viewer at the resting angle.
    const yaw = spec.form === "tin" ? 22 : 0;
    return orbit.subscribe((o) => {
      const a = { x: o.angle.x, y: o.angle.y + yaw };
      el.style.transform = `scale(${(o.zoom * scaleRef.current).toFixed(4)}) rotateX(${a.x.toFixed(2)}deg) rotateY(${a.y.toFixed(2)}deg)`;
      lightFaces(faces, a);
    });
  }, [orbit, spec.form, spec.w, spec.h, spec.d, d.id, d.layout]);

  useIsoLayoutEffect(() => {
    const el = rig.current;
    if (!el) return;
    el.style.transform = el.style.transform.replace(/^scale\([^)]*\)/, `scale(${(orbit.zoom * netScale).toFixed(4)})`);
  }, [netScale]);

  // Same transform the orbit writes, so the server-rendered first paint already shows the angle.
  const yaw0 = spec.form === "tin" ? 22 : 0;
  const transform = `scale(${orbit.zoom.toFixed(4)}) rotateX(${orbit.angle.x.toFixed(2)}deg) rotateY(${(orbit.angle.y + yaw0).toFixed(2)}deg)`;

  return (
    <div ref={rig} className={`pk-rig pk-${spec.form} fin-${spec.finish}${open ? " is-open" : ""}`} style={{ ...paletteVars(d), transform }}>
      <div
        className="pk-shadow"
        aria-hidden="true"
        style={{ width: px.w * 1.5, height: px.d * 1.5, marginLeft: -px.w * 0.75, marginTop: -px.d * 0.75, transform: `translateY(${px.h / 2 + 1}px) rotateX(90deg)` }}
      />
      {spec.form === "carton" ? <Carton d={d} brand={brand} px={px} flat={open} /> : null}
      {spec.form === "gift" ? <GiftBox d={d} brand={brand} px={px} /> : null}
      {spec.form === "tin" ? <Tin d={d} brand={brand} px={px} /> : null}
    </div>
  );
}

/** Size of the carton's flat net relative to the folded box, for fitting it on screen. */
export function netSize(px: PxDims) {
  const g = glueWidth(px);
  const t = tuckDepth(px);
  return { w: 2 * px.w + 2 * px.d + g, h: px.h + 2 * px.d + 2 * t };
}
const glueWidth = (px: PxDims) => Math.max(8, Math.min(px.d * 0.32, 18));
const tuckDepth = (px: PxDims) => Math.max(10, Math.min(px.d * 0.55, 34));

/* ---------------------------------------------------------------- Tuck carton */

/**
 * Hinged like a real carton: sides hang off the front, the back off the right side, the top
 * and bottom off the front, flaps off those. Folding is four registered custom properties
 * (--fs sides, --fb back, --ffl flaps, --ftb top/bottom) so each step can be timed.
 */
function Carton({ d, brand, px, flat }: { d: Direction; brand: string; px: PxDims; flat: boolean }) {
  const g = glueWidth(px);
  const t = tuckDepth(px);
  const dust = Math.max(8, Math.min(px.d * 0.7, px.w * 0.45));
  const vars = { "--w": `${px.w}px`, "--h": `${px.h}px`, "--d": `${px.d}px`, "--g": `${g}px`, "--t": `${t}px`, "--dust": `${dust}px` } as CSSProperties;
  return (
    <div className={`ct${flat ? " is-flat" : ""}`} style={vars}>
      <Panel cls="ct-front" n="0,0,1" art={<FrontFace d={d} brand={brand} />}>
        <Panel cls="ct-left" n="-1,0,0" art={<SideFace d={d} brand={brand} variant="left" />}>
          <Panel cls="ct-glue ct-flap" />
          <Panel cls="ct-dust ct-dust-t ct-flap" />
          <Panel cls="ct-dust ct-dust-b ct-flap" />
        </Panel>
        <Panel cls="ct-right" n="1,0,0" art={<SideFace d={d} brand={brand} variant="right" />}>
          <Panel cls="ct-dust ct-dust-t ct-flap" />
          <Panel cls="ct-dust ct-dust-b ct-flap" />
          <Panel cls="ct-back" n="0,0,-1" art={<BackFace />} />
        </Panel>
        <Panel cls="ct-top" n="0,-1,0" art={<TopFace d={d} brand={brand} />}>
          <Panel cls="ct-tuck ct-tuck-t ct-flap" />
        </Panel>
        <Panel cls="ct-bottom" n="0,1,0" art={<div className="face-art bottom-face" />}>
          <Panel cls="ct-tuck ct-tuck-b ct-flap" />
        </Panel>
      </Panel>
    </div>
  );
}

function Panel({ cls, n, art, children }: { cls: string; n?: string; art?: ReactNode; children?: ReactNode }) {
  return (
    <div className={`ct-p ${cls}`} data-n={n}>
      <div className="pk-skin">{art ?? <div className="face-art flap-face" />}</div>
      <i className="pk-in" />
      {children}
    </div>
  );
}

/* ---------------------------------------------------------------- Generic faces */

type FaceProps = { w: number; h: number; t: string; n?: string; cls?: string; children?: ReactNode };

/** One flat face centred on the origin, then rotated and pushed into place by `t`. */
function Face({ w, h, t, n, cls = "", children }: FaceProps) {
  return (
    <div className={`pf ${cls}`} data-n={n} style={{ width: w, height: h, marginLeft: -w / 2, marginTop: -h / 2, transform: t }}>
      <div className="pk-skin">{children}</div>
    </div>
  );
}

/** An inward-facing face (inside of a box or lid), plain board color. */
function Inner({ w, h, t, n }: { w: number; h: number; t: string; n?: string }) {
  return <div className="pf pf-inner" data-n={n} style={{ width: w, height: h, marginLeft: -w / 2, marginTop: -h / 2, transform: t }} />;
}

/* ---------------------------------------------------------------- Gift box */

function GiftBox({ d, brand, px }: { d: Direction; brand: string; px: PxDims }) {
  const W = px.w;
  const D = px.d;
  const H = px.h;
  const lidH = Math.max(12, Math.round(H * 0.34));
  const inset = 3;
  const bw = W - inset * 2;
  const bd = D - inset * 2;
  const bh = H - 2; // base, sits slightly below the lid top
  const baseCy = H / 2 - bh / 2; // base centre y
  const lidCy = -H / 2 + lidH / 2;
  const name = brand || d.mockup.headline;
  // Opened, the lid stands behind the base, leaning back, its top facing the viewer.
  const lidOpen = `translate3d(0px, ${-(H * 0.35 + D * 0.32).toFixed(1)}px, ${(-D * 0.62 - lidH).toFixed(1)}px) rotateX(-78deg)`;
  return (
    <div className="gb" style={{ "--lid-open": lidOpen, "--lid-closed": "translate3d(0px, 0px, 0px) rotateX(0deg)" } as CSSProperties}>
      {/* Base */}
      <div className="gb-part" style={{ transform: `translateY(${baseCy}px)` }}>
        <Face w={bw} h={bh} t={`translateZ(${bd / 2}px)`} n="0,0,1" cls="gb-base-side">
          <div className="face-art gb-base-face" />
        </Face>
        <Face w={bw} h={bh} t={`rotateY(180deg) translateZ(${bd / 2}px)`} n="0,0,-1" cls="gb-base-side">
          <div className="face-art gb-base-face" />
        </Face>
        <Face w={bd} h={bh} t={`rotateY(90deg) translateZ(${bw / 2}px)`} n="1,0,0" cls="gb-base-side">
          <div className="face-art gb-base-face" />
        </Face>
        <Face w={bd} h={bh} t={`rotateY(-90deg) translateZ(${bw / 2}px)`} n="-1,0,0" cls="gb-base-side">
          <div className="face-art gb-base-face" />
        </Face>
        <Face w={bw} h={bd} t={`rotateX(-90deg) translateZ(${bh / 2}px)`} n="0,1,0" cls="gb-bottom">
          <div className="face-art bottom-face" />
        </Face>
        {/* Inside walls and floor */}
        <Inner w={bw} h={bh} t={`rotateY(180deg) translateZ(${-bd / 2 + 0.5}px)`} n="0,0,-1" />
        <Inner w={bw} h={bh} t={`translateZ(${-bd / 2 + 0.5}px)`} n="0,0,1" />
        <Inner w={bd} h={bh} t={`rotateY(-90deg) translateZ(${-bw / 2 + 0.5}px)`} n="-1,0,0" />
        <Inner w={bd} h={bh} t={`rotateY(90deg) translateZ(${-bw / 2 + 0.5}px)`} n="1,0,0" />
        <div className="pf gb-floor" data-n="0,-1,0" style={{ width: bw, height: bd, marginLeft: -bw / 2, marginTop: -bd / 2, transform: `rotateX(90deg) translateZ(${-bh / 2 + 3}px)` }}>
          <div className="gb-tray">
            <div className="gb-contents" style={{ transform: `scale(${Math.min(bw / 210, bd / 120, 1.4).toFixed(3)})` }}>
              <InnerAndManual d={d} brand={brand} />
            </div>
          </div>
        </div>
      </div>

      {/* Lid */}
      <div className="gb-part gb-lid" style={{ "--lid-y": `${lidCy}px` } as CSSProperties}>
        <Face w={W} h={D} t={`rotateX(90deg) translateZ(${lidH / 2}px)`} n="0,-1,0" cls="gb-lid-top">
          <FrontFace d={d} brand={brand} />
        </Face>
        <Face w={W} h={lidH} t={`translateZ(${D / 2}px)`} n="0,0,1" cls="gb-band">
          <div className="face-art band-face">
            <span>{name}</span>
            <span>{d.mockup.detail}</span>
          </div>
        </Face>
        <Face w={W} h={lidH} t={`rotateY(180deg) translateZ(${D / 2}px)`} n="0,0,-1" cls="gb-band">
          <div className="face-art band-face" />
        </Face>
        <Face w={D} h={lidH} t={`rotateY(90deg) translateZ(${W / 2}px)`} n="1,0,0" cls="gb-band">
          <div className="face-art band-face">
            <span>{d.mockup.detail}</span>
          </div>
        </Face>
        <Face w={D} h={lidH} t={`rotateY(-90deg) translateZ(${W / 2}px)`} n="-1,0,0" cls="gb-band">
          <div className="face-art band-face">
            <span>{name}</span>
          </div>
        </Face>
        <Inner w={W - 1} h={D - 1} t={`rotateX(-90deg) translateZ(${-lidH / 2 + 1}px)`} n="0,1,0" />
        <Inner w={W} h={lidH} t={`translateZ(${-D / 2 + 0.5}px)`} n="0,0,1" />
        <Inner w={W} h={lidH} t={`rotateY(180deg) translateZ(${-D / 2 + 0.5}px)`} n="0,0,-1" />
        <Inner w={D} h={lidH} t={`rotateY(90deg) translateZ(${-W / 2 + 0.5}px)`} n="1,0,0" />
        <Inner w={D} h={lidH} t={`rotateY(-90deg) translateZ(${-W / 2 + 0.5}px)`} n="-1,0,0" />
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- Round tin */

const TIN_FACETS = 36;

/**
 * A cylinder of thin facets. Each facet shows its own slice of one wrap-around label, so the
 * front art, side text and back panel sit where they would on a real tin.
 */
function Tin({ d, brand, px }: { d: Direction; brand: string; px: PxDims }) {
  const r = px.w / 2;
  const N = TIN_FACETS;
  const step = 360 / N;
  const fw = 2 * r * Math.tan(Math.PI / N);
  const apothem = r * Math.cos(Math.PI / N);
  const C = fw * N;
  const lidH = Math.max(10, Math.round(px.h * 0.17));
  const bodyH = px.h - lidH * 0.55;
  const bodyCy = px.h / 2 - bodyH / 2;
  const lidR = r + 1.6;
  const lidFw = 2 * lidR * Math.tan(Math.PI / N) + 0.6;
  const lidCy = -px.h / 2 + lidH / 2;
  const frontW = C * 0.3;
  const sideW = C / 2 - frontW;

  // Sections of the wrap, in wrap coordinates [0, C), front centred at C/2.
  const sections: { x0: number; x1: number; node: ReactNode; key: string }[] = [
    { key: "front", x0: C / 2 - frontW / 2, x1: C / 2 + frontW / 2, node: <FrontFace d={d} brand={brand} /> },
    { key: "right", x0: C / 2 + frontW / 2, x1: C / 2 + frontW / 2 + sideW, node: <SideFace d={d} brand={brand} variant="right" /> },
    { key: "left", x0: C / 2 - frontW / 2 - sideW, x1: C / 2 - frontW / 2, node: <SideFace d={d} brand={brand} variant="left" /> },
    { key: "back-a", x0: -frontW / 2, x1: frontW / 2, node: <BackFace /> },
    { key: "back-b", x0: C - frontW / 2, x1: C + frontW / 2, node: <BackFace /> },
  ];

  const facets = Array.from({ length: N }, (_, i) => {
    const k = i < N / 2 ? i : i - N; // -N/2 .. N/2-1, 0 = front
    const theta = k * step;
    const centre = C / 2 + k * fw;
    const s0 = centre - fw / 2;
    const s1 = centre + fw / 2;
    const rad = (theta * Math.PI) / 180;
    const n = `${Math.sin(rad).toFixed(3)},0,${Math.cos(rad).toFixed(3)}`;
    const visible = sections.filter((s) => s.x1 > s0 - 1 && s.x0 < s1 + 1);
    return (
      <div
        key={i}
        className="pf tin-facet"
        data-n={n}
        style={{ width: fw + 0.7, height: bodyH, marginLeft: -(fw + 0.7) / 2, marginTop: -bodyH / 2, transform: `rotateY(${theta}deg) translateZ(${apothem}px)` }}
      >
        <div className="pk-skin">
          <div className="tin-wrap" style={{ width: C, left: -s0 }}>
            {visible.map((s) => (
              <div key={s.key} className={`tin-sec tin-${s.key}`} style={{ left: s.x0, width: s.x1 - s.x0 }}>
                {s.node}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  });

  const lidFacets = Array.from({ length: N }, (_, i) => {
    const theta = i * step;
    const rad = (theta * Math.PI) / 180;
    return (
      <div
        key={i}
        className="pf tin-lid-facet"
        data-n={`${Math.sin(rad).toFixed(3)},0,${Math.cos(rad).toFixed(3)}`}
        style={{ width: lidFw, height: lidH, marginLeft: -lidFw / 2, marginTop: -lidH / 2, transform: `rotateY(${theta}deg) translateZ(${lidR * Math.cos(Math.PI / N)}px)` }}
      >
        <div className="pk-skin" />
      </div>
    );
  });

  return (
    <div className="tin">
      <div className="gb-part" style={{ transform: `translateY(${bodyCy}px)` }}>
        {facets}
        <div className="pf tin-disc tin-bottom" data-n="0,1,0" style={{ width: px.w, height: px.w, marginLeft: -r, marginTop: -r, transform: `rotateX(-90deg) translateZ(${bodyH / 2}px)` }}>
          <div className="pk-skin" />
        </div>
        <div className="pf tin-disc tin-seal" data-n="0,-1,0" style={{ width: px.w - 4, height: px.w - 4, marginLeft: -r + 2, marginTop: -r + 2, transform: `rotateX(90deg) translateZ(${bodyH / 2 - 1}px)` }}>
          <div className="pk-skin">
            <span>{brand || d.mockup.headline}</span>
          </div>
        </div>
      </div>
      <div className="gb-part tin-lid" style={{ "--lid-y": `${lidCy}px`, "--lid-closed": "translate3d(0px, 0px, 0px) rotateZ(0deg) rotateX(0deg)", "--lid-open": `translate3d(${(r * 1.05).toFixed(1)}px, ${(-px.h * 0.22).toFixed(1)}px, ${(-r * 0.9).toFixed(1)}px) rotateZ(16deg) rotateX(-6deg)` } as CSSProperties}>
        {lidFacets}
        <div className="pf tin-disc tin-cap" data-n="0,-1,0" style={{ width: lidR * 2, height: lidR * 2, marginLeft: -lidR, marginTop: -lidR, transform: `rotateX(90deg) translateZ(${lidH / 2}px)` }}>
          <div className="pk-skin">
            <span>{brand || d.mockup.headline}</span>
          </div>
        </div>
        <div className="pf tin-disc tin-cap-in" style={{ width: lidR * 2 - 2, height: lidR * 2 - 2, marginLeft: -lidR + 1, marginTop: -lidR + 1, transform: `rotateX(-90deg) translateZ(${lidH / 2 - 1}px)` }} />
      </div>
    </div>
  );
}
