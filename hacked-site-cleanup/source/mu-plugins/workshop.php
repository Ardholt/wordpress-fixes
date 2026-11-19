<?php
/** Record completed housekeeping runs for the approved workshop schedule. */
add_action('approved_workshop_housekeeping', function () {
    update_option('approved_maintenance_runs', (int)get_option('approved_maintenance_runs', 0) + 1, false);
});
