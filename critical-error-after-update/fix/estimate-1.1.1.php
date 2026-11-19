<?php
/* Plugin Name: Repair Estimate
Version: 1.1.1
License: GPL-2.0-or-later
*/
function repair_estimate_total($count) {
    $calculate = static function ($units) { return $units * 35; };
    return $calculate($count);
}
add_shortcode('repair_estimate', function () {
    $raw = isset($_GET['items']) ? wp_unslash($_GET['items']) : '1';
    $count = is_string($raw) ? filter_var($raw, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1, 'max_range' => 10]]) : false;
    if ($count === false) {
        return '<p role="alert">Choose between 1 and 10 items.</p>';
    }
    $total = repair_estimate_total($count);
    return '<section class="estimate"><h2>Your repair estimate</h2><p>Small furniture repairs · £35 per item</p><form method="get"><label for="items">Items to repair</label> <input id="items" name="items" type="number" min="1" max="10" value="' . esc_attr($count) . '"> <button type="submit">Calculate estimate</button></form><p id="total" aria-live="polite">Estimated total: £' . esc_html($total) . '</p><p>Final price agreed after inspection.</p></section>';
});
