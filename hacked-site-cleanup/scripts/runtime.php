<?php
foreach (['db-password','root-password','owner-password'] as $name) {
    file_put_contents('/runtime/' . $name, bin2hex(random_bytes(32)));
    chmod('/runtime/' . $name, $name === 'db-password' ? 0644 : 0600);
}
file_put_contents('/runtime/owner-email', 'owner' . chr(64) . 'example.invalid');
