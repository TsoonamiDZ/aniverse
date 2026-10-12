import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** GET /api/stats — global catalog totals for the homepage hero / footer. */
export async function GET() {
  const [anime, episodes, sources, providers] = await db.$transaction([
    db.anime.count(),
    db.episode.count(),
    db.watchSource.count(),
    db.watchSource.groupBy({
      by: ["provider"],
      _count: { provider: true },
      orderBy: { _count: { provider: "desc" } },
      take: 12,
    }),
  ]);

  return NextResponse.json({
    anime,
    episodes,
    sources,
    providers: providers.length,
    topProviders: providers.map((p) => ({
      provider: p.provider,
      count: p._count.provider,
    })),
  });
}
