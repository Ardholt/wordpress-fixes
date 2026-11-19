<?php
/** Plugin Name: Reference Rates — before repair */
if (!defined('ABSPATH')) { exit; }
add_shortcode('reference_rates', function () {
    $url = defined('RR_FIXTURE') && RR_FIXTURE ? 'http://fixture:8000/rates' : 'https://api.frankfurter.dev/v2/rates?base=GBP&quotes=EUR,USD';
    $r = wp_remote_get($url, ['timeout'=>2]);
    $rows = is_wp_error($r) ? null : json_decode(wp_remote_retrieve_body($r), true);
    // This integration expects a currency-keyed object; the provider returns a list.
    $rates = $rows['rates'] ?? [];
    if (isset($rates['EUR'], $rates['USD'])) {
        return '<section class="rates"><p>EUR ' . esc_html($rates['EUR']) . ' / USD ' . esc_html($rates['USD']) . '</p></section>';
    }
    return '<section class="rates" data-state="broken"><div class="eyebrow">CURRENCY REFERENCE</div><h2>A little clarity before you travel.</h2><p class="notice">Currency feed could not be displayed.</p><p>Raw provider response:</p><pre>' . esc_html(wp_json_encode($rows)) . '</pre><p class="source">No saved copy. No capture time.</p></section>';
});
