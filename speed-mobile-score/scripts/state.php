<?php
require '/var/www/html/wp-load.php';
$fast = ($argv[1] ?? '') === 'after';
update_option('garden_optimized', $fast);
$cache = $fast ? 'public, max-age=31536000, immutable' : 'no-store';
file_put_contents(ABSPATH.'.htaccess', "<IfModule mod_headers.c>\n<FilesMatch \"\\.(jpg|webp|css|js|ttf)$\">\nHeader set Cache-Control \"$cache\"\n</FilesMatch>\n</IfModule>\n");
echo ($fast ? 'AFTER' : 'BEFORE')." configuration active.\n";
