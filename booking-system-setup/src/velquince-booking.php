<?php
/**
 * Plugin Name: Velquince appointments
 * Description: Single-resource appointments with local confirmation capture.
 * Version: 1.0.0
 * License: GPL-2.0-or-later
 */
if (!defined('ABSPATH')) { exit; }
require_once __DIR__.'/booking-guard.php';
function vq_now() { return getenv('BOOKING_CLOCK') ? strtotime(getenv('BOOKING_CLOCK')) : time(); }
function vq_fixed() { return get_option('vq_state') === 'fixed'; }
function vq_services() { return ['cut'=>['name'=>'Cut & finish','minutes'=>60,'buffer'=>15], 'consult'=>['name'=>'Style consultation','minutes'=>30,'buffer'=>10]]; }
function vq_schedule() { return get_option('vq_availability', ['open'=>'09:00','close'=>'17:00','days'=>[1,2,3,4,5],'closed'=>[]]); }
function vq_install() {
    global $wpdb;
    require_once ABSPATH . 'wp-admin/includes/upgrade.php';
    dbDelta("CREATE TABLE {$wpdb->prefix}vq_bookings (
        id bigint unsigned NOT NULL AUTO_INCREMENT,
        service varchar(40) NOT NULL,
        title varchar(100) NOT NULL,
        starts datetime NOT NULL,
        ends datetime NOT NULL,
        busy_until datetime NOT NULL,
        customer varchar(100) NOT NULL,
        recipient varchar(190) NOT NULL,
        status varchar(20) NOT NULL DEFAULT 'confirmed',
        mail_status varchar(20) NOT NULL DEFAULT 'pending',
        PRIMARY KEY  (id),
        KEY active_time (status,starts,busy_until)
    ) {$wpdb->get_charset_collate()};");
}
register_activation_hook(__FILE__, 'vq_install');
add_filter('wp_mail_from', fn()=>getenv('OWNER_ADDRESS'));
add_filter('wp_mail_from_name', fn()=>'Velquince Studio');
add_action('phpmailer_init', function($mail) {
    $mail->isSMTP(); $mail->Host = 'mail'; $mail->Port = 1025;
    $mail->Timeout = 5; $mail->SMTPAuth = false; $mail->SMTPAutoTLS = false;
    $mail->setFrom(getenv('OWNER_ADDRESS'), 'Velquince Studio');
});
function vq_local($utc) { return (new DateTimeImmutable($utc, new DateTimeZone('UTC')))->setTimezone(new DateTimeZone('Europe/London')); }
function vq_error($message, $status=422) { return new WP_Error('booking_error', $message, ['status'=>$status]); }
function vq_time($day, $time, $service) {
    if (!isset(vq_services()[$service]) || !preg_match('/^\d{4}-\d{2}-\d{2}$/D', $day) || !preg_match('/^\d{2}:\d{2}$/D', $time)) return vq_error('Choose a valid service and time.');
    $zone = new DateTimeZone(vq_fixed() ? 'Europe/London' : 'UTC');
    $start = DateTimeImmutable::createFromFormat('!Y-m-d H:i', "$day $time", $zone);
    if (!$start || $start->format('Y-m-d H:i') !== "$day $time") return vq_error('Choose a valid date and time.');
    $a = vq_schedule(); $s = vq_services()[$service];
    $finish = $start->modify('+'.$s['minutes'].' minutes');
    $busy = $finish->modify('+'.$s['buffer'].' minutes');
    if (!in_array((int)$start->format('N'),$a['days'],true) || in_array($day,$a['closed'],true) || $time < $a['open'] || $busy->format('H:i') > $a['close'] || $busy->format('Y-m-d') !== $day || (int)$start->format('i') % 15 !== 0) return vq_error('That time is outside studio availability.');
    if ($start->getTimestamp() < vq_now()+12*3600 || $start->getTimestamp() > vq_now()+365*86400) return vq_error('Choose a time with 12 hours notice, within the next 365 days.');
    return ['starts'=>gmdate('Y-m-d H:i:s',$start->getTimestamp()),'ends'=>gmdate('Y-m-d H:i:s',$finish->getTimestamp()),'busy_until'=>gmdate('Y-m-d H:i:s',$busy->getTimestamp())];
}
function vq_overlap($t) {
    global $wpdb;
    return (int)$wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM {$wpdb->prefix}vq_bookings WHERE status='confirmed' AND starts < %s AND busy_until > %s",$t['busy_until'],$t['starts']));
}
function vq_send($row, $cancelled=false) {
    global $wpdb;
    $local=vq_local($row->starts);
    $body = ($cancelled ? 'Appointment cancelled' : 'Appointment confirmed')."\nReference: VQ-{$row->id}\n{$row->title}\n".$local->format('l j F Y, H:i T')."\nTimezone: Europe/London\nGuest: {$row->customer}\n";
    $ok=wp_mail($row->recipient, ($cancelled ? 'Cancelled' : 'Confirmed')." | VQ-{$row->id} | {$row->title}", $body);
    $wpdb->update($wpdb->prefix.'vq_bookings',['mail_status'=>$ok ? 'sent' : 'failed'],['id'=>$row->id]);
    return $ok;
}
function vq_book($r) {
    global $wpdb;
    $name=sanitize_text_field($r->get_param('name') ?? ''); $email=sanitize_email($r->get_param('email') ?? '');
    if (!$name || strlen($name)>100 || !is_email($email) || strlen($email)>190 || $r->get_param('website')) return vq_error('Enter your name and a valid confirmation address.');
    $service=(string)$r->get_param('service');
    $t=vq_time((string)$r->get_param('date'),(string)$r->get_param('time'),$service);
    if (is_wp_error($t)) return $t;
    $locked=false;
    if (vq_fixed()) {
        if (!vq_guard_acquire()) return vq_error('The calendar is busy. Please try again.',503);
        $locked=true;
    }
    try {
        if ($locked) { wp_cache_delete('alloptions','options'); wp_cache_delete('vq_availability','options'); }
        $t=vq_time((string)$r->get_param('date'),(string)$r->get_param('time'),$service);
        if (is_wp_error($t)) return $t;
        if (vq_overlap($t)) return vq_error('That time has just been taken. Choose another time.',409);
        // The broken fixture widens the existing check/write gap for a reproducible race.
        if (!vq_fixed()) usleep(500000);
        $s=vq_services()[$service];
        $ok=$wpdb->insert($wpdb->prefix.'vq_bookings',array_merge($t,['service'=>$service,'title'=>$s['name'],'customer'=>$name,'recipient'=>$email]));
        if (!$ok) return vq_error('The booking could not be saved. Please try again.',503);
        $id=(int)$wpdb->insert_id;
    $row=$wpdb->get_row($wpdb->prepare("SELECT * FROM {$wpdb->prefix}vq_bookings WHERE id=%d",$id));
    $sent=vq_fixed() ? vq_send($row) : false;
    return new WP_REST_Response(['id'=>$id,'reference'=>'VQ-'.$id,'service'=>$row->title,'local'=>vq_local($row->starts)->format('l j F Y, H:i T'),'timezone'=>'Europe/London','mail'=>$sent ? 'sent' : 'failed'],201);
    } finally { if ($locked) vq_guard_release(); }
}
add_action('rest_api_init', function() {
    register_rest_route('velquince/v1','/book',['methods'=>'POST','callback'=>'vq_book','permission_callback'=>'__return_true']);
    register_rest_route('velquince/v1','/slots',['methods'=>'GET','permission_callback'=>'__return_true','callback'=>function($r) {
        $slots=[];
        for ($i=0;$i<96;$i++) {
            $time=sprintf('%02d:%02d',intdiv($i,4),($i%4)*15);
            $t=vq_time((string)$r->get_param('date'),$time,(string)$r->get_param('service'));
            if (!is_wp_error($t) && !vq_overlap($t)) $slots[]=$time;
        }
        return ['slots'=>$slots,'timezone'=>'Europe/London'];
    }]);
});
add_action('template_redirect',function() {
    if (!is_front_page()) return;
    nocache_headers();
    include __DIR__.'/page.php'; exit;
});
add_action('admin_menu',function() { add_menu_page('Appointments','Appointments','manage_options','velquince','vq_admin','dashicons-calendar-alt',25); });
function vq_cancel($id) {
    global $wpdb;
    if (!vq_guard_acquire()) return false;
    try {
        $row=$wpdb->get_row($wpdb->prepare("SELECT * FROM {$wpdb->prefix}vq_bookings WHERE id=%d",$id));
        if (!$row || $row->status !== 'confirmed') return false;
        $ok=$wpdb->update($wpdb->prefix.'vq_bookings',['status'=>'cancelled'],['id'=>$id,'status'=>'confirmed']);
    } finally { vq_guard_release(); }
    if ($ok) vq_send($row,true);
    return (bool)$ok;
}
add_action('admin_post_vq_cancel',function() {
    if (!current_user_can('manage_options')) wp_die('Not allowed',403);
    check_admin_referer('vq_cancel');
    vq_cancel(absint($_POST['id'] ?? 0));
    wp_safe_redirect(admin_url('admin.php?page=velquince')); exit;
});
add_action('admin_post_vq_availability',function() {
    if (!current_user_can('manage_options')) wp_die('Not allowed',403);
    check_admin_referer('vq_availability');
    $open=sanitize_text_field($_POST['open'] ?? ''); $close=sanitize_text_field($_POST['close'] ?? '');
    $days=array_values(array_filter(array_map('intval',(array)($_POST['days'] ?? [])),fn($d)=>$d>=1 && $d<=7));
    $closed=array_values(array_filter(array_map('trim',explode(',',sanitize_text_field($_POST['closed'] ?? '')))));
    if (!preg_match('/^(?:[01]\d|2[0-3]):[0-5]\d$/D',$open) || !preg_match('/^(?:[01]\d|2[0-3]):[0-5]\d$/D',$close) || $open >= $close || !$days) wp_die('Check the opening hours.');
    foreach($closed as $day) { $d=DateTimeImmutable::createFromFormat('!Y-m-d',$day); if (!$d || $d->format('Y-m-d')!==$day) wp_die('Check the closed dates.'); }
    if (!vq_guard_acquire()) wp_die('Calendar busy. Try again.');
    try { update_option('vq_availability',compact('open','close','days','closed')); } finally { vq_guard_release(); }
    wp_safe_redirect(admin_url('admin.php?page=velquince&saved=1')); exit;
});
function vq_admin() {
    global $wpdb; $a=vq_schedule();
    echo '<div class="wrap"><h1>Velquince Studio · Appointments</h1><p>One chair · Europe/London · cancelled appointments release their time immediately.</p><h2>Availability</h2>';
    echo '<form method="post" action="'.esc_url(admin_url('admin-post.php')).'">'; wp_nonce_field('vq_availability');
    echo '<input type="hidden" name="action" value="vq_availability"><p><label>Opens <input type="time" name="open" value="'.esc_attr($a['open']).'" required></label> <label>Closes <input type="time" name="close" value="'.esc_attr($a['close']).'" required></label></p>';
    foreach(['Mon','Tue','Wed','Thu','Fri','Sat','Sun'] as $i=>$day) echo '<label style="margin-right:15px"><input type="checkbox" name="days[]" value="'.($i+1).'" '.checked(in_array($i+1,$a['days'],true),true,false).'>'.$day.'</label>';
    echo '<p><label>Closed dates (YYYY-MM-DD, separated by commas)<br><input name="closed" style="width:420px;max-width:100%" value="'.esc_attr(implode(',',$a['closed'])).'"></label></p><button class="button button-primary">Save availability</button></form><h2>Bookings</h2><table class="widefat striped"><thead><tr><th>Reference</th><th>Service</th><th>Studio time</th><th>Guest</th><th>Status / mail</th><th>Manage</th></tr></thead><tbody>';
    $rows=$wpdb->get_results("SELECT * FROM {$wpdb->prefix}vq_bookings ORDER BY starts,id");
    foreach($rows as $r) {
        echo '<tr data-booking="'.(int)$r->id.'"><td>VQ-'.(int)$r->id.'</td><td>'.esc_html($r->title).'</td><td>'.esc_html(vq_local($r->starts)->format('j M Y H:i T')).'</td><td>'.esc_html($r->customer).'</td><td>'.esc_html($r->status.' / '.$r->mail_status).'</td><td>';
        if ($r->status==='confirmed') { echo '<form method="post" action="'.esc_url(admin_url('admin-post.php')).'"><input type="hidden" name="action" value="vq_cancel"><input type="hidden" name="id" value="'.(int)$r->id.'">'; wp_nonce_field('vq_cancel'); echo '<button class="button">Cancel appointment</button></form>'; }
        echo '</td></tr>';
    }
    echo '</tbody></table><p>Mail status records SMTP acceptance. Real inbox delivery is a separate check.</p></div>';
}
