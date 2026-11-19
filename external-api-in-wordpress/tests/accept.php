<?php
require '/var/www/html/wp-load.php';
$r=wp_remote_get('http://localhost/', ['timeout'=>12]);
$html=is_wp_error($r)?'':wp_remote_retrieve_body($r);
$ok=str_contains($html,'data-state="fresh"') && str_contains($html,'1.1700') && str_contains($html,'1.2800');
echo $ok ? "PASS parsed values and fresh state\n" : "FAIL parsed values or fresh state missing\n";
exit($ok?0:1);
