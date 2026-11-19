<?php
$out=[];
foreach (['workshops','details'] as $slug) {
    $page=get_page_by_path($slug);
    $out[$slug]=hash('sha256', get_post_meta($page->ID, '_elementor_data', true));
}
echo json_encode($out, JSON_PRETTY_PRINT)."\n";
