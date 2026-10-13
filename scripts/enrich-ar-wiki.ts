/**
 * Enrich the catalog with Arabic synopses from Arabic Wikipedia (a real Arabic
 * source — NOT machine translation).
 *
 * Pipeline per anime (popular-first):
 *   1. English Wikipedia `generator=search` + `prop=langlinks` → Arabic article title.
 *   2. Arabic Wikipedia `prop=extracts` (batched 50/call) → Arabic intro extract.
 *   3. Store as `synopsisAr`.
 *
 * Also fills `genresAr` via a fixed genre dictionary (standard anime-genre terms).
 *
 * Usage:
 *   bun run scripts/enrich-ar-wiki.ts             # all missing, popular-first
 *   bun run scripts/enrich-ar-wiki.ts --limit 200 # only top 200
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient({ log: [] });

const EN_API = "https://en.wikipedia.org/w/api.php";
const AR_API = "https://ar.wikipedia.org/w/api.php";
const DELAY_MS = 250; // Wikipedia is fast & generous; paced to avoid soft rate-limits
const EXTRACT_BATCH = 50; // titles per AR extracts call
const MAX_RETRIES = 2; // fast-fail: don't burn time on hung endpoints

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** HTTP GET via curl — Bun's fetch is blocked by Wikimedia's WAF (TLS fingerprint),
 * but curl works fine. Synchronous is OK for this sequential enrichment script. */
function curlJson(url: string): any | null {
  // Single curl attempt with a hard timeout — fast-fail to avoid burning the
  // time budget on hung/throttled endpoints. Wikipedia returns 200 normally.
  const proc = Bun.spawnSync(
    ["curl", "-sS", "-m", "10", "-A", "aniqa-arwiki/1.0 (anime catalog)", url],
    { stdin: "ignore", stdout: "pipe", stderr: "ignore" }
  );
  if (proc.exitCode !== 0) return null;
  try {
    return JSON.parse(proc.stdout.toString());
  } catch {
    return null;
  }
}

/** Standard anime-genre dictionary (Arabic). */
const GENRE_AR: Record<string, string> = {
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
  Musical: "موسيقي",
  School: "مدرسي",
  Historical: "تاريخي",
  Military: "عسكري",
  Police: "شرطة",
  Samurai: "ساموراي",
  Space: "فضاء",
  Vampire: "مصاص دماء",
  Zombie: "زومبي",
  Parody: "محاكاة ساخرة",
  Harem: "هريم",
  "Reverse Harem": "هريم عكسي",
  Game: "لعبة",
  Detective: "تحري",
  Medical: "طبي",
  "Award Winning": "حائز على جائزة",
  Gourmet: "طعام",
  Idol: "آيدول",
  Reincarnation: "تناسخ",
  Isekai: "عالم آخر",
  Strategy: "استراتيجية",
  "Team Sports": "رياضة جماعية",
  Combat: "قتال",
  "Visual Arts": "فنون بصرية",
  CGDCT: "فتيات لطيفات",
  Iyashikei: "شفائي",
  "Otaku Culture": "ثقافة الأوتاكو",
  Anthropomorphic: "تجسيد",
  "Mythology": "أساطير",
  "Magic": "سحر",
  "Survival": "بقاء",
  "Time Travel": "سفر عبر الزمن",
  "Cooking": "طبخ",
  "Racing": "سباق",
  "Music": "موسيقى",
  "Kids": "أطفال",
  Shounen: "شونين",
  Seinen: "سينين",
  Shoujo: "شوجو",
  Josei: "جوسي",
};

function translateGenres(genres: string | null): string | null {
  if (!genres) return null;
  const parts = genres
    .split(",")
    .map((g) => g.trim())
    .filter(Boolean)
    .map((g) => GENRE_AR[g] || g);
  return parts.length ? parts.join(", ") : null;
}

interface WikiResp {
  query?: {
    pages?: Record<
      string,
      { title?: string; langlinks?: { lang: string; "*": string }[]; missing?: string }
    >;
  };
  continue?: { llcontinue?: string };
}

interface ExtractResp {
  query?: {
    pages?: Record<string, { title?: string; extract?: string; missing?: string }>;
  };
}

/** English Wikipedia: find the Arabic langlink title.
 * Two-pass: (1) "{title} anime" (disambiguates to the anime article, avoids e.g.
 * the "Bleach" chemical article), (2) "{title}" alone (finds the franchise article
 * which usually has the Arabic langlink, e.g. Naruto→ناروتو, Gintama→غينتاما). */
async function findArabicTitle(title: string): Promise<string | null> {
  const trySearch = async (query: string): Promise<string | null> => {
    const params = new URLSearchParams({
      action: "query",
      generator: "search",
      gsrsearch: query,
      gsrlimit: "1",
      gsrnamespace: "0",
      prop: "langlinks",
      lllang: "ar",
      lllimit: "1",
      redirects: "1",
      format: "json",
    });
    const json = curlJson(`${EN_API}?${params.toString()}`) as WikiResp | null;
    const pages = json?.query?.pages;
    if (!pages) return null;
    const first = Object.values(pages)[0];
    if (!first || first.missing) return null;
    return first.langlinks?.[0]?.["*"] || null;
  };
  return (
    (await trySearch(`${title} anime`)) || (await trySearch(`${title}`)) || null
  );
}

/** Arabic Wikipedia: batch fetch intro extracts for up to 50 titles. */
async function fetchArabicExtracts(
  arabicTitles: string[]
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const params = new URLSearchParams({
    action: "query",
    titles: arabicTitles.join("|"),
    prop: "extracts",
    exintro: "1",
    explaintext: "1",
    exsectionformat: "plain",
    redirects: "1",
    format: "json",
  });
  const json = curlJson(`${AR_API}?${params.toString()}`) as ExtractResp | null;
  const pages = json?.query?.pages;
  if (!pages) return out;
  for (const p of Object.values(pages)) {
    if (p.missing || !p.extract) continue;
    out.set(p.title as string, p.extract.trim());
  }
  return out;
}

/** Arabic Wikipedia REST summary API: fetch the intro extract for ONE title.
 * URL: https://ar.wikipedia.org/api/rest_v1/page/summary/{title} */
async function fetchArabicExtractSingle(arabicTitle: string): Promise<string | null> {
  const url = `https://ar.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(arabicTitle)}`;
  const json = curlJson(url) as { extract?: string; type?: string } | null;
  if (!json || json.type === "disambiguation") return null;
  return json.extract || null;
}

function cleanExtract(text: string): string {
  // Take the first 1-2 paragraphs, trim, cap length.
  const paras = text.split(/\n{2,}/).filter(Boolean);
  const out = paras.slice(0, 2).join("\n\n");
  return out.length > 1400 ? out.slice(0, 1400).trim() + "…" : out;
}

async function main() {
  const args = process.argv.slice(2);
  const limitIdx = args.indexOf("--limit");
  const limit = limitIdx >= 0 ? parseInt(args[limitIdx + 1], 10) || 0 : 0;

  const animes = await db.anime.findMany({
    where: { synopsisAr: null, metaStatus: "ok" },
    orderBy: { sourceCount: "desc" },
    take: limit > 0 ? limit : undefined,
    select: { id: true, title: true, titleEnglish: true, titleRomaji: true, genres: true },
  });

  console.log(
    `[ar-wiki] ${animes.length} anime to enrich with Arabic Wikipedia synopses (incremental, resumable)`
  );

  let written = 0;
  let notFound = 0;
  let failed = 0;
  const t0 = Date.now();
  const report = (i: number) => {
    console.log(
      `[ar-wiki] ${i + 1}/${animes.length} written=${written} notfound=${notFound} failed=${failed} (${((Date.now() - t0) / 1000).toFixed(0)}s)`
    );
  };

  for (let i = 0; i < animes.length; i++) {
    const a = animes[i];
    const searchTitle = a.titleEnglish || a.titleRomaji || a.title;
    try {
      const arTitle = await findArabicTitle(searchTitle);
      if (!arTitle) {
        notFound++;
      } else {
        const extract = await fetchArabicExtractSingle(arTitle);
        if (extract) {
          await db.anime.update({
            where: { id: a.id },
            data: {
              synopsisAr: cleanExtract(extract),
              genresAr: translateGenres(a.genres),
            },
          });
          written++;
        } else {
          notFound++;
        }
      }
    } catch (e) {
      failed++;
    }
    if (i % 25 === 0 || i === animes.length - 1) report(i);
    await sleep(DELAY_MS);
  }

  // Also fill genresAr for anime that didn't get an Arabic synopsis.
  const genreOnly = await db.anime.findMany({
    where: { genresAr: null, genres: { not: null } },
    select: { id: true, genres: true },
  });
  let genreWritten = 0;
  for (const a of genreOnly) {
    const g = translateGenres(a.genres);
    if (g) {
      await db.anime.update({ where: { id: a.id }, data: { genresAr: g } });
      genreWritten++;
    }
  }

  console.log(
    `[ar-wiki] DONE in ${((Date.now() - t0) / 1000).toFixed(0)}s — synopsisAr written=${written} notfound=${notFound} failed=${failed} genresAr-only=${genreWritten}`
  );
}

main()
  .catch((err) => {
    console.error("[ar-wiki] FATAL:", err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
