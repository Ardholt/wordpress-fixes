<?php
add_action('after_setup_theme', function () { add_theme_support('woocommerce'); });
add_action('wp_enqueue_scripts', function () { wp_enqueue_style('velquorra', get_stylesheet_uri(), [], '1.0.0'); });
add_filter('woocommerce_checkout_fields', function ($fields) {
    unset($fields['billing']['billing_phone']);
    return $fields;
});
add_filter('woocommerce_checkout_get_value', function ($value, $input) {
    return $input === 'billing_country' && !$value ? 'GB' : $value;
}, 10, 2);
