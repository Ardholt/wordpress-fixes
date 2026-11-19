<?php
/** Keep the parent stylesheet and load the rescued styling after it. */
add_action( 'wp_enqueue_scripts', function () {
    wp_enqueue_style( 'furniture-repair-child', get_stylesheet_uri(), array( 'twenty-twenty-one-style' ), wp_get_theme()->get( 'Version' ) );
}, 20 );
require __DIR__ . '/notice.php';
