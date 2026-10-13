import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** GET /api/anime/random → a single random anime slug (for the "random anime" button). */
export async function GET() {
  // Prefer anime that actually have metadata (richer detail page).
  const count = await db.anime.count({ where: { metaStatus: "ok" } });
  if (count === 0) {
    return NextResponse.json({ slug: null });
  }
  // SQLite: pick a random row by offset.
  const skip = Math.floor(Math.random() * count);
  const a = await db.anime.findFirst({
    where: { metaStatus: "ok" },
    skip,
    select: { slug: true },
  });
  return NextResponse.json({ slug: a?.slug ?? null });
}
