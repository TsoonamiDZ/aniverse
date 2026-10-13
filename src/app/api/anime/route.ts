import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type SortKey = "recent" | "popular" | "episodes" | "rating" | "title" | "shuffle";

const DEFAULT_PAGE_SIZE = 24;
const MAX_PAGE_SIZE = 60;

/**
 * GET /api/anime?page=1&pageSize=24&sort=popular&q=
 *
 * sort:  recent (importedAt desc) | popular (sourceCount desc) |
 *        episodes (episodeCount desc) | rating (score desc) | title (alphabetical) |
 *        shuffle (seeded random). Default: recent.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const sp = url.searchParams;

  const page = Math.max(1, parseInt(sp.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(
      1,
      parseInt(sp.get("pageSize") ?? String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE
    )
  );
  const sortRaw = (sp.get("sort") ?? "recent") as SortKey;
  const sort: SortKey = ["recent", "popular", "episodes", "rating", "title", "shuffle"].includes(sortRaw)
    ? sortRaw
    : "recent";
  const q = (sp.get("q") ?? "").trim();

  const where: Prisma.AnimeWhereInput = {};
  if (q) {
    where.title = { contains: q };
  }

  const total = await db.anime.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  let items: {
    id: string;
    slug: string;
    title: string;
    posterUrl: string;
    episodeCount: number;
    sourceCount: number;
    score: number | null;
    animeType: string | null;
    airedYear: number | null;
    coverImage: string | null;
    coverColor: string | null;
    bannerImage: string | null;
    trailerYoutubeId: string | null;
    titleEnglish: string | null;
    popularity: number | null;
    genres: string | null;
    genresAr: string | null;
  }[];

  if (sort === "shuffle") {
    // Deterministic seeded shuffle: stable per page so pagination doesn't reshuffle.
    const all = await db.anime.findMany({
      where,
      select: {
        id: true,
        slug: true,
        title: true,
        posterUrl: true,
        episodeCount: true,
        sourceCount: true,
        score: true,
        animeType: true,
        airedYear: true,
        coverImage: true,
        coverColor: true,
        bannerImage: true,
        trailerYoutubeId: true,
        titleEnglish: true,
        popularity: true,
        genres: true,
        genresAr: true,
      },
    });
    items = all
      .map((a, i) => ({ a, r: hashStr(a.id + ":" + page + ":" + i) }))
      .sort((x, y) => x.r - y.r)
      .map((x) => x.a)
      .slice((page - 1) * pageSize, page * pageSize);
  } else {
    const orderBy: Prisma.AnimeOrderByWithRelationInput[] =
      sort === "recent"
        ? [{ importedAt: "desc" }, { title: "asc" }]
        : sort === "popular"
        ? [{ sourceCount: "desc" }, { title: "asc" }]
        : sort === "episodes"
        ? [{ episodeCount: "desc" }, { title: "asc" }]
        : sort === "rating"
        ? [{ score: "desc" }, { popularity: "desc" }]
        : [{ title: "asc" }];
    items = await db.anime.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        slug: true,
        title: true,
        posterUrl: true,
        episodeCount: true,
        sourceCount: true,
        score: true,
        animeType: true,
        airedYear: true,
        coverImage: true,
        coverColor: true,
        bannerImage: true,
        trailerYoutubeId: true,
        titleEnglish: true,
        popularity: true,
        genres: true,
        genresAr: true,
      },
    });
  }

  return NextResponse.json({
    items,
    page,
    pageSize,
    total,
    totalPages,
    sort,
    q,
  });
}

/** Deterministic 32-bit string hash (FNV-1a) for stable seeded shuffles. */
function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
