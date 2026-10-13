# Worklog — Anime Streaming Site

## Project Overview
Building an Arabic (RTL) anime streaming website from an uploaded catalog JSON
(2,186 anime, 25,866 episodes, 149,216 watch-source links sourced from okanime.xyz).

Stack: Next.js 16 (App Router) + TypeScript + Tailwind 4 + shadcn/ui + Prisma/SQLite.
Single user-visible route: `/` (view switching via searchParams).
API routes under `/api/*`.

---
Task ID: 1
Agent: main
Task: Set up Prisma schema (Anime / Episode / WatchSource) and push to SQLite.

Work Log:
- Inspected uploaded JSON (top-level keys: anime[], episodes[], counts, watchLinkCounts, titleNotes)
- Anime record: {id, slug, title, pageUrl, posterUrl, episodeCount, links}
- Episode record: {id, slug, title, animeId, animeTitle, episodeNumber(string), episodePageUrl, animePageUrl, posterUrl, lastModified, links, watchSources[], watchSourceExtraction}
- WatchSource: {provider, quality, label, watchUrl, providerHost}
- Confirmed 2186 anime, 25866 episodes, 149216 sources, all episodes have >=1 source
- Top providers: mp4upload, mega_bdon_aaalanat, uqload, megamax, sendvid, google_drive, mega, vk, videa
- Qualities: 720p (77k), 1080p (42k), 480p (29k)

Stage Summary:
- Wrote prisma/schema.prisma with Anime / Episode / WatchSource models.
- Ran `bun run db:push` (schema synced, Prisma client generated).
- Wrote scripts/import-catalog.ts (batched createMany inside one transaction).
- Ran import: DONE in 6.0s -> anime=2186 episodes=25866 sources=149216.
- Verified: top anime by sources = One Piece (1544), Conan, Boruto, Bleach, Pokemon, DBZ.
- WatchSource groupBy providers matches source JSON.

---
Task ID: 2
Agent: main
Task: Build backend API routes (stats, anime list, anime detail, episode detail).

Work Log:
- Reduced Prisma client log noise to ['warn','error'] in src/lib/db.ts (query log floods dev.log).
- Designing 4 routes:
  * GET /api/stats -> { anime, episodes, sources, providers, topProviders[] }
  * GET /api/anime?page&pageSize&sort&q -> paginated list
  * GET /api/anime/[slug] -> detail + episodes (sorted by episodeSort asc)
  * GET /api/episode/[id] -> episode + sources + prev/next siblings

Stage Summary:
- (in progress) About to write the 4 route.ts files.

---
Task ID: 3
Agent: main
Task: Build backend API routes (stats, anime list, anime detail, episode detail).

Work Log:
- src/lib/anime-helpers.ts: qualityRank, providerLabel (Arabic labels), isIframeEmbeddable.
- GET /api/stats — anime/episodes/sources counts + top 12 providers.
- GET /api/anime — paginated list, search (LIKE), sort (popular|episodes|title|shuffle).
  Shuffle uses deterministic FNV-1a seeded hash so pagination is stable.
- GET /api/anime/[slug] — detail + episodes ordered by episodeSort asc.
- GET /api/episode/[id] — episode + sources (sorted best-quality-first) + prev/next siblings.
- Verified all 4 routes via curl: correct payloads and counts.

Stage Summary:
- 4 API routes live and returning 200 with correct data.

---
Task ID: 4
Agent: main
Task: Theme + layout + styling (dark, RTL Arabic, Cairo font, rose accent).

Work Log:
- src/components/providers.tsx — ThemeProvider (defaultTheme=dark, enableSystem=false) + QueryClientProvider.
- src/app/layout.tsx — lang="ar" dir="rtl", data-scroll-behavior="smooth", Cairo font (arabic+latin subsets),
  Arabic metadata (title/description/keywords/OG).
- src/app/globals.css — anime dark palette (rose/crimson accent, NO indigo/blue), body radial-gradient glow,
  custom thin scrollbar utilities, .bg-grad-primary, .ring-grad, .text-balance.

Stage Summary:
- Dark RTL Arabic shell with Cairo font and rose accent, sticky-header + sticky-footer layout.

---
Task ID: 5 & 6
Agent: main
Task: Build the single-page app (view switching via searchParams) + all UI components.

Work Log:
- src/lib/anime-types.ts — TS interfaces for all API responses + SORT_LABELS (Arabic).
- src/components/anime/poster-image.tsx — poster with graceful fallback (gradient + initial).
- src/components/anime/anime-card.tsx — poster card, episode badge, play-on-hover.
- src/components/anime/episode-card.tsx — episode row with thumbnail + active state.
- src/components/anime/hero.tsx — framer-motion carousel (8 featured, auto-rotate, dots, prev/next).
- src/components/anime/pagination.tsx — windowed pagination with Arabic-Indic numerals.
- src/components/anime/skeletons.tsx — hero/grid/episode/player skeletons.
- src/components/anime/home-view.tsx — hero + sort tabs + responsive grid + pagination; hides hero while searching.
- src/components/anime/anime-detail-view.tsx — banner (blurred backdrop) + episode grid (scrollable, max-h).
- src/components/anime/video-player.tsx — iframe embed with loading spinner + open-in-new-tab fallback.
- src/components/anime/source-selector.tsx — groups sources by quality (FHD/HD/SD badges, rose/emerald/muted).
- src/components/anime/watch-view.tsx — player + source selector + prev/next + scrollable episode sidebar.
- src/components/anime/site-header.tsx — sticky, debounced live search (450ms→URL), "اكتشاف" shuffle link.
  Uses React setState-during-render pattern to sync input with URL (lint-clean, no effect).
- src/components/anime/site-footer.tsx — stats pills (anime/episodes/sources) + disclaimer.
- src/components/anime/anime-app.tsx — reads useSearchParams, switches home/anime/watch, scroll-to-top.
- src/app/page.tsx — Suspense-wrapped AnimeApp.

Stage Summary:
- Complete single-page app with home / anime-detail / watch views, all driven by /?... searchParams.
- All interactions verified via agent-browser.

---
Task ID: 7
Agent: main
Task: Lint + dev log + agent-browser end-to-end verification.

Work Log:
- Fixed React-19 lint errors (react-hooks/set-state-in-effect):
  * theme-toggle: CSS-based icon toggle (both Sun+Moon rendered, .dark:block / dark:hidden) — hydration-safe + lint-clean.
  * watch-view: derive effectiveSource with useMemo instead of syncing via effect.
  * hero: render-time clamp (safeIdx) instead of clamp effect.
  * site-header: React setState-during-render pattern to sync input from URL.
- Fixed hydration mismatch in ThemeToggle (was rendering different icon server vs client).
- Added data-scroll-behavior="smooth" to <html> to silence Next.js warning.
- Removed unused eslint-disable directives (4 warnings).
- Final `bun run lint` = clean (0 errors, 0 warnings).
- dev.log: all routes return 200, no runtime errors.
- agent-browser verification (fresh session, 0 console errors):
  * Home: hero carousel (8 featured) + sort tabs + grid (24 cards) + pagination (92 pages).
    Stats: "٢٬١٨٦ أنمي · صفحة ١ من ٩٢".
  * Anime detail: /?anime=one-piece → banner + "الحلقات (٣٦٠)" + episode list.
  * Watch: /?watch=one-piece-episode-1 → iframe player (FHD mega) + source selector
    (3 FHD links) + prev(disabled)/next + episode sidebar. Switched source to Uqload → iframe updated.
  * Search: typed "naruto" → /?q=naruto → "نتائج البحث عن: «naruto»" + ٥ results.
  * Theme toggle: dark→light→dark, html className flips correctly.
  * Footer: sticky flex (wrapper "flex min-h-screen flex-col", gap=0 between main & footer,
    natural push on overflow), shows "٢٬١٨٦ أنمي · ٢٥٬٨٦٦ حلقة · ١٤٩٬٢١٦ رابط مشاهدة".

Stage Summary:
- Site is fully interactive and browser-verified. Lint clean, 0 runtime/hydration errors.

---
Task ID: 8
Agent: main
Task: Extend Prisma schema with AniList/MAL metadata columns + write enrichment script.

Work Log:
- Added ~35 enrichment columns to Anime: anilistId, malId, coverImage, coverColor,
  bannerImage (WIDE), trailerYoutubeId, titleRomaji/English/Japanese, animeType,
  animeSource, malEpisodes, animeStatus, airing, airedString/Year, season, duration,
  score (0-100), popularity, favorites, synopsis, studios, genres, tags, nextEpisode,
  metaFetchedAt, metaStatus. Indexes on score, airedYear, popularity.
- Tried Jikan (api.jikan.moe) first — sandbox network BLOCKS it (connection hangs).
- Pivoted to AniList GraphQL (graphql.anilist.co — reachable, no key).
- First attempt used aliased `Media(search:...)` queries — FAILED: AniList returns
  HTTP 404 with ALL aliases null when ANY single search has no match (nullifies the
  whole batch). So "One Piece" came back null when "Meitantei Conan" in same batch
  didn't match.
- FIX: switched to `Page(page:1, perPage:1) { media(search:...) }` — a no-match
  returns media:[] (HTTP 200) instead of null, so each alias is independent.
- Also added retry/backoff for 429/5xx, JSON-body parsing regardless of HTTP status
  (AniList's "Not Found" comes as 404 WITH a data body of nulls).
- Batched 10 aliased Page queries per request (complexity-safe).

Stage Summary:
- scripts/enrich-anilist.ts: batched AniList GraphQL enrichment (10/batch, 1.1s delay).

---
Task ID: 9
Agent: main
Task: Run full enrichment for all 2,186 anime.

Work Log:
- Ran enrichment (popular-first). First foreground attempt hit AniList rate-limit
  (429) after ~1,000 anime — bumped BASE_DELAY_MS 600→1100ms (~55 req/min, under 90).
- Reset 40 transient "error" rows and re-ran the remainder.
- FINAL: ok=1,780 · not_found=406 · pending=0. Match rate ~81%.
- The 406 not_found are obscure romanized titles (movies/specials with non-standard
  transliterations) that AniList search can't match — they gracefully show no meta.
- Verified top anime: One Piece (score 87, banner, Toei, #e49335 color, genres),
  Meitantei Conan→"Detective Conan" (82, TMS), Bleach (79, trailer), Boruto (trailer),
  Dragon Ball Z (81). Pokemon 2019 not_found (title mismatch).

Stage Summary:
- 1,780 anime enriched with full AniList/MAL metadata (synopsis, score, banner,
  cover, trailer, genres, studios, year, status, duration, tags, MAL/AniList links).

---
Task ID: 10
Agent: main
Task: Update APIs to return enrichment fields + add "rating" sort.

Work Log:
- /api/anime (list): selects score, animeType, airedYear, coverImage, coverColor,
  bannerImage, trailerYoutubeId, titleEnglish, popularity, genres (for cards + hero).
- /api/anime/[slug]: selects ALL meta fields (full detail).
- Added sort=rating (score desc, popularity desc) — SQLite sorts NULLs last in DESC.
- SortKey type + SORT_LABELS + home-view tabs + anime-app VALID_SORTS updated.

Stage Summary:
- List + detail APIs now return rich metadata; 5 sort options incl. rating.

---
Task ID: 11 & 12 & 13
Agent: main
Task: Redesign cards + cinematic hero + full detail info panel (PROFESSIONAL, not MAL-clone).

Work Log:
- src/lib/anime-format.ts: formatScore (/10), scoreTier (emerald/amber/rose),
  typeLabel, statusLabel, seasonLabel, splitList, pickPoster (AniList cover || source).
- AnimeCard: high-res cover (AniList) with score badge (★ 8.7, color-tiered),
  type+year chip, hover play button tinted with coverColor, accent edge on hover,
  English title preferred + romaji subtitle.
- trailer-dialog.tsx: YouTube trailer modal (autoplay-muted) — "شاهد الإعلان" button.
- Hero (cinematic): WIDE bannerImage backdrop (cover fallback) with motion crossfade,
  gradient overlays + coverColor glow; poster card; مميّز badge + type/year chips;
  big title (English preferred) + romaji subtitle; score block (★ 8.7 /10) + episode
  count; genre chips; "شاهد الآن" + "شاهد الإعلان" (trailer) + "التفاصيل" CTAs;
  prev/next + dot navigation; 7s auto-rotate.
- AnimeDetailView: blurred-banner hero with poster, score block (★ + popularity +
  favorites), genres, trailer button, "watch first episode" CTA. Two-column body:
  INFO panel (type, source, episodes [MAL count compare], duration, status, aired,
  season+year, studio, popularity) + MAL/AniList link buttons; SYNOPSIS (cleaned
  multiline) + TAGS chips. Empty-state when no meta. Scrollable episode grid below.
- HomeView sorts: popular / episodes / rating / title / shuffle.
- NOTE on design intent (per user): uses AniList/MAL DATA but the UI is a custom
  professional streaming-site aesthetic (cinematic hero, poster-forward cards,
  gradient backdrops) — NOT a MyAnimeList layout clone.

Stage Summary:
- All three views rebuilt with rich metadata + cinematic visuals.

---
Task ID: 14
Agent: main
Task: Lint + agent-browser verification.

Work Log:
- bun run lint: CLEAN (0 errors, 0 warnings).
- Dev server restart got the new Prisma client (regenerated via db:generate +
  .next cache clear + restart) — list API now returns score/type/year/cover/banner.
- agent-browser (fresh session, 0 console errors):
  * Home: cinematic hero "أنميات مميزة" with ONE PIECE (banner backdrop, score 87,
    English title), auto-rotating dots for Conan/Bleach. Grid of 24 cards with
    ENGLISH titles (ONE PIECE, Detective Conan, Boruto, Bleach, InuYasha,
    Naruto: Shippuden, Hunter x Hunter (2011), Fairy Tail, ...) — all with score
    badges + type/year chips.
  * Detail /?anime=one-piece: eval confirmed ALL content present — synopsis text
    ("Gold Roger", "Luffy"), studio "Toei", type "TV", year "1999", genres
    (Action/Adventure), "القصة" + "معلومات" headings, MAL + AniList link buttons,
    duration (دقيقة). 0 errors.
- NOTE: dev server is reaped by the bash tool between commands; started it as the
  final bash action so it stays alive for the user's Preview Panel.

Stage Summary:
- Site verified end-to-end: rich MAL data, professional cinematic UI, 0 errors.

---
Task ID: 15
Agent: main
Task: Build a sync tool that scans ww3.okanime.xyz and adds NEW anime/episodes to the DB.

Work Log:
- Inspected site structure: sitemap.xml → sitemapindex with sitemap-anime-{1,2,3}.xml +
  sitemap-episodes-{1..6}.xml. Each urlset entry = /anime/{slug} or /episode/{slug} + lastmod.
- Inspected an episode page HTML: watch sources are <a> anchors with Alpine bindings:
    :class="activeUrl === '<embedURL>' ? 'active':''"  x-show="matchesQuality('FHD')"
    data-server="<provider>"  + data-umami-event-mal_id="<animeMalId>"
    data-umami-event-episode_number="<n>"
  Episode metadata from og:title / og:image / the /anime/{slug} link.
- Inspected an anime page: og:title ("انمي One Piece مترجم..."), og:image (poster),
  episode links href=".../episode/{slug}-episode-N" (counted → episodeCount).
- Built scripts/sync-okanime.ts:
  * Fetches sitemap index + sub-sitemaps (via curl through Bun.spawnSync — Bun fetch is
    WAF-blocked on some sites, curl is reliable).
  * Diffs anime/episode slugs vs DB ids → finds NEW ones.
  * For new episodes: fetches page, extracts (title, animeId, animeTitle, episodeNumber,
    posterUrl, malId, watchSources[]), ensures the anime row exists (fetch+insert if new),
    inserts the episode + its WatchSources, increments anime.episodeCount/sourceCount,
    and sets anime.malId as a side-enrichment.
  * For new anime (no new episodes): fetches page, extracts title/poster/episodeCount, inserts.
  * Idempotent + resumable: re-running skips anything already in the DB.
  * CLI: --dry-run, --episodes-only, --anime-only, --limit N, --since YYYY-MM-DD.
- Tested --dry-run --episodes-only: parsed 25,868 episode sitemap entries, found 2 NEW
  (keroro-gunsou-episode-2 with 12 sources; shiotaiou-...-episode-2 with 8 sources).
- Ran the REAL sync: inserted both episodes + 20 watch sources; verified in DB
  (keroro-gunsou-episode-2 → 12 sources: FHD/mp4upload, FHD/mega, HD/mp4upload, ...).

Stage Summary:
- scripts/sync-okanime.ts: a working incremental sync tool. Run `bun run scripts/sync-okanime.ts`
  to pull new anime+episodes+watch-links from okanime.xyz into the DB. Verified end-to-end.

---
Task ID: 16
Agent: main
Task: Expose the sync tool inside the website (button + API) so the user can run it.

Work Log:
- Refactored sync logic into src/lib/sync.ts (exported runSync(opts) → SyncResult),
  usable from BOTH the CLI and the Next.js API route. Uses the shared @/lib/db.
- scripts/sync-okanime.ts is now a thin CLI wrapper that calls runSync (still works
  under `bun run scripts/sync-okanime.ts`).
- FIX: runSync initially used Bun.spawnSync(curl) — but Next.js dev server runs under
  Node (Bun global NOT available there) → "Bun is not defined" 500. Switched to
  node's child_process.spawnSync in src/lib/sync.ts (works in both Bun CLI + Next server).
- Added POST /api/sync route (src/app/api/sync/route.ts): runs runSync({limit}) and
  returns {ok, result}. Bounded by limit (default 30 new episodes) so the request
  finishes quickly; run again to pull more.
- Added a "تحديث" (Update) button to SiteHeader (RefreshCw icon, spins while loading)
  that POSTs to /api/sync and shows a sonner toast with the result
  ("+X أنمي، +Y حلقة، +Z رابط مشاهدة" or "المكتبة محدّثة — لا يوجد جديد").
- Switched the layout Toaster from the radix-based to the sonner-based one
  (src/components/ui/sonner) so `toast` from "sonner" works; configured
  position=bottom-center, richColors, dir=rtl.

Stage Summary:
- The sync tool is now USABLE FROM THE SITE: header → "تحديث" button → scans okanime
  sitemaps → adds new anime/episodes/watch-links → toast result. Verified in browser
  (toast "المكتبة محدّثة — لا يوجد جديد الآن" after the prior sync already pulled
  the new 1 anime + 1 episode + 8 sources). /api/sync returns {ok:true, result:{…}}.
  CLI wrapper still works too.
