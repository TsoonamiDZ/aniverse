/**
 * Sync tool — scans ww3.okanime.xyz sitemaps and adds NEW anime + episodes
 * (with their watch-source embed links) to the database.
 *
 * Pipeline:
 *   1. Fetch sitemap.xml → sub-sitemaps (anime-*, episodes-*).
 *   2. Parse all anime + episode URLs.
 *   3. Diff against the DB (by id/slug) → which are NEW.
 *   4. For each new episode: fetch its page, extract metadata + watch sources,
 *      ensure its anime exists (fetch+insert if new), then insert episode + sources.
 *   5. For each new anime with no new episodes: fetch + insert (episodeCount from
 *      counting its episode links on the page).
 *
 * Idempotent + resumable: re-running skips anything already in the DB.
 *
 * Usage:
 *   bun run scripts/sync-okanime.ts                 # full sync (new anime + new episodes)
 *   bun run scripts/sync-okanime.ts --dry-run       # report only, no writes
 *   bun run scripts/sync-okanime.ts --episodes-only # skip the anime-only pass
 *   bun run scripts/sync-okanime.ts --limit 50      # cap new episodes processed
 *   bun run scripts/sync-okanime.ts --since 2026-10-01  # only sitemap urls with lastmod >= date
 *
 * Uses curl (via Bun.spawnSync) because Bun's fetch is blocked by some site WAFs.
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient({ log: ["warn", "error"] });

const BASE = "https://ww3.okanime.xyz";
const DELAY_MS = 300; // be polite to the source site
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** HTTP GET via curl (sync). Returns text or null. */
function curlText(url: string): string | null {
  const proc = Bun.spawnSync(
    ["curl", "-sS", "-m", "20", "-A", "Mozilla/5.0 (compatible; aniqa-sync/1.0)", url],
    { stdin: "ignore", stdout: "pipe", stderr: "ignore" }
  );
  if (proc.exitCode !== 0) return null;
  return proc.stdout.toString();
}

interface SitemapEntry {
  loc: string;
  lastmod?: string;
}

/** Parse a sitemapindex <sitemap> entries. */
function parseSitemapIndex(xml: string): SitemapEntry[] {
  const out: SitemapEntry[] = [];
  const re = /<sitemap>[\s\S]*?<loc>([^<]+)<\/loc>(?:[\s\S]*?<lastmod>([^<]+)<\/lastmod>)?[\s\S]*?<\/sitemap>/g;
  let m;
  while ((m = re.exec(xml))) out.push({ loc: m[1].trim(), lastmod: m[2]?.trim() });
  return out;
}

/** Parse a urlset <url> entries. */
function parseUrlSet(xml: string): SitemapEntry[] {
  const out: SitemapEntry[] = [];
  const re = /<url>[\s\S]*?<loc>([^<]+)<\/loc>(?:[\s\S]*?<lastmod>([^<]+)<\/lastmod>)?[\s\S]*?<\/url>/g;
  let m;
  while ((m = re.exec(xml))) out.push({ loc: m[1].trim(), lastmod: m[2]?.trim() });
  return out;
}

function slugFromAnimeUrl(url: string): string | null {
  const m = url.match(/\/anime\/([^/?#]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}
function slugFromEpisodeUrl(url: string): string | null {
  const m = url.match(/\/episode\/([^/?#]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}
function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return "";
  }
}

interface ExtractedSource {
  provider: string;
  quality: string;
  label: string;
  watchUrl: string;
  providerHost: string;
}

interface ExtractedEpisode {
  title: string;
  animeId: string;
  animeTitle: string;
  episodeNumber: string;
  episodeSort: number;
  posterUrl: string;
  pageUrl: string;
  malId: number | null;
  sources: ExtractedSource[];
}

function toSortNum(n: string): number {
  const m = String(n).match(/\d+/);
  return m ? parseInt(m[0], 10) : 0;
}

/** Provider display name for the stored `label` field. */
function providerDisplay(p: string): string {
  const map: Record<string, string> = {
    mp4upload: "Mp4Upload",
    mega_bdon_aaalanat: "Mega بدون إعلانات",
    mega: "Mega",
    uqload: "Uqload",
    megamax: "Megamax",
    megamax_2: "Megamax 2",
    sendvid: "SendVid",
    google_drive: "Google Drive",
    vk: "VK",
    videa: "Videa",
    larhu: "Larhu",
    streamruby: "StreamRuby",
  };
  return map[p] || p.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Extract a single episode's data + watch sources from its page HTML. */
function extractEpisode(html: string, slug: string): ExtractedEpisode | null {
  const pick = (re: RegExp): string | null => {
    const m = html.match(re);
    return m ? m[1] : null;
  };

  const pageUrl = `${BASE}/episode/${slug}`;
  const ogTitle = pick(/<meta property="og:title" content="([^"]+)"/) || "";
  const title = ogTitle.replace(/\s*\|\s*OkAnime\s*$/i, "").trim() || `${slug}`;
  const posterUrl =
    pick(/<meta property="og:image" content="([^"]+)"/) || "";
  const malIdRaw = pick(/data-umami-event-mal_id="([^"]+)"/);
  const malId = malIdRaw ? parseInt(malIdRaw, 10) : null;
  const epNumRaw = pick(/data-umami-event-episode_number="([^"]+)"/) || "0";
  const episodeNumber = String(epNumRaw);

  // Anime id from the "anime details" link.
  const animeHref = pick(/href="https:\/\/ww3\.okanime\.xyz\/anime\/([^"?#]+)/);
  const animeId = animeHref ? decodeURIComponent(animeHref) : "";
  // Anime title = text before "الحلقة" in og:title.
  const animeTitle = ogTitle.split(/\s+الحلقة\s/)[0].trim() || animeId || "";

  // Watch sources: each <a> has activeUrl === 'URL', matchesQuality('Q'), data-server="P".
  const urls = [...html.matchAll(/activeUrl\s*===\s*'([^']+)'/g)].map((m) => m[1]);
  const quals = [...html.matchAll(/matchesQuality\('([^']+)'\)/g)].map((m) => m[1]);
  const provs = [...html.matchAll(/data-server="([^"]+)"/g)].map((m) => m[1]);
  const n = Math.min(urls.length, quals.length, provs.length);
  const sources: ExtractedSource[] = [];
  for (let i = 0; i < n; i++) {
    const watchUrl = urls[i];
    const quality = quals[i] || "";
    const provider = provs[i] || "unknown";
    sources.push({
      provider,
      quality,
      label: `${quality} ${providerDisplay(provider)}`.trim(),
      watchUrl,
      providerHost: hostOf(watchUrl),
    });
  }

  if (!animeId) return null;
  return {
    title,
    animeId,
    animeTitle,
    episodeNumber,
    episodeSort: toSortNum(episodeNumber),
    posterUrl,
    pageUrl,
    malId: Number.isFinite(malId) ? malId : null,
    sources,
  };
}

interface ExtractedAnime {
  title: string;
  posterUrl: string;
  pageUrl: string;
  episodeCount: number;
}

/** Extract an anime's metadata from its page HTML. */
function extractAnime(html: string, slug: string): ExtractedAnime | null {
  const pick = (re: RegExp): string | null => {
    const m = html.match(re);
    return m ? m[1] : null;
  };
  const ogTitle = pick(/<meta property="og:title" content="([^"]+)"/) || "";
  // og:title like "انمي One Piece مترجم - جميع الحلقات | OkAnime" → "One Piece"
  const title =
    ogTitle
      .replace(/\s*\|\s*OkAnime\s*$/i, "")
      .replace(/^انمي\s+/i, "")
      .replace(/\s*مترجم.*$/i, "")
      .trim() || slug;
  const posterUrl = pick(/<meta property="og:image" content="([^"]+)"/) || "";
  // episodeCount = number of episode links on the page for this anime.
  const epLinkRe = new RegExp(
    `href="https://ww3\\.okanime\\.xyz/episode/${slug.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    )}-episode-`,
    "g"
  );
  const episodeCount = (html.match(epLinkRe) || []).length;
  return { title, posterUrl, pageUrl: `${BASE}/anime/${slug}`, episodeCount };
}

async function ensureAnime(animeId: string): Promise<boolean> {
  // Returns true if anime now exists in DB (was already or just inserted).
  const existing = await db.anime.findUnique({ where: { id: animeId }, select: { id: true } });
  if (existing) return true;
  const html = curlText(`${BASE}/anime/${animeId}`);
  if (!html) return false;
  const a = extractAnime(html, animeId);
  if (!a) return false;
  try {
    await db.anime.create({
      data: {
        id: animeId,
        slug: animeId,
        title: a.title,
        pageUrl: a.pageUrl,
        posterUrl: a.posterUrl,
        episodeCount: a.episodeCount,
        sourceCount: 0,
      },
    });
    console.log(`[sync] + anime: ${animeId} (${a.title}, ${a.episodeCount} eps)`);
    return true;
  } catch (e) {
    // Race: another worker inserted it. Treat as exists.
    return (await db.anime.findUnique({ where: { id: animeId }, select: { id: true } })) != null;
  }
}

async function main() {
  const args = new Set(process.argv.slice(2).filter((a) => a.startsWith("--")));
  const dryRun = args.has("--dry-run");
  const episodesOnly = args.has("--episodes-only");
  const animeOnly = args.has("--anime-only");
  const limitIdx = process.argv.indexOf("--limit");
  const limit = limitIdx >= 0 ? parseInt(process.argv[limitIdx + 1], 10) || 0 : 0;
  const sinceIdx = process.argv.indexOf("--since");
  const since = sinceIdx >= 0 ? process.argv[sinceIdx + 1] : null;

  console.log(
    `[sync] okanime sync — dryRun=${dryRun} episodesOnly=${episodesOnly} animeOnly=${animeOnly} limit=${limit || "none"} since=${since || "any"}`
  );

  // 1. Sitemap index.
  const idxXml = curlText(`${BASE}/sitemap.xml`);
  if (!idxXml) {
    console.error("[sync] FATAL: could not fetch sitemap.xml");
    process.exit(1);
  }
  const subs = parseSitemapIndex(idxXml);
  const animeSubs = subs.filter((s) => /sitemap-anime-/.test(s.loc));
  const epSubs = subs.filter((s) => /sitemap-episodes-/.test(s.loc));
  console.log(`[sync] sitemaps: ${animeSubs.length} anime, ${epSubs.length} episodes`);

  const sinceTs = since ? new Date(since).getTime() : 0;

  // 2a. Anime URLs.
  let newAnimeCount = 0;
  if (!episodesOnly) {
    const allAnimeSlugs = new Set<string>();
    for (const s of animeSubs) {
      const xml = curlText(s.loc);
      if (!xml) continue;
      for (const u of parseUrlSet(xml)) {
        if (sinceTs && u.lastmod && new Date(u.lastmod).getTime() < sinceTs) continue;
        const slug = slugFromAnimeUrl(u.loc);
        if (slug) allAnimeSlugs.add(slug);
      }
      await sleep(DELAY_MS);
    }
    const existingAnimeIds = new Set(
      (await db.anime.findMany({ select: { id: true } })).map((a) => a.id)
    );
    const newAnimeSlugs = [...allAnimeSlugs].filter((s) => !existingAnimeIds.has(s));
    console.log(`[sync] anime: ${allAnimeSlugs.size} in sitemap, ${newAnimeSlugs.length} new`);
    newAnimeCount = newAnimeSlugs.length;
    if (!dryRun) {
      for (const slug of newAnimeSlugs) {
        await ensureAnime(slug);
        await sleep(DELAY_MS);
      }
    }
  }

  // 2b. Episode URLs.
  let newEpisodes = 0;
  let newSources = 0;
  if (!animeOnly) {
    const allEpSlugs = new Set<string>();
    for (const s of epSubs) {
      const xml = curlText(s.loc);
      if (!xml) continue;
      for (const u of parseUrlSet(xml)) {
        if (sinceTs && u.lastmod && new Date(u.lastmod).getTime() < sinceTs) continue;
        const slug = slugFromEpisodeUrl(u.loc);
        if (slug) allEpSlugs.add(slug);
      }
      await sleep(DELAY_MS);
    }
    const existingEpIds = new Set(
      (await db.episode.findMany({ select: { id: true } })).map((e) => e.id)
    );
    const newEpSlugs = [...allEpSlugs].filter((s) => !existingEpIds.has(s));
    console.log(
      `[sync] episodes: ${allEpSlugs.size} in sitemap, ${newEpSlugs.length} new${
        limit ? ` (capping at ${limit})` : ""
      }`
    );

    const t0 = Date.now();
    let failed = 0;
    const toProcess = limit ? newEpSlugs.slice(0, limit) : newEpSlugs;
    for (let i = 0; i < toProcess.length; i++) {
      const slug = toProcess[i];
      try {
        const html = curlText(`${BASE}/episode/${slug}`);
        if (!html) {
          failed++;
          continue;
        }
        const ep = extractEpisode(html, slug);
        if (!ep) {
          failed++;
          continue;
        }
        if (!dryRun) {
          // Ensure the anime row exists (it may itself be new).
          await ensureAnime(ep.animeId);
          // Insert the episode (idempotent: skip if exists).
          const exists = await db.episode.findUnique({ where: { id: slug }, select: { id: true } });
          if (!exists) {
            await db.episode.create({
              data: {
                id: slug,
                slug,
                title: ep.title,
                animeId: ep.animeId,
                animeTitle: ep.animeTitle,
                episodeNumber: ep.episodeNumber,
                episodeSort: ep.episodeSort,
                episodePageUrl: ep.pageUrl,
                animePageUrl: `${BASE}/anime/${ep.animeId}`,
                posterUrl: ep.posterUrl,
                watchSources: {
                  create: ep.sources.map((s) => ({
                    provider: s.provider,
                    quality: s.quality,
                    label: s.label,
                    watchUrl: s.watchUrl,
                    providerHost: s.providerHost,
                  })),
                },
              },
            });
            // Update the anime's counts + malId (side enrichment).
            await db.anime.update({
              where: { id: ep.animeId },
              data: {
                episodeCount: { increment: 1 },
                sourceCount: { increment: ep.sources.length },
                ...(ep.malId ? { malId: ep.malId } : {}),
              },
            });
            newEpisodes++;
            newSources += ep.sources.length;
          }
        } else {
          newEpisodes++;
          newSources += ep.sources.length;
          console.log(
            `[sync] (dry) + ep: ${slug} → anime=${ep.animeId} ep=${ep.episodeNumber} sources=${ep.sources.length}`
          );
        }
      } catch (e) {
        failed++;
      }
      if (i % 25 === 0 || i === toProcess.length - 1) {
        console.log(
          `[sync] ${i + 1}/${toProcess.length} +eps=${newEpisodes} +sources=${newSources} failed=${failed} (${((Date.now() - t0) / 1000).toFixed(0)}s)`
        );
      }
      await sleep(DELAY_MS);
    }
  }

  console.log(
    `[sync] DONE — new anime=${newAnimeCount}, new episodes=${newEpisodes}, new sources=${newSources}`
  );
}

main()
  .catch((err) => {
    console.error("[sync] FATAL:", err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
