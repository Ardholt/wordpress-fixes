<?php
// Export public-safe database evidence, retaining recipient equality rather than addresses.
global $wpdb;
$rows=$wpdb->get_results("SELECT * FROM {$wpdb->prefix}vq_bookings ORDER BY id", ARRAY_A);
foreach($rows as &$row) {
    $row['recipient_matches_runtime_customer']=hash_equals(getenv('CUSTOMER_ADDRESS'),$row['recipient']);
    unset($row['recipient']);
}
unset($row);
$overlaps=(int)$wpdb->get_var("SELECT COUNT(*) FROM {$wpdb->prefix}vq_bookings a JOIN {$wpdb->prefix}vq_bookings b ON a.id < b.id AND a.starts < b.busy_until AND b.starts < a.busy_until WHERE a.status='confirmed' AND b.status='confirmed'");
echo json_encode(['state'=>get_option('vq_state'),'rows'=>$rows,'active_overlap_pairs'=>$overlaps,'timezone'=>wp_timezone_string(),'wordpress'=>get_bloginfo('version'),'php'=>PHP_VERSION,'database'=>$wpdb->get_var('SELECT VERSION()'),'clock'=>getenv('BOOKING_CLOCK')],JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES)."\n";
