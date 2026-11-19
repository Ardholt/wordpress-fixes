<?php
define('WP_INSTALLING', true);
$_SERVER['HTTP_HOST'] = 'localhost';
$_SERVER['REQUEST_URI'] = '/';
require '/var/www/html/wp-load.php';
require_once ABSPATH . 'wp-admin/includes/upgrade.php';
add_filter('pre_wp_mail', '__return_true');
if (!is_blog_installed()) {
    wp_install('Enquiry desk', 'owner', 'owner' . chr(64) . 'localhost.invalid', false, '', getenv('ADMIN_PASSWORD'));
}
update_option('home', 'http://localhost:' . (getenv('PUBLIC_PORT') ?: '8080'));
update_option('siteurl', get_option('home'));
update_option('blog_public', 0);
@mkdir(ABSPATH . 'wp-content/mu-plugins', 0755, true);
copy('/case/src/form.php', ABSPATH . 'wp-content/mu-plugins/form.php');
copy('/case/fixtures/broken.php', ABSPATH . 'wp-content/mu-plugins/delivery.php');
echo 'WordPress installed; broken delivery handler loaded.' . PHP_EOL;
