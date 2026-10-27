"use client";

import { useLayoutEffect, useRef } from "react";

const ACTIVE = ':scope > [aria-selected="true"], :scope > [aria-checked="true"], :scope > [aria-pressed="true"], :scope > .is-active, :scope > .is-on';

/**
 * The sliding highlight of a segmented control or tab row. Put it as the first child of the
 * row (which gets `position: relative`); it finds the selected item (aria-selected, -checked,
 * -pressed, or .is-active / .is-on) and glides to it whenever the selection or the layout
 * changes. Until it has measured (or without JavaScript) the selected item keeps its own
 * highlight, so nothing is ever unmarked.
 */
export function SegPill({ className }: { className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const pill = ref.current;
    const host = pill?.parentElement;
    if (!pill || !host) return;
    let first = true;
    let raf = 0;
    const place = () => {
      const on = host.querySelector<HTMLElement>(ACTIVE);
      if (!on || on.offsetWidth === 0) {
        pill.style.opacity = "0";
        return;
      }
      if (first) pill.style.transition = "none";
      pill.style.opacity = "1";
      pill.style.width = `${on.offsetWidth}px`;
      pill.style.height = `${on.offsetHeight}px`;
      pill.style.transform = `translate(${on.offsetLeft}px, ${on.offsetTop}px)`;
      if (first) {
        void pill.offsetWidth;
        pill.style.transition = "";
        first = false;
        host.classList.add("has-pill");
      }
    };
    const soon = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(place);
    };
    place();
    const mo = new MutationObserver(place);
    mo.observe(host, { subtree: true, childList: true, attributes: true, attributeFilter: ["class", "aria-selected", "aria-checked", "aria-pressed"] });
    const ro = new ResizeObserver(soon);
    ro.observe(host);
    for (const c of Array.from(host.children)) if (c !== pill) ro.observe(c);
    // web fonts or late layout: measure once more when everything has settled
    window.addEventListener("load", soon);
    return () => {
      mo.disconnect();
      ro.disconnect();
      cancelAnimationFrame(raf);
      window.removeEventListener("load", soon);
      host.classList.remove("has-pill");
    };
  }, []);
  return <span ref={ref} className={className ? `seg-pill ${className}` : "seg-pill"} aria-hidden="true" />;
}
