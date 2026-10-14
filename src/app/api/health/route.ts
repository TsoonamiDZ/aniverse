import { NextResponse } from "next/server";
import { db, getResolvedDbUrl } from "@/lib/db";
import * as fs from "fs";

export const dynamic = "force-dynamic";

/** GET /api/health — diagnostic: is the DB reachable + populated?
 * Visit this URL on your deploy host to see why the site might be blank. */
export async function GET() {
  const dbUrl = getResolvedDbUrl();
  const info: Record<string, unknown> = {
    ok: false,
    time: new Date().toISOString(),
    cwd: process.cwd(),
    nodeEnv: process.env.NODE_ENV,
    dbUrl,
  };

  // Does the resolved DB file exist on disk?
  const filePath = dbUrl.replace(/^file:/, "");
  info.dbFileExists = fs.existsSync(filePath);
  info.dbFilePath = filePath;

  try {
    const [anime, episodes, sources] = await db.$transaction([
      db.anime.count(),
      db.episode.count(),
      db.watchSource.count(),
    ]);
    info.ok = true;
    info.anime = anime;
    info.episodes = episodes;
    info.sources = sources;
  } catch (e) {
    info.error = e instanceof Error ? e.message : String(e);
    info.hint =
      "The database file could not be opened. If you deployed to a serverless host (e.g. Vercel), SQLite won't work there — deploy on a Node.js host (VPS) running `bun run start`, and make sure db/custom.db is present.";
  }
  return NextResponse.json(info, { status: info.ok ? 200 : 500 });
}
