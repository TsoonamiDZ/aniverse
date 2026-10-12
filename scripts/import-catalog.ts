/**
 * One-shot import of the okanime.xyz catalog JSON into SQLite via Prisma.
 *
 * Usage:
 *   bun run scripts/import-catalog.ts /home/z/my-project/upload/anime_catalog_full/anime_catalog_full.json
 *
 * Inserts ~2,186 anime, ~25,866 episodes, ~149,216 watch sources.
 * Uses explicit ids (from the source slug), batched createMany inside a single
 * transaction, and a dedicated Prisma client with query logging disabled.
 */
import { PrismaClient } from "@prisma/client";
import * as fs from "fs";

const db = new PrismaClient({ log: [] });

interface SrcAnime {
  id: string;
  slug: string;
  title: string;
  pageUrl: string;
  posterUrl: string;
  episodeCount: number;
}
interface SrcSource {
  provider: string;
  quality: string;
  label: string;
  watchUrl: string;
  providerHost: string;
}
interface SrcEpisode {
  id: string;
  slug: string;
  title: string;
  animeId: string;
  animeTitle: string;
  episodeNumber: string;
  episodePageUrl: string;
  animePageUrl: string;
  posterUrl: string;
  lastModified?: string;
  watchSources?: SrcSource[];
}

/** Best-effort numeric projection of an episode number for sorting. */
function toSortNum(n: unknown): number {
  if (n == null) return 0;
  const s = String(n).trim();
  if (/^\d+$/.test(s)) return parseInt(s, 10);
  const m = s.match(/\d+/);
  return m ? parseInt(m[0], 10) : 0;
}

async function main() {
  const path = process.argv[2];
  if (!path || !fs.existsSync(path)) {
    console.error("Usage: bun run scripts/import-catalog.ts <path-to-json>");
    process.exit(1);
  }

  console.log(`[import] reading ${path} ...`);
  const raw = fs.readFileSync(path, "utf8");
  console.log(`[import] parsing JSON (${(raw.length / 1024 / 1024).toFixed(1)} MB) ...`);
  const data = JSON.parse(raw) as {
    anime: SrcAnime[];
    episodes: SrcEpisode[];
  };

  const srcAnime: SrcAnime[] = data.anime ?? [];
  const srcEpisodes: SrcEpisode[] = data.episodes ?? [];
  console.log(
    `[import] source counts: anime=${srcAnime.length} episodes=${srcEpisodes.length}`
  );

  // ---- Build rows ----
  const sourceCountByAnime = new Map<string, number>();
  const episodeRows: {
    id: string;
    slug: string;
    title: string;
    animeId: string;
    animeTitle: string;
    episodeNumber: string;
    episodeSort: number;
    episodePageUrl: string;
    animePageUrl: string;
    posterUrl: string;
    lastModified: string | null;
  }[] = [];
  const sourceRows: {
    episodeId: string;
    provider: string;
    quality: string;
    label: string;
    watchUrl: string;
    providerHost: string;
  }[] = [];

  let badEpisodes = 0;
  for (const e of srcEpisodes) {
    if (!e.id || !e.animeId) {
      badEpisodes++;
      continue;
    }
    const sources = Array.isArray(e.watchSources) ? e.watchSources : [];
    episodeRows.push({
      id: e.id,
      slug: e.slug || e.id,
      title: e.title || "",
      animeId: e.animeId,
      animeTitle: e.animeTitle || "",
      episodeNumber: String(e.episodeNumber ?? ""),
      episodeSort: toSortNum(e.episodeNumber),
      episodePageUrl: e.episodePageUrl || "",
      animePageUrl: e.animePageUrl || "",
      posterUrl: e.posterUrl || "",
      lastModified: e.lastModified || null,
    });
    for (const s of sources) {
      if (!s.watchUrl) continue;
      sourceRows.push({
        episodeId: e.id,
        provider: s.provider || "unknown",
        quality: s.quality || "unknown",
        label: s.label || "",
        watchUrl: s.watchUrl,
        providerHost: s.providerHost || "",
      });
    }
    sourceCountByAnime.set(
      e.animeId,
      (sourceCountByAnime.get(e.animeId) ?? 0) + sources.length
    );
  }

  const animeRows = srcAnime.map((a) => ({
    id: a.id,
    slug: a.slug || a.id,
    title: a.title || "",
    pageUrl: a.pageUrl || "",
    posterUrl: a.posterUrl || "",
    episodeCount: a.episodeCount ?? 0,
    sourceCount: sourceCountByAnime.get(a.id) ?? 0,
  }));

  console.log(
    `[import] built rows: anime=${animeRows.length} episodes=${episodeRows.length} sources=${sourceRows.length} (skipped ${badEpisodes} bad episodes)`
  );

  // ---- Wipe (idempotent re-runs) ----
  console.log("[import] clearing existing tables ...");
  await db.watchSource.deleteMany();
  await db.episode.deleteMany();
  await db.anime.deleteMany();

  const BATCH = 250;
  const t0 = Date.now();
  const log = (label: string, i: number, total: number) => {
    if (i % (BATCH * 20) === 0 || i + BATCH >= total) {
      console.log(
        `[import] ${label} ${Math.min(i + BATCH, total)}/${total} (${(
          (Date.now() - t0) /
          1000
        ).toFixed(1)}s)`
      );
    }
  };

  // Single transaction => one commit, much faster for SQLite.
  await db.$transaction(
    async (tx) => {
      for (let i = 0; i < animeRows.length; i += BATCH) {
        await tx.anime.createMany({
          data: animeRows.slice(i, i + BATCH),
        });
        log("anime", i, animeRows.length);
      }
      for (let i = 0; i < episodeRows.length; i += BATCH) {
        await tx.episode.createMany({
          data: episodeRows.slice(i, i + BATCH),
        });
        log("episode", i, episodeRows.length);
      }
      for (let i = 0; i < sourceRows.length; i += BATCH) {
        await tx.watchSource.createMany({
          data: sourceRows.slice(i, i + BATCH),
        });
        log("source", i, sourceRows.length);
      }
    },
    { timeout: 1800_000 } // 30 min safety
  );

  const counts = await db.$transaction([
    db.anime.count(),
    db.episode.count(),
    db.watchSource.count(),
  ]);
  console.log(
    `[import] DONE in ${((Date.now() - t0) / 1000).toFixed(1)}s -> ` +
      `anime=${counts[0]} episodes=${counts[1]} sources=${counts[2]}`
  );
}

main()
  .catch((err) => {
    console.error("[import] FAILED:", err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
