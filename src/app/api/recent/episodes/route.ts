import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/recent/episodes?limit=16
 * Newest ADDED episodes — ordered by when they were added to OUR catalog
 * (importedAt desc), so newly-synced episodes always appear at the top regardless
 * of the source site's lastModified. lastModified is a secondary tiebreaker so
 * the initial bulk import is ordered by the source's recency.
 */
export async function GET(request: Request) {
  const sp = new URL(request.url).searchParams;
  const limit = Math.min(40, Math.max(1, parseInt(sp.get("limit") ?? "16", 10) || 16));

  const episodes = await db.episode.findMany({
    orderBy: [{ importedAt: "desc" }, { lastModified: "desc" }],
    take: limit,
    select: {
      id: true,
      slug: true,
      title: true,
      animeId: true,
      animeTitle: true,
      episodeNumber: true,
      posterUrl: true,
      lastModified: true,
    },
  });

  // Join the parent anime for the high-res cover + slug (for clicking through).
  const animeIds = [...new Set(episodes.map((e) => e.animeId))];
  const animes =
    animeIds.length > 0
      ? await db.anime.findMany({
          where: { id: { in: animeIds } },
          select: { id: true, slug: true, coverImage: true, posterUrl: true, coverColor: true },
        })
      : [];
  const animeMap = new Map(animes.map((a) => [a.id, a]));

  return NextResponse.json(
    episodes.map((e) => {
      const a = animeMap.get(e.animeId);
      return {
        id: e.id,
        slug: e.slug,
        title: e.title,
        animeId: e.animeId,
        animeSlug: a?.slug ?? e.animeId,
        animeTitle: e.animeTitle,
        episodeNumber: e.episodeNumber,
        posterUrl: a?.coverImage || a?.posterUrl || e.posterUrl || "",
        coverColor: a?.coverColor || null,
        lastModified: e.lastModified,
      };
    })
  );
}
