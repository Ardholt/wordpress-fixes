<?php
$active = wp_get_theme();
$parent = wp_get_theme( 'twentytwentyone' );
echo wp_json_encode( array(
    'wordpress' => get_bloginfo( 'version' ),
    'php' => PHP_VERSION,
    'activeStylesheet' => get_stylesheet(),
    'parentTemplate' => get_template(),
    'parentVersion' => $parent->get( 'Version' ),
    'childVersion' => $active->get( 'Version' ),
    'parentFiles' => array( 'functions.php' => hash_file( 'sha256', get_template_directory() . '/functions.php' ), 'style.css' => hash_file( 'sha256', get_template_directory() . '/style.css' ) ),
), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES ) . "\n";
