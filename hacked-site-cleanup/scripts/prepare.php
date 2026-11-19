<?php
require '/case/scripts/common.php';
if (get_option('case_page_id')) { WP_CLI::error('Reset first; preparation requires a fresh site.'); }
$id = wp_insert_post(['post_title'=>'Furniture care notes', 'post_content'=>approved_content(), 'post_type'=>'page', 'post_status'=>'publish', 'post_author'=>owner()->ID], true);
if (is_wp_error($id)) { WP_CLI::error($id->get_error_message()); }
update_option('case_page_id', $id);
update_option('show_on_front', 'page');
update_option('page_on_front', $id);
update_option('approved_workshop_setting', 'Keep the care notes available');
update_option('users_can_register', 0);
switch_theme('workshop');
wp_mkdir_p(WP_CONTENT_DIR . '/uploads/listing-check');
file_put_contents(WP_CONTENT_DIR . '/uploads/care-notes.txt', "Use a soft cloth. Keep wooden furniture away from direct heat.\n");
file_put_contents(WP_CONTENT_DIR . '/uploads/listing-check/ordinary.txt', "Approved directory listing check.\n");
wp_schedule_event(time() + DAY_IN_SECONDS, 'daily', 'approved_workshop_housekeeping');
$session = WP_Session_Tokens::get_instance(owner()->ID)->create(time() + DAY_IN_SECONDS);
file_put_contents('/private/owner-baseline.json', json_encode(['password_hash'=>owner()->user_pass, 'salt_digests'=>salt_digests(), 'session'=>$session]));
chmod('/private/owner-baseline.json', 0600);
copy(ABSPATH . 'readme.html', '/private/verified-readme.html');
// Plant only passive text and records. No callback reads the option or cron hook.
wp_update_post(['ID'=>$id, 'post_content'=>unwanted_block() . approved_content()]);
update_option('unrecognized_redirect_note', specimen('option.txt'), false);
$unknown = wp_insert_user(['user_login'=>'unrecognized_editor','user_pass'=>wp_generate_password(64, true, true),'role'=>'administrator','display_name'=>'Unrecognized account']);
if (is_wp_error($unknown)) { WP_CLI::error('Could not create the disabled indicator account.'); }
global $wpdb;
$wpdb->update($wpdb->users, ['user_pass'=>'!INERT-DISABLED-NOT-A-PASSWORD-HASH!'], ['ID'=>$unknown]);
clean_user_cache($unknown);
update_user_meta($unknown, 'specimen_notice', specimen('account.txt'));
copy('/case/fixtures/specimens/unrecognized-upload.php.txt', WP_CONTENT_DIR . '/uploads/unrecognized-upload.php.txt');
chmod(WP_CONTENT_DIR . '/uploads/unrecognized-upload.php.txt', 0644);
file_put_contents(ABSPATH . 'readme.html', "\n" . specimen('core-document.txt'), FILE_APPEND);
wp_schedule_event(time() + DAY_IN_SECONDS, 'daily', 'unrecognized_maintenance');
update_option('case_cron_notice', specimen('cron.txt'), false);
WP_CLI::success('Staged six inert indicators alongside approved content.');
