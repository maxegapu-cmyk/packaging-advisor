/**
 * Where a project's supplier documents live: the app's API for a signed-in product, or the browser
 * (details kept in local storage, files for this page only) for samples and the preview.
 */
import type { DocMeta, SupplierDoc } from "@/lib/compliance/documents";
import { normalizeDocMeta } from "@/lib/compliance/documents";

export type DocStore = {
  list(): Promise<SupplierDoc[]>;
  add(file: File, meta: DocMeta): Promise<SupplierDoc>;
  update(id: string, meta: DocMeta): Promise<void>;
  remove(id: string): Promise<void>;
  /** files are kept only while the page is open */
  local?: boolean;
};

async function ok(res: Response) {
  if (!res.ok) {
    const j = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(j?.error ?? `HTTP ${res.status}`);
  }
  return res;
}

export function urlDocStore(url: string): DocStore {
  return {
    list: async () => (await ok(await fetch(url))).json(),
    add: async (file, meta) => {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("meta", JSON.stringify(meta));
      return (await ok(await fetch(url, { method: "POST", body: fd }))).json();
    },
    update: async (id, meta) => {
      await ok(await fetch(url, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, meta }) }));
    },
    remove: async (id) => {
      await ok(await fetch(`${url}?doc=${encodeURIComponent(id)}`, { method: "DELETE" }));
    },
  };
}

const files = new Map<string, string>();

/** Documents kept in this browser: their details in local storage under `key`, the files in memory. */
export function memoryDocStore(key: string): DocStore {
  const read = (): SupplierDoc[] => {
    try {
      const raw = JSON.parse(localStorage.getItem(key) ?? "[]") as SupplierDoc[];
      return raw.flatMap((d) => {
        const m = normalizeDocMeta(d);
        return m && typeof d.id === "string" ? [{ ...m, id: d.id, mime: d.mime, addedAt: d.addedAt, url: files.get(d.id) }] : [];
      });
    } catch {
      return [];
    }
  };
  const write = (list: SupplierDoc[]) => {
    try {
      localStorage.setItem(key, JSON.stringify(list.map(({ url: _u, ...d }) => d))); // eslint-disable-line @typescript-eslint/no-unused-vars
    } catch {
      /* storage unavailable: kept for this page */
    }
  };
  return {
    local: true,
    list: async () => read(),
    add: async (file, meta) => {
      const id = `local-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
      files.set(id, URL.createObjectURL(file));
      const doc: SupplierDoc = { ...meta, id, mime: file.type, addedAt: new Date().toISOString(), url: files.get(id) };
      write([...read(), doc]);
      return doc;
    },
    update: async (id, meta) => write(read().map((d) => (d.id === id ? { ...d, ...meta } : d))),
    remove: async (id) => write(read().filter((d) => d.id !== id)),
  };
}
