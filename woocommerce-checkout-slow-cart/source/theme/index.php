<!doctype html>
<html <?php language_attributes(); ?>><head><meta charset="<?php bloginfo('charset'); ?>"><meta name="viewport" content="width=device-width, initial-scale=1"><?php wp_head(); ?></head>
<body <?php body_class(); ?>><header><a class="brand" href="/">Velquorra Kiln</a><nav><a href="/">Collection</a><a href="/cart/">Your basket</a></nav></header>
<main><p class="eyebrow">Stoneware</p><?php while(have_posts()): the_post(); ?><h1><?php the_title(); ?></h1><?php the_content(); endwhile; ?></main>
<footer>Velquorra Kiln · Stoneware</footer><?php wp_footer(); ?></body></html>
