/**
 * Migrate the local SQLite catalog into a remote Turso (libSQL) database.
 *
 * Prerequisites:
 *   1. Create a Turso database (free) — https://turso.tech or the Vercel Turso
 *      integration. Get its `libsql://...` URL and auth token.
 *   2. Push the schema to Turso FIRST so the tables exist:
 *        DATABASE_URL='libsql://<url>?authToken=<token>' bun run db:push
 *
 * Then run this script to COPY the data (anime + episodes + watch sources):
 *   bun run scripts/migrate-to-turso.ts 'libsql://<url>?authToken=<token>'
 *
 * (The token may also be passed as a 2nd arg instead of in the URL query.)
 */
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { createClient } from "@libsql/client";

// Source: the local SQLite file (resolved from .env or the default path).
const src = new PrismaClient({ log: ["warn", "error"] });

// Destination: Turso (libSQL), from the first CLI arg.
const tursoUrl = process.argv[2];
const tursoToken = process.argv[3];
if (!tursoUrl) {
  console.error(
    "Usage: bun run scripts/migrate-to-turso.ts 'libsql://<url>?authToken=<token>'"
  );
  process.exit(1);
}
const libsql = createClient({ url: tursoUrl, authToken: tursoToken });
const dest = new PrismaClient({
  adapter: new PrismaLibSql(libsql),
} as any);

const BATCH = 250;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const t0 = Date.now();

  // 1) Anime
  const anime = await src.anime.findMany();
  console.log(`[migrate] anime: ${anime.length} rows`);
  for (let i = 0; i < anime.length; i += BATCH) {
    await dest.anime.createMany({ data: anime.slice(i, i + BATCH) });
    if (i % (BATCH * 10) === 0) console.log(`  anime ${i}/${anime.length}`);
  }

  // 2) Episodes
  const episodes = await src.episode.findMany();
  console.log(`[migrate] episodes: ${episodes.length} rows`);
  for (let i = 0; i < episodes.length; i += BATCH) {
    await dest.episode.createMany({ data: episodes.slice(i, i + BATCH) });
    if (i % (BATCH * 20) === 0) console.log(`  episodes ${i}/${episodes.length}`);
    await sleep(50); // gentle on the remote DB
  }

  // 3) Watch sources
  const sources = await src.watchSource.findMany();
  console.log(`[migrate] watchSources: ${sources.length} rows`);
  for (let i = 0; i < sources.length; i += BATCH) {
    await dest.watchSource.createMany({ data: sources.slice(i, i + BATCH) });
    if (i % (BATCH * 40) === 0) console.log(`  sources ${i}/${sources.length}`);
    await sleep(50);
  }

  // Verify
  const [a, e, s] = await Promise.all([
    dest.anime.count(),
    dest.episode.count(),
    dest.watchSource.count(),
  ]);
  console.log(
    `[migrate] DONE in ${((Date.now() - t0) / 1000).toFixed(1)}s — Turso now has: anime=${a} episodes=${e} sources=${s}`
  );
}

main()
  .catch((e) => {
    console.error("[migrate] FAILED:", e);
    process.exit(1);
  })
  .finally(async () => {
    await src.$disconnect();
    await dest.$disconnect();
  });
