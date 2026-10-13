import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** GET /api/genres → list of distinct genres with counts (for the genre filter chips). */
export async function GET() {
  const rows = await db.anime.findMany({
    where: { genres: { not: null } },
    select: { genres: true },
  });
  const counts = new Map<string, number>();
  for (const r of rows) {
    if (!r.genres) continue;
    for (const g of r.genres.split(",").map((x) => x.trim()).filter(Boolean)) {
      counts.set(g, (counts.get(g) ?? 0) + 1);
    }
  }
  const AR: Record<string, string> = {
    Action: "أكشن",
    Adventure: "مغامرة",
    Comedy: "كوميديا",
    Drama: "دراما",
    Fantasy: "فانتازيا",
    Horror: "رعب",
    Mystery: "غموض",
    Romance: "رومانسية",
    "Sci-Fi": "خيال علمي",
    "Slice of Life": "شريحة من الحياة",
    Sports: "رياضة",
    Supernatural: "خارق للطبيعة",
    Thriller: "إثارة",
    Psychological: "نفسي",
    Suspense: "تشويق",
    Ecchi: "إتشي",
    Mecha: "ميكا",
  };
  const items = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([genre, count]) => ({ genre, count, label: AR[genre] || genre }));
  return NextResponse.json({ items });
}
