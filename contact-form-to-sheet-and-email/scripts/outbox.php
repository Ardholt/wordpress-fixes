<?php
require '/var/www/html/wp-load.php';
global $wpdb;
$keys=$wpdb->get_col("SELECT option_name FROM {$wpdb->options} WHERE option_name LIKE 'enquiry_outbox_%' ORDER BY option_id");
$out=[];
foreach($keys as $key) $out[]=get_option($key);
echo json_encode($out, JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES).PHP_EOL;
