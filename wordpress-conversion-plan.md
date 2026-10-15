# Aniverse → WordPress Conversion Plan

Convert the Next.js + Prisma + SQLite project into a **WordPress plugin + theme** so the user can install it on any shared/free WordPress host (InfinityFree, Hostinger, cPanel hosts) by simply uploading two zip files and clicking "Activate".

**Goal: zero shell access, zero Node/Bun, zero Prisma, zero env vars. ~5 clicks end to end.**

---

## 1. Why this is the right move

The Next.js stack keeps tripping over: Vercel's ephemeral filesystem, Turso network setup, Fly volume mounting, Dockerfile perms. WordPress shared hosting sidesteps **all** of these: persistent MySQL, persistent filesystem, cPanel/Softaculous one-click WordPress install, and "Plugins → Add New → Upload" for distribution. The cost is a rewrite from React/Prisma to PHP/`$wpdb` — but the data layer is small (3 tables) and the front-end is straightforward.

The current Next.js app's view-routing (`?watch=`, `?anime=`, `?view=schedule`, `?sort=`, `?type=`, `?season=`, etc.) maps directly onto WordPress REST endpoints + a single front-page shortcode. No URL rewrite rules, no permalink fiddling — works on any host's default config.

---

## 2. Deliverables

| File | Size (est.) | Purpose |
|---|---|---|
| `aniverse.zip` (plugin) | ~30 MB | Tables, REST API, sync tool, admin pages, data seed, compiled CSS/JS |
| `aniverse-theme.zip` (theme) | ~1 MB | Polished RTL Arabic dark look out-of-the-box (plugin also works with any theme via shortcode) |

The 30 MB plugin zip is fine for WordPress's plugin uploader (the hard limit is the server's `upload_max_filesize`, usually 8–64 MB on shared hosts, 10 MB on InfinityFree free — borderline; see §10 mitigation).

---

## 3. Data Storage Strategy: **Custom MySQL tables** (not Custom Post Types)

**Decision:** 3 custom tables, 1:1 mirror of the Prisma schema. Prefix `wp_aniverse_`.

| Table | Rows | Why a custom table (not CPT) |
|---|---|---|
| `wp_aniverse_anime` | 2,187 | Could fit CPT, but joining to episodes for detail view is cleaner with FK |
| `wp_aniverse_episode` | 25,869 | CPT would create 25K posts + 25K×N postmeta rows → bloats `wp_postmeta`, slow JOINs |
| `wp_aniverse_watch_source` | 149,244 | Absolutely must be a child table — postmeta for 149K×5 fields = ~750K rows of EAV, fatal on shared hosts |

Custom tables give: normalized schema, simple SQL JOINs, trivial 1:1 port of the Prisma queries, easy migration from SQLite (we literally `SELECT *` and `INSERT`), and the WordPress REST controller just runs SQL.

Indexes mirror the Prisma `@@index` declarations: anime(title, episodeCount, sourceCount, score, airedYear, popularity); episode(animeId, animeId+episodeSort); watch_source(episodeId, provider, quality).

Schema (`InnoDB`, `utf8mb4_unicode_ci` for full Arabic support) lives in `data/schema.sql` and runs on plugin activation.

---

## 4. Plugin Architecture

```
aniverse/
├── aniverse.php                  # bootstrap + activation hook (creates tables) + deactivation
├── uninstall.php                 # drops tables + options (with confirmation prompt first)
├── readme.txt                    # WP-standard readme (Arabic + English)
├── includes/
│   ├── class-db.php              # $wpdb wrapper + schema + helpers (port of src/lib/db.ts + anime-helpers.ts)
│   ├── class-sync.php            # port of src/lib/sync.ts (sitemap parsing + episode page extraction via wp_remote_get)
│   ├── class-enrich-anilist.php  # port of scripts/enrich-anilist.ts (GraphQL via wp_remote_post)
│   ├── class-enrich-ar-wiki.php  # port of scripts/enrich-ar-wiki.ts
│   ├── class-importer.php        # Path B: JSON catalog importer (chunked via AJAX + WP-Cron)
│   ├── class-rest-api.php        # /wp-json/aniverse/v1/* (mirrors all /api/* routes)
│   ├── class-router.php          # front-end controller (reads ?view= / ?anime= / ?watch= etc.)
│   ├── class-admin.php           # WP admin pages (Setup, Sync, Enrich, Import, Settings, Stats)
│   ├── class-shortcodes.php      # [aniverse_app], [aniverse_home], [aniverse_schedule], [aniverse_stats]
│   └── views/                    # PHP-rendered partials (port of src/components/anime/*.tsx)
│       ├── home.php              # ← HomeView.tsx
│       ├── anime-detail.php      # ← AnimeDetailView.tsx
│       ├── watch.php             # ← WatchView.tsx
│       ├── schedule.php          # ← ScheduleView.tsx
│       └── partials/             # hero.php, anime-card.php, episode-card.php, source-selector.php, video-player.php, pagination.php, top-nav.php, site-header.php, site-footer.php
├── admin/                        # admin UI assets
│   ├── css/admin.css
│   ├── js/admin-sync.js          # two-step sync dialog (port of AdminTool.tsx flow)
│   └── js/admin-importer.js      # progress-bar JSON importer
├── public/                       # front-end assets (compiled, no build step required on host)
│   ├── css/aniverse.css          # Tailwind compiled → ~50 KB minified
│   ├── js/aniverse.js            # vanilla JS SPA controller (~80 KB) — no React, no shadcn
│   └── fonts/Cairo-*.woff2       # self-hosted (avoid Google Fonts CDN on slow hosts)
├── data/
│   ├── aniverse-seed.sql.gz      # ~30 MB prebuilt MySQL dump (Path A — primary)
│   ├── schema.sql                # bare CREATE TABLE statements
│   └── catalog-stripped.json.gz  # ~25 MB fallback (Path B — used if SQL import fails)
└── languages/
    └── aniverse-ar.mo/.po        # Arabic translations
```

---

## 5. REST API (port of `/api/*` → `/wp-json/aniverse/v1/*`)

| Next.js route | WP REST route | Notes |
|---|---|---|
| `GET /api/stats` | `GET /aniverse/v1/stats` | counts + top providers |
| `GET /api/anime` | `GET /aniverse/v1/anime` | paginated list, search, sort, filters (airing, type, season, year, genre) |
| `GET /api/anime/[slug]` | `GET /aniverse/v1/anime/{slug}` | detail + episodes |
| `GET /api/anime/random` | `GET /aniverse/v1/anime/random` | random slug |
| `GET /api/episode/[id]` | `GET /aniverse/v1/episode/{id}` | episode + sources + prev/next |
| `GET /api/recent/anime` | `GET /aniverse/v1/recent/anime` | |
| `GET /api/recent/episodes` | `GET /aniverse/v1/recent/episodes` | |
| `GET /api/genres` | `GET /aniverse/v1/genres` | distinct genres + Arabic labels |
| `GET /api/schedule` | `GET /aniverse/v1/schedule` | airing anime grouped by weekday |
| `POST /api/sync` | `POST /aniverse/v1/sync` | requires admin nonce + `manage_options` |
| `POST /api/admin/auth` | (use WP's native login) | WP already has session auth; we just gate on capability |
| `POST /api/admin/logout` | (use WP's native logout) | — |

The admin auth problem disappears: WordPress already authenticates admins. We just check `current_user_can('manage_options')` on the sync endpoint. No password env var, no cookie management.

---

## 6. Front-End Conversion (React → PHP + vanilla JS)

This is the largest piece of work. Strategy:

1. **All React components** in `src/components/anime/*.tsx` (~2,700 lines total) port to PHP partials in `includes/views/`. Server-rendered HTML for the initial paint.
2. **Tailwind 4 → plain CSS**: keep `tailwind.config.ts` + `globals.css`, compile once with `bun run build:wp:css` → `public/css/aniverse.css` (minified, ~50 KB). Ship the compiled output; no build step on the host.
3. **TanStack Query → native `fetch`**: a small `aniverse.js` controller (~80 KB) handles:
   - URL `searchParams` parsing (port of `anime-app.tsx` view-switch logic)
   - `fetch` calls to `/wp-json/aniverse/v1/*` with `?_=<timestamp>` cache-bust
   - Simple state store (Map of query key → promise, plus a tiny pub-sub)
   - Swap source on watch page (re-renders the iframe)
   - Live search debounced 450 ms (port of `site-header.tsx`)
   - Two-step sync dialog in admin (port of `AdminTool.tsx`)
   - Theme toggle (CSS-only, port of current implementation)
4. **framer-motion → CSS animations/transitions**: hero crossfade, card hover. CSS keyframes + `transition: all 0.4s ease`.
5. **shadcn/ui dialog/dropdown → native `<dialog>` + CSS overlays**: keep dependencies zero.
6. **YouTube trailer modal**: native `<dialog>` + iframe.
7. **Arabic numerals**: already Latin in the Next.js app (Task 19), keep as-is.

The look stays pixel-identical — we're porting the JSX/TSX to PHP echo statements and the Tailwind classes carry over unchanged.

---

## 7. Theme: `aniverse-theme`

Lightweight theme whose only job is "make it look right out of the box":

```
aniverse-theme/
├── style.css              # WP theme header + 30 lines of resets
├── functions.php          # enqueue aniverse.css + aniverse.js + Cairo font
├── header.php             # <html lang="ar" dir="rtl"> + dark palette body
├── footer.php             # stats pills + disclaimer
├── front-page.php         # [aniverse_app] shortcode
├── index.php              # fallback: also [aniverse_app]
└── screenshot.png         # for the Themes admin card
```

The plugin works with **any** theme via `[aniverse_app]` shortcode (so users who already have a theme can install the plugin alone). The bundled theme is for users who want the polished default.

---

## 8. Sync Tool as WP Admin Page (port of `/admin`)

Admin page: **WP Admin → Aniverse → Sync** (`admin.php?page=aniverse-sync`).

Ported two-step flow (mirrors `AdminTool.tsx` + `sync-button.tsx`):

1. **Stats header**: anime/episodes/sources counts (port of `/api/stats`).
2. **"فحص الجديد" (Scan) button** → AJAX `POST /wp-json/aniverse/v1/sync` with `mode=scan`, `limit=60` → runs `class-sync.php::runSync(['dry_run' => true, 'limit' => 60])` → returns preview list (new anime with poster + new episodes with source counts).
3. **Review UI**: badges ("+X anime, +Y episodes") + poster grid + episode list (port of the existing JSX layout).
4. **"تحديث قاعدة البيانات" (Update) button** → AJAX `POST /wp-json/aniverse/v1/sync` with `mode=update`, `limit=15` → runs sync for ~15 new episodes (bounded to respect `max_execution_time` on shared hosts), returns progress; UI auto-repeats until no new remain. Progress bar shows `inserting 12/15…`.
5. **Done** → toast + refresh stats.

`class-sync.php` is a faithful port of `src/lib/sync.ts`:
- Sitemap index fetch via `wp_remote_get()` (uses cURL or streams; works on every WP host)
- Regex-based sitemap parsing (PHP `preg_match_all`)
- `wp_remote_get()` per new episode page → extract watch sources via the same regexes (Alpine `activeUrl`, `matchesQuality`, `data-server`)
- Idempotent: skip already-existing slugs
- Same provider/label mapping as `providerDisplay()`

To respect shared-host time limits: chunked AJAX calls (15 new episodes per request) + `set_time_limit(0)` when allowed (won't work on free InfinityFree — there it falls back to 1–3 per call).

---

## 9. Data Migration: SQLite → MySQL

Two paths, ship both, prefer Path A:

### Path A — Prebuilt SQL dump (primary)
Run `scripts/build-wp-seed.ts` once (by us, before shipping):
1. Open the SQLite DB via Prisma
2. Emit `data/aniverse-seed.sql`:
   - `CREATE TABLE wp_aniverse_anime (...)` (InnoDB, utf8mb4_unicode_ci)
   - `CREATE TABLE wp_aniverse_episode (...)`
   - `CREATE TABLE wp_aniverse_watch_source (...)`
   - `INSERT INTO wp_aniverse_anime VALUES ...` batched 250 rows/statement
   - Same for episodes (100/statement) and watch_sources (200/statement)
   - Each statement well under typical 1 MB `max_allowed_packet`
3. `gzip` → `data/aniverse-seed.sql.gz` (~30 MB compressed — the enrichment data compresses well)
4. The SQL includes **all enrichment data already**: AniList score/banner/genres + Arabic Wikipedia synopses + genresAr. User gets full enrichment for free on install.

On plugin activation:
- Tables created via `dbDelta()` (WordPress's safe schema creator)
- A new admin page "Aniverse → Setup" appears with one button: **"Import Catalog"**
- Click → importer decompresses the .sql.gz in 50 KB chunks and executes via `$wpdb->query()` in batches, with `set_time_limit(0)` when allowed
- If execution time runs out, the importer stores an offset and uses **WP-Cron** to continue in 30-second background batches until done
- Progress bar: "Importing watch sources: 89,000 / 149,244"

### Path B — JSON importer (fallback if SQL import blocked)
- Ship `data/catalog-stripped.json.gz` (~25 MB) — the original catalog + enrichment fields merged in
- Admin importer page uploads/reads the JSON via `stream_get_line()` (chunked, never loads full 65 MB into memory)
- Inserts in 1,000-row batches via AJAX
- Slower (~5–10 min on shared hosting) but works around SQL upload size limits

**Recommended default: Path A.** ~30 MB gzip fits within typical 50 MB `upload_max_filesize`. Path B is a safety net.

---

## 10. Install Procedure (the user's dream — 5 clicks)

**On a shared host with cPanel (InfinityFree free, Hostinger $2/mo, etc.):**

1. **Install WordPress** via cPanel → Softaculous → WordPress → Install (one click).
2. **Log in** to `wp-admin` (Softaculous gives you the admin URL + password).
3. **Plugins → Add New → Upload Plugin** → choose `aniverse.zip` → Install Now → **Activate Plugin**.
   - On activation: 3 MySQL tables created; admin menu "Aniverse" appears in the sidebar.
4. **Aniverse → Setup** → click **"Import Catalog"** button once → progress bar runs (background WP-Cron batches if needed, ~1–3 min on paid host, ~10 min on free) → done. The seed SQL carries all enrichment data (AniList + Arabic Wikipedia), so the user gets the full experience.
5. **Appearance → Themes → Add New → Upload Theme** → choose `aniverse-theme.zip` → Install → **Activate**.
6. Visit the site → fully functional Aniverse, identical to the current Next.js version.

**No terminal. No `bun install`. No Prisma push. No Turso account. No env vars. No Dockerfile.**

Optional follow-up: **Aniverse → Sync** page → click "Scan" → click "Update" to pull new episodes from okanime.xyz whenever desired. New anime that come in via sync will need enrichment — the **Aniverse → Enrich** page lets the admin re-run AniList + Arabic Wikipedia enrichment on the new arrivals (ported `class-enrich-anilist.php` + `class-enrich-ar-wiki.php`).

---

## 11. Hosting Tier Recommendations

| Host | Sync batch size | Catalog import | Verdict |
|---|---|---|---|
| InfinityFree (free) | 1–3 episodes/AJAX (30 s limit) | 10 min via WP-Cron | Works, slow sync. Fine for starter. |
| Hostinger ($2–3/mo) | 15–30/AJAX (60–300 s) | 1 min via direct SQL | Recommended sweet spot. |
| Bluehost/SiteGround ($3–5/mo) | 30/AJAX | <1 min | Smooth. |
| WordPress.com (free) | — | — | **Not supported** — no plugin uploads on free plan. |

The plugin auto-detects `max_execution_time` and adjusts batch size accordingly.

---

## 12. Build Steps (one-time, by us, before shipping)

These run on our dev machine; the outputs ship inside the plugin zip:

1. **Export SQLite → MySQL SQL** — `scripts/build-wp-seed.ts`:
   ```bash
   bun run scripts/build-wp-seed.ts    # produces data/aniverse-seed.sql
   gzip data/aniverse-seed.sql         # → data/aniverse-seed.sql.gz (~30 MB)
   ```
2. **Strip + compress catalog** (for Path B fallback):
   ```bash
   bun run scripts/build-wp-catalog.ts  # merges enrichment → data/catalog-stripped.json.gz
   ```
3. **Compile Tailwind → plain CSS**:
   ```bash
   bun run build:wp:css   # → public/css/aniverse.css (minified, ~50 KB)
   ```
4. **Port React → PHP + vanilla JS**:
   - Manually translate each `*.tsx` to `*.php` partial (Tailwind classes carry over verbatim)
   - Write `public/js/aniverse.js` — a small controller (~80 KB, no React dependency)
5. **Port sync + enrichers** to PHP `class-sync.php` / `class-enrich-anilist.php` / `class-enrich-ar-wiki.php`.
6. **Bundle zips**:
   ```bash
   bun run bundle:wp   # → dist/aniverse.zip + dist/aniverse-theme.zip
   ```

Total port effort estimate: ~3–5 focused days for an experienced PHP + React dev. The hard parts (data model, sync logic, enrichment logic) are already worked out in the TS codebase — it's a 1:1 translation.

---

## 13. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Free host 30 s `max_execution_time` breaks sync | Chunked AJAX (1–3 new episodes per call on free, 15–30 on paid) + UI progress bar |
| `max_allowed_packet` 1 MB default on some hosts | Batched INSERTs (≤200 rows/statement, well under 1 MB) |
| phpMyAdmin SQL import limit on free hosts (50 MB) | Path A gzip is ~30 MB (fits). Path B JSON importer as fallback. |
| No outbound HTTPS on shared host | `wp_remote_get()` works on >99% of hosts (uses cURL or PHP streams). Documented requirement. |
| WordPress permalink structure variations | Use searchParams only (no rewrite rules) — works regardless of permalink setting |
| Plugin update overwrites user's synced data | Sync writes to plugin tables, not plugin files. Plugin update preserves data. |
| Theme conflict if user already has a theme | Plugin works with any theme via `[aniverse_app]` shortcode. Bundled theme is optional. |
| Arabic translations not loading | `load_plugin_textdomain()` in `init` hook. Site Language set to العربية in Settings. |
| Security on sync endpoint | WP nonce + `current_user_can('manage_options')` check on every REST request |
| Security on importer endpoint | Same nonce + capability check; only callable from admin page |
| REST endpoint caching on some hosts | AJAX calls include `?_=timestamp` cache-bust |

---

## 14. Open Questions for the User

1. **Seed SQL inside plugin zip (30 MB, simplest install) vs. CDN download on first run (smaller zip ~5 MB but needs outbound HTTPS during install)?** Recommend: ship inside zip.
2. **Bundle both enrichers in the plugin?** Yes — newly-synced anime need enrichment, and the user shouldn't have to re-run scripts locally. Both `class-enrich-anilist.php` + `class-enrich-ar-wiki.php` ship in the plugin, callable from admin.
3. **Ship the theme?** Yes — bundled theme gives the polished look with zero configuration. Plugin alone also works via shortcode.
4. **Two zips or one mega-zip?** Two — WordPress's plugin uploader and theme uploader are separate flows. One mega-zip would require an installer script (more complexity, more failure modes). Two-step upload is ~5 seconds of extra user effort and matches WordPress conventions.

---

## 15. Summary

- **Architecture:** 1 plugin (3 custom MySQL tables + REST API + admin pages + compiled CSS/JS + ~30 MB prebuilt seed SQL) + 1 lightweight theme.
- **Data:** 1:1 mirror of the Prisma schema, including all AniList + Arabic Wikipedia enrichment baked into the seed SQL.
- **Sync tool:** WP admin page, two-step scan→review→update flow, chunked AJAX to respect shared-host time limits.
- **Front-end:** PHP-rendered partials + 80 KB vanilla JS controller; pixel-identical look to current Next.js site.
- **Install:** WordPress → upload `aniverse.zip` → activate → click "Import Catalog" once → upload `aniverse-theme.zip` → activate → done.
- **Hosting:** Anything from InfinityFree free tier to $5/mo shared hosts. No Vercel/Turso/Fly/Docker/VPS required.

The user gets exactly what they asked for: the simplest possible deployment, on the simplest possible hosting, with all 2,187 anime / 25,869 episodes / 149,244 watch links + Arabic synopses + AniList metadata intact, and a one-click sync tool for adding new episodes as okanime.xyz publishes them.
