<?php
$fast = (bool) get_option('garden_optimized', false);
$uri = get_template_directory_uri();
function garden_image($name, $alt, $hero = false) {
    global $fast, $uri;
    $src = $uri . '/assets/' . $name;
    if ($fast) {
        echo '<img src="'.esc_url($src.'-960.webp').'" srcset="'.esc_url($src.'-480.webp').' 480w, '.esc_url($src.'-960.webp').' 960w, '.esc_url($src.'-1600.webp').' 1600w" sizes="'.($hero ? '(max-width: 600px) 88vw, 92vw' : '(max-width: 600px) 88vw, 30vw').'" width="3200" height="2100" '.($hero ? 'fetchpriority="high" loading="eager"' : 'loading="lazy" decoding="async"').' alt="'.esc_attr($alt).'">';
    } else {
        echo '<img src="'.esc_url($src.'.jpg').'" alt="'.esc_attr($alt).'">';
    }
}
?><!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Garden services — Planting and seasonal care</title>
<?php if (!$fast): ?>
<link rel="stylesheet" href="<?= esc_url($uri) ?>/assets/bootstrap.css">
<script src="<?= esc_url($uri) ?>/assets/bootstrap.js"></script>
<?php endif; ?>
<link rel="stylesheet" href="<?= esc_url($uri) ?>/<?= $fast ? 'optimized.css' : 'style.css' ?>">
<script <?= $fast ? 'defer' : '' ?> src="<?= esc_url($uri) ?>/site.js"></script>
</head><body class="<?= $fast ? 'optimized' : 'unoptimized' ?>">
<header><span class="site-label">Garden services <span aria-hidden="true">↗</span></span><button class="menu-toggle" aria-expanded="false" aria-controls="navigation">Menu</button><nav id="navigation" aria-label="Main"><a href="#services">Our services</a><a href="#approach">Our approach</a><a href="#questions">Questions</a></nav></header>
<main>
<figure class="hero"><?php garden_image('garden', 'A planted garden with a stone path, timber pergola and flower beds', true); ?><figcaption class="caption">A place to slow down, through every season.</figcaption></figure>
<section class="intro"><span class="eyebrow">Thoughtful spaces. Everyday joy.</span><h1>More life in<br>your garden.</h1><p>From a quiet corner to a garden full of life, we plan, plant and care for outdoor spaces that feel like home.</p><a class="button" href="#services">Explore garden services ↗</a></section>
<section class="services" id="services"><span class="eyebrow">Made for the way you live</span><h2>Good gardens start with care.</h2><div class="cards">
<?php foreach ([['planting','Planting plans','Layered colour, texture and habitat, with plants chosen for your space.'],['courtyard','Small gardens','Make every corner count with simple layouts and thoughtful details.'],['care','Seasonal care','Keep your garden growing well with pruning, soil care and seasonal attention.']] as $item): ?>
<article class="card"><?php garden_image($item[0], $item[1].' garden illustration'); ?><div class="card-body"><h3><?= esc_html($item[1]) ?></h3><p><?= esc_html($item[2]) ?></p></div></article>
<?php endforeach; ?></div></section>
<section class="care" id="approach"><div><span class="eyebrow">A clear path from idea to garden</span><h2>Listen. Plan. Grow.</h2><p>We start with how you want to use the space. Then we make a practical plan, choose the right planting and help you keep it thriving.</p></div><div id="questions"><h2>Your questions</h2><details><summary>Can you work with a small garden?</summary><p>Yes. Courtyards, narrow borders and compact spaces all have room for thoughtful planting.</p></details><details><summary>Can I keep my existing plants?</summary><p>Yes. Healthy plants and favourite features can be part of the new plan.</p></details></div></section>
</main><footer>Planting plans · Small gardens · Seasonal care</footer>
</body></html>
