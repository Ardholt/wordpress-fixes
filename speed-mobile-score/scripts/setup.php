<?php
define('WP_INSTALLING', true);
require '/var/www/html/wp-load.php';
add_filter('pre_wp_mail', '__return_true');
if (!is_blog_installed()) {
    require_once ABSPATH.'wp-admin/includes/upgrade.php';
    wp_install('Garden services', 'garden-owner', '', true, '', bin2hex(random_bytes(24)));
}
update_option('template', 'garden');
update_option('stylesheet', 'garden');
update_option('blog_public', 0);
update_option('garden_optimized', false);
echo 'WordPress '.get_bloginfo('version').' installed; garden theme active.'.PHP_EOL;
