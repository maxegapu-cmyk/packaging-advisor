/**
 * The product list's progress comes from one query: boards made, direction picked,
 * handed off, first product photo. Walk a product through all four steps against a real
 * SQLite file and check each one shows up.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pa-journey-"));
process.env.DATA_DIR = tmp;
process.env.DATABASE_FILE = path.join(tmp, "app.db");
process.env.APP_SECRET = "test-secret-0123456789";

const { createInvites } = await import("../src/lib/auth");
const { addUpload, createProject, getProject, isHandedOff, listProjects, logEvent, saveBoard, setPicked } = await import("../src/lib/projects");
const { adaptSample } = await import("../src/lib/samples");

test("a product moves through upload, compare, proof and hand-off", () => {
  const [{ invite }] = createInvites(1, { label: "journey" });
  const p = createProject(invite.id, { title: "手工香皂", category: "other", itemType: "香皂", brand: "", description: "", mustText: "" });
  assert.equal(getProject(p.id)?.itemType, "香皂");
  assert.equal(getProject(p.id)?.category, "other");

  let s = listProjects(invite.id).find((x) => x.id === p.id)!;
  assert.equal(s.boardCount, 0);
  assert.equal(s.picked, null);
  assert.equal(s.handedOff, false);
  assert.equal(s.thumbId, null);

  const up = addUpload(p.id, "product", "front", Buffer.from([0xff, 0xd8, 0xff, 0xd9]));
  addUpload(p.id, "reference", "", Buffer.from([0xff, 0xd8, 0xff, 0xd9]));
  const board = saveBoard(p.id, adaptSample("other", { title: "手工香皂", brand: "" }), "demo");
  s = listProjects(invite.id).find((x) => x.id === p.id)!;
  assert.equal(s.boardCount, 1);
  assert.equal(s.latestBoardId, board.id);
  assert.equal(s.thumbId, up.id, "the thumbnail is the first product photo, not a reference");

  setPicked(board.id, "B");
  logEvent({ inviteId: invite.id, projectId: p.id, boardId: board.id, type: "handoff", payload: { picked: "B" } });
  s = listProjects(invite.id).find((x) => x.id === p.id)!;
  assert.equal(s.picked, "B");
  assert.equal(s.handedOff, true);
  assert.equal(isHandedOff(p.id), true);

  // Testers only see their own products; admins (null) see everyone's.
  const [{ invite: other }] = createInvites(1, { label: "other" });
  assert.equal(listProjects(other.id).length, 0);
  assert.ok(listProjects(null).some((x) => x.id === p.id));
});
