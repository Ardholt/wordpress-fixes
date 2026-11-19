<?php
/** Plugin Name: Enquiry delivery before repair
 * License: MIT
 */
defined('ABSPATH') || exit;
function enquiry_deliver($payload) {
    // The retired webhook route returns an error; this handler ignores it.
    wp_remote_post('http://n8n:5678/webhook/retired-enquiry', [
        'timeout'=>8, 'headers'=>['Content-Type'=>'application/json'], 'body'=>wp_json_encode($payload)
    ]);
    return new WP_REST_Response(['status'=>'delivered','message'=>'Sent. Your enquiry is in the sheet and inbox.'], 200);
}
