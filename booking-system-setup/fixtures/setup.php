<?php
// Run inside the disposable WordPress installation.
vq_install();
update_option('blogname', 'Velquince Studio');
update_option('timezone_string', 'Europe/London');
update_option('vq_state', 'broken');
update_option('vq_availability', ['open'=>'09:00','close'=>'17:00','days'=>[1,2,3,4,5],'closed'=>['2027-04-02']]);
$page = get_page_by_path('appointments');
$id = wp_insert_post(['ID'=>$page ? $page->ID : 0,'post_title'=>'Appointments','post_name'=>'appointments','post_status'=>'publish','post_type'=>'page','post_content'=>'[retired_booking_calendar]']);
update_option('show_on_front','page'); update_option('page_on_front',$id);
wp_delete_post(1, true); wp_delete_post(2, true);
echo "Broken state installed: retired shortcode, UTC labels, unlocked booking writes.\n";
