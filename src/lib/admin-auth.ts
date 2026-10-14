import { cookies } from "next/headers";
import { createHmac, randomBytes, timingSafeEqual } from "crypto";

export const ADMIN_COOKIE = "aniverse_admin";
/** Password read from env at runtime. Default is WEAK — override via ADMIN_PASSWORD. */
export const ADMIN_PASSWORD =
  process.env.ADMIN_PASSWORD || process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "aniqa-admin";

// --- Simple in-memory rate limiting (per IP). NOTE: on serverless (Vercel) this is
// per-instance and resets on cold starts — it adds friction, not a hard guarantee.
// For a stronger guarantee use Upstash Ratelimit, but this blocks casual brute-force.
const MAX_ATTEMPTS = 6;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 min
const attempts = new Map<string, { count: number; lockedUntil: number }>();

/** Returns true if the IP is currently locked out (too many failed attempts). */
export function isLockedOut(ip: string): boolean {
  const rec = attempts.get(ip);
  if (!rec) return false;
  if (rec.lockedUntil > Date.now()) return true;
  if (rec.lockedUntil && rec.lockedUntil <= Date.now()) {
    attempts.delete(ip); // lockout expired → fresh start
    return false;
  }
  return false;
}

/** Record a failed attempt for an IP; locks out after MAX_ATTEMPTS. */
export function recordFailedAttempt(ip: string): void {
  const now = Date.now();
  const rec = attempts.get(ip) ?? { count: 0, lockedUntil: 0 };
  rec.count += 1;
  if (rec.count >= MAX_ATTEMPTS) rec.lockedUntil = now + LOCKOUT_MS;
  attempts.set(ip, rec);
}

/** Reset an IP's attempts on a successful login. */
export function clearAttempts(ip: string): void {
  attempts.delete(ip);
}

/** Constant-time password comparison (avoids timing side-channels). */
export function checkPassword(input: string): boolean {
  const a = Buffer.from(input);
  const b = Buffer.from(ADMIN_PASSWORD);
  if (a.length !== b.length) {
    // still do a compare to keep timing roughly constant
    timingSafeEqual(b, b);
    return false;
  }
  return timingSafeEqual(a, b);
}

/** Sign a session token with the admin password (HMAC-SHA256). The cookie value is
 * `token.hmac` — an attacker cannot forge a valid pair without the ADMIN_PASSWORD secret. */
function signToken(token: string): string {
  const mac = createHmac("sha256", ADMIN_PASSWORD).update(token).digest("hex");
  return `${token}.${mac}`;
}

/** Verify a cookie value is a validly-signed session (token + correct HMAC). */
function verifySignedCookie(value: string | undefined | null): boolean {
  if (!value) return false;
  const [token, mac] = value.split(".");
  if (!token || !mac) return false;
  const expected = createHmac("sha256", ADMIN_PASSWORD).update(token).digest("hex");
  if (mac.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(mac), Buffer.from(expected));
  } catch {
    return false;
  }
}

/** Issue a fresh signed session cookie value (call after a successful login). */
export function issueSession(): string {
  return signToken(randomBytes(32).toString("hex"));
}

/** Server-side: is the current request authed as admin? (verifies the signed cookie). */
export async function isAdmin(): Promise<boolean> {
  const ck = await cookies();
  return verifySignedCookie(ck.get(ADMIN_COOKIE)?.value);
}

/** For API routes: verify the signed cookie from the raw Cookie header. */
export function isAdminRequest(request: Request): boolean {
  const raw = request.headers.get("cookie") || "";
  const map = new Map<string, string>();
  for (const part of raw.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k) map.set(k, rest.join("="));
  }
  return verifySignedCookie(map.get(ADMIN_COOKIE));
}

/** Extract the client IP (best-effort) for rate-limiting. */
export function getClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}
