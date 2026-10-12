import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { qualityRank } from "@/lib/anime-helpers";

export const dynamic = "force-dynamic";

/**
 * GET /api/episode/[id]
 *
 * Returns the episode, its watch sources (sorted by quality then provider),
 * and the previous / next sibling episodes (by episodeSort) for navigation.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const episode = await db.episode.findUnique({
    where: { id },
    select: {
      id: true,
      slug: true,
      title: true,
      animeId: true,
      animeTitle: true,
      episodeNumber: true,
      episodeSort: true,
      posterUrl: true,
      episodePageUrl: true,
      animePageUrl: true,
    },
  });

  if (!episode) {
    return NextResponse.json({ error: "episode_not_found", id }, { status: 404 });
  }

  const anime = await db.anime.findUnique({
    where: { id: episode.animeId },
    select: { slug: true, title: true, posterUrl: true },
  });

  const sources = await db.watchSource.findMany({
    where: { episodeId: episode.id },
    select: {
      id: true,
      provider: true,
      quality: true,
      label: true,
      watchUrl: true,
      providerHost: true,
    },
  });

  // Best quality first, then a stable provider ordering.
  sources.sort((a, b) => {
    const qr = qualityRank(a.quality) - qualityRank(b.quality);
    if (qr !== 0) return qr;
    return (a.provider || "").localeCompare(b.provider || "");
  });

  // Sibling navigation (same anime, nearest by sort order).
  const [prev, next] = await Promise.all([
    db.episode.findFirst({
      where: { animeId: episode.animeId, episodeSort: { lt: episode.episodeSort } },
      orderBy: [{ episodeSort: "desc" }, { episodeNumber: "desc" }],
      select: { id: true, episodeNumber: true, title: true, slug: true },
    }),
    db.episode.findFirst({
      where: { animeId: episode.animeId, episodeSort: { gt: episode.episodeSort } },
      orderBy: [{ episodeSort: "asc" }, { episodeNumber: "asc" }],
      select: { id: true, episodeNumber: true, title: true, slug: true },
    }),
  ]);

  return NextResponse.json({
    id: episode.id,
    slug: episode.slug,
    title: episode.title,
    animeId: episode.animeId,
    animeSlug: anime?.slug ?? episode.animeId,
    animeTitle: episode.animeTitle || anime?.title || "",
    animePosterUrl: anime?.posterUrl ?? episode.posterUrl ?? "",
    episodeNumber: episode.episodeNumber,
    episodeSort: episode.episodeSort,
    posterUrl: episode.posterUrl,
    episodePageUrl: episode.episodePageUrl,
    sources,
    prev: prev ?? null,
    next: next ?? null,
  });
}
