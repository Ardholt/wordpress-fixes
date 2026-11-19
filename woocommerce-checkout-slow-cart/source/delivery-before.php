<?php
/** Plugin Name: Velquorra delivery eligibility */
function velquorra_delivery_countries() {
    $response = wp_remote_get('http://delivery:8000/regions', ['timeout' => 4]);
    if (is_wp_error($response)) return [];
    $body = json_decode(wp_remote_retrieve_body($response), true);
    return $body['countries'] ?? [];
}
add_action('woocommerce_before_calculate_totals', function () {
    // The delivery notice and checkout use the same eligibility lookup.
    $GLOBALS['velquorra_destinations'] = velquorra_delivery_countries();
});
add_action('woocommerce_after_checkout_validation', function ($data, $errors) {
    if (!in_array($data['shipping_country'] ?: $data['billing_country'], velquorra_delivery_countries(), true)) {
        $errors->add('delivery_region', 'Delivery could not be confirmed. Please try again.');
    }
}, 10, 2);
add_action('woocommerce_before_cart', function () {
    if (in_array('GB', velquorra_delivery_countries(), true)) {
        echo '<p class="delivery-note">UK delivery available · Flat rate £4.50</p>';
    }
});
