import { getDb, now } from "./db";
import { randomId, randomToken } from "./crypto";
import type { Artwork } from "./artwork";
import type { Board } from "./board/schema";
import { isCategory, type Category } from "./categories";
import { readUpload, writeUpload } from "./uploads";
import { defaultPack, normalizePack, type PackSpec } from "./pack";

export type Project = { id: string; inviteId: number; title: string; category: Category; itemType: string; brand: string; description: string; mustText: string; pack: PackSpec; createdAt: string };
export type Upload = { id: string; projectId: string; kind: "product" | "reference" | "logo" | "proof"; note: string; file: string; mime: string };
export type BoardRecord = { id: string; projectId: string; version: number; data: Board; modelLabel: string; note: string; shareToken: string | null; picked: string | null; createdAt: string };

type ProjectRow = { id: string; invite_id: number; title: string; category: string; item_type?: string; brand: string; description: string; must_text: string; pack?: string; artwork?: string | null; created_at: string };
type BoardRow = { id: string; project_id: string; version: number; data: string; model_label: string; note: string; share_token: string | null; picked: string | null; created_at: string };

const toProject = (r: ProjectRow): Project => ({ id: r.id, inviteId: r.invite_id, title: r.title, category: isCategory(r.category) ? r.category : "other", itemType: r.item_type ?? "", brand: r.brand, description: r.description, mustText: r.must_text, pack: normalizePack(r.pack, defaultPack(r.category)), createdAt: r.created_at });
const toBoard = (r: BoardRow): BoardRecord => ({ id: r.id, projectId: r.project_id, version: r.version, data: JSON.parse(r.data), modelLabel: r.model_label, note: r.note, shareToken: r.share_token, picked: r.picked, createdAt: r.created_at });

export function createProject(inviteId: number, p: { title: string; category: Category; itemType?: string; brand: string; description: string; mustText: string }): Project {
  const id = randomId();
  getDb()
    .prepare("INSERT INTO projects (id, invite_id, title, category, item_type, brand, description, must_text, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .run(id, inviteId, p.title.slice(0, 80), p.category, (p.itemType ?? "").slice(0, 40), p.brand.slice(0, 60), p.description.slice(0, 2000), p.mustText.slice(0, 2000), now());
  return getProject(id)!;
}

export function getProject(id: string): Project | null {
  const r = getDb().prepare("SELECT * FROM projects WHERE id = ?").get(id) as ProjectRow | undefined;
  return r ? toProject(r) : null;
}

/** Saves the package structure (form, size, finish) shown on the boards of this product. */
export function setPack(projectId: string, spec: unknown): PackSpec {
  const project = getProject(projectId);
  if (!project) throw new Error("project not found");
  const pack = normalizePack(spec, project.pack);
  getDb().prepare("UPDATE projects SET pack = ? WHERE id = ?").run(JSON.stringify(pack), projectId);
  return pack;
}

/** The saved artwork as stored (validate it against a board before use), or null. */
export function getArtworkRaw(projectId: string): unknown {
  const r = getDb().prepare("SELECT artwork FROM projects WHERE id = ?").get(projectId) as { artwork: string | null } | undefined;
  if (!r?.artwork) return null;
  try {
    return JSON.parse(r.artwork);
  } catch {
    return null;
  }
}

export function setArtwork(projectId: string, artwork: Artwork): Artwork {
  getDb().prepare("UPDATE projects SET artwork = ? WHERE id = ?").run(JSON.stringify(artwork), projectId);
  return artwork;
}

/** Testers only see their own projects; admins see all. */
export function canAccess(project: Project | null, invite: { id: number; isAdmin: boolean }): project is Project {
  return !!project && (invite.isAdmin || project.inviteId === invite.id);
}

export type ProjectSummary = Project & { boardCount: number; latestBoardId: string | null; picked: string | null; handedOff: boolean; thumbId: string | null };

export function listProjects(inviteId: number | null): ProjectSummary[] {
  const rows = getDb()
    .prepare(
      `SELECT p.*, (SELECT COUNT(*) FROM boards b WHERE b.project_id = p.id) AS board_count,
              (SELECT b.id FROM boards b WHERE b.project_id = p.id ORDER BY b.version DESC LIMIT 1) AS latest_board_id,
              (SELECT b.picked FROM boards b WHERE b.project_id = p.id AND b.picked IS NOT NULL ORDER BY b.version DESC LIMIT 1) AS picked,
              EXISTS (SELECT 1 FROM events e WHERE e.project_id = p.id AND e.type IN ('handoff', 'export')) AS handed_off,
              (SELECT u.id FROM uploads u WHERE u.project_id = p.id AND u.kind = 'product' ORDER BY u.created_at LIMIT 1) AS thumb_id
       FROM projects p ${inviteId === null ? "" : "WHERE p.invite_id = ?"} ORDER BY p.created_at DESC`,
    )
    .all(...(inviteId === null ? [] : [inviteId])) as (ProjectRow & { board_count: number; latest_board_id: string | null; picked: string | null; handed_off: number; thumb_id: string | null })[];
  return rows.map((r) => ({ ...toProject(r), boardCount: r.board_count, latestBoardId: r.latest_board_id, picked: r.picked, handedOff: !!r.handed_off, thumbId: r.thumb_id }));
}

/** Whether a product has been handed to a designer or printer (the last step). */
export function isHandedOff(projectId: string): boolean {
  return !!getDb().prepare("SELECT 1 FROM events WHERE project_id = ? AND type IN ('handoff', 'export') LIMIT 1").get(projectId);
}

export function addUpload(projectId: string, kind: "product" | "reference", note: string, jpeg: Buffer): Upload {
  const id = randomId();
  const file = writeUpload(id, jpeg);
  getDb().prepare("INSERT INTO uploads (id, project_id, kind, note, file, mime, created_at) VALUES (?, ?, ?, ?, ?, 'image/jpeg', ?)").run(id, projectId, kind, note.slice(0, 200), file, now());
  return { id, projectId, kind, note, file, mime: "image/jpeg" };
}

/** A photo of the printed sample, for comparing it with the render. */
export function addProofPhoto(projectId: string, jpeg: Buffer): Upload {
  const id = randomId();
  const file = writeUpload(id, jpeg);
  getDb().prepare("INSERT INTO uploads (id, project_id, kind, note, file, mime, created_at) VALUES (?, ?, 'proof', '', ?, 'image/jpeg', ?)").run(id, projectId, file, now());
  return { id, projectId, kind: "proof", note: "", file, mime: "image/jpeg" };
}

/** A logo for the artwork, stored as PNG so its transparency survives. */
export function addLogo(projectId: string, png: Buffer): Upload {
  const id = randomId();
  const file = writeUpload(id, png, "png");
  getDb().prepare("INSERT INTO uploads (id, project_id, kind, note, file, mime, created_at) VALUES (?, ?, 'logo', '', ?, 'image/png', ?)").run(id, projectId, file, now());
  return { id, projectId, kind: "logo", note: "", file, mime: "image/png" };
}

export function listUploads(projectId: string): Upload[] {
  // product photos and references only: logos belong to the artwork, not to the model's input
  return (getDb().prepare("SELECT id, project_id, kind, note, file, mime FROM uploads WHERE project_id = ? AND kind NOT IN ('logo', 'proof') ORDER BY created_at, rowid").all(projectId) as any[]).map((r) => ({
    id: r.id, projectId: r.project_id, kind: r.kind, note: r.note, file: r.file, mime: r.mime,
  }));
}

export function getUpload(id: string): Upload | null {
  const r = getDb().prepare("SELECT id, project_id, kind, note, file, mime FROM uploads WHERE id = ?").get(id) as any;
  return r ? { id: r.id, projectId: r.project_id, kind: r.kind, note: r.note, file: r.file, mime: r.mime } : null;
}

export function uploadBase64(u: Upload): string {
  return readUpload(u.file).toString("base64");
}

export function saveBoard(projectId: string, data: Board, modelLabel: string, note = ""): BoardRecord {
  const db = getDb();
  const v = (db.prepare("SELECT COALESCE(MAX(version), 0) AS v FROM boards WHERE project_id = ?").get(projectId) as { v: number }).v + 1;
  const id = randomId();
  db.prepare("INSERT INTO boards (id, project_id, version, data, model_label, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").run(id, projectId, v, JSON.stringify(data), modelLabel, note.slice(0, 200), now());
  return getBoard(id)!;
}

export function getBoard(id: string): BoardRecord | null {
  const r = getDb().prepare("SELECT * FROM boards WHERE id = ?").get(id) as BoardRow | undefined;
  return r ? toBoard(r) : null;
}

export function listBoards(projectId: string): Omit<BoardRecord, "data">[] {
  return (getDb().prepare("SELECT id, project_id, version, model_label, note, share_token, picked, created_at, '{}' AS data FROM boards WHERE project_id = ? ORDER BY version DESC").all(projectId) as BoardRow[]).map((r) => {
    const { data: _ignored, ...rest } = toBoard(r);
    return rest;
  });
}

export function getBoardByShareToken(token: string): BoardRecord | null {
  if (!token || token.length < 16) return null;
  const r = getDb().prepare("SELECT * FROM boards WHERE share_token = ?").get(token) as BoardRow | undefined;
  return r ? toBoard(r) : null;
}

export function enableShare(boardId: string): string {
  const existing = getBoard(boardId)?.shareToken;
  if (existing) return existing;
  const token = randomToken(18);
  getDb().prepare("UPDATE boards SET share_token = ? WHERE id = ?").run(token, boardId);
  return token;
}

export function disableShare(boardId: string) {
  getDb().prepare("UPDATE boards SET share_token = NULL WHERE id = ?").run(boardId);
}

export function setPicked(boardId: string, directionId: string | null) {
  getDb().prepare("UPDATE boards SET picked = ? WHERE id = ?").run(directionId, boardId);
}

export type EventType = "generate" | "generate_failed" | "revise" | "revise_failed" | "pick" | "share" | "feedback" | "handoff" | "export";

export function logEvent(e: { inviteId: number | null; projectId?: string; boardId?: string; type: EventType; payload?: Record<string, unknown> }) {
  getDb()
    .prepare("INSERT INTO events (invite_id, project_id, board_id, type, payload, created_at) VALUES (?, ?, ?, ?, ?, ?)")
    .run(e.inviteId, e.projectId ?? null, e.boardId ?? null, e.type, JSON.stringify(e.payload ?? {}), now());
}

/** Generations and revisions today (UTC day) for one tester. */
export function usageToday(inviteId: number): number {
  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  const r = getDb().prepare("SELECT COUNT(*) AS n FROM events WHERE invite_id = ? AND type IN ('generate','revise','generate_failed','revise_failed') AND created_at >= ?").get(inviteId, since.toISOString()) as { n: number };
  return r.n;
}

export function dailyLimit(): number {
  return Number(process.env.DAILY_GENERATION_LIMIT || 30);
}

export type TesterStats = { inviteId: number; label: string; codeHint: string; lastUsedAt: string | null; projects: number; boards: number; picks: number; handoffs: number; failures: number; feedback: number };

export function testerStats(): TesterStats[] {
  return getDb()
    .prepare(
      `SELECT i.id AS invite_id, i.label, i.code_hint, i.last_used_at,
         (SELECT COUNT(*) FROM projects p WHERE p.invite_id = i.id) AS projects,
         (SELECT COUNT(*) FROM events e WHERE e.invite_id = i.id AND e.type IN ('generate','revise')) AS boards,
         (SELECT COUNT(*) FROM events e WHERE e.invite_id = i.id AND e.type = 'pick') AS picks,
         (SELECT COUNT(*) FROM events e WHERE e.invite_id = i.id AND e.type IN ('handoff','export')) AS handoffs,
         (SELECT COUNT(*) FROM events e WHERE e.invite_id = i.id AND e.type IN ('generate_failed','revise_failed')) AS failures,
         (SELECT COUNT(*) FROM events e WHERE e.invite_id = i.id AND e.type = 'feedback') AS feedback
       FROM invites i WHERE i.is_admin = 0 ORDER BY i.id`,
    )
    .all()
    .map((r: any) => ({ inviteId: r.invite_id, label: r.label, codeHint: r.code_hint, lastUsedAt: r.last_used_at, projects: r.projects, boards: r.boards, picks: r.picks, handoffs: r.handoffs, failures: r.failures, feedback: r.feedback }));
}

export function recentFeedback(limit = 50): { createdAt: string; label: string; projectTitle: string; text: string; rating: number | null }[] {
  return (getDb()
    .prepare(
      `SELECT e.created_at, e.payload, i.label, p.title FROM events e
       LEFT JOIN invites i ON i.id = e.invite_id LEFT JOIN projects p ON p.id = e.project_id
       WHERE e.type = 'feedback' ORDER BY e.created_at DESC LIMIT ?`,
    )
    .all(limit) as any[]).map((r) => {
    const p = JSON.parse(r.payload || "{}");
    return { createdAt: r.created_at, label: r.label ?? "", projectTitle: r.title ?? "", text: String(p.text ?? ""), rating: typeof p.rating === "number" ? p.rating : null };
  });
}
