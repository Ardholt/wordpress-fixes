<?php
/** Plugin Name: Velquorra delivery eligibility */
function velquorra_delivery_countries() {
    $cached = get_transient('velquorra_delivery_regions_v2');
    if (is_array($cached)) return $cached;
    $response = wp_remote_get('http://delivery:8000/regions', ['timeout' => 4]);
    if (is_wp_error($response) || wp_remote_retrieve_response_code($response) !== 200) return [];
    $body = json_decode(wp_remote_retrieve_body($response), true);
    if (($body['schema'] ?? null) !== 2 || !is_array($body['destinations'] ?? null)) return [];
    $countries = array_values(array_filter($body['destinations'], function ($country) {
        return is_string($country) && preg_match('/^[A-Z]{2}$/D', $country);
    }));
    if (!$countries) return [];
    set_transient('velquorra_delivery_regions_v2', $countries, 5 * MINUTE_IN_SECONDS);
    return $countries;
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
