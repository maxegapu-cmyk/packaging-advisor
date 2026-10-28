/**
 * The material library as stored for this deployment: the edits made on top of the principal's
 * list (see src/lib/materials/library.ts), one JSON document in the settings table. Reading it
 * also puts it in force for this server (setLibrary), so generation and checks use it.
 * Server-only.
 */
import { getDb, now } from "./db";
import { normalizeLibrary, setLibrary, type Library } from "./materials";

const KEY = "material_library";

export function loadLibrary(): Library {
  const row = getDb().prepare("SELECT value FROM settings WHERE key = ?").get(KEY) as { value: string } | undefined;
  const lib = row ? normalizeLibrary(row.value) : {};
  setLibrary(lib);
  return lib;
}

export function saveLibrary(v: unknown): Library {
  const lib = { ...normalizeLibrary(v), updatedAt: now() };
  getDb()
    .prepare("INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at")
    .run(KEY, JSON.stringify(lib), lib.updatedAt);
  setLibrary(lib);
  return lib;
}
