/**
 * The material library's storage and history, and supplier documents, against a real SQLite file.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pa-store-"));
process.env.DATA_DIR = tmp;
process.env.DATABASE_FILE = path.join(tmp, "app.db");
process.env.APP_SECRET = "test-secret-0123456789";

const { loadLibrary, saveLibrary, loadHistory, restoreLibrary } = await import("../src/lib/materialsStore");
const { material } = await import("../src/lib/materials");
const { createInvites, ensureAdmin } = await import("../src/lib/auth");
const { initApp } = await import("../src/lib/init");
const { addDocument, createProject, deleteDocument, listDocuments, listUploads, updateDocument } = await import("../src/lib/projects");
const { normalizeDocument } = await import("../src/lib/uploads");

test("library: saves put it in force, history keeps who and what, restore goes back", () => {
  assert.deepEqual(loadLibrary(), {});
  saveLibrary({ materials: { M019: { name: { zh: "测试纸", en: "Test paper" } } } }, "alice");
  assert.equal(material("M019")!.name.zh, "测试纸");
  saveLibrary({ ...loadLibrary(), limits: { cost: 18 } }, "bob");
  const h = loadHistory();
  // newest first, plus the library before the first change
  assert.deepEqual(h.map((e) => e.by), ["bob", "alice", ""]);
  assert.match(h[0].summary.zh, /核算限值/);
  assert.match(h[1].summary.zh, /M019/);
  // nothing changed, nothing recorded
  saveLibrary(loadLibrary(), "carol");
  assert.equal(loadHistory().length, 3);
  const back = restoreLibrary(h[2].at, "dave");
  assert.deepEqual(back && { ...back, updatedAt: undefined }, { updatedAt: undefined });
  assert.equal(material("M019")!.name.zh, "单面铜版纸");
  assert.equal(loadHistory()[0].by.startsWith("dave"), true);
  assert.equal(restoreLibrary("1999-01-01T00:00:00.000Z"), null);
});

test("supplier documents: stored with the project, kept out of the model's uploads", async () => {
  initApp();
  ensureAdmin();
  const [{ invite }] = createInvites(1, { label: "t" });
  const p = createProject(invite.id, { title: "茶", category: "tea", brand: "", description: "", mustText: "" });
  const pdf = await normalizeDocument(Buffer.from("%PDF-1.4\n%%EOF\n"));
  assert.equal(pdf.ext, "pdf");
  await assert.rejects(() => normalizeDocument(Buffer.from("not a file")));
  const d = addDocument(p.id, pdf, { type: "test", title: "迁移检测", parts: ["inner.body"], materials: ["M099"], rules: ["F05"], expires: "2030-01-01" });
  assert.equal(listDocuments(p.id).length, 1);
  assert.equal(listUploads(p.id).length, 0);
  assert.ok(updateDocument(p.id, d.id, { ...d, number: "R-1" }));
  assert.equal(listDocuments(p.id)[0].number, "R-1");
  assert.ok(deleteDocument(p.id, d.id));
  assert.equal(listDocuments(p.id).length, 0);
});
