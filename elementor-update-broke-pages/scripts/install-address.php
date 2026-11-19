<?php
// WordPress requires an installation address; this reserved domain cannot receive mail.
echo 'local-' . bin2hex(random_bytes(12)) . '@' . 'example.invalid';
