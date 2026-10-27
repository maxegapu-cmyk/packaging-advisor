/**
 * Light (the default) and dark themes. The choice is kept in localStorage and applied as
 * `data-theme` on <html> by a tiny script in <head>, before the first paint, so a dark-theme
 * visitor never sees a flash of the light page.
 */
import { useSyncExternalStore } from "react";

export type Theme = "light" | "dark";
export const THEME_KEY = "pa-theme";

/** Inline in <head>: sets the theme before anything is drawn. */
export const THEME_SCRIPT = `(function(){var t="light";try{var v=localStorage.getItem("${THEME_KEY}");if(v==="dark"||v==="light")t=v}catch(e){}document.documentElement.setAttribute("data-theme",t)})();`;

export function currentTheme(): Theme {
  if (typeof document === "undefined") return "light";
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

export function setTheme(t: Theme) {
  const el = document.documentElement;
  // colours ease across, not snap (see .theme-fade in globals.css)
  el.classList.add("theme-fade");
  el.setAttribute("data-theme", t);
  window.setTimeout(() => el.classList.remove("theme-fade"), 450);
  try {
    localStorage.setItem(THEME_KEY, t);
  } catch {
    /* not remembered, which is fine */
  }
}

function subscribe(cb: () => void) {
  const mo = new MutationObserver(cb);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => mo.disconnect();
}

/** The theme now, kept current; "light" while rendering on the server. */
export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, currentTheme, () => "light");
}
