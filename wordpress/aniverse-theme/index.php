<?php
/** Aniverse Theme — single page, renders the [aniverse_app] shortcode. */
if (!defined('ABSPATH')) exit;
get_header();
?>
<main id="aniverse-root">
  <?php echo do_shortcode('[aniverse_app]'); ?>
</main>
<?php
get_footer();
