"use client";

import { useEffect, useState } from "react";
import type { Direction } from "@/lib/board/schema";
import type { Lang, Pair } from "@/lib/i18n";
import { FORM_LABELS, FORM_PRESET, type Form, type PackSpec } from "@/lib/pack";

/** One form per material family, to show the range on the landing page. */
const SHOW: Form[] = ["gift", "carton", "pouch", "jar", "tin"];
import { SpaceIcon } from "./Box3D";
import { FormGlyph } from "./pack/FormGlyph";
import { Orbit, REST_ANGLE } from "./pack/orbit";
import { Package3D } from "./pack/Package3D";
import { Stage3D } from "./pack/Stage3D";

const C = {
  open: { zh: "打开", en: "Open" },
  unfold: { zh: "展开刀模", en: "Unfold" },
  close: { zh: "合上", en: "Close" },
  enter: { zh: "进入 3D 空间", en: "Enter the 3D space" },
  drag: { zh: "拖动试试", en: "Try dragging it" },
} satisfies Record<string, Pair>;

/** Landing-page demo of the 3D space: one direction on a slow turntable, one form per material to try. */
export function SpaceShowcase({ d, brand, lang, href }: { d: Direction; brand: string; lang: Lang; href: string }) {
  const [orbit] = useState(() => new Orbit({ x: -18, y: -34 }, 1, { free: true }));
  const [form, setForm] = useState<Form>("gift");
  const [open, setOpen] = useState(false);
  const [touched, setTouched] = useState(false);
  const spec: PackSpec = { ...FORM_PRESET[form], finish: form === "gift" ? "paper" : form === "tin" ? "gloss" : "matte" };
  const one = (p: Pair) => (lang === "en" ? p.en : p.zh);

  // Turn slowly until someone takes over; respect reduced motion (spin() does).
  useEffect(() => {
    if (touched) return;
    const io = new IntersectionObserver(([e]) => orbit.spin(e.isIntersecting));
    const el = document.getElementById("space-stage");
    if (el) io.observe(el);
    return () => {
      io.disconnect();
      orbit.stop();
    };
  }, [orbit, touched]);

  const take = () => {
    setTouched(true);
    orbit.stop();
  };

  return (
    <div className="showcase">
      <div id="space-stage" className="showcase-stage">
        <Stage3D orbit={orbit} label={`${one(FORM_LABELS[form])}: ${one(d.name)}`} onInteract={take} restZoom={1}>
          <Package3D d={d} brand={brand} spec={spec} fit={310} open={open} orbit={orbit} />
        </Stage3D>
        {!touched ? <span className="showcase-drag">{one(C.drag)}</span> : null}
      </div>
      <div className="showcase-controls">
        <div className="showcase-forms" role="radiogroup" aria-label={lang === "en" ? "Structure" : "盒型"}>
          {SHOW.map((f) => (
            <button
              key={f}
              type="button"
              role="radio"
              aria-checked={form === f}
              className={form === f ? "showcase-form is-active" : "showcase-form"}
              onClick={() => {
                take();
                setOpen(false);
                setForm(f);
                orbit.tween(REST_ANGLE, 700, 1);
              }}
            >
              <FormGlyph form={f} />
              <span>{one(FORM_LABELS[f])}</span>
            </button>
          ))}
        </div>
        <button
          type="button"
          className="showcase-open"
          aria-pressed={open}
          onClick={() => {
            take();
            const next = !open;
            setOpen(next);
            if (form === "carton") orbit.tween(next ? { x: 0, y: 0 } : REST_ANGLE, next ? 1300 : 2200, 1);
            else orbit.tween(next ? { x: -40, y: -24 } : REST_ANGLE, 1000, next ? 0.92 : 1);
          }}
        >
          {one(open ? C.close : form === "carton" ? C.unfold : C.open)}
        </button>
        <a className="btn btn-sheet btn-large showcase-enter" href={href}>
          <SpaceIcon />
          {one(C.enter)}
          {lang === "bi" ? <span className="bi-en">{C.enter.en}</span> : null}
        </a>
      </div>
    </div>
  );
}
