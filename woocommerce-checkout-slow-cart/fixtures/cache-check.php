<?php
// Exercise the cache boundary and fail-closed behavior without changing the shop.
delete_transient('velquorra_delivery_regions_v2');
$calls=0;
$mode='valid';
add_filter('pre_http_request', function ($pre, $args, $url) use (&$calls, &$mode) {
    if ($url !== 'http://delivery:8000/regions') return $pre;
    $calls++;
    if ($mode === 'timeout') return new WP_Error('http_request_failed', 'Timed out');
    $body = $mode === 'malformed' ? '{broken' : '{"schema":2,"destinations":["GB"]}';
    return ['response'=>['code'=>200], 'body'=>$body, 'headers'=>[]];
}, 10, 3);
function require_check($condition, $message) { if (!$condition) throw new RuntimeException($message); }
require_check(velquorra_delivery_countries() === ['GB'], 'Valid regions must load');
require_check(velquorra_delivery_countries() === ['GB'] && $calls===1, 'Warm reads must use cache');
$expires = get_option('_transient_timeout_velquorra_delivery_regions_v2');
require_check($expires >= time()+295 && $expires <= time()+300, 'Cache lifetime must be bounded');
update_option('_transient_timeout_velquorra_delivery_regions_v2', time()-1);
require_check(velquorra_delivery_countries() === ['GB'] && $calls===2, 'Expired cache must refresh');
foreach(['timeout','malformed'] as $mode) {
    delete_transient('velquorra_delivery_regions_v2');
    require_check(velquorra_delivery_countries() === [], 'Invalid upstream must deny delivery');
    require_check(get_transient('velquorra_delivery_regions_v2') === false, 'Invalid response must not enter cache');
}
delete_transient('velquorra_delivery_regions_v2');
echo "PASS: warm cache, five-minute expiry, refresh, timeout and malformed-response rejection.\n";
