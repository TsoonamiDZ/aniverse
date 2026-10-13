import { cookies } from "next/headers";

export const ADMIN_COOKIE = "aniqa_admin_session";
/** Password read from env at runtime. Default is weak — override via ADMIN_PASSWORD. */
export const ADMIN_PASSWORD =
  process.env.ADMIN_PASSWORD || process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "aniqa-admin";

/** Server-side: is the current request authed as admin? */
export async function isAdmin(): Promise<boolean> {
  const ck = await cookies();
  return ck.get(ADMIN_COOKIE)?.value === "ok";
}

/** For API routes: parse the cookie from the raw Cookie header (no next/headers needed). */
export function isAdminRequest(request: Request): boolean {
  const raw = request.headers.get("cookie") || "";
  return new URLSearchParams(
    raw.split(";").map((p) => p.trim()).filter(Boolean).join("&")
  )
    .get(ADMIN_COOKIE) === "ok";
}
