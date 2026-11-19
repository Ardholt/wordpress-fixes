<?php
/**
 * Booking guard for one shared resource.
 * License: GPL-2.0-or-later
 * MariaDB named locking keeps ownership for the whole request.
 * An unavailable lock rejects the booking.
 */
if (!defined('ABSPATH')) { exit; }
function vq_guard_acquire() {
    global $wpdb;
    return '1' === (string) $wpdb->get_var($wpdb->prepare(
        'SELECT GET_LOCK(%s, %d)', $wpdb->prefix . 'vq_booking_guard', 10
    ));
}
function vq_guard_release() {
    global $wpdb;
    $wpdb->get_var($wpdb->prepare('SELECT RELEASE_LOCK(%s)', $wpdb->prefix . 'vq_booking_guard'));
}
