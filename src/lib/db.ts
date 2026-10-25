/**
 * SQLite storage via Node's built-in `node:sqlite` (Node >= 22.13): no native dependency to build.
 * One file under DATA_DIR; uploads live next to it.
 */
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

export function dataDir(): string {
  const dir = process.env.DATA_DIR || path.join(process.cwd(), "data");
  fs.mkdirSync(path.join(dir, "uploads"), { recursive: true });
  return dir;
}

const MIGRATIONS: string[] = [
  `CREATE TABLE IF NOT EXISTS invites (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     code_hash TEXT NOT NULL UNIQUE,
     code_hint TEXT NOT NULL,
     label TEXT NOT NULL DEFAULT '',
     is_admin INTEGER NOT NULL DEFAULT 0,
     disabled INTEGER NOT NULL DEFAULT 0,
     created_at TEXT NOT NULL,
     last_used_at TEXT
   );
   CREATE TABLE IF NOT EXISTS sessions (
     token_hash TEXT PRIMARY KEY,
     invite_id INTEGER NOT NULL REFERENCES invites(id),
     created_at TEXT NOT NULL,
     expires_at TEXT NOT NULL
   );
   CREATE TABLE IF NOT EXISTS providers (
     id TEXT PRIMARY KEY,
     name TEXT NOT NULL,
     kind TEXT NOT NULL,
     base_url TEXT NOT NULL,
     api_key_enc TEXT NOT NULL DEFAULT '',
     enabled INTEGER NOT NULL DEFAULT 1,
     created_at TEXT NOT NULL
   );
   CREATE TABLE IF NOT EXISTS models (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     provider_id TEXT NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
     model TEXT NOT NULL,
     label TEXT NOT NULL,
     vision INTEGER NOT NULL DEFAULT 0,
     enabled INTEGER NOT NULL DEFAULT 1,
     is_default INTEGER NOT NULL DEFAULT 0,
     UNIQUE(provider_id, model)
   );
   CREATE TABLE IF NOT EXISTS projects (
     id TEXT PRIMARY KEY,
     invite_id INTEGER NOT NULL REFERENCES invites(id),
     title TEXT NOT NULL,
     category TEXT NOT NULL,
     brand TEXT NOT NULL DEFAULT '',
     description TEXT NOT NULL DEFAULT '',
     must_text TEXT NOT NULL DEFAULT '',
     created_at TEXT NOT NULL
   );
   CREATE TABLE IF NOT EXISTS uploads (
     id TEXT PRIMARY KEY,
     project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
     kind TEXT NOT NULL,
     note TEXT NOT NULL DEFAULT '',
     file TEXT NOT NULL,
     mime TEXT NOT NULL,
     created_at TEXT NOT NULL
   );
   CREATE TABLE IF NOT EXISTS boards (
     id TEXT PRIMARY KEY,
     project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
     version INTEGER NOT NULL,
     data TEXT NOT NULL,
     model_label TEXT NOT NULL DEFAULT '',
     note TEXT NOT NULL DEFAULT '',
     share_token TEXT UNIQUE,
     picked TEXT,
     created_at TEXT NOT NULL
   );
   CREATE TABLE IF NOT EXISTS events (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     invite_id INTEGER,
     project_id TEXT,
     board_id TEXT,
     type TEXT NOT NULL,
     payload TEXT NOT NULL DEFAULT '{}',
     created_at TEXT NOT NULL
   );
   CREATE INDEX IF NOT EXISTS idx_events_invite ON events(invite_id, type, created_at);
   CREATE INDEX IF NOT EXISTS idx_boards_project ON boards(project_id, version);`,
  // v2: package structure (form, size, finish) per product, as JSON. Empty = category default.
  `ALTER TABLE projects ADD COLUMN pack TEXT NOT NULL DEFAULT '';`,
];

let db: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (db) return db;
  const file = process.env.DATABASE_FILE || path.join(dataDir(), "app.db");
  db = new DatabaseSync(file);
  db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
  db.exec("CREATE TABLE IF NOT EXISTS schema_version (v INTEGER NOT NULL)");
  const row = db.prepare("SELECT v FROM schema_version").get() as { v: number } | undefined;
  let v = row?.v ?? 0;
  if (!row) db.prepare("INSERT INTO schema_version (v) VALUES (0)").run();
  while (v < MIGRATIONS.length) {
    db.exec(MIGRATIONS[v]);
    v += 1;
    db.prepare("UPDATE schema_version SET v = ?").run(v);
  }
  return db;
}

/** For tests: point at a fresh database. */
export function resetDbForTests(file: string) {
  db?.close();
  db = null;
  process.env.DATABASE_FILE = file;
}

export const now = () => new Date().toISOString();
