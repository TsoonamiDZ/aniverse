import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** GET /api/anime/[slug] — anime detail + its episode list (sorted). */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const anime = await db.anime.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      title: true,
      pageUrl: true,
      posterUrl: true,
      episodeCount: true,
      sourceCount: true,
    },
  });

  if (!anime) {
    return NextResponse.json(
      { error: "anime_not_found", slug },
      { status: 404 }
    );
  }

  const episodes = await db.episode.findMany({
    where: { animeId: anime.id },
    orderBy: [{ episodeSort: "asc" }, { episodeNumber: "asc" }],
    select: {
      id: true,
      slug: true,
      title: true,
      episodeNumber: true,
      episodeSort: true,
      posterUrl: true,
    },
  });

  return NextResponse.json({ ...anime, episodes });
}
