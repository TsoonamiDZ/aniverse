<?php /** Aniverse Theme — empty header (plugin handles everything). */ ?>
<!DOCTYPE html>
<html <?php language_attributes(); ?> <?php echo is_rtl() ? 'dir="rtl"' : 'dir="rtl"'; ?>>
<head>
<meta charset="<?php bloginfo('charset'); ?>">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title><?php wp_title('|', true, 'right'); ?></title>
<link rel="profile" href="https://gmpg.org/xfn/11">
<?php wp_head(); ?>
</head>
<body <?php body_class('aniverse-body'); ?>>
