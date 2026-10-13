/**
 * CLI wrapper around the shared sync library (src/lib/sync.ts).
 *
 * Usage:
 *   bun run scripts/sync-okanime.ts                 # full sync
 *   bun run scripts/sync-okanime.ts --dry-run       # report only
 *   bun run scripts/sync-okanime.ts --episodes-only
 *   bun run scripts/sync-okanime.ts --anime-only
 *   bun run scripts/sync-okanime.ts --limit 50
 *   bun run scripts/sync-okanime.ts --since 2026-10-01
 */
import { runSync, type SyncOptions } from "../src/lib/sync";

async function main() {
  const args = process.argv.slice(2);
  const opts: SyncOptions = {
    dryRun: args.includes("--dry-run"),
    episodesOnly: args.includes("--episodes-only"),
    animeOnly: args.includes("--anime-only"),
    onProgress: (msg) => console.log(msg),
  };
  const limitIdx = args.indexOf("--limit");
  if (limitIdx >= 0) opts.limit = parseInt(args[limitIdx + 1], 10) || 0;
  const sinceIdx = args.indexOf("--since");
  if (sinceIdx >= 0) opts.since = args[sinceIdx + 1];

  console.log(
    `[sync] okanime sync — dryRun=${opts.dryRun} episodesOnly=${opts.episodesOnly} animeOnly=${opts.animeOnly} limit=${opts.limit || "none"} since=${opts.since || "any"}`
  );
  try {
    const r = await runSync(opts);
    console.log(
      `[sync] DONE in ${(r.durationMs / 1000).toFixed(1)}s — ` +
        `sitemap: ${r.sitemapAnime} anime / ${r.sitemapEpisodes} eps; ` +
        `new found: ${r.newAnimeInSitemap} anime / ${r.newEpisodesInSitemap} eps; ` +
        `inserted: ${r.insertedAnime} anime, ${r.insertedEpisodes} eps, ${r.insertedSources} sources; ` +
        `failed=${r.failed}`
    );
  } catch (e) {
    console.error("[sync] FATAL:", e);
    process.exit(1);
  }
}

main();
