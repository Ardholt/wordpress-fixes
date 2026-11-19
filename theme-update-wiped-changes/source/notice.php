<?php
/** Customer-facing notice rescued from the edited parent functions file. */
function furniture_repair_notice() {
    echo '<aside class="repair-notice" aria-label="Repair service">Keep the chair you love. <a href="' . esc_url( home_url( '/?page_id=' . get_option( 'repair_services_page' ) ) ) . '">See repair services &rarr;</a></aside>';
}
add_action( 'wp_body_open', 'furniture_repair_notice' );
