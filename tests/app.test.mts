/**
 * End-to-end through the service layer against a real SQLite file and a local
 * OpenAI-compatible HTTP server (no network, no Next.js).
 */
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pa-test-"));
process.env.DATA_DIR = tmp;
process.env.DATABASE_FILE = path.join(tmp, "app.db");
process.env.APP_SECRET = "test-secret-0123456789";
process.env.DEMO_DELAY_MS = "0";
process.env.DAILY_GENERATION_LIMIT = "5";

const { createInvites, signIn, sessionInvite, setInviteDisabled, ensureAdmin } = await import("../src/lib/auth");
const { decrypt, encrypt } = await import("../src/lib/crypto");
const { initApp } = await import("../src/lib/init");
const providers = await import("../src/lib/llm/providers");
const { addUpload, createProject, getBoard, listBoards, usageToday } = await import("../src/lib/projects");
const { generateBoard, reviseDirection, GenerationError } = await import("../src/lib/generate");
const { normalizeImage, UploadError } = await import("../src/lib/uploads");
const { DEMO_BOARD } = await import("../src/lib/llm/demo");
const { getDb } = await import("../src/lib/db");

// A fake model platform: first reply is broken JSON, the next is a valid board.
let replies: string[] = [];
let lastBody: any = null;
const server = http.createServer((req, res) => {
  let data = "";
  req.on("data", (c) => (data += c));
  req.on("end", () => {
    if (req.url?.endsWith("/models")) {
      res.end(JSON.stringify({ data: [{ id: "vision-model" }] }));
      return;
    }
    if (req.headers.authorization !== "Bearer sk-local") {
      res.statusCode = 401;
      res.end("bad key");
      return;
    }
    lastBody = JSON.parse(data);
    const text = replies.shift() ?? "{}";
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ choices: [{ message: { content: text } }], usage: { prompt_tokens: 10, completion_tokens: 20 } }));
  });
});
let baseUrl = "";

before(async () => {
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", () => r()));
  const addr = server.address() as { port: number };
  baseUrl = `http://127.0.0.1:${addr.port}/v1`;
  initApp();
});
after(() => {
  server.close();
  fs.rmSync(tmp, { recursive: true, force: true });
});

test("first start creates an admin invite and the offline demo platform", () => {
  const admins = getDb().prepare("SELECT COUNT(*) AS n FROM invites WHERE is_admin = 1").get() as { n: number };
  assert.equal(admins.n, 1);
  assert.equal(ensureAdmin(), null, "a second call does not create another admin");
  const choices = providers.listModelChoices();
  assert.equal(choices[0].providerName, "演示（离线）Demo (offline)");
});

test("invite codes sign in regardless of case and dashes; disabled codes stop working", () => {
  const [{ code, invite }] = createInvites(1, { label: "浙江卖家" });
  const s = signIn(code.toLowerCase().replace(/-/g, " "));
  assert.ok(s);
  assert.equal(sessionInvite(s!.token)?.id, invite.id);
  assert.equal(signIn("WRONG-CODE-0000"), null);
  setInviteDisabled(invite.id, true);
  assert.equal(sessionInvite(s!.token), null, "disabling a code ends its sessions");
  assert.equal(signIn(code), null);
});

test("API keys are encrypted at rest and masked in listings", () => {
  const blob = encrypt("sk-abcdefghijkl");
  assert.notEqual(blob, "sk-abcdefghijkl");
  assert.equal(decrypt(blob), "sk-abcdefghijkl");
  const tampered = blob.slice(0, -2) + (blob.endsWith("A") ? "B" : "A") + blob.slice(-1);
  assert.throws(() => decrypt(tampered));

  const id = providers.saveProvider({ name: "本地平台", kind: "openai", baseUrl: "https://example.com/v1", apiKey: "sk-abcdefghijkl" });
  const row = getDb().prepare("SELECT api_key_enc FROM providers WHERE id = ?").get(id) as { api_key_enc: string };
  assert.ok(!row.api_key_enc.includes("sk-abc"));
  const view = providers.listProviders().find((p) => p.id === id)!;
  assert.equal(view.keyHint, "sk-••••ijkl");
  providers.saveProvider({ id, name: "本地平台", kind: "openai", baseUrl: "https://example.com/v1", apiKey: "" });
  assert.equal(providers.listProviders().find((p) => p.id === id)!.keyHint, "sk-••••ijkl", "an empty key keeps the stored one");
  providers.deleteProvider(id);
  assert.throws(() => providers.saveProvider({ name: "x", kind: "openai", baseUrl: "ftp://bad" }));
});

test("uploads are decoded, resized and re-encoded; non-images are refused", async () => {
  const big = await sharp({ create: { width: 3000, height: 2000, channels: 4, background: { r: 30, g: 120, b: 80, alpha: 0.5 } } }).png().toBuffer();
  const out = await normalizeImage(big);
  const meta = await sharp(out).metadata();
  assert.equal(meta.format, "jpeg");
  assert.ok(Math.max(meta.width!, meta.height!) <= 1568);
  await assert.rejects(normalizeImage(Buffer.from("not an image")), UploadError);
});

test("demo platform: generate a board, then revise only the color of one direction", async () => {
  const [{ invite }] = createInvites(1, { label: "测试者" });
  const actor = { id: invite.id, isAdmin: false };
  const project = createProject(invite.id, { title: "明前龙井", category: "tea", brand: "山径", description: "杭州", mustText: "" });
  const img = await normalizeImage(await sharp({ create: { width: 400, height: 400, channels: 3, background: "#6F8A5E" } }).jpeg().toBuffer());
  addUpload(project.id, "product", "罐装", img);

  const board = await generateBoard(project.id, actor);
  assert.equal(board.version, 1);
  assert.equal(board.data.directions.length, 3);

  const revised = await reviseDirection(board.id, actor, { directionId: "B", dimension: "color", feedback: "太绿了" });
  assert.equal(revised.version, 2);
  const before = board.data.directions.find((d) => d.id === "B")!;
  const after = revised.data.directions.find((d) => d.id === "B")!;
  assert.notDeepEqual(after.palette, before.palette, "the palette changed");
  assert.equal(after.layout, before.layout, "the demo also proposed a new layout, but only color was merged");
  assert.deepEqual(after.anchor, before.anchor);
  assert.deepEqual(revised.data.directions[0], board.data.directions[0], "other directions are untouched");
  assert.equal(listBoards(project.id).length, 2);
  assert.equal(usageToday(invite.id), 2);
});

test("OpenAI-compatible platform: images are sent to vision models and a broken reply is repaired once", async () => {
  const pid = providers.saveProvider({ name: "本地兼容平台", kind: "openai", baseUrl, apiKey: "sk-local" });
  providers.addModel({ providerId: pid, model: "vision-model", label: "看图模型", vision: true });
  const model = providers.listProviders().find((p) => p.id === pid)!.models[0];
  assert.deepEqual(await providers.providerClient(pid).listModels(), ["vision-model"]);

  const [{ invite }] = createInvites(1);
  const actor = { id: invite.id, isAdmin: false };
  const project = createProject(invite.id, { title: "护手霜", category: "cosmetics", brand: "", description: "", mustText: "医用级修护" });
  const img = await normalizeImage(await sharp({ create: { width: 200, height: 200, channels: 3, background: "#ffffff" } }).jpeg().toBuffer());
  addUpload(project.id, "product", "", img);
  addUpload(project.id, "reference", "喜欢留白", img);

  replies = ['{"directions": [', "好的：\n```json\n" + JSON.stringify(DEMO_BOARD) + "\n```"];
  const board = await generateBoard(project.id, actor, model.id);
  assert.equal(board.data.directions.length, 3);
  assert.equal(board.modelLabel, "本地兼容平台 · 看图模型");
  // The repair call carries the original images plus the error feedback.
  const userParts = lastBody.messages[1].content;
  assert.equal(userParts.filter((p: any) => p.type === "image_url").length, 2);
  assert.match(lastBody.messages.at(-1).content, /JSON/);
  assert.match(lastBody.messages[0].content, /packaging-visual-direction/);
  assert.match(userParts[0].text, /医用级修护/);

  // A model without vision gets text only.
  providers.updateModel(model.id, { vision: false });
  replies = [JSON.stringify(DEMO_BOARD)];
  await generateBoard(project.id, actor, model.id);
  assert.equal(lastBody.messages[1].content.filter((p: any) => p.type === "image_url").length, 0);
  assert.match(lastBody.messages[1].content[0].text, /cannot see images/);
});

test("a wrong API key becomes a clear message and is logged as a failure", async () => {
  const pid = providers.saveProvider({ name: "错误密钥", kind: "openai", baseUrl, apiKey: "sk-wrong" });
  providers.addModel({ providerId: pid, model: "m", vision: true });
  const modelId = providers.listProviders().find((p) => p.id === pid)!.models[0].id;
  const [{ invite }] = createInvites(1);
  const project = createProject(invite.id, { title: "电热水壶", category: "appliance", brand: "", description: "", mustText: "" });
  await assert.rejects(generateBoard(project.id, { id: invite.id, isAdmin: false }, modelId), (e: unknown) => e instanceof GenerationError && /API key/.test((e as Error).message));
  const failed = getDb().prepare("SELECT COUNT(*) AS n FROM events WHERE invite_id = ? AND type = 'generate_failed'").get(invite.id) as { n: number };
  assert.equal(failed.n, 1);
});

test("the daily limit stops testers but not admins", async () => {
  const [{ invite }] = createInvites(1);
  const project = createProject(invite.id, { title: "笋干", category: "specialty", brand: "", description: "", mustText: "" });
  for (let i = 0; i < 5; i++) await generateBoard(project.id, { id: invite.id, isAdmin: false });
  await assert.rejects(generateBoard(project.id, { id: invite.id, isAdmin: false }), /limit/);
  const ok = await generateBoard(project.id, { id: invite.id, isAdmin: true });
  assert.equal(getBoard(ok.id)?.version, 6);
});

test("package structure defaults by category and saves only valid values", async () => {
  const { setPack, getProject } = await import("../src/lib/projects");
  const [{ invite }] = createInvites(1);
  const tea = createProject(invite.id, { title: "龙井", category: "tea", brand: "", description: "", mustText: "" });
  assert.equal(tea.pack.form, "tin");
  const appliance = createProject(invite.id, { title: "电水壶", category: "appliance", brand: "", description: "", mustText: "" });
  assert.equal(appliance.pack.form, "carton");

  const saved = setPack(tea.id, { form: "gift", w: 9999, h: "120", d: -4, finish: "chrome" });
  assert.deepEqual(saved, { form: "gift", w: 500, h: 120, d: 30, finish: "matte" });
  assert.deepEqual(getProject(tea.id)!.pack, saved);

  // A tin's depth always equals its diameter.
  assert.equal(setPack(tea.id, { form: "tin", w: 90, h: 130, d: 40 }).d, 90);
});
