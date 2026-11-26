import crypto from "crypto";

/**
 * Secrets for external share links. Only hashes reach the database:
 *  - link tokens, one-time codes and session tokens are HMAC-SHA256 with SHARE_SECRET_SALT,
 *  - link passwords are scrypt with a random salt per password.
 * SHARE_SECRET_SALT must be set (at least 32 characters). Without it sharing is switched off.
 */

export class ShareNotConfiguredError extends Error {
  constructor() {
    super("External sharing is not set up on this server yet. Ask IT to set SHARE_SECRET_SALT.");
  }
}

let cachedDbSecret: string | null = null;

function secret(): string {
  const envVal = process.env.SHARE_SECRET_SALT || "";
  if (envVal.length >= 32) return envVal;
  if (cachedDbSecret && cachedDbSecret.length >= 32) return cachedDbSecret;
  throw new ShareNotConfiguredError();
}

export function shareConfigured(): boolean {
  const envVal = process.env.SHARE_SECRET_SALT || "";
  return envVal.length >= 32 || Boolean(cachedDbSecret && cachedDbSecret.length >= 32);
}

/**
 * Ensures the share signing secret is loaded.
 * Uses process.env.SHARE_SECRET_SALT first; if missing, auto-generates and stores
 * a 64-character random salt in core_module_settings (server-only via supabaseAdmin).
 */
export async function ensureShareSecret(): Promise<boolean> {
  if ((process.env.SHARE_SECRET_SALT || "").length >= 32) return true;
  if (cachedDbSecret && cachedDbSecret.length >= 32) return true;
  try {
    const { supabaseAdmin } = await import("@/lib/supabase/service_role");
    const { data } = await supabaseAdmin
      .from("core_module_settings")
      .select("value_json")
      .eq("module_key", "dms")
      .eq("key", "share_secret_salt")
      .maybeSingle();
    const existing = String((data?.value_json as any)?.salt || "");
    if (existing.length >= 32) {
      cachedDbSecret = existing;
      return true;
    }
    const generated = crypto.randomBytes(32).toString("hex");
    const { error } = await supabaseAdmin.from("core_module_settings").upsert(
      { module_key: "dms", key: "share_secret_salt", value_json: { salt: generated }, updated_at: new Date().toISOString() },
      { onConflict: "module_key,key" }
    );
    if (!error) {
      cachedDbSecret = generated;
      return true;
    }
  } catch {
    // Fall back cleanly if DB is unreachable
  }
  return false;
}

export function hmac(kind: "token" | "otp" | "session" | "device" | "cookie", value: string): string {
  return crypto.createHmac("sha256", secret()).update(`${kind}:${value}`).digest("hex");
}

export function safeEqualHex(a: string, b: string): boolean {
  const x = Buffer.from(a || "", "hex");
  const y = Buffer.from(b || "", "hex");
  return x.length > 0 && x.length === y.length && crypto.timingSafeEqual(x, y);
}

export function newLinkToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export function newSessionToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export function newOtp(): string {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
}

/** Readable password without look-alike characters, for the sharer to pass on by phone or SMS. */
export function newSharePassword(length = 10): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < length; i++) out += alphabet[crypto.randomInt(0, alphabet.length)];
  return out;
}

const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 32 };

export function hashSharePassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, SCRYPT.keylen, { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p });
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString("base64")}$${hash.toString("base64")}`;
}

export function verifySharePassword(password: string, stored: string | null | undefined): boolean {
  const parts = String(stored || "").split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false; // old unsalted hashes are never accepted
  const [, n, r, p, saltB64, hashB64] = parts;
  const expected = Buffer.from(hashB64, "base64");
  const actual = crypto.scryptSync(password, Buffer.from(saltB64, "base64"), expected.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
  });
  return expected.length > 0 && crypto.timingSafeEqual(expected, actual);
}

/** One cookie per link, so a browser can hold sessions for several shares. */
export function sessionCookieName(rawToken: string): string {
  return `dmac_share_${hmac("cookie", rawToken).slice(0, 16)}`;
}

export function maskEmail(email: string): string {
  const [user = "", domain = ""] = String(email || "").split("@");
  const u = user.length > 2 ? `${user[0]}***${user[user.length - 1]}` : `${user[0] || ""}*`;
  return `${u}@${domain}`;
}

export function escapeHtml(s: string): string {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
