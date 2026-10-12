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
