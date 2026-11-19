<?php
foreach (get_posts(array('post_type' => array('post', 'page'), 'post_status' => 'any', 'numberposts' => -1)) as $post) { wp_delete_post($post->ID, true); }
wp_set_sidebars_widgets(array('wp_inactive_widgets' => array()));
$home = wp_insert_post( array(
    'post_title' => 'Furniture worth keeping.',
    'post_content' => '<!-- wp:heading {"level":1,"style":{"typography":{"fontSize":"40px"}}} --><h1 class="wp-block-heading" style="font-size:40px">Furniture worth keeping.</h1><!-- /wp:heading --><!-- wp:paragraph --><p>Careful repairs for chairs, tables and the pieces you want to keep.</p><!-- /wp:paragraph -->',
    'post_status' => 'publish', 'post_type' => 'page',
) );
$services = wp_insert_post( array(
    'post_title' => 'Repair services',
    'post_content' => '<!-- wp:paragraph --><p>Chair joints, table surfaces and timber repairs. Bring a much-loved piece back into everyday use.</p><!-- /wp:paragraph -->',
    'post_status' => 'publish', 'post_type' => 'page',
) );
update_option( 'repair_services_page', $services );
update_option( 'show_on_front', 'page' );
update_option( 'page_on_front', $home );
update_option( 'blogdescription', 'Repair. Restore. Keep.' );
$menu = wp_create_nav_menu( 'Main navigation' );
foreach ( array( $home => 'Home', $services => 'Repair services' ) as $id => $label ) {
    wp_update_nav_menu_item( $menu, 0, array( 'menu-item-title' => $label, 'menu-item-object' => 'page', 'menu-item-object-id' => $id, 'menu-item-type' => 'post_type', 'menu-item-status' => 'publish' ) );
}
set_theme_mod( 'nav_menu_locations', array( 'primary' => $menu ) );
