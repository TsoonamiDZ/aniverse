import { NextResponse } from "next/server";
import { runSync } from "@/lib/sync";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // allow up to 5 min for a sync pass

/**
 * POST /api/sync
 * Body (optional): { dryRun?: boolean, limit?: number, episodesOnly?: boolean, animeOnly?: boolean, since?: string }
 *
 * Triggers an okanime.xyz sync pass (scan sitemaps → add NEW anime/episodes
 * with watch sources). Bounded by `limit` (default 30 new episodes) so the
 * request finishes quickly; run again to pull more.
 */
export async function POST(request: Request) {
  let body: Record<string, unknown> = {};
  try {
    const text = await request.text();
    if (text) body = JSON.parse(text);
  } catch {
    // empty/invalid body → defaults
  }

  const limit =
    typeof body.limit === "number" && body.limit > 0
      ? Math.min(100, Math.floor(body.limit))
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
