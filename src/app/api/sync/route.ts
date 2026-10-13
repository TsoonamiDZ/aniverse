import { NextResponse } from "next/server";
import { runSync } from "@/lib/sync";
import { isAdminRequest } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // allow up to 5 min for a sync pass

/**
 * POST /api/sync  (admin-only — requires the admin cookie)
 * Body (optional): { dryRun?: boolean, limit?: number, episodesOnly?: boolean, animeOnly?: boolean, since?: string }
 *
 * Triggers an okanime.xyz sync pass (scan sitemaps → add NEW anime/episodes
 * with watch sources). Bounded by `limit` (default 30 new episodes) so the
 * request finishes quickly; run again to pull more.
 */
export async function POST(request: Request) {
  // Protect: only the authenticated admin (via /admin) may trigger a sync.
  if (!isAdminRequest(request)) {
    return NextResponse.json(
      { ok: false, error: "unauthorized — this tool is admin-only" },
      { status: 401 }
    );
  }

  let body: Record<string, unknown> = {};
  try {
    const text = await request.text();
    if (text) body = JSON.parse(text);
  } catch {
    // empty/invalid body → defaults
  }

  const limit =
    typeof body.limit === "number" && body.limit > 0
      ? Math.min(200, Math.floor(body.limit))
      : 30;

  try {
    const result = await runSync({
      dryRun: Boolean(body.dryRun),
      episodesOnly: Boolean(body.episodesOnly),
      animeOnly: Boolean(body.animeOnly),
      since: typeof body.since === "string" ? body.since : undefined,
      limit,
    });
    return NextResponse.json({ ok: true, result });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "sync failed" },
      { status: 500 }
    );
  }
}
