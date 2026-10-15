<?php
/** Aniverse Theme — minimal, delegates to the plugin's shortcode. */
if (!defined('ABSPATH')) exit;

add_action('wp_enqueue_scripts', function () {
    wp_enqueue_style('aniverse-theme-style', get_stylesheet_uri());
});

// Disable WP default theme cruft
remove_action('wp_head', 'wp_generator');
remove_action('wp_head', 'wlwmanifest_link');
remove_action('wp_head', 'rsd_link');

// Minimal head cleanup
add_filter('show_admin_bar', '__return_false');
