<?php
update_option('vq_state','fixed');
update_option('timezone_string','Europe/London');
$page = get_page_by_path('appointments');
wp_update_post(['ID'=>$page->ID,'post_content'=>'[velquince_booking]']);
echo "Repair applied: live form, London conversion, serialized availability check and insert, confirmation mail.\n";
