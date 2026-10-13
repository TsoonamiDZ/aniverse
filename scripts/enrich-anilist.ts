/**
 * Enrich the anime catalog with AniList GraphQL metadata (which itself mirrors
 * MyAnimeList data, plus a wide banner image and a dominant cover color).
 *
 *   POST https://graphql.anilist.co
 *
 * Batches up to BATCH titles per GraphQL request using aliased `Media(...)`
 * fields, so all 2,186 anime can be enriched in ~100 requests (~2 minutes).
 *
 * Usage:
 *   bun run scripts/enrich-anilist.ts                # all missing, popular-first
 *   bun run scripts/enrich-anilist.ts --limit 300    # only top 300
 *   bun run scripts/enrich-anilist.ts --all          # re-fetch even if done
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient({ log: [] });

const ENDPOINT = "https://graphql.anilist.co";
const BATCH = 10; // aliased Page queries per request (Page.media returns [] on no-match, so no all-null 404)
const BASE_DELAY_MS = 1100; // ~55 req/min, safely under AniList's 90/min rate limit
const MAX_RETRIES = 4;

const MEDIA_FIELDS = `
  id
  idMal
  title { romaji english native }
  description(asHtml: false)
  averageScore
  meanScore
  popularity
  favourites
  episodes
  duration
  status
  season
  seasonYear
  format
  source
  startDate { year month day }
  coverImage { extraLarge large color }
  bannerImage
  trailer { id site thumbnail }
  genres
  studios(isMain: true) { nodes { name isAnimationStudio } }
  nextAiringEpisode { airingAt episode }
  tags { name rank }
`;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Build a batched GraphQL query with one aliased Page(perPage:1) per title.
 * Using Page (not Media) means a no-match returns media: [] (HTTP 200) instead
 * of null + HTTP 404 which would null out the whole batch. */
function buildQuery(titles: string[]): string {
  const aliasLines = titles
    .map((t, i) => {
      const esc = t.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
      return `a${i}: Page(page: 1, perPage: 1) { media(search: "${esc}", type: ANIME, sort: POPULARITY_DESC) { ${MEDIA_FIELDS} } }`;
    })
    .join("\n");
  return `{ ${aliasLines} }`;
}

interface AniMedia {
  id: number;
  idMal: number | null;
  title: { romaji: string | null; english: string | null; native: string | null } | null;
  description: string | null;
  averageScore: number | null;
  meanScore: number | null;
  popularity: number | null;
  favourites: number | null;
  episodes: number | null;
  duration: number | null;
  status: string | null;
  season: string | null;
  seasonYear: number | null;
  format: string | null;
  source: string | null;
  startDate: { year: number | null; month: number | null; day: number | null } | null;
  coverImage: { extraLarge: string | null; large: string | null; color: string | null } | null;
  bannerImage: string | null;
  trailer: { id: string | null; site: string | null; thumbnail: string | null } | null;
  genres: string[] | null;
  studios: { nodes: { name: string; isAnimationStudio: boolean }[] } | null;
  nextAiringEpisode: { airingAt: number; episode: number } | null;
  tags: { name: string; rank: number | null }[] | null;
}

/** Per-alias response: { media: AniMedia[] | null }. */
interface AniPage { media: AniMedia[] | null }

/** Strip AniList HTML-ish description to clean multiline text. */
function cleanSynopsis(html: string | null): string | null {
  if (!html) return null;
  // AniList uses <br>, <b>, <i>, <a href="...">...</a>
  return html
    .replace(/<\/a>/gi, "")
    .replace(/<a [^>]*>/gi, "")
    .replace(/<\/?b>/gi, "")
    .replace(/<\/?i>/gi, "")
    .replace(/<\/?strong>/gi, "")
    .replace(/<\/?em>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function airedStringFrom(start?: { year: number | null; month: number | null; day: number | null } | null): string | null {
  if (!start || !start.year) return null;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const m = start.month ? months[start.month - 1] : null;
  const d = start.day ? `${start.day},` : null;
  return [m, d, start.year].filter(Boolean).join(" ");
}

function mapMedia(m: AniMedia | null): { status: "ok" | "not_found"; data: Record<string, unknown> } {
  if (!m) return { status: "not_found", data: {} };
  const studios = m.studios?.nodes?.filter((s) => s.isAnimationStudio).map((s) => s.name) ?? [];
  const tags = (m.tags ?? [])
    .filter((t) => t.rank == null || t.rank > 0)
    .sort((a, b) => (b.rank ?? 0) - (a.rank ?? 0))
    .slice(0, 12)
    .map((t) => t.name);
  return {
    status: "ok",
    data: {
      anilistId: m.id,
      malId: m.idMal,
      anilistUrl: m.id ? `https://anilist.co/anime/${m.id}` : null,
      malUrl: m.idMal ? `https://myanimelist.net/anime/${m.idMal}` : null,
      coverImage: m.coverImage?.extraLarge || m.coverImage?.large || null,
      coverColor: m.coverImage?.color || null,
      bannerImage: m.bannerImage || null,
      trailerYoutubeId: m.trailer?.site === "youtube" ? m.trailer?.id : null,
      trailerThumbnail: m.trailer?.thumbnail || null,
      titleRomaji: m.title?.romaji || null,
      titleEnglish: m.title?.english || null,
      titleJapanese: m.title?.native || null,
      animeType: m.format || null,
      animeSource: m.source || null,
      malEpisodes: m.episodes ?? null,
      animeStatus: m.status || null,
      airing: m.status === "RELEASING",
      airedString: airedStringFrom(m.startDate),
      airedYear: m.seasonYear ?? m.startDate?.year ?? null,
      season: m.season || null,
      duration: m.duration ?? null,
      score: m.averageScore ?? null,
      popularity: m.popularity ?? null,
      favorites: m.favourites ?? null,
      synopsis: cleanSynopsis(m.description),
      studios: studios.length ? studios.join(", ") : null,
      genres: m.genres?.length ? m.genres.join(", ") : null,
      tags: tags.length ? tags.join(", ") : null,
      nextEpisode: m.nextAiringEpisode?.episode ?? null,
      nextEpisodeAirAt: m.nextAiringEpisode?.airingAt
        ? new Date(m.nextAiringEpisode.airingAt * 1000).toISOString()
        : null,
    },
  };
}

async function postGraphQL(query: string): Promise<Record<string, AniPage | null> | null> {
  let lastErr: unknown = null;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const r = await fetch(ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "User-Agent": "aniqa-enricher/1.0",
        },
        body: JSON.stringify({ query }),
      });

      // Rate limit / server errors: retry with backoff.
      if (r.status === 429 || r.status >= 500) {
        await sleep(2000 * 2 ** attempt);
        continue;
      }

      const text = await r.text().catch(() => "");
      let json: { data?: Record<string, AniMedia | null> | null; errors?: unknown[] } | null = null;
      try {
        json = JSON.parse(text);
      } catch {
        // Non-JSON body (HTML error page etc.) — retry once.
        if (attempt < MAX_RETRIES - 1) {
          await sleep(1500 * 2 ** attempt);
          continue;
        }
        console.warn(`[enrich] non-JSON response (HTTP ${r.status}): ${text.slice(0, 200)}`);
        return null;
      }

      // Page-based search returns HTTP 200 with media: [] on no-match, so the
      // data object is always present for valid queries.
      if (json && typeof json.data === "object" && json.data !== null) {
        return json.data as Record<string, AniPage | null>;
      }

      // No data key (e.g. real GraphQL syntax error). Surface & bail.
      if (json?.errors) {
        console.warn(
          `[enrich] graphql errors (HTTP ${r.status}): ${JSON.stringify(json.errors).slice(0, 300)}`
        );
      }
      return null;
    } catch (e) {
      lastErr = e;
      await sleep(1500 * 2 ** attempt);
    }
  }
  console.warn("[enrich] graphql gave up after retries:", lastErr);
  return null;
}

async function enrichBatch(batch: { id: string; title: string }[]): Promise<{
  ok: number;
  notFound: number;
  failed: number;
}> {
  const titles = batch.map((b) => b.title);
  const query = buildQuery(titles);
  const data = await postGraphQL(query);
  if (!data) {
    // whole batch failed
    for (const b of batch) {
      await db.anime.update({
        where: { id: b.id },
        data: { metaStatus: "error", metaFetchedAt: new Date() },
      });
    }
    return { ok: 0, notFound: 0, failed: batch.length };
  }

  let ok = 0;
  let notFound = 0;
  let failed = 0;
  for (let i = 0; i < batch.length; i++) {
    const a = batch[i];
    const page = data[`a${i}`] ?? null;
    const m = page?.media?.[0] ?? null;
    const mapped = mapMedia(m);
    try {
      await db.anime.update({
        where: { id: a.id },
        data: { ...(mapped.data as object), metaStatus: mapped.status, metaFetchedAt: new Date() },
      });
      if (mapped.status === "ok") ok++;
      else notFound++;
    } catch (e) {
      failed++;
      console.warn(`[enrich] db update failed for "${a.title}":`, e);
    }
  }
  return { ok, notFound, failed };
}

async function main() {
  const args = process.argv.slice(2);
  const forceAll = args.includes("--all");
  const limitIdx = args.indexOf("--limit");
  const limit = limitIdx >= 0 ? parseInt(args[limitIdx + 1], 10) || 0 : 0;

  const animes = await db.anime.findMany({
    where: forceAll ? undefined : { metaFetchedAt: null },
    orderBy: { sourceCount: "desc" },
    take: limit > 0 ? limit : undefined,
    select: { id: true, title: true },
  });

  console.log(
    `[enrich] ${animes.length} anime to enrich (batch=${BATCH}, forceAll=${forceAll}, limit=${limit || "none"})`
  );

  let ok = 0;
  let notFound = 0;
  let failed = 0;
  const t0 = Date.now();

  for (let i = 0; i < animes.length; i += BATCH) {
    const batch = animes.slice(i, i + BATCH);
    const r = await enrichBatch(batch);
    ok += r.ok;
    notFound += r.notFound;
    failed += r.failed;
    console.log(
      `[enrich] ${Math.min(i + BATCH, animes.length)}/${animes.length} ok=${ok} nf=${notFound} fl=${failed} ` +
        `(${((Date.now() - t0) / 1000).toFixed(0)}s) — batch sample: "${batch[0].title}"`
    );
    await sleep(BASE_DELAY_MS);
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
