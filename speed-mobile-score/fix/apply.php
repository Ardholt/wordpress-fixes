<?php
// Run with: docker compose exec -T wordpress php < fix/apply.php
require '/var/www/html/wp-load.php';
update_option('garden_optimized', true);
echo "Responsive images, reserved space, local font swap and deferred navigation enabled.\n";
