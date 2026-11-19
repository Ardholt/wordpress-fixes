<?php
require '/case/scripts/common.php';
$stage = $args[0] ?? 'after';
$id = (int)get_option('case_page_id');
$content = get_post_field('post_content', $id);
$unknown = get_user_by('login','unrecognized_editor');
$baseline = json_decode(file_get_contents('/private/owner-baseline.json'),true);
$salts_rotated = true;
foreach (salt_digests() as $key=>$digest) {
    if ($digest === $baseline['salt_digests'][$key]) { $salts_rotated = false; }
}
$indicators = [
    'page_content'=>str_contains($content, 'data-indicator="unwanted-promotion"'),
    'unused_redirect_option'=>get_option('unrecognized_redirect_note', null) !== null,
    'disabled_unknown_administrator'=>(bool)$unknown,
    'dropped_text_file'=>file_exists(WP_CONTENT_DIR . '/uploads/unrecognized-upload.php.txt'),
    'altered_core_document'=>hash_file('sha256',ABSPATH . 'readme.html') !== hash_file('sha256','/private/verified-readme.html'),
    'cron_without_callback'=>(bool)wp_next_scheduled('unrecognized_maintenance'),
];
wp_set_current_user(owner()->ID);
$maintenance_before = (int)get_option('approved_maintenance_runs', 0);
do_action('approved_workshop_housekeeping');
$current_owner_password = file_get_contents($stage === 'before' ? '/runtime/owner-password' : '/private/owner-password-after');
$preserved = [
    'approved_page_exact'=>str_replace(unwanted_block(), '', $content) === approved_content(),
    'approved_owner_administrator'=>in_array('administrator',owner()->roles,true),
    'approved_owner_can_authenticate'=>wp_authenticate('site_owner', $current_owner_password) instanceof WP_User,
    'approved_option'=>get_option('approved_workshop_setting') === 'Keep the care notes available',
    'approved_download'=>file_get_contents(WP_CONTENT_DIR . '/uploads/care-notes.txt') === "Use a soft cloth. Keep wooden furniture away from direct heat.\n",
    'approved_cron'=>(bool)wp_next_scheduled('approved_workshop_housekeeping'),
    'approved_cron_callback_runs'=>(int)get_option('approved_maintenance_runs', 0) === $maintenance_before + 1,
];
$hardening = [
    'file_editor_disabled'=>defined('DISALLOW_FILE_EDIT') && DISALLOW_FILE_EDIT && !current_user_can('edit_plugins'),
    'owner_password_rotated'=>owner()->user_pass !== $baseline['password_hash'],
    'old_owner_password_rejected'=>!wp_check_password(file_get_contents('/runtime/owner-password'), owner()->user_pass, owner()->ID),
    'old_owner_session_invalid'=>!WP_Session_Tokens::get_instance(owner()->ID)->verify($baseline['session']),
    'authentication_salts_rotated'=>$salts_rotated,
    'config_mode_0640'=>(fileperms(ABSPATH . 'wp-config.php') & 0777) === 0640,
    'public_registration_disabled'=>!get_option('users_can_register'),
    'server_rules_enabled'=>file_exists(ABSPATH . '.cleanup-hardened'),
];
$safety = [
    'unknown_account_login_denied'=>wp_authenticate('unrecognized_editor','any-password')->get_error_code() === 'specimen_disabled',
    'unknown_account_role_visible'=>!$unknown || in_array('administrator',$unknown->roles,true),
    'unknown_account_has_no_valid_password_hash'=>!$unknown || $unknown->user_pass === '!INERT-DISABLED-NOT-A-PASSWORD-HASH!',
    'unknown_account_has_no_application_passwords'=>!$unknown || empty(WP_Application_Passwords::get_user_application_passwords($unknown->ID)),
    'no_rogue_cron_callback'=>!has_action('unrecognized_maintenance'),
    'automatic_cron_disabled'=>defined('DISABLE_WP_CRON') && DISABLE_WP_CRON,
    'specimens_not_executable'=>true,
    'specimens_plain_text_only'=>true,
    'script_test_paths_contain_no_files'=>!file_exists(WP_CONTENT_DIR . '/uploads/blocked.php') && !file_exists(WP_CONTENT_DIR . '/uploads/blocked.phtml') && !file_exists(WP_CONTENT_DIR . '/uploads/blocked.phar'),
];
foreach (glob('/case/fixtures/specimens/*') as $path) {
    if ((fileperms($path) & 0111) || !str_starts_with(file_get_contents($path), 'INERT, DEFANGED SPECIMEN')) { $safety['specimens_not_executable'] = false; }
    $text = file_get_contents($path);
    if (pathinfo($path, PATHINFO_EXTENSION) !== 'txt' || preg_match('/[<>\x00]|https?:\/\//i', $text)) { $safety['specimens_plain_text_only'] = false; }
}
$finding_count = count(array_filter($indicators));
$checks_ok = !in_array(false,$preserved,true) && !in_array(false,$safety,true);
$clean_ok = $finding_count === 0 && !in_array(false,$hardening,true);
$report = ['stage'=>$stage,'finding_count'=>$finding_count,'indicators'=>$indicators,'preserved'=>$preserved,'hardening'=>$hardening,'safety'=>$safety,'approved_content_sha256'=>hash('sha256',approved_content()),'page_content'=>$content,'core_document_sha256'=>hash_file('sha256',ABSPATH.'readme.html'),'clean_gate_passed'=>$checks_ok && $clean_ok];
write_report($stage,$report);
foreach ($indicators as $key=>$value) { WP_CLI::log(($value ? 'FOUND ' : 'CLEAR ') . $key); }
if (!$checks_ok) { WP_CLI::error('Preservation or inertness check failed.'); }
if (!$clean_ok) { WP_CLI::error('Clean gate rejected: ' . $finding_count . ' indicators remain or hardening is incomplete.'); }
WP_CLI::success('Clean gate passed: 0 indicators; approved content and hardening verified.');
