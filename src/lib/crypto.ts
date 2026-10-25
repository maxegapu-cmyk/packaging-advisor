import crypto from "node:crypto";

/** APP_SECRET protects stored API keys and sessions. It must be set in production. */
function secret(): Buffer {
  const s = process.env.APP_SECRET;
  if (!s || s.length < 16) {
    if (process.env.NODE_ENV === "production") throw new Error("APP_SECRET must be set (at least 16 characters).");
    return crypto.createHash("sha256").update("dev-only-secret-change-me").digest();
  }
  return crypto.createHash("sha256").update(s).digest();
}

export function sha256(v: string): string {
  return crypto.createHash("sha256").update(v).digest("hex");
}

export function randomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString("base64url");
}

export function randomId(): string {
  return crypto.randomBytes(9).toString("base64url");
}

/** Invite codes: easy to read aloud or type on a phone. No 0/O/1/I/L. */
export function inviteCode(): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const pick = () => alphabet[crypto.randomInt(alphabet.length)];
  const group = () => Array.from({ length: 4 }, pick).join("");
  return `${group()}-${group()}-${group()}`;
}

export function encrypt(plain: string): string {
  if (!plain) return "";
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", secret(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", iv.toString("base64url"), tag.toString("base64url"), enc.toString("base64url")].join(".");
}

export function decrypt(blob: string): string {
  if (!blob) return "";
  const [v, iv, tag, enc] = blob.split(".");
  if (v !== "v1" || !iv || !tag || !enc) throw new Error("Unrecognized key format");
  const decipher = crypto.createDecipheriv("aes-256-gcm", secret(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(enc, "base64url")), decipher.final()]).toString("utf8");
}

export function maskKey(plain: string): string {
  if (!plain) return "";
  if (plain.length <= 8) return "••••";
  return `${plain.slice(0, 3)}••••${plain.slice(-4)}`;
}
