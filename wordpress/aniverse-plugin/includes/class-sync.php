<?php
/**
 * Aniverse Sync — scans okanime.xyz sitemaps and adds NEW anime/episodes.
 * Ported from src/lib/sync.ts — uses wp_remote_get instead of curl.
 */
if (!defined('ABSPATH')) exit;

class Aniverse_Sync {

    const BASE = 'https://ww3.okanime.xyz';

    public static function run($dryRun = false, $limit = 30) {
        $t0 = microtime(true);
        $res = [
            'sitemapAnime' => 0, 'sitemapEpisodes' => 0,
            'newAnimeInSitemap' => 0, 'newEpisodesInSitemap' => 0,
            'insertedAnime' => 0, 'insertedEpisodes' => 0, 'insertedSources' => 0,
            'failed' => 0, 'previewAnime' => [], 'previewEpisodes' => [],
            'durationMs' => 0,
        ];

        // 1. Sitemap index
        $idx = self::fetch(self::BASE . '/sitemap.xml');
        if (!$idx) { $res['durationMs'] = (int)((microtime(true) - $t0) * 1000); return $res; }

        $animeSubs = []; $epSubs = [];
        foreach (self::parseSitemapIndex($idx) as $s) {
            if (strpos($s['loc'], 'sitemap-anime-') !== false) $animeSubs[] = $s;
            if (strpos($s['loc'], 'sitemap-episodes-') !== false) $epSubs[] = $s;
        }

        // 2a. Anime URLs
        $allAnimeSlugs = [];
        foreach ($animeSubs as $s) {
            $xml = self::fetch($s['loc']);
            if (!$xml) continue;
            foreach (self::parseUrlSet($xml) as $u) {
                $slug = self::slugFromUrl($u['loc'], '/anime/');
                if ($slug) $allAnimeSlugs[$slug] = true;
            }
        }
        $res['sitemapAnime'] = count($allAnimeSlugs);
        $existingAnime = self::getExistingIds('anime');
        $newAnimeSlugs = array_diff(array_keys($allAnimeSlugs), $existingAnime);
        $res['newAnimeInSitemap'] = count($newAnimeSlugs);

        if (!$dryRun) {
            foreach ($newAnimeSlugs as $slug) {
                $html = self::fetch(self::BASE . '/anime/' . $slug);
                if (!$html) { $res['failed']++; continue; }
                $data = self::extractAnime($html, $slug);
                if ($data) {
                    Aniverse_Database::upsert_anime($data);
                    $res['insertedAnime']++;
                }
            }
        } else {
            $res['insertedAnime'] = count($newAnimeSlugs);
            $i = 0;
            foreach ($newAnimeSlugs as $slug) {
                if ($i++ >= 60) break;
                $html = self::fetch(self::BASE . '/anime/' . $slug);
                if (!$html) continue;
                $data = self::extractAnime($html, $slug);
                if ($data) $res['previewAnime'][] = $data;
            }
        }

        // 2b. Episode URLs
        $allEpSlugs = [];
        foreach ($epSubs as $s) {
            $xml = self::fetch($s['loc']);
            if (!$xml) continue;
            foreach (self::parseUrlSet($xml) as $u) {
                $slug = self::slugFromUrl($u['loc'], '/episode/');
                if ($slug) $allEpSlugs[$slug] = true;
            }
        }
        $res['sitemapEpisodes'] = count($allEpSlugs);
        $existingEps = self::getExistingIds('episode');
        $newEpSlugs = array_diff(array_keys($allEpSlugs), $existingEps);
        $res['newEpisodesInSitemap'] = count($newEpSlugs);

        $toProcess = $dryRun ? array_slice($newEpSlugs, 0, 60) : array_slice($newEpSlugs, 0, $limit);
        foreach ($toProcess as $slug) {
            $html = self::fetch(self::BASE . '/episode/' . $slug);
            if (!$html) { $res['failed']++; continue; }
            $ep = self::extractEpisode($html, $slug);
            if (!$ep) { $res['failed']++; continue; }
            if (!$dryRun) {
                Aniverse_Database::upsert_episode($ep['data']);
                $res['insertedEpisodes']++;
                $res['insertedSources'] += count($ep['data']['watchSources'] ?? []);
            } else {
                $res['insertedEpisodes']++;
                $res['insertedSources'] += count($ep['data']['watchSources'] ?? []);
                if (count($res['previewEpisodes']) < 60) {
                    $res['previewEpisodes'][] = [
                        'slug' => $slug, 'animeTitle' => $ep['data']['animeTitle'] ?? '',
                        'episodeNumber' => $ep['data']['episodeNumber'] ?? '',
                        'sourcesCount' => count($ep['data']['watchSources'] ?? []),
                    ];
                }
            }
        }

        $res['durationMs'] = (int)((microtime(true) - $t0) * 1000);
        return $res;
    }

    // ── Helpers ───────────────────────────────────────

    private static function fetch($url) {
        $resp = wp_remote_get($url, ['timeout' => 20, 'headers' => ['User-Agent' => 'Mozilla/5.0 (Aniverse-Sync)']]);
        if (is_wp_error($resp) || wp_remote_retrieve_response_code($resp) !== 200) return null;
        return wp_remote_retrieve_body($resp);
    }

    private static function parseSitemapIndex($xml) {
        $out = [];
        if (preg_match_all('/<sitemap>[\s\S]*?<loc>([^<]+)<\/loc>(?:[\s\S]*?<lastmod>([^<]+)<\/lastmod>)?[\s\S]*?<\/sitemap>/', $xml, $m, PREG_SET_ORDER)) {
            foreach ($m as $match) $out[] = ['loc' => trim($match[1]), 'lastmod' => $match[2] ?? null];
        }
        return $out;
    }

    private static function parseUrlSet($xml) {
        $out = [];
        if (preg_match_all('/<url>[\s\S]*?<loc>([^<]+)<\/loc>(?:[\s\S]*?<lastmod>([^<]+)<\/lastmod>)?[\s\S]*?<\/url>/', $xml, $m, PREG_SET_ORDER)) {
            foreach ($m as $match) $out[] = ['loc' => trim($match[1]), 'lastmod' => $match[2] ?? null];
        }
        return $out;
    }

    private static function slugFromUrl($url, $path) {
        if (preg_match('#' . preg_quote($path, '#') . '([^/?#]+)#', $url, $m)) return urldecode($m[1]);
        return null;
    }

    private static function getExistingIds($type) {
        global $wpdb;
        $table = $type === 'anime' ? Aniverse_Database::table_anime() : Aniverse_Database::table_episode();
        $rows = $wpdb->get_col("SELECT id FROM `{$table}`");
        return array_flip($rows ?: []);
    }

    private static function extractAnime($html, $slug) {
        $title = '';
        if (preg_match('/<meta property="og:title" content="([^"]+)"/', $html, $m)) {
            $title = preg_replace('/\s*\|\s*OkAnime\s*$/i', '', $m[1]);
            $title = preg_replace('/^انمي\s+/i', '', $title);
            $title = preg_replace('/\s*مترجم.*$/i', '', $title);
        }
        if (!$title) $title = $slug;
        $poster = '';
        if (preg_match('/<meta property="og:image" content="([^"]+)"/', $html, $m)) $poster = $m[1];
        $count = preg_match_all('/href="https:\/\/ww3\.okanime\.xyz\/episode\/' . preg_quote($slug, '/') . '-episode-/', $html);
        return [
            'id' => $slug, 'slug' => $slug, 'title' => $title,
            'pageUrl' => self::BASE . '/anime/' . $slug,
            'posterUrl' => $poster, 'episodeCount' => $count, 'sourceCount' => 0,
            'importedAt' => current_time('mysql'),
        ];
    }

    private static function extractEpisode($html, $slug) {
        $pick = function($re) use ($html) {
            if (preg_match($re, $html, $m)) return $m[1];
            return null;
        };
        $ogTitle = $pick('/<meta property="og:title" content="([^"]+)"/') ?: '';
        $title = preg_replace('/\s*\|\s*OkAnime\s*$/i', '', $ogTitle) ?: $slug;
        $poster = $pick('/<meta property="og:image" content="([^"]+)"/') ?: '';
        $malId = $pick('/data-umami-event-mal_id="([^"]+)"/');
        $epNum = $pick('/data-umami-event-episode_number="([^"]+)"/') ?: '0';
        $animeHref = $pick('/href="https:\/\/ww3\.okanime\.xyz\/anime\/([^"?#]+)/');
        $animeId = $animeHref ? urldecode($animeHref) : '';
        $animeTitle = preg_replace('/\s+الحلقة\s.*$/u', '', $ogTitle) ?: $animeId;

        // Watch sources
        preg_match_all("/activeUrl\s*===\s*'([^']+)'/", $html, $urlMatches);
        preg_match_all("/matchesQuality\('([^']+)'\)/", $html, $qMatches);
        preg_match_all('/data-server="([^"]+)"/', $html, $pMatches);
        $sources = [];
        $n = min(count($urlMatches[1]), count($qMatches[1]), count($pMatches[1]));
        for ($i = 0; $i < $n; $i++) {
            $wurl = $urlMatches[1][$i]; $qual = $qMatches[1][$i]; $prov = $pMatches[1][$i];
            $host = parse_url($wurl, PHP_URL_HOST) ?: '';
            $sources[] = [
                'provider' => $prov, 'quality' => $qual,
                'label' => $qual . ' ' . $prov,
                'watchUrl' => $wurl, 'providerHost' => $host,
            ];
        }

        if (!$animeId) return null;
        $sort = (int)filter_var($epNum, FILTER_SANITIZE_NUMBER_INT) ?: 0;
        return [
            'data' => [
                'id' => $slug, 'slug' => $slug, 'title' => $title,
                'animeId' => $animeId, 'animeTitle' => $animeTitle,
                'episodeNumber' => $epNum, 'episodeSort' => $sort,
                'episodePageUrl' => self::BASE . '/episode/' . $slug,
                'animePageUrl' => self::BASE . '/anime/' . $animeId,
                'posterUrl' => $poster, 'importedAt' => current_time('mysql'),
                'watchSources' => $sources,
            ],
        ];
    }
}
