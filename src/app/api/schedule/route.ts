import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/schedule → currently-airing anime with their next-episode airing time,
 * grouped by day. "Beautiful broadcast schedule" built from AniList's
 * nextAiringEpisode.airingAt (stored as nextEpisodeAirAt).
 */
export async function GET() {
  // Airing anime with a known next-episode time.
  const animes = await db.anime.findMany({
    where: {
      airing: true,
      nextEpisodeAirAt: { not: null },
    },
    orderBy: { nextEpisodeAirAt: "asc" },
    select: {
      id: true,
      slug: true,
      title: true,
      titleEnglish: true,
      coverImage: true,
      posterUrl: true,
      coverColor: true,
      nextEpisode: true,
      nextEpisodeAirAt: true,
      episodeCount: true,
      score: true,
    },
    take: 200,
  });

  const now = Date.now();
  const days = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
  const buckets: Record<string, typeof animes> = {};
  for (const d of days) buckets[d] = [];
  const upcoming: typeof animes = [];

  for (const a of animes) {
    if (!a.nextEpisodeAirAt) continue;
    const t = new Date(a.nextEpisodeAirAt).getTime();
    if (!Number.isFinite(t)) continue;
    const diffH = (t - now) / 3_600_000;
    if (diffH < -24 * 7) continue; // too stale (>1 week ago)
    const dayIdx = new Date(t).getUTCDay(); // 0=Sun..6=Sat
    const dayName = days[dayIdx];
    buckets[dayName].push(a);
    if (diffH > 0) upcoming.push(a);
  }

  // Day buckets in week order (Sun..Sat).
  const schedule = days.map((day) => ({ day, items: buckets[day] }));
  return NextResponse.json({ schedule, upcoming: upcoming.slice(0, 30) });
}
