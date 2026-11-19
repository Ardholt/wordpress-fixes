<?php
/** Plugin Name: Enquiry delivery with durable outbox
 * Description: Durable delivery for the Enquiry desk form.
 * License: MIT
 */
defined('ABSPATH') || exit;
const ENQUIRY_PREFIX = 'enquiry_outbox_';
function enquiry_post($p) {
    $r = wp_remote_post('http://n8n:5678/webhook/enquiry', [
        'timeout'=>12, 'redirection'=>0,
        'headers'=>['Content-Type'=>'application/json','X-Webhook-Secret'=>getenv('WEBHOOK_SECRET')],
        'body'=>wp_json_encode($p)
    ]);
    if (is_wp_error($r)) return false;
    $body = json_decode(wp_remote_retrieve_body($r), true);
    return wp_remote_retrieve_response_code($r) === 200 &&
        ($body['status'] ?? '') === 'delivered' && ($body['id'] ?? '') === $p['id'];
}
function enquiry_deliver($p) {
    global $wpdb;
    $key = ENQUIRY_PREFIX . $p['id'];
    $lock = 'enquiry_' . hash('sha256', $p['id']);
    $lock = substr($lock, 0, 64);
    if (!$wpdb->get_var($wpdb->prepare('SELECT GET_LOCK(%s, 3)', $lock))) {
        return new WP_REST_Response(['status'=>'busy','message'=>'This reference is being processed. Please retry.'], 409);
    }
    try {
        $old = get_option($key);
        if ($old && $old['payload'] !== $p) return new WP_REST_Response(['status'=>'conflict','message'=>'This reference already belongs to another enquiry.'], 409);
        if ($old && $old['status'] === 'delivered') return new WP_REST_Response(['status'=>'delivered','message'=>'Already delivered to the sheet and inbox.'], 200);
        $entry = $old ?: ['payload'=>$p, 'status'=>'pending', 'attempts'=>0];
        // Persist BEFORE attempting the webhook, including on the very first request.
        if (!$old && !add_option($key, $entry, '', 'no')) return new WP_REST_Response(['status'=>'error','message'=>'Could not save your enquiry. Please retry.'], 503);
        $entry['attempts']++;
        $done = enquiry_post($p);
        $entry['status'] = $done ? 'delivered' : 'pending';
        update_option($key, $entry, false);
        return new WP_REST_Response(['status'=>$entry['status'], 'message'=>$done ?
            'Delivered. Your enquiry is in the sheet and inbox.' :
            'Saved for retry. Delivery is pending; please keep your reference.'], $done ? 200 : 202);
    } finally { $wpdb->get_var($wpdb->prepare('SELECT RELEASE_LOCK(%s)', $lock)); }
}
function enquiry_retry() {
    global $wpdb;
    $keys = $wpdb->get_col($wpdb->prepare('SELECT option_name FROM '.$wpdb->options.' WHERE option_name LIKE %s', $wpdb->esc_like(ENQUIRY_PREFIX).'%'));
    foreach ($keys as $key) {
        $entry = get_option($key);
        if ($entry['status'] === 'pending') enquiry_deliver($entry['payload']);
    }
}
add_filter('cron_schedules', function ($s) { $s['enquiry_minute']=['interval'=>60,'display'=>'Enquiry retries'];return $s; });
add_action('enquiry_retry', 'enquiry_retry');
add_action('init', function () { if (!wp_next_scheduled('enquiry_retry')) wp_schedule_event(time()+60,'enquiry_minute','enquiry_retry'); });
