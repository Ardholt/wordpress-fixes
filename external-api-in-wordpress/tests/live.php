<?php
require '/var/www/html/wp-load.php';
// Record one separately labelled public-network request, not a deterministic test.
$url='https://api.frankfurter.dev/v2/rates?base=GBP&quotes=EUR,USD';
$r=wp_remote_get($url,['timeout'=>10,'redirection'=>0]);
$body=is_wp_error($r)?'':wp_remote_retrieve_body($r);
$status=is_wp_error($r)?0:wp_remote_retrieve_response_code($r);
file_put_contents('/case/proof/live-response.json',$body);
file_put_contents('/case/proof/live-fetch.json',json_encode(['kind'=>'separate live external observation','url'=>$url,'captured_at'=>gmdate('c'),'http_status'=>$status,'valid'=>rr_valid(json_decode($body,true))!==false],JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES));
if($status!==200 || !rr_valid(json_decode($body,true))) { fwrite(STDERR,"Live source unavailable or invalid; observation failed.\n"); exit(1); }
echo "PASS separate live observation: public API returned valid rates without a key\n";
