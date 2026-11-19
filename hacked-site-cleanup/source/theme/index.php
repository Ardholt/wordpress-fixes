<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Furniture care notes</title><link rel="stylesheet" href="<?php echo esc_url(get_stylesheet_uri()); ?>"><?php wp_head(); ?></head>
<body><header><strong>WordPress page</strong><span>Furniture care</span></header><main>
<?php while (have_posts()) : the_post(); ?>
<div class="eyebrow">From the workbench</div><h1><?php the_title(); ?></h1>
<?php the_content(); endwhile; ?>
</main><footer>Notes on keeping well-made things in use.</footer><?php wp_footer(); ?></body></html>
