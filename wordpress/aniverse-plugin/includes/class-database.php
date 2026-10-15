<?php
/**
 * Aniverse Database — 3 MySQL tables mirroring the Prisma schema.
 */
if (!defined('ABSPATH')) exit;

class Aniverse_Database {

    public static function table_anime()    { global $wpdb; return $wpdb->prefix . 'aniverse_anime'; }
    public static function table_episode()  { global $wpdb; return $wpdb->prefix . 'aniverse_episode'; }
    public static function table_source()   { global $wpdb; return $wpdb->prefix . 'aniverse_watch_source'; }

    public static function create_tables() {
        global $wpdb;
        $charset = $wpdb->get_charset_collate();
        $a = self::table_anime();
        $e = self::table_episode();
        $s = self::table_source();

        // Anime table
        $sql_a = "CREATE TABLE IF NOT EXISTS `{$a}` (
          `id` varchar(255) NOT NULL PRIMARY KEY,
          `slug` varchar(255) NOT NULL,
          `title` text NOT NULL,
          `pageUrl` text,
          `posterUrl` text,
          `episodeCount` int DEFAULT 0,
          `sourceCount` int DEFAULT 0,
          `importedAt` datetime DEFAULT CURRENT_TIMESTAMP,
          `anilistId` int,
          `malId` int,
          `anilistUrl` text,
          `malUrl` text,
          `coverImage` text,
          `coverColor` varchar(32),
          `bannerImage` text,
          `trailerYoutubeId` varchar(64),
          `titleRomaji` text,
          `titleEnglish` text,
          `titleJapanese` text,
          `animeType` varchar(32),
          `animeSource` varchar(64),
          `malEpisodes` int,
          `animeStatus` varchar(32),
          `airing` tinyint(1),
          `airedString` varchar(128),
          `airedYear` int,
          `season` varchar(16),
          `duration` int,
          `score` int,
          `popularity` int,
          `favorites` int,
          `synopsis` longtext,
          `synopsisAr` longtext,
          `studios` text,
          `genres` text,
          `genresAr` text,
          `tags` text,
          `tagsAr` text,
          `nextEpisode` int,
          `nextEpisodeAirAt` varchar(64),
          `metaFetchedAt` datetime,
          `metaStatus` varchar(16),
          UNIQUE KEY `slug` (`slug`),
          KEY `idx_title` (`title`(191)),
          KEY `idx_score` (`score`),
          KEY `idx_year` (`airedYear`),
          KEY `idx_pop` (`popularity`),
          KEY `idx_imported` (`importedAt`)
        ) ENGINE=InnoDB {$charset};";

        // Episode table
        $sql_e = "CREATE TABLE IF NOT EXISTS `{$e}` (
          `id` varchar(255) NOT NULL PRIMARY KEY,
          `slug` varchar(255) NOT NULL,
          `title` text,
          `animeId` varchar(255) NOT NULL,
          `animeTitle` text,
          `episodeNumber` varchar(32),
          `episodeSort` int DEFAULT 0,
          `episodePageUrl` text,
          `animePageUrl` text,
          `posterUrl` text,
          `lastModified` varchar(64),
          `importedAt` datetime DEFAULT CURRENT_TIMESTAMP,
          UNIQUE KEY `slug` (`slug`),
          KEY `idx_anime` (`animeId`),
          KEY `idx_sort` (`episodeSort`),
          KEY `idx_imported` (`importedAt`),
          KEY `idx_lastmod` (`lastModified`)
        ) ENGINE=InnoDB {$charset};";

        // WatchSource table
        $sql_s = "CREATE TABLE IF NOT EXISTS `{$s}` (
          `id` bigint NOT NULL AUTO_INCREMENT PRIMARY KEY,
          `episodeId` varchar(255) NOT NULL,
          `provider` varchar(64),
          `quality` varchar(16),
          `label` varchar(128),
          `watchUrl` text,
          `providerHost` varchar(128),
          KEY `idx_ep` (`episodeId`),
          KEY `idx_prov` (`provider`),
          KEY `idx_qual` (`quality`)
        ) ENGINE=InnoDB {$charset};";

        require_once ABSPATH . 'wp-admin/includes/upgrade.php';
        dbDelta($sql_a);
        dbDelta($sql_e);
        dbDelta($sql_s);
    }

    // ── Query helpers ─────────────────────────────────

    public static function get_anime_list($page, $pageSize, $sort, $q, $filters) {
        global $wpdb;
        $a = self::table_anime();
        $offset = ($page - 1) * $pageSize;

        $where = '1=1';
        $params = [];
        if ($q) { $where .= ' AND title LIKE %s'; $params[] = '%' . $wpdb->esc_like($q) . '%'; }
        if (!empty($filters['airing'])) { $where .= ' AND airing = 1'; }
        if (!empty($filters['type'])) { $where .= ' AND animeType = %s'; $params[] = $filters['type']; }
        if (!empty($filters['season'])) { $where .= ' AND season = %s'; $params[] = $filters['season']; }
        if (!empty($filters['year'])) { $where .= ' AND airedYear = %d'; $params[] = (int)$filters['year']; }
        if (!empty($filters['genre'])) { $where .= ' AND genres LIKE %s'; $params[] = '%' . $wpdb->esc_like($filters['genre']) . '%'; }

        $order = match($sort) {
            'popular' => 'sourceCount DESC, title ASC',
            'episodes' => 'episodeCount DESC, title ASC',
            'rating' => 'score DESC, popularity DESC',
            'title' => 'title ASC',
            'recent' => 'importedAt DESC, title ASC',
            default => 'importedAt DESC, title ASC',
        };

        $sql = "SELECT * FROM `{$a}` WHERE {$where} ORDER BY {$order} LIMIT %d OFFSET %d";
        $params[] = $pageSize;
        $params[] = $offset;
        $items = $wpdb->get_results($wpdb->prepare($sql, $params));

        $countSql = "SELECT COUNT(*) FROM `{$a}` WHERE {$where}";
        $countParams = array_slice($params, 0, count($params) - 2);
        $total = $wpdb->get_var($wpdb->prepare($countSql, $countParams));

        return ['items' => $items, 'total' => (int)$total, 'totalPages' => max(1, ceil($total / $pageSize))];
    }

    public static function get_anime_detail($slug) {
        global $wpdb;
        $a = self::table_anime();
        $e = self::table_episode();
        $anime = $wpdb->get_row($wpdb->prepare("SELECT * FROM `{$a}` WHERE slug = %s", $slug));
        if (!$anime) return null;
        $episodes = $wpdb->get_results($wpdb->prepare(
            "SELECT * FROM `{$e}` WHERE animeId = %s ORDER BY episodeSort DESC, episodeNumber DESC",
            $anime->id
        ));
        $anime->episodes = $episodes;
        return $anime;
    }

    public static function get_episode($id) {
        global $wpdb;
        $e = self::table_episode();
        $s = self::table_source();
        $a = self::table_anime();
        $ep = $wpdb->get_row($wpdb->prepare("SELECT * FROM `{$e}` WHERE id = %s", $id));
        if (!$ep) return null;
        $anime = $wpdb->get_row($wpdb->prepare("SELECT slug, title, posterUrl, coverImage FROM `{$a}` WHERE id = %s", $ep->animeId));
        $sources = $wpdb->get_results($wpdb->prepare("SELECT * FROM `{$s}` WHERE episodeId = %s", $ep->id));
        $prev = $wpdb->get_row($wpdb->prepare(
            "SELECT id, episodeNumber, title FROM `{$e}` WHERE animeId = %s AND episodeSort < %d ORDER BY episodeSort DESC LIMIT 1",
            $ep->animeId, $ep->episodeSort
        ));
        $next = $wpdb->get_row($wpdb->prepare(
            "SELECT id, episodeNumber, title FROM `{$e}` WHERE animeId = %s AND episodeSort > %d ORDER BY episodeSort ASC LIMIT 1",
            $ep->animeId, $ep->episodeSort
        ));
        return ['episode' => $ep, 'anime' => $anime, 'sources' => $sources, 'prev' => $prev, 'next' => $next];
    }

    public static function get_recent_episodes($limit = 16) {
        global $wpdb;
        $e = self::table_episode();
        $a = self::table_anime();
        return $wpdb->get_results($wpdb->prepare(
            "SELECT e.*, a.slug AS animeSlug, a.coverImage, a.posterUrl, a.coverColor
             FROM `{$e}` e LEFT JOIN `{$a}` a ON e.animeId = a.id
             ORDER BY e.importedAt DESC LIMIT %d", $limit
        ));
    }

    public static function get_recent_anime($limit = 12) {
        global $wpdb;
        $a = self::table_anime();
        return $wpdb->get_results($wpdb->prepare("SELECT * FROM `{$a}` ORDER BY importedAt DESC LIMIT %d", $limit));
    }

    public static function get_top_anime($limit = 8) {
        global $wpdb;
        $a = self::table_anime();
        return $wpdb->get_results($wpdb->prepare("SELECT * FROM `{$a}` WHERE metaStatus='ok' ORDER BY sourceCount DESC LIMIT %d", $limit));
    }

    public static function get_airing($limit = 12) {
        global $wpdb;
        $a = self::table_anime();
        return $wpdb->get_results($wpdb->prepare("SELECT * FROM `{$a}` WHERE airing = 1 ORDER BY sourceCount DESC LIMIT %d", $limit));
    }

    public static function get_schedule() {
        global $wpdb;
        $a = self::table_anime();
        return $wpdb->get_results("SELECT * FROM `{$a}` WHERE airing = 1 AND nextEpisodeAirAt IS NOT NULL ORDER BY nextEpisodeAirAt ASC LIMIT 200");
    }

    public static function get_genres() {
        global $wpdb;
        $a = self::table_anime();
        $rows = $wpdb->get_results("SELECT genres FROM `{$a}` WHERE genres IS NOT NULL");
        $counts = [];
        foreach ($rows as $r) {
            foreach (array_map('trim', explode(',', $r->genres)) as $g) {
                if ($g) $counts[$g] = ($counts[$g] ?? 0) + 1;
            }
        }
        arsort($counts);
        return $counts;
    }

    public static function get_stats() {
        global $wpdb;
        $a = self::table_anime(); $e = self::table_episode(); $s = self::table_source();
        return [
            'anime' => (int)$wpdb->get_var("SELECT COUNT(*) FROM `{$a}`"),
            'episodes' => (int)$wpdb->get_var("SELECT COUNT(*) FROM `{$e}`"),
            'sources' => (int)$wpdb->get_var("SELECT COUNT(*) FROM `{$s}`"),
        ];
    }

    public static function get_random_anime() {
        global $wpdb;
        $a = self::table_anime();
        return $wpdb->get_row("SELECT slug FROM `{$a}` WHERE metaStatus='ok' ORDER BY RAND() LIMIT 1");
    }

    public static function upsert_anime($data) {
        global $wpdb;
        $a = self::table_anime();
        $exists = $wpdb->get_var($wpdb->prepare("SELECT id FROM `{$a}` WHERE id = %s", $data['id']));
        if ($exists) return false;
        $wpdb->insert($a, $data);
        return true;
    }

    public static function upsert_episode($data) {
        global $wpdb;
        $e = self::table_episode();
        $s = self::table_source();
        $exists = $wpdb->get_var($wpdb->prepare("SELECT id FROM `{$e}` WHERE id = %s", $data['id']));
        if ($exists) return false;
        $sources = $data['watchSources'] ?? [];
        unset($data['watchSources']);
        $wpdb->insert($e, $data);
        foreach ($sources as $src) {
            $wpdb->insert($s, $src);
        }
        $wpdb->query($wpdb->prepare("UPDATE `{$a}` SET episodeCount = episodeCount + 1, sourceCount = sourceCount + %d WHERE id = %s", count($sources), $data['animeId']));
        return true;
    }
}
