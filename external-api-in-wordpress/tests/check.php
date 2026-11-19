<?php
require '/var/www/html/wp-load.php';
$stage = $argv[1] ?? 'fixed';
$checks = [];
function check($name, $condition, $details = null) {
    global $checks;
    $checks[] = ['check'=>$name, 'pass'=>(bool)$condition, 'details'=>$details];
    echo ($condition ? 'PASS ' : 'FAIL ') . $name . "\n";
    if (!$condition) { global $last_html; if ($last_html) { file_put_contents('/case/proof/failure-page.html',$last_html); } file_put_contents('/case/proof/failure.json', json_encode($checks, JSON_PRETTY_PRINT)); exit(1); }
}
function mode($m) { wp_remote_get('http://fixture:8000/mode/'.$m); }
function count_calls() { return (int)wp_remote_retrieve_body(wp_remote_get('http://fixture:8000/count')); }
function page() {
    global $last_html;
    $r = wp_remote_get('http://localhost/', ['timeout'=>12]);
    if (is_wp_error($r) || wp_remote_retrieve_response_code($r) !== 200) { throw new Exception('WordPress page request failed'); }
    // The HTTP request writes through a different PHP process; discard this CLI process's option cache.
    wp_cache_flush();
    $last_html = wp_remote_retrieve_body($r);
    return $last_html;
}
function cache() { wp_cache_flush(); return get_option('rr_cache', []); }
function expire($age=3601) { $c=cache(); $c['captured']=time()-$age; update_option('rr_cache',$c,false); delete_transient('rr_backoff'); }
function reset_rates() { wp_cache_flush(); delete_option('rr_cache'); delete_option('rr_lock'); delete_transient('rr_backoff'); }
if ($stage === 'broken') {
    mode('good'); $html=page();
    file_put_contents('/case/proof/before.html',$html);
    check('Broken page does not render parsed currency cards', !str_contains($html,'class="rate-grid"'));
    check('Broken response exposes unmapped provider JSON', str_contains($html,'Raw provider response'));
    // The same acceptance condition used after repair must fail here.
    $accept = str_contains($html,'data-state="fresh"') && str_contains($html,'1.1700');
    check('Fixed acceptance check is red before repair', !$accept);
} elseif ($stage === 'fixed') {
    reset_rates(); mode('good'); $n=count_calls(); $html=page();
    check('Parsed EUR and USD values appear on real WordPress page', str_contains($html,'1.1700') && str_contains($html,'1.2800') && str_contains($html,'data-state="fresh"'));
    check('Rate date, capture time and local source are visible', str_contains($html,'2026-01-15') && str_contains($html,'UTC') && str_contains($html,'Local check'));
    $first=cache(); page(); page();
    check('Three fresh page views use one upstream request', count_calls()-$n===1, ['page_views'=>3,'upstream_requests'=>count_calls()-$n]);
    mode('changed'); page(); check('Fresh cache keeps previous value', cache()['rows']['EUR']['rate']===1.17);
    expire(); $html=page(); check('Expired cache refreshes to changed upstream value', str_contains($html,'1.1900'));
    foreach (['down','malformed','partial','hostile','bad-date','negative','wrong-base','duplicate','future','oversized','timeout'] as $bad) {
        mode('good'); reset_rates(); page(); expire(); $saved=cache(); mode($bad);
        $t=microtime(true); $html=page(); $elapsed=round(microtime(true)-$t,3);
        check($bad.': labelled last-good fallback on page', str_contains($html,'data-state="stale"') && str_contains($html,'1.1700') && str_contains($html,'showing the last saved rates'));
        check($bad.': failed response cannot replace cache', cache()===$saved);
        check($bad.': unsafe markup never reaches the page', !str_contains($html,'onerror=') && !str_contains($html,'window.injected'));
        if ($bad==='timeout') { check('Timeout request is bounded below four seconds', $elapsed<4, ['seconds'=>$elapsed,'configured_timeout_seconds'=>2]); }
        $n=count_calls(); page(); check($bad.': retry backoff avoids another upstream request', count_calls()===$n);
    }
    reset_rates(); mode('timeout'); $t=microtime(true); $html=page();
    check('Empty-cache timeout shows guidance within four seconds', str_contains($html,'data-state="unavailable"') && microtime(true)-$t<4);
    reset_rates(); mode('down'); $html=page();
    check('Empty-cache outage gives an actionable source link', str_contains($html,'data-state="unavailable"') && str_contains($html,'Check the source') && !str_contains($html,'class="rate-grid"'));
    mode('good'); delete_transient('rr_backoff'); page(); expire(604801); mode('down'); $html=page();
    check('Rates saved more than seven days ago are hidden', str_contains($html,'data-state="unavailable"') && !str_contains($html,'1.1700'));
    mode('good'); delete_transient('rr_backoff'); update_option('rr_lock',time()-30,false); $html=page();
    check('Expired refresh lock is recovered', str_contains($html,'data-state="fresh"'));
    check('Provider recovery restores fresh rates', str_contains($html,'data-state="fresh"') && str_contains($html,'1.1700'));
    file_put_contents('/case/proof/after.html',$html);
} elseif ($stage === 'outage' || $stage === 'hostile') {
    mode('good'); reset_rates(); page(); expire(); mode($stage === 'outage' ? 'down' : 'hostile'); file_put_contents('/case/proof/'.$stage.'.html',page());
} elseif ($stage === 'empty') {
    reset_rates(); mode('down'); file_put_contents('/case/proof/empty.html',page());
} elseif ($stage === 'live') {
    reset_rates();
    $html=page(); $c=cache();
    check('Live external fetch reaches the WordPress page', str_contains($html,'data-state="fresh"') && str_contains($html,'Frankfurter') && !str_contains($html,'Local check'));
    check('Live cache records the public API source', ($c['source'] ?? '')==='https://api.frankfurter.dev/v2/rates?base=GBP&quotes=EUR,USD');
    file_put_contents('/case/proof/live.html',$html);
    file_put_contents('/case/proof/live-cache.json',json_encode($c,JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES));
} else { throw new Exception('Unknown stage'); }
file_put_contents('/case/proof/'.$stage.'-checks.json',json_encode($checks,JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES));
