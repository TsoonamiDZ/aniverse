import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** GET /api/recent/anime?limit=12 — most recently added anime to the catalog. */
export async function GET(request: Request) {
  const sp = new URL(request.url).searchParams;
  const limit = Math.min(40, Math.max(1, parseInt(sp.get("limit") ?? "12", 10) || 12));

  const items = await db.anime.findMany({
    orderBy: [{ importedAt: "desc" }, { title: "asc" }],
    take: limit,
    select: {
      id: true,
      slug: true,
      title: true,
      titleEnglish: true,
      posterUrl: true,
      coverImage: true,
      coverColor: true,
      episodeCount: true,
      sourceCount: true,
      score: true,
      animeType: true,
      airedYear: true,
      importedAt: true,
    },
  });
  return NextResponse.json({ items });
}
