<?php
function specimen($name) {
    $text = file_get_contents('/case/fixtures/specimens/' . $name);
    if (!str_starts_with($text, 'INERT, DEFANGED SPECIMEN made for this demonstration.')) {
        throw new RuntimeException('Missing specimen label');
    }
    return $text;
}
function approved_content() { return file_get_contents('/case/fixtures/approved-content.html'); }
function unwanted_block() {
    $lines = explode("\n", specimen('content.txt'));
    return '<aside class="specimen" data-indicator="unwanted-promotion"><small>' . esc_html($lines[0]) . '</small><p>' . esc_html($lines[1]) . '</p></aside>';
}
function write_report($name, $value) {
    file_put_contents('/case/proof/' . $name . '.json', json_encode($value, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n");
}
function owner() { return get_user_by('login', 'site_owner'); }
function salt_digests() {
    $result = [];
    foreach (['AUTH_KEY','SECURE_AUTH_KEY','LOGGED_IN_KEY','NONCE_KEY','AUTH_SALT','SECURE_AUTH_SALT','LOGGED_IN_SALT','NONCE_SALT'] as $name) {
        $result[$name] = hash('sha256', constant($name));
    }
    return $result;
}
