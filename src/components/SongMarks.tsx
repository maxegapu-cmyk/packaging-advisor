"use client";

/**
 * Marks from Song painting and books, drawn for the page: carved seals, key-fret corners, and
 * distant hills in ink wash. They are ornament (aria-hidden); the words around them carry the
 * meaning.
 */
import { useEffect, useRef, useState, type CSSProperties } from "react";

/**
 * A carved seal. 白文: the characters cut away, left in the paper's colour on a cinnabar field.
 * 朱文: the characters standing in cinnabar inside a cinnabar border. Two characters stack in a
 * tall seal; four read in two columns, right column first.
 */
export function SealStamp({ text, kind = "bai", size = 30, tilt = 0, className }: { text: string; kind?: "bai" | "zhu"; size?: number; tilt?: number; className?: string }) {
  const ch = Array.from(text).slice(0, 4);
  const tall = ch.length <= 2;
  const W = 32;
  const H = tall ? 32 * (ch.length === 2 ? 1.72 : 1) : 32;
  const cells: { x: number; y: number }[] =
    ch.length === 1
      ? [{ x: 16, y: 16 }]
      : ch.length === 2
        ? [{ x: 16, y: 13.4 }, { x: 16, y: H - 13.4 + 2.2 }]
        : ch.length === 3
          ? [{ x: 23, y: 13.5 }, { x: 23, y: 28 }, { x: 9, y: 21 }]
          : [{ x: 23, y: 14.2 }, { x: 23, y: 28.2 }, { x: 9, y: 14.2 }, { x: 9, y: 28.2 }];
  const fs = ch.length <= 2 ? 21 : 12.6;
  return (
    <svg className={`seal-stamp seal-${kind}${className ? " " + className : ""}`} width={size} height={(size * H) / W} viewBox={`0 0 ${W} ${H}`} style={tilt ? ({ "--tilt": `${tilt}deg` } as CSSProperties) : undefined} aria-hidden="true">
      <defs>
        <filter id="seal-wear" x="-6%" y="-6%" width="112%" height="112%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" seed="7" result="grain" />
          <feDisplacementMap in="SourceGraphic" in2="grain" scale="1" xChannelSelector="R" yChannelSelector="G" result="worn" />
          <feComponentTransfer in="grain" result="specks">
            <feFuncA type="discrete" tableValues="1 1 1 1 1 1 1 1 1 0" />
          </feComponentTransfer>
          <feComposite in="worn" in2="specks" operator="in" />
        </filter>
      </defs>
      <g filter="url(#seal-wear)">
        {kind === "bai" ? <rect className="ss-field" x="0.6" y="0.6" width={W - 1.2} height={H - 1.2} rx="1.4" /> : <rect className="ss-rim" x="1.4" y="1.4" width={W - 2.8} height={H - 2.8} rx="1.2" />}
        <g className="ss-chars" style={{ fontSize: fs }}>
          {ch.map((c, i) => (
            <text key={i} x={cells[i].x} y={cells[i].y + fs * 0.36}>
              {c}
            </text>
          ))}
        </g>
      </g>
    </svg>
  );
}

/** A key-fret (回纹) corner, drawn for the top-left; CSS turns it for the other corners. */
export function FretCorner({ className }: { className?: string }) {
  return (
    <svg className={`fret${className ? " " + className : ""}`} viewBox="0 0 40 40" aria-hidden="true">
      <path d="M2 38 V2 H38 M8 38 V8 H32 V26 H14 V14 H26 V20" fill="none" />
    </svg>
  );
}

/** Ridges for the hills: a seeded sum of slow waves, so the server and the page draw the same. */
function ridge(seed: number, base: number, amp: number, w: number, h: number): string {
  let s = seed;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const waves = Array.from({ length: 4 }, (_, i) => ({ f: (0.6 + rnd() * 1.4) * (i + 1), p: rnd() * Math.PI * 2, a: amp / (i + 1.3) }));
  const pts: [number, number][] = [];
  for (let x = 0; x <= w; x += w / 48) {
    let y = base;
    for (const v of waves) y -= v.a * Math.sin((x / w) * Math.PI * v.f + v.p);
    // a few sharper peaks, as in 披麻 hills seen from far off
    y -= Math.max(0, Math.sin((x / w) * Math.PI * 3.1 + seed)) ** 6 * amp * 0.9;
    pts.push([x, Math.max(4, Math.min(h, y))]);
  }
  let d = `M0 ${h} L${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const [x, y] = pts[i];
    const [nx, ny] = pts[i + 1];
    d += ` Q${x.toFixed(1)} ${y.toFixed(1)} ${((x + nx) / 2).toFixed(1)} ${((y + ny) / 2).toFixed(1)}`;
  }
  const last = pts[pts.length - 1];
  return d + ` L${last[0].toFixed(1)} ${last[1].toFixed(1)} L${w} ${h} Z`;
}
const HILLS = [ridge(11, 120, 38, 1200, 240), ridge(23, 160, 30, 1200, 240), ridge(37, 196, 22, 1200, 240)];

/** Distant hills in ink wash: three ridges, each fading into mist at its foot. */
export function InkHills({ className }: { className?: string }) {
  return (
    <svg className={`ink-hills${className ? " " + className : ""}`} viewBox="0 0 1200 240" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        {[0, 1, 2].map((i) => (
          <linearGradient key={i} id={`hill-mist-${i}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="currentColor" stopOpacity={[0.16, 0.24, 0.34][i]} />
            <stop offset={[0.55, 0.6, 0.7][i]} stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        ))}
      </defs>
      {HILLS.map((d, i) => (
        <path key={i} d={d} fill={`url(#hill-mist-${i})`} />
      ))}
    </svg>
  );
}

/**
 * Unrolls a handscroll once, the first time it comes into view: "rolled" until then, then
 * "unrolling". Stays open when it is already on screen, when motion is reduced, or without
 * IntersectionObserver.
 */
export function useUnroll<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [state, setState] = useState<"open" | "rolled" | "unrolling">("open");
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches || !matchMedia("(min-width: 1101px)").matches) return;
    if (el.getBoundingClientRect().top < innerHeight * 0.9) return;
    setState("rolled");
    const io = new IntersectionObserver(
      (es) => {
        if (es.some((e) => e.isIntersecting)) {
          setState("unrolling");
          io.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, state] as const;
}
