import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE,
  checkPassword,
  issueSession,
  isLockedOut,
  recordFailedAttempt,
  clearAttempts,
  getClientIp,
} from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

/** POST /api/admin/auth { password }
 *  - Rate-limited per IP (6 attempts, then 15-min lockout).
 *  - Constant-time password check.
 *  - On success: sets a SIGNED httpOnly session cookie (HMAC of the password) —
 *    not forgeable, so /admin + /api/sync stay protected. */
export async function POST(request: Request) {
  const ip = getClientIp(request);

  if (isLockedOut(ip)) {
    return NextResponse.json(
      { error: "locked_out", message: "محاولات كثيرة — حاول بعد 15 دقيقة" },
      { status: 429 }
    );
  }

  let body: { password?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const ok = !!body.password && checkPassword(body.password);
  if (!ok) {
    recordFailedAttempt(ip);
    return NextResponse.json({ error: "wrong_password" }, { status: 401 });
  }

  clearAttempts(ip);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, issueSession(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
  return res;
}
