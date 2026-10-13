/**
 * Enrich the anime catalog with MyAnimeList metadata via the Jikan v4 API
 * (unofficial MAL REST API, no key required).
 *
 *   GET https://api.jikan.moe/v4/anime?q=<title>&limit=1&sfw=true
 *
 * Usage:
 *   bun run scripts/enrich-mal.ts                       # all missing, popular-first
 *   bun run scripts/enrich-mal.ts --limit 250          # only top 250
 *   bun run scripts/enrich-mal.ts --all                # re-fetch even if already done
 *
 * Rate limit: ~500ms between requests (≈2 req/s, well under Jikan's 3 req/s),
 * with exponential backoff on HTTP 429 / 5xx.
 */
import { PrismaClient } from "@prisma/client";
import * as fs from "fs";

const db = new PrismaClient({ log: [] });

const JIKAN = "https://api.jikan.moe/v4";
const BASE_DELAY_MS = 500; // between requests
const MAX_RETRIES = 4;

interface MalAnime {
  mal_id: number;
  url: string;
  images?: {
    webp?: { large_image_url?: string };
    jpg?: { large_image_url?: string };
  };
  trailer?: { youtube_id?: string | null; embed_url?: string | null } | null;
  title: string;
  title_english?: string | null;
  title_japanese?: string | null;
  type?: string | null;
  source?: string | null;
  episodes?: number | null;
  status?: string | null;
  airing?: boolean | null;
  aired?: { string?: string; from?: string | null } | null;
  season?: string | null;
  year?: number | null;
  duration?: string | null;
  rating?: string | null;
  score?: number | null;
  scored_by?: number | null;
  rank?: number | null;
  popularity?: number | null;
  members?: number | null;
  favorites?: number | null;
  synopsis?: string | null;
  background?: string | null;
  studios?: { name: string }[];
  genres?: { name: string }[];
  themes?: { name: string }[];
  demographics?: { name: string }[];
  producers?: { name: string }[];
  licensors?: { name: string }[];
}

interface JikanResponse {
  data?: MalAnime[];
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchJikan(title: string): Promise<MalAnime | null> {
  const url = `${JIKAN}/anime?q=${encodeURIComponent(title)}&limit=1&sfw=true`;
  let lastErr: unknown = null;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const r = await fetch(url, {
        headers: { Accept: "application/json", "User-Agent": "aniqa-enricher/1.0" },
      });
      if (r.status === 429 || r.status >= 500) {
        // backoff: 2s, 4s, 8s, 16s
        const back = 2000 * 2 ** attempt;
        await sleep(back);
        continue;
      }
      if (!r.ok) {
        // permanent non-retryable (e.g. 400/404)
        return null;
      }
      const json = (await r.json()) as JikanResponse;
      return json.data && json.data.length > 0 ? json.data[0] : null;
    } catch (e) {
      lastErr = e;
      await sleep(1500 * 2 ** attempt);
    }
  }
  console.warn(`[enrich] giving up on "${title}" after ${MAX_RETRIES} retries:`, lastErr);
  return null;
}

function listNames(arr?: { name: string }[]): string | null {
  if (!arr || arr.length === 0) return null;
  return arr.map((x) => x.name).join(", ");
}

async function enrichOne(animeId: string, title: string): Promise<{
  status: "ok" | "not_found";
  data: Record<string, unknown>;
}> {
  const m = await fetchJikan(title);
  if (!m) {
    return { status: "not_found", data: {} };
  }
  const airedYear = m.year ?? (m.aired?.from ? new Date(m.aired.from).getUTCFullYear() : null);
  return {
    status: "ok",
    data: {
      malId: m.mal_id,
      malUrl: m.url,
      malImageUrl: m.images?.webp?.large_image_url || m.images?.jpg?.large_image_url || null,
      trailerYoutubeId: m.trailer?.youtube_id || null,
      trailerEmbedUrl: m.trailer?.embed_url || null,
      titleEnglish: m.title_english || null,
      titleJapanese: m.title_japanese || null,
      animeType: m.type || null,
      animeSource: m.source || null,
      malEpisodes: m.episodes ?? null,
      animeStatus: m.status || null,
      airing: m.airing ?? null,
      airedString: m.aired?.string || null,
      airedYear: airedYear ?? null,
      season: m.season || null,
      duration: m.duration || null,
      ageRating: m.rating || null,
      score: m.score ?? null,
      scoredBy: m.scored_by ?? null,
      rank: m.rank ?? null,
      popularityRank: m.popularity ?? null,
      members: m.members ?? null,
      favorites: m.favorites ?? null,
      synopsis: m.synopsis || null,
      background: m.background || null,
      studios: listNames(m.studios),
      genres: listNames(m.genres),
      themes: listNames(m.themes),
      demographics: listNames(m.demographics),
      producers: listNames(m.producers),
      licensors: listNames(m.licensors),
    },
  };
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const limitIdx = process.argv.indexOf("--limit");
  const limit =
    limitIdx >= 0 ? parseInt(process.argv[1 + 0], 10) || parseInt(process.argv[limitIdx + 1], 10) || 0 : 0;
  const forceAll = args.has("--all");
  const minDurationIdx = process.argv.indexOf("--min-duration");
  const minDuration =
    minDurationIdx >= 0 ? parseInt(process.argv[minDurationIdx + 1], 10) || BASE_DELAY_MS : BASE_DELAY_MS;

  // Anime needing enrichment: popular (sourceCount desc) first.
  const animes = await db.anime.findMany({
    where: forceAll ? undefined : { metaFetchedAt: null },
    orderBy: { sourceCount: "desc" },
    take: limit > 0 ? limit : undefined,
    select: { id: true, title: true },
  });

  console.log(
    `[enrich] ${animes.length} anime to enrich (forceAll=${forceAll}, limit=${limit || "none"}, delay=${minDuration}ms)`
  );

  let ok = 0;
  let notFound = 0;
  let failed = 0;
  const t0 = Date.now();

  for (let i = 0; i < animes.length; i++) {
    const a = animes[i];
    try {
      const r = await enrichOne(a.id, a.title);
      await db.anime.update({
        where: { id: a.id },
        data: {
          ...(r.data as object),
          metaStatus: r.status,
          metaFetchedAt: new Date(),
        },
      });
      if (r.status === "ok") ok++;
      else notFound++;
      if (i % 25 === 0 || i === animes.length - 1) {
        console.log(
          `[enrich] ${i + 1}/${animes.length} ok=${ok} notfound=${notFound} failed=${failed} ` +
            `(${((Date.now() - t0) / 1000).toFixed(0)}s) — last: ${a.title} → ${r.status}`
        );
      }
    } catch (e) {
      failed++;
      console.warn(`[enrich] error on "${a.title}":`, e);
    }
    await sleep(minDuration);
  }

  console.log(
    `[enrich] DONE in ${((Date.now() - t0) / 1000).toFixed(0)}s — ok=${ok} notfound=${notFound} failed=${failed}`
  );
}

main()
  .catch((err) => {
    console.error("[enrich] FATAL:", err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
