<?php
define('RR_FIXTURE', true);
define('DISABLE_WP_CRON', true);
// Allow the browser container and the published local port to view the same page.
remove_action('template_redirect', 'redirect_canonical');
if (!empty($_SERVER['HTTP_HOST']) && preg_match('/^(localhost|127\.0\.0\.1|web)(:[0-9]+)?$/D', $_SERVER['HTTP_HOST'])) {
    define('WP_HOME', 'http://' . $_SERVER['HTTP_HOST']);
    define('WP_SITEURL', 'http://' . $_SERVER['HTTP_HOST']);
}
