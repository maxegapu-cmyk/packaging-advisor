/**
 * Invite-code sign-in. Each tester gets one code; the code is their login.
 * A session cookie (random token, stored hashed) keeps them signed in for SESSION_DAYS.
 * Framework-agnostic: Next.js pages read/write the cookie and call these helpers.
 */
import { getDb, now } from "./db";
import { inviteCode, randomToken, sha256 } from "./crypto";

export const SESSION_COOKIE = "pa_session";
const SESSION_DAYS = Number(process.env.SESSION_DAYS || 30);

export type Invite = { id: number; label: string; isAdmin: boolean; disabled: boolean; codeHint: string; createdAt: string; lastUsedAt: string | null };

type InviteRow = { id: number; label: string; is_admin: number; disabled: number; code_hint: string; created_at: string; last_used_at: string | null };

const toInvite = (r: InviteRow): Invite => ({
  id: r.id,
  label: r.label,
  isAdmin: !!r.is_admin,
  disabled: !!r.disabled,
  codeHint: r.code_hint,
  createdAt: r.created_at,
  lastUsedAt: r.last_used_at,
});

export function normalizeCode(code: string): string {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/** Create invite codes. The plain code is returned once and never stored. */
export function createInvites(count: number, opts: { label?: string; admin?: boolean } = {}): { code: string; invite: Invite }[] {
  const db = getDb();
  const out: { code: string; invite: Invite }[] = [];
  const stmt = db.prepare("INSERT INTO invites (code_hash, code_hint, label, is_admin, created_at) VALUES (?, ?, ?, ?, ?)");
  for (let i = 0; i < count; i++) {
    const code = inviteCode();
    const norm = normalizeCode(code);
    const label = opts.label ? (count > 1 ? `${opts.label} ${i + 1}` : opts.label) : "";
    const res = stmt.run(sha256(norm), norm.slice(-4), label, opts.admin ? 1 : 0, now());
    const row = db.prepare("SELECT * FROM invites WHERE id = ?").get(Number(res.lastInsertRowid)) as InviteRow;
    out.push({ code, invite: toInvite(row) });
  }
  return out;
}

export function listInvites(): Invite[] {
  return (getDb().prepare("SELECT * FROM invites ORDER BY id").all() as InviteRow[]).map(toInvite);
}

export function setInviteDisabled(id: number, disabled: boolean) {
  getDb().prepare("UPDATE invites SET disabled = ? WHERE id = ?").run(disabled ? 1 : 0, id);
  if (disabled) getDb().prepare("DELETE FROM sessions WHERE invite_id = ?").run(id);
}

export function updateInviteLabel(id: number, label: string) {
  getDb().prepare("UPDATE invites SET label = ? WHERE id = ?").run(label.slice(0, 60), id);
}

/** If no admin exists yet, create one and return its code (printed to the server log on first start). */
export function ensureAdmin(): string | null {
  const db = getDb();
  const has = db.prepare("SELECT 1 FROM invites WHERE is_admin = 1 LIMIT 1").get();
  if (has) return null;
  const fixed = process.env.ADMIN_INVITE_CODE;
  if (fixed) {
    const norm = normalizeCode(fixed);
    if (norm.length < 8) throw new Error("ADMIN_INVITE_CODE must have at least 8 letters or digits.");
    db.prepare("INSERT INTO invites (code_hash, code_hint, label, is_admin, created_at) VALUES (?, ?, ?, 1, ?)").run(sha256(norm), norm.slice(-4), "管理员 Admin", now());
    return null;
  }
  return createInvites(1, { label: "管理员 Admin", admin: true })[0].code;
}

/** Exchange an invite code for a session token. Returns null for unknown or disabled codes. */
export function signIn(code: string): { token: string; invite: Invite; expiresAt: Date } | null {
  const norm = normalizeCode(code);
  if (norm.length < 8) return null;
  const db = getDb();
  const row = db.prepare("SELECT * FROM invites WHERE code_hash = ?").get(sha256(norm)) as InviteRow | undefined;
  if (!row || row.disabled) return null;
  const token = randomToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400_000);
  db.prepare("INSERT INTO sessions (token_hash, invite_id, created_at, expires_at) VALUES (?, ?, ?, ?)").run(sha256(token), row.id, now(), expiresAt.toISOString());
  db.prepare("UPDATE invites SET last_used_at = ? WHERE id = ?").run(now(), row.id);
  return { token, invite: toInvite(row), expiresAt };
}

export function sessionInvite(token: string | undefined | null): Invite | null {
  if (!token) return null;
  const db = getDb();
  const row = db
    .prepare(
      `SELECT i.* FROM sessions s JOIN invites i ON i.id = s.invite_id
       WHERE s.token_hash = ? AND s.expires_at > ? AND i.disabled = 0`,
    )
    .get(sha256(token), now()) as InviteRow | undefined;
  return row ? toInvite(row) : null;
}

export function signOut(token: string | undefined | null) {
  if (token) getDb().prepare("DELETE FROM sessions WHERE token_hash = ?").run(sha256(token));
}
