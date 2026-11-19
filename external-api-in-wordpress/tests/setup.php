<?php
define('WP_INSTALLING', true);
$_SERVER['HTTP_HOST']='localhost';
require '/var/www/html/wp-load.php';
require_once ABSPATH . 'wp-admin/includes/upgrade.php';
if (!is_blog_installed()) { wp_install('Currency reference', 'owner', '', true, '', bin2hex(random_bytes(24))); }
update_option('home', 'http://localhost'); update_option('siteurl', 'http://localhost');
update_option('blog_public', 0);
foreach (['style.css','index.php'] as $file) { if (!is_dir(WP_CONTENT_DIR.'/themes/currency-page')) { mkdir(WP_CONTENT_DIR.'/themes/currency-page'); } copy('/case/source/'.$file, WP_CONTENT_DIR.'/themes/currency-page/'.$file); }
switch_theme('currency-page');
$id = wp_insert_post(['post_title'=>'Currency reference','post_content'=>'[reference_rates]','post_status'=>'publish','post_type'=>'page']);
update_option('page_on_front', $id); update_option('show_on_front','page');
if (!is_dir(WP_CONTENT_DIR.'/mu-plugins')) { mkdir(WP_CONTENT_DIR.'/mu-plugins'); }
copy('/case/tests/mode-fixture.php', WP_CONTENT_DIR.'/mu-plugins/00-mode.php');
copy('/case/broken/rates.php', WP_CONTENT_DIR.'/mu-plugins/rates.php');
echo "WordPress installed; broken integration active.\n";
