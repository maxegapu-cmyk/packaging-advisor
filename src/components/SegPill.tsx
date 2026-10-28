"use client";

import { useLayoutEffect, useRef } from "react";

const ACTIVE = ':scope > [aria-selected="true"], :scope > [aria-checked="true"], :scope > [aria-pressed="true"], :scope > .is-active, :scope > .is-on';
const EASE = "cubic-bezier(0.3, 0.7, 0.2, 1)";
const GLIDE_MS = 420;

/**
 * The sliding highlight of a segmented control or tab row. Put it as the first child of the
 * row (which gets `position: relative`); it finds the selected item (aria-selected, -checked,
 * -pressed, or .is-active / .is-on) and glides to it whenever the selection or the layout
 * changes. Until it has measured (or without JavaScript) the selected item keeps its own
 * highlight, so nothing is ever unmarked.
 *
 * The glide animates only `transform` (the pill takes its new size at once and is scaled from
 * where it was), so it runs on the compositor: it stays smooth even while the click's work (a
 * 3D scene redrawing, a panel mounting) keeps the main thread busy.
 */
export function SegPill({ className }: { className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const pill = ref.current;
    const host = pill?.parentElement;
    if (!pill || !host) return;
    let shown = false;
    let raf = 0;
    let anim: Animation | null = null;
    let last = "";
    const reduced = () => typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    // glide when the selection changes; jump when the row's layout changes (resize, fonts)
    const place = (glide = true) => {
      const on = host.querySelector<HTMLElement>(ACTIVE);
      if (!on || on.offsetWidth === 0) {
        pill.style.opacity = "0";
        return;
      }
      const x = on.offsetLeft;
      const y = on.offsetTop;
      const w = on.offsetWidth;
      const h = on.offsetHeight;
      const at = `${x},${y},${w},${h}`;
      if (at === last) return;
      last = at;
      // where the pill is on screen now (mid-glide included), relative to the row
      const r = pill.getBoundingClientRect();
      const hr = host.getBoundingClientRect();
      const fromX = r.left - hr.left - host.clientLeft + host.scrollLeft;
      const fromY = r.top - hr.top - host.clientTop + host.scrollTop;
      const fromW = r.width;
      const fromH = r.height;
      anim?.cancel();
      anim = null;
      pill.style.width = `${w}px`;
      pill.style.height = `${h}px`;
      pill.style.transform = `translate(${x}px, ${y}px)`;
      pill.style.opacity = "1";
      if (!shown) {
        shown = true;
        host.classList.add("has-pill");
        return;
      }
      if (!glide || reduced() || !pill.animate || fromW < 1 || fromH < 1) return;
      anim = pill.animate(
        [{ transform: `translate(${fromX}px, ${fromY}px) scale(${fromW / w}, ${fromH / h})` }, { transform: `translate(${x}px, ${y}px)` }],
        { duration: GLIDE_MS, easing: EASE },
      );
    };
    const soon = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => place(false));
    };
    place(false);
    const mo = new MutationObserver(() => place());
    mo.observe(host, { subtree: true, childList: true, attributes: true, attributeFilter: ["class", "aria-selected", "aria-checked", "aria-pressed"] });
    const ro = new ResizeObserver(soon);
    ro.observe(host);
    for (const c of Array.from(host.children)) if (c !== pill) ro.observe(c);
    // web fonts or late layout: measure once more when everything has settled
    window.addEventListener("load", soon);
    document.fonts?.addEventListener?.("loadingdone", soon);
    return () => {
      mo.disconnect();
      ro.disconnect();
      cancelAnimationFrame(raf);
      anim?.cancel();
      window.removeEventListener("load", soon);
      document.fonts?.removeEventListener?.("loadingdone", soon);
      host.classList.remove("has-pill");
    };
  }, []);
  return <span ref={ref} className={className ? `seg-pill ${className}` : "seg-pill"} aria-hidden="true" />;
}
