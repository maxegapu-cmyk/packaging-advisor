"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Direction } from "@/lib/board/schema";
import type { Pair } from "@/lib/i18n";
import { DEFAULT_PACK, type PackSpec } from "@/lib/pack";
import { Orbit } from "./pack/orbit";
import { Package3D } from "./pack/Package3D";
import { Stage3D } from "./pack/Stage3D";

export { REST_ANGLE, type Angle } from "./pack/orbit";

/* ------------------------------------------------------------------ Package structure */

type PackCtxValue = {
  spec: PackSpec;
  setSpec: (s: PackSpec) => void;
  saving: "idle" | "saving" | "saved" | "error";
  /** Link to the full-screen 3D space for a direction, when there is one. */
  studioHref?: (directionId: string) => string;
  /** The product's category: decides what jars and bottles are shown holding. */
  category?: string;
};
const PackCtx = createContext<PackCtxValue | null>(null);

export function usePack(): PackCtxValue {
  return useContext(PackCtx) ?? { spec: DEFAULT_PACK, setSpec: () => {}, saving: "idle" };
}

/**
 * Holds the package structure for every box below it. With `saveUrl`, changes are saved
 * (debounced) so the board, the 3D space and share links all show the same structure.
 */
export function PackProvider({ initial, saveUrl, studioBase, category, children }: { initial: PackSpec; saveUrl?: string; studioBase?: string; category?: string; children: ReactNode }) {
  const [spec, setLocal] = useState(initial);
  // a new starting pack (another sample) replaces the local one, without remounting the boxes:
  // their 3D scenes stay and only redraw, so switching samples does not rebuild WebGL contexts
  const [base, setBase] = useState(initial);
  if (base !== initial) {
    setBase(initial);
    setLocal(initial);
  }
  const [saving, setSaving] = useState<PackCtxValue["saving"]>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const setSpec = (s: PackSpec) => {
    setLocal(s);
    if (!saveUrl) return;
    clearTimeout(timer.current);
    setSaving("saving");
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(saveUrl, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(s) });
        setSaving(res.ok ? "saved" : "error");
      } catch {
        setSaving("error");
      }
    }, 500);
  };
  useEffect(() => () => clearTimeout(timer.current), []);
  const studioHref = studioBase ? (id: string) => `${studioBase}${studioBase.includes("?") ? "&" : "?"}d=${encodeURIComponent(id)}` : undefined;
  return <PackCtx.Provider value={{ spec, setSpec, saving, studioHref, category }}>{children}</PackCtx.Provider>;
}

/* ------------------------------------------------------------------ Rotate together */

type Sync = { orbit: Orbit; synced: boolean };
const SyncCtx = createContext<Sync | null>(null);

/** Lets several boxes share one camera, for side-by-side comparison. */
export function BoxSync({ children, label, hint, toolbar }: { children: ReactNode; label: string; hint: string; toolbar?: ReactNode }) {
  const [orbit] = useState(() => new Orbit(undefined, 1, { free: true }));
  const [synced, setSynced] = useState(true);
  return (
    <SyncCtx.Provider value={{ orbit, synced }}>
      <div className="sync-bar">
        <label className="switch">
          <input type="checkbox" checked={synced} onChange={(e) => setSynced(e.currentTarget.checked)} />
          <span className="switch-track" aria-hidden="true" />
          <span>{label}</span>
        </label>
        <span className="sync-hint">{hint}</span>
        {toolbar}
      </div>
      {children}
    </SyncCtx.Provider>
  );
}

const SPACE_LABEL: Pair = { zh: "3D 空间", en: "3D space" };

export function SpaceIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
      <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z" />
      <path d="M12 12l8-4.5M12 12v9M12 12L4 7.5" />
    </svg>
  );
}

/** A package on a board sheet or the landing page: drag to turn, shares the camera when synced. */
export function Box3D({ d, brand, label, fit = 200, spaceLabel = SPACE_LABEL, lang = "zh" }: { d: Direction; brand: string; label: string; fit?: number; spaceLabel?: Pair; lang?: "zh" | "en" }) {
  const sync = useContext(SyncCtx);
  const { spec, studioHref, category } = usePack();
  const [own] = useState(() => new Orbit(undefined, 1, { free: true }));
  const shared = !!sync?.synced;
  // When "rotate together" is switched off, each box starts from where the shared view was.
  useEffect(() => {
    if (sync && !sync.synced) own.set(sync.orbit.angle, sync.orbit.zoom);
  }, [sync?.synced]); // eslint-disable-line react-hooks/exhaustive-deps
  const orbit = shared && sync ? sync.orbit : own;
  const href = studioHref?.(d.id);
  return (
    <div className="box3d">
      <Stage3D orbit={orbit} label={label}>
        <Package3D d={d} brand={brand} spec={spec} fit={fit} orbit={orbit} category={category} />
      </Stage3D>
      {href ? (
        <a className="space-btn" href={href}>
          <SpaceIcon />
          {lang === "en" ? spaceLabel.en : spaceLabel.zh}
        </a>
      ) : null}
    </div>
  );
}
