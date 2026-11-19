<?php
$home = wp_insert_post(['post_title'=>'Furniture repair estimates', 'post_content'=>'[repair_estimate]', 'post_status'=>'publish', 'post_type'=>'page']);
update_option('show_on_front', 'page');
update_option('page_on_front', $home);
wp_insert_post(['post_title'=>'About the workshop', 'post_name'=>'about', 'post_content'=>'Furniture repairs with a clear estimate before work begins.', 'post_status'=>'publish', 'post_type'=>'page']);
