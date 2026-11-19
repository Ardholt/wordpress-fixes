<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title><?php echo esc_html(get_bloginfo('name')); ?></title>
  <link rel="stylesheet" href="<?php echo esc_url(get_stylesheet_uri()); ?>">
  <script defer src="<?php echo esc_url(get_template_directory_uri() . '/player.js'); ?>"></script>
</head>
<body>
<header><span>VISITOR INFORMATION</span><a href="/visit/">Plan your visit</a></header>
<main>
<?php while (have_posts()) : the_post(); ?>
  <p class="eyebrow">A closer look</p>
  <h1><?php the_title(); ?></h1>
  <?php the_content(); ?>
<?php endwhile; ?>
</main>
<footer>A short introduction, at your own pace.</footer>
</body>
</html>
