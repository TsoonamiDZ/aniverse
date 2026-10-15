<?php
/**
 * Aniverse REST API — mirrors the Next.js API routes.
 */
if (!defined('ABSPATH')) exit;

class Aniverse_REST_API {

    public static function register_routes() {
        $ns = 'aniverse/v1';

        register_rest_route($ns, '/anime', [
            'methods' => 'GET',
            'callback' => [self::class, 'anime_list'],
            'permission_callback' => '__return_true',
        ]);
        register_rest_route($ns, '/anime/(?P<slug>[a-zA-Z0-9\-]+)', [
            'methods' => 'GET',
            'callback' => [self::class, 'anime_detail'],
            'permission_callback' => '__return_true',
        ]);
        register_rest_route($ns, '/episode/(?P<id>[a-zA-Z0-9\-]+)', [
            'methods' => 'GET',
            'callback' => [self::class, 'episode_detail'],
            'permission_callback' => '__return_true',
        ]);
        register_rest_route($ns, '/recent/episodes', [
            'methods' => 'GET',
            'callback' => [self::class, 'recent_episodes'],
            'permission_callback' => '__return_true',
        ]);
        register_rest_route($ns, '/recent/anime', [
            'methods' => 'GET',
            'callback' => [self::class, 'recent_anime'],
            'permission_callback' => '__return_true',
        ]);
        register_rest_route($ns, '/stats', [
            'methods' => 'GET',
            'callback' => [self::class, 'stats'],
            'permission_callback' => '__return_true',
        ]);
        register_rest_route($ns, '/schedule', [
            'methods' => 'GET',
            'callback' => [self::class, 'schedule'],
            'permission_callback' => '__return_true',
        ]);
        register_rest_route($ns, '/genres', [
            'methods' => 'GET',
            'callback' => [self::class, 'genres'],
            'permission_callback' => '__return_true',
        ]);
        register_rest_route($ns, '/anime/random', [
            'methods' => 'GET',
            'callback' => [self::class, 'random_anime'],
            'permission_callback' => '__return_true',
        ]);
        register_rest_route($ns, '/ping', [
            'methods' => 'GET',
            'callback' => [self::class, 'ping'],
            'permission_callback' => '__return_true',
        ]);
        register_rest_route($ns, '/sync', [
            'methods' => 'POST',
            'callback' => [self::class, 'sync'],
            'permission_callback' => function () {
                return current_user_can('manage_options');
            },
        ]);
    }

    public static function anime_list($req) {
        $p = $req->get_params();
        $page = max(1, (int)($p['page'] ?? 1));
        $pageSize = min(60, max(1, (int)($p['pageSize'] ?? 24)));
        $sort = $p['sort'] ?? 'recent';
        $q = ($p['q'] ?? '');
        $filters = [
            'airing' => !empty($p['airing']),
            'type' => $p['type'] ?? null,
            'season' => $p['season'] ?? null,
            'year' => $p['year'] ?? null,
            'genre' => $p['genre'] ?? null,
        ];
        $result = Aniverse_Database::get_anime_list($page, $pageSize, $sort, $q, $filters);
        return rest_ensure_response([
            'items' => $result['items'],
            'page' => $page, 'pageSize' => $pageSize,
            'total' => $result['total'], 'totalPages' => $result['totalPages'],
            'sort' => $sort, 'q' => $q,
        ]);
    }

    public static function anime_detail($req) {
        $slug = $req['slug'];
        $anime = Aniverse_Database::get_anime_detail($slug);
        if (!$anime) return new WP_Error('not_found', 'Anime not found', ['status' => 404]);
        return rest_ensure_response($anime);
    }

    public static function episode_detail($req) {
        $id = $req['id'];
        $data = Aniverse_Database::get_episode($id);
        if (!$data) return new WP_Error('not_found', 'Episode not found', ['status' => 404]);
        return rest_ensure_response($data);
    }

    public static function recent_episodes($req) {
        $limit = min(40, max(1, (int)($req->get_param('limit') ?? 16)));
        return rest_ensure_response(Aniverse_Database::get_recent_episodes($limit));
    }

    public static function recent_anime($req) {
        $limit = min(40, max(1, (int)($req->get_param('limit') ?? 12)));
        return rest_ensure_response(['items' => Aniverse_Database::get_recent_anime($limit)]);
    }

    public static function stats() {
        return rest_ensure_response(Aniverse_Database::get_stats());
    }

    public static function schedule() {
        $rows = Aniverse_Database::get_schedule();
        $days = ['Sun' => [], 'Mon' => [], 'Tue' => [], 'Wed' => [], 'Thu' => [], 'Fri' => [], 'Sat' => []];
        $upcoming = [];
        $now = time();
        foreach ($rows as $r) {
            $ts = strtotime($r->nextEpisodeAirAt);
            if (!$ts) continue;
            $diff = ($ts - $now) / 3600;
            if ($diff < -7 * 24) continue;
            $day = date('D', $ts);
            $days[$day][] = $r;
            if ($diff > 0) $upcoming[] = $r;
        }
        $schedule = [];
        foreach (['Sun','Mon','Tue','Wed','Thu','Fri','Sat'] as $d) {
            $schedule[] = ['day' => $d, 'items' => $days[$d]];
        }
        return rest_ensure_response(['schedule' => $schedule, 'upcoming' => array_slice($upcoming, 0, 30)]);
    }

    public static function genres() {
        $counts = Aniverse_Database::get_genres();
        $ar = ['Action'=>'أكشن','Adventure'=>'مغامرة','Comedy'=>'كوميديا','Drama'=>'دراما','Fantasy'=>'فانتازيا','Horror'=>'رعب','Mystery'=>'غموض','Romance'=>'رومانسية','Sci-Fi'=>'خيال علمي','Slice of Life'=>'شريحة من الحياة','Sports'=>'رياضة','Supernatural'=>'خارق للطبيعة','Thriller'=>'إثارة','Psychological'=>'نفسي'];
        $items = [];
        foreach ($counts as $g => $c) {
            $items[] = ['genre' => $g, 'label' => $ar[$g] ?? $g, 'count' => $c];
        }
        return rest_ensure_response(['items' => $items]);
    }

    public static function random_anime() {
        $r = Aniverse_Database::get_random_anime();
        return rest_ensure_response(['slug' => $r ? $r->slug : null]);
    }

    public static function ping() {
        return rest_ensure_response(['ok' => true, 't' => time()]);
    }

    public static function sync($req) {
        $body = json_decode($req->get_body(), true) ?: [];
        $dryRun = !empty($body['dryRun']);
        $limit = min(200, max(1, (int)($body['limit'] ?? 30)));
        $result = Aniverse_Sync::run($dryRun, $limit);
        return rest_ensure_response(['ok' => true, 'result' => $result]);
    }
}
