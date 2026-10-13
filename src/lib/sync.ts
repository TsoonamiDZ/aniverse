/**
 * okanime.xyz sync library — scans sitemaps and adds NEW anime + episodes
 * (with watch-source embed links) to the database. Reusable from the CLI
 * script AND from the /api/sync route (so users can trigger it from the site).
 *
 * Idempotent + resumable: re-running skips anything already in the DB.
 */
import { db } from "@/lib/db";
import { spawnSync } from "child_process";

const BASE = "https://ww3.okanime.xyz";
const DELAY_MS = 250; // be polite to the source site
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface SyncOptions {
  dryRun?: boolean;
  episodesOnly?: boolean;
  animeOnly?: boolean;
  /** Cap on NEW episodes processed in this run (keeps API requests bounded). */
  limit?: number;
  /** Only consider sitemap URLs with lastmod >= this ISO date. */
  since?: string;
  /** Optional progress callback. */
  onProgress?: (msg: string) => void;
}

export interface SyncResult {
  sitemapAnime: number;
  sitemapEpisodes: number;
  newAnimeInSitemap: number;
  newEpisodesInSitemap: number;
  insertedAnime: number;
  insertedEpisodes: number;
  insertedSources: number;
  failed: number;
  durationMs: number;
}

export function syncLog(opts: SyncOptions, msg: string) {
  if (opts.onProgress) opts.onProgress(msg);
}

/** HTTP GET via curl (sync, Node child_process — works in Next.js server runtime
 * where the Bun global isn't available). Returns text or null. */
function curlText(url: string): string | null {
  const proc = spawnSync(
    "curl",
    ["-sS", "-m", "20", "-A", "Mozilla/5.0 (compatible; aniqa-sync/1.0)", url],
    { stdio: ["ignore", "pipe", "ignore"] }
  );
  if (proc.status !== 0 || proc.error) return null;
  return proc.stdout.toString();
}

interface SitemapEntry {
  loc: string;
  lastmod?: string;
}

function parseSitemapIndex(xml: string): SitemapEntry[] {
  const out: SitemapEntry[] = [];
  const re = /<sitemap>[\s\S]*?<loc>([^<]+)<\/loc>(?:[\s\S]*?<lastmod>([^<]+)<\/lastmod>)?[\s\S]*?<\/sitemap>/g;
  let m;
  while ((m = re.exec(xml))) out.push({ loc: m[1].trim(), lastmod: m[2]?.trim() });
  return out;
}

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

function extractEpisode(html: string, slug: string): ExtractedEpisode | null {
  const pick = (re: RegExp): string | null => {
    const m = html.match(re);
    return m ? m[1] : null;
  };
  const pageUrl = `${BASE}/episode/${slug}`;
  const ogTitle = pick(/<meta property="og:title" content="([^"]+)"/) || "";
  const title = ogTitle.replace(/\s*\|\s*OkAnime\s*$/i, "").trim() || slug;
  const posterUrl = pick(/<meta property="og:image" content="([^"]+)"/) || "";
  const malIdRaw = pick(/data-umami-event-mal_id="([^"]+)"/);
  const malId = malIdRaw ? parseInt(malIdRaw, 10) : null;
  const epNumRaw = pick(/data-umami-event-episode_number="([^"]+)"/) || "0";
  const animeHref = pick(/href="https:\/\/ww3\.okanime\.xyz\/anime\/([^"?#]+)/);
  const animeId = animeHref ? decodeURIComponent(animeHref) : "";
  const animeTitle = ogTitle.split(/\s+الحلقة\s/)[0].trim() || animeId || "";

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
    episodeNumber: String(epNumRaw),
    episodeSort: toSortNum(epNumRaw),
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

function extractAnime(html: string, slug: string): ExtractedAnime | null {
  const pick = (re: RegExp): string | null => {
    const m = html.match(re);
    return m ? m[1] : null;
  };
  const ogTitle = pick(/<meta property="og:title" content="([^"]+)"/) || "";
  const title =
    ogTitle
      .replace(/\s*\|\s*OkAnime\s*$/i, "")
      .replace(/^انمي\s+/i, "")
      .replace(/\s*مترجم.*$/i, "")
      .trim() || slug;
  const posterUrl = pick(/<meta property="og:image" content="([^"]+)"/) || "";
  const escSlug = slug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const epLinkRe = new RegExp(
    `href="https://ww3\\.okanime\\.xyz/episode/${escSlug}-episode-`,
    "g"
  );
  const episodeCount = (html.match(epLinkRe) || []).length;
  return { title, posterUrl, pageUrl: `${BASE}/anime/${slug}`, episodeCount };
}

async function ensureAnime(animeId: string): Promise<boolean> {
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
    return true;
  } catch {
    return (await db.anime.findUnique({ where: { id: animeId }, select: { id: true } })) != null;
  }
}

/** Run a sync pass. Returns a structured summary. */
export async function runSync(opts: SyncOptions = {}): Promise<SyncResult> {
  const t0 = Date.now();
  const res: SyncResult = {
    sitemapAnime: 0,
    sitemapEpisodes: 0,
    newAnimeInSitemap: 0,
    newEpisodesInSitemap: 0,
    insertedAnime: 0,
    insertedEpisodes: 0,
    insertedSources: 0,
    failed: 0,
    durationMs: 0,
  };

  const sinceTs = opts.since ? new Date(opts.since).getTime() : 0;

  // 1. Sitemap index.
  const idxXml = curlText(`${BASE}/sitemap.xml`);
  if (!idxXml) {
    res.durationMs = Date.now() - t0;
    throw new Error("could not fetch sitemap.xml");
  }
  const subs = parseSitemapIndex(idxXml);
  const animeSubs = subs.filter((s) => /sitemap-anime-/.test(s.loc));
  const epSubs = subs.filter((s) => /sitemap-episodes-/.test(s.loc));
  syncLog(opts, `[sync] sitemaps: ${animeSubs.length} anime, ${epSubs.length} episodes`);

  // 2a. Anime URLs.
  if (!opts.episodesOnly) {
    const allSlugs = new Set<string>();
    for (const s of animeSubs) {
      const xml = curlText(s.loc);
      if (!xml) continue;
      for (const u of parseUrlSet(xml)) {
        if (sinceTs && u.lastmod && new Date(u.lastmod).getTime() < sinceTs) continue;
        const slug = slugFromAnimeUrl(u.loc);
        if (slug) allSlugs.add(slug);
      }
      await sleep(DELAY_MS);
    }
    res.sitemapAnime = allSlugs.size;
    const existing = new Set((await db.anime.findMany({ select: { id: true } })).map((a) => a.id));
    const newSlugs = [...allSlugs].filter((s) => !existing.has(s));
    res.newAnimeInSitemap = newSlugs.length;
    syncLog(opts, `[sync] anime: ${allSlugs.size} in sitemap, ${newSlugs.length} new`);
    if (!opts.dryRun) {
      for (const slug of newSlugs) {
        if (await ensureAnime(slug)) res.insertedAnime++;
        await sleep(DELAY_MS);
      }
    } else {
      res.insertedAnime = newSlugs.length;
    }
  }

  // 2b. Episode URLs.
  if (!opts.animeOnly) {
    const allSlugs = new Set<string>();
    for (const s of epSubs) {
      const xml = curlText(s.loc);
      if (!xml) continue;
      for (const u of parseUrlSet(xml)) {
        if (sinceTs && u.lastmod && new Date(u.lastmod).getTime() < sinceTs) continue;
        const slug = slugFromEpisodeUrl(u.loc);
        if (slug) allSlugs.add(slug);
      }
      await sleep(DELAY_MS);
    }
    res.sitemapEpisodes = allSlugs.size;
    const existing = new Set((await db.episode.findMany({ select: { id: true } })).map((e) => e.id));
    const newSlugs = [...allSlugs].filter((s) => !existing.has(s));
    res.newEpisodesInSitemap = newSlugs.length;
    const toProcess = opts.limit ? newSlugs.slice(0, opts.limit) : newSlugs;
    syncLog(
      opts,
      `[sync] episodes: ${allSlugs.size} in sitemap, ${newSlugs.length} new${opts.limit ? ` (capping at ${opts.limit})` : ""}`
    );

    for (let i = 0; i < toProcess.length; i++) {
      const slug = toProcess[i];
      try {
        const html = curlText(`${BASE}/episode/${slug}`);
        if (!html) {
          res.failed++;
          continue;
        }
        const ep = extractEpisode(html, slug);
        if (!ep) {
          res.failed++;
          continue;
        }
        if (!opts.dryRun) {
          await ensureAnime(ep.animeId);
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
            await db.anime.update({
              where: { id: ep.animeId },
              data: {
                episodeCount: { increment: 1 },
                sourceCount: { increment: ep.sources.length },
                ...(ep.malId ? { malId: ep.malId } : {}),
              },
            });
            res.insertedEpisodes++;
            res.insertedSources += ep.sources.length;
          }
        } else {
          res.insertedEpisodes++;
          res.insertedSources += ep.sources.length;
        }
      } catch {
        res.failed++;
      }
      if (i % 25 === 0 || i === toProcess.length - 1) {
        syncLog(
          opts,
          `[sync] ${i + 1}/${toProcess.length} +eps=${res.insertedEpisodes} +sources=${res.insertedSources} failed=${res.failed}`
        );
      }
      await sleep(DELAY_MS);
    }
  }

  res.durationMs = Date.now() - t0;
  return res;
}
