"use client";

import type { Lang } from "@/lib/i18n";
import { setTheme, useTheme } from "@/lib/theme";

/** Light / dark: one button, a sun or a moon. */
export function ThemeSwitch({ lang }: { lang: Lang }) {
  const theme = useTheme();
  const dark = theme === "dark";
  const label = lang === "en" ? (dark ? "Light theme" : "Dark theme") : dark ? "浅色模式" : "深色模式";
  return (
    <button type="button" className="theme-switch" aria-label={label} title={label} aria-pressed={dark} onClick={() => setTheme(dark ? "light" : "dark")}>
      {/* both drawn; CSS shows the one for the theme, so the first paint is already right */}
      <svg className="ts-sun" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <circle cx="12" cy="12" r="4.2" />
        <path d="M12 2.8v2.1M12 19.1v2.1M2.8 12h2.1M19.1 12h2.1M5.5 5.5l1.5 1.5M17 17l1.5 1.5M5.5 18.5L7 17M17 7l1.5-1.5" />
      </svg>
      <svg className="ts-moon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
        <path d="M19.6 14.6A8 8 0 0 1 9.4 4.4a8 8 0 1 0 10.2 10.2Z" />
      </svg>
    </button>
  );
}
