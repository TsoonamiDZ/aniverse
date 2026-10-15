<?php
/**
 * Plugin Name: Aniverse
 * Description: مكتبة أنمي احترافية — 2,193 أنمي + 25,885 حلقة + 149,382 رابط مشاهدة. مع أداة مزامنة من okanime.xyz.
 * Version: 1.0.0
 * Author: Aniverse
 * License: GPL-2.0
 * Text Domain: aniverse
 */

if (!defined('ABSPATH')) exit;

define('ANIVERSE_VERSION', '1.0.0');
define('ANIVERSE_PATH', plugin_dir_path(__FILE__));
define('ANIVERSE_URL', plugin_dir_url(__FILE__));

// ── Includes ──────────────────────────────────────────
require_once ANIVERSE_PATH . 'includes/class-database.php';
require_once ANIVERSE_PATH . 'includes/class-rest-api.php';
require_once ANIVERSE_PATH . 'includes/class-sync.php';

// ── Activation: create tables ────────────────────────
register_activation_hook(__FILE__, function () {
    Aniverse_Database::create_tables();
});

// ── REST API ──────────────────────────────────────────
add_action('rest_api_init', function () {
    Aniverse_REST_API::register_routes();
});

// ── Shortcode [aniverse_app] ─────────────────────────
add_shortcode('aniverse_app', function () {
    wp_enqueue_style('aniverse', ANIVERSE_URL . 'assets/css/aniverse.css', [], ANIVERSE_VERSION);
    wp_enqueue_script('aniverse', ANIVERSE_URL . 'assets/js/aniverse.js', [], ANIVERSE_VERSION, true);
    wp_localize_script('aniverse', 'ANIVERSE', [
        'restUrl' => esc_url_raw(rest_url('aniverse/v1')),
        'nonce' => wp_create_nonce('wp_rest'),
        'homeUrl' => home_url('/'),
    ]);
    ob_start();
    ?>
    <div id="aniverse-app" class="aniverse-app">
      <div class="aniverse-loading">جارٍ التحميل…</div>
    </div>
    <?php
    return ob_get_clean();
});

// ── Admin menu ─────────────────────────────────────────
add_action('admin_menu', function () {
    add_menu_page(
        'Aniverse', 'Aniverse', 'manage_options',
        'aniverse', function () {
            require ANIVERSE_PATH . 'admin/sync-page.php';
        },
        'dashicons-video-alt2', 26
    );
    add_submenu_page('aniverse', 'الإعدادات', 'الإعدادات', 'manage_options',
        'aniverse-settings', function () {
            require ANIVERSE_PATH . 'admin/settings-page.php';
        });
});

// ── Flush rewrites on activation ──────────────────────
register_activation_hook(__FILE__, function () {
    flush_rewrite_rules();
});
