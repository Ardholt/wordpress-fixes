<?php
// Local presentation shared by the original and repaired Elementor documents.
add_filter('elementor/frontend/print_google_fonts', '__return_false');
add_action('wp_head', function () { ?>
<style>
body { margin:0; background:#f4f0e8; color:#263c36; font-family:Arial,sans-serif; }
.elementor { max-width:1160px; margin:auto; padding:48px 36px; }
.elementor .elementor-heading-title { color:#263c36; font-family:Georgia,serif; font-weight:400; }
.elementor h1.elementor-heading-title { font-size:62px; line-height:1.06; }
.elementor h2.elementor-heading-title { font-size:31px; line-height:1.2; }
.elementor .elementor-widget-text-editor { font:20px/1.6 Arial,sans-serif; color:#42544d; }
.elementor .aux-modern-button { background:#263c36; border-radius:4px; padding:18px 26px; }
.elementor .aux-modern-button .aux-text { color:#fff; font:600 17px Arial,sans-serif; }
.elementor .elementor-widget-container { margin-bottom:18px; }
.elementor .workshop-card { background:#e1e7dc; padding:30px; border-radius:4px; }
.elementor .eyebrow { font:600 13px Arial,sans-serif; letter-spacing:3px; }
@media(max-width:767px) { .elementor { padding:28px 18px; } .elementor h1.elementor-heading-title { font-size:42px; } .elementor .workshop-card { margin-top:22px; } }
</style>
<?php });
