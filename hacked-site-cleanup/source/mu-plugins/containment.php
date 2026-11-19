<?php
/** Prevent the planted account from authenticating at every stage. */
add_filter('authenticate', function ($user, $login) {
    if ($login === 'unrecognized_editor' || ($user instanceof WP_User && $user->user_login === 'unrecognized_editor')) {
        return new WP_Error('specimen_disabled', 'This inert specimen account cannot sign in.');
    }
    return $user;
}, PHP_INT_MAX, 2);
