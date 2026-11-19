<?php
require '/case/scripts/common.php';
require_once ABSPATH . 'wp-admin/includes/user.php';
$id = (int)get_option('case_page_id');
$before = get_post_field('post_content', $id);
$block = unwanted_block();
if (substr_count($before, $block) !== 1) { WP_CLI::error('Unexpected content; stop for review.'); }
$clean = str_replace($block, '', $before);
if ($clean !== approved_content()) { WP_CLI::error('Approved content differs; stop for review.'); }
wp_update_post(['ID'=>$id, 'post_content'=>$clean]);
delete_option('unrecognized_redirect_note');
$unknown = get_user_by('login','unrecognized_editor');
if ($unknown) { wp_delete_user($unknown->ID, owner()->ID); }
$upload = WP_CONTENT_DIR . '/uploads/unrecognized-upload.php.txt';
if (!is_file($upload) || file_get_contents($upload) !== specimen('unrecognized-upload.php.txt')) { WP_CLI::error('Unexpected upload; stop for review.'); }
unlink($upload);
copy('/private/verified-readme.html', ABSPATH . 'readme.html');
wp_clear_scheduled_hook('unrecognized_maintenance');
delete_option('case_cron_notice');
WP_Session_Tokens::get_instance(owner()->ID)->destroy_all();
$new_password = wp_generate_password(64,true,true);
file_put_contents('/private/owner-password-after', $new_password);
chmod('/private/owner-password-after', 0600);
wp_set_password($new_password, owner()->ID);
update_option('users_can_register', 0);
file_put_contents(ABSPATH . '.cleanup-hardened', "Hardening activated by the reviewed cleanup.\n");
chmod(ABSPATH . '.cleanup-hardened', 0644);
chmod(ABSPATH . 'wp-config.php', 0640);
WP_CLI::success('Removed the six indicators, preserved approved content and rotated owner access.');
