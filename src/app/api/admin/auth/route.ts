import { NextResponse } from "next/server";
import { ADMIN_COOKIE, ADMIN_PASSWORD } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

/** POST /api/admin/auth { password } → sets httpOnly admin cookie if correct. */
export async function POST(request: Request) {
  let body: { password?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  const ok = body.password && body.password === ADMIN_PASSWORD;
  if (!ok) {
    return NextResponse.json({ error: "wrong_password" }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, "ok", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
  return res;
}
