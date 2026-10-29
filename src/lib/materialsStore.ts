/**
 * The material library as stored for this deployment: the edits made on top of the principal's
 * list (see src/lib/materials/library.ts), one JSON document in the settings table, with every
 * earlier version kept in a history (who, when, what changed) so a change can be undone. Reading
 * the library also puts it in force for this server (setLibrary), so generation and checks use it.
 * Server-only.
 */
import { getDb, now } from "./db";
import { baseline, diffLibraries, diffText, normalizeLibrary, setLibrary, type HistoryEntry, type Library } from "./materials";

const KEY = "material_library";
const HISTORY = "material_library_history";
/** How many earlier versions are kept. */
const KEEP = 60;

function read(key: string): string | null {
  const row = getDb().prepare("SELECT value FROM settings WHERE key = ?").get(key) as { value: string } | undefined;
  return row?.value ?? null;
}
function write(key: string, value: string) {
  getDb()
    .prepare("INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at")
    .run(key, value, now());
}

export function loadLibrary(): Library {
  const raw = read(KEY);
  const lib = raw ? normalizeLibrary(raw) : {};
  setLibrary(lib);
  return lib;
}

/** The saved versions, newest first; each is the library as it stood after that save. */
export function loadHistory(): HistoryEntry[] {
  const raw = read(HISTORY);
  if (!raw) return [];
  try {
    const list = JSON.parse(raw) as HistoryEntry[];
    return Array.isArray(list) ? list.map((e) => ({ ...e, library: normalizeLibrary(e.library) })) : [];
  } catch {
    return [];
  }
}

/** Saves a library, recording who saved it and what changed. */
export function saveLibrary(v: unknown, by = ""): Library {
  const before = loadLibrary();
  const lib = { ...normalizeLibrary(v), updatedAt: now() };
  const d = diffLibraries(before, lib);
  write(KEY, JSON.stringify(lib));
  if (d.count) {
    const entry: HistoryEntry = { at: lib.updatedAt, by: by.slice(0, 60), summary: { zh: diffText(d, "zh"), en: diffText(d, "en") }, library: lib };
    const past = loadHistory();
    // the first change also keeps the library as it was before, so it can be gone back to
    if (!past.length) past.push(baseline(before, lib.updatedAt));
    write(HISTORY, JSON.stringify([entry, ...past].slice(0, KEEP)));
  }
  setLibrary(lib);
  return lib;
}

/** Puts an earlier version back (as a new save, so the restore itself can be undone). */
export function restoreLibrary(at: string, by = ""): Library | null {
  const entry = loadHistory().find((e) => e.at === at);
  if (!entry) return null;
  return saveLibrary(entry.library, `${by}（恢复到 ${at.slice(0, 16).replace("T", " ")} 的版本 restored）`);
}
