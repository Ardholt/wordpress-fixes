<?php
// Two small, editable Elementor documents; no imported site content or media.
update_option('elementor_disable_color_schemes', 'yes');
update_option('elementor_disable_typography_schemes', 'yes');
update_option('elementor_experiment-container', 'inactive');
update_option('elementor_experiment-e_optimized_markup', 'inactive');
update_option('elementor_experiment-e_element_cache', 'inactive');
// Generate Phlox's normal theme assets on a fresh install.
auxin_save_custom_css();
auxin_save_custom_js();
$counter = 0;
$widget = function ($name, $settings) use (&$counter) {
    return ['id'=>sprintf('%07x', ++$counter), 'elType'=>'widget', 'widgetType'=>$name, 'settings'=>$settings, 'elements'=>[]];
};
$column = function ($width, $children, $extra=[]) use (&$counter) {
    return ['id'=>sprintf('%07x', ++$counter), 'elType'=>'column', 'settings'=>array_merge(['_column_size'=>$width], $extra), 'elements'=>$children];
};
$section = function ($columns) use (&$counter) {
    return ['id'=>sprintf('%07x', ++$counter), 'elType'=>'section', 'settings'=>['content_width'=>['unit'=>'px','size'=>1080]], 'elements'=>$columns];
};
$create = function ($title, $slug, $data) {
    $id=wp_insert_post(['post_type'=>'page','post_status'=>'publish','post_title'=>$title,'post_name'=>$slug]);
    update_post_meta($id, '_wp_page_template', 'elementor_canvas');
    update_post_meta($id, '_elementor_edit_mode', 'builder');
    update_post_meta($id, '_elementor_template_type', 'wp-page');
    update_post_meta($id, '_elementor_version', ELEMENTOR_VERSION);
    update_post_meta($id, '_elementor_data', wp_slash(wp_json_encode($data)));
    return $id;
};
$home=$create('Clay workshops', 'workshops', [$section([
    $column(60, [
        $widget('text-editor', ['editor'=>'<p class="eyebrow">CLAY / WORKSHOPS</p>']),
        $widget('heading', ['title'=>'Make something<br>with your hands.', 'header_size'=>'h1']),
        $widget('text-editor', ['editor'=>'<p>A slower afternoon at the pottery wheel.<br>Explore clay, shape a bowl and find your rhythm.</p>']),
        $widget('aux_modern_button', ['label'=>'Explore the workshops', 'link'=>['url'=>'/?pagename=details'], 'btn_size'=>'large', 'btn_align'=>'left', 'text_normal_typo_typography'=>'custom', 'text_normal_typo_font_family'=>'Arial'])
    ]),
    $column(40, [
        $widget('heading', ['title'=>'Your afternoon in clay', 'header_size'=>'h2']),
        $widget('text-editor', ['editor'=>'<p><strong>Settle in</strong><br>Meet the clay and learn the wheel.</p><p><strong>Find your shape</strong><br>Build confidence with hands-on guidance.</p><p><strong>Make it yours</strong><br>Choose a glaze for your finished piece.</p>'])
    ], ['css_classes'=>'workshop-card'])
])]);
$create('Workshop details', 'details', [$section([$column(100, [
    $widget('heading', ['title'=>'A little space to make.', 'header_size'=>'h1']),
    $widget('text-editor', ['editor'=>'<p>Clay, tools and an apron are ready at the wheel. Wear comfortable clothes and come ready to try something new.</p>']),
    $widget('button', ['text'=>'Back to workshops', 'link'=>['url'=>'/?pagename=workshops']])
])])]);
update_option('show_on_front', 'page');
update_option('page_on_front', $home);
echo "Created workshop and details pages.\n";
